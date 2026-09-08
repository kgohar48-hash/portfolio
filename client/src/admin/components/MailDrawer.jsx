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
  const [showHtml, setShowHtml] = useState(false);
  const [note, setNote] = useState("");

  function refresh(reload = true) {
    return adminApi.mail.get(id).then((d) => {
      setData(d);
      setStatus(d.mail.proposedStatus || d.mail.matchedApplication?.status || "");
      setMatchId(d.mail.matchedApplication?._id || "");
      setReply(d.mail.replyBodySent || d.mail.replyDraft || "");
      if (reload) onChanged?.();
    });
  }

  useEffect(() => {
    adminApi.mail
      .get(id)
      .then((d) => {
        setData(d);
        setStatus(d.mail.proposedStatus || d.mail.matchedApplication?.status || "");
        setMatchId(d.mail.matchedApplication?._id || "");
        setReply(d.mail.replyDraft || "");
      })
      .catch((e) => setErr(e.message));
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

  return (
    <div className="adm-drawer-scrim" onClick={onClose}>
      <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer-head">
          <div>
            <div className="adm-card-title">{m ? m.subject || "(no subject)" : "Email"}</div>
            {m && (
              <div className="adm-card-sub">
                {m.from?.name ? `${m.from.name} · ` : ""}
                {m.from?.address} · {jobDate(m.date)}
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
            {/* LLM verdict */}
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
              <div className="adm-mail-controls">
                <select
                  className="adm-input adm-input-sm"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                >
                  <option value="">— no application —</option>
                  {(data.applications || []).map((a) => (
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
                  onClick={() =>
                    act("apply", () => adminApi.mail.apply(id, { applicationId: matchId, status }))
                  }
                >
                  {busy === "apply" ? "Applying…" : m.statusApplied ? "Re-apply status" : "Apply status"}
                </button>
              </div>
              <div className="adm-mail-controls">
                <button
                  className="adm-btn adm-btn-ghost adm-btn-sm"
                  disabled={busy === "dismiss"}
                  onClick={() => act("dismiss", () => adminApi.mail.dismiss(id))}
                >
                  Dismiss
                </button>
                <button
                  className="adm-btn adm-btn-ghost adm-btn-sm"
                  disabled={busy === "reprocess"}
                  onClick={() => act("reprocess", () => adminApi.mail.reprocess(id))}
                >
                  {busy === "reprocess" ? "Re-running…" : "Re-run LLM"}
                </button>
              </div>
            </div>

            {/* reply */}
            <div className="adm-jd-block">
              <div className="adm-jd-block-head">
                <div className="adm-card-title">
                  Reply
                  {m.replyConfidence != null && (
                    <span className="adm-card-sub"> · draft confidence {Math.round(m.replyConfidence * 100)}%</span>
                  )}
                </div>
                <button
                  className="adm-btn adm-btn-ghost adm-btn-sm"
                  disabled={busy === "draft"}
                  onClick={() => act("draft", async () => {
                    const d = await adminApi.mail.draft(id);
                    setReply(d.replyDraft || "");
                  })}
                >
                  {busy === "draft" ? "Drafting…" : "Draft with AI"}
                </button>
              </div>
              {m.replySentAt ? (
                <>
                  <div className="adm-card-sub">Sent {jobDate(m.replySentAt)}</div>
                  <pre className="adm-jd-cover">{m.replyBodySent}</pre>
                </>
              ) : (
                <>
                  <textarea
                    className="adm-input adm-jd-notes"
                    value={reply}
                    placeholder="Write a reply, or use “Draft with AI”…"
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <button
                    className="adm-btn adm-btn-primary adm-btn-sm adm-jd-mt"
                    disabled={reply.trim().length < 2 || busy === "reply"}
                    onClick={() => act("reply", () => adminApi.mail.reply(id, { body: reply }))}
                  >
                    {busy === "reply" ? "Sending…" : `Send reply to ${m.from?.address}`}
                  </button>
                </>
              )}
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
