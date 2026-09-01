import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
// If no explicit JWT secret is set, derive a stable one from the password so
// setting a single env var is enough to get a working admin login.
const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ||
  (ADMIN_PASSWORD ? crypto.createHash("sha256").update(`jwt::${ADMIN_PASSWORD}`).digest("hex") : "");

export const adminConfigured = Boolean(ADMIN_PASSWORD);

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyPassword(password) {
  return adminConfigured && safeEqual(password, ADMIN_PASSWORD);
}

export function issueToken() {
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "30d" });
}

export function requireAdmin(req, res, next) {
  if (!adminConfigured) {
    return res.status(503).json({ ok: false, error: "Admin dashboard is not configured on this server." });
  }
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: "Missing admin token." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") throw new Error("bad role");
    req.admin = true;
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid or expired admin token." });
  }
}
