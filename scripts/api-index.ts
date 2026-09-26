/**
 * The curated API index.
 *
 * TypeDoc's own index is a table of module names with empty descriptions:
 * true, and useless. This groups each entry point's exports by what you'd be
 * trying to do, and a build-time check asserts every runtime export of the
 * modules listed in CHECKED_MODULES appears here, so the curation can't fall
 * behind the code. `/model` and `/wire` are reference-only.
 */

export type ApiModule = "checkin" | "ui" | "react" | "picker" | "wallet" | "handoff" | "fhir" | "testing" | "model" | "wire";

export type ApiGroup = {
  title: string;
  blurb: string;
  module: ApiModule;
  /** How the module is imported. */
  importPath: string;
  entries: Array<{ name: string; what: string }>;
};

/** Modules whose every runtime export must be listed below. */
export const CHECKED_MODULES: Array<{ module: ApiModule; source: string }> = [
  { module: "checkin", source: "../src/index.ts" },
  { module: "ui", source: "../src/ui/index.ts" },
  { module: "react", source: "../src/react/index.ts" },
  { module: "picker", source: "../src/picker/index.ts" },
  { module: "wallet", source: "../src/wallet/index.ts" },
  { module: "handoff", source: "../src/handoff/index.ts" },
  { module: "testing", source: "../src/testing/index.ts" },
  { module: "fhir", source: "../src/fhir/index.ts" },
];

