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

export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RALD_JWT_SECRET: string;
  RALD_ENCRYPTION_KEY: string;
  ENVIRONMENT: string;
};

export type Variables = {
  db: SupabaseClient;
  user?: JwtPayload;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors({
  origin: ["https://rald.cloud", "https://admin.rald.cloud", "https://rald-control-center.pages.dev"],
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use("*", async (c, next) => {
  c.set("db", createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY));
  await next();
});

app.get("/api/healthz", (c) => c.json({ status: "ok", version: "1.0.0", environment: c.env.ENVIRONMENT }));

app.route("/api/auth", authRoutes);
app.route("/api/services", servicesRoutes);
app.route("/api/credentials", credentialsRoutes);
app.route("/api/deployments", deploymentsRoutes);
app.route("/api/metrics", metricsRoutes);
app.route("/api/products", productsRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
