import { motion } from "framer-motion";
import portrait from "../assets/gohar.jpeg";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } }
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.8, 0.24, 1] } }
};

export default function Hero({ person }) {
  return (
    <section id="hero" className="hero">
      <div className="wrap hero-grid">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="status-pill">
            <span className="status-dot" />
            {person.available}
          </motion.div>

          <motion.h1 variants={item}>
            {person.name.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="gradient-text">{person.name.split(" ").slice(-1)}</span>
          </motion.h1>

          <motion.div variants={item} className="hero-role">
            {person.role}
          </motion.div>
          <motion.p variants={item} className="hero-tagline">
            {person.tagline}
          </motion.p>

          <motion.div variants={item} className="hero-cta">
            <a href="#projects" className="btn btn-primary">
              View projects →
            </a>
            <a href="#contact" className="btn btn-ghost">
              Get in touch
            </a>
          </motion.div>

          <motion.div variants={item} className="chip-row hero-tags">
            {["Performance-focused", "Scalable backends", "Data pipelines", "LLM + RAG systems"].map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="portrait-wrap"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 0.8, 0.24, 1] }}
        >
          <div className="portrait-glow" />
          <div className="portrait">
            <img src={portrait} alt={person.name} width="340" height="340" loading="eager" />
          </div>
          <div className="portrait-card">
            <b>{person.location}</b>
            <span>Available for relocation & remote</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
