import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import { jobDate } from "../jobsMeta";

const ACT_LABEL = { open: "Opened CV", link_click: "Clicked link", site_visit: "Visited portfolio" };

export default function CvDrawer({ id, site, onClose, onChange, onDelete }) {
  const [cv, setCv] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [cover, setCover] = useState("");
  const [coverDirty, setCoverDirty] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  function load() {
    adminApi.cv
      .get(id)
      .then((d) => {
        setCv(d.cv);
        setCover(d.cv.coverLetter || "");
        setCoverDirty(false);
      })
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const url = cv ? `${site || ""}/cv/${cv.slug}` : "";

  async function saveCover() {
    setBusy(true);
    try {
      await adminApi.cv.patch(id, { coverLetter: cover });
      setCoverDirty(false);
      onChange?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status) {
    setBusy(true);
    try {
      const d = await adminApi.cv.patch(id, { status });
      setCv((c) => ({ ...c, status: d.cv.status }));
      onChange?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    setBusy(true);
    setErr("");
    try {
      await adminApi.cv.regenerate(id);
      load();
      onChange?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const activity = [
    ...(cv?.opens || []).map((e) => ({ ...e, type: "open" })),
    ...(cv?.linkEvents || []).map((e) => ({ ...e, type: "link_click" })),
    ...(cv?.visits || []).map((e) => ({ ...e, type: "site_visit" }))
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <div className="adm-drawer-scrim" onClick={onClose}>
      <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer-head">
          <div>
            <div className="adm-card-title">{cv ? cv.company : "CV"}</div>
            {cv && <div className="adm-card-sub">{cv.role}</div>}
          </div>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onClose}>
            Close ✕
          </button>
        </div>

        {err && <div className="adm-error-banner">{err}</div>}
        {!cv && !err && <div className="adm-empty">Loading…</div>}

        {cv && (
          <>
            <div className="adm-kv">
              <Row
                k="Link"
                v={
                  <a href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                }
              />
              <Row k="Job application" v={cv.jobApplication ? `${cv.jobApplication.company} — ${cv.jobApplication.status}` : "—"} />
              <Row k="Fit score" v={cv.jobMeta?.fitScore != null ? `${cv.jobMeta.fitScore} / 100` : "—"} />
              <Row k="Model" v={cv.model || "—"} />
              <Row k="Created" v={jobDate(cv.createdAt)} />
              <Row
                k="Engagement"
                v={`${cv.openCount || 0} opens · ${cv.clickCount || 0} link clicks · ${cv.visitCount || 0} portfolio visits`}
              />
            </div>

            <div className="adm-cv-drawer-actions">
              <select
                className="adm-input adm-input-sm"
                value={cv.status}
                disabled={busy}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">draft</option>
                <option value="sent">sent</option>
              </select>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy} onClick={regenerate}>
                {busy ? "Working…" : "Regenerate"}
              </button>
            </div>

            <Block title="Cover letter" action={coverDirty && <button className="adm-btn adm-btn-sm" disabled={busy} onClick={saveCover}>Save</button>}>
              <textarea
                className="adm-input adm-cv-cover"
                value={cover}
                onChange={(e) => {
                  setCover(e.target.value);
                  setCoverDirty(true);
                }}
              />
            </Block>

            {cv.jobMeta?.keyRequirements?.length > 0 && (
              <ListBlock title="Key requirements" items={cv.jobMeta.keyRequirements} />
            )}
            {cv.jobMeta?.matchedStrengths?.length > 0 && (
              <ListBlock title="Matched strengths" items={cv.jobMeta.matchedStrengths} />
            )}
            {cv.jobMeta?.atsKeywords?.length > 0 && (
              <Block title="ATS keywords">
                <div className="adm-chips">
                  {cv.jobMeta.atsKeywords.map((k, i) => (
                    <span key={i} className="adm-tag">
                      {k}
                    </span>
                  ))}
                </div>
              </Block>
            )}

            <Block title={`Activity (${activity.length})`}>
              {activity.length === 0 && <div className="adm-empty">Nothing yet.</div>}
              {activity.length > 0 && (
                <ol className="adm-timeline">
                  {activity.map((e, i) => (
                    <li key={i} className={e.isBot ? "adm-dim" : ""}>
                      <span className="adm-timeline-t">{new Date(e.at).toLocaleString()}</span>
                      <span>
                        <b>{ACT_LABEL[e.type]}</b>
                        {e.target ? ` — ${e.target}` : ""}
                        {(e.city || e.country) && ` · ${[e.city, e.country].filter(Boolean).join(", ")}`}
                        {e.isBot && " · scanner"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Block>

            <details className="adm-cv-json">
              <summary>Raw CV data</summary>
              <pre>{JSON.stringify(cv.data, null, 2)}</pre>
            </details>

            <div className="adm-jd-footer">
              {confirmDel ? (
                <span className="adm-jd-del">
                  Delete this CV? (the job application stays)
                  <button
                    className="adm-btn adm-btn-sm adm-btn-danger"
                    onClick={async () => {
                      await adminApi.cv.remove(id);
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

function ListBlock({ title, items }) {
  return (
    <Block title={title}>
      <ul className="adm-jd-list">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </Block>
  );
}
