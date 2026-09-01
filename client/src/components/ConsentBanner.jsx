import { motion } from "framer-motion";

export default function ConsentBanner({ onAccept, onDecline }) {
  return (
    <motion.div
      className="consent"
      role="dialog"
      aria-label="Analytics consent"
      aria-live="polite"
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 0.8, 0.24, 1] }}
    >
      <div className="consent-inner">
        <p className="consent-text">
          This site uses privacy-friendly analytics to understand how visitors use it — approximate
          location (from your IP), device, and on-page activity. Nothing runs until you agree, and
          there are no ads or third-party trackers.{" "}
          <a href="/privacy">What's collected&nbsp;→</a>
        </p>
        <div className="consent-actions">
          <button type="button" className="btn btn-ghost consent-btn" onClick={onDecline}>
            Decline
          </button>
          <button type="button" className="btn btn-primary consent-btn" onClick={onAccept}>
            Accept
          </button>
        </div>
      </div>
    </motion.div>
  );
}
