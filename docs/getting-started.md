# Getting started

This guide takes you from nothing to a working check-in on a page you own: a
patient portal, a kiosk screen, a link you text people before their visit.

## What it does

A check-in is a short exchange between your page and the patient's health
app. Your page sends a request that names the things the visit needs: an
insurance card, a medication list, a questionnaire. The browser passes that
request to the health app — the protocol calls the app a *wallet*. The
patient sees each item and chooses what to share. The app sends back the data
it agreed to share, encrypted so that only your page can read it, and your
page receives it as ordinary JavaScript objects.

The patient never leaves your page. They are not sent to another site and
asked to find their way back. That matters for the rest of the visit: after
the check-in you can still collect a copay, show a consent form, or move the
patient to the next screen, because you are still in control of the page.

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

You can try this before installing anything. The [clinic demo](demo/) is a
fictional clinic's check-in page; it opens with a demo health app in a second
tab, so it works in any browser. The [kiosk demo](demo/kiosk.html) shows a
screen with no health app of its own handing the request to a phone. The
[allergy example](demo/autofill.html) fills a form from the response and then
asks the patient only for what the record did not contain.

## Install

The library is not on npm. Install it from its git repository; you can pin a
branch or a specific commit:

```sh
npm install github:smart-health-checkin/client
bun add github:smart-health-checkin/client      # or bun/pnpm/yarn
```

The install step compiles the TypeScript, so you get JavaScript and type
declarations. If you would rather not install anything, the same code is
hosted as an ES module that a page can import directly:

```html
<script type="module">
  import { requestCheckin } from "https://smart-health-checkin.org/client/lib/checkin.js";
</script>
```

## Your first request

A request is a list of items. Each item describes one thing you want in two
ways at once: a title the patient will read, and a description the health app
can act on.

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

You wrote `purpose` and `items`. The library fills in the rest of the request:
the protocol's `type` and `version` fields, a unique `id`, and the FHIR
versions you accept. The patient sees `purpose` and each `title`, so write
them the way you would say them to a person.

`content` says what data you are asking for. The kind `selection.fhir` means
"records the app already has that match these FHIR profiles". `accept` lists
the formats you can handle. [Request model](requests.md) covers all the
options.

## What you get back

`requestCheckin` resolves with a response. It has two parts: `artifacts`, the
data the patient shared, and `requestStatus`, one entry per item saying what
happened to that item.

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

Before the response reaches your code, the library has decrypted it, checked
its signatures, and confirmed that it answers the request you sent — the same
request id, and only formats you said you accept. If any of that fails,
`requestCheckin` throws instead of returning. [Response model](responses.md)
explains artifacts and statuses in detail and shows how to use them to
prefill a form.

## Declined, unsupported, and errors

Three things can happen besides success. The patient can decline, either for
the whole request or by closing the health app. The browser may not support
the Digital Credentials API, which is the browser feature this protocol runs
on. Or something can fail along the way. `requestCheckin` reports all three
by throwing a `CheckinFlowError`, and `e.outcome.status` says which it was.

In every sample from here on, names that start with `my` are yours: the
request you built, the form you already have.

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

Plan for all three paths to end at the form you already have. A check-in saves
the patient typing when it works; when it does not, the visit still has to
happen, so your ordinary intake form stays the fallback.

If you would rather not use exceptions, `runCheckin` does the same work and
returns an object with a `status` field instead of throwing.

## Who answers the request

Three kinds of thing can answer a request. The library calls them
*responders*:

- The **platform wallet** is a health app installed on the patient's device.
  The browser reaches it through the Digital Credentials API. On a desktop,
  the browser shows a QR code; the patient scans it with their phone, the app
  on the phone answers, and the response arrives in the desktop page.
- A **web wallet** is a health app that is a website. It opens in a new tab,
  the patient chooses what to share there, and the tab sends the answer back.
- The **mock** is a stand-in that answers immediately with made-up data. It
  exists for development and automated tests.

Inside the library these differ in exactly one place. `requestCheckin` builds
the request, then calls one function to get the health app's sealed answer,
then decrypts and checks that answer. That one function is called
`getCredential`. By default it is the browser's own `navigator.credentials.get`,
which reaches the platform wallet. To use a web wallet or the mock, you pass a
different `getCredential`. The library calls these functions *credential
getters*, and it provides them; you do not write them.

To let the patient choose, you do three things. You state a **policy**: which
kinds of responder your page accepts, and which one to present first. The
library turns the policy into a list of responders, each marked with whether
it works in this browser. You render that list — one button per responder is
enough — and when the patient clicks one, you pass that responder's
credential getter to `requestCheckin`:

```ts
import {
  resolveResponders, credentialGetterFor, requestCheckin,
} from "@smart-health-checkin/client";

const responders = await resolveResponders({
  platform: true,                 // the wallet installed on the device
  webWallets: "/wallets.json",    // web wallets you recognize
  mock: import.meta.env.DEV,      // development only
  default: "platform",            // the one to lead with
});

for (const responder of responders) {
  const button = document.createElement("button");
  button.textContent = responder.name;
  button.disabled = !responder.available;     // e.g. no platform wallet in this browser
  button.onclick = async () => {
    const response = await requestCheckin(myRequest, {
      getCredential: credentialGetterFor(responder),
    });
    prefillMyForm(response);
  };
  myMenu.append(button);
}
```

The library does not render anything; the list is data, and the buttons are
yours. [Wallets and browser support](wallets.md) explains the policy options,
where the list of web wallets comes from, and how to make the mock return
exactly the data a test needs.

Whichever responder answers, the response is encrypted and signed the same way
and goes through the same checks. A flow you have tested against the web
wallet or the mock is the same flow that will run against a real health app.
The [clinic demo](https://smart-health-checkin.org/client/demo/) opens with the
demo web wallet selected, so you can watch the whole exchange in any browser.

## After the response

Once `requestCheckin` has returned, the library is finished. It does not know
about your FHIR server, your forms, or your payment step; what you do with the
response is ordinary application code. If you want to write the response to a
FHIR server, the library includes an optional module for that, described in
[Writing FHIR](fhir.md). You can equally well use your own client and your
own data model.

## From React or Angular

`requestCheckin` is a plain async function, so a framework binding is small.
It has to do three things: hold the list of responders, make the call, and
track the state of the call. A
[React hook](https://smart-health-checkin.org/client/demo/react.html) and an
[Angular service](https://smart-health-checkin.org/client/demo/angular.html)
that do exactly that are live on this site, with their source in
`demo/src/frameworks/`.

Next: [Request model](requests.md) ·
[Response model](responses.md) ·
[Production checklist](production.md)
