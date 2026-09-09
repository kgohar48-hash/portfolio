import mongoose from "mongoose";

/**
 * Singleton settings doc for the mail matcher (key: "default").
 * `statusAutoApplyMinConfidence` also has an env fallback
 * (MAIL_AUTOAPPLY_MIN_CONFIDENCE); the DB value wins when present.
 */
const mailSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },

    // a pasted email at/above this status-confidence updates the application
    // automatically; below it, it waits in the review queue
    statusAutoApplyMinConfidence: { type: Number, default: 0.72, min: 0, max: 1 }
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
