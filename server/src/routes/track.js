import { Router } from "express";
import rateLimit from "express-rate-limit";
import { isDbConnected } from "../config/db.js";
import Visitor from "../models/Visitor.js";
import Session from "../models/Session.js";
import Event from "../models/Event.js";
import Cv from "../models/Cv.js";
import Link from "../models/Link.js";
import { clientIp, parseUserAgent, deriveAcquisition, hostOf } from "../lib/enrich.js";
import { geolocate } from "../lib/geo.js";
import { recordCvActivity } from "../lib/jobs.js";

// Matches both a CV's auto-generated slug and a hand-picked custom Link slug.
const REF_RE = /^[A-Za-z0-9_-]{3,40}$/;

const router = Router();

// Analytics ingestion is chatty by design — allow generous bursts per IP.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many tracking requests." }
});

const SECTION_ORDER = ["hero", "about", "skills", "projects", "philosophy", "experience", "education", "bookshelf", "contact"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));
const str = (v, max = 400) => (v == null ? undefined : String(v).slice(0, max));

/**
 * sendBeacon posts a Blob; depending on the browser it may arrive as
 * text/plain rather than application/json. Accept both.
 */
function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  try {
    return JSON.parse(req.body?.toString?.() || "{}");
  } catch {
    return {};
  }
}

router.post("/", limiter, async (req, res) => {
  // Always 202 so the browser never retries / surfaces errors to the visitor.
  if (!isDbConnected()) return res.status(202).json({ ok: true, stored: false });

  const body = readBody(req);
  const { visitorId, sessionId, kind } = body;

  if (!UUID_RE.test(visitorId || "") || !UUID_RE.test(sessionId || "")) {
    return res.status(202).json({ ok: true, stored: false });
  }

  try {
    if (kind === "start") await handleStart(req, body);
    else if (kind === "batch") await handleBatch(body);
    else if (kind === "end") await handleEnd(body);
    return res.status(202).json({ ok: true, stored: true });
  } catch (err) {
    console.error(`[track] ${kind} failed: ${err.message}`);
    return res.status(202).json({ ok: true, stored: false });
  }
});

