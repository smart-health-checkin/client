# checkin-provider-kit — complete product requirements & design

This document is self-contained: an engineer (human or AI) should be able to
build the entire `checkin-provider-kit` deliverable — library code, demo app,
landing page, docs, tests, and CI/deployment — from this file plus the
external authorities listed in §2, **without reading any pre-existing code,
README, or notes in this repository**. Where this document and existing repo
content disagree, this document wins; regenerate the rest.

---

## 1. Mission and context

**SMART Health Check-in** is a draft protocol for pre-visit / at-visit
check-in: a provider states exactly what it wants from a patient (specific
questionnaires, insurance coverage, clinical history), and the patient's app
("wallet") returns matching artifacts with per-item consent. Version 1.0 is
deliberately two-layered:

1. A **transport-neutral clinical JSON request/response model**.
2. A **same-device presentation flow** over the W3C Digital Credentials API
   (`navigator.credentials.get`) using direct `org-iso-mdoc` — the browser
   invokes the patient's wallet on the same device, the wallet returns an
   encrypted mdoc response, and the requesting page opens and verifies it.

The strategic design principle is the **closed loop**: the request starts on
a provider-controlled web surface and the response returns *to that same
surface*. The provider therefore keeps control of the overall check-in
journey (payment, consents, next steps) and the patient is never stranded in
a third-party app. After receiving a response, the provider surface can POST
the results to any FHIR backend — this "browser surface mediates; backend
sees ordinary FHIR writes" pattern is called the **encapsulation pattern**
and is a first-class requirement, not an afterthought.

**This kit is the provider side.** Audience: an EHR-portal or clinic web
engineer whose mental model is *configure → launch → receive → submit →
return*. They must never touch CBOR, COSE, HPKE, or DC API plumbing. The kit
is a fresh, coherently designed implementation — written with full reference
to the existing prototype (porting freely is encouraged), but organized
top-down around the integrator's mental model rather than accreted from demo
needs.

Success criteria:

- A portal engineer can integrate a working check-in flow in an afternoon
  using only the README.
- A complete end-to-end demo (request → wallet → response → FHIR write →
  return leg) runs against a public test FHIR server with no EHR-vendor
  involvement.
- Every byte-level behavior is verified against the vendored conformance
  fixtures (§16).

## 2. External authorities (allowed inputs)

