export type Theme = "dark" | "traditional";

const THEME_KEY = "jqa:theme";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "traditional" ? "traditional" : "dark";
}

export const THEME_CHANGE_EVENT = "jqa-theme-change";

export function setTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
