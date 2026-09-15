import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { uiStrings } from "./uiStrings";

const KEY = "pf_lang";
const SUPPORTED = ["en", "de"];
const GERMAN_SPEAKING_COUNTRIES = new Set(["DE", "AT", "CH", "LI"]);
const BASE = import.meta.env.VITE_API_BASE || "";

function readSaved() {
  try {
    const v = localStorage.getItem(KEY);
    return SUPPORTED.includes(v) ? v : null;
  } catch {
    return null;
  }
}

function detectFromBrowser() {
  try {
    const langs = (navigator.languages?.length ? navigator.languages : [navigator.language]).filter(Boolean);
    for (const l of langs) {
      const base = l.toLowerCase().slice(0, 2);
      if (SUPPORTED.includes(base)) return base;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function detectFromIp() {
  try {
    const res = await fetch(`${BASE}/api/locale`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.countryCode && GERMAN_SPEAKING_COUNTRIES.has(data.countryCode) ? "de" : null;
  } catch {
    return null;
  }
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const saved = readSaved();
  const [lang, setLangState] = useState(saved || detectFromBrowser() || "en");
  const [userPicked, setUserPicked] = useState(Boolean(saved));

  useEffect(() => {
    if (userPicked) return; // an explicit choice always wins — never override it
    let cancelled = false;
    detectFromIp().then((ipLang) => {
      if (!cancelled && ipLang && ipLang !== lang) setLangState(ipLang);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setUserPicked(true);
    setLangState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: uiStrings[lang] || uiStrings.en }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
