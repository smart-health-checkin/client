# Getting started

You have a web page — a patient portal, a kiosk screen, a link you text
people before their visit. This guide gets a working check-in on it.

## What it does

Your page asks the patient's health app for specific things (an insurance
card, a medication list, a questionnaire). The browser hands that request to
whatever wallet app the patient has, the patient chooses what to share, and
the answer comes back **to your page** — verified, validated, in your own
JavaScript.

The important word is *back*. The patient never leaves for a third-party app
and hopes to find their way home; you keep the thread of the visit, and can
still collect the copay, show the consent form, and route them onward.

<figure class="flow">
      <svg viewBox="0 0 640 168" role="img" aria-label="Your page asks; the patient's wallet answers; the awaited response lands back in your own code, where forms, FHIR, payment and routing happen in any order.">
        <defs>
          <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" fill="currentColor"/>
          </marker>
        </defs>
        <g fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="4" y="20" width="150" height="38" rx="6"/>
          <rect x="245" y="20" width="150" height="38" rx="6"/>
          <line x1="154" y1="39" x2="239" y2="39" marker-end="url(#arr)"/>
          <line x1="395" y1="39" x2="470" y2="39" marker-end="url(#arr)"/>
          <path d="M470 39 H 560 V 78" marker-end="url(#arr)"/>
        </g>
        <g class="mono" fill="currentColor" font-size="12" text-anchor="middle">
          <text x="79" y="43">your page asks</text>
          <text x="320" y="43">wallet answers</text>
        </g>
        <g class="sans" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.65">
          <text x="79" y="72">a check-in request</text>
          <text x="320" y="72">patient consents per item</text>
        </g>
        <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3">
          <rect x="4" y="88" width="632" height="70" rx="8"/>
        </g>
        <g class="mono" fill="currentColor" font-size="12">
          <text x="20" y="110">await → you have the data, in your own code</text>
        </g>
        <g class="sans" fill="currentColor" font-size="10.5" opacity="0.75">
          <text x="20" y="132">prefill your forms · write FHIR · take payment · ask follow-ups · route the patient</text>
          <text x="20" y="148">…whatever your workflow needs, whenever it needs it — you never left your page.</text>
        </g>
      </svg>
      <figcaption>
        Two steps, then you're back in your own code with the response in hand.
        Everything after that — prefilling forms, writing FHIR, payment, next
        screens — is ordinary application logic, in whatever order you want.
        On a desktop the browser offers a QR code, so the phone's wallet answers
        and the data still lands in the page the patient was using.
      </figcaption>
    </figure>

Try it before installing anything: the [clinic demo](demo/) opens with a demo
wallet in a tab, the [kiosk](demo/kiosk.html) hands the request to a phone,
and the [allergy autofill](demo/autofill.html) prefills a form and asks only
for what the record didn't carry.

## Install

There's no npm registry involved — install from git, pinning a branch or a
commit:

```sh
npm install github:smart-health-checkin/client
bun add github:smart-health-checkin/client      # or bun/pnpm/yarn
```

Or skip the build step entirely and import the hosted module:

```html
<script type="module">
  import { requestCheckin } from "https://smart-health-checkin.org/client/lib/checkin.js";
</script>
```

## Your first request

A request is a list of *items* — each one a thing you want, described in
terms the patient's app can act on and the patient can understand.

```ts
import { requestCheckin } from "@smart-health-checkin/client";

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

## Declined, unsupported, and errors

Three things happen in the real world besides "it worked":

```ts
import { requestCheckin, CheckinFlowError } from "@smart-health-checkin/client";

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

## Who answers the request

By default, the patient's own wallet: on a phone the installed app; on a
desktop, a QR code the phone scans, with the answer landing back on the
desktop page. To also offer web wallets — or the mock, during development —
state a policy and render the list it gives you. Which one leads is part of
the policy:

```ts
import {
  resolveResponders, credentialGetterFor, requestCheckin,
} from "@smart-health-checkin/client";

const responders = await resolveResponders({
  platform: true,                 // the device's own wallet
  webWallets: "/wallets.json",    // web wallets you recognize
  mock: import.meta.env.DEV,      // development only
  default: "platform",            // the primary action
});
// render one control per responder; disable the unavailable; lead with isDefault

// …or whichever one the person clicked
const chosen = responders.find((r) => r.isDefault)!;
const response = await requestCheckin(myRequest, {
  getCredential: credentialGetterFor(chosen),
});
```

The library never draws the control. It turns a policy into data and a choice
into a mediator; [Wallets and browser support](wallets.md) has the hand-off
sketch, the registry format, and the mock's per-item specification for tests.

Whichever answers, the wire is the same — real CBOR, COSE signatures, HPKE —
so a flow proven against the web wallet is proven against the protocol.
[The demo](https://smart-health-checkin.org/client/demo/) opens with this
project's demo wallet in a tab: a real consent screen, no phone needed.

## After the response

Whatever your workflow does. The kit's job ends with the response in your
hand; it has no idea a FHIR server exists. If you want the results written as
FHIR, [there's an optional helper](fhir.md) — or use your own client, your
own auth, your own model.

## From React or Angular

The core is a plain async function, so bindings are thin: a
[React hook](https://smart-health-checkin.org/client/demo/react.html) and an
[Angular service](https://smart-health-checkin.org/client/demo/angular.html) — each
about twenty lines, each running the same flow, both live on this site with
their source in `demo/src/frameworks/`.

Next: [Request model](requests.md) ·
[Response model](responses.md) ·
[Production checklist](production.md)
