import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../adminApi";
import { STATUS_LABEL, STATUS_ORDER, STATUS_GROUP, jobDate } from "../jobsMeta";
import JobDrawer from "./JobDrawer";

function CopyButton({ text, label = "Copy", copiedLabel = "Copied ✓", className = "adm-btn adm-btn-ghost adm-btn-sm" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? copiedLabel : label}
    </button>
  );
}

export default function JobsPanel() {
  const [schema, setSchema] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [err, setErr] = useState("");
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // {type, text}
  const [dupe, setDupe] = useState(null); // {existingId, existing, payload}
  const params = new URLSearchParams(window.location.search);
  const [showSchema, setShowSchema] = useState(params.get("schema") === "1");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(params.get("job") || null);

  function reload() {
    adminApi.jobs
      .list()
      .then((d) => setJobs(d.items || []))
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    adminApi.jobs.schema().then(setSchema).catch((e) => setErr(e.message));
    reload();
  }, []);

  const stats = useMemo(() => {
    const s = { total: 0, toApply: 0, active: 0, interviewing: 0, offer: 0, closed: 0 };
    for (const j of jobs || []) {
      s.total += 1;
      s[STATUS_GROUP[j.status] || "closed"] += 1;
    }
    return s;
  }, [jobs]);

  const visible = useMemo(() => {
    const list = jobs || [];
    if (filter === "all") return list;
    if (filter === "open") return list.filter((j) => !["rejected", "withdrawn", "no_response"].includes(j.status));
    return list.filter((j) => j.status === filter);
  }, [jobs, filter]);

  async function submit(force) {
    setSaving(true);
    setNotice(null);
    setDupe(null);
    let parsed;
    try {
      parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) throw new Error("array");
      if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    } catch {
      setSaving(false);
      setNotice({ type: "bad", text: "That's not a valid JSON object. Paste the single { … } block from your LLM." });
      return;
    }
    try {
      const body = force ? { ...parsed, force } : parsed;
      const res = await adminApi.jobs.save(body);
      if (res.duplicate) {
        setDupe({ existingId: res.existingId, existing: res.existing, payload: parsed });
        setNotice(null);
      } else {
        setNotice({
          type: "good",
          text: res.updated
            ? `Updated “${res.job.company} — ${res.job.role}”.`
            : `Added “${res.job.company} — ${res.job.role}”.`
        });
        setRaw("");
        setJobs((prev) => {
          const rest = (prev || []).filter((j) => j._id !== res.job._id);
          return [res.job, ...rest];
        });
      }
    } catch (e) {
      setNotice({ type: "bad", text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function resolveDupe(mode) {
    if (mode === "cancel") {
      setDupe(null);
      return;
    }
    setSaving(true);
    try {
      const body =
        mode === "update"
          ? { ...dupe.payload, force: "update" }
          : { ...dupe.payload, force: "new" };
      const res = await adminApi.jobs.save(body);
      setNotice({
        type: "good",
        text: res.updated
          ? `Updated “${res.job.company} — ${res.job.role}”.`
          : `Added a separate entry for “${res.job.company} — ${res.job.role}”.`
      });
      setRaw("");
      setDupe(null);
      setJobs((prev) => {
        const rest = (prev || []).filter((j) => j._id !== res.job._id);
        return [res.job, ...rest];
      });
    } catch (e) {
      setNotice({ type: "bad", text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(job, status) {
    try {
      const res = await adminApi.jobs.patch(job._id, { status });
      setJobs((prev) => prev.map((j) => (j._id === job._id ? res.job : j)));
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <div className="adm-error-banner">{err}</div>;
  if (jobs === null || schema === null) return <div className="adm-loading">Loading job tracker…</div>;

  return (
    <div className="adm-jobs">
      <section className="adm-stats">
        <Stat label="Applications" value={stats.total} />
        <Stat label="To apply" value={stats.toApply} />
        <Stat label="In pipeline" value={stats.active} />
        <Stat label="Interviewing" value={stats.interviewing} accent={stats.interviewing ? "warn" : undefined} />
        <Stat label="Offers" value={stats.offer} accent={stats.offer ? "good" : undefined} />
        <Stat label="Closed" value={stats.closed} />
      </section>

      {/* paste box */}
      <div className="adm-card adm-card-wide">
        <div className="adm-card-title">Add from LLM JSON</div>
        <div className="adm-card-sub">
          Paste the JSON your LLM produced after tailoring your resume &amp; cover letter. A matching{" "}
          <button className="adm-linkbtn" onClick={() => setShowSchema((v) => !v)}>
            {showSchema ? "hide schema" : "schema & prompt"}
          </button>{" "}
          is below.
        </div>
        <textarea
          className="adm-json-input"
          placeholder='{ "company": "…", "role": "…", … }'
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          spellCheck={false}
        />
        <div className="adm-json-actions">
          <button className="adm-btn adm-btn-primary adm-btn-sm" disabled={saving || !raw.trim()} onClick={() => submit()}>
            {saving ? "Saving…" : "Save application"}
          </button>
          {raw && (
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setRaw(""); setNotice(null); setDupe(null); }}>
              Clear
            </button>
          )}
        </div>

        {notice && <div className={`adm-json-note ${notice.type}`}>{notice.text}</div>}

        {dupe && (
          <div className="adm-dupe">
            <div>
              You already have <b>{dupe.existing.company} — {dupe.existing.role}</b>{" "}
              (<span className="adm-jstatus" data-s={dupe.existing.status}>{STATUS_LABEL[dupe.existing.status]}</span>).
            </div>
            <div className="adm-dupe-actions">
              <button className="adm-btn adm-btn-primary adm-btn-sm" disabled={saving} onClick={() => resolveDupe("update")}>
                Update that entry
              </button>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={saving} onClick={() => resolveDupe("new")}>
                Keep as separate
              </button>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={saving} onClick={() => resolveDupe("cancel")}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {showSchema && <SchemaCard schema={schema} />}

      {/* list */}
      <div className="adm-card adm-card-wide">
        <div className="adm-card-head">
          <div className="adm-card-title">Applications</div>
          <div className="adm-table-controls">
            <select className="adm-input adm-input-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All ({jobs.length})</option>
              <option value="open">Open only</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="adm-table-scroll">
          <table className="adm-table adm-jobs-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Prio</th>
                <th className="adm-num">Fit</th>
                <th>Location</th>
                <th>Applied</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((j) => (
                <tr key={j._id} className="adm-row-click" onClick={() => setOpenId(j._id)}>
                  <td className="adm-jcompany">{j.company}</td>
                  <td>{j.role}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="adm-jstatus-select"
                      data-s={j.status}
                      value={j.status}
                      onChange={(e) => setStatus(j, e.target.value)}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="adm-jprio" data-p={j.priority}>
                      {j.priority?.[0]?.toUpperCase()}
                    </span>
                  </td>
                  <td className="adm-num">{j.fitScore != null ? `${j.fitScore}` : "—"}</td>
                  <td>{j.location || "—"}</td>
                  <td>{jobDate(j.appliedDate)}</td>
                  <td className="adm-jnext">
                    {j.nextAction ? (
                      <>
                        {j.nextAction}
                        {j.nextActionDate && <span className="adm-jnext-date"> · {jobDate(j.nextActionDate)}</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="adm-empty">
                    {jobs.length === 0 ? "No applications yet — paste some JSON above." : "Nothing matches this filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openId && (
        <JobDrawer
          id={openId}
          onClose={() => setOpenId(null)}
          onChange={(job) => setJobs((prev) => prev.map((j) => (j._id === job._id ? job : j)))}
          onDelete={(id) => {
            setJobs((prev) => prev.filter((j) => j._id !== id));
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`adm-stat ${accent ? `adm-stat-${accent}` : ""}`}>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-stat-value">{value}</div>
    </div>
  );
}

function SchemaCard({ schema }) {
  return (
    <div className="adm-card adm-card-wide">
      <div className="adm-card-head">
        <div>
          <div className="adm-card-title">Schema &amp; LLM prompt</div>
          <div className="adm-card-sub">
            Paste this into your LLM chat (once) so its JSON output always matches this tracker.
          </div>
        </div>
        <CopyButton text={schema.prompt} label="Copy prompt" />
      </div>

      <pre className="adm-schema-pre">{schema.prompt}</pre>

      <div className="adm-schema-fields">
        {schema.fields.map((f) => (
          <div key={f.key} className="adm-schema-field">
            <code>{f.key}</code>
            <span className="adm-schema-type">
              {f.type}
              {f.values ? `: ${f.values.join(" | ")}` : ""}
              {f.required ? " · required" : ""}
            </span>
            <span className="adm-schema-desc">{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
