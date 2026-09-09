import { motion } from "framer-motion";
import portrait from "../assets/gohar.jpeg";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } } };
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 0.8, 0.24, 1] } }
};

const ICONS = {
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5A11.5 11.5 0 0 0 8.4 22.9c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.9 4.7 18.9 5 18.9 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.4 20.4h-3.6v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.2V9h3.4v1.6h.1c.5-.9 1.7-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.2ZM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2ZM7.1 20.4H3.5V9h3.6v11.4ZM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0Z" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="m3 6 9 6 9-6" />
    </svg>
  )
};

function iconFor(label) {
  const k = label.toLowerCase();
  if (k.includes("git")) return ICONS.github;
  if (k.includes("link")) return ICONS.linkedin;
  return ICONS.mail;
}

export default function Hero({ person, contact }) {
  const links = contact?.links || [];
  const [first, last] = person.name.split(" ").length > 1
    ? [person.name.split(" ").slice(0, -1).join(" "), person.name.split(" ").slice(-1)[0]]
    : [person.name, ""];

  return (
    <section id="hero" className="hero">
      <div className="wrap">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="portrait-wrap">
            <img className="portrait" src={portrait} alt={person.name} width="116" height="116" loading="eager" />
          </motion.div>

          <motion.h1 variants={item} className="hero-name">
            {first} {last && <span className="gradient-text">{last}</span>}
          </motion.h1>

          <motion.p variants={item} className="hero-role">
            {person.role}
          </motion.p>

          <motion.p variants={item} className="hero-tagline">
            {person.tagline}
          </motion.p>

          {person.available && (
            <motion.div variants={item} className="hero-avail">
              <span className="dot" />
              {person.available}
            </motion.div>
          )}

          <motion.div variants={item} className="hero-actions">
            <a href="#projects" className="btn btn-primary" data-track="hero:view-projects">
              See projects →
            </a>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="icon-btn"
                aria-label={l.label}
                data-track={`hero:${l.label.toLowerCase()}`}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
              >
                {iconFor(l.label)}
              </a>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
