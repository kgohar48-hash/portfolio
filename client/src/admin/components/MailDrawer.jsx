import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../adminApi";
import { STATUS_LABEL, STATUS_ORDER, jobDate } from "../jobsMeta";

export default function MailDrawer({ id, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [matchId, setMatchId] = useState("");
  const [reply, setReply] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("");
  const [showHtml, setShowHtml] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  function hydrate(d) {
    setData(d);
    setStatus(d.mail.proposedStatus || d.mail.matchedApplication?.status || "");
    setMatchId(d.mail.matchedApplication?._id || "");
    setReply(d.mail.replyDraft || "");
    setNewCompany(d.mail.extractedCompany || "");
    setNewRole(d.mail.extractedRole || "");
  }

  function refresh() {
    return adminApi.mail.get(id).then((d) => {
      hydrate(d);
      onChanged?.();
    });
  }

  useEffect(() => {
    adminApi.mail.get(id).then(hydrate).catch((e) => setErr(e.message));
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const m = data?.mail;

  async function act(name, fn) {
    setBusy(name);
    setNote("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy("");
    }
  }

  const htmlSrc = useMemo(() => {
    if (!m?.html) return "";
    return `<base target="_blank"><style>body{font:14px/1.5 system-ui;color:#111;padding:8px}</style>${m.html}`;
  }, [m]);

  async function copyReply() {
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="adm-drawer-scrim" onClick={onClose}>
      <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer-head">
          <div>
            <div className="adm-card-title">{m ? m.subject || "(no subject)" : "Email"}</div>
            {m && (
              <div className="adm-card-sub">
                {m.from?.name ? `${m.from.name} · ` : ""}
                {m.from?.address || "unknown sender"} · {jobDate(m.date)}
              </div>
            )}
          </div>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>
            Close ✕
          </button>
        </div>

        {err && <div className="adm-error-banner">{err}</div>}
        {!m && !err && <div className="adm-empty">Loading…</div>}

        {m && (
          <>
            <div className="adm-mail-verdict">
              <div className="adm-mail-verdict-row">
                <span className="adm-tag">{m.emailType || "unclassified"}</span>
                {m.matchConfidence != null && <span>match {Math.round(m.matchConfidence * 100)}%</span>}
                {m.statusConfidence != null && <span>status {Math.round(m.statusConfidence * 100)}%</span>}
                {m.appliedAutomatically && <span className="adm-tag adm-tag-good">auto-applied</span>}
              </div>
              {m.reasoning && <p className="adm-mail-reasoning">{m.reasoning}</p>}
              {(m.extracted?.interviewDate || m.extracted?.deadline) && (
                <p className="adm-card-sub">
                  {m.extracted.interviewDate && `Interview: ${jobDate(m.extracted.interviewDate)}  `}
                  {m.extracted.deadline && `Deadline: ${jobDate(m.extracted.deadline)}`}
                </p>
              )}
            </div>

            {/* match + status */}
            <div className="adm-jd-block">
              <div className="adm-card-title">Application &amp; status</div>

              {data.applications?.length > 0 ? (
                <div className="adm-mail-controls">
                  <select className="adm-input adm-input-sm" value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                    <option value="">— no application —</option>
                    {data.applications.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.company} — {a.role} ({STATUS_LABEL[a.status]})
                      </option>
                    ))}
                  </select>
                  <select className="adm-input adm-input-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">— pick status —</option>
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    className="adm-btn adm-btn-primary adm-btn-sm"
                    disabled={!matchId || !status || busy === "apply"}
                    onClick={() => act("apply", () => adminApi.mail.apply(id, { applicationId: matchId, status }))}
                  >
                    {busy === "apply" ? "Applying…" : m.statusApplied ? "Re-apply" : "Apply status"}
                  </button>
                </div>
              ) : (
                <div className="adm-card-sub">No applications yet — add one in the Job applications tab, or create it below.</div>
              )}

              {/* create a new application from this email */}
              {!m.matchedApplication && m.isJobRelated && (
                <div className="adm-mail-create">
                  <div className="adm-card-sub">Not one of your tracked applications? Create it:</div>
                  <div className="adm-mail-controls">
                    <input
                      className="adm-input adm-input-sm"
                      placeholder="Company"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                    />
                    <input
                      className="adm-input adm-input-sm"
                      placeholder="Role"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    />
                    <button
                      className="adm-btn adm-btn-ghost adm-btn-sm"
                      disabled={!newCompany.trim() || !newRole.trim() || busy === "create"}
                      onClick={() =>
                        act("create", () =>
                          adminApi.mail.createApplication(id, { company: newCompany, role: newRole, status: m.proposedStatus })
                        )
                      }
                    >
                      {busy === "create" ? "Creating…" : "Create + link"}
                    </button>
                  </div>
                </div>
              )}

              <div className="adm-mail-controls">
                <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy === "dismiss"} onClick={() => act("dismiss", () => adminApi.mail.dismiss(id))}>
                  Dismiss
                </button>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy === "reprocess"} onClick={() => act("reprocess", () => adminApi.mail.reprocess(id))}>
                  {busy === "reprocess" ? "Re-running…" : "Re-run LLM"}
                </button>
                <button
                  className="adm-btn adm-btn-ghost adm-btn-sm adm-btn-danger"
                  onClick={() => act("delete", async () => { await adminApi.mail.remove(id); onClose(); })}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* suggested reply — draft only, you copy it */}
            <div className="adm-jd-block">
              <div className="adm-jd-block-head">
                <div className="adm-card-title">
                  Suggested reply
                  {m.replyConfidence != null && (
                    <span className="adm-card-sub"> · confidence {Math.round(m.replyConfidence * 100)}%</span>
                  )}
                </div>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy === "draft"} onClick={() => act("draft", async () => {
                  const d = await adminApi.mail.draft(id);
                  setReply(d.replyDraft || "");
                })}>
                  {busy === "draft" ? "Drafting…" : m.replyDraft ? "Redraft" : "Draft with AI"}
                </button>
              </div>
              <textarea
                className="adm-input adm-jd-notes"
                value={reply}
                placeholder="No reply drafted. Use “Draft with AI”, or write your own — then copy it into your mail client."
                onChange={(e) => setReply(e.target.value)}
              />
              <button className="adm-btn adm-btn-primary adm-btn-sm adm-jd-mt" disabled={reply.trim().length < 2} onClick={copyReply}>
                {copied ? "Copied ✓" : "Copy reply"}
              </button>
            </div>

            {note && <div className="adm-json-note bad">{note}</div>}

            {/* the email itself */}
            <div className="adm-jd-block">
              <div className="adm-jd-block-head">
                <div className="adm-card-title">Message</div>
                {m.html && (
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setShowHtml((v) => !v)}>
                    {showHtml ? "Plain text" : "HTML view"}
                  </button>
                )}
              </div>
              {showHtml && m.html ? (
                <iframe className="adm-mail-html" sandbox="" srcDoc={htmlSrc} title="email" />
              ) : (
                <pre className="adm-jd-cover">{m.text || "(no text body)"}</pre>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
