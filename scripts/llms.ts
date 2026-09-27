#!/usr/bin/env bun
/**
 * Writes this section's llms.txt from the built site.
 *
 *   bun scripts/llms.ts _site      (run by scripts/build-pages.sh)
 *
 * llms.txt is one file per section: an H1, a one-paragraph summary, the
 * shared background, then the full text of every page in the section,
 * converted from the built HTML to Markdown, each under a "Source:" line.
 *
 * The shared background is written once, in the apex repo
 * (smart-health-checkin.github.io, llms-background.md), and published at
 * https://smart-health-checkin.org/llms-background.md. This script fetches it
 * and fails if it can't. LLMS_BACKGROUND=<file or URL> reads another copy, for
 * example ../smart-health-checkin.github.io/llms-background.md offline.
 *
 * The build fails if a page in the site is neither included nor skipped
 * below, or if a file named below is missing.
 */
// @ts-ignore: @mixmark-io/domino ships no types.
import domino from "@mixmark-io/domino";
import TurndownService from "turndown";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { API_GROUPS } from "./api-index.ts";

// ---------------------------------------------------------------- this section
const ORIGIN = "https://smart-health-checkin.org";
const BASE: string = "/client/";
const TITLE = "SMART Health Check-in: Developers and Demos";
const SUMMARY =
  "The JavaScript client library for SMART Health Check-in, its guides, and its demos. A clinic's page (the Verifier) adds check-in with the <smart-checkin-picker> element, a React component, or one call, runCheckin, which asks the patient's health app for what the visit needs and returns the decrypted response, checked against the request. Other modules build a web wallet, hand a kiosk's check-in to the patient's phone, turn a response into FHIR, and test against a mock wallet. The demos check in a made-up patient at a pretend clinic.";
// Pages published but not in llms.txt, with the reason. A key ending in "/"
// skips everything under that folder.
const SKIP: Record<string, string> = {
  "docs/api/": "one generated page per module; llms.txt has the API index (docs/api/index.html, in the menu) and each module's Markdown (TEXTS)",
  "demo/handoff.html": "the kiosk demo's phone page, opened from the kiosk's QR code",
  "demo/native-bridge.html": "the page native apps open in a Custom Tab; nothing on it to read",
  "assets/": "the apex's shared look, copied in only for a standalone preview",
};
// Pages in llms.txt that no menu lists, after the menu's pages.
const PAGES: string[] = [];
// Published Markdown or text files llms.txt includes as they are, after the
// pages: each module's generated API reference, in the API index's order,
// then any module it doesn't group.
const API_MODULES = readdirSync(join(process.argv[2] ?? "_site", "docs/api"))
  .filter((f) => f.endsWith(".md") && f !== "index.md")
  .map((f) => f.replace(/\.md$/, ""))
  .sort((x, y) => {
    const rank = (m: string) => { const i = API_GROUPS.findIndex((g) => g.module === m); return i < 0 ? API_GROUPS.length : i; };
    return rank(x) - rank(y) || x.localeCompare(y);
  });
const TEXTS: { title: string; href: string }[] = API_MODULES.map((m) => ({
  title: `API reference: ${API_GROUPS.find((g) => g.module === m)?.importPath ?? `@smart-health-checkin/client/${m}`}`,
  href: `docs/api/${m}.md`,
}));
// Elements inside <main> that are page furniture, not content: the docs'
// rail, the phone's "In this section", and the previous and next links.
const DROP = ["nav", ".rail", "details.rail-phone", ".pager"];
// The menus, which order the pages: Developers, then Demos.
const NAV: string | object | object[] = [{ file: "nav.json" }, { file: "demo/nav.json" }];
// Where the shared background comes from: the apex's published copy.
const BACKGROUND_FROM = "https://smart-health-checkin.org/llms-background.md";
// Section-specific changes to a page's <main> before conversion: the API
// index's name-and-description grid becomes a list.
const PREPARE = (main: any, doc: any): void => {
  for (const grid of Array.from(main.querySelectorAll(".api-list")) as any[]) {
    const ul = doc.createElement("ul");
    for (const a of (Array.from(grid.children) as any[]).filter((c) => c.nodeName === "A")) {
      const li = doc.createElement("li");
      li.appendChild(a.cloneNode(true));
      const what = a.nextElementSibling;
      if (what?.nodeName === "SPAN") li.appendChild(doc.createTextNode(`: ${what.textContent.trim()}`));
      ul.appendChild(li);
    }
    grid.replaceWith(ul);
  }
};

