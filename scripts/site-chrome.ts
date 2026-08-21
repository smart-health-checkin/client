/**
 * One navigation structure for the whole site.
 *
 * Every page — landing, docs, guides, API reference, and the vendored spec
 * and KTC pages — gets the same header and footer, so the site reads as one
 * thing instead of a pile of separately-styled pages.
 */

export type Section = "overview" | "docs" | "demo" | "spec" | "ktc";

const NAV: Array<{ href: string; label: string; section: Section }> = [
  { href: "/", label: "Overview", section: "overview" },
  { href: "/docs/", label: "Docs", section: "docs" },
  { href: "/demo/", label: "Demo", section: "demo" },
  { href: "/spec/", label: "Spec", section: "spec" },
];

export const CHROME_CSS = `
  .site-header { border-bottom: 1px solid var(--line); background: var(--surface); position: relative; z-index: 5; }
  .site-header-inner {
    max-width: 60rem; margin: 0 auto; padding: 0.6rem 1.25rem;
    display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;
  }
  .site-brand {
    font-weight: 600; font-size: 0.95rem; color: var(--ink); text-decoration: none;
    display: inline-flex; align-items: center; gap: 0.5rem; margin-right: auto;
  }
  .site-brand svg { color: var(--accent); flex: none; }
  .site-nav { display: flex; gap: 1.1rem; flex-wrap: wrap; }
  .site-nav a { color: var(--muted); text-decoration: none; font-size: 0.9rem; padding: 0.15rem 0; }
  .site-nav a:hover { color: var(--accent); }
  .site-nav a[aria-current="page"] { color: var(--ink); font-weight: 500; box-shadow: inset 0 -2px 0 var(--accent); }
  .site-nav a.gh { color: var(--muted); }
  .site-footer { border-top: 1px solid var(--line); background: var(--surface); margin-top: 3rem; }
  .site-footer-inner {
    max-width: 60rem; margin: 0 auto; padding: 1.5rem 1.25rem 2.25rem;
    display: flex; flex-wrap: wrap; gap: 0.75rem 2.5rem; align-items: baseline;
    font-size: 0.85rem; color: var(--muted);
  }
  .site-footer-inner a { color: var(--accent); text-decoration: none; }
  .site-footer-inner a:hover { text-decoration: underline; }
  .site-footer-inner .repos { display: flex; gap: 1.1rem; flex-wrap: wrap; margin-left: auto; }
`;

export function header(current: Section): string {
  const links = NAV.map(
    (item) =>
      `<a href="${item.href}"${item.section === current ? ' aria-current="page"' : ""}>${item.label}</a>`,
  ).join("\n        ");
  return `<div class="site-header">
  <div class="site-header-inner">
    <a class="site-brand" href="/">
      <svg width="20" height="20" viewBox="0 0 34 34" aria-hidden="true">
        <rect x="1" y="1" width="32" height="32" rx="8" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M17 8 C 12 13, 9 17, 17 26 C 25 17, 22 13, 17 8 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
      SMART Health Check-in
    </a>
    <nav class="site-nav">
        ${links}
      <a class="gh" href="https://github.com/smart-health-checkin" target="_blank" rel="noreferrer">GitHub ↗</a>
    </nav>
  </div>
</div>`;
}

export function footer(): string {
  return `<div class="site-footer">
  <div class="site-footer-inner">
    <span>Apache-2.0 · an open protocol and reference implementation for pre-visit check-in</span>
    <span class="repos">
      <a href="https://github.com/smart-health-checkin/checkin-client" target="_blank" rel="noreferrer">checkin-client</a>
      <a href="https://github.com/smart-health-checkin/spec" target="_blank" rel="noreferrer">spec</a>
      <a href="/ktc/closing-the-loop/">Closing the Loop</a>
    </span>
  </div>
</div>`;
}

/** Inject chrome into a vendored page that has its own styling. */
export function wrapVendored(html: string, current: Section): string {
  const style = `<style>
  :root { --line: #dce5e2; --surface: #ffffff; --ink: #16211f; --muted: #5b6b67; --accent: #0e7c6b; }
  @media (prefers-color-scheme: dark) { :root {
    --line: #24322e; --surface: #16201d; --ink: #e6efec; --muted: #93a5a0; --accent: #3ac2aa; } }
  ${CHROME_CSS}
  .site-header { font-family: "IBM Plex Sans", system-ui, sans-serif; }
</style>`;
  const bar = style + header(current);
  return html.includes("<body")
    ? html.replace(/<body([^>]*)>/i, (m) => `${m}\n${bar}`)
    : bar + html;
}