export const API_GROUPS: ApiGroup[] = [
  {
    title: "Run a check-in",
    blurb: "One call. Give it a request, and a wallet if the patient chose one.",
    module: "checkin",
    importPath: "@smart-health-checkin/client",
    entries: [
      { name: "runCheckin", what: "Ask a wallet, verify the answer, and report completed, declined, or failed. Call it inside the click." },
      { name: "CheckinResult", what: "What runCheckin returns: the status, the request, the wallet, and the response or the error." },
      { name: "CheckinOptions", what: "The wallet, key custody, health-card trust, and an AbortSignal." },
      { name: "checkinRequest", what: "Build and validate a request from a purpose and items." },
      { name: "CheckinRequestInit", what: "The parts of a request you write; the rest is filled in." },
      { name: "CheckinRequestInput", what: "A complete request or a CheckinRequestInit." },
    ],
  },
  {
    title: "Offer wallets",
    blurb: "Every way a patient can answer is a Wallet. Start one inside the click.",
    module: "checkin",
    importPath: "@smart-health-checkin/client",
    entries: [
      { name: "wallets", what: "The wallets a page offers: the phone's own, a registry's web wallets, and any extras." },
      { name: "Wallet", what: "One way to answer, with start() and open()." },
      { name: "WalletsOptions", what: "Registry, platform on or off, extra wallets." },
      { name: "platformWallet", what: "The phone's own wallet, through the Digital Credentials API." },
      { name: "webWallet", what: "A web wallet from a registry entry." },
      { name: "customWallet", what: "Wrap any transport as a wallet." },
      { name: "WalletSession", what: "An opened connection to a wallet: getCredential and cancel." },
      { name: "detectDcApiSupport", what: "Whether this browser has the Digital Credentials API." },
      { name: "DcApiSupport", what: "Supported, or unsupported with a reason." },
      { name: "WalletRegistry", what: "The wallets.json format." },
      { name: "WebWalletEntry", what: "One web wallet in a registry." },
    ],
  },
  {
    title: "Read the response",
    blurb: "The full JSON as received, plus lookups by request item.",
    module: "checkin",
    importPath: "@smart-health-checkin/client",
    entries: [
      { name: "CheckinResponse", what: "json, status(item), resources(item), form(item), healthCards(item), entries(item), items()." },
      { name: "FhirResource", what: "A FHIR resource as returned." },
      { name: "ResourceEntry", what: "A resource with where it came from: a Bundle or a health card, and the card's trust." },
      { name: "ItemStatus", what: "fulfilled, partial, declined, unavailable, unsupported, or error." },
    ],
  },
  {
    title: "SMART Health Card trust",
    blurb: "Cards are verified before the page sees the response, against trust you set once.",
    module: "checkin",
    importPath: "@smart-health-checkin/client",
    entries: [
      { name: "configureHealthCardTrust", what: "Trust a directory, issuers, or keys; accept any valid card, or everything, for testing." },
      { name: "healthCardTrust", what: "The trust currently configured." },
      { name: "HealthCardTrust", what: "directory, issuers, keys, and accept." },
      { name: "HealthCard", what: "One card: issuer, Bundle, valid, trusted, accepted, and why not." },
      { name: "VCI_DIRECTORY_URL", what: "Where the VCI issuer directory lives." },
    ],
  },
  {
    title: "Errors and key custody",
    blurb: "Failures carry a code. Keys stay in the page unless you put them on a server.",
    module: "checkin",
    importPath: "@smart-health-checkin/client",
    entries: [
      { name: "CheckinError", what: "An error with a code; wallet transports throw it." },
      { name: "CheckinErrorCode", what: "unsupported, blocked, timeout, wallet-error, invalid-response, server." },
      { name: "WalletDeclinedError", what: "Thrown by a transport when the patient says no; runCheckin reports declined." },
      { name: "KeyCustody", what: "Where the verifier key lives, for server-held keys." },
      { name: "PreparedCredentialRequest", what: "What key custody returns from prepare." },
      { name: "CredentialCompletion", what: "What key custody returns from complete." },
      { name: "PresentationContext", what: "The origin and DeviceResponse bytes, for audit." },
    ],
  },
  {
    title: "Protocol types",
    blurb: "The request and response as the spec defines them.",
    module: "checkin",
    importPath: "@smart-health-checkin/client",
    entries: [
      { name: "SmartCheckinRequest", what: "A complete request." },
      { name: "SmartCheckinRequestItem", what: "One item: id, title, content, accept." },
      { name: "SmartCheckinContentSelector", what: "selection.fhir or form.fhir." },
      { name: "SmartCheckinResponse", what: "The response: artifacts and requestStatus." },
      { name: "SmartArtifact", what: "One artifact and the items it fulfills." },
      { name: "SmartCheckinItemStatus", what: "One item's status." },
    ],
  },
  {
    title: "The picker element",
    blurb: "A drop-in <smart-checkin-picker>. Importing the module registers it.",
    module: "ui",
    importPath: "@smart-health-checkin/client/ui",
    entries: [
      { name: "SmartCheckinPicker", what: "The element's class: request, wallets, strings, checkinOptions, setOutcome, reset." },
      { name: "defineCheckinPicker", what: "Register it under another tag name." },
      { name: "PickerOutcome", what: "How a pick-mode check-in ended, for setOutcome." },
      { name: "DEFAULT_STRINGS", what: "Every piece of text it shows, to override or translate." },
      { name: "PickerStrings", what: "The shape of the strings." },
      { name: "PICKER_CSS", what: "Its stylesheet, with every --smart-checkin-* variable." },
      { name: "STARBURST_SVG", what: "The SMART mark, inline." },
      { name: "STARBURST_ICON_URL", what: "The SMART mark as a data: URL, for a registry iconUrl." },
    ],
  },
  {
    title: "React",
    blurb: "The same picker as a component, and a hook for your own buttons.",
    module: "react",
    importPath: "@smart-health-checkin/client/react",
    entries: [
      { name: "CheckinPicker", what: "<smart-checkin-picker> as a component with callbacks." },
      { name: "CheckinPickerProps", what: "Its props." },
      { name: "useCheckin", what: "The wallets to offer and start(wallet), for your own UI." },
    ],
  },
  {
    title: "Picker logic",
    blurb: "What the picker element is built on, for your own picker UI.",
    module: "picker",
    importPath: "@smart-health-checkin/client/picker",
    entries: [
      { name: "arrangeWallets", what: "What leads, what's listed, and what's behind \"more\"." },
      { name: "ArrangeOptions", what: "Inline limits, a preferred wallet." },
      { name: "ArrangedWallets", what: "primary, inline, more, all." },
      { name: "rememberChoice", what: "Remember the wallet used on this site." },
      { name: "recallChoice", what: "The remembered wallet, if any." },
      { name: "forgetChoice", what: "Forget it." },
      { name: "monogram", what: "A letter and color for a wallet without an icon." },
    ],
  },
  {
    title: "Build a wallet",
    blurb: "The protocol and matching rules. The consent screen is yours.",
    module: "wallet",
    importPath: "@smart-health-checkin/client/wallet",
    entries: [
      { name: "serveWebWallet", what: "The web wallet's side of the hand-off: one call." },
      { name: "ServeWebWalletOptions", what: "onRequest and onInvalidRequest." },
      { name: "WebWalletRequestContext", what: "The request and the EHR's origin, from the browser." },
      { name: "WebWalletAnswer", what: "A response to seal, a sealed credential, declined, or an error." },
      { name: "selects", what: "Does a resource answer a selection.fhir item?" },
      { name: "selectEntries", what: "The entries that answer it, plus what they reference." },
      { name: "SelectionContent", what: "A selection.fhir selector." },
      { name: "MatchableEntry", what: "A Bundle entry to match." },
      { name: "MatchableResource", what: "A resource to match." },
      { name: "parseWalletRequest", what: "Read the SMART request from the Digital Credentials API argument, with warnings." },
      { name: "ParsedWalletRequest", what: "The request, items to answer unsupported, warnings, and the wire pieces needed to answer." },
      { name: "WalletRequestError", what: "Thrown where spec §8.4 says not to respond; carries the requirement id." },
      { name: "checkWalletResponse", what: "What a Verifier would object to in a response, before sending it." },
      { name: "declineAll", what: "The response for a patient who reviewed and declined everything." },
      { name: "sealWalletResponse", what: "Sign and encrypt a response for the EHR's origin; optionally check it first." },
      { name: "buildSignedDeviceResponse", what: "The signed mdoc DeviceResponse, for wallets that seal it themselves." },
      { name: "recipientJwkFromEncryptionInfo", what: "The EHR's public key from encryptionInfo." },
      { name: "WEB_WALLET_READY_MESSAGE_TYPE", what: "The ready message type." },
      { name: "WEB_WALLET_REQUEST_MESSAGE_TYPE", what: "The request message type." },
      { name: "WEB_WALLET_RESPONSE_MESSAGE_TYPE", what: "The response message type." },
      { name: "WebWalletResponseMessage", what: "The response message." },
      { name: "WebWalletCredential", what: "The credential inside an approved response." },
    ],
  },
  {
    title: "Kiosk hand-off",
    blurb: "A screen with no wallet hands the request to the patient's phone.",
    module: "handoff",
    importPath: "@smart-health-checkin/client/handoff",
    entries: [
      { name: "handoffWallet", what: "The kiosk's \"use your phone\" option, as a wallet." },
      { name: "HandoffOptions", what: "Mailbox, hand-off page, and onWaiting for the QR code." },
      { name: "HandoffMailbox", what: "The mailbox you provide." },
      { name: "HandoffEnvelope", what: "What the kiosk posts." },
      { name: "HandoffAnswer", what: "What the phone posts back." },
      { name: "fetchHandoff", what: "Phone side: pick the request up." },
      { name: "answerHandoff", what: "Phone side: ask a wallet and send its answer back." },
      { name: "handoffUrlFor", what: "The URL the QR code carries." },
      { name: "sessionIdFromHash", what: "The session id on the hand-off page." },
    ],
  },
  {
    title: "Testing",
    blurb: "Check-ins without a real wallet. Never offer these to patients.",
    module: "testing",
    importPath: "@smart-health-checkin/client/testing",
    entries: [
      { name: "mockWallet", what: "A wallet that answers at once with the data you specify, or made-up data." },
      { name: "MockWalletOptions", what: "Per-item answers and a fallback." },
      { name: "MockItemSpec", what: "Data, a health card, or a status for one item." },
      { name: "MockItemSpecs", what: "One spec or several for an item." },
      { name: "buildMockResponse", what: "The response the mock would send, without the wire layer." },
      { name: "fabricateResponse", what: "Made-up data for any request." },
      { name: "DEMO_HEALTH_CARD_JWS", what: "A demo health card (not validly signed)." },
      { name: "DEMO_WALLET_REGISTRY", what: "This project's demo web wallet." },
    ],
  },
  {
    title: "Write FHIR",
    blurb: "Optional: map a response into a FHIR transaction for your server.",
    module: "fhir",
    importPath: "@smart-health-checkin/client/fhir",
    entries: [
      { name: "buildCheckinBundle", what: "Build a transaction Bundle from a response." },
      { name: "postCheckinBundle", what: "Post it to a FHIR server." },
      { name: "CheckinBundle", what: "The Bundle and its entries." },
      { name: "CheckinBundleEntry", what: "One entry." },
      { name: "CheckinBundleContext", what: "The patient and appointment to link to." },
      { name: "PostMode", what: "transaction or individual." },
      { name: "PostResult", what: "What the server returned." },
      { name: "FetchLike", what: "A fetch you supply." },
      { name: "CHECKIN_REQUEST_ID_SYSTEM", what: "Identifier system for the request id." },
      { name: "CHECKIN_APPOINTMENT_SYSTEM", what: "Identifier system for the appointment." },
    ],
  },
  {
    title: "Model and wire",
    blurb: "Types and validators, and the protocol bytes. See their reference pages.",
    module: "model",
    importPath: "@smart-health-checkin/client/model",
    entries: [
      { name: "parseSmartCheckinRequest", what: "Parse and validate request JSON text, rejecting duplicate members." },
      { name: "parseSmartCheckinResponse", what: "Parse and validate response JSON text, optionally against its request." },
      { name: "validateSmartCheckinRequest", what: "Validate a request; lists items a Wallet can't process." },
      { name: "validateSmartCheckinResponse", what: "Validate a response on its own." },
      { name: "validateResponseAgainstRequest", what: "Cross-check a response against its request, record by record." },
      { name: "validateWalletRegistry", what: "Validate a wallets.json." },
      { name: "loadWalletRegistry", what: "Fetch and validate a wallets.json." },
    ],
  },
];

export const anchorFor = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "");
