/**
 * The docs. The Developers menu (nav.json), the docs rail, and the pager all
 * read from here, so the rail and the menu can't drift: both list MENU_GROUPS in order, each with the guides whose menuGroup names it.
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
  /** A few words under the title in the Developers menu. */
  menuNote?: string;
  /** The Developers menu (and rail) group; only the front page has none. */
  menuGroup?: MenuGroup;
};

export const GUIDES: Guide[] = [
  { file: "docs/getting-started.md", slug: "getting-started", title: "Overview" },
  { file: "docs/tutorial.md", slug: "tutorial", title: "Tutorial",
    menuNote: "Build a check-in page, end to end", menuGroup: "Build a check-in page" },

  { file: "docs/requests.md", slug: "requests", title: "Requests",
    menuNote: "What to ask for: records, forms, formats", menuGroup: "Build a check-in page" },
  { file: "docs/wallets.md", slug: "wallets", title: "Wallet picker",
    menuNote: "Add the picker; choose the wallets it lists", menuGroup: "Build a check-in page" },
  { file: "docs/responses.md", slug: "responses", title: "Responses",
    menuNote: "Read results, health cards, prefill, FHIR", menuGroup: "Build a check-in page" },
  { file: "docs/production.md", slug: "production", title: "Going to production",
    menuNote: "Keys, trust, fallback, privacy", menuGroup: "Testing and production" },
  { file: "docs/native-apps.md", slug: "native-apps", title: "Native Verifier apps",
    menuNote: "Check-in from an Android or iOS app", menuGroup: "Build a check-in page" },
  { file: "docs/build-a-wallet.md", slug: "build-a-wallet", title: "Wallet guide",
    menuNote: "For health-app builders", menuGroup: "Build a wallet" },
  { file: "docs/testing.md", slug: "testing", title: "Testing",
    menuNote: "Mock wallet, testing tools, failures", menuGroup: "Testing and production" },

  { file: "docs/web-wallets.md", slug: "web-wallets", title: "Web wallets",
    menuNote: "Wallets that run in a browser tab", menuGroup: "Build a wallet" },
  { file: "docs/install.md", slug: "install", title: "Install",
    menuNote: "The package, entry points, hosted files", menuGroup: "Reference" },
  { file: "docs/registry.md", slug: "registry", title: "Registry format",
    menuNote: "The wallets.json format", menuGroup: "Reference" },
  { file: "demo/README.md", slug: "demo", title: "Clinic check-in demo options",
    menuNote: "The clinic check-in demo's URL options", menuGroup: "Reference" },
];


