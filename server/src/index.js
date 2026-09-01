import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { connectDb, isDbConnected } from "./config/db.js";
import portfolioRoutes from "./routes/portfolio.js";
import contactRoutes from "./routes/contact.js";
import trackRoutes from "./routes/track.js";
import adminRoutes from "./routes/admin.js";
import { adminConfigured } from "./lib/adminAuth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5050;
const isProd = process.env.NODE_ENV === "production";

const app = express();
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json({ limit: "128kb" }));
// navigator.sendBeacon (used to flush analytics on page exit) may arrive as
// text/plain depending on the browser — parse that into a string too.
app.use(express.text({ type: ["text/plain"], limit: "128kb" }));

const devOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const envOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...devOrigins, ...envOrigins]);

const corsMiddleware = cors({
  origin(origin, cb) {
    // allow same-origin / curl / server-to-server (no Origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  }
});

// CORS only matters for the API (cross-origin fetches). Scoping it to /api
// keeps static assets (JS/CSS, which Vite marks `crossorigin`) from ever
// being rejected by the origin allowlist when served same-origin.
app.use("/api", corsMiddleware);
// Broad ceiling; individual routes (track, contact, admin/login) set tighter limits.
app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 400, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    db: isDbConnected() ? "connected" : "offline",
    admin: adminConfigured ? "configured" : "off",
    uptime: process.uptime()
  });
});

app.use("/api/portfolio", portfolioRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/track", trackRoutes);
app.use("/api/admin", adminRoutes);

// Serve the built client in production, for a single-service deploy.
// Not used on Render (render.yaml runs the client as its own static site),
// but kept so `npm run build && NODE_ENV=production npm start` still works
// for local testing or an alternate single-process deploy.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (isProd) {
  try {
    await fs.access(clientDist);
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
    console.log(`[server] serving static client from ${clientDist}`);
  } catch {
    console.warn(`[server] client build not found at ${clientDist} — API only`);
  }
}

app.use((err, _req, res, _next) => {
  if (err && /CORS/.test(err.message)) {
    return res.status(403).json({ ok: false, error: err.message });
  }
  console.error("[server] unhandled error:", err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

await connectDb();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT} (${isProd ? "production" : "development"})`);
});
