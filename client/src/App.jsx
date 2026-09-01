import { useEffect, useState } from "react";
import { getPortfolio } from "./api";
import { fallbackPortfolio } from "./data/fallback";
import { initAnalytics } from "./lib/analytics";
import { getConsent, setConsent, hasDoNotTrackSignal } from "./lib/consent";
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
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export default function App() {
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
    // DB, so most visitors never notice the swap).
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setData((current) => current ?? fallbackPortfolio);
    }, 2500);

    getPortfolio()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData((current) => current ?? fallbackPortfolio);
      })
      .finally(() => clearTimeout(fallbackTimer));

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, []);

  if (!data) {
    return (
      <div className="loading-screen">
        <div>
          <div>loading portfolio…</div>
          <div className="bar" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-layer" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <Nav />
      <main>
        <Hero person={data.person} />
        <StatStrip metrics={data.metrics} />
        <About person={data.person} />
        <Skills skills={data.skills} />
        <Projects projects={data.projects} />
        <Philosophy philosophy={data.philosophy} />
        <Experience experience={data.experience} />
        <Education education={data.education} />
        <Contact contact={data.contact} />
      </main>
      <Footer person={data.person} />
      {showConsent && <ConsentBanner onAccept={acceptConsent} onDecline={declineConsent} />}
    </>
  );
}
