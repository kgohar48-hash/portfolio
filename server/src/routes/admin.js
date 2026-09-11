import { Router } from "express";
import rateLimit from "express-rate-limit";
import { isDbConnected } from "../config/db.js";
import Visitor from "../models/Visitor.js";
import Session from "../models/Session.js";
import Event from "../models/Event.js";
import { adminConfigured, verifyPassword, issueToken, requireAdmin } from "../lib/adminAuth.js";
import jobsRouter from "./adminJobs.js";
import mailRouter from "./adminMail.js";
import cvRouter from "./adminCv.js";
import linksRouter from "./adminLinks.js";

const router = Router();

const SECTION_ORDER = ["hero", "about", "skills", "projects", "philosophy", "experience", "education", "bookshelf", "contact"];

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many login attempts. Try again later." }
});

router.post("/login", loginLimiter, (req, res) => {
  if (!adminConfigured) {
    return res.status(503).json({ ok: false, error: "Admin dashboard is not configured on this server." });
  }
  const { password } = req.body || {};
  if (!verifyPassword(String(password || ""))) {
    return res.status(401).json({ ok: false, error: "Wrong password." });
  }
  return res.json({ ok: true, token: issueToken() });
});

// Everything below requires a valid admin token.
router.use(requireAdmin);

router.get("/me", (_req, res) => res.json({ ok: true, admin: true }));

// Job-application tracker
router.use("/jobs", jobsRouter);
// Job-mailbox inbox + LLM matcher
router.use("/mail", mailRouter);
// CV / cover-letter generator
router.use("/cv", cvRouter);
// Hand-picked custom tracking links (goharawan.com/r/<name>/portfolio)
router.use("/links", linksRouter);

function rangeToStart(range) {
  const now = Date.now();
  const map = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
  if (range === "all") return new Date(0);
  const days = map[range] ?? 7;
  return new Date(now - days * 86400000);
}

function baseMatch(req) {
  const start = rangeToStart(req.query.range);
  const includeBots = req.query.includeBots === "1" || req.query.includeBots === "true";
  const m = { startedAt: { $gte: start } };
  if (!includeBots) m.isBot = { $ne: true };
  if (req.query.channel) m.channel = String(req.query.channel);
  if (req.query.country) m["geo.country"] = String(req.query.country);
  if (req.query.deviceType) m["device.deviceType"] = String(req.query.deviceType);
  return m;
}

const topBreakdown = (field, limit = 10) => [
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $match: { _id: { $nin: [null, ""] } } },
  { $sort: { count: -1 } },
  { $limit: limit },
  { $project: { _id: 0, label: "$_id", count: 1 } }
];

router.get("/overview", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false });
  const match = baseMatch(req);

  const [
    totals,
    byDay,
    channels,
    sources,
    countries,
    cities,
    browsers,
    os,
    devices,
    referrers,
    scrollBuckets,
    sectionAgg,
    topClicks,
    durationBuckets
  ] = await Promise.all([
    Session.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          sessions: { $sum: 1 },
          visitors: { $addToSet: "$visitorId" },
          returning: { $sum: { $cond: ["$isReturning", 1, 0] } },
          bounced: { $sum: { $cond: ["$bounced", 1, 0] } },
          avgDurationMs: { $avg: "$durationMs" },
          avgEngagedMs: { $avg: "$engagedMs" },
          avgScrollPct: { $avg: "$maxScrollPct" },
          avgClicks: { $avg: "$clickCount" },
          contactStarted: { $sum: { $cond: ["$contactStarted", 1, 0] } },
          contactSubmitted: { $sum: { $cond: ["$contactSubmitted", 1, 0] } },
          outboundClicks: { $sum: "$outboundClickCount" }
        }
      },
      {
        $project: {
          _id: 0,
          sessions: 1,
          uniqueVisitors: { $size: "$visitors" },
          returning: 1,
          bounced: 1,
          avgDurationMs: 1,
          avgEngagedMs: 1,
          avgScrollPct: 1,
          avgClicks: 1,
          contactStarted: 1,
          contactSubmitted: 1,
          outboundClicks: 1
        }
      }
    ]),
    Session.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } },
          sessions: { $sum: 1 },
          visitors: { $addToSet: "$visitorId" }
        }
      },
      { $project: { _id: 0, date: "$_id", sessions: 1, visitors: { $size: "$visitors" } } },
      { $sort: { date: 1 } }
    ]),
    Session.aggregate([{ $match: match }, ...topBreakdown("channel", 8)]),
    Session.aggregate([{ $match: match }, ...topBreakdown("source", 12)]),
    Session.aggregate([{ $match: match }, ...topBreakdown("geo.country", 12)]),
    Session.aggregate([{ $match: match }, ...topBreakdown("geo.city", 12)]),
    Session.aggregate([{ $match: match }, ...topBreakdown("device.browser", 8)]),
    Session.aggregate([{ $match: match }, ...topBreakdown("device.os", 8)]),
    Session.aggregate([{ $match: match }, ...topBreakdown("device.deviceType", 5)]),
    Session.aggregate([{ $match: match }, ...topBreakdown("referrerHost", 12)]),
    Session.aggregate([
      { $match: match },
      {
        $bucket: {
          groupBy: "$maxScrollPct",
          boundaries: [0, 25, 50, 75, 100, 101],
          default: "0",
          output: { count: { $sum: 1 } }
        }
      }
    ]),
    Session.aggregate([
      { $match: match },
      { $unwind: { path: "$sectionsViewed", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$sectionsViewed", count: { $sum: 1 } } }
    ]),
    Event.aggregate([
      { $match: { type: "click", ts: { $gte: match.startedAt.$gte } } },
      {
        $group: {
          _id: { $ifNull: ["$target.name", { $ifNull: ["$target.text", "$target.tag"] }] },
          count: { $sum: 1 }
        }
      },
      { $match: { _id: { $nin: [null, ""] } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
      { $project: { _id: 0, label: "$_id", count: 1 } }
    ]),
    Session.aggregate([
      { $match: match },
      {
        $bucket: {
          groupBy: "$durationMs",
          boundaries: [0, 10000, 30000, 60000, 180000, 600000, 86400001],
          default: "600000+",
          output: { count: { $sum: 1 } }
        }
      }
    ])
  ]);

  const t = totals[0] || {};
  const sectionMap = Object.fromEntries(sectionAgg.map((s) => [s._id, s.count]));
  const funnel = SECTION_ORDER.map((s) => ({ section: s, count: sectionMap[s] || 0 }));

  const scrollLabels = ["0–25%", "25–50%", "50–75%", "75–99%", "100%"];
  const scrollDistribution = scrollLabels.map((label, i) => ({
    label,
    count: scrollBuckets.find((b) => b._id === [0, 25, 50, 75, 100][i])?.count || 0
  }));

  const durLabels = ["<10s", "10–30s", "30–60s", "1–3m", "3–10m", "10m+"];
  const durBoundaries = [0, 10000, 30000, 60000, 180000, 600000];
  const durationDistribution = durLabels.map((label, i) => ({
    label,
    count: durationBuckets.find((b) => b._id === durBoundaries[i])?.count || 0
  }));

  res.json({
    ok: true,
    db: true,
    range: req.query.range || "7d",
    cards: {
      sessions: t.sessions || 0,
      uniqueVisitors: t.uniqueVisitors || 0,
      returningVisitors: t.returning || 0,
      newVisitors: (t.sessions || 0) - (t.returning || 0),
      bounceRate: t.sessions ? t.bounced / t.sessions : 0,
      avgDurationMs: t.avgDurationMs || 0,
      avgEngagedMs: t.avgEngagedMs || 0,
      avgScrollPct: t.avgScrollPct || 0,
      avgClicks: t.avgClicks || 0,
      contactStarted: t.contactStarted || 0,
      contactSubmitted: t.contactSubmitted || 0,
      outboundClicks: t.outboundClicks || 0
    },
    timeseries: byDay,
    breakdowns: {
      channels,
      sources,
      countries,
      cities,
      browsers,
      os,
      devices,
      referrers,
      topClicks
    },
    engagement: { funnel, scrollDistribution, durationDistribution }
  });
});

