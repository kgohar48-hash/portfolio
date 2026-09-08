import mongoose from "mongoose";

/**
 * One document per email pulled from the IMAP mailbox by scripts/poll-mail.mjs.
 * De-duplicated on `messageId`. Body is stored so the /admin Inbox can render
 * without touching IMAP again.
 */
const mailSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true, index: true },
    uid: Number,
    folder: String,

    from: { name: String, address: { type: String, index: true } },
    to: [{ name: String, address: String }],
    subject: { type: String, default: "" },
    date: { type: Date, index: true },

    text: { type: String, maxlength: 100000 },
    html: { type: String, maxlength: 400000 },
    snippet: { type: String, maxlength: 400 },

    inReplyTo: String,
    references: [String],

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

    // --- reply ---
    replyDraft: String,
    replyConfidence: Number,
    replySentAt: Date,
    replyBodySent: String
  },
  { timestamps: true }
);

mailSchema.index({ createdAt: -1 });
mailSchema.index({ pendingReview: 1, createdAt: -1 });

export const Mail = mongoose.model("Mail", mailSchema);
export default Mail;
