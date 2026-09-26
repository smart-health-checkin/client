/**
 * Guards the hosted ES modules: a bundle that imports and *runs* is the only
 * acceptable one.
 *
 * This exists because a tree-shaken shell — 772 bytes that exported all the
 * right names and contained none of the implementation — once shipped to
 * /lib and served happily with a 200 for a day. Status codes are not proof.
 */

const here = (p: string): string => new URL(p, import.meta.url).href;

const checkin = await import(here("../_site/lib/checkin.js"));
const fhir = await import(here("../_site/lib/fhir.js"));
const ui = await import(here("../_site/lib/ui.js"));
if (typeof ui.SmartCheckinPicker !== "function" || typeof ui.defineCheckinPicker !== "function") throw new Error("ui.js does not export the picker element");
if (!String(ui.PICKER_CSS).includes("--smart-checkin-accent")) throw new Error("ui.js is missing the picker styles");

const testing = await import(here("../_site/lib/testing.js"));
const walletLib = await import(here("../_site/lib/wallet.js"));
if (typeof walletLib.serveWebWallet !== "function") throw new Error("wallet.js does not export serveWebWallet");

const request = checkin.checkinRequest({
  purpose: "hosted bundle smoke test",
  items: [
    { id: "a", title: "A", content: { kind: "selection.fhir" }, accept: ["application/fhir+json"] },
  ],
});
if (request.type !== "smart-health-checkin-request") throw new Error("checkinRequest is broken");

const support = checkin.detectDcApiSupport();
if (typeof support?.state !== "string") throw new Error("detectDcApiSupport is broken");

// A whole check-in through the hosted bundles: the mock wallet seals over the
// wire layer (CBOR, COSE, HPKE) and checkin.js opens and validates it.
(globalThis as { location?: unknown }).location ??= { origin: "https://example.org", href: "https://example.org/" };
const result = await testing.mockWallet().start(request);
if (result.status !== "completed" || !result.response?.status("a")) {
  throw new Error(`hosted check-in round trip failed: ${JSON.stringify(result.status === "failed" ? result.error : result.status)}`);
}

const plan = fhir.buildCheckinBundle({
  request,
  response: {
    type: "smart-health-checkin-response",
    version: "1",
    requestId: request.id,
    artifacts: [
      {
        id: "x",
        mediaType: "application/fhir+json",
        fhirVersion: "4.0.1",
        fulfills: ["a"],
        value: { resourceType: "Observation", status: "final" },
      },
    ],
    requestStatus: [{ item: "a", status: "fulfilled" }],
  },
});
if (plan.entries.length < 2) throw new Error("buildCheckinBundle is broken");

const size = async (p: string): Promise<number> =>
  (await Bun.file(new URL(p, import.meta.url)).arrayBuffer()).byteLength;
const checkinSize = await size("../_site/lib/checkin.js");
const fhirSize = await size("../_site/lib/fhir.js");
if (checkinSize < 20_000) {
  throw new Error(`hosted checkin.js is only ${checkinSize} bytes — the implementation was tree-shaken away`);
}

console.log(
  `hosted bundles OK — checkin.js ${(checkinSize / 1024).toFixed(1)}KB (${Object.keys(checkin).length} exports), ` +
    `fhir.js ${(fhirSize / 1024).toFixed(1)}KB, full check-in round trip verified`,
);
