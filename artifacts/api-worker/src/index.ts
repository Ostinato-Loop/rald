import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { JwtPayload } from "./lib/auth";
import authRoutes from "./routes/auth";
import servicesRoutes from "./routes/services";
import credentialsRoutes from "./routes/credentials";
import deploymentsRoutes from "./routes/deployments";
import metricsRoutes from "./routes/metrics";
import productsRoutes from "./routes/products";
import adminRoutes from "./routes/admin";
import waitlistRoutes from "./routes/waitlist";
import referralsRoutes from "./routes/referrals";
import apiKeysRoutes from "./routes/api-keys";

// ── KV interface ──────────────────────────────────────────────────────────────
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RALD_JWT_SECRET: string;
  RALD_ENCRYPTION_KEY: string;
  TERMII_API_KEY: string;
  RESEND_API_KEY: string;
  BOOTSTRAP_SECRET: string;
  ENVIRONMENT: string;
  // Twilio — OTP fallback
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  // Cloudflare KV — rate limiting
  RATE_LIMIT_KV?: KVNamespace;
};

export type Variables = {
  db: SupabaseClient;
  user?: JwtPayload;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use("*", cors({
  origin: [
    "https://rald.cloud",
    "https://profiles.rald.cloud",      // Identity Portal (primary auth domain)
    "https://app.rald.cloud",           // Legacy — kept during DNS cutover
    "https://admin.rald.cloud",
    "https://control.rald.cloud",
    "https://credentials.rald.cloud",   // Developer Portal
    "https://loop.rald.cloud",
    "https://payrald.rald.cloud",
    "https://raldtics.rald.cloud",
    "https://dunarald.rald.cloud",
    "https://dispatch.rald.cloud",
    "https://messenger.rald.cloud",
    "https://voice.rald.cloud",
    "https://business.rald.cloud",
    "https://rald-app.pages.dev",
    "https://rald-control-center.pages.dev",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:5175",
  ],
  allowHeaders: [
    "Authorization", "Content-Type",
    "X-Bootstrap-Secret", "X-Request-ID",
    "X-RALD-SDK", "X-RALD-Key",
  ],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));

// ── DB middleware ─────────────────────────────────────────────────────────────
app.use("*", async (c, next) => {
  c.set("db", createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY));
  await next();
});

// ── Health / version / metrics (public) ──────────────────────────────────────

const healthResponse = (c: any) => c.json({
  status: "ok", service: "rald-api", version: "1.3.0",
  environment: c.env.ENVIRONMENT ?? "production",
  owner: "LILCKY STUDIO LIMITED",
  timestamp: new Date().toISOString(),
});

const readyResponse = (c: any) => c.json({
  ready: true, service: "rald-api",
  checks: { supabase: !!c.env.SUPABASE_URL, resend: !!c.env.RESEND_API_KEY },
  timestamp: new Date().toISOString(),
});

const metricsResponse = (c: any) => c.text(
  [
    "# RALD API Metrics — Prometheus format",
    `rald_api_up{env="${c.env.ENVIRONMENT ?? "production"}",service="rald-api"} 1`,
    `rald_api_version{version="1.3.0",service="rald-api"} 1`,
    `rald_api_requests_total{service="rald-api"} 1`,
  ].join("\n"),
  200,
  { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" }
);

app.get("/health",      healthResponse);
app.get("/api/health",  healthResponse);
app.get("/api/healthz", healthResponse);
app.get("/healthz",     healthResponse);
app.get("/ready",       readyResponse);
app.get("/api/ready",   readyResponse);
app.get("/metrics",     metricsResponse);
app.get("/version",     (c) => c.json({ version: "1.3.0", service: "rald-api", environment: c.env.ENVIRONMENT ?? "production" }));
app.get("/api/version", (c) => c.json({ version: "1.3.0", service: "rald-api", environment: c.env.ENVIRONMENT ?? "production", owner: "LILCKY STUDIO LIMITED" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.route("/api/auth",        authRoutes);
app.route("/api/services",    servicesRoutes);
app.route("/api/credentials", credentialsRoutes);
app.route("/api/deployments", deploymentsRoutes);
app.route("/api/metrics",     metricsRoutes);
app.route("/api/products",    productsRoutes);
app.route("/api/admin",       adminRoutes);
app.route("/api/waitlist",    waitlistRoutes);
app.route("/api/referrals",   referralsRoutes);
app.route("/api/api-keys",    apiKeysRoutes);

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (c) => c.json({
  service: "RALD API", version: "1.3.0",
  environment: c.env.ENVIRONMENT ?? "production",
  owner: "LILCKY STUDIO LIMITED",
  docs: "https://api.rald.cloud/api/health",
  timestamp: new Date().toISOString(),
}));

app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));
app.onError((err, c) => {
  console.error("[RALD API Error]", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
