/**
 * The guides, in reading order. The docs rail, the pager, and the docs
 * landing cards all read from here.
 */

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
    file: "docs/picker.md",
    slug: "picker",
    title: "Wallet picker",
    blurb: "A drop-in element (and React component) that lets the patient choose an app and runs the check-in.",
  },
  {
    file: "docs/kiosk.md",
    slug: "kiosk",
    title: "Kiosk and front-desk check-in",
    blurb: "A screen with no wallet hands the request to the patient's phone over a mailbox you provide; the sealed answer comes back.",
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
    file: "demo/README.md",
    slug: "demo",
    title: "Running the demos",
    blurb: "The URL parameters that configure the clinic demo, wallet, and examples.",
  },
];
