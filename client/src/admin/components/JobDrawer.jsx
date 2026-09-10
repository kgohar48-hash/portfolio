import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../adminApi";
import { STATUS_LABEL, STATUS_ORDER, jobDate, toDateInput } from "../jobsMeta";

const PRIORITIES = ["low", "medium", "high"];

export default function JobDrawer({ id, onClose, onChange, onDelete }) {
  const [job, setJob] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [iv, setIv] = useState({ date: "", kind: "", notes: "" });

  useEffect(() => {
    adminApi.jobs.get(id).then((d) => setJob(d.job)).catch((e) => setErr(e.message));
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function patch(body) {
    setBusy(true);
    try {
      const res = await adminApi.jobs.patch(id, body);
      setJob(res.job);
      onChange?.(res.job);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const exportJson = useMemo(() => {
    if (!job) return "";
    const keep = [
      "company", "role", "location", "workMode", "employmentType", "seniority", "jobUrl", "source",
      "salary", "postedDate", "deadline", "summary", "keyRequirements", "matchedStrengths", "gaps",
      "fitScore", "atsKeywords", "resumeChanges", "coverLetter", "contactName", "contactEmail",
      "priority", "status", "appliedDate", "nextAction", "nextActionDate", "tags", "notes"
    ];
    const out = { id: job._id };
    for (const k of keep) {
      let v = job[k];
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
      if (["postedDate", "deadline", "appliedDate", "nextActionDate"].includes(k)) v = toDateInput(v);
      out[k] = v;
    }
    return JSON.stringify(out, null, 2);
  }, [job]);

  return (
    <div className="adm-drawer-scrim" onClick={onClose}>
      <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer-head">
          <div>
            <div className="adm-card-title">{job ? `${job.company}` : "Application"}</div>
            {job && <div className="adm-card-sub">{job.role}</div>}
          </div>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>
            Close ✕
          </button>
        </div>

        {err && <div className="adm-error-banner">{err}</div>}
        {!job && !err && <div className="adm-empty">Loading…</div>}

        {job && (
          <>
            <div className="adm-jd-controls">
              <label>
                <span>Status</span>
                <select
                  className="adm-input adm-input-sm"
                  value={job.status}
                  disabled={busy}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Priority</span>
                <select
                  className="adm-input adm-input-sm"
                  value={job.priority}
                  disabled={busy}
                  onChange={(e) => patch({ priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Applied</span>
                <input
                  type="date"
                  className="adm-input adm-input-sm"
                  value={toDateInput(job.appliedDate)}
                  disabled={busy}
                  onChange={(e) => patch({ appliedDate: e.target.value || null })}
                />
              </label>
            </div>

            <div className="adm-kv">
              {job.jobUrl && (
                <Row k="Posting" v={<a href={job.jobUrl} target="_blank" rel="noreferrer">{job.jobUrl}</a>} />
              )}
              <Row k="Location" v={job.location || "—"} />
              <Row
                k="Type"
                v={[job.workMode, job.employmentType, job.seniority].filter(Boolean).join(" · ") || "—"}
              />
              <Row k="Source" v={job.source || "—"} />
              <Row k="Salary" v={job.salary || "—"} />
              <Row k="Fit score" v={job.fitScore != null ? `${job.fitScore} / 100` : "—"} />
              <Row k="Posted" v={jobDate(job.postedDate)} />
              <Row k="Deadline" v={jobDate(job.deadline)} />
              <Row k="Contact" v={[job.contactName, job.contactEmail].filter(Boolean).join(" · ") || "—"} />
              <Row k="Added" v={`${jobDate(job.createdAt)} · via ${job.createdVia}`} />
            </div>

            {(job.cvUrl || job.cvActivity?.length > 0) && (
              <Block title="CV & outreach">
                {job.cvUrl && (
                  <div className="adm-jd-cv-links">
                    <a className="adm-btn adm-btn-ghost adm-btn-sm" href={job.cvUrl} target="_blank" rel="noreferrer">
                      Open CV
                    </a>
                    <span className="adm-kv-v">
                      {job.employerViewCount || 0} employer views
                      {job.employerLastViewAt ? ` · last ${jobDate(job.employerLastViewAt)}` : ""}
                    </span>
                  </div>
                )}
                {job.cvActivity?.length > 0 && (
                  <ul className="adm-jd-act">
                    {[...job.cvActivity]
                      .sort((a, b) => new Date(b.at) - new Date(a.at))
                      .slice(0, 30)
                      .map((e, i) => (
                        <li key={i} className={e.isBot ? "adm-dim" : ""}>
                          <span className="adm-timeline-t">{new Date(e.at).toLocaleString()}</span>
                          {e.type === "open" ? "Opened CV" : e.type === "link_click" ? `Clicked ${e.target}` : "Visited portfolio"}
                          {(e.city || e.country) && ` · ${[e.city, e.country].filter(Boolean).join(", ")}`}
                          {e.isBot && " · scanner"}
                        </li>
                      ))}
                  </ul>
                )}
              </Block>
            )}

            {job.summary && <Block title="Summary"><p>{job.summary}</p></Block>}

            <ListBlock title="Key requirements" items={job.keyRequirements} />
            <ListBlock title="Matched strengths" items={job.matchedStrengths} tone="good" />
            <ListBlock title="Gaps" items={job.gaps} tone="warn" />
            <ChipBlock title="ATS keywords" items={job.atsKeywords} />
            <ListBlock title="Resume tailoring" items={job.resumeChanges} />
            <ChipBlock title="Tags" items={job.tags} />

            {job.coverLetter && (
              <Block
                title="Cover letter"
                action={<CopyBtn text={job.coverLetter} />}
              >
                <pre className="adm-jd-cover">{job.coverLetter}</pre>
              </Block>
            )}

            {/* editable next action + notes */}
            <Block title="Next action">
              <input
                className="adm-input"
                defaultValue={job.nextAction || ""}
                placeholder="e.g. Follow up if no reply by Friday"
                onBlur={(e) => e.target.value !== (job.nextAction || "") && patch({ nextAction: e.target.value })}
              />
              <input
                type="date"
                className="adm-input adm-input-sm adm-jd-mt"
                value={toDateInput(job.nextActionDate)}
                onChange={(e) => patch({ nextActionDate: e.target.value || null })}
              />
            </Block>

            <Block title="Notes">
              <textarea
                className="adm-input adm-jd-notes"
                defaultValue={job.notes || ""}
                placeholder="Freeform notes…"
                onBlur={(e) => e.target.value !== (job.notes || "") && patch({ notes: e.target.value })}
              />
            </Block>

            {/* interviews */}
            <Block title={`Interviews (${job.interviews?.length || 0})`}>
              {(job.interviews || []).map((it) => (
                <div key={it._id} className="adm-jd-iv">
                  <div>
                    <b>{it.kind || "Interview"}</b>{" "}
                    <span className="adm-timeline-t">{jobDate(it.date)}</span>{" "}
                    <span className="adm-jstatus" data-s={it.outcome === "passed" ? "offer" : it.outcome === "failed" ? "rejected" : "screening"}>
                      {it.outcome}
                    </span>
                    {it.notes && <div className="adm-jd-iv-notes">{it.notes}</div>}
                  </div>
                  <button
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    onClick={() => patch({ removeInterviewId: it._id })}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="adm-jd-iv-add">
                <input
                  type="date"
                  className="adm-input adm-input-sm"
                  value={iv.date}
                  onChange={(e) => setIv({ ...iv, date: e.target.value })}
                />
                <input
                  className="adm-input adm-input-sm"
                  placeholder="type (technical, onsite…)"
                  value={iv.kind}
                  onChange={(e) => setIv({ ...iv, kind: e.target.value })}
                />
                <input
                  className="adm-input adm-input-sm"
                  placeholder="notes"
                  value={iv.notes}
                  onChange={(e) => setIv({ ...iv, notes: e.target.value })}
                />
                <button
                  className="adm-btn adm-btn-ghost adm-btn-sm"
                  disabled={busy || (!iv.date && !iv.kind)}
                  onClick={() => {
                    patch({ addInterview: iv });
                    setIv({ date: "", kind: "", notes: "" });
                  }}
                >
                  Add
                </button>
              </div>
            </Block>

            {job.statusHistory?.length > 0 && (
              <Block title="Status history">
                <ol className="adm-timeline">
                  {job.statusHistory.map((h, i) => (
                    <li key={i}>
                      <span className="adm-timeline-t">{jobDate(h.at)}</span>
                      <span>
                        {STATUS_LABEL[h.from] || h.from || "—"} → <b>{STATUS_LABEL[h.to] || h.to}</b>
                      </span>
                    </li>
                  ))}
                </ol>
              </Block>
            )}

            <div className="adm-jd-footer">
              <button
                className="adm-btn adm-btn-ghost adm-btn-sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exportJson);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  } catch {
                    /* blocked */
                  }
                }}
              >
                {copied ? "Copied ✓" : "Copy JSON (for LLM update)"}
              </button>

              {confirmDel ? (
                <span className="adm-jd-del">
                  Delete this application?
                  <button
                    className="adm-btn adm-btn-sm adm-btn-danger"
                    onClick={async () => {
                      await adminApi.jobs.remove(id);
                      onDelete?.(id);
                    }}
                  >
                    Yes, delete
                  </button>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setConfirmDel(false)}>
                    No
                  </button>
                </span>
              ) : (
                <button className="adm-btn adm-btn-ghost adm-btn-sm adm-jd-del-btn" onClick={() => setConfirmDel(true)}>
                  Delete
                </button>
              )}
            </div>
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

function Block({ title, action, children }) {
  return (
    <div className="adm-jd-block">
      <div className="adm-jd-block-head">
        <div className="adm-card-title">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ListBlock({ title, items, tone }) {
  if (!items || items.length === 0) return null;
  return (
    <Block title={title}>
      <ul className={`adm-jd-list ${tone ? `tone-${tone}` : ""}`}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </Block>
  );
}

function ChipBlock({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <Block title={title}>
      <div className="adm-jd-chips">
        {items.map((it, i) => (
          <span key={i} className="adm-tag">
            {it}
          </span>
        ))}
      </div>
    </Block>
  );
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="adm-btn adm-btn-ghost adm-btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* blocked */
        }
      }}
    >
      {done ? "Copied ✓" : "Copy"}
    </button>
  );
}
