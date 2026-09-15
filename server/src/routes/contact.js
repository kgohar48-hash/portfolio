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

const MESSAGES = {
  en: {
    nameRequired: "Please enter your name.",
    nameTooLong: "That name is too long.",
    emailInvalid: "Please enter a valid email.",
    emailTooLong: "That email is too long.",
    subjectTooLong: "Subject is too long.",
    messageTooShort: "Message should be at least 10 characters.",
    messageTooLong: "Message is too long (5000 char max).",
    success: "Thanks — your message is in. I'll get back to you.",
    successFallback: "Thanks — your message is in.",
    serverError: "Something went wrong sending your message. Email me directly instead."
  },
  de: {
    nameRequired: "Bitte gib deinen Namen ein.",
    nameTooLong: "Dieser Name ist zu lang.",
    emailInvalid: "Bitte gib eine gültige E-Mail-Adresse ein.",
    emailTooLong: "Diese E-Mail-Adresse ist zu lang.",
    subjectTooLong: "Der Betreff ist zu lang.",
    messageTooShort: "Die Nachricht sollte mindestens 10 Zeichen lang sein.",
    messageTooLong: "Die Nachricht ist zu lang (max. 5000 Zeichen).",
    success: "Danke — deine Nachricht ist angekommen. Ich melde mich bei dir.",
    successFallback: "Danke — deine Nachricht ist angekommen.",
    serverError: "Beim Senden deiner Nachricht ist etwas schiefgelaufen. Schreib mir stattdessen direkt eine E-Mail."
  }
};

function msgsFor(lang) {
  return MESSAGES[lang] || MESSAGES.en;
}

function validate(body, lang) {
  const m = msgsFor(lang);
  const errors = {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (name.length < 2) errors.name = m.nameRequired;
  if (name.length > 120) errors.name = m.nameTooLong;
  if (!EMAIL_RE.test(email)) errors.email = m.emailInvalid;
  if (email.length > 200) errors.email = m.emailTooLong;
  if (subject.length > 160) errors.subject = m.subjectTooLong;
  if (message.length < 10) errors.message = m.messageTooShort;
  if (message.length > 5000) errors.message = m.messageTooLong;

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

  const lang = req.body?.lang === "de" ? "de" : "en";
  const m = msgsFor(lang);

  const { errors, value } = validate(req.body || {}, lang);
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
    return res.status(201).json({ ok: true, message: m.success });
  } catch (err) {
    console.error(`[contact] failed to persist message: ${err.message}`);
    try {
      await appendToFile({ ...record, _error: err.message });
      return res.status(201).json({ ok: true, message: m.successFallback });
    } catch (err2) {
      console.error(`[contact] fallback write also failed: ${err2.message}`);
      return res.status(500).json({ ok: false, error: m.serverError });
    }
  }
});

export default router;
