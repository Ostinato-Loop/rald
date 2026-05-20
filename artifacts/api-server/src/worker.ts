import { Hono } from "hono";
import { cors } from "hono/cors";
import { HealthCheckResponse } from "@workspace/api-zod";

const app = new Hono();

app.use("*", cors());

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
