/** SHA-256 hex digest — works in CF Workers and Node.js */
export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a cryptographically random hex string of `bytes` bytes */
export function randomHex(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a random 6-digit numeric OTP */
export function generateOTP(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const num = new DataView(buf.buffer).getUint32(0);
  return String(num % 1_000_000).padStart(6, "0");
}

/** Constant-time string comparison */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
