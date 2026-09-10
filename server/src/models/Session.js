import mongoose from "mongoose";

/**
 * One document per visit. Created on `session_start`, updated by event
 * batches, finalised on `session_end`. Carries the enriched context
 * (geo / device / source) so the dashboard can aggregate without joins.
 */
const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    visitorId: { type: String, required: true, index: true },

    startedAt: { type: Date, required: true, index: true },
    lastActivityAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationMs: { type: Number, default: 0 }, // wall-clock start → last activity
    engagedMs: { type: Number, default: 0 }, // time the tab was actually visible & active

    isReturning: { type: Boolean, default: false },
    visitNumber: { type: Number, default: 1 },
    daysSinceLastVisit: { type: Number },

    // --- network / location ---
    ip: String,
    geo: {
      city: String,
      region: String,
      country: String,
      countryCode: String,
      lat: Number,
      lon: Number,
      timezone: String,
      isp: String,
      org: String,
      asn: String,
      isEu: Boolean
    },

    // --- device / client ---
    userAgent: String,
    isBot: { type: Boolean, default: false, index: true },
    device: {
      browser: String,
      browserVersion: String,
      engine: String,
      os: String,
      osVersion: String,
      deviceType: { type: String, default: "desktop" }, // desktop | mobile | tablet
      deviceVendor: String,
      deviceModel: String
    },
    screen: {
      width: Number,
      height: Number,
      viewportW: Number,
      viewportH: Number,
      dpr: Number,
      colorDepth: Number,
      orientation: String
    },
    client: {
      language: String,
      languages: [String],
      timezone: String,
      timezoneOffsetMin: Number,
      touch: Boolean,
      cookiesEnabled: Boolean,
      doNotTrack: Boolean,
      connectionType: String, // 4g / 3g / wifi-ish (effectiveType)
      downlinkMbps: Number,
      rttMs: Number,
      saveData: Boolean,
      deviceMemoryGb: Number,
      hardwareConcurrency: Number
    },
    performance: {
      ttfbMs: Number,
      domContentLoadedMs: Number,
      loadMs: Number
    },

    // --- acquisition ---
    referrer: String,
    referrerHost: String,
    landingUrl: String,
    landingPath: String,
    source: String, // e.g. "google", "linkedin.com", "direct"
    channel: String, // organic | social | referral | direct | campaign
    ref: String, // raw ?ref= token, if present
    cvSlug: { type: String, index: true }, // set when ?ref= matches a generated CV
    utm: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String
    },

    // --- engagement rollups ---
    maxScrollPct: { type: Number, default: 0 },
    maxScrollPx: { type: Number, default: 0 },
    sectionsViewed: { type: [String], default: [] },
    entrySection: String,
    exitSection: String,
    clickCount: { type: Number, default: 0 },
    outboundClickCount: { type: Number, default: 0 },
    copyCount: { type: Number, default: 0 },
    printed: { type: Boolean, default: false },
    visibilityChanges: { type: Number, default: 0 },
    eventCount: { type: Number, default: 0 },
    contactStarted: { type: Boolean, default: false },
    contactSubmitted: { type: Boolean, default: false },
    bounced: { type: Boolean, default: false }
  },
  { timestamps: true }
);

sessionSchema.index({ startedAt: -1 });
sessionSchema.index({ visitorId: 1, startedAt: -1 });
sessionSchema.index({ "geo.country": 1 });
sessionSchema.index({ channel: 1 });

export const Session = mongoose.model("Session", sessionSchema);
export default Session;
