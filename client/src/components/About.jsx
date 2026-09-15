import Section from "./Section";
import { Reveal } from "./primitives";
import { useLanguage } from "../i18n/LanguageContext";

export default function About({ person }) {
  const { t } = useLanguage();
  return (
    <Section id="about" eyebrow={t.about.eyebrow} title={t.about.title} sub={t.about.sub}>
      <div className="about-grid">
        <Reveal className="about-body" delay={0.1}>
          {person.summary.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </Reveal>
        <Reveal className="about-side" delay={0.18}>
          <div className="about-fact">
            <div className="k">{t.about.basedIn}</div>
            <div className="v">{person.location}</div>
          </div>
          <div className="about-fact">
            <div className="k">{t.about.currently}</div>
            <div className="v">{t.about.currentlyValue}</div>
          </div>
          <div className="about-fact">
            <div className="k">{t.about.focus}</div>
            <div className="v">{t.about.focusValue}</div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
