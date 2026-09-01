// Lets the editor UI know whether the current cookie is still valid, so it
// can redirect to /login instead of failing silently on first publish.
import { isAuthenticated } from "../lib/session.mjs";

export default async function handler(req, res) {
  res.status(200).json({ authenticated: isAuthenticated(req) });
}
