/**
 * Gives the demo pages the shared site chrome.
 *
 * The chrome lives at the apex (/assets/…), so this only makes sure each page
 * loads it and carries the mount points. Idempotent: a page that already has
 * them keeps what it has.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CHROME_ASSETS, header, shallowFooter } from "./site-chrome.ts";
import { OUT_ROOT } from "./site-base.ts";

function mount(html: string, foot: string): string {
  let out = html.includes("site-chrome.js") ? html : html.replace("</head>", `${CHROME_ASSETS}\n</head>`);
  if (!out.includes("data-smart-topbar")) out = out.replace(/<body([^>]*)>\s*/i, (m) => `${m}\n${header()}\n`);
  if (!out.includes("smart-footer")) out = out.replace(/<\/body>/i, `${foot}\n</body>`);
  return out;
}

// Demo pages keep their in-character look and their DEMO strip, and get a
// one-line footer — the site map belongs on docs pages, not under a form.
// wallet.html is deliberately absent: it simulates a separate product and
// carries no clinic-site chrome at all.
for (const file of ["index.html", "autofill.html", "react.html", "angular.html", "kiosk.html", "handoff.html"]) {
  const path = `${OUT_ROOT}/demo/${file}`;
  if (!existsSync(path)) continue;
  writeFileSync(path, mount(readFileSync(path, "utf8"), shallowFooter()));
  console.log("chrome:", `demo/${file}`);
}
