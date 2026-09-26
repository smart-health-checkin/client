/**
 * Renders the repo's markdown docs into the site at /docs/.
 *
 * The markdown in docs/ is the single source: it reads on GitHub and renders
 * here. Every page carries the shared site chrome (bar, breadcrumb, footer)
 * and a rail listing the Developers menu, group by group, with you marked.
 * The rail and nav.json come from one list (menuTree), so they always match.
 * On phones the rail becomes an "In this section" disclosure under the H1.
 */

import { marked } from "marked";
import { createCssVariablesTheme, createHighlighter } from "shiki";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { API_GROUPS, CHECKED_MODULES, anchorFor } from "./api-index.ts";
import { MENU_GROUPS, GUIDES, type MenuGroup } from "./site-nav.ts";
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
    margin:0;
    font-family:var(--font-sans); font-size:var(--fs-base); line-height:var(--lh-normal);
    -webkit-font-smoothing:antialiased;
  }
  /* One left edge with the bar and breadcrumb: 24px, 16px on phones. */
  .layout {
    max-width:var(--container-wide); margin:0 auto; padding:var(--space-5) 24px var(--space-5);
    display:grid; grid-template-columns:14rem minmax(0,1fr); gap:var(--space-8); align-items:start;
  }
  /* Code, tables and diagrams may use the column; prose stops near 72ch. */
  main { min-width:0; max-width:52rem; overflow-wrap:break-word; }
  main > :is(p, ul, ol, dl, blockquote, h1, h2, h3, h4, h5), main .lede { max-width:42rem; }
  .rail { position:sticky; top:calc(var(--smart-bar-h, 56px) + var(--space-5)); font-size:var(--fs-sm); max-height:calc(100vh - var(--smart-bar-h, 56px) - var(--space-7)); overflow-y:auto; }
  .rail-list ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
  .rail-list li { margin:0; }
  .rail-list .rail-h {
    display:block; margin:var(--space-5) 0 var(--space-1); font-size:var(--fs-xs); font-weight:700;
    letter-spacing:var(--tracking-caps); text-transform:uppercase; color:var(--fg-3);
  }
  .rail-list a {
    display:block; padding:5px 10px; margin-left:-10px; border-radius:var(--radius-sm);
    color:var(--fg-2); text-decoration:none; line-height:1.35;
  }
  .rail-list a:hover { color:var(--brand); background:var(--surface-alt); }
  .rail-list a[aria-current="page"] { color:var(--brand-ink); font-weight:600; background:var(--brand-wash); }
  .rail-list ul.rail-sub { margin:2px 0 var(--space-2) var(--space-3); padding-left:var(--space-2); border-left:1px solid var(--border); }
  .rail-list ul.rail-sub a { font-family:var(--font-mono); font-size:var(--fs-xs); padding:3px 8px; margin-left:0; }
  details.rail-phone { display:none; }
  @media (max-width: 68rem) {
    .layout { grid-template-columns:minmax(0,1fr); gap:0; }
    .rail { display:none; }
    /* The disclosure is a .smart-prose details; only its size and spacing are local. */
    details.rail-phone { display:block; margin:0 0 var(--space-5); font-size:var(--fs-sm); max-width:42rem; }
    details.rail-phone > summary { min-height:44px; align-items:center; }
    details.rail-phone .rail-list a { margin-left:0; min-height:40px; display:flex; align-items:center; }
  }
  @media (max-width: 46rem) {
    .layout { padding-left:16px; padding-right:16px; }
  }
  .nowrap { white-space:nowrap; }
  h1 { margin:0 0 var(--space-4); font-size:var(--fs-3xl); letter-spacing:var(--tracking-tight); line-height:var(--lh-tight); text-wrap:balance; }
  h2 { margin:var(--space-7) 0 var(--space-3); font-size:var(--fs-xl); letter-spacing:var(--tracking-tight); text-wrap:balance; }
  h3 { margin:var(--space-6) 0 var(--space-2); font-size:var(--fs-md); text-wrap:balance; }
  h4 { margin:var(--space-5) 0 var(--space-2); font-size:var(--fs-base); }
  p, li { margin:var(--space-3) 0; color:var(--fg-2); }
  li > p { margin:var(--space-2) 0; }
  strong { color:var(--fg-1); }
  a { color:var(--brand); }
  hr { border:none; border-top:1px solid var(--border); margin:var(--space-7) 0; }
  .pager { display:flex; justify-content:space-between; gap:var(--space-4); margin-top:var(--space-7); padding-top:var(--space-4); border-top:1px solid var(--border); font-size:var(--fs-sm); }
  .pager span { color:var(--fg-3); }
  .lede { font-family:var(--font-serif); color:var(--fg-2); font-size:var(--fs-md); line-height:1.55; }
  figure.flow { margin:var(--space-5) 0 0; }
  figure.flow svg { max-width:100%; height:auto; color:var(--fg-1); display:block; }
  figure.flow .mono { font-family:var(--font-mono); }
  figure.flow .sans { font-family:var(--font-sans); }
  figure.flow figcaption { font-size:var(--fs-sm); color:var(--fg-3); margin-top:var(--space-3); max-width:62ch; }
  .api-group { margin:var(--space-7) 0 0; }
  .api-group h2 { margin:0 0 var(--space-1); }
  .api-group p.blurb { color:var(--fg-3); font-size:var(--fs-sm); margin:0 0 var(--space-3); }
  .api-list { display:grid; grid-template-columns:minmax(13rem,auto) 1fr; gap:var(--space-2) var(--space-5); font-size:var(--fs-sm); align-items:baseline; }
  @media (max-width: 46rem) { .api-list { grid-template-columns:minmax(0,1fr); gap:0; } .api-list span { margin-bottom:var(--space-3); } }
  .api-list a { font-family:var(--font-mono); font-size:var(--fs-sm); }
  .api-list span { color:var(--fg-2); }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(15rem,1fr)); gap:var(--space-4); margin-top:var(--space-4); }
  /* .card carries .smart-panel from the design system; these are the
     link-specific bits it doesn't cover */
  .card { text-decoration:none; color:inherit; display:block; }
  .card:hover { border-color:var(--brand); }
  .card strong { display:block; margin-bottom:var(--space-1); }
  .card span { color:var(--fg-2); font-size:var(--fs-sm); }
