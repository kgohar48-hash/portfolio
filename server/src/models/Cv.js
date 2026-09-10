import mongoose from "mongoose";

/**
 * One generated CV + cover letter, published at goharawan.com/cv/<slug>.
 *
 * `data` / `coverLetter` / `jobDescription` / `jobMeta` are admin-only and must
 * never be included in the public GET /api/cv/:slug response — that route
 * returns `data` plus tracked link URLs and nothing else.
 */

const eventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    target: String, // link_click only: portfolio | linkedin | github | <projectKey>
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

const cvSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },

    company: { type: String, required: true, trim: true, maxlength: 200 },
    role: { type: String, required: true, trim: true, maxlength: 200 },
    companyKey: { type: String, index: true },
    roleKey: { type: String, index: true },

    jobDescription: { type: String, maxlength: 24000 }, // admin-only
    jobUrl: { type: String, maxlength: 1000 },

    data: { type: mongoose.Schema.Types.Mixed, required: true }, // the tailored CV
    coverLetter: { type: String, maxlength: 24000 }, // admin-only
    jobMeta: { type: mongoose.Schema.Types.Mixed }, // admin-only: requirements/keywords/fitScore

    jobApplication: { type: mongoose.Schema.Types.ObjectId, ref: "JobApplication", index: true },
    model: String,
    status: { type: String, enum: ["draft", "sent"], default: "draft", index: true },

    openCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    visitCount: { type: Number, default: 0 },

    opens: { type: [eventSchema], default: [] },
    linkEvents: { type: [eventSchema], default: [] },
    visits: { type: [visitSchema], default: [] }
  },
  { timestamps: true }
);

cvSchema.index({ createdAt: -1 });

export const Cv = mongoose.model("Cv", cvSchema);
export default Cv;
