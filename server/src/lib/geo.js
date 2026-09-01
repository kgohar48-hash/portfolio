/**
 * IP → location. Uses free, keyless HTTPS APIs (ipwho.is, with ipapi.co as a
 * fallback) and an in-memory LRU-ish cache so each IP is looked up at most
 * once per day. Never throws — returns null on any failure so tracking is
 * never blocked by geo.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
const cache = new Map(); // ip -> { at, value }

function isPrivate(ip) {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.")) return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  if (/^fc00:|^fd00:|^fe80:/i.test(ip)) return true;
  return false;
}

async function fetchJson(url, timeoutMs = 2500) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function lookupIpwhois(ip) {
  const d = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!d || d.success === false) throw new Error(d?.message || "ipwho.is failed");
  return {
    city: d.city || null,
    region: d.region || null,
    country: d.country || null,
    countryCode: d.country_code || null,
    lat: typeof d.latitude === "number" ? d.latitude : null,
    lon: typeof d.longitude === "number" ? d.longitude : null,
    timezone: d.timezone?.id || null,
    isp: d.connection?.isp || null,
    org: d.connection?.org || null,
    asn: d.connection?.asn ? String(d.connection.asn) : null,
    isEu: Boolean(d.is_eu)
  };
}

async function lookupIpapi(ip) {
  const d = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (!d || d.error) throw new Error(d?.reason || "ipapi.co failed");
  return {
    city: d.city || null,
    region: d.region || null,
    country: d.country_name || null,
    countryCode: d.country_code || null,
    lat: typeof d.latitude === "number" ? d.latitude : null,
    lon: typeof d.longitude === "number" ? d.longitude : null,
    timezone: d.timezone || null,
    isp: d.org || null,
    org: d.org || null,
    asn: d.asn ? String(d.asn) : null,
    isEu: Boolean(d.in_eu)
  };
}

export async function geolocate(ip) {
  if (isPrivate(ip)) return null;

  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value = null;
  try {
    value = await lookupIpwhois(ip);
  } catch {
    try {
      value = await lookupIpapi(ip);
    } catch (err) {
      console.warn(`[geo] lookup failed for ${ip}: ${err.message}`);
      value = null;
    }
  }

  if (cache.size >= CACHE_MAX) {
    // drop the oldest ~10%
    const drop = Math.ceil(CACHE_MAX * 0.1);
    let i = 0;
    for (const k of cache.keys()) {
      cache.delete(k);
      if (++i >= drop) break;
    }
  }
  cache.set(ip, { at: Date.now(), value });
  return value;
}
