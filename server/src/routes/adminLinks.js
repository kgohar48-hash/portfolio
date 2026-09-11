import { Router } from "express";
import { isDbConnected } from "../config/db.js";
import Link from "../models/Link.js";
import Cv from "../models/Cv.js";
import JobApplication from "../models/JobApplication.js";

// Mounted at /api/admin/links — parent router enforces requireAdmin.
// Hand-picked tracking links, e.g. goharawan.com/r/linkedin-bio/portfolio —
// same redirect + logging mechanics as a CV's links (see routes/go.js), just
// not generated from a résumé. See models/Link.js.
const router = Router();

// Shown/shared domain for tracked links — goharawan.com, not api.goharawan.com.
// The client's render.yaml redirect-proxies /r/* to this API service.
const SITE = (process.env.CLIENT_ORIGIN || "https://goharawan.com").split(",")[0].trim().replace(/\/$/, "");

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function linkUrl(slug) {
  return `${SITE}/r/${slug}/portfolio`;
}

/* ----------------------------------------------------------------- list --- */
router.get("/", async (_req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false, items: [] });
  const items = await Link.find()
    .sort({ createdAt: -1 })
    .limit(300)
    .populate("jobApplication", "company role status")
    .lean();
  res.json({ ok: true, db: true, items, site: SITE });
});

/* --------------------------------------------------------------- create --- */
router.post("/", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });

  const label = String(req.body?.label || "").trim().slice(0, 200);
  if (!label) return res.status(422).json({ ok: false, error: "Give the link a name, e.g. \"LinkedIn bio\"." });

  let slug = slugify(req.body?.slug || label);
  if (slug.length < 3) return res.status(422).json({ ok: false, error: "That name doesn't produce a usable link — try something with at least 3 letters or numbers." });

  const [cvClash, linkClash] = await Promise.all([Cv.exists({ slug }), Link.exists({ slug })]);
  if (cvClash || linkClash) {
    return res.status(409).json({ ok: false, error: `"${slug}" is already taken — try a different name or a custom slug.` });
  }

  let jobApplication;
  if (req.body?.jobApplicationId) {
    const job = await JobApplication.findById(req.body.jobApplicationId).select("_id").lean().catch(() => null);
    if (!job) return res.status(422).json({ ok: false, error: "That job application wasn't found." });
    jobApplication = job._id;
  }

  const link = await Link.create({ slug, label, jobApplication });
  res.status(201).json({ ok: true, link: link.toObject(), url: linkUrl(slug) });
});

/* ------------------------------------------------------------------ read --- */
router.get("/:id", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false });
  const link = await Link.findById(req.params.id).populate("jobApplication", "company role status").lean().catch(() => null);
  if (!link) return res.status(404).json({ ok: false, error: "Not found." });
  res.json({ ok: true, link, url: linkUrl(link.slug) });
});

/* ---------------------------------------------------------------- update --- */
router.patch("/:id", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const link = await Link.findById(req.params.id);
  if (!link) return res.status(404).json({ ok: false, error: "Not found." });

  if (typeof req.body?.label === "string" && req.body.label.trim()) link.label = req.body.label.trim().slice(0, 200);
  if (req.body?.jobApplicationId !== undefined) {
    if (!req.body.jobApplicationId) {
      link.jobApplication = undefined;
    } else {
      const job = await JobApplication.findById(req.body.jobApplicationId).select("_id").lean().catch(() => null);
      if (!job) return res.status(422).json({ ok: false, error: "That job application wasn't found." });
      link.jobApplication = job._id;
    }
  }
  await link.save();
  res.json({ ok: true, link: link.toObject() });
});

/* ---------------------------------------------------------------- delete --- */
router.delete("/:id", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const gone = await Link.findByIdAndDelete(req.params.id).catch(() => null);
  if (!gone) return res.status(404).json({ ok: false, error: "Not found." });
  res.json({ ok: true });
});

export default router;