| Authority | Location | Role |
| --- | --- | --- |
| SMART Health Check-in 1.0 draft spec | <https://jmandel.github.io/smart-health-checkin-mdoc/spec.html> (raw: `…/spec.md`) | Normative for the clinical model (§§5–6), the mdoc presentation flow (§8), trust (§7), and CDDL/schemas (Appendices B–C). Consult whenever this PRD's protocol summary is insufficient. |
| Prototype repo | <https://github.com/jmandel/smart-health-checkin-mdoc> | Reference implementation (TypeScript verifier SDK under `rp-web/src/sdk/`, Android wallet, Python checkers). Port from it freely with attribution comments; do not import it as a dependency. |
| Conformance fixtures | `fixtures/` in this repo (pinned copy of the prototype's corpus; see `fixtures/PROVENANCE.md`) | **The compatibility contract.** Byte-level oracles for requests, responses, transcripts, and crypto. All wire code is done only when fixture tests pass. |
| Public HAPI FHIR server | `https://hapi.fhir.org/baseR4` | Default demo submission backend (open, CORS-enabled, periodically wiped, test data only). |

## 3. Repository identity and conventions

- **GitHub**: org `smart-health-checkin`, repo `checkin-provider-kit`.
  Default branch `main`.
- **License**: Apache-2.0 (`LICENSE` at root; `"license": "Apache-2.0"` in
  package.json).
- **Toolchain**: Bun (runtime, test runner, bundler) + TypeScript ≥5.5,
  `strict` and `noUncheckedIndexedAccess`, `moduleResolution: "bundler"`,
  `allowImportingTsExtensions`, `verbatimModuleSyntax`, `noEmit` (type-check
  only; bundling is Bun's job).
- **Package**: `@smart-health-checkin/provider-kit`, `"private": true`,
  `"type": "module"`, `exports { ".": "./src/index.ts" }` (source exports are
  fine — npm publishing is explicitly out of scope for now).
- **Dependency policy**: zero runtime dependencies. Port or hand-write the
  minimal CBOR encoder/decoder; use WebCrypto (`crypto.subtle`) for all
  cryptography. Dev dependencies: `typescript` only.
- **Module discipline**: layers depend only downward (§4). No DOM access
  outside `src/browser` and `src/kit`'s custom element. Public API is the
  barrel `src/index.ts`; the demo must import only from the barrel.
- **Docs discipline**: `src/kit/types.ts` and the README's API section are
  the same contract; keep them in lockstep. README-first: API changes edit
  the README in the same commit.

## 4. Architecture

```text
src/
  model/     clinical JSON model + validators        (no deps)
  wire/      mdoc byte functions: build/open/verify  (depends: model)
  browser/   DC API invocation + key-custody seam    (depends: wire, model)
  submit/    response → FHIR write plan + executor   (depends: model)
  kit/       facade: runCheckin, <smart-checkin>,
             scenario library                        (depends: all above)
  index.ts   public barrel
demo/        sample project (standalone demo app; imports the barrel only)
site/        static landing page
fixtures/    vendored conformance corpus (§16)
scripts/     build-pages.sh, vendor-fixtures.sh
.github/workflows/  ci.yml, pages.yml
```

**Design center — config as data.** One serializable `CheckinConfig` object
describes an entire check-in: what to request, FHIR context, where/how to
submit, where the patient goes afterward, and key custody. The JS API takes
it, the custom element declares it as attributes, the demo reads it from the
URL fragment, and a *scenario* is a named canned config. If you can paste a
config, you can reproduce a test case.

## 5. Public API contract

```ts
import type { SmartCheckinRequest, SmartCheckinResponse } from "./model";

export type CheckinConfig = {
  /** What to ask the patient for. Exactly one variant. */
  request:
    | { scenario: string }                      // named template (§11)
    | { request: SmartCheckinRequest };         // full object, passed through verbatim

  /** FHIR context on the target server; stamped into Provenance, never guessed. */
  context?: { patient?: string; appointment?: string };   // e.g. "Patient/123"

  /** Where and how to submit. Omit for display-only flows. */
  submit?: {
    fhirBase: string;
    mode?: "transaction" | "individual" | "dry-run";      // default "transaction"
    provenance?: boolean;                                 // default true
  };

  /** Closed-loop return leg: where the patient lands after completion. */
  complete?: { returnUrl?: string };

  /** Verifier key custody. Default "browser-local". */
  authority?: "browser-local" | { server: string };
};

export type CheckinOutcome = {
  status: "completed" | "declined" | "unsupported" | "error";
  request: SmartCheckinRequest;                 // as sent (scenario resolved)
  response?: SmartCheckinResponse;              // present iff wallet returned one; always validated
  submission?: {
    mode: "transaction" | "individual" | "dry-run";
    bundle: unknown;                            // what was (or would be) posted
    result?: unknown;                           // server reply when mode !== "dry-run"
  };
  error?: { stage: "prepare" | "credential" | "open" | "validate" | "submit"; message: string };
};

export function runCheckin(config: CheckinConfig): Promise<CheckinOutcome>;
```

Status semantics: `unsupported` = browser lacks DC API support (detected
before any prompt); `declined` = user cancelled or wallet declined every
item; `error` carries the failing stage; `completed` = validated response
received (and submitted, unless submit was omitted or dry-run). A response
whose items are individually declined/partial is still `completed` — item
outcomes live in `response.requestStatus`.

**Custom element** (`M3`): `<smart-checkin>` renders a launch button and
runs `runCheckin` on click.

```html
<smart-checkin
  scenario="phq2-dayof"                 or  request-json='{"type":…}'
  patient="Patient/123" appointment="Appointment/456"
  fhir-base="https://…" submit-mode="transaction"
  return-url="https://…" label="Share for check-in">
</smart-checkin>
```

It dispatches a composed, bubbling `CustomEvent<CheckinOutcome>` named
`checkin-complete`; if `return-url` is set and status is `completed`, it
navigates there after dispatching. Attributes map 1:1 onto `CheckinConfig`.

**Non-goals for the API**: wallet-side anything, credential issuance,
patient matching, production authn/authz to the FHIR server (demo posts
anonymously; real deployments wrap the executor), OpenID4VP binding.

## 6. Clinical model (`src/model`)

Port from the prototype's `rp-web/src/sdk/core.ts`; the spec (§§5–6) and
fixtures are authoritative. Summary of the shapes:

**Request** — `SmartCheckinRequest`:

```jsonc
{
  "type": "smart-health-checkin-request",       // frozen discriminator
  "version": "1",
  "id": "unique-per-requester-session",
  "purpose": "Clinic check-in",                  // display only; never identity
  "fhirVersions": ["4.0.1"],
  "items": [{
    "id": "unique-within-request",
    "title": "Insurance coverage",
    "summary": "optional explainer",
    "required": true,                            // advisory; user always controls
    "accept": ["application/smart-health-card", "application/fhir+json"],  // ordered preference
    "content": { /* selector, one of: */ }
  }]
}
```

Content selectors (`content.kind`):

- `"selection.fhir"` — existing patient data. Optional additive selectors:
  `profiles[]` (exact StructureDefinition canonicals), `profilesFrom[]`
  (IG/publication canonicals, e.g. `http://hl7.org/fhir/us/core`),
  `resourceTypes[]`. No selectors = "any patient-specific FHIR".
- `"form.fhir"` — questionnaire to fill: `questionnaireCanonical` (may carry
  `|version`) and/or inline `questionnaire` (FHIR Questionnaire resource).

**Response** — `SmartCheckinResponse`:

```jsonc
{
  "type": "smart-health-checkin-response",       // frozen discriminator
  "version": "1",
  "requestId": "must equal request.id",
  "artifacts": [{
    "id": "unique-within-response",
    "mediaType": "application/fhir+json",        // or application/smart-health-card
    "fulfills": ["item-id", "…"],                // non-empty; ids must exist in request
    // fhir+json: "fhirVersion" REQUIRED + "value" = resource or Bundle (single version)
    // smart-health-card: "value": { "verifiableCredential": ["<JWS>", …] }, NO outer fhirVersion
  }],
  "requestStatus": [{
    "id": "item-id", "status": "fulfilled",      // fulfilled|partial|unavailable|declined|unsupported|error
    "message": "optional"
  }]
}
```

Exported validators (runtime shape checks over untrusted JSON, returning
`{ok:true} | {ok:false, error}`):

- `validateSmartCheckinRequest(value)`
- `validateSmartCheckinResponse(value)`
- `validateResponseAgainstRequest(request, response)` — cross-checks, all
  mandatory before any submission: `requestId` equals `request.id`; every
  `fulfills[]` id resolves to a request item; artifact `mediaType` ∈ each
  fulfilled item's `accept[]`; `requestStatus` covers every request item
  exactly once; fhir+json artifacts carry `fhirVersion` ∈ request
  `fhirVersions` and never mix versions in one Bundle; SHC artifacts carry no
  outer `fhirVersion`. Unknown fields are ignored everywhere
  (forward-compatibility rule). Canonical URLs with `|version` round-trip
  verbatim.

## 7. Wire binding (`src/wire`)

Pure byte-level functions, no DOM, verified against fixtures. Port from the
prototype; spec §8 + Appendices C (CDDL) and E (SessionTranscript byte
ladder) are authoritative. Registered identifiers (use *exactly*):

| Constant | Value |
| --- | --- |
| DC API protocol id | `org-iso-mdoc` |
| mdoc docType | `org.smarthealthit.checkin.1` |
| Namespace | `org.smarthealthit.checkin` |
| Response element | `smart_health_checkin_response` |
| Request carrier (in `requestInfo`) | `org.smarthealthit.checkin.request` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256) + HKDF-SHA256 + AES-128-GCM |
| Signatures | COSE_Sign1, ES256 (P-256) |

**Request construction** (verifier side):

1. Serialize the `SmartCheckinRequest` JSON (UTF-8) into
   `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
2. `ItemsRequest` = { docType, nameSpaces: { namespace: {
   `smart_health_checkin_response`: intentToRetain `true` } }, requestInfo }.
   Wrap in CBOR tag 24 where the CDDL says so (fixtures are the oracle).
3. `DeviceRequest` v1.0 (`readerAuthAll` unused; optional per-DocRequest
   `readerAuth` COSE_Sign1 exists in one fixture — support verifying-side
   construction only if cheap, else defer).
4. Generate an ephemeral HPKE recipient keypair (P-256, WebCrypto).
5. `encryptionInfo` = CBOR `["dcapi", { nonce, recipientPublicKey }]`,
   base64url-no-pad.
6. `navigator.credentials.get` argument: digital credentials request with
   `protocol: "org-iso-mdoc"` and base64url-no-pad `deviceRequest` /
   `encryptionInfo` fields (exact field names per fixtures).

**SessionTranscript** (both sides compute identically):

```text
dcapiInfo        = CBOR([encryptionInfoBase64Url, origin])
handover         = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`origin` is the requesting page's web origin as the browser asserts it.

**Response processing** (verifier side):

1. Outer envelope `{ protocol: "org-iso-mdoc", data: { response } }`;
   response = CBOR `["dcapi", { enc, cipherText }]`.
2. HPKE-open with the recipient private key: `info` = SessionTranscript
   bytes, `aad` = empty.
3. Walk `DeviceResponse` → document for our docType → `issuerSigned` +
   `deviceSigned`.
4. Verify `issuerAuth` (COSE_Sign1; x5chain → trust policy — demo mode:
   accept self-attested wallets, record the chain); re-hash each tag-24
   `IssuerSignedItem` (SHA-256) against MSO `valueDigests`; verify
   `deviceSignature` over `DeviceAuthentication` (which embeds
   SessionTranscript) against MSO `deviceKey`.
5. Extract element `smart_health_checkin_response` → parse JSON → run §6
   validators.

Expose granular pure functions (build request bytes, compute transcript,
open response, verify chain/digests/signature, extract element) plus a
convenience `openAndVerify`. Every function must be exercisable directly by
fixture tests.

**Crypto notes**: WebCrypto covers P-256 ECDH, HKDF-SHA256, AES-128-GCM,
ECDSA-SHA256 — implement HPKE (RFC 9180, base mode) by hand over those
primitives; port the prototype's implementation if simpler. Hand-roll CBOR
(definite lengths, tags 24/18, byte/text strings, maps with tstr and int
keys) — port from the prototype's encoder/decoder.

## 8. Browser layer (`src/browser`)

- `detectDcApiSupport(): { supported: boolean; reason?: string }` — feature
  detection (`navigator.credentials` + DigitalCredential availability), no
  user prompt.
- **Authority seam** — the one abstraction that survives from the prototype.
  Key custody hides behind:

```ts
type VerifierAuthority = {
  kind: string;
  prepareCredentialRequest(input: { request: SmartCheckinRequest }): Promise<{
    handle: string;                       // opaque
    navigatorArgument: unknown;           // pass to navigator.credentials.get
  }>;
  completeCredentialRequest(input: { handle: string; credential: unknown }): Promise<{
    smartResponse: SmartCheckinResponse;  // opened + wire-verified (not yet §6-cross-validated)
    presentation: { origin: string; issuerChainPem?: string[] };
  }>;
};
```

- `createBrowserLocalAuthority()` — keys in page memory (WebCrypto,
  non-extractable where possible). This is the default and is demo-grade by
  design.
- `{ server: string }` config resolves to an HTTP client authority: POST
  `{request}` to `${server}/credential-requests` → `{handle,
  navigatorArgument}`; POST `{credential}` to
  `${server}/credential-requests/{handle}/complete` → completion. The M4
  reference server implements this contract.

## 9. Submission layer (`src/submit`)

`buildWritePlan(response, { context, provenance }) → WritePlan` (pure) and
`executeWritePlan(plan, { fhirBase, mode, fetchImpl? }) → result`.

Mapping defaults:

- Each `application/fhir+json` artifact: its resource (or each Bundle entry
  resource) becomes a `POST` entry in one transaction `Bundle`
  (`Bundle.type = "transaction"`).
- Each `application/smart-health-card` artifact: one `DocumentReference`
  per artifact — `status: "current"`, `content[0].attachment` =
  `{ contentType: "application/smart-health-card", data: base64(JSON of
  value) }` — preserving the JWS chain of custody. Unpacking the embedded
  FHIR bundle is opt-in and off by default.
- When `provenance !== false`, append one `Provenance` per plan:
  `target` = all created entries (`fullUrl` references), `recorded` = now,
  `agent[0]` = `{ type: {coding:[{system:
  "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
  code:"author"}]}, who: { reference: context.patient } }` (omit `who` when
  no patient context), `entity[0]` = `{ role: "source", what: { identifier: {
  system: "https://smart-health-checkin.github.io/checkin-request-id",
  value: request.id } } }`, plus `target`-style reference to
  `context.appointment` in `Provenance.target` when present. Exact shape has
  latitude; the *requirements* are: patient-supplied origin is explicit, the
  request id is recoverable, and configured patient/appointment context is
  linked.
- `mode: "individual"` posts entries one-by-one (for servers with weak
  transaction support); `"dry-run"` returns the plan without network I/O.
- **No patient matching, ever.** Context is configuration; production
  matching is deployment policy and says so in the docs.

## 10. Facade (`src/kit`)

`runCheckin` orchestration:

1. Resolve `request` (scenario lookup → error if unknown) and
   `validateSmartCheckinRequest` it.
2. `detectDcApiSupport` → `status: "unsupported"` short-circuit.
3. Resolve authority (default browser-local); `prepareCredentialRequest`.
4. `navigator.credentials.get(navigatorArgument)`; user cancellation /
   `NotAllowedError` → `status: "declined"`.
5. `completeCredentialRequest` → wire-verified `smartResponse`.
6. `validateResponseAgainstRequest` — failure is `error` at stage
   `validate`; never submit an invalid response.
7. If `submit` configured: build + execute write plan per §9.
8. Return the outcome. (Navigation to `complete.returnUrl` is the *element's*
   job, not `runCheckin`'s — the function stays side-effect-free beyond the
   flow itself.)

The scenario library (§11) and the custom element (§5) also live here.

## 11. Scenario library

Named, canned `SmartCheckinRequest` templates. Ship at least these four
(ids/prefixes `demo-…`; content per §6 shapes):

| Key | Purpose | Items |
| --- | --- | --- |
| `insurance-only` | Coverage ahead of the visit | one `selection.fhir` with `profilesFrom: ["http://hl7.org/fhir/us/carin-bb"]`, accept SHC then fhir+json |
| `new-patient` | First-visit summary | one `selection.fhir`, `profilesFrom: ["http://hl7.org/fhir/us/core"]` + exact profiles for problems/allergies/medications, accept fhir+json |
| `phq2-dayof` | Day-of PHQ-2 (freshness/safety story) | one `form.fhir`, `questionnaireCanonical: "https://fhir.loinc.org/Questionnaire/55757-9"` |
| `medlist-refresh` | Follow-up med list | one `selection.fhir` with the US Core MedicationRequest profile |

Each entry: `{ label, description, request }`. Scenarios carry human
descriptions because the demo displays them.

## 12. Demo app (`demo/`, deploys to `/demo/`)

A standalone page proving the whole kit, configured **entirely by URL
fragment** (fragment, not query — identifiers and payloads must never reach
server logs). Grammar:

| Param | Meaning |
| --- | --- |
| `scenario` | Scenario key (§11). |
| `request` | base64url(JSON `SmartCheckinRequest`) — verbatim passthrough. |
| `patient`, `appointment` | FHIR references on the target server. When `appointment` present, fetch it for display context (best-effort). |
| `fhir` | Target FHIR base. Default `https://hapi.fhir.org/baseR4`. |
| `submit` | `transaction` (default) \| `individual` \| `dry-run`. |
| `returnUrl` | Closed-loop return leg. |

Precedence: `request` > `scenario` > default (`insurance-only`). Unknown
params ignored. React to `hashchange`.

**Backend configurability policy** (deliberate): `fhir=` stays user-
configurable — reusability across test contexts is the point — with
guardrails against a crafted link exfiltrating a real patient's share:

- Allowlist of known-open test servers (`https://hapi.fhir.org/baseR4` at
  minimum). Allowlisted target → quiet note "Submitting to the public HAPI
  test server (periodically wiped — test data only)."
- Any other target → prominent warning naming the host: "This link submits
  your shared data to `<host>`. Only proceed with test data and a server you
  recognize." Require an explicit acknowledgment (checkbox or confirm) before
  the Start button enables.
- Never accept auth material in the URL.

**UI states**: (1) configure — scenario chips (linking to fragment
variants), scenario description, resolved `CheckinConfig` + request JSON,
backend note, Start button (disabled with reason when unsupported /
unacknowledged custom backend); (2) running; (3) response — per-item status
table, artifact list, the write plan (always show the Bundle; in dry-run
this is the terminal state); (4) submitted — server outcome, deep links to
the created resources on the target server, and the return-leg button when
`returnUrl` is set. Errors render the failing stage plainly.

## 13. Landing page (`site/`, deploys to `/`)

Static, single file, no framework. Content: eyebrow `smart-health-checkin`;
h1 `checkin-provider-kit`; one-paragraph value statement (embed a check-in
flow in any provider surface; response returns to that surface; plumbing
stays inside the kit); action links (demo, GitHub repo, draft spec); a
five-step flow diagram — `configure → launch → receive → submit → return`
with sublabels "patient's wallet" under *launch*, "your FHIR server" under
*submit*, "your workflow" under *return* — captioned with the closed-loop
sentence; the `runCheckin` config snippet; a status note (design draft,
link to README and prototype).

**Visual design (landing + demo share it)**: typography IBM Plex Sans
(body/headings) + IBM Plex Mono (code, eyebrows, labels) via Google Fonts
with real fallback stacks. Token palette, three-state theme pattern (bare
`:root` = light; `@media (prefers-color-scheme: dark)` guarded
`:root:not([data-theme="light"])`; `:root[data-theme="dark"]` override —
every color defined on bare `:root` first; `body` background always set from
a token):

| Token | Light | Dark |
| --- | --- | --- |
| `--bg` | `#f7faf9` | `#0e1513` |
| `--surface` | `#ffffff` | `#16201d` |
| `--ink` | `#16211f` | `#e6efec` |
| `--muted` | `#5b6b67` | `#93a5a0` |
| `--accent` | `#0e7c6b` | `#3ac2aa` |
| `--line` | `#dce5e2` | `#24322e` |
| `--code-bg` | `#eef4f2` | `#131c19` |

Max content width ~46rem; visible focus states; SVG diagrams inline with
`currentColor` strokes/text so they follow the theme.

## 14. Documentation deliverables

- **`README.md`** — the front door and API contract: mission paragraph;
  status; config-as-data section with the §5 types and both usage snippets
  (JS + element); layer table; submission-mapping defaults; demo section
  with grammar summary linking to `demo/README.md`; fixtures/conformance
  section; relationship-to-prototype section; roadmap; development commands;
  license.
- **`demo/README.md`** — full URL grammar, precedence, backend policy,
  status.
- **`docs/integrating.md`** (M3) — "integrate in an afternoon": drop-in
  element snippet, JS-API pattern, encapsulation pattern (surface POSTs to
  *your* FHIR backend), server-owned-authority pointer, production
  checklist (patient matching, auth, retention are yours).
- **`docs/security-notes.md`** — browser-local keys are demo-grade;
  server-owned authority for production; fragment-param rationale; demo
  backend allowlist/warning policy; no-PHI-in-fixtures rule.
- **`fixtures/PROVENANCE.md`** — source repo URL, pinned commit, copy date,
  do-not-edit-by-hand rule.

## 15. Build, CI, deployment

- **`scripts/build-pages.sh`**: clean `_site/`; copy `site/index.html` →
  `_site/index.html`; copy `demo/index.html` → `_site/demo/index.html`;
  `bun build demo/src/main.ts --outdir _site/demo --format esm --minify`;
  `touch _site/.nojekyll`.
- **`.github/workflows/pages.yml`**: on push to `main` +
  `workflow_dispatch`; permissions `contents: read, pages: write, id-token:
  write`; concurrency group `pages`; job 1 checkout → `oven-sh/setup-bun@v2`
  → `bun install` → `bun run typecheck` → `bun test` → build script →
  `actions/upload-pages-artifact@v3` (path `_site`); job 2
  `actions/deploy-pages@v4` with the `github-pages` environment. Repo
  setting: Pages → Source → **GitHub Actions**.
- **`.github/workflows/ci.yml`**: on `pull_request` and pushes to non-main
  branches — install, typecheck, `bun test`.
- **`package.json` scripts**: `test` (`bun test`), `typecheck`
  (`tsc --noEmit`), `build:pages`.
- **`scripts/vendor-fixtures.sh`**: re-vendor `fixtures/` from the
  prototype repo at an explicit ref; rewrite `PROVENANCE.md`.
- **`.gitignore`**: `node_modules/`, `_site/`, `dist/`, `*.log`,
  `.DS_Store`.

## 16. Testing strategy and the fixture corpus

`fixtures/` layout (from the prototype; every binary CBOR artifact has a
`.hex`/`.diag` sidecar; every fixture dir has a `manifest.json` or
`metadata.json`; no PHI; some intentionally public test-only private keys,
marked in metadata):

- `dcapi-requests/real-chrome-android-smart-checkin/` — a **real
  Chrome/Android** request capture: decoded DeviceRequest, ItemsRequest,
  EncryptionInfo, SessionTranscript sidecars, plus a public test-only RP
  HPKE private JWK that opens the matching response fixture.
- `dcapi-requests/ts-smart-checkin-basic/`, `…-readerauth/` — synthetic
  request fixtures (the readerauth one carries exact tag-24 ItemsRequest,
  SessionTranscript, detached readerAuth COSE_Sign1, test reader certs).
- `dcapi-requests/negative-mattr-mdl/` — negative case (foreign docType).
- `responses/real-chrome-android-smart-checkin/` — matching real wallet
  response: encrypted `dcapi` wrapper, plaintext DeviceResponse,
  issuer/device COSE artifacts.
- `responses/android-kotlin-generated/`, `responses/pymdoc-minimal/` —
  additional response oracles.
- `captures/` — normalized full-session bundles; `sample-shc/` — SMART
  Health Card samples with issuers and a verify script.

Required test suites (Bun test, all in-repo):

1. **Model**: validator accept/reject cases, including every §6 cross-check
   (mismatched requestId, dangling `fulfills`, mediaType ∉ accept, missing
   per-item status, fhir+json without fhirVersion, SHC with outer
   fhirVersion, mixed-version Bundle).
2. **Wire request oracle**: build request bytes from each request fixture's
   inputs → byte-equal to the fixture (ItemsRequest, DeviceRequest,
   encryptionInfo, SessionTranscript).
3. **Wire response oracle**: HPKE-open the encrypted response fixture with
   the checked-in test key → byte-equal plaintext; verify MSO digests and
   both signatures; extract and parse the SMART response; negative fixture
   must be rejected.
4. **Submit**: write-plan snapshots for representative responses (fhir+json
   single resource, Bundle, SHC artifact, mixed), provenance on/off,
   dry-run/individual/transaction shapes.
5. **Facade**: `runCheckin` with an injected fake authority + fake
   credentials API (happy path, decline, unsupported, invalid response,
   submit failure).
6. **Demo**: fragment parsing/precedence/allowlist unit tests (extract the
   parsing into a testable module).

**Definition of "wire done"**: suites 2–3 green over *every* applicable
fixture. When a byte-level judgment call arises, the fixture wins over this
document; the spec wins over intuition.

## 17. Milestones

| # | Deliverable | Definition of done |
| --- | --- | --- |
| M0 | Scaffold: repo, README, layer stubs, landing, demo (config-parsing only), fixtures vendored, Pages deploy | Site live: landing at `/`, demo at `/demo/` |
| M1 | `model` + `wire` ports | Test suites 1–3 green over all fixtures; no DOM imports in either layer |
| M2 | `browser` + `submit` + demo wired end-to-end | Full loop demoable on an Android phone with the prototype's reference wallet against public HAPI; dry-run mode; backend allowlist/warning UX; screen-recordable |
| M3 | `<smart-checkin>` element + `docs/integrating.md` | A copy-paste snippet works on a blank page; demo gains an `/demo/embed.html` example |
| M4 | Server-owned authority reference (small Bun server implementing §8's HTTP contract; in-memory keys; audit log) | Demo runs with `authority={server}` against a locally run instance; documented |
| M5 | Scenario library polish + demonstration script | Scenarios in the kit (not the demo); `docs/demo-script.md` with 5 URLs, expected outcomes, troubleshooting for demonstration events |

Sequencing: M1 is the bulk (port + oracles). M2 unlocks all demonstration
value. M3–M5 are independent after M2.

## 18. Risks and mitigations

- **HPKE by hand**: RFC 9180 base mode over WebCrypto is well-trodden;
  fixtures make errors loud. Port the prototype's implementation first.
- **DC API platform variance**: Chrome/Android works today; iOS/Safari is an
  open spec issue. The demo must degrade to a clear "unsupported browser"
  card (with a pointer to the spec's status) rather than a broken button.
- **Public HAPI reliability/wipes**: acceptable for a demo; the allowlist
  can add a second open server; `dry-run` always works offline.
- **Fixture drift**: fixtures are pinned; re-vendor deliberately via the
  script, never edit in place.
- **Scope creep toward wallet-side**: resist; the prototype's Android wallet
  is the test counterpart.

## 19. Explicit non-goals

Credential issuance; wallet/responder implementation; patient
matching/identity proofing; production FHIR auth; longitudinal storage;
payments; OID4VP binding; QR/kiosk relay transports (deployment UX per the
spec, not kit protocol); npm publishing (until the API stabilizes).
