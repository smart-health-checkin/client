/**
 * The site's navigation model, in one place: the top bar, the guide order,
 * and the deep footer all read from here.
 */

export type Section = "overview" | "docs" | "demo" | "spec" | "ktc";

export type Guide = { file: string; slug: string; title: string; blurb: string };

export const GUIDES: Guide[] = [
  {
    file: "docs/getting-started.md",
    slug: "getting-started",
    title: "Getting started",
    blurb: "Install it, make your first request, handle the paths that aren't success, run it without a phone.",
  },
  {
    file: "docs/requests.md",
    slug: "requests",
    title: "Request model",
    blurb: "Request items, FHIR selectors, questionnaires, and accepted media types.",
  },
  {
    file: "docs/responses.md",
    slug: "responses",
    title: "Response model",
    blurb: "Artifacts, per-item status, what is verified, and prefill patterns.",
  },
  {
    file: "docs/wallets.md",
    slug: "wallets",
    title: "Wallets and browser support",
    blurb: "Platform API, wallet web app, mock, and where keys live.",
  },
  {
    file: "docs/fhir.md",
    slug: "fhir",
    title: "Writing FHIR",
    blurb: "The optional mapping helper, and when not to use it.",
  },
  {
    file: "docs/production.md",
    slug: "production",
    title: "Production checklist",
    blurb: "Key custody, trust policy, identity, fallback, pinning.",
  },
  {
    file: "docs/server-authority.md",
    slug: "server-authority",
    title: "Server-held keys",
    blurb: "The two-call seam between your page and your server, if you hold the verifier key there.",
  },
  {
    file: "docs/security-notes.md",
    slug: "security-notes",
    title: "Security notes",
    blurb: "What's verified, what stays deployment policy.",
  },
  {
    file: "demo/README.md",
    slug: "demo",
    title: "Running the demos",
    blurb: "The URL parameters that configure the clinic demo, wallet, and examples.",
  },
];

export const TOP_NAV: Array<{ href: string; label: string; section: Section }> = [
  { href: "/", label: "Overview", section: "overview" },
  { href: "/docs/", label: "Docs", section: "docs" },
  { href: "/demo/", label: "Demo", section: "demo" },
  { href: "/spec/", label: "Spec", section: "spec" },
];

export type FooterColumn = { title: string; links: Array<{ href: string; label: string; external?: boolean }> };

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    // One list, in reading order. Columns are allowed to be different
    // lengths; inventing a "More guides" bucket to even them up was worse.
    title: "Guides",
    links: [
      { href: "/docs/", label: "Docs home & install" },
      ...GUIDES.map((g) => ({ href: `/docs/${g.slug}.html`, label: g.title })),
    ],
  },
  {
    title: "Reference",
    links: [
      { href: "/docs/api/", label: "API reference" },
      { href: "/docs/api/checkin.html", label: "checkin module" },
      { href: "/docs/api/fhir.html", label: "fhir module" },
      { href: "/spec/", label: "Protocol spec" },
      { href: "/lib/checkin.js", label: "Hosted module" },
    ],
  },
  {
    title: "Try it",
    links: [
      { href: "/demo/", label: "Clinic check-in demo" },
      { href: "/demo/autofill.html#wallet=app", label: "Allergy autofill example" },
      { href: "/demo/react.html", label: "React example" },
      { href: "/demo/angular.html", label: "Angular example" },
      { href: "/demo/wallet.html", label: "Demo wallet app" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "https://github.com/smart-health-checkin/checkin-client", label: "checkin-client", external: true },
      { href: "https://github.com/smart-health-checkin/spec", label: "spec & fixtures", external: true },
      { href: "https://github.com/smart-health-checkin/ktc", label: "KTC materials", external: true },
      { href: "/ktc/closing-the-loop/", label: "Closing the Loop" },
    ],
  },
];
