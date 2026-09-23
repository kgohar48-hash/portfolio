import Section from "./Section";
import { Reveal, SpotlightCard } from "./primitives";
import { useLanguage } from "../i18n/LanguageContext";

export default function Projects({ projects }) {
  const { t } = useLanguage();
  return (
    <Section id="projects" eyebrow={t.projects.eyebrow} title={t.projects.title} sub={t.projects.sub}>
      <p className="projects-hint">{t.projects.hint}</p>
      <div className="projects-list">
        {projects.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.05}>
            <SpotlightCard className={`project accent-${p.accent} ${i === 0 ? "featured" : ""}`}>
              <div className="project-aside">
                <span className="project-status">{p.status}</span>
                <div className="project-bar" />
                <h3 className="project-name">{p.name}</h3>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="project-link"
                    data-track={`project:${p.name}`}
                  >
                    {t.projects.visitSite}
                  </a>
                )}
                {p.stack?.length > 0 && (
                  <div className="chip-row project-stack">
                    {p.stack.map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="project-blurb">{p.blurb}</p>
                {p.demoVideo && (
                  <video
                    className="project-demo-video"
                    src={p.demoVideo}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  />
                )}
                <ul className="project-details">
                  {p.details.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
                <div className="project-highlights">
                  {p.highlights.map((h) => (
                    <span key={h} className="hl">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
