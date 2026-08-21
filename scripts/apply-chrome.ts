/** Injects the shared site header/footer into pages built outside render-docs. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CHROME_CSS, footer, header, wrapVendored, type Section } from "./site-chrome.ts";

// Landing page: full chrome, styled inline with its own tokens.
const landing = "_site/index.html";
if (existsSync(landing)) {
  let html = readFileSync(landing, "utf8");
  html = html
    .replace("</style>", `${CHROME_CSS}\n</style>`)
    .replace(/<body>\s*/, `<body>\n${header("overview")}\n`)
    .replace(/<\/body>/, `${footer()}\n</body>`);
  // the page's own hand-rolled footer is now redundant
  html = html.replace(/<footer>[\s\S]*?<\/footer>/, "");
  writeFileSync(landing, html);
  console.log("chrome: landing");
}

// Vendored pages keep their own design; they just gain the nav bar.
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
