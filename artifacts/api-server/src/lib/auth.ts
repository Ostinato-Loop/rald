import { type Request, type Response, type NextFunction } from "express";
import { createHmac, timingSafeEqual, randomBytes, createCipheriv, createDecipheriv } from "crypto";

// SEC-004 (2026-06-06): Removed hardcoded JWT fallback secret.
// RALD_JWT_SECRET and RALD_ENCRYPTION_KEY must be set in the process environment.
// The application will refuse to start (see startup check in index.ts) if these are absent.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[FATAL] ${name} is not set in the environment. ` +
      `Set it before starting the server. Do not use a hardcoded fallback.`
    );
  }
  return value;
}

let _jwtSecret: string | undefined;
let _encryptionKey: string | undefined;

function getJwtSecret(): string {
  if (!_jwtSecret) _jwtSecret = requireEnv("RALD_JWT_SECRET");
  return _jwtSecret;
}

function getEncryptionKey(): string {
  if (!_encryptionKey) _encryptionKey = requireEnv("RALD_ENCRYPTION_KEY");
  return _encryptionKey;
}

function base64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

function fromBase64url(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

export function signJwt(payload: Record<string, unknown>, expiresInSeconds = 86400): string {
  const secret = getJwtSecret();
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  }));
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const secret = getJwtSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(fromBase64url(body)) as Record<string, unknown>;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHmac("sha256", salt).update(password).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = createHmac("sha256", salt).update(password).digest("hex");
  return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

export function encryptValue(value: string): string {
  const key = Buffer.from(getEncryptionKey().slice(0, 32).padEnd(32, "0"));
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptValue(encrypted: string): string {
  const key = Buffer.from(getEncryptionKey().slice(0, 32).padEnd(32, "0"));
  const [ivHex, encHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyJwt(token);
  if (!payload || typeof payload.id !== "string") {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.user = { id: payload.id as string, email: payload.email as string, role: payload.role as string };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "customer:view", "customer:create", "customer:update", "customer:delete",
    "customer:merge", "customer:export", "customer:tag", "customer:note",
    "notification:view", "notification:create", "notification:update",
    "notification:dismiss", "notification:manage_templates", "notification:manage_preferences",
  ],
  operator: [
    "customer:view", "customer:create", "customer:update", "customer:export",
    "customer:tag", "customer:note", "notification:view", "notification:create",
    "notification:update", "notification:dismiss", "notification:manage_preferences",
  ],
  viewer: [
    "customer:view", "notification:view", "notification:dismiss", "notification:manage_preferences",
  ],
};

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userPerms = ROLE_PERMISSIONS[req.user.role] ?? [];
    if (!userPerms.includes(permission)) {
      res.status(403).json({
        error: `Forbidden: requires ${permission} permission`,
        yourRole: req.user.role,
      });
      return;
    }
    next();
  };
}
