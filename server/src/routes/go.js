import { Router } from "express";
import rateLimit from "express-rate-limit";
import { isDbConnected } from "../config/db.js";
import Cv from "../models/Cv.js";
import { getMaster } from "../lib/cvGenerator.js";
import { resolveTarget, linkTargets } from "../data/cvMaster.js";
import { logCvLinkClick } from "../lib/cvTracking.js";

// Mounted at /r — PUBLIC. Logs the click, then 302s to a server-controlled URL.
// The destination NEVER comes from the request (no open-redirect).
const router = Router();

const SITE = (process.env.CLIENT_ORIGIN || "https://goharawan.com").split(",")[0].trim().replace(/\/$/, "");
const SLUG_RE = /^[A-Za-z0-9_-]{6,16}$/;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/:slug/:target?", limiter, async (req, res) => {
  const { slug } = req.params;
  const target = String(req.params.target || "portfolio");

  if (!SLUG_RE.test(slug) || !isDbConnected()) return res.redirect(302, SITE);

  const cv = await Cv.findOne({ slug }).select("slug jobApplication").lean().catch(() => null);
  if (!cv) return res.redirect(302, SITE);

  const master = await getMaster();
  const known = linkTargets(master).includes(target) ? target : "portfolio";

  logCvLinkClick(cv, known, req).catch(() => {});

  if (known === "portfolio") {
    return res.redirect(302, `${SITE}/?ref=${encodeURIComponent(slug)}`);
  }
  const dest = resolveTarget(known, master);
  return res.redirect(302, dest || SITE);
});

export default router;
