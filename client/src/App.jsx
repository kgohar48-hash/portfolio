import { useEffect, useState } from "react";
import { getPortfolio } from "./api";
import { fallbackPortfolio } from "./data/fallback";
import { fallbackPortfolioDe } from "./data/fallback.de";
import { initAnalytics } from "./lib/analytics";
import { getConsent, setConsent, hasDoNotTrackSignal } from "./lib/consent";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import ConsentBanner from "./components/ConsentBanner";

import Nav from "./components/Nav";
import Hero from "./components/Hero";
import StatStrip from "./components/StatStrip";
import About from "./components/About";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Philosophy from "./components/Philosophy";
import Experience from "./components/Experience";
import Education from "./components/Education";
import Bookshelf from "./components/Bookshelf";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

const FALLBACKS = { en: fallbackPortfolio, de: fallbackPortfolioDe };

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { lang, t } = useLanguage();
  const [data, setData] = useState(null);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const stored = getConsent();
    if (stored === "granted") {
      initAnalytics();
    } else if (stored === null) {
      if (hasDoNotTrackSignal()) setConsent("denied");
      else setShowConsent(true);
    }
  }, []);

  function acceptConsent() {
    setConsent("granted");
    setShowConsent(false);
    initAnalytics();
  }
  function declineConsent() {
    setConsent("denied");
    setShowConsent(false);
  }

  useEffect(() => {
    let cancelled = false;

    // The API is hosted on Render's free tier, which spins down when idle and
    // can take 30-50s to wake up on the next request. Rather than block the
    // whole site behind that, show the bundled fallback content almost
    // immediately and let the live fetch swap it in silently if/when it
    // resolves (content is identical unless it was recently edited via the
    // DB, so most visitors never notice the swap). On a language switch,
    // `data` already holds the previous language's content, so the page
    // keeps showing that instead of flashing back to the loading screen.
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setData((current) => current ?? FALLBACKS[lang]);
    }, 2500);

    getPortfolio(lang)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(FALLBACKS[lang]);
      })
      .finally(() => clearTimeout(fallbackTimer));

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [lang]);

  if (!data) {
    return (
      <div className="loading-screen">
        <div>
          <div>{t.loading}</div>
          <div className="bar" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Nav />
      <main>
        <Hero person={data.person} contact={data.contact} />
        <StatStrip metrics={data.metrics} />
        <About person={data.person} />
        <Skills skills={data.skills} />
        <Projects projects={data.projects} />
        <Philosophy philosophy={data.philosophy} />
        <Experience experience={data.experience} />
        <Education education={data.education} />
        <Bookshelf bookshelf={data.bookshelf} />
        <Contact contact={data.contact} />
      </main>
      <Footer person={data.person} />
      {showConsent && <ConsentBanner onAccept={acceptConsent} onDecline={declineConsent} />}
    </>
  );
}
