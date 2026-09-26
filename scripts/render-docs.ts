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
import { API_GROUPS, CHECKED_MODULES, anchorFor } from "./api-index.ts";
import { GUIDES, LEVELS, MOVED } from "./site-nav.ts";
import { CHROME_ASSETS, footer, header } from "./site-chrome.ts";
import { BASE, OUT_ROOT } from "./site-base.ts";

const OUT = `${OUT_ROOT}/docs`;

// Getting started is the section's front page — /client/, not a page under
// /client/docs/ — so the nav, the rail, and the first guide all agree on
// where "start here" is.
const ROOT_SLUG = "getting-started";
const hrefFor = (slug: string): string => (slug === ROOT_SLUG ? `${BASE}/` : `${BASE}/docs/${slug}.html`);
const mdPathFor = (slug: string): string => (slug === ROOT_SLUG ? "/index.md" : `/docs/${slug}.md`);
const outFor = (slug: string, ext: "html" | "md"): string =>
  slug === ROOT_SLUG ? join(OUT_ROOT, `index.${ext}`) : join(OUT, `${slug}.${ext}`);

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
  .rail li.track > span { display:block; margin:var(--space-3) 0 var(--space-1); font-size:var(--fs-xs); font-weight:600; color:var(--fg-3); }
  .rail li.track:first-child > span { margin-top:0; }
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
  figure.flow { margin:var(--space-5) 0 0; }
  figure.flow svg { max-width:100%; height:auto; color:var(--fg-1); display:block; }
  figure.flow .mono { font-family:var(--font-mono); }
  figure.flow .sans { font-family:var(--font-sans); }
  figure.flow figcaption { font-size:var(--fs-sm); color:var(--fg-3); margin-top:var(--space-3); max-width:62ch; }
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
  const guides = LEVELS.map(({ level, label }) => {
    const items = GUIDES.filter((g) => g.level === level && existsSync(g.file))
      .map((g) => `<li><a href="${hrefFor(g.slug)}"${here(g.slug)}>${g.title}</a></li>`)
      .join("");
    return `<li class="track"><span>${label}</span><ul>${items}</ul></li>`;
  }).join("");
  const api = API_GROUPS.map((g) => g.module)
    .filter((m, i, all) => all.indexOf(m) === i)
    .map((m) => `<li><a href="${BASE}/docs/api/${m}.html"${here(`api-${m}`)}>${m}</a></li>`)
    .join("");
  return `<nav class="rail" aria-label="Documentation">
    <h4>Docs</h4>
    <ul class="tracks">${guides}</ul>
    <h4><a href="${BASE}/docs/api/"${here("api-index")}>API reference</a></h4>
    <ul>${api}</ul>
  </nav>`;
}

function crumb(title: string, isApi: boolean): string {
  return `<p class="crumb"><a href="${BASE}/">Developers</a>${isApi ? ` <span>/</span> <a href="${BASE}/docs/api/">API reference</a>` : ""} <span>/</span> ${title}</p>`;
}

