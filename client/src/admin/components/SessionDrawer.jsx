import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import { duration, dateTime, flag, locationLabel } from "../format";

const EVENT_LABEL = {
  section_view: "Viewed section",
  section_dwell: "Dwelled on",
  scroll_depth: "Scrolled to",
  click: "Clicked",
  outbound_click: "Outbound click",
  copy: "Copied text",
  print: "Printed page",
  visibility: "Tab",
  resize: "Resized window",
  contact_field_focus: "Started contact form",
  contact_submit: "Submitted contact form",
  contact_success: "Contact form sent",
  contact_error: "Contact form error"
};

export default function SessionDrawer({ sessionId, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminApi.session(sessionId).then(setData).catch((e) => setErr(e.message));
  }, [sessionId]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const s = data?.session;

  return (
    <div className="adm-drawer-scrim" onClick={onClose}>
      <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer-head">
          <div>
            <div className="adm-card-title">Session detail</div>
            {s && <div className="adm-card-sub">{dateTime(s.startedAt)}</div>}
          </div>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>
            Close ✕
          </button>
        </div>

        {err && <div className="adm-empty">{err}</div>}
        {!data && !err && <div className="adm-empty">Loading…</div>}

        {s && (
          <>
            <div className="adm-kv">
              <Row k="Visitor" v={<code>{s.visitorId}</code>} />
              <Row k="Visit #" v={`${s.visitNumber}${s.isReturning ? " (returning)" : " (first visit)"}`} />
              {s.daysSinceLastVisit != null && <Row k="Days since last visit" v={s.daysSinceLastVisit} />}
              <Row k="Duration" v={`${duration(s.durationMs)} total · ${duration(s.engagedMs)} engaged`} />
              <Row k="Location" v={`${flag(s.geo?.countryCode)} ${locationLabel(s.geo)}${s.geo?.region ? ` (${s.geo.region})` : ""}`} />
              <Row k="IP" v={<code>{s.ip || "—"}</code>} />
              <Row k="ISP / Org" v={[s.geo?.isp, s.geo?.org].filter(Boolean).join(" · ") || "—"} />
              <Row k="Coordinates" v={s.geo?.lat != null ? `${s.geo.lat}, ${s.geo.lon}` : "—"} />
              <Row k="Timezone" v={`${s.geo?.timezone || "—"}${s.client?.timezone && s.client.timezone !== s.geo?.timezone ? ` (browser: ${s.client.timezone})` : ""}`} />
              <Row k="Device" v={`${s.device?.deviceType || "?"} · ${s.device?.browser || "?"} ${s.device?.browserVersion || ""} · ${s.device?.os || "?"} ${s.device?.osVersion || ""}`} />
              {s.device?.deviceModel && <Row k="Model" v={`${s.device.deviceVendor || ""} ${s.device.deviceModel}`} />}
              <Row k="Screen" v={s.screen?.width ? `${s.screen.width}×${s.screen.height} @ ${s.screen.dpr || 1}x · viewport ${s.screen.viewportW}×${s.screen.viewportH}` : "—"} />
              <Row k="Language" v={s.client?.language || "—"} />
              <Row k="Connection" v={[s.client?.connectionType, s.client?.downlinkMbps && `${s.client.downlinkMbps}Mbps`, s.client?.rttMs && `${s.client.rttMs}ms rtt`, s.client?.saveData && "data-saver"].filter(Boolean).join(" · ") || "—"} />
              <Row k="Hardware" v={[s.client?.hardwareConcurrency && `${s.client.hardwareConcurrency} cores`, s.client?.deviceMemoryGb && `${s.client.deviceMemoryGb}GB`, s.client?.touch ? "touch" : "no touch"].filter(Boolean).join(" · ") || "—"} />
              <Row k="Page load" v={s.performance?.loadMs ? `${s.performance.ttfbMs}ms TTFB · ${s.performance.loadMs}ms load` : "—"} />
              <Row k="Source" v={`${s.channel} · ${s.source}`} />
              <Row k="Referrer" v={s.referrer ? <code>{s.referrer}</code> : "direct"} />
              {(s.utm?.source || s.utm?.campaign) && <Row k="UTM" v={`${s.utm.source || ""} / ${s.utm.medium || ""} / ${s.utm.campaign || ""}`} />}
              <Row k="Landing" v={<code>{s.landingUrl}</code>} />
              <Row k="Scroll depth" v={`${Math.round(s.maxScrollPct || 0)}% (${s.maxScrollPx || 0}px)`} />
              <Row k="Sections seen" v={s.sectionsViewed?.join(" → ") || "—"} />
              <Row k="Clicks" v={`${s.clickCount || 0} (${s.outboundClickCount || 0} outbound)`} />
              <Row k="Copied text" v={`${s.copyCount || 0}×`} />
              <Row k="Tab switches" v={s.visibilityChanges || 0} />
              <Row k="Printed" v={s.printed ? "yes" : "no"} />
              <Row k="Do Not Track" v={s.client?.doNotTrack ? "enabled" : "off"} />
              <Row k="Bot" v={s.isBot ? "yes" : "no"} />
            </div>

            <div className="adm-card-title adm-mt">Event timeline ({data.events.length})</div>
            <ol className="adm-timeline">
              {data.events.map((e, i) => (
                <li key={i}>
                  <span className="adm-timeline-t">{new Date(e.ts).toLocaleTimeString()}</span>
                  <span className="adm-timeline-d">
                    <b>{EVENT_LABEL[e.type] || e.type}</b>{" "}
                    {e.section && <span className="adm-chan">{e.section}</span>}
                    {e.scrollPct != null && ` ${e.scrollPct}%`}
                    {e.dwellMs != null && ` ${duration(e.dwellMs)}`}
                    {e.target?.name && <span className="adm-mono"> {e.target.name}</span>}
                    {!e.target?.name && e.target?.text && <span className="adm-mono"> “{e.target.text}”</span>}
                    {e.target?.href && <span className="adm-timeline-href"> → {e.target.href}</span>}
                    {e.value != null && typeof e.value !== "object" && <span className="adm-mono"> {String(e.value)}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </aside>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="adm-kv-row">
      <span className="adm-kv-k">{k}</span>
      <span className="adm-kv-v">{v}</span>
    </div>
  );
}
