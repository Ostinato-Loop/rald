import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const sharedConfig = {
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: path.resolve(artifactDir, "dist"),
  outExtension: { ".js": ".mjs" },
  logLevel: "info",
  external: [
    "*.node", "sharp", "better-sqlite3", "canvas", "bcrypt", "argon2",
    "fsevents", "re2", "bufferutil", "utf-8-validate", "lightningcss",
    "pg-native", "wrangler", "workerd", "miniflare",
  ],
  sourcemap: "linked",
  banner: {
    js: `import { createRequire as __crReq } from 'node:module';
import __bPath from 'node:path';
import __bUrl from 'node:url';
globalThis.require = __crReq(import.meta.url);
globalThis.__filename = __bUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bPath.dirname(globalThis.__filename);
`,
  },
};

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  // Node.js dev server (src/index.ts → dist/index.mjs)
  await esbuild({
    ...sharedConfig,
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
  });

  // Cloudflare Worker (src/worker.ts → dist/worker.mjs) — for wrangler deploy
  await esbuild({
    ...sharedConfig,
    platform: "browser",
    entryPoints: [path.resolve(artifactDir, "src/worker.ts")],
    conditions: ["worker", "browser"],
    // Override banner for CF Worker (no Node.js globals)
    banner: {},
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
