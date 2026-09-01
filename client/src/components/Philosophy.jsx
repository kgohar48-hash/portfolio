import Section from "./Section";
import { Reveal, SpotlightCard } from "./primitives";

export default function Philosophy({ philosophy }) {
  return (
    <Section id="philosophy" eyebrow="Engineering philosophy" title="How I build systems" sub="A systems builder's checklist — pragmatic, disciplined, and product-driven.">
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
