// Token storage kept outside AuthService so the interceptor can use it without a circular dependency.
const KEY = 'niva_tokens';
function read(): { accessToken: string; refreshToken: string } | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); }
  catch { localStorage.removeItem(KEY); return null; }
}
export const session = {
  get access(): string | null { return read()?.accessToken ?? null; },
  get refresh(): string | null { return read()?.refreshToken ?? null; },
  set(t: { accessToken: string; refreshToken: string }) { localStorage.setItem(KEY, JSON.stringify(t)); },
  clear() { localStorage.removeItem(KEY); },
};
