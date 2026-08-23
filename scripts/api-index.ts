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
    title: "Build a request",
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
    title: "Run without a platform wallet",
    blurb: "Credential getters — the function the flow calls to get the wallet's answer — that let it run in any browser, or in a test.",
    module: "checkin",
    entries: [
      { name: "createWebWalletCredentialGetter", what: "Hand the request to a wallet web app in a tab — a real consent screen." },
      { name: "createMockWalletCredentialGetter", what: "Answer instantly — either with fabricated data or with exactly the data your test pins, per item." },
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
    title: "Configure responding wallets",
    blurb: "State which wallets may answer; the library resolves that into a list your page renders, and turns the one the person picks back into a credential getter.",
    module: "checkin",
    entries: [
      { name: "resolveResponders", what: "Turn a policy (platform? which web wallets? mock? which leads?) into the concrete options, with the unavailable ones and the default marked." },
      { name: "credentialGetterFor", what: "The credential getter for the responder the person picked — pass it straight to requestCheckin." },
      { name: "ResponderPolicy", what: "What this relying party accepts — platform, a web-wallet list or URL, mock — and which one is the default." },
      { name: "Responder", what: "One renderable option: id, name, description, icon, whether it works here, and whether it is the default." },
      { name: "loadWalletRegistry", what: "Resolve a wallet list from an inline array, an object, or a URL." },
      { name: "validateWalletRegistry", what: "Shape-check a registry before trusting it." },
      { name: "findWallet", what: "Look a registry entry up by id." },
      { name: "DEMO_WALLET_REGISTRY", what: "The built-in list of one: this project's demo wallet." },
      { name: "WalletRegistry", what: "A list of web wallets, plus where it came from." },
      { name: "WebWalletEntry", what: "One wallet: id, name, walletUrl, and presentation details." },
    ],
  },
  {
    title: "Hand off to the patient's phone",
    blurb: "A kiosk or front-desk screen mints the request and shows a QR; the phone asks its wallet and sends the sealed answer back. You supply the mailbox.",
    module: "checkin",
    entries: [
      { name: "createHandoff", what: "Everything a kiosk passes to runCheckin: an authority for the hand-off page's origin, and a getCredential that posts, shows the QR, and waits." },
      { name: "createHandoffCredentialGetter", what: "Just the getCredential half, if you build the authority yourself." },
      { name: "fetchHandoff", what: "Phone side, step one: pick the request up and recover what it asks for." },
      { name: "answerHandoff", what: "Phone side, step two: ask the wallet (or any credential getter) and send the sealed credential — or a decline — back." },
      { name: "handoffUrlFor", what: "The URL the QR code carries: the hand-off page plus the session id." },
      { name: "sessionIdFromHash", what: "Read that session id back on the phone." },
      { name: "HandoffMailbox", what: "The seam you implement: post / fetch / answer / waitForAnswer, over any transport both devices reach." },
      { name: "HandoffEnvelope", what: "What the kiosk posts: the navigator argument, the hand-off origin, and an expiry." },
      { name: "HandoffAnswer", what: "What the phone posts back: the credential, or a decline." },
      { name: "HandoffOptions", what: "Mailbox, hand-off URL, the QR callback, TTL." },
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
      { name: "MockWalletOptions", what: "Per-item specs, a fallback, or a responder function for full control." },
      { name: "MockItemSpec", what: "What to return for one item: FHIR, a health card, or a status like declined; alsoFulfills lets one artifact answer several items." },
      { name: "MockItemSpecs", what: "One spec, or a list — several artifacts for one item." },
      { name: "DEMO_HEALTH_CARD_JWS", what: "A structurally real, unsigned SMART Health Card (deflated payload, one Patient and one Coverage) for demos and tests." },
      { name: "buildMockResponse", what: "Build a response from a per-item spec without going through the wire layer — handy in unit tests." },
    ],
  },
  {
    title: "Key custody",
    blurb: "Where the verifier's ephemeral key lives. Browser-local by default, and that is the design.",
    module: "checkin",
    entries: [
      { name: "createBrowserLocalAuthority", what: "Ephemeral single-use key in the page — the default, and the intended one." },
      { name: "createServerAuthority", what: "Client for a server that holds the keys, when the page deliberately shouldn't." },
      { name: "VerifierAuthority", what: "The seam itself, if you want to implement your own." },
      { name: "PreparedCredentialRequest", what: "Handle plus the argument to pass to the browser." },
      { name: "CredentialCompletion", what: "What an authority returns: the opened response, or handledByServer when the server kept it." },
      { name: "PresentationContext", what: "The origin the response was bound to, and the raw DeviceResponse for audit." },
      { name: "extractDcapiResponse", what: "Pull the protocol payload out of a browser credential object." },
    ],
  },
  {
    title: "The wire layer",
    blurb: "What an authority is made of — for a server that holds the key, in this language. Most pages never call these.",
    module: "checkin",
    entries: [
      { name: "buildOrgIsoMdocRequest", what: "Mint the HPKE keypair and build the navigator argument for a request and an origin." },
      { name: "buildDcapiSessionTranscript", what: "The session transcript the wallet will have bound its answer to: encryptionInfo plus the asking page's origin." },
      { name: "openWalletResponse", what: "HPKE-open a sealed response with the private key and that transcript." },
      { name: "verifyDeviceResponseSignatures", what: "Issuer signature, device signature, and MSO digests — the checks a browser-local authority runs." },
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
    blurb: "Imported separately from @smart-health-checkin/client/fhir — nothing in the check-in path depends on it.",
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