// ---------------------------------------------------------------- shared
// Everything below is the same in every repo's scripts/llms.ts (apex, spec,
// client, connectathon). Change it in all four together.
// Every section's base; each publishes its own llms.txt.
const SECTIONS = ["/", "/spec/", "/client/", "/connectathon/"];
const BACKGROUND_URL = `${ORIGIN}/llms-background.md`;

const OUT = process.argv[2] ?? "_site";
const SITE = `${ORIGIN}${BASE}`;
const die = (msg: string): never => {
  console.error(`llms: ${msg}`);
  process.exit(1);
};

async function loadBackground(): Promise<string> {
  const src = process.env.LLMS_BACKGROUND ?? BACKGROUND_FROM;
  let text = "";
  let problem = "";
  for (let attempt = 1; attempt <= 3 && !text; attempt++) {
    try {
      if (/^https?:/.test(src)) {
        const res = await fetch(src, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        text = await res.text();
      } else {
        text = readFileSync(src, "utf8");
      }
    } catch (e) {
      problem = (e as Error).message;
      if (attempt < 3) await Bun.sleep(2000 * attempt);
    }
  }
  if (!text) die(`couldn't read the shared background from ${src} (${problem}). The apex repo publishes it; set LLMS_BACKGROUND to a local copy to build offline.`);
  if (!text.startsWith("# SMART Health Check-in")) die(`${src} doesn't look like the shared background (it should start with "# SMART Health Check-in").`);
  return text.trim();
}

// ---------------------------------------------------------------- HTML to Markdown
const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
const cellText = (cell: any): string =>
  turndown.turndown(cell.innerHTML).replace(/\s*\n+\s*/g, " ").replace(/\|/g, "\\|").trim();
turndown.addRule("table", {
  filter: "table",
  replacement: (_content, node: any) => {
    const rows = Array.from(node.querySelectorAll("tr")) as any[];
    if (!rows.length) return "";
    const cells = rows.map((r) => (Array.from(r.children) as any[]).filter((c) => /^T[HD]$/.test(c.nodeName)).map(cellText));
    const width = Math.max(...cells.map((r) => r.length));
    const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? "").join(" | ")} |`;
    return `\n\n${line(cells[0]!)}\n| ${Array(width).fill("---").join(" | ")} |\n${cells.slice(1).map(line).join("\n")}\n\n`;
  },
});
turndown.addRule("pre", {
  filter: "pre",
  replacement: (_content, node: any) => {
    const text = String(node.textContent).replace(/\n+$/, "");
    if (!text.trim()) return "";
    const cls = `${node.getAttribute("class") ?? ""} ${node.querySelector("code")?.getAttribute("class") ?? ""}`;
    const lang = node.getAttribute("data-lang") ?? cls.match(/language-([\w-]+)/)?.[1] ?? (/\bmermaid\b/.test(cls) ? "mermaid" : "");
    const fence = "`".repeat(Math.max(3, ...(text.match(/`{3,}/g) ?? []).map((f) => f.length + 1)));
    return `\n\n${fence}${lang}\n${text}\n${fence}\n\n`;
  },
});
// Text reads as written: no backslashes before brackets, dots, or underscores.
turndown.escape = (text: string) => text;
turndown.addRule("listItem", {
  filter: "li",
  replacement: (content, node: any) => {
    const parent = node.parentNode;
    const start = Number(parent.getAttribute?.("start") ?? 1);
    const prefix = parent.nodeName === "OL" ? `${start + Array.prototype.indexOf.call(parent.children, node)}. ` : "- ";
    const body = content.replace(/^\n+/, "").replace(/\n+$/, "\n").replace(/\n/gm, `\n${" ".repeat(prefix.length)}`);
    return prefix + body + (node.nextSibling && !/\n$/.test(body) ? "\n" : "");
  },
});
turndown.addRule("dt", { filter: "dt", replacement: (content) => `\n\n**${content.trim()}**\n` });
turndown.addRule("dd", { filter: "dd", replacement: (content) => `: ${content.trim().replace(/\n+/g, " ")}\n` });
turndown.addRule("figure-caption", { filter: "figcaption", replacement: (content) => `\n\n${content.trim()}\n\n` });

