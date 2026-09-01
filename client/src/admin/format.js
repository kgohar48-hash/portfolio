export function compactNum(n) {
  n = Number(n) || 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`.replace(".0K", "K");
  return `${(n / 1_000_000).toFixed(1)}M`.replace(".0M", "M");
}

export function duration(ms) {
  ms = Number(ms) || 0;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function pct(x, digits = 0) {
  return `${((Number(x) || 0) * (x <= 1 ? 100 : 1)).toFixed(digits)}%`;
}

export function timeAgo(date) {
  const d = new Date(date).getTime();
  const diff = Date.now() - d;
  const s = Math.round(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function dateTime(date) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const FLAG_BASE = 127397;
export function flag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "";
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => c.charCodeAt(0) + FLAG_BASE));
}

export function locationLabel(geo) {
  if (!geo || (!geo.city && !geo.country)) return "Unknown";
  return [geo.city, geo.country].filter(Boolean).join(", ");
}

export function deviceLabel(device) {
  if (!device) return "—";
  return [device.browser, device.os].filter(Boolean).join(" · ") || device.deviceType || "—";
}
