/**
 * Privacy-note: this collects detailed first-party analytics (approximate
 * location from IP server-side, device, referrer, on-page behaviour) for the
 * site owner's dashboard at /admin. It runs only on the public portfolio,
 * never on /admin itself.
 */

const BASE = import.meta.env.VITE_API_BASE || "";
const ENDPOINT = `${BASE}/api/track`;

const VID_KEY = "pf_vid";
const SID_KEY = "pf_sid";
const SID_TS_KEY = "pf_sid_ts";
const SESSION_GAP_MS = 30 * 60 * 1000;

const SECTIONS = ["hero", "about", "skills", "projects", "philosophy", "experience", "education", "contact"];

const state = {
  visitorId: null,
  sessionId: null,
  started: false,
  queue: [],
  engagedMs: 0,
  maxScrollPct: 0,
  maxScrollPx: 0,
  sectionsViewed: new Set(),
  sectionEnter: {}, // section -> timestamp when it became visible
  exitSection: "hero",
  clicks: 0,
  outboundClicks: 0,
  copies: 0,
  visibilityChanges: 0,
  printed: false,
  contactStarted: false,
  contactSubmitted: false,
  flushTimer: null,
  engageTimer: null,
  lastActivity: Date.now()
};

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function safeLocal(get) {
  try {
    return get(window.localStorage);
  } catch {
    return null;
  }
}
function safeSession(fn) {
  try {
    return fn(window.sessionStorage);
  } catch {
    return null;
  }
}

function getVisitorId() {
  let id = safeLocal((s) => s.getItem(VID_KEY));
  if (!id) {
    id = uuid();
    safeLocal((s) => s.setItem(VID_KEY, id));
  }
  return id;
}

function getSessionId() {
  const now = Date.now();
  const existing = safeSession((s) => s.getItem(SID_KEY));
  const ts = Number(safeSession((s) => s.getItem(SID_TS_KEY)) || 0);
  if (existing && now - ts < SESSION_GAP_MS) {
    safeSession((s) => s.setItem(SID_TS_KEY, String(now)));
    return existing;
  }
  const id = uuid();
  safeSession((s) => s.setItem(SID_KEY, id));
  safeSession((s) => s.setItem(SID_TS_KEY, String(now)));
  return id;
}

function parseUtm(params) {
  return {
    source: params.get("utm_source") || undefined,
    medium: params.get("utm_medium") || undefined,
    campaign: params.get("utm_campaign") || undefined,
    term: params.get("utm_term") || undefined,
    content: params.get("utm_content") || undefined
  };
}

function collectContext() {
  const nav = navigator;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
  const params = new URLSearchParams(window.location.search);

  let perf = {};
  try {
    const [entry] = performance.getEntriesByType("navigation");
    if (entry) {
      perf = {
        ttfbMs: Math.round(entry.responseStart),
        domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd),
        loadMs: Math.round(entry.loadEventEnd || entry.duration)
      };
    }
  } catch {
    /* ignore */
  }

  return {
    userAgent: nav.userAgent,
    referrer: document.referrer || "",
    landingUrl: window.location.href,
    landingPath: window.location.pathname,
    entrySection: "hero",
    utm: parseUtm(params),
    screen: {
      width: window.screen?.width,
      height: window.screen?.height,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      dpr: window.devicePixelRatio,
      colorDepth: window.screen?.colorDepth,
      orientation: window.screen?.orientation?.type
    },
    client: {
      language: nav.language,
      languages: nav.languages ? Array.from(nav.languages) : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffsetMin: new Date().getTimezoneOffset(),
      touch: "ontouchstart" in window || nav.maxTouchPoints > 0,
      cookiesEnabled: nav.cookieEnabled,
      doNotTrack: nav.doNotTrack === "1" || window.doNotTrack === "1",
      connectionType: conn.effectiveType,
      downlinkMbps: conn.downlink,
      rttMs: conn.rtt,
      saveData: Boolean(conn.saveData),
      deviceMemoryGb: nav.deviceMemory,
      hardwareConcurrency: nav.hardwareConcurrency
    },
    performance: perf
  };
}

function rollup() {
  return {
    engagedMs: state.engagedMs,
    maxScrollPct: state.maxScrollPct,
    maxScrollPx: state.maxScrollPx,
    sectionsViewed: Array.from(state.sectionsViewed),
    exitSection: state.exitSection,
    clicks: state.clicks,
    outboundClicks: state.outboundClicks,
    copies: state.copies,
    visibilityChanges: state.visibilityChanges,
    printed: state.printed,
    contactStarted: state.contactStarted,
    contactSubmitted: state.contactSubmitted
  };
}

function post(payload, useBeacon = false) {
  const body = JSON.stringify(payload);
  if (useBeacon && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    } catch {
      /* fall through to fetch */
    }
  }
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: useBeacon
  }).catch(() => {});
}

function flush(useBeacon = false) {
  if (!state.started) return;
  if (state.queue.length === 0 && !useBeacon) return;
  const events = state.queue.splice(0, state.queue.length);
  post(
    { kind: "batch", visitorId: state.visitorId, sessionId: state.sessionId, events, rollup: rollup() },
    useBeacon
  );
}

