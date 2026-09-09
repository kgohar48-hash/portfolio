// Theme is applied pre-paint by an inline script in index.html; this module
// just reads and updates it after mount.
const KEY = "pf_theme";
const META = { light: "#fbfaf7", dark: "#141416" };

export function getTheme() {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" ? "dark" : "light";
}

export function setTheme(t) {
  const next = t === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", META[next]));
  return next;
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}
