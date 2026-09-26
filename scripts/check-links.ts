/**
 * Every same-site link in the built site must reach a page that exists and,
 * when it names a fragment, an element with that id.
 *   bun scripts/check-links.ts [siteDir] [basePath]
 * basePath is the path the site is served under (SITE_BASE, e.g. /client).
 */
import { Glob } from "bun";
import { existsSync } from "node:fs";
import { join, dirname, posix } from "node:path";

const site = process.argv[2] ?? "_site";
const base = (process.argv[3] ?? process.env.SITE_BASE ?? "").replace(/\/$/, "");
const pages = [...new Glob("**/*.html").scanSync(site)];
const ids = new Map<string, Set<string>>();
const html = new Map<string, string>();
for (const p of pages) {
  const text = await Bun.file(join(site, p)).text();
  html.set(p, text);
  ids.set(p, new Set([...text.matchAll(/\s(?:id|name)="([^"]+)"/g)].map((m) => m[1]!)));
}

const broken: string[] = [];
for (const [page, text] of html) {
  for (const m of text.matchAll(/\shref="([^"]+)"/g)) {
    const href = m[1]!.replace(/&amp;/g, "&");
    if (/^(?:[a-z]+:|\/\/)/i.test(href)) continue;
    let [path = "", frag] = href.split("#");
    path = path.split("?")[0]!;
    let target: string;
    if (!path) target = page;
    else if (path.startsWith("/")) {
      if (!base || !(path === base || path.startsWith(base + "/"))) continue; // another section of the site
      target = path.slice(base.length + 1);
    } else target = posix.normalize(posix.join(dirname(page), path));
    if (target === "" || target.endsWith("/")) target += "index.html";
    if (!existsSync(join(site, target))) {
      broken.push(`${page}: ${href} (no ${target})`);
      continue;
    }
    if (frag && target.endsWith(".html") && !ids.get(target)?.has(decodeURIComponent(frag))) {
      broken.push(`${page}: ${href} (no #${frag} in ${target})`);
    }
  }
}
if (broken.length) {
  console.error(broken.join("\n"));
  console.error(`${broken.length} broken link(s) across ${pages.length} pages`);
  process.exit(1);
}
console.log(`links OK across ${pages.length} pages`);
