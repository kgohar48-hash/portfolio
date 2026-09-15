import { motion } from "framer-motion";
import { useLanguage } from "../i18n/LanguageContext";

export default function ConsentBanner({ onAccept, onDecline }) {
  const { t } = useLanguage();
  return (
    <motion.div
      className="consent"
      role="dialog"
      aria-label={t.consent.ariaLabel}
      aria-live="polite"
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 0.8, 0.24, 1] }}
    >
      <div className="consent-inner">
        <p className="consent-text">
          {t.consent.text} <a href="/privacy">{t.consent.link}</a>
        </p>
        <div className="consent-actions">
          <button type="button" className="btn btn-ghost consent-btn" onClick={onDecline}>
            {t.consent.decline}
          </button>
          <button type="button" className="btn btn-primary consent-btn" onClick={onAccept}>
            {t.consent.accept}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
