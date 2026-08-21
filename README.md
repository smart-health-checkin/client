# checkin-provider-kit

Provider-side toolkit for **SMART Health Check-in**: embed a check-in flow in
any provider web surface (portal page, kiosk page, standalone link), receive
the patient's response on that same surface, submit the results to your FHIR
server, and return the patient to the rest of your check-in workflow.

Under the hood the patient interaction rides the W3C Digital Credentials API
(direct `org-iso-mdoc`, per the [SMART Health Check-in 1.0 draft
spec](https://jmandel.github.io/smart-health-checkin-mdoc/spec.html)). The kit
exists so integrators never touch that plumbing: you describe *what to ask
for, where to submit, and where the patient goes next* — the kit does the
rest.

> **Status: working draft.** The clinical model, the full mdoc wire layer
> (request construction, SessionTranscript, HPKE, MSO digests, **and COSE
> signature verification** — issuerAuth + deviceSignature, which the
> prototype's verifier lacked), FHIR submission, and the `runCheckin` facade
> are implemented and green against the vendored conformance fixtures,
> including byte-exact oracles from a real Chrome/Android capture. The demo
> runs end-to-end today (a built-in mock wallet answers with real
> CBOR/COSE/HPKE when no phone is present). See [Roadmap](#roadmap).

- Landing page: `https://smart-health-checkin.github.io/checkin-provider-kit/`
- Live demo: `https://smart-health-checkin.github.io/checkin-provider-kit/demo/`

## Design center: config as data

A check-in is described by **one serializable config object** — content,
submission target, and return leg. Everything in the kit is a view of that
object: the JS API takes it, the `<smart-checkin>` element declares it as
attributes, the demo reads it from the URL fragment, and a canned *scenario*
is just a named config. If you can paste a config, you can reproduce a test
case.

```ts
import { runCheckin } from "@smart-health-checkin/provider-kit";

const outcome = await runCheckin({
  request: { scenario: "phq2-dayof" },          // or { request: {...full SmartCheckinRequest} }
  context: { patient: "Patient/123", appointment: "Appointment/456" },
  submit: {
    fhirBase: "https://fhir.example.org/r4",
    mode: "transaction",                         // "transaction" | "individual" | "dry-run"
  },
  complete: { returnUrl: "https://portal.example.org/checkin/next-step" },
});
```

Or declaratively:

```html
<smart-checkin
  scenario="phq2-dayof"
  patient="Patient/123"
  fhir-base="https://fhir.example.org/r4"
  return-url="https://portal.example.org/checkin/next-step">
</smart-checkin>
```

### `CheckinConfig`

```ts
type CheckinConfig = {
  /** What to ask the patient for. Exactly one of: */
  request:
    | { scenario: string }                       // named template from the scenario library
    | { request: SmartCheckinRequest };          // full request object, passed through verbatim

  /** FHIR context on the target server; stamped into Provenance, never guessed. */
  context?: { patient?: string; appointment?: string };

  /** Where and how to submit the response. Omit for display-only flows. */
  submit?: {
    fhirBase: string;
    mode?: "transaction" | "individual" | "dry-run";   // default "transaction"
    provenance?: boolean;                              // default true
  };

  /** Closed-loop return leg: where the patient lands after completion. */
  complete?: { returnUrl?: string };

  /** Key custody for the verifier crypto. Default: browser-local. */
  authority?: "browser-local" | { server: string };
};
```

### `CheckinOutcome`

```ts
type CheckinOutcome = {
  status: "completed" | "declined" | "unsupported" | "error";
  request: SmartCheckinRequest;                  // as sent (scenario resolved)
  response?: SmartCheckinResponse;               // validated against the request
  submission?: {
    mode: "transaction" | "individual" | "dry-run";
    bundle: unknown;                             // what was (or would be) posted
    result?: unknown;                            // server reply when mode !== "dry-run"
  };
};
```

Validation is not optional: every response is cross-checked against the
request (request id, `fulfills[]` reachability, media types, per-item status
coverage) before the kit will submit anything.

## Layers

Each layer is usable alone; dependencies point only downward.

| Module | Purpose |
| --- | --- |
| `src/kit` | Product facade: `runCheckin(config)`, `<smart-checkin>`, scenario library. |
| `src/submit` | `SmartCheckinResponse` → FHIR write plan (transaction Bundle, per-artifact mapping, Provenance stamping) + a small fetch executor. |
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
…/demo/#mock=1&submit=dry-run
…/demo/#mock=1&scenario=phq2-dayof&patient=Patient/example
…/demo/#request=<base64url SmartCheckinRequest>&fhir=…&returnUrl=…
```

`mock=1` answers the request with the kit's built-in mock wallet (real
CBOR/COSE/HPKE over fabricated demo data), so the whole flow — including the
FHIR write — runs with no phone present.

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
freely from it), but organized around the integrator's mental model:
*configure → launch → receive → submit → return*. The fixtures are the
compatibility contract between the two.

## Roadmap

1. ~~**M1 — `model` + `wire` ports**, fixture-verified.~~ ✅ (all fixture oracles green, plus new issuerAuth/deviceSignature verification)
2. ~~**M2 — `submit` + demo wired end-to-end** against public HAPI; dry-run mode; mock wallet for phone-free testing.~~ ✅
3. **M3 — `<smart-checkin>` element** + integrator docs ("integrate in an afternoon").
4. **M4 — server-owned authority reference** (keys server-side, audit trail).
5. **M5 — scenario library polish + demonstration script** for testing events.

## Development

```sh
bun install
bun test                 # fixture + unit tests
bun run typecheck
scripts/build-pages.sh   # builds _site/ (landing at /, demo at /demo/)
```

GitHub Pages deploys `_site/` via `.github/workflows/pages.yml` on pushes to
`main` (repo setting: Pages → Source → GitHub Actions).
