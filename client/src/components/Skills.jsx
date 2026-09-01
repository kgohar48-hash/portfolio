import Section from "./Section";
import { Reveal, SpotlightCard } from "./primitives";

export default function Skills({ skills }) {
  return (
    <Section
      id="skills"
      eyebrow="Tech stack"
      title="Tools — but more importantly, engineering habits"
      sub="A practical, production-first stack with systems thinking underneath it."
    >
      <div className="skills-grid">
        {skills.map((group, i) => (
          <Reveal key={group.title} delay={i * 0.06}>
            <SpotlightCard className="skill-card">
              <h3>{group.title}</h3>
              <div className="chip-row">
                {group.items.map((item) => (
                  <span key={item} className="chip">
                    {item}
                  </span>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
