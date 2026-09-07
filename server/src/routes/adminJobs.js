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

// Mounted at /api/admin/jobs — parent router already enforces requireAdmin.
const router = Router();

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const str = (v, max) => (v == null ? undefined : String(v).slice(0, max));
const oneOf = (v, list) => (list.includes(v) ? v : undefined);
const strArr = (v, maxItems = 50, maxLen = 500) =>
  Array.isArray(v)
    ? v
        .filter((x) => x != null && String(x).trim())
        .slice(0, maxItems)
        .map((x) => String(x).slice(0, maxLen))
    : undefined;
const asDate = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

function normalizeInput(body) {
  const out = {};
  const setStr = (k, max) => {
    const v = str(body[k], max);
    if (v !== undefined && v !== "") out[k] = v;
  };
  const setArr = (k) => {
    const v = strArr(body[k]);
    if (v) out[k] = v;
  };
  const setDate = (k) => {
    const v = asDate(body[k]);
    if (v) out[k] = v;
  };

  setStr("company", 200);
  setStr("role", 200);
  setStr("location", 200);
  setStr("jobUrl", 1000);
  setStr("source", 200);
  setStr("salary", 200);
  setStr("summary", 4000);
  setStr("coverLetter", 20000);
  setStr("contactName", 200);
  setStr("contactEmail", 200);
  setStr("nextAction", 2000);
  setStr("notes", 10000);

  const wm = oneOf(body.workMode, WORK_MODES);
  if (wm) out.workMode = wm;
  const et = oneOf(body.employmentType, EMPLOYMENT_TYPES);
  if (et) out.employmentType = et;
  const sn = oneOf(body.seniority, SENIORITY);
  if (sn) out.seniority = sn;
  const pr = oneOf(body.priority, PRIORITIES);
  if (pr) out.priority = pr;
  const st = oneOf(body.status, JOB_STATUSES);
  if (st) out.status = st;

  if (body.fitScore != null && !Number.isNaN(Number(body.fitScore))) {
    out.fitScore = Math.max(0, Math.min(100, Math.round(Number(body.fitScore))));
  }

  setArr("keyRequirements");
  setArr("matchedStrengths");
  setArr("gaps");
  setArr("atsKeywords");
  setArr("resumeChanges");
  setArr("tags");

  setDate("postedDate");
  setDate("deadline");
  setDate("appliedDate");
  setDate("nextActionDate");

  return out;
}

function applyFields(job, fields) {
  if (fields.status && fields.status !== job.status) {
    job.statusHistory.push({ at: new Date(), from: job.status, to: fields.status });
    if (fields.status === "applied" && !fields.appliedDate && !job.appliedDate) {
      job.appliedDate = new Date();
    }
  }
  Object.assign(job, fields);
  if (fields.company) job.companyKey = norm(fields.company);
  if (fields.role) job.roleKey = norm(fields.role);
  job.lastJson = fields;
}

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
