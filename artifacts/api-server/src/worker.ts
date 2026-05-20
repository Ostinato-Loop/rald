import { Hono } from "hono";
import { cors } from "hono/cors";
import { HealthCheckResponse } from "@workspace/api-zod";

type Bindings = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  TERMII_API_KEY?: string;
  TERMII_SENDER_ID?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposeHeaders: ["X-Request-ID"],
    maxAge: 86400,
  }),
);

app.get("/api/healthz", (c) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  return c.json(data);
});

app.notFound((c) => c.json({ error: "Not Found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
