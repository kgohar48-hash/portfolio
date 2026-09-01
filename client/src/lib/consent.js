/**
 * Analytics consent. Nothing in analytics.js runs until getConsent() === "granted".
 * The only thing stored before consent is the choice itself (permitted as
 * "strictly necessary" under GDPR/ePrivacy).
 */
const KEY = "pf_consent";
const VERSION = 1;

export function getConsent() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && raw.v === VERSION && (raw.state === "granted" || raw.state === "denied")) return raw.state;
  } catch {
    /* ignore */
  }
  return null;
}

export function setConsent(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, state, at: new Date().toISOString() }));
    if (state === "denied") {
      // drop any identifiers so a later opt-in can't be linked to past activity
      localStorage.removeItem("pf_vid");
      sessionStorage.removeItem("pf_sid");
      sessionStorage.removeItem("pf_sid_ts");
    }
  } catch {
    /* ignore */
  }
}

/** Browser "do not track" / Global Privacy Control — treated as an opt-out. */
export function hasDoNotTrackSignal() {
  try {
    return (
      navigator.globalPrivacyControl === true ||
      navigator.doNotTrack === "1" ||
      navigator.doNotTrack === "yes" ||
      window.doNotTrack === "1"
    );
  } catch {
    return false;
  }
}
