/**
 * What the demo pages take from the shared site at runtime.
 *
 * - `SmartJson`: /assets/smart-json.js, loaded by a module script tag ahead
 *   of the page's bundle, highlights JSON in the site's colors
 *   (MAINTAINING.md, "JSON at runtime").
 * - The page's color mode, for `<smart-checkin-picker>`. The picker ships to
 *   other sites, so it doesn't read the site's stylesheet; a demo page hands
 *   it the page's mode instead, and a dark page gets a dark picker.
 */

declare global {
  var SmartJson: {
    renderJson(el: Element, value: unknown, options?: { indent?: number; replacer?: (key: string, value: unknown) => unknown }): Element;
  };
}

export type PickerTheme = "light" | "dark" | "auto";

/** The page's `data-theme` as a picker theme: a page that hasn't opted in is light. */
export function pageTheme(): PickerTheme {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" || theme === "auto" ? theme : "light";
}

/** Whether the page is drawn dark right now. */
export function pageIsDark(): boolean {
  const theme = pageTheme();
  return theme === "dark" || (theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
}

/** Calls `onChange` now and whenever the page's mode changes; returns a function that stops it. */
export function watchPageTheme(onChange: (theme: PickerTheme) => void): () => void {
  const run = () => onChange(pageTheme());
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener("change", run);
  run();
  return () => {
    observer.disconnect();
    scheme.removeEventListener("change", run);
  };
}

/** Keeps a `<smart-checkin-picker>`'s theme on the page's. */
export function followPageTheme(picker: Element): void {
  watchPageTheme((theme) => picker.setAttribute("theme", theme));
}
