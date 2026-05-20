import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import type { Env } from "./lib/supabase";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import oauthRoutes from "./routes/oauth";
import adminRoutes from "./routes/admin";

const HealthCheckResponse = z.object({ status: z.string() });

const app = new Hono<{ Bindings: Env }>();

// ── Global middleware ────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        "https://auth.ostloop.name.ng",
        "https://rald.ostloop.name.ng",
        "http://localhost:3000",
        "http://localhost:5173",
      ];
      if (!origin || allowed.some((a) => origin.startsWith(a))) return origin ?? "*";
      // Allow any *.ostloop.name.ng subdomain
      if (/^https:\/\/[\w-]+\.ostloop\.name\.ng$/.test(origin)) return origin;
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-Request-ID",
      "X-Forwarded-For",
    ],
    exposeHeaders: ["X-Request-ID", "X-Rate-Limit-Remaining"],
    credentials: true,
    maxAge: 86400,
  }),
);

// ── Health ───────────────────────────────────────────────────────────────────
app.get("/api/healthz", (c) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  return c.json({ ...data, version: "1.0.0", region: (c.env as Record<string, string>)?.CF_REGION ?? "local" });
});

// ── Auth ─────────────────────────────────────────────────────────────────────
app.route("/api/auth", authRoutes);

// ── Users ─────────────────────────────────────────────────────────────────────
app.route("/api/users", usersRoutes);

// ── OAuth 2.0 + OIDC ─────────────────────────────────────────────────────────
app.route("/api/oauth", oauthRoutes);

// OIDC discovery alias
app.get("/.well-known/openid-configuration", (c) => {
  return c.redirect("/api/oauth/openid-configuration", 301);
});

// ── Admin ─────────────────────────────────────────────────────────────────────
app.route("/api/admin", adminRoutes);

// ── 404 / Error ───────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "not_found", path: c.req.path }, 404));
app.onError((err, c) => {
  console.error("[worker error]", err.message, err.stack);
  return c.json({ error: "internal_server_error", message: err.message }, 500);
});

export default app;
