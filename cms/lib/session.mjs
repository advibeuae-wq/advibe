/**
 * Single-admin auth: no user table, no database. A password check against
 * CMS_PASSWORD, then an HMAC-signed, httpOnly, SameSite=Strict session
 * cookie. SESSION_SECRET signs the cookie; GITHUB_TOKEN is never involved
 * here and is never reachable from anything this module returns.
 */

import crypto from "node:crypto";

const COOKIE_NAME = "advibe_cms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set on the server.");
  const body = b64url(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", secret).update(body).digest();
  return `${body}.${b64url(mac)}`;
}

function verify(token) {
  if (!token || !token.includes(".")) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const [body, mac] = token.split(".");
  const expectedMac = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const idx = p.indexOf("=");
        return idx === -1 ? [p, ""] : [p.slice(0, idx), decodeURIComponent(p.slice(idx + 1))];
      })
  );
}

export function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return Boolean(verify(cookies[COOKIE_NAME]));
}

export function createSessionCookie() {
  const token = sign({ exp: Date.now() + SESSION_TTL_SECONDS * 1000, iat: Date.now() });
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/** Timing-safe password compare; always does a fixed-cost comparison. */
export function checkPassword(candidate) {
  const expected = process.env.CMS_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(String(candidate ?? ""));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) {
    // Compare against a same-length dummy so a wrong-length guess doesn't
    // finish measurably faster than a right-length wrong guess.
    crypto.timingSafeEqual(Buffer.alloc(b.length), Buffer.alloc(b.length));
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/** SameSite=Strict is the primary CSRF defense; this is a second check for
 *  browsers/requests that do send Origin. Requests with no Origin header
 *  (some same-site navigations) are allowed through — the cookie policy
 *  already keeps cross-site requests from carrying a valid session. */
export function assertSafeOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
