import mongoose from "mongoose";

/**
 * One document per job-related email the admin pastes into /admin → Inbox.
 * De-duplicated on `messageId` (a content hash for pasted mail). Body is
 * stored so the review UI + "re-run LLM" work without the original.
 */
const mailSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true, index: true },
    source: { type: String, default: "paste" }, // paste | (imap, historical)

    from: { name: String, address: { type: String, index: true } },
    to: [{ name: String, address: String }],
    subject: { type: String, default: "" },
    date: { type: Date, index: true },

    text: { type: String, maxlength: 100000 },
    html: { type: String, maxlength: 400000 },
    snippet: { type: String, maxlength: 400 },

    // --- classification by the LLM matcher ---
    screenedAt: Date,
    llmModel: String,
    isJobRelated: { type: Boolean, default: false, index: true },
    emailType: String, // acknowledgement | rejection | interview_invite | ...
    matchedApplication: { type: mongoose.Schema.Types.ObjectId, ref: "JobApplication", index: true },
    matchConfidence: Number,
    proposedStatus: String,
    statusConfidence: Number,
    reasoning: String,
    // company/role the email is about, when it matches no tracked application
    extractedCompany: String,
    extractedRole: String,
    extracted: {
      interviewDate: Date,
      deadline: Date
    },

    // --- what happened ---
    statusApplied: { type: Boolean, default: false }, // status change written to the application
    appliedAutomatically: { type: Boolean, default: false },
    pendingReview: { type: Boolean, default: false, index: true },
    reviewedAt: Date,
    dismissed: { type: Boolean, default: false },

    // --- suggested reply (draft only — you copy it, nothing is sent) ---
    replyDraft: String,
    replyConfidence: Number
  },
  { timestamps: true }
);

mailSchema.index({ createdAt: -1 });
mailSchema.index({ pendingReview: 1, createdAt: -1 });

export const Mail = mongoose.model("Mail", mailSchema);
export default Mail;
