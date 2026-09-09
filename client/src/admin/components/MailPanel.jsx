import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../adminApi";
import { STATUS_LABEL, jobDate } from "../jobsMeta";
import MailDrawer from "./MailDrawer";

const VIEWS = [
  ["review", "Needs review"],
  ["auto", "Auto-applied"],
  ["unmatched", "Unmatched"],
  ["job", "Job-related"],
  ["all", "All"]
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

const ACTION_NOTE = {
  "status-applied": (r) => `Status set to “${STATUS_LABEL[r.to] || r.to}”.`,
  "queued-for-review": () => "Added — proposed a status change, waiting for your OK.",
  "review-unmatched": () => "Added — job-related but not matched to an application.",
  "not-job-related": () => "Didn't look job-related — filed, no action.",
  "matched-no-change": () => "Matched an application; nothing to change.",
  "reply-drafted": () => "Added — a reply draft is ready for you.",
  skipped: () => "Skipped — no job signal found.",
  error: (r) => `Couldn't classify: ${r.reason}`
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

  const [raw, setRaw] = useState("");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

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

  const threshold = settings?.settings?.statusAutoApplyMinConfidence ?? 0.72;
  const reviewCount = data?.reviewCount ?? 0;

  async function saveThreshold(val) {
    const s = await adminApi.mail.saveSettings({ statusAutoApplyMinConfidence: val });
    setSettings((prev) => ({ ...prev, settings: s.settings }));
  }

  async function processPaste() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminApi.mail.paste({ raw, from, subject });
      const noteFn = ACTION_NOTE[res.result?.action] || (() => "Processed.");
      setNotice({
        type: res.result?.action === "error" ? "bad" : "good",
        text: `${res.deduped ? "Already had this email. " : ""}${noteFn(res.result)}`,
        openId: res.mail?._id
      });
      setRaw("");
      setFrom("");
      setSubject("");
      load();
    } catch (e) {
      setNotice({ type: "bad", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(mailId, applicationId, status) {
    try {
      await adminApi.mail.apply(mailId, { applicationId, status });
      load();
    } catch (e) {
      setErr(e.message);
    }
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
          <code>GEMINI_API_KEY</code> isn't set on the API service — emails can't be classified.
        </div>
      )}

      {/* paste box */}
      <div className="adm-card adm-card-wide">
        <div className="adm-card-title">Paste a job email</div>
        <div className="adm-card-sub">
          Copy a recruiter / ATS email and paste it below. The LLM matches it to one of your tracked applications,
          updates the status (auto if it's confident, otherwise it waits in <b>Needs review</b>), and drafts a reply
          if one is warranted. <b>Nothing is ever sent</b> — you copy the draft yourself.
        </div>
        <div className="adm-paste-fields">
          <input
            className="adm-input adm-input-sm"
            placeholder="From (e.g. anna@company.com) — optional"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            className="adm-input adm-input-sm"
            placeholder="Subject — optional"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <textarea
          className="adm-json-input"
          placeholder={"Paste the email here.\nIf you paste the whole thing (with From: / Subject: / Date: lines) those are read automatically."}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <div className="adm-json-actions">
          <button className="adm-btn adm-btn-primary adm-btn-sm" disabled={busy || raw.trim().length < 20} onClick={processPaste}>
            {busy ? "Reading…" : "Process email"}
          </button>
          {raw && (
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setRaw(""); setFrom(""); setSubject(""); setNotice(null); }}>
              Clear
            </button>
          )}
        </div>
        {notice && (
          <div className={`adm-json-note ${notice.type}`}>
            {notice.text}{" "}
            {notice.openId && (
              <button className="adm-linkbtn" onClick={() => setOpenId(notice.openId)}>
                open
              </button>
            )}
          </div>
        )}
      </div>

      {/* settings */}
      {settings?.settings && (
        <div className="adm-card adm-card-wide adm-mail-settings">
          <div>
            <div className="adm-card-title">Auto-apply threshold</div>
            <div className="adm-card-sub">
              A pasted email updates the application's status automatically when the LLM's status confidence is at or
              above this. Below it, the change waits in <b>Needs review</b>.
            </div>
          </div>
          <label className="adm-mail-threshold">
            <span>≥ {Math.round(threshold * 100)}%</span>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(e) =>
                setSettings((p) => ({ ...p, settings: { ...p.settings, statusAutoApplyMinConfidence: Number(e.target.value) } }))
              }
              onPointerUp={(e) => saveThreshold(Number(e.target.value))}
              onKeyUp={(e) => saveThreshold(Number(e.target.value))}
            />
          </label>
        </div>
      )}

      {/* list */}
      <div className="adm-card adm-card-wide">
        <div className="adm-card-head">
          <div className="adm-card-title">
            Processed emails {reviewCount > 0 && <span className="adm-tag adm-tag-warn">{reviewCount} to review</span>}
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
                        ? <span className="adm-tag">{m.extractedCompany ? m.extractedCompany : "unmatched"}</span>
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
                    {!m.isJobRelated && !m.pendingReview && !m.dismissed && <span className="adm-tag">not job</span>}
                  </td>
                  <td className="adm-mail-date">{jobDate(m.date)}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="adm-empty">
                    Nothing here yet — paste an email above.
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
          <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={page >= (data.pages || 1)} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      </div>

      {openId && <MailDrawer id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}