`;

type MenuEntry = { title: string; href: string; note: string; slug: string };

/**
 * The Developers menu: MENU_GROUPS in order, each with its guides in GUIDES
 * order, the API reference leading Reference. nav.json and the rail both
 * come from here. Every guide but the front page must name a group.
 */
function menuTree(): Array<{ title: MenuGroup; items: MenuEntry[] }> {
  const groups = MENU_GROUPS.map((title) => ({ title, items: [] as MenuEntry[] }));
  const group = (title: MenuGroup) => groups.find((g) => g.title === title)!;
  group("Reference").items.push({ title: "API reference", href: `${BASE}/docs/api/`, note: "Every export, by module", slug: "api-index" });
  for (const g of GUIDES) {
    if (g.slug === ROOT_SLUG || !existsSync(g.file)) continue;
    if (!g.menuGroup || !g.menuNote) {
      throw new Error(`${g.slug}: every page but the front page needs a menuGroup and a menuNote (scripts/site-nav.ts)`);
    }
    group(g.menuGroup).items.push({ title: g.title, href: hrefFor(g.slug), note: g.menuNote, slug: g.slug });
  }
  return groups.filter((g) => g.items.length);
}
const MENU = menuTree();

const API_MODULES = API_GROUPS.map((g) => g.module).filter((m, i, all) => all.indexOf(m) === i);

/** The menu as a list, with you marked. Module pages show under the API reference while you're in it. */
function railList(slug: string): string {
  const here = (s: string) => (s === slug ? ' aria-current="page"' : "");
  const api = slug.startsWith("api-")
    ? `<ul class="rail-sub">${API_MODULES.map((m) => `<li><a href="${BASE}/docs/api/${m}.html"${here(`api-${m}`)}>${m}</a></li>`).join("")}</ul>`
    : "";
  const groups = MENU.map(
    (g) => `<div class="rail-group" data-group="${g.title}"><span class="rail-h">${g.title}</span><ul>${g.items
      .map((i) => `<li><a href="${i.href}"${here(i.slug)}>${i.title}</a>${i.slug === "api-index" ? api : ""}</li>`)
      .join("")}</ul></div>`,
  ).join("");
  return `<div class="rail-list"><ul><li><a href="${BASE}/"${here(ROOT_SLUG)}>Overview</a></li></ul>${groups}</div>`;
}

const rail = (slug: string): string => `<nav class="rail" aria-label="Developers docs">${railList(slug)}</nav>`;

/** On phones the rail is a disclosure right under the H1. */
function withPhoneRail(slug: string, body: string): string {
  const block = `<details class="rail-phone"><summary>In this section</summary><nav aria-label="Developers docs">${railList(slug)}</nav></details>`;
  const at = body.indexOf("</h1>");
  if (at < 0) throw new Error(`${slug}: no <h1>`);
  return body.slice(0, at + 5) + "\n" + block + body.slice(at + 5);
}

/** Next and previous follow the rail, through every group but Reference. */
function pager(slug: string): string {
  const list: Array<{ title: string; href: string; slug: string }> = [
    { title: "Overview", href: `${BASE}/`, slug: ROOT_SLUG },
    ...MENU.filter((g) => g.title !== "Reference").flatMap((g) => g.items),
  ];
  const i = list.findIndex((g) => g.slug === slug);
  if (i < 0) return "";
  const prev = list[i - 1];
  const next = list[i + 1];
  return `<div class="pager">
    <span>${prev ? `← <a href="${prev.href}">${prev.title}</a>` : ""}</span>
    <span>${next ? `<a href="${next.href}">${next.title}</a> →` : ""}</span>
  </div>`;
}

/** Keep "Check-in" and "hand-off" whole when a heading wraps. */
function keepHyphenated(html: string): string {
  return html.replace(/(<h[1-3][^>]*>)([\s\S]*?)(<\/h[1-3]>)/g, (_m, open: string, inner: string, close: string) =>
    open + inner.replace(/(^|>)([^<]+)/g, (_n, gt: string, text: string) =>
      gt + text.replace(/\b((?:[Cc]heck|[Hh]and)-(?:in|off))\b/g, '<span class="nowrap">$1</span>')) + close);
}

const shell = (title: string, slug: string, body: string, opts: { markdown?: string; current?: string; parent?: { href: string; label: string } } = {}): string => `<!doctype html>
<html lang="en" data-theme="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${opts.markdown ? `<link rel="alternate" type="text/markdown" href="${opts.markdown}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${CHROME_ASSETS}
<style>${DOCS_STYLE}</style>
</head>
<body>
${header()}
<nav data-smart-breadcrumb${slug === ROOT_SLUG ? " hidden" : ""}${opts.parent ? ` data-parent-href="${opts.parent.href}" data-parent-label="${opts.parent.label}"` : ""}${opts.current ? ` data-current="${opts.current}"` : ""}></nav>
<div class="layout">
  ${rail(slug)}
  <main id="main" class="smart-prose">${keepHyphenated(withPhoneRail(slug, body))}</main>