async function handleStart(req, body) {
  const { visitorId, sessionId, context = {} } = body;
  const now = new Date();

  const existing = await Session.findOne({ sessionId }).select("_id").lean();
  if (existing) return; // duplicate start (e.g. retry) — ignore

  const ip = clientIp(req);
  const ua = str(req.get("user-agent"), 600) || str(context.userAgent, 600) || "";
  const device = parseUserAgent(ua);
  const geo = await geolocate(ip);

  const referrer = str(context.referrer, 800) || "";
  const utm = {
    source: str(context.utm?.source, 120),
    medium: str(context.utm?.medium, 120),
    campaign: str(context.utm?.campaign, 120),
    term: str(context.utm?.term, 120),
    content: str(context.utm?.content, 120)
  };
  const currentHost = hostOf(context.landingUrl) || undefined;
  const { source, channel } = deriveAcquisition({ referrer, utm, currentHost });

  // ?ref=<slug> — the visitor arrived via a CV tracking link or a custom Link
  const ref = str(context.ref, 40);
  let cv = null;
  let link = null;
  if (ref && REF_RE.test(ref)) {
    cv = await Cv.findOne({ slug: ref }).select("slug company role jobApplication").lean().catch(() => null);
    if (!cv) link = await Link.findOne({ slug: ref }).select("slug label jobApplication").lean().catch(() => null);
  }
  // unify: { slug, label, jobApplication } either way
  const attributed = cv ? { slug: cv.slug, label: `${cv.company} — ${cv.role}`, jobApplication: cv.jobApplication } : link ? { slug: link.slug, label: link.label, jobApplication: link.jobApplication } : null;

  const prior = await Visitor.findOne({ visitorId }).lean();
  const isReturning = Boolean(prior);
  const visitNumber = (prior?.sessionCount || 0) + 1;
  const daysSinceLastVisit = prior?.lastSeenAt
    ? Math.round((now - new Date(prior.lastSeenAt)) / 86400000)
    : undefined;

  await Session.create({
    sessionId,
    visitorId,
    startedAt: now,
    lastActivityAt: now,
    isReturning,
    visitNumber,
    daysSinceLastVisit,
    ip,
    geo: geo || undefined,
    userAgent: ua,
    isBot: device.isBot,
    device,
    screen: {
      width: clamp(context.screen?.width, 0, 20000) || undefined,
      height: clamp(context.screen?.height, 0, 20000) || undefined,
      viewportW: clamp(context.screen?.viewportW, 0, 20000) || undefined,
      viewportH: clamp(context.screen?.viewportH, 0, 20000) || undefined,
      dpr: clamp(context.screen?.dpr, 0, 8) || undefined,
      colorDepth: clamp(context.screen?.colorDepth, 0, 64) || undefined,
      orientation: str(context.screen?.orientation, 40)
    },
    client: {
      language: str(context.client?.language, 20),
      languages: Array.isArray(context.client?.languages)
        ? context.client.languages.slice(0, 10).map((l) => str(l, 20))
        : undefined,
      timezone: str(context.client?.timezone, 60),
      timezoneOffsetMin: Number.isFinite(context.client?.timezoneOffsetMin)
        ? context.client.timezoneOffsetMin
        : undefined,
      touch: Boolean(context.client?.touch),
      cookiesEnabled: Boolean(context.client?.cookiesEnabled),
      doNotTrack: Boolean(context.client?.doNotTrack),
      connectionType: str(context.client?.connectionType, 20),
      downlinkMbps: clamp(context.client?.downlinkMbps, 0, 10000) || undefined,
      rttMs: clamp(context.client?.rttMs, 0, 600000) || undefined,
      saveData: Boolean(context.client?.saveData),
      deviceMemoryGb: clamp(context.client?.deviceMemoryGb, 0, 1024) || undefined,
      hardwareConcurrency: clamp(context.client?.hardwareConcurrency, 0, 1024) || undefined
    },
    performance: {
      ttfbMs: clamp(context.performance?.ttfbMs, 0, 600000) || undefined,
      domContentLoadedMs: clamp(context.performance?.domContentLoadedMs, 0, 600000) || undefined,
      loadMs: clamp(context.performance?.loadMs, 0, 600000) || undefined
    },
    referrer,
    referrerHost: hostOf(referrer) || undefined,
    landingUrl: str(context.landingUrl, 800),
    landingPath: str(context.landingPath, 400),
    source,
    channel,
    utm,
    ref: ref || undefined,
    cvSlug: attributed?.slug,
    entrySection: str(context.entrySection, 40)
  });

  const visitorSet = {
    lastSeenAt: now,
    lastGeo: geo
      ? { city: geo.city, region: geo.region, country: geo.country, countryCode: geo.countryCode }
      : undefined,
    lastDevice: { browser: device.browser, os: device.os, deviceType: device.deviceType },
    lastChannel: channel,
    lastSource: source
  };
  if (attributed) {
    visitorSet.label = attributed.label;
    visitorSet.knownVia = cv ? "cv" : "link";
  }

  await Visitor.findOneAndUpdate(
    { visitorId },
    {
      $setOnInsert: {
        visitorId,
        firstSeenAt: now,
        firstReferrer: referrer,
        firstReferrerHost: hostOf(referrer) || undefined,
        firstChannel: channel,
        firstSource: source,
        firstUtm: utm,
        firstLandingUrl: str(context.landingUrl, 800)
      },
      $set: visitorSet,
      ...(attributed ? { $addToSet: { cvSlugs: attributed.slug } } : {}),
      $inc: { sessionCount: 1 }
    },
    { upsert: true }
  );

  // record the visit against the CV / custom Link, and its job application if any
  if (attributed) {
    try {
      const visitEntry = {
        at: now,
        sessionId,
        visitorId,
        city: geo?.city,
        country: geo?.country,
        device: device.deviceType
      };
      const Model = cv ? Cv : Link;
      const id = cv ? cv._id : link._id;
      await Model.updateOne(
        { _id: id },
        { $push: { visits: { $each: [visitEntry], $slice: -300 } }, $inc: { visitCount: 1 } }
      );
      if (attributed.jobApplication) {
        await recordCvActivity(attributed.jobApplication, {
          type: "site_visit",
          at: now,
          sessionId,
          visitorId,
          city: geo?.city,
          country: geo?.country,
          device: device.deviceType,
          isBot: device.isBot
        });
      }
    } catch {
      /* attribution must never break session creation */
    }
  }
}

