# Wallets and browser support

Something has to answer a check-in request. By default it is a health app
installed on the patient's device, which the browser reaches through the
Digital Credentials API. This guide explains the alternatives, how to offer
the patient a choice, and how to run the whole flow on a machine with no
health app at all.

Three words this guide uses with fixed meanings:

- A **responder** is whatever answers the request: the platform wallet, a web
  wallet, or the mock.
- A **policy** (the `ResponderPolicy` type) is what your page accepts and
  which responder it presents first.
- A **credential getter** is the function `requestCheckin` calls to obtain the
  health app's sealed answer. It is the `getCredential` option. The default is
  `navigator.credentials.get`, which reaches the platform wallet. Every other
  responder is reached through a different credential getter, and
  `credentialGetterFor(responder)` returns the right one.

## Configure the list of responding wallets

The three kinds of responder:

- The **platform wallet** is a health app installed on the device. The
  operating system decides which app that is; your page does not choose. On a
  desktop, the browser shows a QR code for the patient's phone to scan, and
  the app on the phone answers.
- A **web wallet** is a health app that runs as a website. It opens in a tab,
  the patient chooses what to share there, and the tab sends the answer back.
- The **mock** answers immediately with made-up data. It is for development
  and automated tests.

The platform wallet needs no configuration. A web wallet is a website, so
someone has to decide which websites your page is willing to send a request
to, and that decision is yours. You express it as a policy, and the library
gives you back a list of responders to show the patient:

```ts
import { resolveResponders, credentialGetterFor } from "@smart-health-checkin/client";

const responders = await resolveResponders({
  platform: true,                      // the wallet installed on the device
  webWallets: "/config/wallets.json",  // wallets this deployment recognizes
  mock: import.meta.env.DEV,           // development only
  default: "platform",                 // the primary action
});
```

Each entry in the list has what a button needs: `id`, `name`, `description`,
`iconUrl`, and `available`. When this browser cannot use a responder —
usually because it has no Digital Credentials API — `available` is false and
`reason` says why. The entry is still in the list, so you can show it disabled
rather than hiding it. Exactly one entry has `isDefault: true`: the one you
named in the policy if it is available, otherwise the first available one.
That way a page that prefers the platform wallet still leads with a working
option on a browser that has none.

Render one control per entry. When the patient clicks one, pass that entry to
`credentialGetterFor`:

```ts
for (const responder of responders) {
  const button = document.createElement("button");
  button.textContent = responder.name;
  button.disabled = !responder.available;
  button.onclick = () => requestCheckin(myRequest, {
    getCredential: credentialGetterFor(responder),
  }).then(prefillMyForm);
  myMenu.append(button);
}
```

