import { useEffect, useState } from "react";
import "../styles/cv.css";

const BASE = import.meta.env.VITE_API_BASE || "";

function slugFromPath() {
  const m = window.location.pathname.match(/^\/cv\/([A-Za-z0-9_-]{6,16})/);
  return m ? m[1] : null;
}

const CONTACT_ORDER = [
  { key: "email", href: (c) => `mailto:${c.email}` },
  { key: "portfolio", href: (_c, l) => l.portfolio },
  { key: "linkedin", href: (_c, l) => l.linkedin },
  { key: "github", href: (_c, l) => l.github }
];

function DateRange({ start, end }) {
  const t = [start, end].filter(Boolean).join(" – ");
  return t ? <span className="r">{t}</span> : null;
}

export default function CvPage() {
  const slug = slugFromPath();
  const [state, setState] = useState({ status: "loading", cv: null });

  useEffect(() => {
    document.body.classList.add("cv-body");
    // wake the API so a later click-through redirect isn't stuck on a cold start
    fetch(`${BASE}/api/health`).catch(() => {});
    if (!slug) {
      setState({ status: "notfound" });
      return;
    }
    fetch(`${BASE}/api/cv/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!d?.cv?.data) throw new Error("empty");
        setState({ status: "ok", cv: d.cv });
        const nm = d.cv.data.name;
        if (nm) document.title = `${nm} — CV`;
      })
      .catch(() => setState({ status: "notfound" }));
  }, [slug]);

  if (state.status === "loading") {
    return <div className="cv-state">Loading…</div>;
  }
  if (state.status !== "ok") {
    return <div className="cv-state">This CV link isn’t valid or has been removed.</div>;
  }

  const { data, contacts, links } = state.cv;

  // tolerate malformed sections rather than crash the whole page
  const arr = (v) => (Array.isArray(v) ? v : []);
  const skills = arr(data.skills)
    .filter((g) => g && typeof g === "object" && g.group && Array.isArray(g.items) && g.items.length)
    .map((g) => ({ group: g.group, items: g.items.filter(Boolean) }));
  const extras = arr(data.extras).filter((x) => x && typeof x === "object" && x.label && x.value);
  const experience = arr(data.experience).filter((x) => x && x.role);
  const projects = arr(data.projects).filter((p) => p && p.name);
  const education = arr(data.education).filter((e) => e && e.degree);

  return (
    <>
      <div className="cv-toolbar">
        <button className="cv-btn" onClick={() => window.print()}>
          Download PDF
        </button>
        <a className="cv-btn ghost" href={links.portfolio}>
          Visit portfolio
        </a>
      </div>

      <article className="cv-sheet">
        <h1 className="cv-name">{data.name}</h1>
        {data.title && <div className="cv-title">{data.title}</div>}

        {data.location && <div className="cv-loc">{data.location}</div>}
        <div className="cv-contacts">
          {CONTACT_ORDER.filter((c) => contacts[c.key]).map((c, i, arr) => (
            <span className="cv-contact" key={c.key}>
              <a href={c.href(contacts, links)}>{contacts[c.key]}</a>
              {i < arr.length - 1 && <span className="sep">·</span>}
            </span>
          ))}
        </div>

        {data.summary && (
          <section className="cv-section">
            <h2>Profile</h2>
            <p className="cv-summary">{data.summary}</p>
          </section>
        )}

        {skills.length > 0 && (
          <section className="cv-section">
            <h2>Skills</h2>
            <div className="cv-skills">
              {skills.map((g, i) => (
                <div className="cv-skill-row" key={g.group || i}>
                  <b>{g.group}:</b> {g.items.join(", ")}
                </div>
              ))}
            </div>
          </section>
        )}

        {experience.length > 0 && (
          <section className="cv-section">
            <h2>Experience</h2>
            {experience.map((x, i) => (
              <div className="cv-entry" key={i}>
                <div className="cv-row">
                  <span className="l">{x.role}</span>
                  <DateRange start={x.start} end={x.end} />
                </div>
                <div className="cv-subrow">
                  <span>{x.company}</span>
                  {x.location && <span>{x.location}</span>}
                </div>
                {x.bullets?.length > 0 && (
                  <ul>
                    {x.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {projects.length > 0 && (
          <section className="cv-section">
            <h2>Projects</h2>
            {projects.map((p, i) => (
              <div className="cv-entry" key={i}>
                <div className="cv-row">
                  <span className="l">
                    {p.key && links[p.key] ? (
                      <a className="cv-proj-name" href={links[p.key]}>
                        {p.name}
                      </a>
                    ) : (
                      p.name
                    )}
                    {p.tagline ? <span style={{ fontWeight: 400 }}> — {p.tagline}</span> : null}
                  </span>
                  {p.period && <span className="r">{p.period}</span>}
                </div>
                {p.bullets?.length > 0 && (
                  <ul>
                    {p.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {education.length > 0 && (
          <section className="cv-section">
            <h2>Education</h2>
            {education.map((e, i) => (
              <div className="cv-entry" key={i}>
                <div className="cv-row">
                  <span className="l">{e.degree}</span>
                  <DateRange start={e.start} end={e.end} />
                </div>
                <div className="cv-subrow">
                  <span>{e.school}</span>
                  {e.location && <span>{e.location}</span>}
                </div>
                {e.bullets?.length > 0 && (
                  <ul>
                    {e.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {extras.length > 0 && (
          <section className="cv-section">
            <h2>Additional</h2>
            <div className="cv-extras">
              {extras.map((x, i) => (
                <div key={x.label || i}>
                  <b>{x.label}:</b> {x.value}
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
