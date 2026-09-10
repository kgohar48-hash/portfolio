import { Router } from "express";
import rateLimit from "express-rate-limit";
import { isDbConnected } from "../config/db.js";
import Cv from "../models/Cv.js";
import { getMaster } from "../lib/cvGenerator.js";
import { linkTargets } from "../data/cvMaster.js";
import { logCvOpen } from "../lib/cvTracking.js";

// Mounted at /api/cv — PUBLIC. Returns only the rendered CV + tracked link URLs.
// Never leaks jobDescription / coverLetter / jobMeta / event logs.
const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests." }
});

const SLUG_RE = /^[A-Za-z0-9_-]{6,16}$/;
const REDIRECT_BASE = (process.env.API_PUBLIC_ORIGIN || "").replace(/\/$/, "");

/** Build the { key: trackedUrl } map the CV page renders links from. */
function trackedLinks(slug, master, req) {
  // redirects live on this same service under /r — use an absolute URL so the
  // links also work when the page is printed to a PDF and opened elsewhere.
  const base = REDIRECT_BASE || `${req.protocol}://${req.get("host")}`;
  const map = {};
  for (const t of linkTargets(master)) map[t] = `${base}/r/${slug}/${t}`;
  return map;
}

router.get("/:slug", limiter, async (req, res) => {
  const { slug } = req.params;
  if (!SLUG_RE.test(slug)) return res.status(404).json({ ok: false, error: "Not found." });
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "Unavailable." });

  const cv = await Cv.findOne({ slug })
    .select("slug data jobApplication company role")
    .lean()
    .catch(() => null);
  if (!cv || !cv.data) return res.status(404).json({ ok: false, error: "Not found." });

  const master = await getMaster();

  // fire-and-forget open logging
  logCvOpen(cv, req).catch(() => {});

  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    cv: {
      slug: cv.slug,
      data: cv.data,
      contacts: master.contacts || {},
      links: trackedLinks(cv.slug, master, req)
    }
  });
});

export default router;
