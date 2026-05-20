/**
 * Route barrel — re-exports all Hono sub-routers.
 * worker.ts mounts them directly; this file is kept for tooling compatibility.
 */
export { default as authRoutes }   from "./auth";
export { default as usersRoutes }  from "./users";
export { default as oauthRoutes }  from "./oauth";
export { default as adminRoutes }  from "./admin";
export { default as healthRoutes } from "./health";