</div>
${footer()}
</body>
</html>
`;

function rewriteLinks(html: string): string {
  return html
    .replace(/<table>/g, '<div class="smart-table-wrap"><table>')
    .replace(/<\/table>/g, "</table></div>")
    .replace(/href="(?:\.\.\/)?api\/index\.md"/g, `href="${BASE}/docs/api/"`)
    .replace(/href="(?:\.\.\/)?api\/([a-z-]+)\.md"/g, `href="${BASE}/docs/api/$1.html"`)
    .replace(/href="\.\.\/demo\/README\.md"/g, `href="${BASE}/docs/demo.html"`)
    .replace(/href="\.\.\/docs\/([a-z-]+)\.md(#[^"]*)?"/g, `href="${BASE}/docs/$1.html$2"`)
    .replace(/href="(?:\.\.\/)?getting-started\.md(#[^"]*)?"/g, `href="${BASE}/$1"`)
    .replace(/href="\.\.\/([a-z-]+)\.md(#[^"]*)?"/g, `href="${BASE}/docs/$1.html$2"`)
    .replace(/href="([a-z-]+)\.md(#[^"]*)?"/g, `href="${BASE}/docs/$1.html$2"`);
}

// Build-time syntax highlighting with Shiki's css-variables theme: the shared
// stylesheet maps its variables onto the site's --syn-* colors, so code
// follows light and dark with no client-side JS (MAINTAINING.md, "Syntax
// highlighting").
const highlighter = await createHighlighter({
  themes: [createCssVariablesTheme()],
  langs: ["ts", "tsx", "js", "json", "html", "css", "xml", "sh", "kotlin"],
});

const LANG_ALIASES: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  bash: "sh",
  shell: "sh",
  console: "sh",
  jsonc: "json",
};

// GitHub-style heading ids, so "page.md#section" links work, unique per page.
const usedSlugs = new Map<string, number>();
// On API pages, each symbol's own heading (###) keeps its plain id even when a
// member of the same name comes first, so "checkin.html#wallet" is the Wallet
// interface, not some option called wallet.
const reservedSlugs = new Set<string>();
const baseSlug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
const slugFor = (text: string, depth = 0): string => {
  const base = baseSlug(text);
  if (depth === 3 && reservedSlugs.delete(base)) return base;
  const n = usedSlugs.get(base) ?? (reservedSlugs.has(base) ? 1 : 0);
  usedSlugs.set(base, n + 1);
  return n ? `${base}-${n}` : base;
};

marked.use({
  renderer: {
    heading({ tokens, depth, text }: { tokens: unknown[]; depth: number; text: string }): string {
      const inner = (this as unknown as { parser: { parseInline(t: unknown[]): string } }).parser.parseInline(tokens);
      return `<h${depth} id="${slugFor(text.replace(/[`*]/g, ""), depth)}">${inner}</h${depth}>\n`;
    },
    code({ text, lang }: { text: string; lang?: string }): string {
      const requested = (lang ?? "").split(/\s+/)[0]?.toLowerCase() ?? "";
      const resolved = LANG_ALIASES[requested] ?? requested;
      const supported = highlighter.getLoadedLanguages().includes(resolved) ? resolved : "text";
      return highlighter.codeToHtml(text, { lang: supported, theme: "css-variables" });
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
  reservedSlugs.clear();
  for (const m of md.matchAll(/^### (.+)$/gm)) reservedSlugs.add(baseSlug(m[1]!.replace(/[`*]/g, "")));
  const html = (marked.parse(md) as string).replace(/href="([a-z-]+)\.md(#[^"]*)?"/g, `href="${BASE}/docs/api/$1.html$2"`);
  reservedSlugs.clear();
  return rewriteLinks(html);
};

