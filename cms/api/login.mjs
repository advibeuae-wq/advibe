import { checkPassword, createSessionCookie, assertSafeOrigin } from "../lib/session.mjs";

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  if (!assertSafeOrigin(req)) {
    res.status(403).json({ ok: false, error: "Invalid origin" });
    return;
  }

  const body = readJsonBody(req);
  const password = body.password;

  if (!checkPassword(password)) {
    res.status(401).json({ ok: false, error: "Incorrect password." });
    return;
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  res.status(200).json({ ok: true });
}
