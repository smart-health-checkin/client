/**
 * The docs. The Developers menu (nav.json), the docs rail, the pager, and
 * llms.txt all read from here, so the rail and the menu can't drift: both
 * list MENU_GROUPS in order, each with the guides whose menuGroup names it.
 * The front page (Getting started, the section's Overview) is the only guide
 * outside a group.
 */

/** Developers menu groups, in menu order. Every menu entry sits in one. */
export const MENU_GROUPS = ["Build a check-in page", "Build a wallet", "Testing and production", "Reference"] as const;
export type MenuGroup = (typeof MENU_GROUPS)[number];
export type Guide = {
  file: string;
  slug: string;
  title: string;
  /** One line for llms.txt and landing cards. */
  blurb: string;
  /** A few words under the title in the Developers menu. */
  menuNote?: string;
  /** The Developers menu (and rail) group; only the front page has none. */
  menuGroup?: MenuGroup;
};

export const GUIDES: Guide[] = [
  { file: "docs/getting-started.md", slug: "getting-started", title: "Overview",
    blurb: "What it does, three ways in, install, and a map of the docs." },
  { file: "docs/tutorial.md", slug: "tutorial", title: "Tutorial",
    blurb: "Build a check-in page end to end: picker, request, prefill, fallback, testing.",
    menuNote: "Build a check-in page, end to end", menuGroup: "Build a check-in page" },

  { file: "docs/requests.md", slug: "requests", title: "Requests",
    blurb: "Items and titles, records by profile, family, or type, forms, formats, and what not to put in a request.",
    menuNote: "What to ask for: records, forms, formats", menuGroup: "Build a check-in page" },
  { file: "docs/wallets.md", slug: "wallets", title: "Wallet picker",
    blurb: "The picker, kinds of wallet, registries and icons, starting inside the click, kiosk hand-off, custom transports.",
    menuNote: "Offer wallets: the picker, registries, kiosks", menuGroup: "Build a check-in page" },
  { file: "docs/responses.md", slug: "responses", title: "Responses",
    blurb: "Statuses, lookups, SMART Health Card trust, prefill, storing it, and writing FHIR.",
    menuNote: "Read results, health cards, prefill, FHIR", menuGroup: "Build a check-in page" },
  { file: "docs/production.md", slug: "production", title: "Going to production",
    blurb: "Key custody and server-held keys, trust, fallback, privacy, pinning versions, monitoring.",
    menuNote: "Keys, trust, fallback, privacy", menuGroup: "Testing and production" },
  { file: "docs/native-apps.md", slug: "native-apps", title: "Native Verifier apps",
    blurb: "An Android or iOS app as the Verifier: run the web flow in a Custom Tab and get the result back over a message channel.",
    menuNote: "Check-in from an Android or iOS app", menuGroup: "Build a check-in page" },
  { file: "docs/build-a-wallet.md", slug: "build-a-wallet", title: "Wallet guide",
    blurb: "For health-app builders: native and web wallets, serveWebWallet, matching, forms, health cards, getting listed.",
    menuNote: "For health-app builders", menuGroup: "Build a wallet" },
  { file: "docs/testing.md", slug: "testing", title: "Testing",
    blurb: "The mock wallet, the connectathon's Testing EHR and Testing Wallet, faults, reading failures, the demos.",
    menuNote: "Mock wallet, testing tools, failures", menuGroup: "Testing and production" },

  { file: "docs/web-wallets.md", slug: "web-wallets", title: "Web wallets",
    blurb: "The protocol between an EHR page and a web wallet: three messages and the origin rules.", menuNote: "Wallets that run in a browser tab", menuGroup: "Build a wallet" },
  { file: "docs/registry.md", slug: "registry", title: "Registry format",
    blurb: "The wallets.json format and its validators.", menuNote: "The wallets.json format", menuGroup: "Reference" },
  { file: "demo/README.md", slug: "demo", title: "Clinic demo options",
    blurb: "The demo pages and the URL options of the clinic demo.",
    menuNote: "The clinic demo's URL options", menuGroup: "Reference" },
];


