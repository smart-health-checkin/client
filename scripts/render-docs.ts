/**
 * Renders the repo's markdown docs into the site at /docs/.
 *
 * The markdown in docs/ is the single source: it reads on GitHub and renders
 * here. Narrative guides come first; the generated API reference is a
 * supplement, not the front door.
 */

import { marked } from "marked";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const OUT = "_site/docs";

type Guide = { file: string; slug: string; title: string; blurb: string };

const GUIDES: Guide[] = [
  {
    file: "docs/getting-started.md",
    slug: "getting-started",
    title: "Getting started",
    blurb: "Install it, make your first request, handle the paths that aren't success, and run the whole flow without a phone.",
  },
  {
    file: "docs/requests.md",
    slug: "requests",
    title: "Describing what you need",
    blurb: "Items, FHIR selectors, questionnaires, accepted formats — the vocabulary for asking.",
  },
  {
    file: "docs/responses.md",
    slug: "responses",
    title: "Working with responses",
    blurb: "Artifacts and per-item status, what's already verified, and the pattern of asking only for what's missing.",
  },
  {
    file: "docs/wallets.md",
    slug: "wallets",
    title: "Wallets and browser support",
    blurb: "The platform API, a wallet web app in a tab, the non-interactive mock, and where keys live.",
  },
  {
    file: "docs/fhir.md",
    slug: "fhir",
    title: "Writing FHIR",
    blurb: "The optional mapping helper — build a transaction Bundle, inspect it, send it your way.",
  },
  {
    file: "docs/production.md",
    slug: "production",
    title: "Production checklist",
    blurb: "Key custody, trust policy, patient identity, fallback, pinning — what changes for real charts.",
  },
  {
    file: "docs/security-notes.md",
    slug: "security-notes",
    title: "Security notes",
    blurb: "What the kit verifies, what stays deployment policy, and why the demo is shaped the way it is.",
  },
  {
    file: "demo/README.md",
    slug: "demo",
    title: "The demo pages",
    blurb: "URL grammar for the clinic demo, the wallet app, the autofill example, and the React example.",
  },
];

const NAV = `<header class="top"><div class="wrap">
  <a class="home" href="/">smart-health-checkin</a>
  <a href="/docs/">Docs</a>
  <a href="/docs/api/">API reference</a>
  <a href="/demo/">Demo</a>
  <a href="/spec/">Spec</a>
</div></header>`;

const STYLE = `
  :root { --bg:#f7faf9; --surface:#fff; --ink:#16211f; --muted:#5b6b67; --accent:#0e7c6b; --line:#dce5e2; --code-bg:#eef4f2; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --bg:#0e1513; --surface:#16201d; --ink:#e6efec; --muted:#93a5a0; --accent:#3ac2aa; --line:#24322e; --code-bg:#131c19; } }
  :root[data-theme="dark"] { --bg:#0e1513; --surface:#16201d; --ink:#e6efec; --muted:#93a5a0; --accent:#3ac2aa; --line:#24322e; --code-bg:#131c19; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:"IBM Plex Sans",system-ui,sans-serif; line-height:1.65; }
  .wrap { max-width:46rem; margin:0 auto; padding:0 1.25rem; }
  header.top { border-bottom:1px solid var(--line); background:var(--surface); }
  header.top .wrap { padding:0.75rem 1.25rem; display:flex; gap:1rem; align-items:baseline; flex-wrap:wrap; }
  header.top a { color:var(--muted); text-decoration:none; font-size:0.88rem; }
  header.top a.home { color:var(--ink); font-weight:600; font-size:0.95rem; }
  header.top a:hover { color:var(--accent); }
  article { padding:2.5rem 0 4rem; }
  h1 { font-size:1.85rem; letter-spacing:-0.01em; margin:0 0 1rem; text-wrap:balance; }
  h2 { font-size:1.15rem; margin:2rem 0 0.5rem; }
  h3 { font-size:1rem; margin:1.5rem 0 0.4rem; }
  h4 { font-size:0.92rem; margin:1.2rem 0 0.3rem; }
  p, li { margin:0.5rem 0; }
  code { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:0.88em; background:var(--code-bg); padding:0.1em 0.35em; border-radius:4px; }
  pre { background:var(--code-bg); border:1px solid var(--line); border-radius:8px; padding:0.9rem 1.1rem; overflow-x:auto; }
  pre code { background:none; padding:0; font-size:0.82rem; line-height:1.55; }
  table { width:100%; border-collapse:collapse; margin:0.8rem 0; font-size:0.92rem; display:block; overflow-x:auto; }
  th, td { text-align:left; padding:0.45rem 0.6rem; border-bottom:1px solid var(--line); vertical-align:top; }
  blockquote { margin:0.8rem 0; padding:0.3rem 1rem; border-left:3px solid var(--accent); color:var(--muted); }
  a { color:var(--accent); }
  hr { border:none; border-top:1px solid var(--line); margin:2rem 0; }
  ul.checklist { list-style:none; padding-left:0; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(15rem,1fr)); gap:0.9rem; margin-top:1rem; }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:1rem 1.15rem; text-decoration:none; color:inherit; display:block; }
  .card:hover { border-color:var(--accent); }
  .card strong { display:block; margin-bottom:0.2rem; }
  .card span { color:var(--muted); font-size:0.9rem; }
  .lede { color:var(--muted); font-size:1.05rem; max-width:62ch; }
`;

