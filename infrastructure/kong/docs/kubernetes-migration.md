# RALD Kong Gateway — Kubernetes Migration Guide

**Owner:** LILCKY STUDIO LIMITED  
**Design principle:** Zero code changes required. Config (kong.yml) is identical between Docker and Kubernetes.

---

## Why This Architecture Is Already K8s-Ready

The RALD Kong setup was designed for seamless Kubernetes migration:

| Docker Compose | Kubernetes Equivalent | Already compatible? |
|---|---|---|
| `docker-compose.yml` | Deployment manifests | ✅ (kompose converts directly) |
| `kong/kong.yml` volume mount | ConfigMap | ✅ (same file, same path) |
| Environment variables | Secrets + ConfigMaps | ✅ (same names) |
| Redis service | Redis StatefulSet | ✅ (same config) |
| Health checks | Liveness/Readiness probes | ✅ (same endpoint) |
| Prometheus scrape | ServiceMonitor (Prometheus Operator) | ✅ |

---

## Migration Steps

### Step 1 — Generate K8s Manifests

```bash
# Install Kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.32.0/kompose-linux-amd64 -o kompose
chmod +x kompose && sudo mv kompose /usr/local/bin/

# Generate manifests
cd infrastructure/kong
make k8s-gen
# Output → k8s/ directory
```

### Step 2 — Create Kubernetes Secrets

```bash
# Never store secrets in manifests
kubectl create secret generic rald-kong-secrets \
  --from-literal=REDIS_PASSWORD="$(cat .env | grep REDIS_PASSWORD | cut -d= -f2)" \
  --from-literal=GRAFANA_ADMIN_PASSWORD="$(cat .env | grep GRAFANA_ADMIN_PASSWORD | cut -d= -f2)"

kubectl create secret tls rald-tls \
  --cert=certs/rald.cloud.crt \
  --key=certs/rald.cloud.key
```

### Step 3 — Create ConfigMap for kong.yml

```bash
kubectl create configmap kong-config \
  --from-file=kong.yml=kong/kong.yml

# To update config (zero-downtime):
kubectl create configmap kong-config \
  --from-file=kong.yml=kong/kong.yml \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 4 — Kong Deployment

```yaml
# k8s/kong-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rald-kong
  namespace: rald-gateway
  labels:
    app: kong
    owner: lilcky-studio
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0        # zero-downtime updates
  selector:
    matchLabels:
      app: kong
  template:
    metadata:
      labels:
        app: kong
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8001"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: kong
          image: kong/kong-gateway:3.7
          ports:
            - containerPort: 8000
              name: proxy
            - containerPort: 8443
              name: proxy-ssl
            - containerPort: 8001
              name: admin
          env:
            - name: KONG_DATABASE
              value: "off"
            - name: KONG_DECLARATIVE_CONFIG
              value: /kong/declarative/kong.yml
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: rald-kong-secrets
                  key: REDIS_PASSWORD
            - name: KONG_PLUGINS
              value: "bundled,jwt,key-auth,cors,rate-limiting,http-log,prometheus,request-size-limiting,ip-restriction,response-ratelimiting,request-termination,correlation-id"
            - name: KONG_LOG_LEVEL
              value: warn
            - name: KONG_REAL_IP_HEADER
              value: CF-Connecting-IP
            - name: KONG_TRUSTED_IPS
              value: "173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18"
          volumeMounts:
            - name: kong-config
              mountPath: /kong/declarative
              readOnly: true
            - name: tls
              mountPath: /certs
              readOnly: true
          livenessProbe:
            exec:
              command: [kong, health]
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 10
          readinessProbe:
            httpGet:
              path: /status
              port: 8001
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
      volumes:
        - name: kong-config
          configMap:
            name: kong-config
        - name: tls
          secret:
            secretName: rald-tls
```

### Step 5 — Horizontal Pod Autoscaler

```yaml
# k8s/kong-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kong-hpa
  namespace: rald-gateway
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rald-kong
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Step 6 — Redis (StatefulSet)

```yaml
# k8s/redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: rald-gateway
spec:
  serviceName: redis
  replicas: 1   # Upgrade to Redis Cluster (3 nodes) for HA
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command:
            - redis-server
            - --requirepass
            - $(REDIS_PASSWORD)
            - --maxmemory
            - 2gb
            - --maxmemory-policy
            - allkeys-lru
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: rald-kong-secrets
                  key: REDIS_PASSWORD
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redis-data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 10Gi
```

### Step 7 — Ingress (Cloudflare → K8s)

```yaml
# k8s/ingress.yaml
# Using Cloudflare Tunnel or external LB
apiVersion: v1
kind: Service
metadata:
  name: kong-proxy
  namespace: rald-gateway
  annotations:
    service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol: "true"
spec:
  type: LoadBalancer
  selector:
    app: kong
  ports:
    - name: proxy
      port: 80
      targetPort: 8000
    - name: proxy-ssl
      port: 443
      targetPort: 8443
```

---

## Zero-Code-Change Config Update in K8s

```bash
# Update kong.yml
vim infrastructure/kong/kong/kong.yml

# Validate
make validate

# Apply to cluster (Kong auto-reloads on ConfigMap change)
kubectl create configmap kong-config \
  --from-file=kong.yml=kong/kong.yml \
  --dry-run=client -o yaml | kubectl apply -f -

# Trigger rolling restart to pick up new ConfigMap
kubectl rollout restart deployment/rald-kong -n rald-gateway

# Monitor rollout
kubectl rollout status deployment/rald-kong -n rald-gateway
```

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Generate manifests | 30 minutes |
| Set up K8s cluster (DigitalOcean/EKS/GKE) | 1–2 hours |
| Deploy Kong + Redis | 30 minutes |
| DNS cutover | 5 minutes |
| Full validation | 1 hour |
| **Total** | **3–4 hours** |

No application code changes required. GitHub remains the source of truth throughout.
