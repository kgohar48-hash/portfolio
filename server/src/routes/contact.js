import { Router } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rateLimit from "express-rate-limit";
import { isDbConnected } from "../config/db.js";
import Message from "../models/Message.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_FILE = path.join(__dirname, "..", "..", "data", "messages.local.json");

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many messages from this IP. Try again in a bit." }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body) {
  const errors = {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (name.length < 2) errors.name = "Please enter your name.";
  if (name.length > 120) errors.name = "That name is too long.";
  if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email.";
  if (email.length > 200) errors.email = "That email is too long.";
  if (subject.length > 160) errors.subject = "Subject is too long.";
  if (message.length < 10) errors.message = "Message should be at least 10 characters.";
  if (message.length > 5000) errors.message = "Message is too long (5000 char max).";

  return { errors, value: { name, email, subject, message } };
}

async function appendToFile(record) {
  await fs.mkdir(path.dirname(FALLBACK_FILE), { recursive: true });
  let list = [];
  try {
    list = JSON.parse(await fs.readFile(FALLBACK_FILE, "utf8"));
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  list.push(record);
  await fs.writeFile(FALLBACK_FILE, JSON.stringify(list, null, 2));
}

// POST /api/contact
router.post("/", contactLimiter, async (req, res) => {
  // Honeypot: bots fill hidden fields, humans don't.
  if (req.body && String(req.body.company || "").trim() !== "") {
    return res.status(200).json({ ok: true });
  }

  const { errors, value } = validate(req.body || {});
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ ok: false, errors });
  }

  const record = {
    ...value,
    meta: {
      ip: req.ip,
      userAgent: String(req.get("user-agent") || "").slice(0, 400)
    },
    createdAt: new Date().toISOString()
  };

  try {
    if (isDbConnected()) {
      await Message.create(record);
    } else {
      await appendToFile(record);
    }
    return res.status(201).json({ ok: true, message: "Thanks — your message is in. I'll get back to you." });
  } catch (err) {
    console.error(`[contact] failed to persist message: ${err.message}`);
    try {
      await appendToFile({ ...record, _error: err.message });
      return res.status(201).json({ ok: true, message: "Thanks — your message is in." });
    } catch (err2) {
      console.error(`[contact] fallback write also failed: ${err2.message}`);
      return res.status(500).json({ ok: false, error: "Something went wrong sending your message. Email me directly instead." });
    }
  }
});

export default router;
