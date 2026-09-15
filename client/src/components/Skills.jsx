import Section from "./Section";
import { Reveal, SpotlightCard } from "./primitives";
import { useLanguage } from "../i18n/LanguageContext";

export default function Skills({ skills }) {
  const { t } = useLanguage();
  return (
    <Section id="skills" eyebrow={t.skills.eyebrow} title={t.skills.title} sub={t.skills.sub}>
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
