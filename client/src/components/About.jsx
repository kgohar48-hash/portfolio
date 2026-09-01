import Section from "./Section";
import { Reveal } from "./primitives";

export default function About({ person }) {
  return (
    <Section id="about" eyebrow="About" title="Builder mindset, systems discipline" sub="Not a resume dump — a snapshot of how I think, build, and ship.">
      <div className="about-grid">
        <Reveal className="about-body" delay={0.1}>
          {person.summary.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </Reveal>
        <Reveal className="about-side" delay={0.18}>
          <div className="about-fact">
            <div className="k">Based in</div>
            <div className="v">{person.location}</div>
          </div>
          <div className="about-fact">
            <div className="k">Currently</div>
            <div className="v">M.Sc. Data Science & AI, Hochschule Furtwangen</div>
          </div>
          <div className="about-fact">
            <div className="k">Focus</div>
            <div className="v">Backend systems · data pipelines · LLM products</div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
