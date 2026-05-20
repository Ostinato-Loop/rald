import { Hono } from "hono";
import { z } from "zod";

const HealthCheckResponse = z.object({ status: z.string() });

const health = new Hono();

health.get("/healthz", (c) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  return c.json(data);
});

export default health;
