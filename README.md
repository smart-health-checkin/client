# checkin-client

Ask the patient's health app for what your visit needs, and get a verified
answer back in your own page.

```ts
import { requestCheckin } from "@smart-health-checkin/checkin-client";

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

**Docs: <https://smart-health-checkin.org/docs/>** —
[getting started](docs/getting-started.md) ·
[describing what you need](docs/requests.md) ·
[working with responses](docs/responses.md) ·
[wallets & browser support](docs/wallets.md) ·
[writing FHIR](docs/fhir.md) ·
[production](docs/production.md) ·
[API reference](docs/api/index.md)

## Install

No npm registry — install from git, pinning a branch or a commit. A `prepare`
step compiles the TypeScript on install, so you get JavaScript plus `.d.ts`
types; Bun resolves the TypeScript sources directly.

```sh
npm install github:smart-health-checkin/checkin-client
npm install github:smart-health-checkin/checkin-client#<commit-sha>
bun add github:smart-health-checkin/checkin-client
```

Or with no build step, from the hosted ES modules — moving
[`/lib/checkin.js`](https://smart-health-checkin.org/lib/checkin.js) or pinned
`/lib/<version>/checkin.js`:

```html
<script type="module">
  import { requestCheckin } from "https://smart-health-checkin.org/lib/checkin.js";
</script>
```

The optional FHIR helper is a separate entry point,
`@smart-health-checkin/checkin-client/fhir` (or `/lib/fhir.js`), so nothing in
the check-in path pulls it in.

## Try it

<https://smart-health-checkin.org/demo/> — a fictional clinic running the real
protocol stack. No wallet-equipped phone needed: switch the responder to
**demo wallet app** and a wallet opens in a tab with a real consent screen.
Every wire artifact is one click away under *Developer detail*.

The [allergy example](https://smart-health-checkin.org/demo/autofill.html#wallet=app)
shows the pattern worth stealing: prefill from the app, then ask only for what
the shared record couldn't carry.

## What's in here

| Path | What it is |
| --- | --- |
| `src/model` | The transport-neutral request/response model and validators (spec §§5–6). |
| `src/wire` | The mdoc binding as pure byte functions: CBOR, SessionTranscript, HPKE, COSE verification. No DOM. |
| `src/browser` | Digital Credentials API invocation and the key-custody seam. |
| `src/kit` | The facade — `requestCheckin` / `runCheckin`, scenarios, wallet mediators. |
| `src/fhir` | **Optional companion**, never imported by the rest: response → transaction Bundle, plus a posting helper. |
| `demo/` | The clinic demo, the demo wallet app, the autofill example, a React example. |
| `fixtures/` | Byte-level conformance corpus, pinned from the spec repo — the wire layer is verified against real Chrome/Android captures. |

## Development

```sh
bun install
bun test                 # unit + fixture conformance tests
bun run typecheck
bun run build            # dist/ with declarations
bun run docs             # regenerate docs/api from source
scripts/build-pages.sh   # full site into _site/
```

`scripts/build-pages.sh` refuses to finish if the hosted bundles don't
actually run — see `scripts/verify-lib.ts` for why that check exists.

Apache-2.0. Related: [spec](https://github.com/smart-health-checkin/spec) ·
[KTC materials](https://github.com/smart-health-checkin/ktc)
