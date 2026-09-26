/**
 * The code in the Wallet picker guide's "Without the picker" section compiles
 * against the library as it is. Each ts or tsx block becomes its own module,
 * with the guide's placeholders (myRequest, prefillMyForm, showOutcome)
 * declared, and the package's import paths mapped to the source.
 */
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");

function sectionBlocks(file: string, heading: string): Array<{ lang: string; code: string }> {
  const md = readFileSync(join(ROOT, file), "utf8");
  const start = md.indexOf(`\n## ${heading}\n`);
  if (start < 0) throw new Error(`${file}: no section "${heading}"`);
  const end = md.indexOf("\n## ", start + 1);
  const section = md.slice(start, end < 0 ? undefined : end);
  return [...section.matchAll(/```(ts|tsx)\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1]!, code: m[2]! }));
}

test("the snippets in Without the picker typecheck", () => {
  const blocks = sectionBlocks("docs/wallets.md", "Without the picker");
  expect(blocks.length).toBeGreaterThanOrEqual(3);

  const dir = mkdtempSync(join(tmpdir(), "shc-snippets-"));
  try {
    writeFileSync(
      join(dir, "placeholders.d.ts"),
      `import type { CheckinResponse, CheckinResult, SmartCheckinRequest } from "@smart-health-checkin/client";
declare global {
  const myRequest: SmartCheckinRequest;
  function prefillMyForm(response: CheckinResponse): void;
  function showOutcome(result: CheckinResult): void;
}
export {};
`,
    );
    const files = blocks.map((b, i) => {
      const name = `snippet-${i}.${b.lang}`;
      writeFileSync(join(dir, name), b.code);
      return name;
    });
    const src = (entry: string) => [join(ROOT, `src/${entry}/index.ts`)];
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        extends: join(ROOT, "tsconfig.json"),
        compilerOptions: {
          noEmit: true,
          allowImportingTsExtensions: true,
          types: [],
          typeRoots: [join(ROOT, "node_modules/@types")],
          paths: {
            "@smart-health-checkin/client": [join(ROOT, "src/index.ts")],
            "@smart-health-checkin/client/react": src("react"),
            "@smart-health-checkin/client/picker": src("picker"),
            "@smart-health-checkin/client/testing": src("testing"),
            "react": [join(ROOT, "node_modules/@types/react/index.d.ts")],
            "react/jsx-runtime": [join(ROOT, "node_modules/@types/react/jsx-runtime.d.ts")],
          },
        },
        include: ["placeholders.d.ts", ...files],
      }),
    );
    const run = Bun.spawnSync([join(ROOT, "node_modules/.bin/tsc"), "-p", join(dir, "tsconfig.json")], { cwd: dir });
    const output = run.stdout.toString() + run.stderr.toString();
    if (run.exitCode !== 0) {
      const listing = files.map((f) => `--- ${f}\n${readFileSync(join(dir, f), "utf8")}`).join("\n");
      throw new Error(`${output}\n${listing}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 60_000);
