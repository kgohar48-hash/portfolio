import crypto from "node:crypto";
import { Router } from "express";
import { isDbConnected } from "../config/db.js";
import Cv from "../models/Cv.js";
import JobApplication from "../models/JobApplication.js";
import { generateCv, getMaster, saveMaster } from "../lib/cvGenerator.js";
import { upsertJobForCv } from "../lib/jobs.js";
import { CV_RESPONSE_SCHEMA, cvTemplate } from "../data/cvSchema.js";

// Mounted at /api/admin/cv — parent router enforces requireAdmin.
const router = Router();

const SITE = (process.env.CLIENT_ORIGIN || "https://goharawan.com").split(",")[0].trim();

async function uniqueSlug() {
  for (let i = 0; i < 6; i++) {
    const slug = crypto.randomBytes(6).toString("base64url"); // 8 chars
    const clash = await Cv.exists({ slug });
    if (!clash) return slug;
  }
  throw new Error("could not allocate a unique slug");
}

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const cvUrlFor = (slug) => `${SITE.replace(/\/$/, "")}/cv/${slug}`;

/* --------------------------------------------------------------- master --- */
router.get("/master", async (_req, res) => {
  const master = await getMaster();
  res.json({ ok: true, master, llm: Boolean(process.env.GEMINI_API_KEY) });
});

router.put("/master", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const data = req.body?.master ?? req.body;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(422).json({ ok: false, error: "Send the master résumé as a JSON object." });
  }
  if (!data.name) return res.status(422).json({ ok: false, error: 'The master needs at least a "name".' });
  const saved = await saveMaster(data);
  res.json({ ok: true, master: saved });
});

/* --------------------------------------------------------------- schema --- */
router.get("/schema", (_req, res) => {
  res.json({ ok: true, responseSchema: CV_RESPONSE_SCHEMA, template: cvTemplate() });
});

/* ------------------------------------------------------------- generate --- */
router.post("/generate", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ ok: false, error: "GEMINI_API_KEY is not set on the server." });
  }

  const company = String(req.body?.company || "").trim();
  const role = String(req.body?.role || "").trim();
  const jobDescription = String(req.body?.jobDescription || "").trim();
  const jobUrl = String(req.body?.jobUrl || "").trim().slice(0, 1000);

  if (!company || !role) return res.status(422).json({ ok: false, error: "Company and role are required." });
  if (jobDescription.length < 60) {
    return res.status(422).json({ ok: false, error: "Paste the job description — that's too short to tailor from." });
  }

  let generated;
  try {
    generated = await generateCv({ company, role, jobDescription });
  } catch (err) {
    return res.status(502).json({ ok: false, error: `Generation failed: ${err.message}` });
  }

  const slug = await uniqueSlug();
  const url = cvUrlFor(slug);

  const { job } = await upsertJobForCv({
    company,
    role,
    fields: {
      ...(jobUrl ? { jobUrl } : {}),
      ...(generated.jobMeta.location ? { location: generated.jobMeta.location } : {}),
      keyRequirements: generated.jobMeta.keyRequirements,
      matchedStrengths: generated.jobMeta.matchedStrengths,
      atsKeywords: generated.jobMeta.atsKeywords,
      ...(generated.jobMeta.fitScore != null ? { fitScore: generated.jobMeta.fitScore } : {}),
      source: "CV generator"
    },
    cvSlug: slug,
    cvUrl: url,
    coverLetter: generated.coverLetter
  });

  const cv = await Cv.create({
    slug,
    company,
    role,
    companyKey: norm(company),
    roleKey: norm(role),
    jobDescription: jobDescription.slice(0, 24000),
    jobUrl: jobUrl || undefined,
    data: generated.cv,
    coverLetter: generated.coverLetter,
    jobMeta: generated.jobMeta,
    jobApplication: job._id,
    model: generated.model
  });

  res.status(201).json({ ok: true, cv: cv.toObject(), job: job.toObject(), url });
});

/* ----------------------------------------------------------------- list --- */
router.get("/", async (_req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false, items: [] });
  const items = await Cv.find()
    .sort({ createdAt: -1 })
    .limit(300)
    .select("slug company role status openCount clickCount visitCount jobApplication model createdAt updatedAt")
    .lean();
  res.json({ ok: true, db: true, items, site: SITE.replace(/\/$/, "") });
});

/* ----------------------------------------------------------------- read --- */
router.get("/:id", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false });
  const cv = await Cv.findById(req.params.id).populate("jobApplication", "company role status").lean().catch(() => null);
  if (!cv) return res.status(404).json({ ok: false, error: "Not found." });
  res.json({ ok: true, cv, url: cvUrlFor(cv.slug) });
});

/* ------------------------------------------------------- edit / regenerate --- */
router.patch("/:id", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const cv = await Cv.findById(req.params.id);
  if (!cv) return res.status(404).json({ ok: false, error: "Not found." });

  const b = req.body || {};
  if (b.data && typeof b.data === "object") cv.data = { ...cv.data, ...b.data };
  if (typeof b.coverLetter === "string") {
    cv.coverLetter = b.coverLetter.slice(0, 24000);
    if (cv.jobApplication) {
      await JobApplication.findByIdAndUpdate(cv.jobApplication, { $set: { coverLetter: cv.coverLetter.slice(0, 20000) } });
    }
  }
  if (b.status === "draft" || b.status === "sent") cv.status = b.status;
  await cv.save();
  res.json({ ok: true, cv: cv.toObject() });
});

router.post("/:id/regenerate", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ ok: false, error: "GEMINI_API_KEY is not set." });
  const cv = await Cv.findById(req.params.id);
  if (!cv) return res.status(404).json({ ok: false, error: "Not found." });

  let generated;
  try {
    generated = await generateCv({ company: cv.company, role: cv.role, jobDescription: cv.jobDescription });
  } catch (err) {
    return res.status(502).json({ ok: false, error: `Regeneration failed: ${err.message}` });
  }

  cv.data = generated.cv;
  cv.coverLetter = generated.coverLetter;
  cv.jobMeta = generated.jobMeta;
  cv.model = generated.model;
  await cv.save();

  if (cv.jobApplication) {
    await JobApplication.findByIdAndUpdate(cv.jobApplication, {
      $set: { coverLetter: generated.coverLetter.slice(0, 20000) }
    });
  }

  res.json({ ok: true, cv: cv.toObject() });
});

router.delete("/:id", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const gone = await Cv.findByIdAndDelete(req.params.id).catch(() => null);
  if (!gone) return res.status(404).json({ ok: false, error: "Not found." });
  res.json({ ok: true });
});

export default router;