const shell = (title: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${STYLE}</style>
</head>
<body>
${NAV}
<article class="wrap">${body}</article>
</body>
</html>
`;

/** Rewrite repo-relative markdown links to their rendered site paths. */
function rewriteLinks(html: string): string {
  return html
    .replace(/href="(?:\.\/)?api\/index\.md"/g, 'href="/docs/api/"')
    .replace(/href="(?:\.\.\/)?api\/([a-z-]+)\.md"/g, 'href="/docs/api/$1.html"')
    .replace(/href="\.\.\/([a-z-]+)\.md"/g, 'href="/docs/$1.html"')
    .replace(/href="([a-z-]+)\.md"/g, 'href="/docs/$1.html"')
    .replace(/href="\.\.\/demo\/README\.md"/g, 'href="/docs/demo.html"');
}

const render = (md: string): string => rewriteLinks(marked.parse(md) as string);

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "api"), { recursive: true });

// --- narrative guides -------------------------------------------------
for (const guide of GUIDES) {
  if (!existsSync(guide.file)) {
    console.warn(`skipping missing ${guide.file}`);
    continue;
  }
  const html = render(readFileSync(guide.file, "utf8"));
  writeFileSync(join(OUT, `${guide.slug}.html`), shell(`${guide.title} — checkin-client`, html));
}

// --- generated API reference -----------------------------------------
for (const file of readdirSync("docs/api")) {
  if (!file.endsWith(".md")) continue;
  const md = readFileSync(join("docs/api", file), "utf8");
  const html = render(md)
    .replace(/href="([a-z-]+)\.md"/g, 'href="$1.html"')
    .replace(/href="\.\.\/([a-z-]+)\.md"/g, 'href="/docs/$1.html"');
  const name = basename(file, ".md");
  const out = name === "index" ? "index.html" : `${name}.html`;
  writeFileSync(join(OUT, "api", out), shell(`${name} — API reference`, html));
}

// --- docs landing -----------------------------------------------------
const cards = GUIDES.filter((g) => existsSync(g.file))
  .map(
    (g) => `      <a class="card" href="/docs/${g.slug}.html">
        <strong>${g.title}</strong><span>${g.blurb}</span>
      </a>`,
  )
  .join("\n");

const landing = readFileSync("site/docs/index.html", "utf8").replace(
  "<!--GUIDE-CARDS-->",
  cards,
);
writeFileSync(join(OUT, "index.html"), landing);

console.log(`docs rendered: ${GUIDES.length} guides + API reference -> ${OUT}`);
