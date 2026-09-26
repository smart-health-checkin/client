# @smart-health-checkin/client

Ask the patient's health app for what your visit needs, and get a verified
answer back in your own page.

Drop in the picker:

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/ui.js"></script>
<smart-checkin-picker registry="/wallets.json"></smart-checkin-picker>
```

Or call it yourself:

```ts
import { runCheckin } from "@smart-health-checkin/client";

const result = await runCheckin({
  purpose: "Before your visit",
  items: [{
    id: "allergies",
    title: "Allergies and intolerances",
    content: {
      kind: "selection.fhir",
      profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
    },
    accept: ["application/fhir+json"],
  }],
});

if (result.status === "completed") {
  result.response.resources("allergies"); // decrypted, verified, cross-checked
}
```

The patient interaction rides the W3C Digital Credentials API (direct
`org-iso-mdoc`, per the [SMART Health Check-in 1.0 draft
spec](https://smart-health-checkin.org/spec/)) — CBOR, COSE, HPKE, MSO digests
and all. This library exists so you never touch that.

It stops when your code has the response. Writing FHIR, taking payment,
routing the patient are your application's business, and deliberately not
this library's: every concern a protocol library owns is one an adopting EHR
has to audit and configure.

## Documentation

The docs site is at [smart-health-checkin.org/client/docs](https://smart-health-checkin.org/client/docs/);
the same pages live in this repo, so they read here too.

| Level | Pages |
| --- | --- |
| Start | [Overview](docs/getting-started.md) · [Tutorial: build a check-in page](docs/tutorial.md) |
| Guides | [Asking for data](docs/requests.md) · [Offering wallets](docs/wallets.md) · [Using the answer](docs/responses.md) · [Going to production](docs/production.md) · [Building a wallet](docs/build-a-wallet.md) · [Testing](docs/testing.md) |
| Reference | [API reference](docs/api/index.md) · [Web wallet hand-off](docs/web-wallet-handoff.md) · [Registry format](docs/registry.md) · [Upgrading from 0.1](docs/upgrading.md) · [Demo options](demo/README.md) |

## Install

No npm registry — install from git, pinning a branch or a commit. A `prepare`
step compiles the TypeScript on install, so you get JavaScript plus `.d.ts`
types; Bun resolves the TypeScript sources directly.

```sh
npm install github:smart-health-checkin/client
npm install github:smart-health-checkin/client#<commit-sha>
bun add github:smart-health-checkin/client
```

Or with no build step, from the hosted ES modules at `/client/lib/`, each self-contained, with pinned copies at `/client/lib/<version>/`:

| Entry point | Hosted file | For |
| --- | --- | --- |
| `@smart-health-checkin/client` | `checkin.js` | EHR pages: `runCheckin`, `wallets`, `CheckinResponse` |
| `/ui` | `ui.js` | `<smart-checkin-picker>` |
| `/react` | (package only) | `<CheckinPicker>`, `useCheckin` |
| `/picker` | (package only) | Picker logic for your own UI |
| `/wallet` | `wallet.js` | Building a wallet: `serveWebWallet`, matching, sealing |
| `/handoff` | `handoff.js` | Kiosks: `handoffWallet` |
| `/fhir` | `fhir.js` | Optional: response to a FHIR transaction |
| `/testing` | `testing.js` | `mockWallet` for demos and tests |
| `/model`, `/wire` | (package only) | Types, validators, and the protocol bytes |

## Try it

<https://smart-health-checkin.org/client/demo/> — a fictional clinic running the real
protocol stack. It opens with this project's demo wallet in a tab — a real consent screen,
no phone needed — and the split button offers the device's own wallet and a
mock. What came back is one click away in the results table, and every wire
artifact under *Developer detail*.

The [allergy example](https://smart-health-checkin.org/client/demo/autofill.html)
shows the pattern worth stealing: prefill from the app, then ask only for what
the shared record couldn't carry.

## What's in here

| Path | What it is |
| --- | --- |
| `src/model` | The transport-neutral request/response model and validators (spec §§5–6). |
| `src/wire` | The mdoc binding as pure byte functions: CBOR, SessionTranscript, HPKE, COSE verification. No DOM. |
| `src/browser` | Digital Credentials API invocation and the key-custody seam. |
| `src/core` | The root module: `runCheckin`, `Wallet`, `CheckinResponse`, errors, health-card trust. |
| `src/kit` | Internals: the web-wallet and kiosk transports, the mock wallet, sealing. |
| `src/ui`, `src/react`, `src/picker` | The picker element, its React wrapper, and its logic. |
| `src/wallet`, `src/handoff`, `src/testing` | Entry points for wallet builders, kiosks, and tests. |
| `src/fhir` | **Optional companion**, never imported by the rest: response → transaction Bundle, plus a posting helper. |
| `demo/` | The clinic demo, the demo wallet app, the autofill and kiosk hand-off examples, React and Angular examples. |

## Development

```sh
bun install
bun test                 # unit + fixture conformance tests
bun run typecheck
bun run build            # dist/ with declarations
bun run docs             # regenerate docs/api from source
scripts/build-pages.sh   # this package's pages into _site/
bunx instant-cli push all --app 9cc51106-8018-43b8-8a37-fd8f414fdde5   # the kiosk demo's mailbox schema and rules; reads INSTANT_CLI_AUTH_TOKEN from ./.env
```

`scripts/build-pages.sh` refuses to finish if the hosted bundles don't
actually run — see `scripts/verify-lib.ts` for why that check exists.

This repo builds and deploys its own GitHub Pages site on pushes to `main`
(`.github/workflows/pages.yml`), and GitHub serves it beneath the apex site
at smart-health-checkin.org/client/. The
[smart-health-checkin.github.io](https://github.com/smart-health-checkin/smart-health-checkin.github.io) repo owns the apex —
the home page and the shared `/assets/` — and deploys separately; nothing
there rebuilds when this repo changes.

Apache-2.0. Related: [spec](https://github.com/smart-health-checkin/spec) ·
[KTC materials](https://github.com/smart-health-checkin/ktc)
