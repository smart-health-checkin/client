/**
 * Renders the repo's markdown docs into the site at /docs/.
 *
 * The markdown in docs/ is the single source: it reads on GitHub and renders
 * here. Every page carries the shared site chrome plus a rail of the guides in
 * reading order, so you always know where you are in the sequence.
 */

import { marked } from "marked";
import { createHighlighter } from "shiki";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { API_GROUPS, anchorFor } from "./api-index.ts";
import { GUIDES } from "./site-nav.ts";
import { CHROME_ASSETS, footer, header } from "./site-chrome.ts";
import { BASE, OUT_ROOT } from "./site-base.ts";

const OUT = `${OUT_ROOT}/docs`;

const DOCS_STYLE = `
  * { box-sizing: border-box; }
  body {
    margin:0; background:var(--bg); color:var(--fg-1);
    font-family:var(--font-sans); font-size:var(--fs-base); line-height:var(--lh-normal);
    -webkit-font-smoothing:antialiased;
  }
  .layout {
    max-width:var(--container-wide); margin:0 auto; padding:var(--space-7) 24px var(--space-5);
    display:grid; grid-template-columns:14rem minmax(0,1fr); gap:var(--space-8); align-items:start;
  }
  article { min-width:0; max-width:46rem; }
  .rail { position:sticky; top:calc(var(--space-7) + 44px); font-size:var(--fs-sm); }
  .rail h4 {
    margin:0 0 var(--space-3); font-size:var(--fs-xs); font-weight:700;
    letter-spacing:var(--tracking-caps); text-transform:uppercase; color:var(--fg-3);
  }
  .rail ul + h4 { margin-top:var(--space-6); }
  .rail ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
  .rail li { margin:0; }
  .rail h4 a { color:inherit; text-decoration:none; }
  .rail h4 a:hover { color:var(--brand); }
  .rail h4 a[aria-current="page"] { color:var(--brand); }
  .rail a {
    display:block; padding:5px 10px; margin-left:-10px; border-radius:var(--radius-sm);
    color:var(--fg-2); text-decoration:none; line-height:1.35;
  }
  .rail a:hover { color:var(--brand); background:var(--gray-50); }
  .rail a[aria-current="page"] { color:var(--brand); font-weight:600; background:var(--brand-wash); }
  @media (max-width: 68rem) {
    .layout { grid-template-columns:minmax(0,1fr); gap:var(--space-6); max-width:52rem; }
    .rail { position:static; padding-bottom:var(--space-5); border-bottom:1px solid var(--border); }
    .rail ul { flex-direction:row; flex-wrap:wrap; gap:var(--space-1); }
    .rail a { margin-left:0; }
  }
  .crumb { font-size:var(--fs-sm); color:var(--fg-3); margin:0 0 var(--space-5); }
  .crumb a { color:var(--fg-3); text-decoration:none; }
  .crumb a:hover { color:var(--brand); }
  h1 { margin:0 0 var(--space-4); font-size:var(--fs-3xl); letter-spacing:var(--tracking-tight); line-height:var(--lh-tight); text-wrap:balance; }
  h2 { margin:var(--space-7) 0 var(--space-3); font-size:var(--fs-xl); letter-spacing:var(--tracking-tight); }
  h3 { margin:var(--space-6) 0 var(--space-2); font-size:var(--fs-md); }
  h4 { margin:var(--space-5) 0 var(--space-2); font-size:var(--fs-base); }
  p, li { margin:var(--space-3) 0; color:var(--fg-2); }
  li > p { margin:var(--space-2) 0; }
  strong { color:var(--fg-1); }
  code { font-family:var(--font-mono); font-size:0.88em; background:var(--gray-100); padding:1px 5px; border-radius:var(--radius-sm); color:var(--fg-1); }
  pre { background:var(--gray-50); border:1px solid var(--border); border-radius:var(--radius-md); padding:var(--space-4) var(--space-5); overflow-x:auto; }
  pre code { background:none; padding:0; font-size:var(--fs-sm); line-height:1.6; }
  table { width:100%; border-collapse:collapse; margin:var(--space-4) 0; font-size:var(--fs-sm); display:block; overflow-x:auto; }
  th, td { text-align:left; padding:var(--space-2) var(--space-3); border-bottom:1px solid var(--border); vertical-align:top; }
  th { font-weight:600; color:var(--fg-1); }
  blockquote { margin:var(--space-4) 0; padding:var(--space-2) var(--space-4); border-left:3px solid var(--brand-bright); background:var(--brand-wash); border-radius:0 var(--radius-sm) var(--radius-sm) 0; color:var(--fg-2); }
  blockquote p { margin:var(--space-2) 0; }
  a { color:var(--brand); }
  hr { border:none; border-top:1px solid var(--border); margin:var(--space-7) 0; }
  .pager { display:flex; justify-content:space-between; gap:var(--space-4); margin-top:var(--space-7); padding-top:var(--space-4); border-top:1px solid var(--border); font-size:var(--fs-sm); }
  .pager span { color:var(--fg-3); }
  .lede { font-family:var(--font-serif); color:var(--fg-2); font-size:var(--fs-md); max-width:62ch; line-height:1.55; }
  .api-group { margin:var(--space-7) 0 0; }
  .api-group h2 { margin:0 0 var(--space-1); }
  .api-group p.blurb { color:var(--fg-3); font-size:var(--fs-sm); margin:0 0 var(--space-3); }
  .api-list { display:grid; grid-template-columns:minmax(13rem,auto) 1fr; gap:var(--space-2) var(--space-5); font-size:var(--fs-sm); align-items:baseline; }
  .api-list a { font-family:var(--font-mono); font-size:var(--fs-sm); }
  .api-list span { color:var(--fg-2); }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(15rem,1fr)); gap:var(--space-4); margin-top:var(--space-4); }
  /* .card carries .smart-panel from the design system; these are the
     link-specific bits it doesn't cover */
  .card { text-decoration:none; color:inherit; display:block; }
  .card:hover { border-color:var(--brand); }
  .card strong { display:block; margin-bottom:var(--space-1); }
  .card span { color:var(--fg-2); font-size:var(--fs-sm); }
  pre.shiki, pre.shiki span { color: var(--shiki-light); background-color: transparent; }
  pre.shiki { background: var(--gray-50) !important; }
  pre.shiki code { display:block; font-size:var(--fs-sm); line-height:1.6; }
`;