function enqueue(type, data = {}) {
  state.lastActivity = Date.now();
  state.queue.push({ type, ts: new Date().toISOString(), ...data });
  if (state.queue.length >= 12) flush();
}

/** Public: let components report semantic events (e.g. the contact form). */
export function trackEvent(type, data = {}) {
  if (type === "contact_field_focus" || type === "contact_submit") state.contactStarted = true;
  if (type === "contact_success") state.contactSubmitted = true;
  enqueue(type, data);
}

function describeTarget(el, evt) {
  const a = el.closest("a");
  const btn = el.closest("button, a, [data-track]");
  const node = btn || el;
  const section = node.closest("section[id]")?.id;
  return {
    tag: (node.tagName || "").toLowerCase(),
    id: node.id || undefined,
    cls: typeof node.className === "string" ? node.className.slice(0, 160) : undefined,
    text: (node.innerText || node.textContent || "").trim().slice(0, 120) || undefined,
    href: a?.href || undefined,
    name: node.getAttribute?.("data-track") || undefined,
    xPct: evt ? Math.round((evt.clientX / window.innerWidth) * 100) : undefined,
    yPct: evt ? Math.round((evt.clientY / window.innerHeight) * 100) : undefined,
    _section: section
  };
}

function onClick(evt) {
  const el = evt.target;
  if (!(el instanceof Element)) return;
  const t = describeTarget(el, evt);
  state.clicks += 1;

  const link = el.closest("a[href]");
  const isOutbound =
    link && link.hostname && link.hostname !== window.location.hostname && !link.href.startsWith("mailto:");
  const isContactLink = link && (link.href.startsWith("mailto:") || t._section === "contact");

  if (isOutbound || link?.href?.startsWith("mailto:")) state.outboundClicks += 1;

  enqueue(isOutbound || isContactLink ? "outbound_click" : "click", {
    section: t._section,
    target: { ...t, _section: undefined }
  });
}

function computeScroll() {
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop;
  const height = doc.scrollHeight - window.innerHeight;
  const pct = height > 0 ? Math.min(100, Math.round((scrollTop / height) * 100)) : 100;
  if (pct > state.maxScrollPct) {
    const prevMilestone = Math.floor(state.maxScrollPct / 25);
    state.maxScrollPct = pct;
    state.maxScrollPx = Math.round(scrollTop + window.innerHeight);
    const milestone = Math.floor(pct / 25);
    if (milestone > prevMilestone && milestone > 0) {
      enqueue("scroll_depth", { scrollPct: Math.min(100, milestone * 25) });
    }
  }
  state.lastActivity = Date.now();
}

function setupSectionObserver() {
  const els = SECTIONS.map((id) => document.getElementById(id)).filter(Boolean);
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          state.exitSection = id;
          if (!state.sectionsViewed.has(id)) {
            state.sectionsViewed.add(id);
            enqueue("section_view", { section: id });
          }
          state.sectionEnter[id] = Date.now();
        } else if (state.sectionEnter[id]) {
          const dwellMs = Date.now() - state.sectionEnter[id];
          delete state.sectionEnter[id];
          if (dwellMs > 800) enqueue("section_dwell", { section: id, dwellMs });
        }
      }
    },
    { threshold: 0.4 }
  );
  els.forEach((el) => io.observe(el));
}

function onVisibility() {
  state.visibilityChanges += 1;
  if (document.visibilityState === "hidden") {
    enqueue("visibility", { value: "hidden" });
    flush(true);
  } else {
    enqueue("visibility", { value: "visible" });
    state.lastActivity = Date.now();
  }
}

function endSession() {
  if (!state.started) return;
  flush(true);
  post(
    {
      kind: "end",
      visitorId: state.visitorId,
      sessionId: state.sessionId,
      rollup: { ...rollup(), durationMs: performance.now() }
    },
    true
  );
  state.started = false;
}

export function initAnalytics() {
  if (state.started || typeof window === "undefined") return;
  if (window.location.pathname.replace(/\/$/, "") === "/admin") return;

  state.visitorId = getVisitorId();
  state.sessionId = getSessionId();
  state.started = true;

  post({ kind: "start", visitorId: state.visitorId, sessionId: state.sessionId, context: collectContext() });

  // engaged-time accumulator: +1s while the tab is visible and recently active
  state.engageTimer = setInterval(() => {
    if (document.visibilityState === "visible" && Date.now() - state.lastActivity < 30000) {
      state.engagedMs += 1000;
    }
  }, 1000);

  state.flushTimer = setInterval(() => flush(false), 10000);

  let scrollRaf = null;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        computeScroll();
      });
    },
    { passive: true }
  );

  window.addEventListener("click", onClick, { capture: true });
  window.addEventListener("copy", () => {
    state.copies += 1;
    enqueue("copy", { section: state.exitSection });
  });
  window.addEventListener("beforeprint", () => {
    state.printed = true;
    enqueue("print");
  });
  window.addEventListener("mousemove", () => (state.lastActivity = Date.now()), { passive: true });
  window.addEventListener("keydown", () => (state.lastActivity = Date.now()));
  window.addEventListener(
    "resize",
    () => enqueue("resize", { meta: { w: window.innerWidth, h: window.innerHeight } }),
    { passive: true }
  );
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", endSession);
  window.addEventListener("beforeunload", endSession);

  setupSectionObserver();
  computeScroll();
}
