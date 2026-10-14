// Access tokens live only in memory. Reloading performs a fresh authorization flow.
let accessToken: string | null = null;
let expiresAt = 0;
export function authHeaders(): Record<string, string> {
  return accessToken && Date.now() < expiresAt ? { Authorization: `Bearer ${accessToken}` } : {};
}
const domain = process.env.NEXT_PUBLIC_AUTH_DOMAIN ?? "";
const clientId = process.env.NEXT_PUBLIC_AUTH_CLIENT_ID ?? "";
const redirectUri = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URI ?? "";
const key = "twinlog:oauth:pending";
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function login() {
  if (!domain.startsWith("https://") || !clientId || !redirectUri) throw new Error("로그인 연결 설정이 필요합니다.");
  const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
  const state = encode(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem(key, JSON.stringify({ verifier, state, createdAt: Date.now() }));
  const challenge = encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  // External Cognito navigation must leave the Next.js router.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  location.assign(`${domain}/oauth2/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email", state, code_challenge: challenge, code_challenge_method: "S256" })}`);
}

let callbackPromise: Promise<void> | null = null;
export function finishLogin(): Promise<void> {
  if (callbackPromise) return callbackPromise;
  callbackPromise = finish().finally(() => { callbackPromise = null; });
  return callbackPromise;
}
async function finish() {
  const params = new URLSearchParams(location.search);
  if (!params.has("code") && !params.has("error")) return;
  const raw = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);
  history.replaceState(null, "", location.pathname);
  if (!raw || params.has("error")) throw new Error("로그인이 취소되었거나 만료됐어요.");
  const pending = JSON.parse(raw);
  if (pending.state !== params.get("state") || Date.now() - pending.createdAt > 600_000) throw new Error("로그인을 다시 시작해 주세요.");
  const response = await fetch(`${domain}/oauth2/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, redirect_uri: redirectUri, code: params.get("code")!, code_verifier: pending.verifier }),
  });
  if (!response.ok) throw new Error("로그인을 완료하지 못했어요.");
  const result = await response.json();
  if (typeof result.access_token !== "string" || typeof result.expires_in !== "number") throw new Error("로그인 응답을 확인할 수 없어요.");
  accessToken = result.access_token;
  expiresAt = Date.now() + result.expires_in * 1000;
}
export function logout() {
  accessToken = null; expiresAt = 0;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  location.assign(`${domain}/logout?${new URLSearchParams({ client_id: clientId, logout_uri: redirectUri })}`);
}
