# Integrate in an afternoon

You have a portal page (or any provider-controlled web page) and a FHIR
server. This guide adds a working SMART Health Check-in flow to that page.

## 1. Ask, then use the answer

```html
<script type="module">
  import { requestCheckin }
    from "https://smart-health-checkin.github.io/checkin-provider-kit/kit.js";
  // (bundler users: import from the kit source or a vendored build instead)

  const response = await requestCheckin({
    purpose: "Before your visit",
    items: [{
      id: "summary", title: "Clinical summary",
      content: { kind: "selection.fhir", profilesFrom: ["http://hl7.org/fhir/us/core"] },
      accept: ["application/fhir+json"],
    }],
  });
  // response.artifacts → your code decides what happens next
</script>
```

That is the whole integration. The kit builds the request, invokes the
patient's wallet through the browser, cryptographically verifies what comes
back, cross-checks it against what you asked for, and hands you a validated
`SmartCheckinResponse` — on your page, in your code. Nothing is submitted
anywhere unless you ask for it (§3).

> The hosted `kit.js` is for experimentation. For anything real, vendor a
> pinned build (`bun build src/index.ts`) so you control what runs on your
> page.

**Running without a platform wallet.** Pass a different mediator via
`getCredential` — the demo ships a wallet *web app* (a popup with a real
consent screen) and a non-interactive mock:

```js
import { createWebWalletCredentialGetter } from ".../kit.js";
await requestCheckin(myRequest, {
  getCredential: createWebWalletCredentialGetter({ walletUrl: "/wallet.html" }),
});
```

## 2. Or: autofill — just get the data back

When you already have a data-collection UI and only want the patient's data
to land in it (the way browser autofill fills a form), skip submission
entirely:

```html
<script type="module">
  import { requestCheckin, CheckinFlowError }
    from "https://smart-health-checkin.github.io/checkin-provider-kit/kit.js";
  // (bundler users: import from the kit source / a vendored build instead)

  try {
    const response = await requestCheckin({
      purpose: "Review your allergy list before your visit",
      items: [{
        id: "allergies", title: "Allergies and intolerances",
        content: {
          kind: "selection.fhir",
          profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
        },
        accept: ["application/fhir+json"],
      }],
    });
    for (const artifact of response.artifacts) {
      // application/fhir+json artifacts → prefill your form inline
    }
  } catch (e) {
    if (e instanceof CheckinFlowError && e.outcome.status === "declined") {
      // patient chose not to share — fall back to your blank form
    }
  }
</script>
```

`requestCheckin` accepts the inline shape above (boilerplate filled in), a
complete `SmartCheckinRequest`, or a registered scenario name.

One await, one validated `SmartCheckinResponse`, no side effects — your code
decides what to render and what to submit. The
[allergy-review example](https://smart-health-checkin.github.io/checkin-provider-kit/demo/autofill.html#wallet=app)
shows the full pattern: request US Core allergy data, render each allergy as
a form row, and let the patient confirm/annotate before anything is sent.

## 3. Or let the kit write the FHIR

```ts
import { runCheckin } from ".../kit.js";

const outcome = await runCheckin({
  request: { request: myRequest },            // or { scenario: "registered-name" }
  context: { patient: "Patient/123", appointment: "Appointment/456" },
  submit:  { fhirBase: "https://your-fhir-server.example.org/r4" },
});

if (outcome.status === "completed") location.assign("/checkin/payment");
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
`fetchImpl` via `runCheckin(config, { fetchImpl })`, or skip `submit`
entirely and do the POST yourself — `buildWritePlan(...)` gives you the
Bundle without sending it.

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
