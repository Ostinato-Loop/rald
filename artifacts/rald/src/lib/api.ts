export const API_BASE = 'https://auth.ostloop.name.ng';

export async function apiCall(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'omit', // Not using include to avoid CORS issues for now with mock setup
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
