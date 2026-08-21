# Integrate in an afternoon

You have a portal page (or any provider-controlled web page) and a FHIR
server. This guide adds a working SMART Health Check-in flow to that page.

## 1. Drop in the element

```html
<script type="module" src="https://smart-health-checkin.github.io/checkin-provider-kit/element.js"></script>

<smart-checkin
  scenario="new-patient"
  patient="Patient/123"
  appointment="Appointment/456"
  fhir-base="https://your-fhir-server.example.org/r4"
  return-url="/checkin/payment"
  label="Share from your health app">
</smart-checkin>
```

That's the whole integration: the element renders a button, launches the
Digital Credentials API request, receives and cryptographically verifies the
wallet's response on your page, POSTs a FHIR transaction Bundle (with a
Provenance resource) to `fhir-base`, and then sends the patient to
`return-url` — your workflow keeps going.

> The hosted `element.js` is for experimentation. For anything real, vendor a
> pinned copy (build it from this repo with `bun build src/element-register.ts`)
> so you control what runs on your page.

Attributes:

| Attribute | Meaning |
| --- | --- |
| `scenario` | Named request template from the kit's scenario library. |
| `request-json` | Full `SmartCheckinRequest` JSON (overrides `scenario`) — write your own request instead of using a template. |
| `patient`, `appointment` | FHIR references on your server; stamped into Provenance. |
| `fhir-base` | Where to submit. Omit for a display-only flow. |
| `submit-mode` | `transaction` (default) \| `individual` \| `dry-run`. |
| `return-url` | Closed-loop return leg after completion. |
| `label` | Button text. |
| `mock` | Demo only: answer with the built-in mock wallet instead of a real one. |

Listen for the outcome (dispatched before any navigation; call
`event.preventDefault()` to keep control of routing):

```js
document.addEventListener("checkin-complete", (event) => {
  const outcome = event.detail; // CheckinOutcome
  if (outcome.status === "completed") { /* … */ }
});
```

## 2. Or: autofill — just get the data back

When you already have a data-collection UI and only want the patient's data
to land in it (the way browser autofill fills a form), skip submission
entirely:

```ts
import { requestCheckin, CheckinFlowError } from "@smart-health-checkin/provider-kit";

try {
  const response = await requestCheckin({ scenario: "allergy-review" }); // or a full SmartCheckinRequest
  for (const artifact of response.artifacts) {
    // application/fhir+json artifacts → prefill your form inline
  }
} catch (e) {
  if (e instanceof CheckinFlowError && e.outcome.status === "declined") {
    // patient chose not to share — fall back to your blank form
  }
}
```

One await, one validated `SmartCheckinResponse`, no side effects — your code
decides what to render and what to submit. The
[allergy-review example](https://smart-health-checkin.github.io/checkin-provider-kit/demo/autofill.html#mock=1)
shows the full pattern: request US Core allergy data, render each allergy as
a form row, and let the patient confirm/annotate before anything is sent.

## 3. Or use the full JS API

```ts
import { runCheckin } from "@smart-health-checkin/provider-kit";

const outcome = await runCheckin({
  request:  { scenario: "phq2-dayof" },        // or { request: {...} }
  context:  { patient: "Patient/123" },
  submit:   { fhirBase: "https://your-fhir-server.example.org/r4" },
  complete: { returnUrl: "/checkin/payment" },
});
```

`outcome.status` is `completed | declined | unsupported | error`;
`declined` means the patient cancelled (offer the front-desk path),
`unsupported` means the browser lacks the Digital Credentials API (show your
existing forms). The kit validates every response against the request before
submitting anything.

## 4. The encapsulation pattern

Your backend never talks to patient apps. The browser surface receives the
verified response and POSTs ordinary FHIR — one `Bundle` of type
`transaction` containing the shared resources plus a `Provenance` marking
them patient-supplied (with the check-in request id and your configured
patient/appointment context). Your FHIR API stays your single front door.

Wire your own auth by fetching with your session credentials: pass a custom
`fetchImpl` via `runCheckin(config, { fetchImpl })`, or do the POST yourself
from the `checkin-complete` event using `buildWritePlan(...)`.

## 5. Production checklist (yours, not the kit's)

- **Patient matching / context**: the kit stamps the context you configure
  and never guesses. Bind the page to an authenticated patient session.
- **FHIR authorization**: the demo posts anonymously to a public test
  server; production wraps the executor in your auth.
- **Key custody**: the default authority keeps HPKE keys in page memory
  (fine for demos). For server-side custody and audit, implement the
  two-call `VerifierAuthority` HTTP contract (`createServerAuthority`) — a
  reference server is on the roadmap (M4).
- **Trust policy**: the kit verifies signatures and surfaces the wallet's
  certificate chain; deciding which issuers/wallets you accept is
  deployment policy.
- **Retention & review**: decide where patient-supplied data lands
  (staging area vs. chart) and who reviews it.
