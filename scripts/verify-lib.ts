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

const request = checkin.buildRequest({
  purpose: "hosted bundle smoke test",
  items: [
    { id: "a", title: "A", content: { kind: "selection.fhir" }, accept: ["application/fhir+json"] },
  ],
});
if (request.type !== "smart-health-checkin-request") throw new Error("buildRequest is broken");

const support = checkin.detectDcApiSupport();
if (typeof support?.state !== "string") throw new Error("detectDcApiSupport is broken");

// Reaches the wire layer (CBOR + WebCrypto), so a stub cannot pass.
const walletRequest = await checkin.createMockWalletCredentialGetter({
  origin: "https://example.org",
});
const prepared = await checkin
  .createBrowserLocalAuthority({ origin: "https://example.org" })
  .prepareCredentialRequest({ request });
const credential = await walletRequest(prepared.navigatorArgument);
if (!credential?.data?.response) throw new Error("wire layer did not produce a sealed response");

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
    `fhir.js ${(fhirSize / 1024).toFixed(1)}KB, wire round-trip verified`,
);
