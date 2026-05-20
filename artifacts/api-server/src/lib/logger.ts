/**
 * Minimal logger — works in Cloudflare Workers and Node.js.
 * For production, pipe stdout to a log aggregator.
 */
const level = (process.env["LOG_LEVEL"] ?? "info") as string;
const levels: Record<string, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = levels[level] ?? 20;

function log(l: string, n: number, msg: string, meta?: unknown) {
  if (n < minLevel) return;
  const line = JSON.stringify({ level: l, time: Date.now(), msg, ...(meta ? { meta } : {}) });
  if (n >= 40) console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (meta: unknown, msg?: string) => log("debug", 10, msg ?? "", meta),
  info:  (meta: unknown, msg?: string) => log("info",  20, msg ?? "", meta),
  warn:  (meta: unknown, msg?: string) => log("warn",  30, msg ?? "", meta),
  error: (meta: unknown, msg?: string) => log("error", 40, msg ?? "", meta),
};
