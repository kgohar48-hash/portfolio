import mongoose from "mongoose";

/**
 * A hand-picked tracking link — e.g. goharawan.com/r/linkedin-bio/portfolio for
 * a LinkedIn profile, or /r/conference-2026/portfolio for a badge QR code.
 * Same redirect + logging mechanics as a generated CV's links (see go.js,
 * cvTracking.js), just not tied to a CV. Optionally attributed to a job
 * application so its visits show up there too.
 */

const eventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    target: String,
    ip: String,
    uaRaw: String,
    isBot: { type: Boolean, default: false },
    city: String,
    country: String
  },
  { _id: false }
);

const visitSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    sessionId: String,
    visitorId: String,
    city: String,
    country: String,
    device: String
  },
  { _id: false }
);

const linkSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 200 }, // e.g. "LinkedIn bio"
    jobApplication: { type: mongoose.Schema.Types.ObjectId, ref: "JobApplication" },

    clickCount: { type: Number, default: 0 },
    visitCount: { type: Number, default: 0 },
    linkEvents: { type: [eventSchema], default: [] },
    visits: { type: [visitSchema], default: [] }
  },
  { timestamps: true }
);

export const Link = mongoose.model("Link", linkSchema);
export default Link;
