import mongoose from "mongoose";
import { JOB_STATUSES, WORK_MODES, EMPLOYMENT_TYPES, SENIORITY, PRIORITIES } from "../data/jobSchema.js";

const interviewSchema = new mongoose.Schema(
  {
    date: Date,
    kind: { type: String, maxlength: 100 }, // "phone screen", "technical", "onsite", "final"
    notes: { type: String, maxlength: 4000 },
    outcome: { type: String, enum: ["pending", "passed", "failed"], default: "pending" }
  },
  { _id: true, timestamps: false }
);

const jobApplicationSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true, maxlength: 200 },
    role: { type: String, required: true, trim: true, maxlength: 200 },
    // lowercased for dedupe / upsert-by-company+role
    companyKey: { type: String, index: true },
    roleKey: { type: String, index: true },

    location: { type: String, trim: true, maxlength: 200 },
    workMode: { type: String, enum: [...WORK_MODES, ""], default: "" },
    employmentType: { type: String, enum: [...EMPLOYMENT_TYPES, ""], default: "" },
    seniority: { type: String, enum: [...SENIORITY, ""], default: "" },
    jobUrl: { type: String, trim: true, maxlength: 1000 },
    source: { type: String, trim: true, maxlength: 200 },
    salary: { type: String, trim: true, maxlength: 200 },

    postedDate: Date,
    deadline: Date,
    appliedDate: Date,
    nextActionDate: Date,

    status: { type: String, enum: JOB_STATUSES, default: "to_apply", index: true },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    fitScore: { type: Number, min: 0, max: 100 },

    summary: { type: String, maxlength: 4000 },
    keyRequirements: { type: [String], default: [] },
    matchedStrengths: { type: [String], default: [] },
    gaps: { type: [String], default: [] },
    atsKeywords: { type: [String], default: [] },
    resumeChanges: { type: [String], default: [] },
    coverLetter: { type: String, maxlength: 20000 },
    contactName: { type: String, maxlength: 200 },
    contactEmail: { type: String, maxlength: 200 },
    nextAction: { type: String, maxlength: 2000 },
    notes: { type: String, maxlength: 10000 },
    tags: { type: [String], default: [] },

    // --- CV generator / employer-outreach tracking ---
    cvSlug: { type: String, index: true }, // most recent generated CV
    cvSlugs: { type: [String], default: [] }, // every CV generated for this job
    cvUrl: { type: String, maxlength: 500 },
    employerViewCount: { type: Number, default: 0 },
    employerLastViewAt: { type: Date },
    cvActivity: {
      type: [
        {
          _id: false,
          type: { type: String, enum: ["open", "link_click", "site_visit"] },
          target: String,
          at: { type: Date, default: Date.now },
          sessionId: String,
          visitorId: String,
          city: String,
          country: String,
          device: String,
          isBot: { type: Boolean, default: false }
        }
      ],
      default: []
    },

    interviews: { type: [interviewSchema], default: [] },
    statusHistory: {
      type: [
        {
          at: { type: Date, default: Date.now },
          from: String,
          to: String,
          via: String, // "manual" | "json" | "email:auto" | "email:review"
          note: String, // short reason (e.g. LLM reasoning)
          confidence: Number // 0..1 when set by the mail matcher
        }
      ],
      default: []
    },
    createdVia: { type: String, enum: ["manual", "json", "cv"], default: "manual" },
    lastJson: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

jobApplicationSchema.index({ companyKey: 1, roleKey: 1 });
jobApplicationSchema.index({ status: 1, updatedAt: -1 });

export const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);
export default JobApplication;
