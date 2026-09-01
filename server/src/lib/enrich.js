import { UAParser } from "ua-parser-js";
import { isbot } from "isbot";

export function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "");
  const first = xff.split(",")[0].trim();
  const ip = first || req.ip || req.socket?.remoteAddress || "";
  return ip.replace(/^::ffff:/, "");
}

export function parseUserAgent(ua = "") {
  const r = new UAParser(ua).getResult();
  const type = r.device?.type || "desktop"; // ua-parser leaves desktop undefined
  return {
    browser: r.browser?.name || null,
    browserVersion: r.browser?.version || null,
    engine: r.engine?.name || null,
    os: r.os?.name || null,
    osVersion: r.os?.version || null,
    deviceType: type,
    deviceVendor: r.device?.vendor || null,
    deviceModel: r.device?.model || null,
    isBot: isbot(ua)
  };
}

const SEARCH_RE = /(google|bing|duckduckgo|yahoo|yandex|ecosia|baidu|brave|startpage)\./i;
const SOCIAL_RE = /(linkedin|lnkd\.in|twitter|x\.com|t\.co|facebook|fb\.com|instagram|reddit|news\.ycombinator|ycombinator|github\.com|youtube|youtu\.be|medium\.com|dev\.to|mastodon|threads\.net|pinterest|tiktok|whatsapp|telegram)/i;

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Turn a referrer + UTM params into a { source, channel } pair.
 * channel ∈ campaign | organic | social | referral | direct
 */
export function deriveAcquisition({ referrer, utm, currentHost }) {
  const u = utm || {};
  if (u.source) {
    return { source: u.source, channel: u.medium || "campaign" };
  }

  const host = hostOf(referrer);
  if (!host || (currentHost && host === currentHost)) {
    return { source: "direct", channel: "direct" };
  }
  if (SEARCH_RE.test(host)) return { source: host, channel: "organic" };
  if (SOCIAL_RE.test(referrer || host)) return { source: host, channel: "social" };
  return { source: host, channel: "referral" };
}

export { hostOf };