/** The guides in reading order, plus the API reference, with you marked. */
function rail(slug: string): string {
  const here = (s: string) => (s === slug ? ' aria-current="page"' : "");
  const guides = GUIDES.filter((g) => existsSync(g.file))
    .map((g) => `<li><a href="${BASE}/docs/${g.slug}.html"${here(g.slug)}>${g.title}</a></li>`)
    .join("");
  const api = API_GROUPS.map((g) => g.module)
    .filter((m, i, all) => all.indexOf(m) === i)
    .map((m) => `<li><a href="${BASE}/docs/api/${m}.html"${here(`api-${m}`)}>${m}</a></li>`)
    .join("");
  return `<nav class="rail" aria-label="Documentation">
    <h4><a href="${BASE}/docs/"${here("index")}>Guides</a></h4>
    <ul>${guides}</ul>
    <h4><a href="${BASE}/docs/api/"${here("api-index")}>API reference</a></h4>
    <ul>${api}</ul>
  </nav>`;
}

function crumb(title: string, isApi: boolean): string {
  return `<p class="crumb"><a href="${BASE}/docs/">Docs</a>${isApi ? ` <span>/</span> <a href="${BASE}/docs/api/">API reference</a>` : ""} <span>/</span> ${title}</p>`;
}

function pager(slug: string): string {
  const list = GUIDES.filter((g) => existsSync(g.file));
  const i = list.findIndex((g) => g.slug === slug);
  if (i < 0) return "";
  const prev = list[i - 1];
  const next = list[i + 1];
  return `<div class="pager">
    <span>${prev ? `← <a href="${BASE}/docs/${prev.slug}.html">${prev.title}</a>` : ""}</span>
    <span>${next ? `<a href="${BASE}/docs/${next.slug}.html">${next.title}</a> →` : ""}</span>
  </div>`;
}

