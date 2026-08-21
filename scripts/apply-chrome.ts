/** Injects the shared site header/footer into pages built outside render-docs. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CHROME_CSS, footer, header, wrapVendored, type Section } from "./site-chrome.ts";

// Landing page: full chrome, styled inline with its own tokens.
const landing = "_site/index.html";
if (existsSync(landing)) {
  let html = readFileSync(landing, "utf8");
  // the page's own hand-rolled footer is redundant once the site footer lands
  html = html.replace(/<footer>[\s\S]*?<\/footer>/, "");
  html = html
    .replace("</style>", `${CHROME_CSS}\n</style>`)
    .replace(/<body>\s*/, `<body>\n${header("overview")}\n`)
    .replace(/<\/body>/, `${footer()}\n</body>`);
  writeFileSync(landing, html);
  console.log("chrome: landing");
}

// Demo pages keep their in-character look and their DEMO strip, but end with
// the same deep footer so they're never a dead end.
for (const path of ["_site/demo/index.html", "_site/demo/autofill.html", "_site/demo/react.html"]) {
  if (!existsSync(path)) continue;
  let html = readFileSync(path, "utf8");
  if (html.includes("site-footer")) continue;
  html = html
    .replace("</style>", `${CHROME_CSS}\n</style>`)
    .replace(/<\/body>/, `${footer()}\n</body>`);
  writeFileSync(path, html);
  console.log("chrome:", path.replace("_site/", ""));
}

// Vendored pages keep their own design; they gain the bar and the footer.
const vendored: Array<[string, Section]> = [
  ["_site/spec/index.html", "spec"],
  ["_site/ktc/closing-the-loop/index.html", "ktc"],
];
for (const [path, section] of vendored) {
  if (!existsSync(path)) continue;
  const html = readFileSync(path, "utf8");
  if (html.includes("site-header")) continue;
  writeFileSync(path, wrapVendored(html, section));
  console.log("chrome:", path.replace("_site/", ""));
}
