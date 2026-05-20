/**
 * Legacy compatibility shim — the real app is in worker.ts.
 * Kept so any tooling that imports "./app" still compiles cleanly.
 */
export { default } from "./worker";
