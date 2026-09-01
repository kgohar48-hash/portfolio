import Section from "./Section";
import { Reveal, SpotlightCard } from "./primitives";

export default function Experience({ experience }) {
  return (
    <Section id="experience" eyebrow="Experience" title="Leadership, scale, and outcome-driven execution">
      <div className="timeline">
        {experience.map((e, i) => (
          <Reveal key={e.company} delay={i * 0.05}>
            <SpotlightCard className="tl-item">
              <div className="tl-top">
                <div>
                  <div className="tl-role">{e.role}</div>
                  <div className="tl-org">{e.company}</div>
                </div>
                <span className="tl-period">{e.period}</span>
              </div>
              <span className="chip" style={{ marginTop: 12, display: "inline-flex" }}>
                {e.tag}
              </span>
              <ul className="tl-bullets">
                {e.bullets.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
