import mongoose from "mongoose";

/**
 * Stores the whole portfolio document as a single record keyed by `key`.
 * Simple by design — the portfolio is one cohesive blob, not a relational graph.
 */
const contentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "portfolio" },
    data: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const Content = mongoose.model("Content", contentSchema);
export default Content;
