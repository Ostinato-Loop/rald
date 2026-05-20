import { Hono } from "hono";
import { HealthCheckResponse } from "@workspace/api-zod";

const health = new Hono();

health.get("/healthz", (c) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  return c.json(data);
});

export default health;
