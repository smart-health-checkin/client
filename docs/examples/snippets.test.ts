/**
 * The TypeScript samples in the guides compile against the library as it is.
 * Each ts or tsx block in the listed sections becomes its own module, with the
 * guides' placeholders (myRequest, prefillMyForm, and the rest) declared, and
 * the package's import paths mapped to the source. Sections whose samples are
 * fragments or pseudo-code (a lone `accept` line, a type sketch) aren't listed.
 */
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");

/** The guide sections whose ts and tsx samples must typecheck. */
const SECTIONS: Array<{ file: string; heading: string }> = [
  { file: "docs/getting-started.md", heading: "Building a check-in page" },
  { file: "docs/getting-started.md", heading: "Building a wallet" },
  { file: "docs/wallets.md", heading: "In React" },
  { file: "docs/wallets.md", heading: "In Angular, Vue, and others" },
  { file: "docs/wallets.md", heading: "TypeScript and the element" },
  { file: "docs/wallets.md", heading: "Without the picker" },
  { file: "docs/wallets.md", heading: "Kinds of wallet" },
  { file: "docs/wallets.md", heading: "The kiosk" },
  { file: "docs/wallets.md", heading: "The phone page" },
  { file: "docs/wallets.md", heading: "Custom transports" },
  { file: "docs/requests.md", heading: "Building a request" },
  { file: "docs/responses.md", heading: "Responses" },
  { file: "docs/responses.md", heading: "Statuses" },
  { file: "docs/responses.md", heading: "Warnings" },
  { file: "docs/responses.md", heading: "SMART Health Cards" },
  { file: "docs/responses.md", heading: "Prefill, then ask only for what's missing" },
  { file: "docs/responses.md", heading: "Writing FHIR" },
  { file: "docs/production.md", heading: "Keeping the key on a server" },
  { file: "docs/native-apps.md", heading: "The bridge page" },
  { file: "docs/build-a-wallet.md", heading: "Web wallets" },
  { file: "docs/build-a-wallet.md", heading: "Matching records to items" },
  { file: "docs/testing.md", heading: "The mock wallet" },
  { file: "docs/testing.md", heading: "In unit tests" },
  { file: "docs/testing.md", heading: "Health cards when testing" },
  { file: "docs/testing.md", heading: "Reading a failed result" },
];

/** A section's own text, from its heading (any level) to the next heading at that level or above. */
function sectionBlocks(file: string, heading: string): Array<{ lang: string; code: string }> {
  const md = readFileSync(join(ROOT, file), "utf8");
  const match = new RegExp(`^(#{1,4}) ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\n`, "m").exec(md);
  if (!match) throw new Error(`${file}: no section "${heading}"`);
  const level = match[1]!.length;
  const rest = md.slice(match.index + match[0].length);
  const next = new RegExp(`^#{1,${Math.max(level, 2)}} `, "m").exec(rest.replace(/```[\s\S]*?```/g, (m) => m.replace(/#/g, " ")));
  const section = next ? rest.slice(0, next.index) : rest;
  return [...section.matchAll(/```(ts|tsx)\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1]!, code: m[2]! }));
}

const PLACEHOLDERS = `import type { CheckinResponse, CheckinResult, SmartCheckinRequest, Wallet } from "@smart-health-checkin/client";
import type { HandoffEnvelope, HandoffMailbox } from "@smart-health-checkin/client/handoff";
import type { SmartCheckinPicker } from "@smart-health-checkin/client/ui";
import type { MatchableEntry, SelectionContent } from "@smart-health-checkin/client/wallet";
import type { SmartCheckinResponse } from "@smart-health-checkin/client/model";
declare global {
  const myRequest: SmartCheckinRequest;
  const button: HTMLButtonElement;
  const request: SmartCheckinRequest;
  const purpose: string;
  const items: SmartCheckinRequest["items"];
  const wallet: Wallet;
  const result: CheckinResult;
  const response: CheckinResponse;
  const jwks: { keys: JsonWebKey[] };
  const myAllergyBundle: object;
  const myMailbox: HandoffMailbox;
  const sessionId: string;
  const envelope: HandoffEnvelope;
  const picker: SmartCheckinPicker;
  const myShareButton: HTMLButtonElement;
  const myTransport: { ask(argument: unknown): Promise<unknown>; close(): void };
  const item: { content: SelectionContent };
  const patientBundle: { entry: MatchableEntry[] };
  const patientFullUrl: string;
  // Samples that continue an earlier one use its imports without repeating them.
  const runCheckin: typeof import("@smart-health-checkin/client").runCheckin;
  const mockWallet: typeof import("@smart-health-checkin/client/testing").mockWallet;
  const answerHandoff: typeof import("@smart-health-checkin/client/handoff").answerHandoff;
  function prefillMyForm(response: CheckinResponse): void;
  function showOutcome(result: CheckinResult): void;
  function showMyReceipt(reference: string | undefined): void;
  function askMyFormAbout(itemId: string): void;
  function drawMyQrCode(url: string): void;
  function showMyConsentScreen(request: SmartCheckinRequest): void;
  // Two consent screens: the Overview's returns the response; the Wallet guide's says what the patient chose.
  function showConsentScreen(request: SmartCheckinRequest, origin: string): Promise<SmartCheckinResponse>;
  function showConsentScreen(request: SmartCheckinRequest, origin: string, unsupported: unknown): Promise<
    | { kind: "closed" }
    | { kind: "declined-all" }
    | { kind: "failed" }
    | { kind: "shared"; response: SmartCheckinResponse }
  >;
  function showError(message: string): void;
  function sha256Hex(text: string): Promise<string>;
  function showLandingPage(): void;
  function setResponse(response: CheckinResponse | undefined): void;
  function setNote(note: string): void;
}
export {};
`;

test("the guides' TypeScript samples typecheck", () => {
  const blocks = SECTIONS.flatMap(({ file, heading }) => {
    const found = sectionBlocks(file, heading);
    if (!found.length) throw new Error(`${file}: "${heading}" has no ts or tsx samples`);
    return found.map((b) => ({ ...b, where: `${file} § ${heading}` }));
  });

  const dir = mkdtempSync(join(tmpdir(), "shc-snippets-"));
  try {
    writeFileSync(join(dir, "placeholders.d.ts"), PLACEHOLDERS);
    const files = blocks.map((b, i) => {
      const name = `snippet-${i}.${b.lang}`;
      // Every sample is its own module, so its names don't collide with another's.
      writeFileSync(join(dir, name), `// ${b.where}\n${b.code}\nexport {};\n`);
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
          types: ["bun"],
          typeRoots: [join(ROOT, "node_modules/@types")],
          paths: {
            "@smart-health-checkin/client": [join(ROOT, "src/index.ts")],
            ...Object.fromEntries(
              ["ui", "react", "picker", "wallet", "handoff", "fhir", "testing", "model", "wire"].map((e) => [
                `@smart-health-checkin/client/${e}`,
                src(e),
              ]),
            ),
            "react": [join(ROOT, "node_modules/@types/react/index.d.ts")],
            "react/jsx-runtime": [join(ROOT, "node_modules/@types/react/jsx-runtime.d.ts")],
            "@angular/core": [join(ROOT, "node_modules/@angular/core/types/core.d.ts")],
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
    expect(run.exitCode).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 120_000);