const all = (root: any, sel: string): any[] => Array.from(root.querySelectorAll(sel));

/** The Markdown of a built page's <main>, with links made absolute. */
function pageToMarkdown(html: string, url: string): { title: string; markdown: string } {
  const doc = domino.createDocument(html);
  const main = doc.querySelector("main#main") ?? doc.querySelector("main") ?? doc.body;
  const remove = (sel: string) => all(main, sel).forEach((el: any) => el.remove());
  for (const sel of ["script", "style", "noscript", "template", "link", "button", "input", "select", "textarea", "[aria-hidden='true']", ".xd-narrow", "[data-smart-topbar]", "[data-smart-breadcrumb]", "[data-smart-footer]", ...DROP]) remove(sel);
  PREPARE(main, doc);
  // A Mermaid diagram keeps its source, as code.
  all(main, ".mermaid:not(pre)").forEach((el: any) => {
    const pre = doc.createElement("pre");
    pre.setAttribute("data-lang", "mermaid");
    pre.textContent = el.textContent.trim();
    el.replaceWith(pre);
  });
  // A drawing becomes its accessible name and description.
  all(main, "svg").forEach((svg: any) => {
    const words = [svg.querySelector("title")?.textContent, svg.querySelector("desc")?.textContent, svg.getAttribute("aria-label")]
      .map((s) => (s ?? "").replace(/\s+/g, " ").trim()).filter(Boolean)
      .map((s) => (/[.!?:]$/.test(s) ? s : `${s}.`));
    const p = doc.createElement("p");
    p.textContent = words.length ? `Diagram: ${[...new Set(words)].join(" ")}` : "";
    svg.replaceWith(p);
  });
  all(main, "a[href]").forEach((a: any) => {
    const href = a.getAttribute("href");
    if (/^(javascript|data):/i.test(href)) return a.removeAttribute("href");
    try { a.setAttribute("href", new URL(href, url).href); } catch {}
  });
  // A card that is one big link: the link moves onto its heading (or a line
  // of its own), and the card's text stays plain.
  all(main, "a[href]").forEach((a: any) => {
    if (!a.querySelector("h1, h2, h3, h4, h5, h6, p, div, ul, ol")) return;
    const link = doc.createElement("a");
    link.setAttribute("href", a.getAttribute("href"));
    const heading = a.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading) {
      link.textContent = heading.textContent.trim();
      heading.textContent = "";
      heading.appendChild(link);
    } else {
      link.textContent = a.getAttribute("href");
      const p = doc.createElement("p");
      p.appendChild(link);
      a.appendChild(p);
    }
    while (a.firstChild) a.parentNode.insertBefore(a.firstChild, a);
    a.remove();
  });
  all(main, "img[src]").forEach((img: any) => {
    try { img.setAttribute("src", new URL(img.getAttribute("src"), url).href); } catch {}
  });
  const h1 = main.querySelector("h1");
  const title = (h1?.textContent ?? doc.title ?? url).replace(/\s+/g, " ").trim();
  h1?.remove();
  const markdown = turndown.turndown(main.innerHTML).replace(/\n{3,}/g, "\n\n").trim();
  return { title, markdown };
}

// ---------------------------------------------------------------- the pages
type NavItem = { title: string; href?: string; items?: NavItem[] };
type NavSource = { file: string } | { nav: NavItem };

/** The built file a URL in this section is served from, or undefined outside it. */
function fileFor(url: string): string | undefined {
  const u = new URL(url);
  if (u.origin !== ORIGIN || !u.pathname.startsWith(BASE)) return undefined;
  if (SECTIONS.some((s) => s !== BASE && s.startsWith(BASE) && u.pathname.startsWith(s))) return undefined;
  const rel = decodeURIComponent(u.pathname.slice(BASE.length));
  return !rel || rel.endsWith("/") ? join(OUT, rel, "index.html") : join(OUT, rel);
}
const pageKey = (url: string): string => {
  const u = new URL(url);
  return `${u.origin}${u.pathname.replace(/index\.html$/, "")}`;
};
/** A menu href as a URL. Hrefs are relative to their nav.json; a root-relative
 * one without this section's base comes from a standalone build (the client's
 * SITE_BASE unset) and is relative to the section. */
