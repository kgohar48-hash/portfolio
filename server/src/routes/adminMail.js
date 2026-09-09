import crypto from "node:crypto";
import { Router } from "express";
import { isDbConnected } from "../config/db.js";
import Mail from "../models/Mail.js";
import MailSettings from "../models/MailSettings.js";
import JobApplication from "../models/JobApplication.js";
import { JOB_STATUSES } from "../data/jobSchema.js";
import { processMail, classifyEmail, pickCandidates, applyStatus, recordInterview } from "../lib/mailMatcher.js";

// Mounted at /api/admin/mail — parent enforces requireAdmin.
const router = Router();

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Parse a pasted email. Accepts either explicit fields, or a raw paste whose
 * first lines may be "From:", "Subject:", "Date:", "To:" headers.
 */
function parsePaste({ raw = "", from = "", subject = "", date = "" }) {
  let body = String(raw || "");
  let f = String(from || "").trim();
  let s = String(subject || "").trim();
  let d = String(date || "").trim();

  const lines = body.split(/\r?\n/);
  let consumed = 0;
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const m = lines[i].match(/^\s*(from|subject|date|sent|to)\s*:\s*(.+)$/i);
    if (!m) {
      if (lines[i].trim() === "" && consumed > 0) {
        consumed = i + 1;
        break;
      }
      if (consumed === 0) break; // first non-blank line isn't a header → treat whole thing as body
      continue;
    }
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "from" && !f) f = val;
    else if (key === "subject" && !s) s = val;
    else if ((key === "date" || key === "sent") && !d) d = val;
    consumed = i + 1;
  }
  if (consumed > 0) body = lines.slice(consumed).join("\n").trim();

  // pull an address out of "Name <a@b.com>" or a bare address
  const emailMatch = f.match(/<([^>]+)>/) || f.match(/([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)/);
  const address = emailMatch ? emailMatch[1].toLowerCase() : "";
  const name = f.replace(/<[^>]+>/, "").replace(/["']/g, "").trim();

  const parsedDate = d ? new Date(d) : null;

  return {
    from: { name: name || undefined, address: address || undefined },
    subject: s,
    date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date(),
    text: body
  };
}

/* ---------------------------------------------------------------- settings --- */
router.get("/settings", async (_req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false });
  const s = await MailSettings.get();
  res.json({ ok: true, settings: s, llm: Boolean(process.env.GEMINI_API_KEY) });
});

router.patch("/settings", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const s = await MailSettings.get();
  if (req.body?.statusAutoApplyMinConfidence != null) {
    s.statusAutoApplyMinConfidence = Math.max(0, Math.min(1, Number(req.body.statusAutoApplyMinConfidence)));
    await s.save();
  }
  res.json({ ok: true, settings: s });
});

/* ------------------------------------------------------------------- paste --- */
router.post("/paste", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ ok: false, error: "GEMINI_API_KEY is not set on the server." });

  const parsed = parsePaste(req.body || {});
  if ((parsed.text || "").trim().length < 20) {
    return res.status(422).json({ ok: false, error: "Paste the email body — that's too short to classify." });
  }

  const messageId =
    "paste-" +
    crypto
      .createHash("sha1")
      .update(`${parsed.from.address || ""}|${parsed.subject}|${parsed.text.slice(0, 4000)}`)
      .digest("hex");

  let mail = await Mail.findOne({ messageId });
  let deduped = false;
  if (mail) {
    deduped = true;
  } else {
    mail = await Mail.create({
      messageId,
      source: "paste",
      from: parsed.from,
      subject: parsed.subject,
      date: parsed.date,
      text: parsed.text.slice(0, 100000),
      snippet: parsed.text.replace(/\s+/g, " ").trim().slice(0, 300)
    });
  }

  const result = await processMail(mail).catch((e) => ({ action: "error", reason: e.message }));
  const fresh = await Mail.findById(mail._id).populate("matchedApplication", "company role status").lean();
  res.json({ ok: true, deduped, result, mail: fresh });
});

/* -------------------------------------------------------------------- list --- */
router.get("/", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false, items: [], total: 0 });
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
  const view = req.query.view || "all";

  const filter = {};
  if (view === "review") filter.pendingReview = true;
  else if (view === "auto") filter.appliedAutomatically = true;
  else if (view === "unmatched") { filter.isJobRelated = true; filter.matchedApplication = { $exists: false }; }
  else if (view === "job") filter.isJobRelated = true;

  const [items, total, reviewCount] = await Promise.all([
    Mail.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("matchedApplication", "company role status")
      .lean(),
    Mail.countDocuments(filter),
    Mail.countDocuments({ pendingReview: true })
  ]);

  res.json({ ok: true, db: true, items, total, page, pages: Math.ceil(total / limit), reviewCount });
});

router.get("/:id", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false });
  const mail = await Mail.findById(req.params.id).populate("matchedApplication").lean().catch(() => null);
  if (!mail) return res.status(404).json({ ok: false, error: "Not found." });

  const apps = await JobApplication.find({ updatedAt: { $gte: new Date(Date.now() - 200 * 864e5) } })
    .select("company role status")
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  res.json({ ok: true, mail, applications: apps });
});