async function handleBatch(body) {
  const { visitorId, sessionId, events = [], rollup = {} } = body;
  const now = new Date();

  const docs = [];
  for (const e of Array.isArray(events) ? events.slice(0, 100) : []) {
    if (!e || typeof e.type !== "string") continue;
    docs.push({
      sessionId,
      visitorId,
      ts: e.ts ? new Date(e.ts) : now,
      type: str(e.type, 40),
      section: str(e.section, 40),
      scrollPct: e.scrollPct != null ? clamp(e.scrollPct, 0, 100) : undefined,
      dwellMs: e.dwellMs != null ? clamp(e.dwellMs, 0, 86400000) : undefined,
      target: e.target
        ? {
            tag: str(e.target.tag, 20),
            id: str(e.target.id, 80),
            cls: str(e.target.cls, 160),
            text: str(e.target.text, 120),
            href: str(e.target.href, 400),
            name: str(e.target.name, 80),
            xPct: e.target.xPct != null ? clamp(e.target.xPct, 0, 100) : undefined,
            yPct: e.target.yPct != null ? clamp(e.target.yPct, 0, 100) : undefined
          }
        : undefined,
      value: e.value !== undefined ? e.value : undefined,
      meta: e.meta && typeof e.meta === "object" ? e.meta : undefined
    });
  }
  if (docs.length) await Event.insertMany(docs, { ordered: false }).catch(() => {});

  const set = { lastActivityAt: now };
  const inc = { eventCount: docs.length };
  const addSections = [];

  if (rollup.maxScrollPct != null) set.maxScrollPct = clamp(rollup.maxScrollPct, 0, 100);
  if (rollup.maxScrollPx != null) set.maxScrollPx = clamp(rollup.maxScrollPx, 0, 5_000_000);
  if (rollup.engagedMs != null) set.engagedMs = clamp(rollup.engagedMs, 0, 86_400_000);
  if (rollup.exitSection) set.exitSection = str(rollup.exitSection, 40);
  if (rollup.printed) set.printed = true;
  if (rollup.contactStarted) set.contactStarted = true;
  if (rollup.contactSubmitted) set.contactSubmitted = true;
  if (Array.isArray(rollup.sectionsViewed)) {
    for (const s of rollup.sectionsViewed) if (SECTION_ORDER.includes(s)) addSections.push(s);
  }
  if (rollup.clicks != null) inc.clickCount = clamp(rollup.clicks, 0, 100000);
  if (rollup.outboundClicks != null) inc.outboundClickCount = clamp(rollup.outboundClicks, 0, 100000);
  if (rollup.copies != null) inc.copyCount = clamp(rollup.copies, 0, 100000);
  if (rollup.visibilityChanges != null) inc.visibilityChanges = clamp(rollup.visibilityChanges, 0, 100000);

  const update = { $set: set, $inc: inc };
  if (addSections.length) update.$addToSet = { sectionsViewed: { $each: addSections } };

  await Session.updateOne({ sessionId }, update);
  await Visitor.updateOne({ visitorId }, { $set: { lastSeenAt: now }, $inc: { eventCount: docs.length } });
}

async function handleEnd(body) {
  const { visitorId, sessionId, rollup = {} } = body;
  const now = new Date();

  const session = await Session.findOne({ sessionId });
  if (!session) return;

  const startedAt = session.startedAt || now;
  const durationMs = clamp(rollup.durationMs, 0, 24 * 3600 * 1000) || Math.max(0, now - startedAt);
  const engagedMs = Math.max(session.engagedMs || 0, clamp(rollup.engagedMs, 0, 24 * 3600 * 1000));
  const maxScrollPct = Math.max(session.maxScrollPct || 0, clamp(rollup.maxScrollPct, 0, 100));

  const bounced =
    (session.sectionsViewed?.length || 0) <= 1 && maxScrollPct < 15 && durationMs < 10_000;

  session.endedAt = now;
  session.lastActivityAt = now;
  session.durationMs = durationMs;
  session.engagedMs = engagedMs;
  session.maxScrollPct = maxScrollPct;
  if (rollup.maxScrollPx != null) session.maxScrollPx = Math.max(session.maxScrollPx || 0, clamp(rollup.maxScrollPx, 0, 5_000_000));
  if (rollup.exitSection) session.exitSection = str(rollup.exitSection, 40);
  if (rollup.contactSubmitted) session.contactSubmitted = true;
  session.bounced = bounced;
  await session.save();

  await Visitor.updateOne(
    { visitorId },
    {
      $set: { lastSeenAt: now },
      $inc: { totalEngagedMs: engagedMs, totalDurationMs: durationMs }
    }
  );
}

export default router;
