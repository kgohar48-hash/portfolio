import { useRef } from "react";
import { motion } from "framer-motion";

/* Scroll-reveal wrapper */
export function Reveal({ children, delay = 0, y = 22, as: Tag = "div", className, ...rest }) {
  const MotionTag = motion[Tag] || motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 0.8, 0.24, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/* Card that tracks the pointer for the spotlight glow (see .card::before) */
export function SpotlightCard({ children, className = "", ...rest }) {
  const ref = useRef(null);

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <div ref={ref} className={`card ${className}`} onMouseMove={onMove} {...rest}>
      {children}
    </div>
  );
}
