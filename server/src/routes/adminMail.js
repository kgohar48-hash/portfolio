import { Router } from "express";
import { isDbConnected } from "../config/db.js";
import Mail from "../models/Mail.js";
import MailSettings from "../models/MailSettings.js";
import JobApplication from "../models/JobApplication.js";
import { JOB_STATUSES } from "../data/jobSchema.js";
import { processMail, classifyEmail, pickCandidates, applyStatus, recordInterview } from "../lib/mailMatcher.js";
import { mailConfigured, sendReply } from "../lib/mailSend.js";

// Mounted at /api/admin/mail — parent enforces requireAdmin.
const router = Router();

router.get("/settings", async (_req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false });
  const s = await MailSettings.get();
  res.json({ ok: true, settings: s, smtp: mailConfigured(), llm: Boolean(process.env.GEMINI_API_KEY) });
});

router.patch("/settings", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const s = await MailSettings.get();
  const b = req.body || {};
  const num01 = (v) => Math.max(0, Math.min(1, Number(v)));
  if (b.statusAutoApplyMinConfidence != null) s.statusAutoApplyMinConfidence = num01(b.statusAutoApplyMinConfidence);
  if (typeof b.replyAutoSend === "boolean") s.replyAutoSend = b.replyAutoSend;
  if (b.replyAutoSendMinConfidence != null) s.replyAutoSendMinConfidence = num01(b.replyAutoSendMinConfidence);
  if (Array.isArray(b.replyAutoSendTypes)) s.replyAutoSendTypes = b.replyAutoSendTypes.map(String).slice(0, 20);
  await s.save();
  res.json({ ok: true, settings: s });
});

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

  // small candidate list so the UI can offer a "change match" dropdown
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

router.post("/:id/reprocess", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  const mail = await Mail.findById(req.params.id);
  if (!mail) return res.status(404).json({ ok: false, error: "Not found." });
  const result = await processMail(mail).catch((e) => ({ action: "error", reason: e.message }));
  res.json({ ok: true, result, mail: (await Mail.findById(req.params.id).lean()) });
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

router.post("/:id/reply", async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ ok: false, error: "No database connected." });
  if (!mailConfigured()) return res.status(503).json({ ok: false, error: "SMTP is not configured." });
  const mail = await Mail.findById(req.params.id);
  if (!mail) return res.status(404).json({ ok: false, error: "Not found." });

  const body = String(req.body.body || "").trim();
  if (body.length < 2) return res.status(422).json({ ok: false, error: "Reply body is empty." });

  try {
    await sendReply(mail, body, { subject: req.body.subject });
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Send failed: ${e.message}` });
  }

  mail.replyBodySent = body.slice(0, 20000);
  mail.replySentAt = new Date();
  mail.pendingReview = false;
  await mail.save();
  res.json({ ok: true, mail: mail.toObject() });
});

export default router;
