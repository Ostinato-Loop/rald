# ============================================================
# RALD Kong Gateway — Makefile
# LILCKY STUDIO LIMITED
# ============================================================

.PHONY: dev staging prod down logs validate reload health backup

COMPOSE_BASE = docker compose -f docker-compose.yml

## ── Start environments ────────────────────────────────────────────────────────
dev:
	@echo "▶  Starting RALD Kong (development)…"
	$(COMPOSE_BASE) -f docker-compose.dev.yml up

dev-bg:
	$(COMPOSE_BASE) -f docker-compose.dev.yml up -d

staging:
	@echo "▶  Starting RALD Kong (staging)…"
	$(COMPOSE_BASE) -f docker-compose.staging.yml up -d

prod:
	@echo "▶  Starting RALD Kong (production)…"
	$(COMPOSE_BASE) -f docker-compose.production.yml up -d

## ── Stop ─────────────────────────────────────────────────────────────────────
down:
	$(COMPOSE_BASE) down

## ── Reload Kong config (zero-downtime) ───────────────────────────────────────
reload:
	@echo "↻  Reloading Kong declarative config…"
	curl -s -X POST http://127.0.0.1:8001/config \
	  -F config=@kong/kong.yml | python3 -m json.tool

## ── Validate config before deploying ─────────────────────────────────────────
validate:
	@echo "✔  Validating kong.yml…"
	docker run --rm -v $(PWD)/kong:/kong/declarative kong/kong-gateway:3.7 \
	  kong config parse /kong/declarative/kong.yml

## ── Logs ─────────────────────────────────────────────────────────────────────
logs:
	$(COMPOSE_BASE) logs -f kong

logs-redis:
	$(COMPOSE_BASE) logs -f redis

logs-all:
	$(COMPOSE_BASE) logs -f

## ── Health checks ────────────────────────────────────────────────────────────
health:
	@echo "🩺  Kong health:"
	@curl -s http://127.0.0.1:8001/status | python3 -m json.tool
	@echo "\n🩺  Redis ping:"
	@docker exec rald-redis redis-cli -a $$REDIS_PASSWORD ping

## ── Backup (Kong config + Redis) ─────────────────────────────────────────────
backup:
	@echo "💾  Backing up RALD Kong…"
	@mkdir -p backups/$(shell date +%Y%m%d-%H%M%S)
	@cp kong/kong.yml backups/$(shell date +%Y%m%d-%H%M%S)/kong.yml
	@docker exec rald-redis redis-cli -a $$REDIS_PASSWORD BGSAVE
	@docker cp rald-redis:/data backups/$(shell date +%Y%m%d-%H%M%S)/redis-dump
	@echo "✅  Backup complete → backups/"

## ── Generate SSL cert (Let's Encrypt via Certbot) ────────────────────────────
ssl:
	@echo "🔒  Generating SSL certificates…"
	docker run --rm -v $(PWD)/certs:/etc/letsencrypt certbot/certbot certonly \
	  --standalone \
	  -d api.rald.cloud \
	  -d auth.rald.cloud \
	  -d identity.rald.cloud \
	  -d credentials.rald.cloud \
	  --email ops@rald.cloud \
	  --agree-tos \
	  --non-interactive

## ── Kubernetes manifests (migration helper) ──────────────────────────────────
k8s-gen:
	@echo "⚙  Generating Kubernetes manifests from compose…"
	@which kompose > /dev/null || (echo "Install kompose: https://kompose.io" && exit 1)
	kompose convert -f docker-compose.yml -f docker-compose.production.yml -o k8s/

## ── Show all routes ──────────────────────────────────────────────────────────
routes:
	@curl -s http://127.0.0.1:8001/routes | python3 -m json.tool | grep '"name"\|"paths"\|"hosts"'

## ── Show plugin status ────────────────────────────────────────────────────────
plugins:
	@curl -s http://127.0.0.1:8001/plugins | python3 -m json.tool | grep '"name"\|"enabled"'
