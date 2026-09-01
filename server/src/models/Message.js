import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: String, trim: true, maxlength: 160, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    meta: {
      ip: String,
      userAgent: String
    },
    handled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
export default Message;
