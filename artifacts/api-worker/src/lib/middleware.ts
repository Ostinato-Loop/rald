import type { Context, Next } from "hono";
import { verifyJwt } from "./auth";
import type { Bindings, Variables } from "../index";

export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyJwt(token, c.env.RALD_JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  c.set("user", payload);
  await next();
}
