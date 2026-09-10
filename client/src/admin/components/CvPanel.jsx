import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../adminApi";
import { jobDate } from "../jobsMeta";
import CvDrawer from "./CvDrawer";

function CopyButton({ text, label = "Copy link", done = "Copied ✓" }) {
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
      {ok ? done : label}
    </button>
  );
}

export default function CvPanel() {
  const [list, setList] = useState(null);
  const [site, setSite] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState(null); // { type, text, url }
  const [busy, setBusy] = useState(false);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [jobUrl, setJobUrl] = useState("");

  const [showMaster, setShowMaster] = useState(false);
  const [masterText, setMasterText] = useState("");
  const [masterErr, setMasterErr] = useState("");
  const [masterSaved, setMasterSaved] = useState(false);
  const [llm, setLlm] = useState(true);

  const [openId, setOpenId] = useState(() => new URLSearchParams(window.location.search).get("cv") || null);

  function reload() {
    adminApi.cv
      .list()
      .then((d) => {
        setList(d.items || []);
        if (d.site) setSite(d.site);
      })
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    reload();
    adminApi.cv
      .master()
      .then((d) => {
        setMasterText(JSON.stringify(d.master, null, 2));
        setLlm(Boolean(d.llm));
      })
      .catch(() => {});
  }, []);

  const cvUrl = (slug) => `${site || ""}/cv/${slug}`;

  async function generate() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminApi.cv.generate({ company, role, jobDescription: jd, jobUrl });
      setNotice({ type: "good", text: `CV for ${res.cv.company} — ${res.cv.role} is ready.`, url: res.url });
      setCompany("");
      setRole("");
      setJd("");
      setJobUrl("");
      reload();
      setOpenId(res.cv._id);
    } catch (e) {
      setNotice({ type: "bad", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function saveMaster() {
    setMasterErr("");
    let parsed;
    try {
      parsed = JSON.parse(masterText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    } catch {
      setMasterErr("That isn't a valid JSON object.");
      return;
    }
    try {
      const d = await adminApi.cv.saveMaster(parsed);
      setMasterText(JSON.stringify(d.master, null, 2));
      setMasterSaved(true);
      setTimeout(() => setMasterSaved(false), 1600);
    } catch (e) {
      setMasterErr(e.message);
    }
  }

  const canGenerate = company.trim() && role.trim() && jd.trim().length >= 60 && !busy;

  const totals = useMemo(() => {
    const t = { count: 0, opens: 0, visits: 0 };
    for (const c of list || []) {
      t.count += 1;
      t.opens += c.openCount || 0;
      t.visits += c.visitCount || 0;
    }
    return t;
  }, [list]);

  return (
    <div className="adm-cv">
      {err && <div className="adm-error-banner">{err}</div>}
      {!llm && (
        <div className="adm-error-banner">
          <code>GEMINI_API_KEY</code> isn’t set on the API service — generation is disabled.
        </div>
      )}

      <section className="adm-card">
        <div className="adm-card-title">Generate a tailored CV + cover letter</div>
        <p className="adm-card-sub">
          Paste the job description. The master résumé is tailored to it, a job application is created in the Jobs
          tab, and the CV is published at a tracked link.
        </p>

        <div className="adm-cv-form">
          <div className="adm-cv-form-row">
            <label>
              <span>Company</span>
              <input className="adm-input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Celonis" />
            </label>
            <label>
              <span>Role</span>
              <input className="adm-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Data Engineer" />
            </label>
          </div>
          <label>
            <span>Job posting URL (optional)</span>
            <input className="adm-input" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://…" />
          </label>
          <label>
            <span>Job description</span>
            <textarea
              className="adm-input adm-cv-jd"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here…"
            />
          </label>
          <div className="adm-cv-actions">
            <button className="adm-btn" disabled={!canGenerate} onClick={generate}>
              {busy ? "Generating… (~20s)" : "Generate CV"}
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
      </section>

      <section className="adm-card">
        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setShowMaster((v) => !v)}>
          {showMaster ? "Hide master résumé" : "Edit master résumé"}
        </button>
        {showMaster && (
          <div className="adm-cv-master">
            <p className="adm-card-sub">
              The single source of factual truth. The generator may reorder and reword this for a job, but never
              invents facts outside it. JSON.
            </p>
            <textarea
              className="adm-input adm-cv-master-ta"
              value={masterText}
              onChange={(e) => setMasterText(e.target.value)}
              spellCheck={false}
            />
            {masterErr && <div className="adm-note-bad">{masterErr}</div>}
            <button className="adm-btn adm-btn-sm" onClick={saveMaster}>
              {masterSaved ? "Saved ✓" : "Save master"}
            </button>
          </div>
        )}
      </section>

      <section className="adm-card">
        <div className="adm-card-title">
          Generated CVs {list ? `(${totals.count})` : ""}
        </div>
        {list && (
          <div className="adm-card-sub">
            {totals.opens} opens · {totals.visits} portfolio visits across all CVs
          </div>
        )}
        <div className="adm-table-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th className="adm-num">Opens</th>
                <th className="adm-num">Clicks</th>
                <th className="adm-num">Visits</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(list || []).map((c) => (
                <tr key={c._id} className="adm-row-click" onClick={() => setOpenId(c._id)}>
                  <td>{c.company}</td>
                  <td>{c.role}</td>
                  <td className="adm-num">{c.openCount || 0}</td>
                  <td className="adm-num">{c.clickCount || 0}</td>
                  <td className="adm-num">{c.visitCount || 0}</td>
                  <td>
                    <span className={`adm-tag ${c.status === "sent" ? "adm-tag-good" : ""}`}>{c.status}</span>
                  </td>
                  <td>{jobDate(c.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <a className="adm-btn adm-btn-ghost adm-btn-sm" href={cvUrl(c.slug)} target="_blank" rel="noreferrer">
                      Open
                    </a>{" "}
                    <CopyButton text={cvUrl(c.slug)} />
                  </td>
                </tr>
              ))}
              {list && list.length === 0 && (
                <tr>
                  <td colSpan={8} className="adm-empty">
                    No CVs generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {openId && (
        <CvDrawer
          id={openId}
          site={site}
          onClose={() => setOpenId(null)}
          onChange={reload}
          onDelete={() => {
            setOpenId(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
