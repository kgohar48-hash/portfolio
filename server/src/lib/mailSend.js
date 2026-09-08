import nodemailer from "nodemailer";

const {
  MAIL_SMTP_HOST,
  MAIL_SMTP_PORT = "465",
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM
} = process.env;

export function mailConfigured() {
  return Boolean(MAIL_SMTP_HOST && MAIL_USER && MAIL_PASS);
}

let transporter = null;
function getTransport() {
  if (!mailConfigured()) throw new Error("SMTP is not configured (set MAIL_SMTP_HOST / MAIL_USER / MAIL_PASS).");
  if (!transporter) {
    const port = Number(MAIL_SMTP_PORT);
    transporter = nodemailer.createTransport({
      host: MAIL_SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: MAIL_USER, pass: MAIL_PASS }
    });
  }
  return transporter;
}

/**
 * Send a reply to a stored Mail doc. Sets In-Reply-To / References so it threads
 * in the recipient's client. Returns nodemailer info.
 */
export async function sendReply(mail, body, { subject } = {}) {
  const t = getTransport();

  const refs = [...(mail.references || []), mail.messageId].filter(Boolean);
  const replySubject =
    subject ||
    (/^re:/i.test(mail.subject || "") ? mail.subject : `Re: ${mail.subject || "(no subject)"}`);

  const toAddr = mail.from?.address;
  if (!toAddr) throw new Error("Original email has no From address to reply to.");

  return t.sendMail({
    from: MAIL_FROM || MAIL_USER,
    to: mail.from?.name ? `${mail.from.name} <${toAddr}>` : toAddr,
    subject: replySubject,
    text: body,
    inReplyTo: mail.messageId,
    references: refs.join(" ")
  });
}

/** Send a brand-new message (not a reply). */
export async function sendMail({ to, subject, text }) {
  const t = getTransport();
  return t.sendMail({ from: MAIL_FROM || MAIL_USER, to, subject, text });
}
