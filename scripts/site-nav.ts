/**
 * The guides, in reading order, in three tracks. The docs rail, the pager,
 * and llms.txt all read from here.
 */

export type Track = "Add check-in to an EHR page" | "Build a wallet" | "Test and debug";
export type Guide = { file: string; slug: string; title: string; blurb: string; track: Track };

export const TRACKS: Track[] = ["Add check-in to an EHR page", "Build a wallet", "Test and debug"];

export const GUIDES: Guide[] = [
  { track: "Add check-in to an EHR page", file: "docs/getting-started.md", slug: "getting-started", title: "Getting started",
    blurb: "Install it, add the picker or call runCheckin, read the response, handle what doesn't complete." },
  { track: "Add check-in to an EHR page", file: "docs/picker.md", slug: "picker", title: "Wallet picker",
    blurb: "The drop-in <smart-checkin-picker> element and React component: options, events, styling." },
  { track: "Add check-in to an EHR page", file: "docs/requests.md", slug: "requests", title: "Request model",
    blurb: "Request items, FHIR selectors, questionnaires, and accepted media types." },
  { track: "Add check-in to an EHR page", file: "docs/responses.md", slug: "responses", title: "Response model",
    blurb: "CheckinResponse lookups, per-item status, SMART Health Card trust, and prefill patterns." },
  { track: "Add check-in to an EHR page", file: "docs/wallets.md", slug: "wallets", title: "Offering wallets",
    blurb: "Kinds of wallet, wallets(), starting one inside the click, browser support, custom transports." },
  { track: "Add check-in to an EHR page", file: "docs/registry.md", slug: "registry", title: "Wallet registries",
    blurb: "The wallets.json format, icons, and how to get listed." },
  { track: "Add check-in to an EHR page", file: "docs/kiosk.md", slug: "kiosk", title: "Kiosk and front desk",
    blurb: "A screen with no wallet hands the request to the patient's phone through a mailbox you provide." },
  { track: "Add check-in to an EHR page", file: "docs/fhir.md", slug: "fhir", title: "Writing FHIR",
    blurb: "The optional mapping helper, and when not to use it." },
  { track: "Add check-in to an EHR page", file: "docs/production.md", slug: "production", title: "Production checklist",
    blurb: "Key custody, trust, identity, fallback, pinning." },
  { track: "Add check-in to an EHR page", file: "docs/server-authority.md", slug: "server-authority", title: "Server-held keys",
    blurb: "The two calls between your page and your server, if you hold the verifier key there." },
  { track: "Build a wallet", file: "docs/build-a-wallet.md", slug: "build-a-wallet", title: "Build a wallet",
    blurb: "What a wallet does, native and web, serveWebWallet, matching rules, forms, and health cards." },
  { track: "Build a wallet", file: "docs/web-wallet-handoff.md", slug: "web-wallet-handoff", title: "Web wallet hand-off",
    blurb: "The three messages between an EHR page and a web wallet, and the origin rules." },
  { track: "Test and debug", file: "docs/testing.md", slug: "testing", title: "Test and debug",
    blurb: "The mock wallet, the connectathon's Testing EHR and Testing Wallet, and reading failures." },
  { track: "Test and debug", file: "demo/README.md", slug: "demo", title: "Running the demos",
    blurb: "Each demo page and the API it shows." },
  { track: "Test and debug", file: "docs/upgrading.md", slug: "upgrading", title: "Upgrading from 0.1",
    blurb: "Where every 0.1 name went, with before-and-after examples." },
];
