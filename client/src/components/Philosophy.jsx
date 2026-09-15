import Section from "./Section";
import { Reveal, SpotlightCard } from "./primitives";
import { useLanguage } from "../i18n/LanguageContext";

export default function Philosophy({ philosophy }) {
  const { t } = useLanguage();
  return (
    <Section id="philosophy" eyebrow={t.philosophy.eyebrow} title={t.philosophy.title} sub={t.philosophy.sub}>
      <div className="phil-grid">
        {philosophy.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.05}>
            <SpotlightCard className="phil-card">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