const shell = (title: string, slug: string, body: string, markdown?: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${markdown ? `<link rel="alternate" type="text/markdown" href="${markdown}">` : ""}
${CHROME_ASSETS}
<style>${DOCS_STYLE}</style>
</head>
<body>
${header()}
<div class="layout">
  ${rail(slug)}
  <article>${body}</article>
</div>
${footer()}
</body>
</html>
`;

function rewriteLinks(html: string): string {
  return html
    .replace(/href="(?:\.\.\/)?api\/index\.md"/g, `href="${BASE}/docs/api/"`)
    .replace(/href="(?:\.\.\/)?api\/([a-z-]+)\.md"/g, `href="${BASE}/docs/api/$1.html"`)
    .replace(/href="\.\.\/demo\/README\.md"/g, `href="${BASE}/docs/demo.html"`)
    .replace(/href="\.\.\/([a-z-]+)\.md"/g, `href="${BASE}/docs/$1.html"`)
    .replace(/href="([a-z-]+)\.md"/g, `href="${BASE}/docs/$1.html"`);
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
// Every page is also published as the markdown it came from, at the same
// path with .md — the primitive the site's llms.txt files are built on.
for (const guide of GUIDES) {
  if (!existsSync(guide.file)) continue;
  const md = readFileSync(guide.file, "utf8");
  const html = crumb(guide.title, false) + render(md) + pager(guide.slug);
  writeFileSync(join(OUT, `${guide.slug}.md`), md);
  writeFileSync(
    join(OUT, `${guide.slug}.html`),
    shell(`${guide.title} — SMART Health Check-in`, guide.slug, html, `${BASE}/docs/${guide.slug}.md`),
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
    .replace(/href="([a-z-]+)\.md"/g, `href="${BASE}/docs/api/$1.html"`)
    .replace(/href="\/docs\/api\/index\.html"/g, `href="${BASE}/docs/api/"`);
  const name = basename(file, ".md");
  writeFileSync(join(OUT, "api", `${name}.md`), md);
  writeFileSync(
    join(OUT, "api", `${name}.html`),
    shell(`${name} — API reference`, `api-${name}`, crumb(`${name} module`, true) + html, `${BASE}/docs/api/${name}.md`),
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
        `      <a href="${BASE}/docs/api/${group.module}.html#${anchorFor(entry.name)}"><code>${entry.name}</code></a><span>${entry.what}</span>`,
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
    `<p class="crumb"><a href="${BASE}/docs/">Docs</a> <span>/</span> API reference</p>
<h1>API reference</h1>
<p class="lede">
  Every export, grouped by what you'd be doing. Signatures and types are
  generated from the source, so they can't drift; this page is checked at
  build time to make sure nothing is missing from it.
</p>
<p>
  Most integrations use two: <a href="${BASE}/docs/api/checkin.html#requestcheckin"><code>requestCheckin</code></a>
  and — only if you want the FHIR mapping —
  <a href="${BASE}/docs/api/fhir.html#buildcheckinbundle"><code>buildCheckinBundle</code></a>.
  For explanation rather than signatures, start with
  <a href="${BASE}/docs/getting-started.html">Getting started</a>.
</p>
${groupsHtml}
<div class="pager">
  <span>Full generated pages: <a href="${BASE}/docs/api/checkin.html">checkin</a> · <a href="${BASE}/docs/api/fhir.html">fhir</a></span>
</div>`,
  ),
);

// --- docs landing -----------------------------------------------------
const cards = GUIDES.filter((g) => existsSync(g.file))
  .map(
    (g) => `      <a class="card smart-panel" href="${BASE}/docs/${g.slug}.html">
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

// --- llms.txt: this section, for a model ------------------------------
// The index follows llmstxt.org; the full file is every guide and the API
// reference concatenated. Both sit at the section root, like every section.
const ORIGIN = process.env.SITE_ORIGIN ?? "https://smart-health-checkin.org";
const abs = (path: string): string => `${ORIGIN}${BASE}${path}`;
const guides = GUIDES.filter((g) => existsSync(g.file));
const apiModules = readdirSync("docs/api")
  .filter((f) => f.endsWith(".md") && f !== "index.md")
  .map((f) => basename(f, ".md"));

writeFileSync(
  join(OUT_ROOT, "llms.txt"),
  [
    "# SMART Health Check-in — JavaScript client",
    "",
    "> The provider side of SMART Health Check-in as one `await`: ask the patient's health app for what the visit needs and get a verified response back in the page. Install from git (`npm install github:smart-health-checkin/client`) or import the hosted ES module.",
    "",
    "## Guides",
    ...guides.map((g) => `- [${g.title}](${abs(`/docs/${g.slug}.md`)}): ${g.blurb}`),
    "",
    "## API reference",
    ...apiModules.map((m) => `- [${m}](${abs(`/docs/api/${m}.md`)})`),
    "",
    "## Optional",
    `- [Everything in one file](${abs("/llms-full.txt")})`,
    "- [Source](https://github.com/smart-health-checkin/client)",
    "",
  ].join("\n"),
);

const section = (url: string, body: string): string => `\n\n---\n\n<!-- ${url} -->\n\n${body.trim()}\n`;
writeFileSync(
  join(OUT_ROOT, "llms-full.txt"),
  "# SMART Health Check-in — JavaScript client\n" +
    guides.map((g) => section(abs(`/docs/${g.slug}.md`), readFileSync(g.file, "utf8"))).join("") +
    apiModules.map((m) => section(abs(`/docs/api/${m}.md`), readFileSync(join("docs/api", `${m}.md`), "utf8"))).join(""),
);
