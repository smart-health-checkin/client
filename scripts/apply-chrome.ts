/**
 * The demo pages and the shared site chrome.
 *
 * The chrome lives at the apex (/assets/…); each demo page carries its own
 * mount points (bar, breadcrumb, <main id="main">, footer), as MAINTAINING.md
 * "The shared site" describes. This script checks that they do, and gives the
 * one generated page, the tutorial's finished page, the tool bar.
 *
 * native-bridge.html is deliberately left bare: native apps open it in a
 * Custom Tab mid-flow (docs/native-apps.md), where site navigation would
 * only lead the person away from the app that is waiting for them.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CHROME_ASSETS } from "./site-chrome.ts";
import { OUT_ROOT } from "./site-base.ts";

const PRECONNECT = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;

// The tutorial's page is exactly what docs/tutorial.md says to save, so its
// own body rules stay; they move to <main> so the bar and footer span the page.
const tutorial = `${OUT_ROOT}/demo/tutorial.html`;
if (existsSync(tutorial)) {
  let html = readFileSync(tutorial, "utf8");
  if (!html.includes("site-chrome.js")) {
    html = html
      .replace("</head>", `${PRECONNECT}\n${CHROME_ASSETS}\n<style>
  /* Site chrome around the tutorial's page: its body layout applies to <main>. */
  body { max-width: none; margin: 0; padding: 0; }
  #main { max-width: 40rem; margin: 2rem auto; padding: 0 1rem; min-height: 100vh; }
</style>\n</head>`)
      .replace(/<body>\s*/, `<body>
<div data-smart-topbar="tool" data-tool-title="Tutorial page" data-back-href="../docs/tutorial.html" data-back-label="Tutorial"></div>
<main id="main">
`)
      .replace(/\s*<\/body>/, `\n</main>\n<div data-smart-footer></div>\n</body>`);
    writeFileSync(tutorial, html);
  }
  console.log("chrome: demo/tutorial.html");
}

// Every demo page carries the chrome and one <h1>.
const problems: string[] = [];
for (const file of ["index.html", "autofill.html", "react.html", "angular.html", "kiosk.html", "handoff.html", "picker.html", "wallet.html", "tutorial.html"]) {
  const path = `${OUT_ROOT}/demo/${file}`;
  if (!existsSync(path)) continue;
  const html = readFileSync(path, "utf8");
  for (const needle of ["/assets/site-chrome.js", "data-smart-topbar", "data-smart-footer", '<main id="main"']) {
    if (!html.includes(needle)) problems.push(`demo/${file}: missing ${needle}`);
  }
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) problems.push(`demo/${file}: ${h1s} <h1> elements; a page has exactly one`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
