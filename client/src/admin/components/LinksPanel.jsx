import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import { jobDate } from "../jobsMeta";

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function CopyButton({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="adm-btn adm-btn-ghost adm-btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {
          /* blocked */
        }
      }}
    >
      {ok ? "Copied ✓" : "Copy link"}
    </button>
  );
}

/** Hand-picked tracking links — e.g. a LinkedIn bio link — same redirect +
 * logging mechanics as a CV's links, just not generated from a résumé. */
export default function LinksPanel() {
  const [list, setList] = useState(null);
  const [site, setSite] = useState("");
  const [jobs, setJobs] = useState([]);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [jobId, setJobId] = useState("");

  function reload() {
    adminApi.links
      .list()
      .then((d) => {
        setList(d.items || []);
        if (d.site) setSite(d.site);
      })
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    reload();
    adminApi.jobs.list().then((d) => setJobs(d.items || [])).catch(() => {});
  }, []);

  async function create() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminApi.links.create({
        label,
        slug: slugTouched ? slug : undefined,
        jobApplicationId: jobId || undefined
      });
      setNotice({ type: "good", text: `"${res.link.label}" is live.`, url: res.url });
      setLabel("");
      setSlug("");
      setSlugTouched(false);
      setJobId("");
      reload();
    } catch (e) {
      setNotice({ type: "bad", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    await adminApi.links.remove(id);
    reload();
  }

  const preview = slugTouched ? slug : slugify(label);

  return (
    <section className="adm-card">
      <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide custom tracking links" : `Custom tracking links${list ? ` (${list.length})` : ""}`}
      </button>

      {open && (
        <div className="adm-cv-master">
          <p className="adm-card-sub">
            A hand-picked link for anywhere you don't have a generated CV — a LinkedIn bio, a conference QR code, a
            specific outreach. Same tracking as a CV's links: opens the portfolio labelled with this name in the
            Visitors tab, and (if attached to a job) logs on that job too.
          </p>

          {err && <div className="adm-error-banner">{err}</div>}

          <div className="adm-cv-form">
            <div className="adm-cv-form-row">
              <label>
                <span>Name</span>
                <input
                  className="adm-input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="LinkedIn bio"
                />
              </label>
              <label>
                <span>Link (editable)</span>
                <input
                  className="adm-input"
                  value={preview}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setSlugTouched(true);
                  }}
                  placeholder="linkedin-bio"
                />
              </label>
            </div>
            <label>
              <span>Attach to a job application (optional)</span>
              <select className="adm-input adm-input-sm" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">— none —</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.company} — {j.role}
                  </option>
                ))}
              </select>
            </label>
            <div className="adm-cv-actions">
              <button className="adm-btn" disabled={!label.trim() || busy} onClick={create}>
                {busy ? "Creating…" : "Create link"}
              </button>
              {notice && (
                <span className={notice.type === "good" ? "adm-note-good" : "adm-note-bad"}>
                  {notice.text}
                  {notice.url && (
                    <>
                      {" "}
                      <a href={notice.url} target="_blank" rel="noreferrer">
                        Open
                      </a>{" "}
                      <CopyButton text={notice.url} />
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="adm-table-scroll" style={{ marginTop: 14 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Job</th>
                  <th className="adm-num">Clicks</th>
                  <th className="adm-num">Visits</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(list || []).map((l) => {
                  const url = `${site}/r/${l.slug}/portfolio`;
                  return (
                    <tr key={l._id}>
                      <td>
                        {l.label}
                        <div className="adm-vid-label" style={{ color: "var(--adm-text-faint)" }}>
                          /r/{l.slug}
                        </div>
                      </td>
                      <td>{l.jobApplication ? `${l.jobApplication.company} — ${l.jobApplication.role}` : "—"}</td>
                      <td className="adm-num">{l.clickCount || 0}</td>
                      <td className="adm-num">{l.visitCount || 0}</td>
                      <td>{jobDate(l.createdAt)}</td>
                      <td>
                        <a className="adm-btn adm-btn-ghost adm-btn-sm" href={url} target="_blank" rel="noreferrer">
                          Open
                        </a>{" "}
                        <CopyButton text={url} />{" "}
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => remove(l._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {list && list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="adm-empty">
                      No custom links yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
