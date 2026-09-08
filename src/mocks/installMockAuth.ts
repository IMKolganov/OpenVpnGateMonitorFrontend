import { ACCESS_TOKEN_KEY } from "../utils/const";
import { COOKIE_CONSENT_STORAGE_KEY, COOKIE_CONSENT_VERSION } from "../utils/gdpr/cookieConsent";
import { isMockApiEnabled } from "./isMockApi";

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function toBase64Url(json: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(json));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildMockAccessToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    exp: now + 60 * 60 * 24 * 365,
    iat: now,
    nbf: now - 60,
    nameid: "1",
    sub: "1",
    email: "admin@mock.local",
    displayName: "Mock Admin",
    [ROLE_CLAIM]: "Admin",
    adminIdleTimeoutMinutes: 480,
  };
  return `${toBase64Url(header)}.${toBase64Url(payload)}.mock`;
}

/** Seed a local admin session and skip the cookie banner so UI work can start without a backend. */
export function installMockAuth(): void {
  if (!isMockApiEnabled()) return;

  localStorage.setItem(ACCESS_TOKEN_KEY, buildMockAccessToken());

  if (!localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)) {
    localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        essential: true,
        functional: true,
        thirdParty: false,
        decidedAt: new Date().toISOString(),
        version: COOKIE_CONSENT_VERSION,
      }),
    );
  }

  document.documentElement.setAttribute("data-mock-api", "1");
}
