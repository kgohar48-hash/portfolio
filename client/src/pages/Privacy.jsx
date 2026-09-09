import { useEffect, useState } from "react";
import { getConsent, setConsent } from "../lib/consent";
import "../styles/index.css";

const UPDATED = "2 September 2026";

export default function Privacy() {
  const [choice, setChoice] = useState(getConsent());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.title = "Privacy Policy — Gohar Khan Awan";
  }, []);

  function choose(next) {
    setConsent(next);
    setChoice(next);
    setSaved(true);
  }

  return (
    <>
      <div className="bg-layer" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

      <div className="legal">
        <a href="/" className="legal-back">
          ← Back to portfolio
        </a>

        <h1>Privacy Policy</h1>
        <p className="legal-meta">Last updated {UPDATED}</p>

        <p>
          This is the personal portfolio of <strong>Gohar Khan Awan</strong>. This page explains what
          data the site collects and why. Questions or requests:{" "}
          <a href="mailto:gohar@goharawan.com">gohar@goharawan.com</a>.
        </p>

        <div className="legal-consent">
          <h2 style={{ marginTop: 0 }}>Your analytics choice</h2>
          <p>
            Analytics are <strong>off by default</strong> and only run if you opt in. You can change
            your mind at any time here.
          </p>
          <p className="legal-consent-state">
            Current choice:{" "}
            <strong>
              {choice === "granted" ? "Analytics allowed" : choice === "denied" ? "Analytics declined" : "Not set — analytics off"}
            </strong>
          </p>
          <div className="legal-consent-actions">
            <button
              className={`btn ${choice === "denied" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => choose("denied")}
            >
              Decline analytics
            </button>
            <button
              className={`btn ${choice === "granted" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => choose("granted")}
            >
              Allow analytics
            </button>
          </div>
          {saved && (
            <p className="legal-consent-saved">
              Saved. This takes effect the next time you load a page on this site.
            </p>
          )}
        </div>

        <h2>1. Contact form</h2>
        <p>
          If you use the contact form, the name, email address, and message you enter are stored so I
          can reply. Legal basis: taking steps at your request and my legitimate interest in
          responding (GDPR Art. 6(1)(b) and (f)). Messages are kept until they're no longer needed for
          correspondence, then deleted. They are not used for marketing.
        </p>

        <h2>2. Analytics (only with your consent)</h2>
        <p>
          If you opt in, the site records the following for each visit, to understand how the
          portfolio is used and improve it. Legal basis: your consent (GDPR Art. 6(1)(a)), which you
          can withdraw above at any time.
        </p>
        <ul>
          <li>
            <strong>A random visitor ID</strong> stored in your browser's local storage, so repeat
            visits can be recognised. It contains no personal information and is deleted if you
            decline.
          </li>
          <li>
            <strong>Approximate location</strong> — your IP address is used server-side to look up an
            approximate city and country, then <em>not stored in full</em> beyond the current visit
            record. The lookup is performed by <a href="https://ipwho.is">ipwho.is</a> (with{" "}
            <a href="https://ipapi.co">ipapi.co</a> as a fallback), who receive the IP address for
            that purpose only.
          </li>
          <li>
            <strong>Device &amp; browser</strong> — browser, operating system, device type, screen
            size, language, timezone, and connection type.
          </li>
          <li>
            <strong>How you arrived</strong> — the referring website and any campaign tags in the
            link.
          </li>
          <li>
            <strong>On-page activity</strong> — pages/sections viewed, time on page, scroll depth,
            clicks, and whether you started or sent the contact form.
          </li>
        </ul>
        <p>
          There are <strong>no advertising cookies, no third-party trackers, and no cross-site
          tracking</strong>. Data is never sold or shared for advertising.
        </p>
        <p>
          <strong>Retention:</strong> detailed event records are automatically deleted after 12
          months. Aggregated, non-identifying statistics may be kept longer.
        </p>
        <p>
          <strong>Respecting browser signals:</strong> if your browser sends a “Do Not Track” or
          Global Privacy Control signal, analytics stay off and you won't see the consent prompt.
        </p>

        <h2>3. Hosting &amp; processors</h2>
        <ul>
          <li>
            <strong>Render</strong> — hosts the website and API.
          </li>
          <li>
            <strong>MongoDB Atlas</strong> — stores contact messages and (if you consent) analytics
            records.
          </li>
          <li>
            <strong>ipwho.is / ipapi.co</strong> — IP-to-location lookup, as described above.
          </li>
        </ul>

        <h2>4. Your rights</h2>
        <p>
          Under the GDPR you can request access to, correction of, or deletion of your data, object
          to processing, and withdraw consent. To exercise any of these, email{" "}
          <a href="mailto:gohar@goharawan.com">gohar@goharawan.com</a>. You also have the right to
          complain to a data protection authority.
        </p>

        <a href="/" className="legal-back">
          ← Back to portfolio
        </a>
      </div>
    </>
  );
}
