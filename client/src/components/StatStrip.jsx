import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

function CountUp({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(null);

  // Split "10,000+", "$10K", "87M+", "$287K+" into number + prefix/suffix.
  const match = value.match(/^([^\d]*)([\d,.]+)(.*)$/);
  const prefix = match?.[1] ?? "";
  const numStr = match?.[2] ?? "";
  const suffix = match?.[3] ?? "";
  const target = parseFloat((numStr || "0").replace(/,/g, ""));
  const hasComma = numStr.includes(",");

  useEffect(() => {
    if (!inView || Number.isNaN(target)) {
      setDisplay(value);
      return;
    }
    const duration = 1100;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = Math.round(target * eased);
      const formatted = hasComma ? current.toLocaleString("en-US") : String(current);
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return <span ref={ref}>{display ?? value.replace(/[\d,.]+/, "0")}</span>;
}

export default function StatStrip({ metrics }) {
  return (
    <div className="wrap">
      <div className="stat-strip">
        {metrics.map((m) => (
          <div className="stat" key={m.label}>
            <div className="stat-value">
              <CountUp value={m.value} />
            </div>
            <div className="stat-label">{m.label}</div>
            <div className="stat-note">{m.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