// TypeDoc numbers repeated anchors its own way ("#checkinerrorcode-1"), which
// needn't match the ids above. A link whose text is a symbol's name goes to
// that symbol's heading on the target page.
const symbolIds = new Map<string, Map<string, string>>(); // module -> name -> id
function linkSymbols(module: string, html: string): string {
  return html.replace(
    /<a href="((?:[^"#]*\/docs\/api\/([a-z-]+)\.html)?)#[^"]*"><code>([A-Za-z_$][\w$]*)<\/code><\/a>/g,
    (whole, page: string, target: string | undefined, name: string) => {
      const id = symbolIds.get(target ?? module)?.get(name);
      return id ? `<a href="${page}#${id}"><code>${name}</code></a>` : whole;
    },
  );
}

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "api"), { recursive: true });

// --- narrative guides -------------------------------------------------
// Every page is also published as the markdown it came from, at the same
// path with .md — the primitive the site's llms.txt files are built on.
for (const guide of GUIDES) {
  if (!existsSync(guide.file)) continue;
  const md = readFileSync(guide.file, "utf8");
  const html = render(md) + pager(guide.slug);
  writeFileSync(outFor(guide.slug, "md"), md);
  writeFileSync(
    outFor(guide.slug, "html"),
    shell(`${guide.title} — SMART Health Check-in`, guide.slug, html, { markdown: `${BASE}${mdPathFor(guide.slug)}` }),
  );
}

// --- generated API reference pages ------------------------------------
const missing: string[] = [];
for (const { module, source } of CHECKED_MODULES) {
  const imported = await import(new URL(source, import.meta.url).href);
  const listed = new Set(API_GROUPS.filter((g) => g.module === module).flatMap((g) => g.entries.map((e) => e.name)));
  for (const name of Object.keys(imported)) if (!listed.has(name)) missing.push(`${module}: ${name}`);
}

const apiPages = readdirSync("docs/api")
  .filter((file) => file.endsWith(".md") && file !== "index.md")
  .map((file) => {
    const md = readFileSync(join("docs/api", file), "utf8");
    // TypeDoc's own "API / module" line is dropped: the breadcrumb and rail cover it.
    const html = renderApi(md.replace(/^\[[^\n]*\]\(index\.md\) \/ [^\n]*\n/, "")).replace(/href="([^"]*)\/docs\/api\/index\.html"/g, `href="$1/docs/api/"`);
    const name = basename(file, ".md");
    const ids = new Map<string, string>();
    for (const m of html.matchAll(/<h3 id="([^"]+)">(?:<code>)?([^<]+)(?:<\/code>)?<\/h3>/g)) ids.set(m[2]!.trim().replace(/\(\)$/, ""), m[1]!);
    symbolIds.set(name, ids);
    return { name, md, html };
  });
for (const page of apiPages) {
  const { name, md } = page;
  const html = linkSymbols(name, page.html);
  writeFileSync(join(OUT, "api", `${name}.md`), md);
  writeFileSync(
    join(OUT, "api", `${name}.html`),
    shell(`${name} — API reference`, `api-${name}`, html, { markdown: `${BASE}/docs/api/${name}.md`, parent: { href: `${BASE}/docs/api/`, label: "API reference" }, current: name }),
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
    `<h1>API reference</h1>
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
  the <a href="${BASE}/">Overview</a>.
</p>
${groupsHtml}
<div class="pager">
  <span>Full generated pages: ${["checkin", "ui", "react", "picker", "wallet", "handoff", "fhir", "testing", "model", "wire"].map((m) => `<a href="${BASE}/docs/api/${m}.html">${m}</a>`).join(" · ")}</span>
</div>`,
  ),
);

// nav.json: the "Developers" menu, read by the site chrome at runtime. The
// rail on every docs page lists the same entries (menuTree).
writeFileSync(
  join(OUT_ROOT, "nav.json"),
  JSON.stringify({
    label: "Developers",
    href: `${BASE}/`,
    items: MENU.map(({ title, items }) => ({ title, items: items.map(({ title, href, note }) => ({ title, href, note })) })),
  }, null, 2) + "\n",
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