router.get("/sessions", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false, items: [], total: 0 });
  const match = baseMatch(req);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
  const q = String(req.query.q || "").trim();
  if (q) {
    const safe = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [
      { "geo.city": safe },
      { "geo.country": safe },
      { source: safe },
      { "device.browser": safe },
      { visitorId: q }
    ];
  }

  const [items, total] = await Promise.all([
    Session.find(match)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "sessionId visitorId startedAt durationMs engagedMs isReturning visitNumber isBot bounced geo device channel source referrerHost maxScrollPct clickCount outboundClickCount sectionsViewed contactSubmitted cvSlug"
      )
      .lean(),
    Session.countDocuments(match)
  ]);

  res.json({ ok: true, db: true, items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.get("/sessions/:sessionId", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false });
  const session = await Session.findOne({ sessionId: req.params.sessionId }).lean();
  if (!session) return res.status(404).json({ ok: false, error: "Session not found." });
  const events = await Event.find({ sessionId: req.params.sessionId }).sort({ ts: 1 }).limit(1000).lean();
  res.json({ ok: true, session, events });
});

router.get("/visitors", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false, items: [], total: 0 });
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
  const filter = {};
  if (req.query.returning === "1") filter.sessionCount = { $gt: 1 };
  if (req.query.known === "1") filter.knownVia = { $exists: true, $ne: null };

  const [items, total] = await Promise.all([
    Visitor.find(filter)
      .sort({ lastSeenAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Visitor.countDocuments(filter)
  ]);
  res.json({ ok: true, db: true, items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.get("/visitors/:visitorId", async (req, res) => {
  if (!isDbConnected()) return res.json({ ok: true, db: false });
  const visitor = await Visitor.findOne({ visitorId: req.params.visitorId }).lean();
  if (!visitor) return res.status(404).json({ ok: false, error: "Visitor not found." });
  const sessions = await Session.find({ visitorId: req.params.visitorId }).sort({ startedAt: -1 }).limit(100).lean();
  res.json({ ok: true, visitor, sessions });
});

router.get("/export/sessions.csv", async (req, res) => {
  if (!isDbConnected()) return res.status(503).send("database offline");
  const match = baseMatch(req);
  const rows = await Session.find(match).sort({ startedAt: -1 }).limit(5000).lean();
  const cols = [
    "startedAt", "visitorId", "isReturning", "visitNumber", "durationMs", "engagedMs",
    "channel", "source", "referrerHost", "geo.country", "geo.city",
    "device.deviceType", "device.browser", "device.os",
    "maxScrollPct", "clickCount", "outboundClickCount", "contactSubmitted", "bounced", "isBot"
  ];
  const get = (o, path) => path.split(".").reduce((v, k) => (v == null ? v : v[k]), o);
  const esc = (v) => {
    const s = v == null ? "" : String(v instanceof Date ? v.toISOString() : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(get(r, c))).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="sessions-${req.query.range || "7d"}.csv"`);
  res.send(csv);
});

export default router;
