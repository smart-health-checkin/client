# Getting started

You have a web page — a patient portal, a kiosk screen, a link you text
people before their visit. This guide gets a working check-in on it.

## What this actually does

Your page asks the patient's health app for specific things (an insurance
card, a medication list, a questionnaire). The browser hands that request to
whatever wallet app the patient has, the patient chooses what to share, and
the answer comes back **to your page** — verified, validated, in your own
JavaScript.

The important word is *back*. The patient never leaves for a third-party app
and hopes to find their way home; you keep the thread of the visit, and can
still collect the copay, show the consent form, and route them onward.

## Install

There's no npm registry involved — install from git, pinning a branch or a
commit:

```sh
npm install github:smart-health-checkin/checkin-client
bun add github:smart-health-checkin/checkin-client      # or bun/pnpm/yarn
```

Or skip the build step entirely and import the hosted module:

```html
<script type="module">
  import { requestCheckin } from "https://smart-health-checkin.org/lib/checkin.js";
</script>
```

## Your first request

A request is a list of *items* — each one a thing you want, described in
terms the patient's app can act on and the patient can understand.

```ts
import { requestCheckin } from "@smart-health-checkin/checkin-client";

const response = await requestCheckin({
  purpose: "Before your visit with Dr. Reyes",
  items: [
    {
      id: "allergies",
      title: "Allergies and intolerances",
      summary: "So we can check them against anything we prescribe.",
      content: {
        kind: "selection.fhir",
        profiles: [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
        ],
      },
      accept: ["application/fhir+json"],
    },
  ],
});
```

You wrote `purpose` and `items`; the kit filled in the protocol boilerplate
(`type`, `version`, a unique `id`, `fhirVersions`). `purpose` and each
`title` are shown to the patient, so write them for a person, not a chart.

See [Request model](requests.md) for the full vocabulary of
selectors.

## What you get back

```ts
for (const artifact of response.artifacts) {
  if (artifact.mediaType === "application/fhir+json") {
    // artifact.value is a FHIR resource or Bundle — prefill your form with it
  }
}

for (const status of response.requestStatus) {
  // one entry per item: fulfilled | partial | unavailable | declined | …
}
```

By the time you see it, the response has been decrypted, its signatures
verified, and its contents cross-checked against what you asked for. A
response that doesn't match the request never reaches your code.

[Response model](responses.md) covers artifacts, per-item statuses,
and the prefill patterns worth copying.

## Handling the paths that aren't success

Three things happen in the real world besides "it worked":

```ts
import { requestCheckin, CheckinFlowError } from "@smart-health-checkin/checkin-client";

try {
  const response = await requestCheckin(myRequest);
  prefillMyForm(response);
} catch (e) {
  if (e instanceof CheckinFlowError) {
    switch (e.outcome.status) {
      case "declined":     // the patient said no, or closed the wallet
      case "unsupported":  // this browser has no Digital Credentials API
      default:             // something broke; e.outcome.error names the stage
    }
  }
  showMyOrdinaryForm();
}
```

**Every one of these falls back to the form you already have.** That's the
design: check-in is an accelerator on top of your existing intake, not a
replacement that strands people when it isn't available. Prefer
`runCheckin(...)` if you'd rather branch on `outcome.status` than catch.

## Running it without a phone

Most development machines have no wallet. Pass a different mediator and the
whole flow — real CBOR, COSE signatures, HPKE encryption — runs locally:

```ts
import { createWebWalletCredentialGetter } from "@smart-health-checkin/checkin-client";

const response = await requestCheckin(myRequest, {
  getCredential: createWebWalletCredentialGetter({ walletUrl: "/wallet.html" }),
});
```

That opens a wallet *web app* in a tab with a real consent screen. For tests
that shouldn't stop for a human, `createMockWalletCredentialGetter` answers
instantly — and takes a per-item specification, so a test can pin exactly
what comes back, including declines and missing data. Both are covered in
[Wallets and browser support](wallets.md).

You can also just [try the demo](https://smart-health-checkin.org/demo/) —
switch the responder to "demo wallet app" and watch the whole exchange,
including every wire artifact.

## Then what?

Whatever your workflow does. The kit's job ends with the response in your
hand; it has no idea a FHIR server exists. If you want the results written as
FHIR, [there's an optional helper](fhir.md) — or use your own client, your
own auth, your own model.

## Using it from a framework

The core is a plain async function, so bindings are thin: a
[React hook](https://smart-health-checkin.org/demo/react.html) and an
[Angular service](https://smart-health-checkin.org/demo/angular.html) — each
about twenty lines, each running the same flow, both live on this site with
their source in `demo/src/frameworks/`.

Next: [Request model](requests.md) ·
[Response model](responses.md) ·
[Production checklist](production.md)
