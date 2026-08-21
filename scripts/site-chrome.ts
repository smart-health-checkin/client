/**
 * One header and one deep footer for the whole site — landing, docs, API
 * reference, and the vendored spec and KTC pages — so navigation is the same
 * everywhere and every page ends with a way to everything else.
 */

import { FOOTER_COLUMNS, TOP_NAV, type Section } from "./site-nav.ts";

export type { Section };

export const CHROME_CSS = `
  .site-header { border-bottom: 1px solid var(--line); background: var(--surface); position: relative; z-index: 5; }
  .site-header-inner {
    max-width: 62rem; margin: 0 auto; padding: 0.6rem 1.25rem;
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

  .site-footer { border-top: 1px solid var(--line); background: var(--surface); margin-top: 4rem; }
  .site-footer-inner { max-width: 62rem; margin: 0 auto; padding: 2.5rem 1.25rem 2rem; }
  .site-footer-cols {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
    gap: 1.75rem 2rem;
  }
  .site-footer h4 {
    font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
    margin: 0 0 0.6rem; font-family: "IBM Plex Mono", ui-monospace, monospace; font-weight: 500;
  }
  .site-footer ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
  .site-footer li a { color: var(--ink); text-decoration: none; font-size: 0.88rem; }
  .site-footer li a:hover { color: var(--accent); text-decoration: underline; }
  .site-footer-base {
    margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--line);
    display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; align-items: baseline;
    font-size: 0.83rem; color: var(--muted);
  }
  .site-footer-base a { color: var(--accent); text-decoration: none; }
  .site-footer-base strong { color: var(--ink); font-weight: 600; }
`;

export function header(current: Section): string {
  const links = TOP_NAV.map(
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
      <a href="https://github.com/smart-health-checkin" target="_blank" rel="noreferrer">GitHub ↗</a>
    </nav>
  </div>
</div>`;
}

export function footer(): string {
  const columns = FOOTER_COLUMNS.map(
    (col) => `      <div>
        <h4>${col.title}</h4>
        <ul>
${col.links
  .map(
    (l) =>
      `          <li><a href="${l.href}"${l.external ? ' target="_blank" rel="noreferrer"' : ""}>${l.label}${l.external ? " ↗" : ""}</a></li>`,
  )
  .join("\n")}
        </ul>
      </div>`,
  ).join("\n");

  return `<div class="site-footer">
  <div class="site-footer-inner">
    <div class="site-footer-cols">
${columns}
    </div>
    <div class="site-footer-base">
      <span><strong>SMART Health Check-in</strong> — an open protocol and reference implementation for pre-visit check-in.</span>
      <span>Apache-2.0 · issues and contributions welcome</span>
    </div>
  </div>
</div>`;
}

/** Inject chrome into a vendored page that carries its own styling. */
export function wrapVendored(html: string, current: Section): string {
  const style = `<style>
  :root { --line: #dce5e2; --surface: #ffffff; --ink: #16211f; --muted: #5b6b67; --accent: #0e7c6b; }
  @media (prefers-color-scheme: dark) { :root {
    --line: #24322e; --surface: #16201d; --ink: #e6efec; --muted: #93a5a0; --accent: #3ac2aa; } }
  ${CHROME_CSS}
  .site-header, .site-footer { font-family: "IBM Plex Sans", system-ui, sans-serif; }
</style>`;
  let out = html.includes("<body")
    ? html.replace(/<body([^>]*)>/i, (m) => `${m}\n${style}${header(current)}`)
    : style + header(current) + html;
  out = out.includes("</body>")
    ? out.replace(/<\/body>/i, `${footer()}\n</body>`)
    : out + footer();
  return out;
}
