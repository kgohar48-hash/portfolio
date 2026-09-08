import mongoose from "mongoose";

/**
 * Singleton settings doc for the mail pipeline (key: "default").
 * `statusAutoApplyMinConfidence` also has an env fallback
 * (MAIL_AUTOAPPLY_MIN_CONFIDENCE); the DB value wins when present.
 */
const mailSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },

    // status updates: applied automatically at/above this confidence
    statusAutoApplyMinConfidence: { type: Number, default: 0.72, min: 0, max: 1 },

    // replies: off for now — the user approves & sends every reply from /admin
    replyAutoSend: { type: Boolean, default: false },
    replyAutoSendMinConfidence: { type: Number, default: 0.9, min: 0, max: 1 },
    replyAutoSendTypes: { type: [String], default: [] } // e.g. ["acknowledgement"]
  },
  { timestamps: true }
);

// atomic get-or-create (safe under concurrent callers)
mailSettingsSchema.statics.get = async function () {
  return this.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const MailSettings = mongoose.model("MailSettings", mailSettingsSchema);
export default MailSettings;
