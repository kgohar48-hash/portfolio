/**
 * Pulls new mail from the IMAP mailbox, runs each message through the LLM
 * matcher, and updates the job-application database.
 *
 * Runs on a schedule from GitHub Actions (.github/workflows/poll-mail.yml) so
 * the Render API can stay asleep — this script talks to MongoDB and Gemini
 * directly. It NEVER sends email; replies are drafted and approved in /admin.
 *
 * Env: MONGO_URI, GEMINI_API_KEY, MAIL_IMAP_HOST, MAIL_IMAP_PORT (993),
 *      MAIL_USER, MAIL_PASS, MAIL_FOLDERS (default "Jobs"),
 *      MAIL_DONE_FOLDER (optional, e.g. "Jobs/Done"),
 *      MAIL_MAX_PER_RUN (default 25), GEMINI_MODEL (optional)
 */
import "dotenv/config";
import mongoose from "mongoose";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import Mail from "../src/models/Mail.js";
import { processMail } from "../src/lib/mailMatcher.js";

const {
  MONGO_URI,
  MAIL_IMAP_HOST,
  MAIL_IMAP_PORT = "993",
  MAIL_USER,
  MAIL_PASS,
  MAIL_FOLDERS = "Jobs",
  MAIL_DONE_FOLDER = "",
  MAIL_MAX_PER_RUN = "25"
} = process.env;

function need(name, v) {
  if (!v) {
    console.error(`[poll-mail] missing env ${name}`);
    process.exit(1);
  }
}
need("MONGO_URI", MONGO_URI);
need("MAIL_IMAP_HOST", MAIL_IMAP_HOST);
need("MAIL_USER", MAIL_USER);
need("MAIL_PASS", MAIL_PASS);
need("GEMINI_API_KEY", process.env.GEMINI_API_KEY);

const folders = MAIL_FOLDERS.split(",").map((s) => s.trim()).filter(Boolean);
const maxPerRun = Number(MAIL_MAX_PER_RUN) || 25;

const addr = (a) => (a ? { name: a.name || "", address: (a.address || "").toLowerCase() } : undefined);
const snippet = (t = "") => t.replace(/\s+/g, " ").trim().slice(0, 300);

async function run() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("[poll-mail] db connected");

  const client = new ImapFlow({
    host: MAIL_IMAP_HOST,
    port: Number(MAIL_IMAP_PORT),
    secure: true,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
    logger: false
  });
  await client.connect();
  console.log("[poll-mail] imap connected");

  let processed = 0;
  const summary = [];

  for (const folder of folders) {
    let lock;
    try {
      lock = await client.getMailboxLock(folder);
    } catch (err) {
      console.warn(`[poll-mail] cannot open folder "${folder}": ${err.message}`);
      continue;
    }
    try {
      // unseen first, newest last so older ones are handled first
      const uids = await client.search({ seen: false }, { uid: true });
      if (!uids.length) {
        console.log(`[poll-mail] ${folder}: nothing new`);
        continue;
      }

      for (const uid of uids.slice(0, maxPerRun - processed)) {
        const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
        if (!msg) continue;
        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId || `no-id-${folder}-${uid}-${parsed.date?.getTime() || Date.now()}`;

        let doc = await Mail.findOne({ messageId });
        if (doc && (doc.screenedAt || doc.dismissed)) {
          // already handled in a previous run — just tidy up the mailbox
          await finalize(client, uid, doc);
          continue;
        }

        if (!doc) {
          doc = new Mail({
            messageId,
            uid,
            folder,
            from: addr(parsed.from?.value?.[0]),
            to: (parsed.to?.value || []).map(addr).filter(Boolean),
            subject: parsed.subject || "",
            date: parsed.date || new Date(),
            text: (parsed.text || "").slice(0, 100000),
            html: typeof parsed.html === "string" ? parsed.html.slice(0, 400000) : undefined,
            snippet: snippet(parsed.text || parsed.subject || ""),
            inReplyTo: parsed.inReplyTo,
            references: [].concat(parsed.references || []).filter(Boolean)
          });
          await doc.save();
        }

        let result;
        try {
          result = await processMail(doc);
          processed += 1;
        } catch (err) {
          console.error(`[poll-mail] processMail failed for ${messageId}: ${err.message}`);
          summary.push({ subject: doc.subject, action: "error", error: err.message });
          continue; // leave it unseen so a later run retries
        }

        summary.push({ from: doc.from?.address, subject: doc.subject, ...result });
        await finalize(client, uid, doc);
      }
    } finally {
      lock.release();
    }
    if (processed >= maxPerRun) break;
  }

  await client.logout();
  await mongoose.disconnect();

  console.log(`[poll-mail] done — ${processed} processed`);
  for (const s of summary) console.log("  ", JSON.stringify(s));
}

async function finalize(client, uid, doc) {
  try {
    await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    if (MAIL_DONE_FOLDER) {
      await client.messageMove(uid, MAIL_DONE_FOLDER, { uid: true }).catch(() => {});
    }
  } catch (err) {
    console.warn(`[poll-mail] could not finalize uid ${uid}: ${err.message}`);
  }
}

run().catch((err) => {
  console.error("[poll-mail] fatal:", err);
  process.exit(1);
});
