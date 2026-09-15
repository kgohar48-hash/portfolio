import { useLanguage } from "../i18n/LanguageContext";

export default function Footer({ person }) {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>
          © {new Date().getFullYear()} {person?.name || "Gohar Khan Awan"}. {t.footer.builtWith}
        </span>
        <span>
          <a href="/privacy">{t.footer.privacy}</a> · {t.footer.designedBy}{" "}
          {person?.name?.split(" ")[0] || "Gohar"} · <a href="#hero">{t.footer.backToTop}</a>
        </span>
      </div>
    </footer>
  );
}
