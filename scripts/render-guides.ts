/** Renders the markdown guides in docs/ into the site's design at /docs/guides/. */
import { marked } from "marked";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const GUIDES = ["docs/integrating.md", "docs/security-notes.md"];
const OUT = "docs-site/guides";
mkdirSync(OUT, { recursive: true });

const shell = (title: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
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
  h1 { font-size:1.8rem; letter-spacing:-0.01em; margin:0 0 1rem; text-wrap:balance; }
  h2 { font-size:1.15rem; margin:2rem 0 0.5rem; }
  h3 { font-size:1rem; margin:1.5rem 0 0.4rem; }
  p, li { margin:0.5rem 0; }
  code { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:0.88em; background:var(--code-bg); padding:0.1em 0.35em; border-radius:4px; }
  pre { background:var(--code-bg); border:1px solid var(--line); border-radius:8px; padding:0.9rem 1.1rem; overflow-x:auto; }
  pre code { background:none; padding:0; font-size:0.82rem; line-height:1.55; }
  table { width:100%; border-collapse:collapse; margin:0.8rem 0; font-size:0.93rem; }
  th, td { text-align:left; padding:0.45rem 0.6rem; border-bottom:1px solid var(--line); vertical-align:top; }
  blockquote { margin:0.8rem 0; padding:0.3rem 1rem; border-left:3px solid var(--accent); color:var(--muted); }
  a { color:var(--accent); }
  hr { border:none; border-top:1px solid var(--line); margin:2rem 0; }
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="home" href="/">smart-health-checkin</a>
  <a href="/docs/">Docs</a>
  <a href="/docs/api/">API reference</a>
  <a href="/demo/">Demo</a>
  <a href="/spec/">Spec</a>
</div></header>
<article class="wrap">${body}</article>
</body>
</html>
`;

for (const path of GUIDES) {
  const md = readFileSync(path, "utf8");
  // Point cross-guide links at the rendered siblings.
  const html = (marked.parse(md) as string)
    .replace(/href="([a-z-]+)\.md"/g, 'href="$1.html"')
    .replace(/href="\.\.\/demo\/src\/frameworks\/([^"]+)"/g,
      'href="https://github.com/smart-health-checkin/checkin-client/blob/main/demo/src/frameworks/$1"');
  const title = (md.match(/^#\s+(.+)$/m)?.[1] ?? basename(path)) + " — checkin-client";
  const out = `${OUT}/${basename(path).replace(/\.md$/, ".html")}`;
  writeFileSync(out, shell(title, html));
  console.log("rendered", path, "->", out);
}
