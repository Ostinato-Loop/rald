export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

function base64url(buf: Uint8Array): string {
  let str = "";
  for (const byte of buf) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function encodeText(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encodeText(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds = 86400
): Promise<string> {
  const header = base64url(encodeText(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(
    encodeText(
      JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      })
    )
  );
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encodeText(`${header}.${body}`));
  return `${header}.${body}.${base64url(new Uint8Array(sig))}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts as [string, string, string];

    const key = await hmacKey(secret);
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encodeText(`${header}.${body}`));
    if (!valid) return null;

    const payload = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey("raw", encodeText(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encodeText(salt), iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2:${salt}:${base64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2:")) {
    const [, salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const key = await crypto.subtle.importKey("raw", encodeText(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: encodeText(salt), iterations: 100000, hash: "SHA-256" },
      key,
      256
    );
    const computed = base64url(new Uint8Array(bits));
    return computed === hash;
  }
  // Legacy HMAC-SHA256 format: salt:hash
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hmk = await crypto.subtle.importKey("raw", encodeText(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", hmk, encodeText(password));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return computed === hash;
}

export async function encryptValue(value: string, encKey: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encodeText(encKey.slice(0, 32).padEnd(32, "0")), { name: "AES-GCM" }, false, ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, keyMaterial, encodeText(value));
  return `gcm:${base64url(iv)}:${base64url(new Uint8Array(encrypted))}`;
}

export async function decryptValue(encrypted: string, encKey: string): Promise<string> {
  const [, ivB64, dataB64] = encrypted.split(":");
  if (!ivB64 || !dataB64) throw new Error("Invalid encrypted format");
  const iv = Uint8Array.from(atob(ivB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(dataB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encodeText(encKey.slice(0, 32).padEnd(32, "0")), { name: "AES-GCM" }, false, ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyMaterial, data);
  return new TextDecoder().decode(plain);
}
