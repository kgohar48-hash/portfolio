import Section from "./Section";
import { Reveal, SpotlightCard } from "./primitives";

export default function Education({ education }) {
  return (
    <Section id="education" eyebrow="Education" title="A strong technical base with applied AI and systems work">
      <div className="timeline">
        {education.map((e, i) => (
          <Reveal key={e.degree} delay={i * 0.05}>
            <SpotlightCard className="tl-item">
              <div className="tl-top">
                <div>
                  <div className="tl-role">{e.degree}</div>
                  <div className="tl-org">{e.school}</div>
                </div>
                <span className="tl-period">{e.period}</span>
              </div>
              {e.note && <div className="tl-note">{e.note}</div>}
              {e.tags?.length > 0 && (
                <div className="chip-row" style={{ marginTop: 14 }}>
                  {e.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