With one web wallet configured you get a two-item list; with several, a menu.
The [clinic demo](https://smart-health-checkin.org/client/demo/) renders the
list as a split button: the default on the left, the others behind a caret.

### Where the library stops and your UI starts

The library never draws a button. It turns your policy into a list, and it
turns the responder the patient picked into a credential getter. Everything
between those two calls is your page.

```
  your page                            the client library
  ───────────────────────────────────  ──────────────────────────────────────
  1  declare a policy ──────────────►  resolveResponders(policy)
     platform? web wallets?              · detectDcApiSupport(): can this
     mock? default?                        browser reach a platform wallet?
                                         · loadWalletRegistry(): a URL, an
                                           inline list, or the built-in one
                                         · marks available, reason, isDefault
  2  Responder[]  ◄───────────────────┘
     one object per option: id, kind,
     name, description, iconUrl,
     available, reason, isDefault, wallet

  3  render them however fits the page:
     a split button, a menu, cards;
     disable the unavailable, lead
     with isDefault                       (the library is not involved)

  4  the person picks one ─────────►  credentialGetterFor(responder)
                                         · web  → opens wallet.walletUrl in
                                                  a tab, relays the request
                                         · mock → answers instantly
                                         · platform → the default: the
                                           browser's own credentials.get
  5  getCredential  ◄─────────────────┘

  6  requestCheckin(request,
       { getCredential }) ────────────►  build the wire request, call the
                                         getter, decrypt, verify, cross-check
  7  response  ◄─────────────────────┘
```

Two things cross the boundary, both plain data: the list of responders going
out, and the one the patient chose coming back. The library never sees how
you rendered the list, and your rendering never sees the wire. The clinic
demo's split button is one way to render it; see `renderResponderMenu` in
[`demo/src/main.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/main.ts).

### The wallet registry

The list of web wallets your page recognizes is called the registry. The
`webWallets` policy option accepts it in four forms:

```ts
webWallets: true                      // the built-in list of one (the demo wallet)
webWallets: "/config/wallets.json"    // a URL — fetched and validated
webWallets: { wallets: [ … ] }        // a registry object: exactly the JSON file's shape
webWallets: [ … ]                     // just the array of entries
```

A registry object and a registry file have the same shape, so you can start
with an inline list during development and move the same JSON to a
configuration endpoint later:

```json
{
  "source": "example deployment list",
  "wallets": [
    {
      "id": "demo",
      "name": "Demo Health Wallet",
      "walletUrl": "https://smart-health-checkin.org/client/demo/wallet.html",
      "description": "This project's reference wallet, with fabricated records.",
      "homepage": "https://smart-health-checkin.org/client/demo/",
      "iconUrl": "https://…/icon.png",
      "target": "tab"
    }
  ]
}
```

Every form is validated the same way. A malformed list throws an error rather
than being silently ignored, because which website you send patients to
should never be decided by accident. `webWallets: true` uses the built-in
list, which contains only this project's demo wallet.

Treat the registry as a trust decision. Each entry is a website you are
willing to hand a check-in request to. The response comes back encrypted to
your page, so a web wallet cannot read the answer, but it can see what you
asked for.

## Using a credential getter directly

The policy is the convenient path. If your page only ever uses one
responder, you can call its credential getter directly. Passing no
`getCredential` at all uses the platform wallet:

```ts
// 1. The platform wallet (the default) — nothing to pass. On a phone it
//    opens the installed wallet; on a desktop the browser offers a QR code
//    to scan, and the phone answers.
await requestCheckin(myRequest);

// 2. A wallet web app in a tab: a real consent screen, any browser.
import { createWebWalletCredentialGetter } from "@smart-health-checkin/client";
await requestCheckin(myRequest, {
  getCredential: createWebWalletCredentialGetter({ walletUrl: "/wallet.html" }),
});

// 3. Non-interactive mock: instant, fabricated data, for scripted tests.
import { createMockWalletCredentialGetter } from "@smart-health-checkin/client";
await requestCheckin(myRequest, {
  getCredential: createMockWalletCredentialGetter({ origin: location.origin }),
});
```

All three produce the same kind of response — encoded, signed, and encrypted
the same way — and the library checks all three the same way. Only the
credential getter differs. That is why a flow you have tested with the web
wallet or the mock is the same flow that runs against a real health app.

If you are building a web wallet, the demo wallet is a complete, small
example:
[`demo/wallet.html`](https://github.com/smart-health-checkin/client/blob/main/demo/wallet.html)
and [`demo/src/wallet.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/wallet.ts).
It decodes the request, shows which page is asking and a consent screen with
one checkbox per item, then signs and encrypts a response for that page.

## Specify what the mock returns

Made-up data is enough for a smoke test and useless for a real one. A test
usually needs to know exactly what comes back. The mock takes a specification
per request item, so you can state the data, or the failure, for each:

```ts
import { createMockWalletCredentialGetter } from "@smart-health-checkin/client";

const getCredential = createMockWalletCredentialGetter({
  origin: location.origin,
  items: {
    // exactly this data, so assertions are stable
    allergies: { fhir: allergyBundleMissingItsReaction },
    // a signed card, if that's the branch you're exercising
    coverage: { healthCard: ["eyJ…"] },
    // and the paths people forget to handle
    intake: { status: "declined", message: "not right now" },
  },
  // anything not named above; "fabricate" (the default) invents demo data
  fallback: { status: "unavailable" },
});
```

The mock still runs the whole pipeline — the response is encoded, signed,
encrypted, and then decrypted and verified on the way back — so a test
exercises your integration, not a stub. If you want only the response object
and none of the wire work, `buildMockResponse(request, { items, fallback })`
returns it directly.

Two shapes that real health apps produce have their own spelling. A list of
specifications for one item returns several artifacts for that item — a
signed card and the same facts as plain FHIR, for instance. `alsoFulfills`
on one specification lets one artifact answer several items — a clinical
summary that already contains the allergy list. When you leave the mock to
invent data, it produces both shapes where the request invites them.

For complete control, pass `respond: (request) => SmartCheckinResponse` and
build the whole response yourself.

## Check browser support first

Not every browser has the Digital Credentials API. You can ask before
offering a check-in:

```ts
import { detectDcApiSupport } from "@smart-health-checkin/client";

const support = detectDcApiSupport();
if (support.state === "unsupported") {
  // support.reason explains why; show your ordinary form instead
}
```

`runCheckin` (the form of `requestCheckin` that returns a status instead of
throwing) does this check for you and returns `status: "unsupported"` without
prompting the patient, so nobody sees a button that cannot work.

A desktop browser is not a dead end. Where the browser supports the API —
recent Chrome, and Safari 26 — it runs a cross-device flow: the browser shows
a QR code, the patient scans it with their phone, the app on the phone shows
the consent screen and answers, and the response arrives in the page on the
desktop. The patient ends up where they started. So "the patient is on a
laptop" is a reason to offer the platform wallet, not to hide it.

Where the API is absent, you get `unsupported` with a reason you can show.
That is what the fallback to your own form is for. It is also why the web
wallet exists: it needs nothing from the browser beyond `window.open` and
`postMessage`.

## How the web wallet hand-off works

`createWebWalletCredentialGetter({ walletUrl, target, timeoutMs })` opens the
wallet page in a tab (or, with `target: "popup"`, a window), waits for the
wallet to say it is ready, sends it the request, and resolves with the sealed
response the wallet sends back. If the patient declines or closes the tab,
the getter rejects, and `runCheckin` reports that as `status: "declined"`.

One detail to know: a page cannot see the web origin of the page that opened
it, so the request message carries your page's origin explicitly. Both sides
then bind the response to that origin. If they disagree, the response will
not decrypt. That is deliberate: a response meant for one page cannot be
opened by another.

Browsers only allow a page to open a tab in response to a real click, so call
`requestCheckin` from a click handler. Automated tests need either a
synthesized input event (a scripted `.click()` is not enough) or the mock,
which opens nothing.

## Key custody

Part of the flow holds the private key the response is encrypted to, and uses
it to open the response. The library calls that part the *authority*, and the
`authority` option decides where it lives:

```ts
await requestCheckin(myRequest, { authority: "browser-local" });        // default
await requestCheckin(myRequest, { authority: { server: "/checkin-api" } });
```

`browser-local` keeps the key in the page's memory. The key is created for one
request and discarded afterwards. This is the intended arrangement, for two
reasons: the page has to read the response to prefill anything, and a library
that only runs in the browser means nobody has to port the cryptography to
their server's language. The `{ server }` option is for deployments that
specifically do not want the page to hold the response. It is described in
[Server-held keys](server-authority.md), and the reasoning behind the
default is in the [Production checklist](production.md).

Next: [Kiosk and front-desk check-in](kiosk.md) · [Writing FHIR](fhir.md)
