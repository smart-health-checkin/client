/**
 * The curated API index.
 *
 * TypeDoc's own index is a table of module names with empty descriptions —
 * true, and useless. This groups the exports by what you'd be trying to do,
 * and a build-time check asserts every runtime export is listed, so the
 * curation cannot silently fall behind the code.
 */

export type ApiGroup = {
  title: string;
  blurb: string;
  module: "checkin" | "fhir";
  entries: Array<{ name: string; what: string }>;
};

export const API_GROUPS: ApiGroup[] = [
  {
    title: "Run a check-in",
    blurb: "Almost every integration is one of these two calls.",
    module: "checkin",
    entries: [
      { name: "requestCheckin", what: "Ask, await, get the validated response. Throws CheckinFlowError if the flow doesn't complete." },
      { name: "runCheckin", what: "The same flow, reported as a status instead of thrown — branch on completed / declined / unsupported / error." },
      { name: "CheckinFlowError", what: "Carries the outcome, so a decline can fall back gracefully." },
      { name: "CheckinOptions", what: "Mediator and key-custody options for either call." },
      { name: "CheckinOutcome", what: "Status, the request as sent, the response, and the failing stage if any." },
    ],
  },
  {
    title: "Describe what you need",
    blurb: "Build a request inline, or name one for reuse.",
    module: "checkin",
    entries: [
      { name: "buildRequest", what: "Complete a request from purpose + items; fills in protocol boilerplate and validates." },
      { name: "registerScenario", what: "Name a request so other surfaces can refer to it." },
      { name: "resolveScenario", what: "Look a registered scenario back up." },
      { name: "resolveRequest", what: "Normalize any accepted request input into a full request object." },
      { name: "SCENARIOS", what: "The demo scenarios that ship with the library." },
      { name: "CheckinRequestInit", what: "The inline shape: purpose, items, optional id and fhirVersions." },
      { name: "CheckinRequestInput", what: "Anything the API accepts: inline init, full request, or { scenario }." },
      { name: "Scenario", what: "A named request plus its label and description." },
    ],
  },
  {
    title: "Answer without a platform wallet",
    blurb: "Mediators that let the whole flow run in any browser, or in a test.",
    module: "checkin",
    entries: [
      { name: "createWebWalletCredentialGetter", what: "Hand the request to a wallet web app in a tab — a real consent screen." },
      { name: "createMockWalletCredentialGetter", what: "Answer instantly with fabricated data, for scripted tests." },
      { name: "WalletDeclinedError", what: "Thrown when the person declines or closes the wallet." },
      { name: "WebWalletOptions", what: "Wallet URL, tab vs popup, timeout." },
      { name: "detectDcApiSupport", what: "Whether this browser can reach a platform wallet — checked before any prompt." },
      { name: "DcApiSupport", what: "Supported, or unsupported with a reason to show." },
      { name: "WebWalletCredential", what: "The credential shape a web wallet posts back." },
      { name: "WebWalletResponseMessage", what: "The approve / decline / error message a web wallet sends." },
      { name: "WEB_WALLET_READY_MESSAGE_TYPE", what: "postMessage type: the wallet is ready for a request." },
      { name: "WEB_WALLET_REQUEST_MESSAGE_TYPE", what: "postMessage type: here is the request." },
      { name: "WEB_WALLET_RESPONSE_MESSAGE_TYPE", what: "postMessage type: here is the answer." },
    ],
  },
  {
    title: "Build a wallet (the responder side)",
    blurb: "What the demo wallet uses; useful if you're implementing one.",
    module: "checkin",
    entries: [
      { name: "parseWalletRequest", what: "Recover the check-in request from a navigator.credentials.get argument." },
      { name: "sealWalletResponse", what: "Sign and HPKE-seal a response, bound to the verifier's origin." },
      { name: "fabricateResponse", what: "Demo data for a request, honouring per-item consent." },
      { name: "ParsedWalletRequest", what: "The request plus the raw DeviceRequest and encryptionInfo bytes." },
      { name: "MockWalletOptions", what: "Origin, and an optional responder function." },
    ],
  },
  {
    title: "Key custody",
    blurb: "Where the verifier's private key lives.",
    module: "checkin",
    entries: [
      { name: "createBrowserLocalAuthority", what: "Keys in page memory — the default, demo-grade." },
      { name: "createServerAuthority", what: "Client for a server that holds the keys (two-call HTTP contract)." },
      { name: "VerifierAuthority", what: "The seam itself, if you want to implement your own." },
      { name: "PreparedCredentialRequest", what: "Handle plus the argument to pass to the browser." },
      { name: "CredentialCompletion", what: "The opened response and its presentation context." },
      { name: "extractDcapiResponse", what: "Pull the protocol payload out of a browser credential object." },
    ],
  },
  {
    title: "Validate and inspect",
    blurb: "The checks the library already runs — exported so you can run them yourself.",
    module: "checkin",
    entries: [
      { name: "validateSmartCheckinRequest", what: "Shape-check an untrusted request." },
      { name: "validateSmartCheckinResponse", what: "Shape-check an untrusted response." },
      { name: "validateResponseAgainstRequest", what: "Cross-check a response against the request that asked for it." },
      { name: "ValidationResult", what: "Ok with a typed value, or an error string." },
    ],
  },
  {
    title: "Protocol model",
    blurb: "The wire types, if you're reading or constructing payloads directly.",
    module: "checkin",
    entries: [
      { name: "SmartCheckinRequest", what: "The request as it goes over the wire." },
      { name: "SmartCheckinRequestItem", what: "One requested thing: title, selector, accepted formats." },
      { name: "SmartCheckinContentSelector", what: "selection.fhir or form.fhir." },
      { name: "SmartCheckinResponse", what: "Artifacts plus per-item status." },
      { name: "SmartArtifact", what: "One returned artifact: FHIR JSON or a SMART Health Card." },
      { name: "SmartArtifactBase", what: "Fields common to every artifact." },
      { name: "SmartCheckinItemStatus", what: "fulfilled / partial / unavailable / declined / unsupported / error." },
      { name: "SmartHealthCheckinAcceptedMediaType", what: "The media types an item may accept." },
      { name: "FhirCanonical", what: "A canonical URL, optionally with |version." },
      { name: "FhirProfileCollectionRef", what: "A profile family or IG canonical." },
      { name: "FhirResourceType", what: "A FHIR resource type name." },
      { name: "FhirVersion", what: "e.g. \"4.0.1\"." },
      { name: "PROTOCOL_ID", what: "The Digital Credentials API protocol identifier." },
      { name: "MDOC_DOC_TYPE", what: "The registered mdoc docType." },
      { name: "MDOC_NAMESPACE", what: "The registered mdoc namespace." },
      { name: "SMART_REQUEST_INFO_KEY", what: "Where the request rides inside the mdoc request." },
      { name: "SMART_RESPONSE_ELEMENT_ID", what: "The element the response comes back in." },
      { name: "OrgIsoMdocNavigatorArgument", what: "The exact object passed to navigator.credentials.get." },
      { name: "DcapiMdocResponse", what: "The sealed response envelope." },
    ],
  },
  {
    title: "Write FHIR (optional module)",
    blurb: "Imported separately from @smart-health-checkin/checkin-client/fhir — nothing in the check-in path depends on it.",
    module: "fhir",
    entries: [
      { name: "buildCheckinBundle", what: "Map a response to a transaction Bundle with Provenance. Pure — no network." },
      { name: "postCheckinBundle", what: "Send it, in transaction or individual mode, with your own fetch if you like." },
      { name: "CheckinBundle", what: "The entries and the assembled Bundle." },
      { name: "CheckinBundleEntry", what: "One resource, its fullUrl, and the artifact it came from." },
      { name: "CheckinBundleContext", what: "Patient and appointment references to stamp — never guessed." },
      { name: "PostMode", what: "transaction (default) or individual." },
      { name: "PostResult", what: "What was sent and what the server said." },
      { name: "FetchLike", what: "The fetch signature, so you can inject auth." },
      { name: "CHECKIN_REQUEST_ID_SYSTEM", what: "Identifier system for the check-in request id in Provenance." },
      { name: "CHECKIN_APPOINTMENT_SYSTEM", what: "Identifier system for the appointment context." },
    ],
  },
];

/** TypeDoc's markdown anchors are the lower-cased symbol name. */
export const anchorFor = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "");