function pager(slug: string): string {
  // The start pages and guides read in order; reference pages stand alone.
  const list = GUIDES.filter((g) => g.level !== "reference" && existsSync(g.file));
  const i = list.findIndex((g) => g.slug === slug);
  if (i < 0) return "";
  const prev = list[i - 1];
  const next = list[i + 1];
  return `<div class="pager">
    <span>${prev ? `← <a href="${hrefFor(prev.slug)}">${prev.title}</a>` : ""}</span>
    <span>${next ? `<a href="${hrefFor(next.slug)}">${next.title}</a> →` : ""}</span>
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
    .replace(/href="\.\.\/docs\/([a-z-]+)\.md(#[^"]*)?"/g, `href="${BASE}/docs/$1.html$2"`)
    .replace(/href="(?:\.\.\/)?getting-started\.md(#[^"]*)?"/g, `href="${BASE}/$1"`)
    .replace(/href="\.\.\/([a-z-]+)\.md(#[^"]*)?"/g, `href="${BASE}/docs/$1.html$2"`)
    .replace(/href="([a-z-]+)\.md(#[^"]*)?"/g, `href="${BASE}/docs/$1.html$2"`);
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

// GitHub-style heading ids, so "page.md#section" links work, unique per page.
const usedSlugs = new Map<string, number>();
const slugFor = (text: string): string => {
  const base = text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
  const n = usedSlugs.get(base) ?? 0;
  usedSlugs.set(base, n + 1);
  return n ? `${base}-${n}` : base;
};

marked.use({
  renderer: {
    heading({ tokens, depth, text }: { tokens: unknown[]; depth: number; text: string }): string {
      const inner = (this as unknown as { parser: { parseInline(t: unknown[]): string } }).parser.parseInline(tokens);
      return `<h${depth} id="${slugFor(text.replace(/[`*]/g, ""))}">${inner}</h${depth}>\n`;
    },
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

const render = (md: string): string => {
  usedSlugs.clear();
  return rewriteLinks(marked.parse(md) as string);
};
// Reference pages link to each other as "checkin.md#x"; keep those under /docs/api/.
const renderApi = (md: string): string => {
  usedSlugs.clear();
  return rewriteLinks((marked.parse(md) as string).replace(/href="([a-z-]+)\.md(#[^"]*)?"/g, `href="${BASE}/docs/api/$1.html$2"`));
};

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "api"), { recursive: true });

// --- narrative guides -------------------------------------------------
// Every page is also published as the markdown it came from, at the same
// path with .md — the primitive the site's llms.txt files are built on.
for (const guide of GUIDES) {
  if (!existsSync(guide.file)) continue;
  const md = readFileSync(guide.file, "utf8");
  const html = (guide.slug === ROOT_SLUG ? "" : crumb(guide.title, false)) + render(md) + pager(guide.slug);
  writeFileSync(outFor(guide.slug, "md"), md);
  writeFileSync(
    outFor(guide.slug, "html"),
    shell(`${guide.title} — SMART Health Check-in`, guide.slug, html, `${BASE}${mdPathFor(guide.slug)}`),
  );
}

// --- generated API reference pages ------------------------------------
const missing: string[] = [];
for (const { module, source } of CHECKED_MODULES) {
  const imported = await import(new URL(source, import.meta.url).href);
  const listed = new Set(API_GROUPS.filter((g) => g.module === module).flatMap((g) => g.entries.map((e) => e.name)));
  for (const name of Object.keys(imported)) if (!listed.has(name)) missing.push(`${module}: ${name}`);
}

for (const file of readdirSync("docs/api")) {
  if (!file.endsWith(".md") || file === "index.md") continue;
  const md = readFileSync(join("docs/api", file), "utf8");
  const html = renderApi(md).replace(/href="([^"]*)\/docs\/api\/index\.html"/g, `href="$1/docs/api/"`);
  const name = basename(file, ".md");
  writeFileSync(join(OUT, "api", `${name}.md`), md);
  writeFileSync(
    join(OUT, "api", `${name}.html`),
    shell(`${name} — API reference`, `api-${name}`, crumb(`${name} module`, true) + html, `${BASE}/docs/api/${name}.md`),
  );
}

// --- curated API index (replaces TypeDoc's empty module table) --------
if (missing.length) {
  throw new Error(
    `API index is missing ${missing.length} export(s): ${missing.join(", ")}\n` +
      "Add them to scripts/api-index.ts so the reference stays honest.",
  );
}

const groupsHtml = API_GROUPS.map((group) => {
  const importLine = `<p class="blurb"><code>import … from "${group.importPath}"</code></p>`;
  const rows = group.entries
    .map(
      (entry) =>
        `      <a href="${BASE}/docs/api/${group.module}.html#${anchorFor(entry.name)}"><code>${entry.name}</code></a><span>${entry.what}</span>`,
    )
    .join("\n");
  return `  <section class="api-group">
    <h2>${group.title}</h2>
    <p class="blurb">${group.blurb}</p>
    ${importLine}
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
    `<p class="crumb"><a href="${BASE}/">Developers</a> <span>/</span> API reference</p>
<h1>API reference</h1>
<p class="lede">
  Every export, grouped by what you'd be doing. Signatures and types are
  generated from the source, so they can't drift; this page is checked at
  build time to make sure nothing is missing from it.
</p>
<p>
  Most EHR pages use the <a href="${BASE}/docs/api/ui.html">picker element</a>, or
  <a href="${BASE}/docs/api/checkin.html#runcheckin"><code>runCheckin</code></a> and
  <a href="${BASE}/docs/api/checkin.html#checkinresponse"><code>CheckinResponse</code></a>.
  For explanation rather than signatures, start with
  <a href="${BASE}/">Getting started</a>.
</p>
${groupsHtml}
<div class="pager">
  <span>Full generated pages: ${["checkin", "ui", "react", "picker", "wallet", "handoff", "fhir", "testing", "model", "wire"].map((m) => `<a href="${BASE}/docs/api/${m}.html">${m}</a>`).join(" · ")}</span>
</div>`,
  ),
);