router.post("/:id/apply", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const mail = await Mail.findById(req.params.id);
  if (!mail) return res.status(404).json({ ok: false, error: "Not found." });

  const appId = req.body.applicationId || mail.matchedApplication;
  const status = req.body.status || mail.proposedStatus;
  if (!appId) return res.status(422).json({ ok: false, error: "No application to update." });
  if (!status || !JOB_STATUSES.includes(status)) return res.status(422).json({ ok: false, error: "Invalid status." });

  const app = await applyStatus(appId, status, {
    via: "email:review",
    note: mail.reasoning,
    confidence: mail.statusConfidence
  });
  if (mail.extracted?.interviewDate && ["interview_invite", "scheduling"].includes(mail.emailType)) {
    await recordInterview(appId, mail.extracted.interviewDate);
  }

  mail.matchedApplication = appId;
  mail.proposedStatus = status;
  mail.statusApplied = true;
  mail.pendingReview = false;
  mail.reviewedAt = new Date();
  await mail.save();

  res.json({ ok: true, mail: mail.toObject(), application: app });
});

router.post("/:id/match", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const mail = await Mail.findById(req.params.id);
  if (!mail) return res.status(404).json({ ok: false, error: "Not found." });
  const app = await JobApplication.findById(req.body.applicationId).catch(() => null);
  if (!app) return res.status(404).json({ ok: false, error: "Application not found." });
  mail.matchedApplication = app._id;
  mail.isJobRelated = true;
  await mail.save();
  res.json({ ok: true, mail: mail.toObject() });
});

/** Create a new application from what the LLM read out of an unmatched email. */
router.post("/:id/create-application", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const mail = await Mail.findById(req.params.id);
  if (!mail) return res.status(404).json({ ok: false, error: "Not found." });

  const company = String(req.body.company || mail.extractedCompany || "").trim();
  const role = String(req.body.role || mail.extractedRole || "").trim();
  if (!company || !role) {
    return res.status(422).json({ ok: false, error: "Need a company and role — the email didn't give enough to guess both." });
  }
  const status = JOB_STATUSES.includes(req.body.status)
    ? req.body.status
    : mail.proposedStatus && JOB_STATUSES.includes(mail.proposedStatus)
      ? mail.proposedStatus
      : "applied";

  let app = await JobApplication.findOne({ companyKey: norm(company), roleKey: norm(role) });
  if (!app) {
    app = await JobApplication.create({
      company,
      role,
      companyKey: norm(company),
      roleKey: norm(role),
      status,
      contactEmail: mail.from?.address,
      createdVia: "manual",
      statusHistory: [{ at: new Date(), from: "to_apply", to: status, via: "email:review", note: "created from a pasted email" }]
    });
  }
  if (mail.extracted?.interviewDate) await recordInterview(app._id, mail.extracted.interviewDate);

  mail.matchedApplication = app._id;
  mail.statusApplied = true;
  mail.pendingReview = Boolean(mail.replyDraft);
  mail.reviewedAt = new Date();
  await mail.save();

  res.json({ ok: true, mail: mail.toObject(), application: app.toObject() });
});

router.post("/:id/dismiss", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const mail = await Mail.findByIdAndUpdate(
    req.params.id,
    { $set: { pendingReview: false, dismissed: true, reviewedAt: new Date() } },
    { new: true }
  );
  if (!mail) return res.status(404).json({ ok: false, error: "Not found." });
  res.json({ ok: true, mail: mail.toObject() });
});

router.delete("/:id", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const gone = await Mail.findByIdAndDelete(req.params.id).catch(() => null);
  if (!gone) return res.status(404).json({ ok: false, error: "Not found." });
  res.json({ ok: true });
});

router.post("/:id/reprocess", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const mail = await Mail.findById(req.params.id);
  if (!mail) return res.status(404).json({ ok: false, error: "Not found." });
  const result = await processMail(mail).catch((e) => ({ action: "error", reason: e.message }));
  res.json({ ok: true, result, mail: await Mail.findById(req.params.id).lean() });
});

router.post("/:id/draft", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ ok: false, error: "GEMINI_API_KEY not set." });
  const mail = await Mail.findById(req.params.id);
  if (!mail) return res.status(404).json({ ok: false, error: "Not found." });

  const apps = await JobApplication.find().select("company role status contactEmail jobUrl updatedAt").lean();
  const candidates = pickCandidates(mail, apps);
  try {
    const v = await classifyEmail(mail, candidates);
    mail.replyDraft = v.suggestedReply ? String(v.suggestedReply).slice(0, 8000) : "";
    mail.replyConfidence = Math.max(0, Math.min(1, Number(v.replyConfidence) || 0));
    await mail.save();
    res.json({ ok: true, replyDraft: mail.replyDraft, replyConfidence: mail.replyConfidence });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

export default router;
