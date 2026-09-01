import { Reveal } from "./primitives";

export default function Section({ id, eyebrow, title, sub, children }) {
  return (
    <section id={id} className="section">
      <div className="wrap">
        <div className="section-head">
          <Reveal as="div">
            <span className="eyebrow">{eyebrow}</span>
          </Reveal>
          <Reveal as="h2" className="section-title" delay={0.05}>
            {title}
          </Reveal>
          {sub && (
            <Reveal as="p" className="section-sub" delay={0.1}>
              {sub}
            </Reveal>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
