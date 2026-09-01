import mongoose from "mongoose";

/**
 * One document per unique visitor (keyed by a UUID stored in the browser's
 * localStorage). Holds identity + lifetime rollups so returning visitors can
 * be recognised and their history stitched together.
 */
const visitorSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, unique: true, index: true },

    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true, index: true },

    sessionCount: { type: Number, default: 0 },
    eventCount: { type: Number, default: 0 },
    totalEngagedMs: { type: Number, default: 0 },
    totalDurationMs: { type: Number, default: 0 },

    // denormalised "most recent" context for fast table rendering
    lastGeo: {
      city: String,
      region: String,
      country: String,
      countryCode: String
    },
    lastDevice: {
      browser: String,
      os: String,
      deviceType: String
    },
    lastChannel: String,
    lastSource: String,

    // first-touch attribution
    firstReferrer: String,
    firstReferrerHost: String,
    firstChannel: String,
    firstSource: String,
    firstUtm: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String
    },
    firstLandingUrl: String
  },
  { timestamps: true }
);

export const Visitor = mongoose.model("Visitor", visitorSchema);
export default Visitor;
