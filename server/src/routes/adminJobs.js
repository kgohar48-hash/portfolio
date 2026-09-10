import { Router } from "express";
import { isDbConnected } from "../config/db.js";
import JobApplication from "../models/JobApplication.js";
import {
  JOB_FIELDS,
  JOB_STATUSES,
  WORK_MODES,
  EMPLOYMENT_TYPES,
  SENIORITY,
  PRIORITIES,
  schemaTemplate,
  llmPrompt
} from "../data/jobSchema.js";
import { norm, asDate, normalizeInput, applyFields } from "../lib/jobs.js";

// Mounted at /api/admin/jobs — parent router already enforces requireAdmin.
const router = Router();

const str = (v, max) => (v == null ? undefined : String(v).slice(0, max));

/* ---------------------------------------------------------------- schema --- */
router.get("/schema", (_req, res) => {
  res.json({
    ok: true,
    fields: JOB_FIELDS,
    statuses: JOB_STATUSES,
    workModes: WORK_MODES,
    employmentTypes: EMPLOYMENT_TYPES,
    seniority: SENIORITY,
    priorities: PRIORITIES,
    template: schemaTemplate(),
    prompt: llmPrompt()
  });
});

/* ------------------------------------------------------------------ list --- */
router.get("/", async (_req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false, items: [] });
  const items = await JobApplication.find().sort({ updatedAt: -1 }).limit(500).lean();
  res.json({ ok: true, db: true, items });
});

/* --------------------------------------------------------- create / upsert --- */
router.post("/", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "That isn't valid JSON." });
    }
  }
  // client may wrap the pasted text as { json: "..." }
  if (typeof body.json === "string") {
    try {
      const parsed = JSON.parse(body.json);
      body = { ...parsed, id: body.id, force: body.force };
    } catch {
      return res.status(400).json({ ok: false, error: "That isn't valid JSON." });
    }
  }

  const fields = normalizeInput(body);
  const id = body.id || body._id;

  // update an explicit id (round-trip from the drawer's "copy JSON")
  if (id) {
    const job = await JobApplication.findById(id).catch(() => null);
    if (!job) return res.status(404).json({ ok: false, error: "The application to update was not found." });
    applyFields(job, fields);
    await job.save();
    return res.json({ ok: true, job: job.toObject(), updated: true });
  }

  if (!fields.company || !fields.role) {
    return res.status(422).json({ ok: false, error: 'The JSON needs at least "company" and "role".' });
  }

  const companyKey = norm(fields.company);
  const roleKey = norm(fields.role);
  const existing = await JobApplication.findOne({ companyKey, roleKey });

  // ask the client before overwriting an existing entry
  if (existing && !body.force) {
    return res.json({
      ok: true,
      duplicate: true,
      existingId: String(existing._id),
      existing: {
        company: existing.company,
        role: existing.role,
        status: existing.status,
        updatedAt: existing.updatedAt
      }
    });
  }

  if (existing && body.force === "update") {
    applyFields(existing, fields);
    existing.lastJson = fields;
    await existing.save();
    return res.json({ ok: true, job: existing.toObject(), updated: true });
  }

  const job = new JobApplication({
    ...fields,
    companyKey,
    roleKey,
    status: fields.status || "to_apply",
    priority: fields.priority || "medium",
    createdVia: body.__manual ? "manual" : "json",
    lastJson: fields
  });
  await job.save();
  return res.status(201).json({ ok: true, job: job.toObject(), created: true });
});

/* ------------------------------------------------------------------ read --- */
router.get("/:id", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false });
  const job = await JobApplication.findById(req.params.id).lean().catch(() => null);
  if (!job) return res.status(404).json({ ok: false, error: "Not found." });
  res.json({ ok: true, job });
});

/* --------------------------------------------------- inline edits (drawer) --- */
router.patch("/:id", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const job = await JobApplication.findById(req.params.id).catch(() => null);
  if (!job) return res.status(404).json({ ok: false, error: "Not found." });

  const b = req.body || {};

  if (b.status && JOB_STATUSES.includes(b.status) && b.status !== job.status) {
    job.statusHistory.push({ at: new Date(), from: job.status, to: b.status });
    job.status = b.status;
    if (b.status === "applied" && !job.appliedDate) job.appliedDate = new Date();
  }
  if (b.priority && PRIORITIES.includes(b.priority)) job.priority = b.priority;
  if (typeof b.notes === "string") job.notes = b.notes.slice(0, 10000);
  if (typeof b.nextAction === "string") job.nextAction = b.nextAction.slice(0, 2000);
  if (b.nextActionDate !== undefined) job.nextActionDate = asDate(b.nextActionDate);
  if (b.appliedDate !== undefined) job.appliedDate = asDate(b.appliedDate);
  if (typeof b.location === "string") job.location = b.location.slice(0, 200);
  if (typeof b.jobUrl === "string") job.jobUrl = b.jobUrl.slice(0, 1000);

  if (b.addInterview) {
    job.interviews.push({
      date: asDate(b.addInterview.date),
      kind: str(b.addInterview.kind, 100),
      notes: str(b.addInterview.notes, 4000),
      outcome: ["pending", "passed", "failed"].includes(b.addInterview.outcome) ? b.addInterview.outcome : "pending"
    });
  }
  if (b.removeInterviewId) {
    const sub = job.interviews.id(b.removeInterviewId);
    if (sub) sub.deleteOne();
  }

  await job.save();
  res.json({ ok: true, job: job.toObject() });
});

/* ---------------------------------------------------------------- delete --- */
router.delete("/:id", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const gone = await JobApplication.findByIdAndDelete(req.params.id).catch(() => null);
  if (!gone) return res.status(404).json({ ok: false, error: "Not found." });
  res.json({ ok: true });
});

export default router;
