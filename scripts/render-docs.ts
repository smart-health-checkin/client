/**
 * Renders the repo's markdown docs into the site at /docs/.
 *
 * The markdown in docs/ is the single source: it reads on GitHub and renders
 * here. Every page carries the shared header and the deep footer, so any page
 * is one click from everything else — no sidebar needed.
 */

import { marked } from "marked";
import { createHighlighter } from "shiki";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { API_GROUPS, anchorFor } from "./api-index.ts";
import { GUIDES } from "./site-nav.ts";
import { CHROME_CSS, footer, header } from "./site-chrome.ts";

const OUT = "_site/docs";

const DOCS_STYLE = `
  :root { --bg:#f7faf9; --surface:#fff; --ink:#16211f; --muted:#5b6b67; --accent:#0e7c6b; --line:#dce5e2; --code-bg:#eef4f2; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --bg:#0e1513; --surface:#16201d; --ink:#e6efec; --muted:#93a5a0; --accent:#3ac2aa; --line:#24322e; --code-bg:#131c19; } }
  :root[data-theme="dark"] { --bg:#0e1513; --surface:#16201d; --ink:#e6efec; --muted:#93a5a0; --accent:#3ac2aa; --line:#24322e; --code-bg:#131c19; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:"IBM Plex Sans",system-ui,sans-serif; line-height:1.65; }
  ${CHROME_CSS}
  .layout { max-width:48rem; margin:0 auto; padding:2.5rem 1.25rem 1rem; }
  article { min-width:0; padding-bottom:1rem; }
  .crumb { font-size:0.85rem; color:var(--muted); margin:0 0 1.25rem; }
  .crumb a { color:var(--muted); text-decoration:none; }
  .crumb a:hover { color:var(--accent); }
  h1 { font-size:1.85rem; letter-spacing:-0.01em; margin:0 0 1rem; text-wrap:balance; }
  h2 { font-size:1.15rem; margin:2rem 0 0.5rem; }
  h3 { font-size:1rem; margin:1.5rem 0 0.4rem; }
  h4 { font-size:0.92rem; margin:1.2rem 0 0.3rem; }
  p, li { margin:0.5rem 0; }
  code { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:0.88em; background:var(--code-bg); padding:0.1em 0.35em; border-radius:4px; }
  pre { background:var(--code-bg); border:1px solid var(--line); border-radius:8px; padding:0.9rem 1.1rem; overflow-x:auto; }
  pre code { background:none; padding:0; font-size:0.82rem; line-height:1.55; }
  /* Shiki emits both palettes as custom properties; pick one per scheme. */
  pre.shiki, pre.shiki span { color: var(--shiki-light); background-color: transparent; }
  pre.shiki { background: var(--code-bg) !important; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) pre.shiki,
    :root:not([data-theme="light"]) pre.shiki span { color: var(--shiki-dark); }
  }
  :root[data-theme="dark"] pre.shiki, :root[data-theme="dark"] pre.shiki span { color: var(--shiki-dark); }
  pre.shiki code { display:block; font-size:0.82rem; line-height:1.55; }
  table { width:100%; border-collapse:collapse; margin:0.8rem 0; font-size:0.92rem; display:block; overflow-x:auto; }
  th, td { text-align:left; padding:0.45rem 0.6rem; border-bottom:1px solid var(--line); vertical-align:top; }
  blockquote { margin:0.8rem 0; padding:0.3rem 1rem; border-left:3px solid var(--accent); color:var(--muted); }
  a { color:var(--accent); }
  hr { border:none; border-top:1px solid var(--line); margin:2rem 0; }
  .pager { display:flex; justify-content:space-between; gap:1rem; margin-top:2.5rem; padding-top:1rem; border-top:1px solid var(--line); font-size:0.9rem; }
  .pager span { color:var(--muted); }
  .lede { color:var(--muted); font-size:1.05rem; max-width:62ch; }
  .api-group { margin:1.75rem 0 0; }
  .api-group h2 { margin:0 0 0.2rem; }
  .api-group p.blurb { color:var(--muted); font-size:0.92rem; margin:0 0 0.6rem; }
  .api-list { display:grid; grid-template-columns:minmax(12rem,auto) 1fr; gap:0.3rem 1rem; font-size:0.92rem; }
  .api-list a { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:0.85rem; }
  .api-list span { color:var(--muted); }
`;

function crumb(title: string, isApi: boolean): string {
  return `<p class="crumb"><a href="/docs/">Docs</a>${isApi ? ' <span>/</span> <a href="/docs/api/">API reference</a>' : ""} <span>/</span> ${title}</p>`;
}

function pager(slug: string): string {
  const list = GUIDES.filter((g) => existsSync(g.file));
  const i = list.findIndex((g) => g.slug === slug);
  if (i < 0) return "";
  const prev = list[i - 1];
  const next = list[i + 1];
  return `<div class="pager">
    <span>${prev ? `← <a href="/docs/${prev.slug}.html">${prev.title}</a>` : ""}</span>
    <span>${next ? `<a href="/docs/${next.slug}.html">${next.title}</a> →` : ""}</span>
  </div>`;
}

