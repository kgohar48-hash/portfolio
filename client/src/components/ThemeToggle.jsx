import { useEffect, useState } from "react";
import { getTheme, setTheme } from "../lib/theme";

const Sun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
  </svg>
);
const Moon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

export default function ThemeToggle() {
  const [theme, setT] = useState("light");

  useEffect(() => {
    setT(getTheme());
  }, []);

  function pick(next) {
    setT(setTheme(next));
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      <button type="button" aria-label="Light" aria-pressed={theme === "light"} onClick={() => pick("light")}>
        <Sun />
      </button>
      <button type="button" aria-label="Dark" aria-pressed={theme === "dark"} onClick={() => pick("dark")}>
        <Moon />
      </button>
    </div>
  );
}
