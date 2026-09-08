import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../adminApi";
import { STATUS_LABEL } from "../jobsMeta";
import { jobDate } from "../jobsMeta";
import MailDrawer from "./MailDrawer";

const VIEWS = [
  ["review", "Needs review"],
  ["auto", "Auto-applied"],
  ["unmatched", "Unmatched"],
  ["job", "Job-related"],
  ["all", "All mail"]
];

const TYPE_LABEL = {
  acknowledgement: "Ack",
  rejection: "Rejection",
  interview_invite: "Interview invite",
  interview_followup: "Interview follow-up",
  assessment: "Assessment",
  offer: "Offer",
  request_info: "Info request",
  recruiter_outreach: "Recruiter outreach",
  scheduling: "Scheduling",
  other: "Other"
};

function Conf({ v }) {
  if (v == null) return <span className="adm-conf">—</span>;
  const pct = Math.round(v * 100);
  const tone = pct >= 80 ? "good" : pct >= 55 ? "mid" : "low";
  return <span className={`adm-conf adm-conf-${tone}`}>{pct}%</span>;
}

export default function MailPanel() {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [view, setView] = useState("review");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(() => new URLSearchParams(window.location.search).get("x") || null);
  const [err, setErr] = useState("");

  function load() {
    adminApi.mail
      .list({ view, page, limit: 40 })
      .then(setData)
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    adminApi.mail.settings().then(setSettings).catch(() => {});
  }, []);
  useEffect(() => setPage(1), [view]);
  useEffect(load, [view, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const reviewCount = data?.reviewCount ?? 0;
  const threshold = settings?.settings?.statusAutoApplyMinConfidence ?? 0.72;

  async function saveThreshold(val) {
    const s = await adminApi.mail.saveSettings({ statusAutoApplyMinConfidence: val });
    setSettings((prev) => ({ ...prev, settings: s.settings }));
  }

  if (err) return <div className="adm-error-banner">{err}</div>;
  if (!data) return <div className="adm-loading">Loading inbox…</div>;

  return (
    <div className="adm-mailpanel">
      {data.db === false && (
        <div className="adm-error-banner">No database connected — set <code>MONGO_URI</code> on the API service.</div>
      )}
      {settings && settings.llm === false && (
        <div className="adm-error-banner">
          <code>GEMINI_API_KEY</code> isn't set — incoming mail won't be classified. Set it on the API service and in the
          GitHub Actions secrets.
        </div>
      )}

      <div className="adm-card adm-card-wide adm-mail-settings">
        <div>
          <div className="adm-card-title">Pipeline</div>
          <div className="adm-card-sub">
            Job mail is pulled by a scheduled GitHub Action and classified by an LLM. Status changes at or above the
            confidence below are applied automatically; the rest wait here for you.
          </div>
        </div>
        {settings?.settings && (
          <label className="adm-mail-threshold">
            <span>Auto-apply status at ≥ {Math.round(threshold * 100)}%</span>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, statusAutoApplyMinConfidence: Number(e.target.value) }
                }))
              }
              onPointerUp={(e) => saveThreshold(Number(e.target.value))}
              onKeyUp={(e) => saveThreshold(Number(e.target.value))}
            />
            <span className="adm-card-sub">
              Reply auto-send: <b>off</b> — you approve every reply (a confidence score is shown, so you can enable
              auto-send for high-confidence replies later).
            </span>
          </label>
        )}
      </div>

      <div className="adm-card adm-card-wide">
        <div className="adm-card-head">
          <div className="adm-card-title">
            Inbox {reviewCount > 0 && <span className="adm-tag adm-tag-warn">{reviewCount} to review</span>}
          </div>
          <div className="adm-tabs adm-subtabs">
            {VIEWS.map(([v, label]) => (
              <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="adm-table-scroll">
          <table className="adm-table adm-mail-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Application</th>
                <th>Proposed</th>
                <th className="adm-num">Match</th>
                <th className="adm-num">Status</th>
                <th>State</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m._id} className="adm-row-click" onClick={() => setOpenId(m._id)}>
                  <td className="adm-mail-from">{m.from?.name || m.from?.address || "—"}</td>
                  <td className="adm-mail-subj">{m.subject || "(no subject)"}</td>
                  <td>{TYPE_LABEL[m.emailType] || m.emailType || "—"}</td>
                  <td>
                    {m.matchedApplication
                      ? `${m.matchedApplication.company} — ${m.matchedApplication.role}`
                      : m.isJobRelated
                        ? <span className="adm-tag">unmatched</span>
                        : "—"}
                  </td>
                  <td>{m.proposedStatus ? <span className="adm-jstatus" data-s={m.proposedStatus}>{STATUS_LABEL[m.proposedStatus]}</span> : "—"}</td>
                  <td className="adm-num"><Conf v={m.matchConfidence} /></td>
                  <td className="adm-num"><Conf v={m.statusConfidence} /></td>
                  <td>
                    {m.appliedAutomatically && <span className="adm-tag adm-tag-good">auto-applied</span>}
                    {!m.appliedAutomatically && m.statusApplied && <span className="adm-tag adm-tag-good">applied</span>}
                    {m.pendingReview && <span className="adm-tag adm-tag-warn">review</span>}
                    {m.dismissed && <span className="adm-tag">dismissed</span>}
                    {m.replySentAt && <span className="adm-tag adm-tag-good">replied</span>}
                    {!m.isJobRelated && !m.pendingReview && <span className="adm-tag">not job</span>}
                  </td>
                  <td className="adm-mail-date">{jobDate(m.date)}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="adm-empty">
                    Nothing here yet. Once the GitHub Action runs and finds job mail in the <code>Jobs</code> folder,
                    it shows up here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="adm-pager">
          <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span>Page {page} / {data.pages || 1}</span>
          <button
            className="adm-btn adm-btn-ghost adm-btn-sm"
            disabled={page >= (data.pages || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {openId && (
        <MailDrawer
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}
