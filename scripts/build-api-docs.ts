/**
 * Generates the API reference as markdown into docs/api/ (committed, so it
 * browses on GitHub) and normalizes TypeDoc's file names: the barrel entry
 * lands as `checkin.md` rather than `index-1.md`.
 */
import { $ } from "bun";
import { readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "docs/api";
await $`typedoc`.quiet();

const renames: Record<string, string> = { "index-1.md": "checkin.md" };
for (const [from, to] of Object.entries(renames)) {
  try {
    renameSync(join(DIR, from), join(DIR, to));
  } catch {
    /* already normalized */
  }
}

for (const file of readdirSync(DIR)) {
  if (!file.endsWith(".md")) continue;
  const path = join(DIR, file);
  let text = readFileSync(path, "utf8");
  for (const [from, to] of Object.entries(renames)) {
    text = text.replaceAll(from, to);
  }
  // TypeDoc calls the barrel "index"; call it what people import.
  text = text
    .replace(/^# index$/m, "# @smart-health-checkin/client")
    .replace(/\[index\]\(checkin\.md\)/g, "[checkin](checkin.md)")
    .replace(/^\| \[index\]/m, "| [checkin]");
  writeFileSync(path, text);
}

// A short preamble so the generated tree isn't the first thing a reader meets.
const indexPath = join(DIR, "index.md");
const index = readFileSync(indexPath, "utf8").replace(/^# .*$/m, "# API reference");
writeFileSync(
  indexPath,
  `${index.trimEnd()}

---

Generated from the source by TypeDoc, one page per entry point, so it
can't drift from the code. For explanation rather than signatures, start
with [Getting started](../getting-started.md).

Most EHR pages use \`<smart-checkin-picker>\` from \`/ui\`, or \`runCheckin\`
and \`CheckinResponse\` from the root module.
`,
);

console.log("API reference written to docs/api/");