const ORIGIN_FOR_REDIRECTS = process.env.SITE_ORIGIN ?? "https://smart-health-checkin.org";

// --- the old doors: /docs/ and /docs/getting-started.html lead to the front page
const redirect = (to: string): string => `<!doctype html>
<meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${to}">
<link rel="canonical" href="${to}"><title>Moved</title>
<p>Moved to <a href="${to}">${to}</a>.</p>
`;
for (const stale of ["index.html", "getting-started.html"]) writeFileSync(join(OUT, stale), redirect(`${BASE}/`));
// Pages merged into others keep working.
for (const [slug, to] of Object.entries(MOVED)) {
  writeFileSync(join(OUT, `${slug}.html`), redirect(`${BASE}/docs/${to}`));
  writeFileSync(join(OUT, `${slug}.md`), `Moved to ${ORIGIN_FOR_REDIRECTS}${BASE}/docs/${to}\n`);
}

// nav.json: the site's "Developers" menu (smart-health-checkin.github.io/assets/site-chrome.js mirrors it).
writeFileSync(
  join(OUT_ROOT, "nav.json"),
  JSON.stringify(
    {
      label: "Developers",
      href: `${BASE}/`,
      items: [
        ...GUIDES.filter((g) => g.menuNote && existsSync(g.file)).map((g) => ({ title: g.title, href: hrefFor(g.slug), note: g.menuNote })),
        { title: "API reference", href: `${BASE}/docs/api/`, note: "Every export, by module" },
      ],
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `docs rendered: ${GUIDES.length} guides, API index (${CHECKED_MODULES.length} modules checked) -> ${OUT}`,
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
    "# SMART Health Check-in — Developers",
    "",
    "> Add SMART Health Check-in to an EHR page: a drop-in picker, or one call (`runCheckin`) that asks the patient's health app for what the visit needs and returns a verified response. Also a wallet-side module, a kiosk hand-off, and a mock wallet for testing. Install from git (`npm install github:smart-health-checkin/client`) or import the hosted ES modules.",
    "",
    "## Guides",
    ...guides.map((g) => `- [${g.title}](${abs(mdPathFor(g.slug))}): ${g.blurb}`),
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
  "# SMART Health Check-in — Developers\n" +
    guides.map((g) => section(abs(mdPathFor(g.slug)), readFileSync(g.file, "utf8"))).join("") +
    apiModules.map((m) => section(abs(`/docs/api/${m}.md`), readFileSync(join("docs/api", `${m}.md`), "utf8"))).join(""),
);
