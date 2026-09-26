/**
 * The docs, in reading order, at three levels: where to start, the guides
 * (one page per big topic), and reference pages. The docs rail, the pager,
 * llms.txt, and nav.json (the site's "Developers" menu) all read from here.
 */

export type Level = "start" | "guide" | "reference";
export type Guide = {
  file: string;
  slug: string;
  title: string;
  /** One line for llms.txt and landing cards. */
  blurb: string;
  /** A few words for the Developers menu; guides without one stay out of it. */
  menuNote?: string;
  level: Level;
};

export const LEVELS: Array<{ level: Level; label: string }> = [
  { level: "start", label: "Start" },
  { level: "guide", label: "Guides" },
  { level: "reference", label: "Reference" },
];

export const GUIDES: Guide[] = [
  { level: "start", file: "docs/getting-started.md", slug: "getting-started", title: "Overview",
    blurb: "What it does, three ways in, install, and a map of the docs." },
  { level: "start", file: "docs/tutorial.md", slug: "tutorial", title: "Tutorial",
    blurb: "Build a check-in page end to end: picker, request, prefill, fallback, testing.",
    menuNote: "Build a check-in page, end to end" },

  { level: "guide", file: "docs/requests.md", slug: "requests", title: "Asking for data",
    blurb: "Items and titles, records by profile, family, or type, forms, formats, and what not to put in a request.",
    menuNote: "Items, records, forms, formats" },
  { level: "guide", file: "docs/wallets.md", slug: "wallets", title: "Offering wallets",
    blurb: "The picker, kinds of wallet, registries and icons, starting inside the click, kiosk hand-off, custom transports.",
    menuNote: "The picker, registries, kiosks" },
  { level: "guide", file: "docs/responses.md", slug: "responses", title: "Using the answer",
    blurb: "Statuses, lookups, SMART Health Card trust, prefill, storing it, and writing FHIR.",
    menuNote: "Lookups, health cards, prefill, FHIR" },
  { level: "guide", file: "docs/production.md", slug: "production", title: "Going to production",
    blurb: "Key custody and server-held keys, trust, fallback, privacy, pinning versions, monitoring.",
    menuNote: "Keys, trust, fallback, privacy" },
  { level: "guide", file: "docs/build-a-wallet.md", slug: "build-a-wallet", title: "Building a wallet",
    blurb: "For health-app builders: native and web wallets, serveWebWallet, matching, forms, health cards, getting listed.",
    menuNote: "For health-app builders" },
  { level: "guide", file: "docs/testing.md", slug: "testing", title: "Testing",
    blurb: "The mock wallet, the connectathon's Testing EHR and Testing Wallet, faults, reading failures, the demos.",
    menuNote: "Mock wallet, testing tools, failures" },

  { level: "reference", file: "docs/web-wallet-handoff.md", slug: "web-wallet-handoff", title: "Web wallet hand-off",
    blurb: "The protocol between an EHR page and a web wallet: three messages and the origin rules." },
  { level: "reference", file: "docs/registry.md", slug: "registry", title: "Registry format",
    blurb: "The wallets.json format and its validators." },
  { level: "reference", file: "docs/upgrading.md", slug: "upgrading", title: "Upgrading",
    blurb: "What changed in each version, and how to move to 0.3." },
  { level: "reference", file: "demo/README.md", slug: "demo", title: "Demo options",
    blurb: "The demo pages and the URL options of the clinic demo." },
];


