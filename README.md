# checkin-provider-kit

Provider-side toolkit for **SMART Health Check-in**. One call, one job:

```ts
const response = await requestCheckin({ purpose: "…", items: [ … ] });
```

Your page asks for what it needs, the patient's wallet answers, and your code
gets a cryptographically verified, cross-validated response — on your page,
in your workflow. What happens next (prefilling forms, writing FHIR, taking
payment, routing the patient) is ordinary application code the kit has no
opinion about.

Under the hood the patient interaction rides the W3C Digital Credentials API
(direct `org-iso-mdoc`, per the [SMART Health Check-in 1.0 draft
spec](/spec/)) — CBOR,
COSE, HPKE, MSO digests and all. The kit exists so integrators never touch
that plumbing.

> **Status: working draft.** The clinical model, the full mdoc wire layer
> (request construction, SessionTranscript, HPKE, MSO digests, **and COSE
> signature verification** — issuerAuth + deviceSignature, which the
> prototype's verifier lacked), FHIR submission, and the `runCheckin` facade
> are implemented and green against the vendored conformance fixtures,
> including byte-exact oracles from a real Chrome/Android capture. The demo
> runs end-to-end today (a built-in mock wallet answers with real
> CBOR/COSE/HPKE when no phone is present). See [Roadmap](#roadmap).

- Landing page: `https://smart-health-checkin.org/`
- Live demo: `https://smart-health-checkin.org/demo/`

## API

```ts
// the whole surface
requestCheckin(request, options?) -> Promise<SmartCheckinResponse>   // throws CheckinFlowError
runCheckin(request, options?)     -> Promise<CheckinOutcome>          // status-based, never throws
```

`request` is an inline init (`{ purpose, items }` — protocol boilerplate
filled in), a complete `SmartCheckinRequest`, or `{ scenario: "name" }` for
requests registered with `registerScenario`.

`options`:

| Option | Meaning |
| --- | --- |
| `authority` | Verifier key custody: `"browser-local"` (default), `{ server }`, or your own `VerifierAuthority`. |
| `getCredential` | Override the mediator. Defaults to the platform Digital Credentials API; pass a web-wallet or mock getter to run without a platform wallet. |

`CheckinOutcome.status` is `completed | declined | unsupported | error`.
Every response is verified (issuerAuth + deviceSignature + MSO digests) and
cross-checked against the request before you see it.

### Writing FHIR is a separate, optional module

```ts
import { buildCheckinBundle, postCheckinBundle } from "./src/fhir/index.ts";
```

Deliberately outside the kit: where patient-supplied data lands, under whose
authorization, with what review, is deployment policy. `buildCheckinBundle`
is pure — map the response to a transaction Bundle (with `Provenance`),
inspect it, then send it with `postCheckinBundle` or your own client.

## Layers

Each layer is usable alone; dependencies point only downward.

| Module | Purpose |
| --- | --- |
| `src/kit` | The facade: `requestCheckin` / `runCheckin`, scenarios, wallet mediators (web-wallet + mock). |
| `src/fhir` | **Optional companion**, not part of the protocol surface: response → transaction Bundle + a small posting helper. |
| `src/browser` | DC API support detection and the `navigator.credentials.get` call; key-custody seam (browser-local vs server-owned). |
| `src/wire` | Pure byte functions: mdoc DeviceRequest + encryptionInfo, SessionTranscript, HPKE open, MSO digest and COSE verification. No DOM. |
| `src/model` | Transport-neutral SMART request/response types and validators (spec §§5–6 as code). |

### Submission mapping (defaults)

- `application/fhir+json` artifacts → entries in one transaction `Bundle`.
- `application/smart-health-card` artifacts → a `DocumentReference` holding
  the JWS (chain of custody preserved); unpacking is opt-in.
- Every write is accompanied by a `Provenance` resource: patient-supplied via
  check-in, timestamped, referencing the configured patient/appointment and
  the request id.
- Patient matching is **not** performed: context comes from configuration and
  is a deployment responsibility in production.

## Demo

`demo/` is the sample project in this repo and deploys to `/demo/` on the
landing site. It is configured entirely by URL **fragment** parameters
(fragment, not query, so identifiers stay out of server logs):

```text
…/demo/#wallet=app                      demo wallet web app: a real consent screen
…/demo/#wallet=auto&scenario=phq2-dayof automatic mock: instant, no consent screen
…/demo/#post=transaction                also post the result to the FHIR base
…/demo/#request=<base64url request>     bring your own request object
```

Everything is also editable in the page under **Demo controls**, which writes
your choices back to the URL. Companion pages: `autofill.html` (form
prefilled from the patient's app, with symptom tagging), `react.html` (same
core, React bindings), `wallet.html` (the demo wallet app).

Precedence: `request=` (verbatim passthrough) beats `scenario=` beats the
default scenario. Full grammar in [`demo/README.md`](demo/README.md).

## Conformance fixtures

[`fixtures/`](fixtures/) is a pinned copy of the SMART Health Check-in
conformance corpus — normalized byte captures from real Chrome/Android
sessions, shared across the Android, TypeScript, and Python suites in the
spec prototype repo. The `wire` port is done when every fixture passes here
too. See [`fixtures/PROVENANCE.md`](fixtures/PROVENANCE.md).

## Relationship to `smart-health-checkin-mdoc`

[`jmandel/smart-health-checkin-mdoc`](https://github.com/jmandel/smart-health-checkin-mdoc)
holds the draft spec, the Android reference wallet, and the original
prototype verifier. This kit is a fresh, coherently-designed provider-side
implementation — written with full reference to that prototype (and porting
freely from it), but organized around one question: *what does an integrator
have to know to ask for data and get it?* The fixtures are the compatibility
contract between the two.

## Roadmap

1. ~~**M1 — `model` + `wire` ports**, fixture-verified.~~ ✅ (all fixture oracles green, plus new issuerAuth/deviceSignature verification)
2. ~~**M2 — `submit` + demo wired end-to-end** against public HAPI; dry-run mode; mock wallet for phone-free testing.~~ ✅
3. ~~**M3 — hosted `lib/checkin.js` + integrator docs** ("integrate in an afternoon"), plus a demo wallet web app so the flow runs without a platform wallet.~~ ✅
4. **M4 — server-owned authority reference** (keys server-side, audit trail).
5. **M5 — demonstration script** for testing events.

## Development

```sh
bun install
bun test                 # fixture + unit tests
bun run typecheck
scripts/build-pages.sh   # builds _site/ (landing at /, demo at /demo/)
```

GitHub Pages deploys `_site/` via `.github/workflows/pages.yml` on pushes to
`main` (repo setting: Pages → Source → GitHub Actions).