const navUrl = (href: string, navFileUrl: string): string =>
  href.startsWith("/") && !href.startsWith(BASE) ? new URL(href.slice(1), SITE).href : new URL(href, navFileUrl).href;

// The pages in order: the section's front page, then each menu's front page
// and its entries in menu order.
const pageUrls: string[] = [];
const seen = new Set<string>();
const addPage = (url: string) => {
  const file = fileFor(url);
  if (!file || !file.endsWith(".html") || !existsSync(file) || seen.has(pageKey(url))) return;
  seen.add(pageKey(url));
  pageUrls.push(pageKey(url));
};
addPage(SITE);
const navSources = (typeof NAV === "string" ? [{ file: NAV }] : Array.isArray(NAV) ? NAV : [{ nav: NAV }]) as NavSource[];
for (const source of navSources) {
  const nav: NavItem = "file" in source ? JSON.parse(readFileSync(join(OUT, source.file), "utf8")) : source.nav;
  const navFileUrl = "file" in source ? new URL(source.file, SITE).href : SITE;
  addPage(navUrl(nav.href ?? "./", navFileUrl));
  const walk = (items: NavItem[]): void => items.forEach((i) => (i.items ? walk(i.items) : i.href && addPage(navUrl(i.href, navFileUrl))));
  walk(nav.items ?? []);
}
for (const href of PAGES) {
  const url = new URL(href, SITE).href;
  if (!existsSync(fileFor(url) ?? "")) die(`PAGES names ${url}, but the build has no such file`);
  addPage(url);
}
// Published Markdown or text files included as they are, after the pages.
const texts = TEXTS.map((t) => ({ ...t, url: new URL(t.href, SITE).href }));
for (const t of texts) if (!existsSync(fileFor(t.url) ?? "")) die(`TEXTS names ${t.url}, but the build has no such file`);

const htmlFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith(".html") ? [p] : [];
  });
const unlisted: string[] = [];
for (const file of htmlFiles(OUT).sort()) {
  const rel = relative(OUT, file);
  if (rel === "404.html" || Object.keys(SKIP).some((k) => (k.endsWith("/") ? rel.startsWith(k) : rel === k))) continue;
  if (!seen.has(pageKey(`${SITE}${rel}`))) unlisted.push(rel);
}
if (unlisted.length) die(`these pages are in the site but not in the menu, PAGES, or SKIP in scripts/llms.ts: ${unlisted.join(", ")}`);

// ---------------------------------------------------------------- write
const background = await loadBackground();
const sectionTitle = TITLE.replace(/^SMART Health Check-in: /, "");

const pages = pageUrls.map((url) => {
  const { title, markdown } = pageToMarkdown(readFileSync(fileFor(url)!, "utf8"), url);
  return `# ${title}\n\nSource: ${url}\n\n${markdown}`;
});
for (const t of texts) {
  // Relative links become absolute, as in the pages.
  const text = readFileSync(fileFor(t.url)!, "utf8").trim()
    .replace(/\]\((?![a-z][a-z0-9+.-]*:|#)([^)\s]+)\)/gi, (m, href) => { try { return `](${new URL(href, t.url).href})`; } catch { return m; } });
  const title = text.match(/^# (.+)/)?.[1] ?? t.title;
  pages.push(`# ${title}\n\nSource: ${t.url}\n\n${text.replace(/^# .+\n*/, "")}`);
}
const llms = [
  `# ${TITLE}`,
  "",
  `> ${SUMMARY}`,
  "",
  `This file is the shared background (${BACKGROUND_URL}) followed by the full text of the ${pages.length} pages of this section (${sectionTitle}), converted to Markdown. The other sections' llms.txt files are listed under "The site" in the background.`,
  "",
  "---",
  "",
  background,
  ...pages.flatMap((p) => ["", "---", "", p]),
  "",
].join("\n");

writeFileSync(join(OUT, "llms.txt"), llms);
console.log(`llms.txt: ${pages.length} pages, ${(Buffer.byteLength(llms) / 1024).toFixed(1)} KB`);
