/**
 * Shared logging for CV opens and tracked-link clicks. Best-effort: never throws,
 * geo lookup is fire-and-forget so a redirect/response is never blocked on it.
 */

import Cv from "../models/Cv.js";
import { clientIp } from "./enrich.js";
import { isbot } from "isbot";
import { geolocate } from "./geo.js";
import { recordCvActivity } from "./jobs.js";

const EVENT_CAP = 300;

// Corporate link-scanners / unfurlers that will hit the URL seconds after it's
// sent — not the employer actually reading it.
const SCANNER_RE =
  /slackbot|slack-imgproxy|discordbot|telegrambot|whatsapp|twitterbot|facebookexternalhit|linkedinbot|bingpreview|google-safebrowsing|safelinks|proofpoint|mimecast|barracuda|outlook|microsoft office|skypeuripreview|bitlybot|redditbot|whatsapp|vkshare|preview/i;

function isScanner(ua = "") {
  return isbot(ua) || SCANNER_RE.test(ua);
}

async function pushEvent(cvId, field, entry) {
  await Cv.updateOne(
    { _id: cvId },
    {
      $push: { [field]: { $each: [entry], $slice: -EVENT_CAP } },
      $inc: field === "opens" ? { openCount: 1 } : field === "linkEvents" ? { clickCount: 1 } : { visitCount: 1 }
    }
  );
}

/** Record that someone opened the CV page. `cv` is a lean doc or Mongoose doc. */
export async function logCvOpen(cv, req) {
  const ip = clientIp(req);
  const ua = String(req.get("user-agent") || "");
  const bot = isScanner(ua);
  const at = new Date();

  await pushEvent(cv._id, "opens", { at, ip, uaRaw: ua.slice(0, 400), isBot: bot });

  // enrich with geo out of band, then also drop an entry on the linked job
  geolocate(ip)
    .then((geo) =>
      recordCvActivity(cv.jobApplication, {
        type: "open",
        at,
        city: geo?.city,
        country: geo?.country,
        isBot: bot
      })
    )
    .catch(() => {});
}

/** Record a tracked-link click. `target` is portfolio|linkedin|github|<projectKey>. */
export async function logCvLinkClick(cv, target, req) {
  const ip = clientIp(req);
  const ua = String(req.get("user-agent") || "");
  const bot = isScanner(ua);
  const at = new Date();

  await pushEvent(cv._id, "linkEvents", { at, target, ip, uaRaw: ua.slice(0, 400), isBot: bot });

  geolocate(ip)
    .then((geo) =>
      recordCvActivity(cv.jobApplication, {
        type: "link_click",
        target,
        at,
        city: geo?.city,
        country: geo?.country,
        isBot: bot
      })
    )
    .catch(() => {});
}

export { isScanner };