const shell = (title: string, slug: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${DOCS_STYLE}</style>
</head>
<body>
${header("docs")}
<div class="layout">
  <article>${body}</article>
</div>
${footer()}
</body>
</html>
`;

function rewriteLinks(html: string): string {
  return html
    .replace(/href="(?:\.\.\/)?api\/index\.md"/g, 'href="/docs/api/"')
    .replace(/href="(?:\.\.\/)?api\/([a-z-]+)\.md"/g, 'href="/docs/api/$1.html"')
    .replace(/href="\.\.\/demo\/README\.md"/g, 'href="/docs/demo.html"')
    .replace(/href="\.\.\/([a-z-]+)\.md"/g, 'href="/docs/$1.html"')
    .replace(/href="([a-z-]+)\.md"/g, 'href="/docs/$1.html"');
}

// Build-time syntax highlighting: dual-theme CSS variables, so the page
// follows the reader's light/dark preference with no client-side JS.
const highlighter = await createHighlighter({
  themes: ["github-light", "github-dark"],
  langs: ["ts", "js", "tsx", "json", "html", "bash", "sh", "text"],
});

const LANG_ALIASES: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  shell: "bash",
  sh: "bash",
  console: "bash",
  jsonc: "json",
  "": "text",
};

marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }): string {
      const requested = (lang ?? "").split(/\s+/)[0]?.toLowerCase() ?? "";
      const resolved = LANG_ALIASES[requested] ?? requested;
      const supported = highlighter.getLoadedLanguages().includes(resolved) ? resolved : "text";
      return highlighter.codeToHtml(text, {
        lang: supported,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
      });
    },
  },
});

const render = (md: string): string => rewriteLinks(marked.parse(md) as string);

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "api"), { recursive: true });

// --- narrative guides -------------------------------------------------
for (const guide of GUIDES) {
  if (!existsSync(guide.file)) continue;
  const html = crumb(guide.title, false) + render(readFileSync(guide.file, "utf8")) + pager(guide.slug);
  writeFileSync(
    join(OUT, `${guide.slug}.html`),
    shell(`${guide.title} — SMART Health Check-in`, guide.slug, html),
  );
}

// --- generated API reference pages ------------------------------------
const runtimeExports = new Set<string>();
for (const mod of ["../src/index.ts", "../src/fhir/index.ts"]) {
  const imported = await import(new URL(mod, import.meta.url).href);
  for (const name of Object.keys(imported)) runtimeExports.add(name);
}

for (const file of readdirSync("docs/api")) {
  if (!file.endsWith(".md") || file === "index.md") continue;
  const md = readFileSync(join("docs/api", file), "utf8");
  const html = render(md)
    .replace(/href="([a-z-]+)\.md"/g, 'href="/docs/api/$1.html"')
    .replace(/href="\/docs\/api\/index\.html"/g, 'href="/docs/api/"');
  const name = basename(file, ".md");
  writeFileSync(
    join(OUT, "api", `${name}.html`),
    shell(`${name} — API reference`, `api-${name}`, crumb(`${name} module`, true) + html),
  );
}

// --- curated API index (replaces TypeDoc's empty module table) --------
const listed = new Set(API_GROUPS.flatMap((g) => g.entries.map((e) => e.name)));
const missing = [...runtimeExports].filter((name) => !listed.has(name));
if (missing.length) {
  throw new Error(
    `API index is missing ${missing.length} export(s): ${missing.join(", ")}\n` +
      "Add them to scripts/api-index.ts so the reference stays honest.",
  );
}

const groupsHtml = API_GROUPS.map((group) => {
  const rows = group.entries
    .map(
      (entry) =>
        `      <a href="/docs/api/${group.module}.html#${anchorFor(entry.name)}"><code>${entry.name}</code></a><span>${entry.what}</span>`,
    )
    .join("\n");
  return `  <section class="api-group">
    <h2>${group.title}</h2>
    <p class="blurb">${group.blurb}</p>
    <div class="api-list">
${rows}
    </div>
  </section>`;
}).join("\n");

writeFileSync(
  join(OUT, "api", "index.html"),
  shell(
    "API reference — SMART Health Check-in",
    "api-index",
    `<p class="crumb"><a href="/docs/">Docs</a> <span>/</span> API reference</p>
<h1>API reference</h1>
<p class="lede">
  Every export, grouped by what you'd be doing. Signatures and types are
  generated from the source, so they can't drift; this page is checked at
  build time to make sure nothing is missing from it.
</p>
<p>
  Most integrations use two: <a href="/docs/api/checkin.html#requestcheckin"><code>requestCheckin</code></a>
  and — only if you want the FHIR mapping —
  <a href="/docs/api/fhir.html#buildcheckinbundle"><code>buildCheckinBundle</code></a>.
  For explanation rather than signatures, start with
  <a href="/docs/getting-started.html">Getting started</a>.
</p>
${groupsHtml}
<div class="pager">
  <span>Full generated pages: <a href="/docs/api/checkin.html">checkin</a> · <a href="/docs/api/fhir.html">fhir</a></span>
</div>`,
  ),
);

// --- docs landing -----------------------------------------------------
const cards = GUIDES.filter((g) => existsSync(g.file))
  .map(
    (g) => `      <a class="card" href="/docs/${g.slug}.html">
        <strong>${g.title}</strong><span>${g.blurb}</span>
      </a>`,
  )
  .join("\n");

const landingBody = readFileSync("site/docs/body.html", "utf8").replace("<!--GUIDE-CARDS-->", cards);
writeFileSync(
  join(OUT, "index.html"),
  shell("Docs — SMART Health Check-in", "index", landingBody),
);

console.log(
  `docs rendered: ${GUIDES.length} guides, API index (${runtimeExports.size} exports checked) -> ${OUT}`,
);
