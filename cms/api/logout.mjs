import { clearSessionCookie } from "../lib/session.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.status(200).json({ ok: true });
}
