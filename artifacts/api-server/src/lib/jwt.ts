/** HS256 JWT using Web Crypto — compatible with CF Workers + Node 20+ */

const HEADER = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_");

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSec = 60 * 60 * 24 * 7, // 7 days
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresInSec };
  const unsigned = `${HEADER}.${b64url(claims)}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(unsigned),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${unsigned}.${sigB64}`;
}

export interface JWTPayload {
  sub: string;
  phone: string;
  role: string;
  sid: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid_token");
  const [h, p, sig] = parts;
  const unsigned = `${h}.${p}`;
  const key = await importKey(secret);

  const sigBytes = Uint8Array.from(
    atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(unsigned),
  );
  if (!valid) throw new Error("invalid_signature");

  const payload = JSON.parse(
    atob(p.replace(/-/g, "+").replace(/_/g, "/")),
  ) as JWTPayload;

  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("token_expired");
  return payload;
}
