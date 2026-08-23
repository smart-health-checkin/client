# @smart-health-checkin/client

Ask the patient's health app for what your visit needs, and get a verified
answer back in your own page.

```ts
import { requestCheckin } from "@smart-health-checkin/client";

const response = await requestCheckin({
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

// response.artifacts — decrypted, signature-verified, cross-checked against
// what you asked for. Prefill your form with it, write it, route on it: yours.
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

| Guide | |
| --- | --- |
| [Getting started](docs/getting-started.md) | Install, first request, handling declines, running without a phone |
| [Request model](docs/requests.md) | Items, FHIR selectors, questionnaires, accepted formats |
| [Response model](docs/responses.md) | Artifacts, per-item status, asking only for what's missing |
| [Wallets and browser support](docs/wallets.md) | Platform API, wallet web app, mock, key custody |
| [Writing FHIR](docs/fhir.md) | The optional mapping helper — and when not to use it |
| [Production checklist](docs/production.md) | Trust policy, identity, fallback, pinning |
| [Server-held keys](docs/server-authority.md) | The two-call seam, if your server holds the verifier key |
| [API reference](docs/api/index.md) | Generated from source; every export |

## Install

No npm registry — install from git, pinning a branch or a commit. A `prepare`
step compiles the TypeScript on install, so you get JavaScript plus `.d.ts`
types; Bun resolves the TypeScript sources directly.

```sh
npm install github:smart-health-checkin/client
npm install github:smart-health-checkin/client#<commit-sha>
bun add github:smart-health-checkin/client
```

Or with no build step, from the hosted ES modules — moving
[`/client/lib/checkin.js`](https://smart-health-checkin.org/client/lib/checkin.js) or pinned
`/client/lib/<version>/checkin.js`:

```html
<script type="module">
  import { requestCheckin } from "https://smart-health-checkin.org/client/lib/checkin.js";
</script>
```

The optional FHIR helper is a separate entry point,
`@smart-health-checkin/client/fhir` (or `/client/lib/fhir.js`), so nothing in
the check-in path pulls it in.

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
| `src/kit` | The facade — `requestCheckin` / `runCheckin`, scenarios, responders and their credential getters. |
| `src/fhir` | **Optional companion**, never imported by the rest: response → transaction Bundle, plus a posting helper. |
| `demo/` | The clinic demo, the demo wallet app, the autofill example, React and Angular examples. |

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

smart-health-checkin.org is built and deployed by the
[smart-health-checkin.github.io](https://github.com/smart-health-checkin/smart-health-checkin.github.io) repo, which checks this
one out and mounts it at `/client/`; pushing `main` here asks it to rebuild.

Apache-2.0. Related: [spec](https://github.com/smart-health-checkin/spec) ·
[KTC materials](https://github.com/smart-health-checkin/ktc)
