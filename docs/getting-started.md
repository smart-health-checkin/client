# Getting started

Add SMART Health Check-in to a page you own, such as a patient portal, a kiosk, or a link you text before a visit. The patient's health app fills in what the visit needs, and the patient never leaves your page.

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
          <text x="20" y="110">result.response → the data, in your own code</text>
        </g>
        <g class="sans" fill="currentColor" font-size="10.5" opacity="0.75">
          <text x="20" y="132">prefill your forms · write FHIR · take payment · ask follow-ups · route the patient</text>
          <text x="20" y="148">…whatever your workflow needs, whenever it needs it — you never left your page.</text>
        </g>
      </svg>
      <figcaption>
        Your page asks, the patient's health app answers, and the verified
        response lands in your own code. On a desktop the browser offers a QR
        code, so the phone answers and the data still arrives in the desktop page.
      </figcaption>
    </figure>

## Try it first

- [Clinic demo](demo/): a check-in page with a demo health app that opens in a tab. Works in any browser.
- [Wallet picker](demo/picker.html): the drop-in picker in different situations and styles.
- [Allergy form](demo/autofill.html): fills a form from the response, then asks only for what's missing.
- [Kiosk](demo/kiosk.html): a screen with no health app hands the request to a phone.

## Install

The library isn't on npm. Install it from GitHub:

```sh
npm install github:smart-health-checkin/client
bun add github:smart-health-checkin/client
```

Or load a hosted module, with no build step:

| File | What it gives you |
| --- | --- |
| `https://smart-health-checkin.org/client/lib/ui.js` | `<smart-checkin-picker>`, with everything it needs |
| `https://smart-health-checkin.org/client/lib/checkin.js` | `runCheckin`, `wallets`, `CheckinResponse`, and the rest of the root module |
| `https://smart-health-checkin.org/client/lib/handoff.js` | The kiosk hand-off |
| `https://smart-health-checkin.org/client/lib/wallet.js` | For building a web wallet |
| `https://smart-health-checkin.org/client/lib/testing.js` | The mock wallet, for demos and tests |

Each has a pinned copy at `/client/lib/<version>/`, for example `/client/lib/0.2.0/ui.js`.

## The quickest way: the picker

The picker shows the patient the health apps they can use, runs the check-in, and hands you the result.

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/ui.js"></script>

<smart-checkin-picker registry="/wallets.json"></smart-checkin-picker>

<script type="module">
  const picker = document.querySelector("smart-checkin-picker");
  picker.request = myRequest;
  picker.addEventListener("smart-checkin-response", (e) => {
    prefillMyForm(e.detail.response);
  });
</script>
```

- The phone's own health app leads when the browser can reach it.
- Web health apps from your registry follow. Leave out `registry` to offer only the phone's app.
- [Wallet picker](picker.md) covers its options, events, and styling.

Names that start with `my` are yours: the request you built, the form you already have.

## Or call runCheckin yourself

Draw your own buttons, and call `start` on the wallet the patient chose, inside the click.

```ts
import { wallets } from "@smart-health-checkin/client";

const options = await wallets({ registry: "/wallets.json" });

for (const wallet of options) {
  const button = document.createElement("button");
  button.textContent = wallet.name;
  button.onclick = async () => {
    const result = await wallet.start(myRequest);
    if (result.status === "completed") prefillMyForm(result.response);
    else showMyOrdinaryForm();
  };
  myMenu.append(button);
}
```

`start` opens a web wallet's tab right away, while the browser still allows it. Call it directly from the click handler, before any `await`.

With no wallet named, `runCheckin(myRequest)` uses the phone's own health app.

## Write a request

A request is a list of items. Each item has a title the patient reads and a description the health app acts on.

```ts
import { checkinRequest } from "@smart-health-checkin/client";

const myRequest = checkinRequest({
  purpose: "Before your visit with Dr. Reyes",
  items: [
    {
      id: "allergies",
      title: "Allergies and intolerances",
      summary: "So we can check them against anything we prescribe.",
      content: {
        kind: "selection.fhir",
        profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
      },
      accept: ["application/fhir+json"],
    },
  ],
});
```

| Field | What it's for |
| --- | --- |
| `purpose` | One line the patient sees. Write it the way you'd say it. |
| `items[].id` | Your name for the item. You look the answer up by it. |
| `items[].title`, `summary` | What the patient sees for this item. |
| `items[].content` | What you're asking for: records by FHIR profile (`selection.fhir`), or a form to fill in (`form.fhir`). |
| `items[].accept` | The formats you can handle. |

The library fills in the protocol fields and a unique id. [Request model](requests.md) covers every option.

## Read the response

A completed check-in gives you a `CheckinResponse`. The library has already decrypted it, checked its signatures, and confirmed it answers your request.

```ts
const response = result.response;

response.status("allergies");                   // "fulfilled", "declined", …
response.resources("allergies");                // the FHIR resources for that item
response.form("phq2");                          // a form item's QuestionnaireResponse
response.json;                                  // the full response as received
```

[Response model](responses.md) covers every lookup, SMART Health Cards, and how trust is decided.

## When it doesn't complete

Every check-in ends with a status. Plan for each to end at the form you already have.

| `result.status` | What happened | What to do |
| --- | --- | --- |
| `completed` | The patient shared, and the response checked out | Use `result.response` |
| `declined` | The patient said no, or closed the health app | Show your ordinary form |
| `failed` | Something went wrong; `result.error.code` says what | Show your ordinary form; log the code |

| `result.error.code` | Meaning |
| --- | --- |
| `unsupported` | This browser can't reach that health app |
| `blocked` | The browser blocked the health app's tab |
| `timeout` | The health app didn't answer in time |
| `wallet-error` | The health app reported an error |
| `invalid-response` | The response failed decryption, signatures, or checks |
| `server` | Your server holding the keys failed |

## Test without a phone

```ts
import { mockWallet } from "@smart-health-checkin/client/testing";

const result = await mockWallet().start(myRequest); // answers at once with made-up data
```

Add the `mock` attribute to the picker to offer it there. [Test and debug](testing.md) covers the mock and the connectathon's testing tools.

## Next

- Adding check-in to a page: [Request model](requests.md) · [Response model](responses.md) · [Offering wallets](wallets.md) · [Production checklist](production.md)
- Building a health app: [Build a wallet](build-a-wallet.md)
- Upgrading from 0.1: [Upgrading](upgrading.md)
