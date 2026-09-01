import mongoose from "mongoose";

const EVENTS_TTL_DAYS = Number(process.env.EVENTS_TTL_DAYS || 365);

/**
 * Granular per-action log. High volume, so raw events expire after
 * EVENTS_TTL_DAYS (default 365) — the rollups on Session/Visitor are kept
 * forever, only the fine-grained timeline is pruned.
 */
const eventSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    ts: { type: Date, required: true },

    // pageview | section_view | section_dwell | scroll_depth | click |
    // outbound_click | copy | print | contact_field_focus | contact_submit |
    // contact_success | contact_error | visibility | resize | heartbeat
    type: { type: String, required: true, index: true },

    section: String,
    scrollPct: Number,
    dwellMs: Number,

    target: {
      tag: String,
      id: String,
      cls: String,
      text: String,
      href: String,
      name: String, // data-track name if present
      xPct: Number, // click position as % of viewport
      yPct: Number
    },

    value: mongoose.Schema.Types.Mixed,
    meta: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

eventSchema.index({ sessionId: 1, ts: 1 });
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: EVENTS_TTL_DAYS * 24 * 60 * 60 });

export const Event = mongoose.model("Event", eventSchema);
export default Event;
