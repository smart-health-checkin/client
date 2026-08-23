# Wallets and browser support

Something has to answer the request. By default that's the browser's Digital
Credentials API handing it to a wallet the patient has installed — but you can
substitute any credential getter, which is what makes this testable without a
phone.

Three words this guide uses precisely:

- a **responder** is whoever answers: the platform wallet, a web wallet, or the mock;
- a **policy** (`ResponderPolicy`) is what your page accepts, and which responder leads;
- a **credential getter** is the function `requestCheckin` calls to get the
  wallet's sealed answer — `getCredential` in its options. The default is
  `navigator.credentials.get`; every other responder is a different one, and
  `credentialGetterFor(responder)` returns it.

## Configure the list of responding wallets

Something has to answer the request. The library can hand it to three kinds
of responder:

- the **platform wallet** — whatever the operating system offers through the
  Digital Credentials API; on a desktop, a QR code the phone scans;
- a **web wallet** — a site that opens in a tab and answers there;
- the **mock** — instant fabricated data, for development and tests.

The platform wallet needs no configuration; the OS chooses it. A web wallet
is a site, so somebody has to decide which sites are acceptable, and that
decision belongs to you, not to this library. You state it as a policy and
get back a list your page can render:

```ts
import { resolveResponders, credentialGetterFor } from "@smart-health-checkin/client";

const responders = await resolveResponders({
  platform: true,                      // the wallet installed on the device
  webWallets: "/config/wallets.json",  // wallets this deployment recognizes
  mock: import.meta.env.DEV,           // development only
  default: "platform",                 // the primary action
});
```

Each entry is renderable as-is — `id`, `name`, `description`, `iconUrl`, and
`available` with a `reason` when this browser can't use it (an unavailable
platform wallet is *listed and disabled*, not hidden, so people can see why).
Exactly one entry has `isDefault: true`: the one you named, if it's available
here, otherwise the first available one — so a page that prefers the platform
wallet still leads with a working option on a browser that has none.

Render one control per entry. The one the person clicks is the responder you
pass back:

```ts
for (const responder of responders) {
  const button = document.createElement("button");
  button.textContent = responder.name;
  button.disabled = !responder.available;
  button.onclick = () => requestCheckin(myRequest, {
    getCredential: credentialGetterFor(responder),
  }).then(prefillMyForm);
  menu.append(button);
}
```

With one web wallet configured you get a two-item list; with several you get
a menu. The [clinic demo](https://smart-health-checkin.org/client/demo/) renders it
as a split button — primary action on the left, the rest behind a caret —
which is a good shape when there's a sensible default.

### Where the library stops and your UI starts

The library never draws a button. It turns your policy into data, and turns
the person's choice back into a credential getter; everything between those
two calls is your page.

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
                                         · platform → undefined: the
                                           browser's own credentials.get
  5  getCredential  ◄─────────────────┘

  6  requestCheckin(request,
       { getCredential }) ────────────►  build the mdoc request, call the
                                         getter, decrypt, verify, cross-check
  7  response  ◄─────────────────────┘
```

Two seams, both plain data: the `Responder` list going out (step 2) and one
chosen `Responder` coming back (step 4). Nothing about your rendering is
visible to the library, and nothing about the wire is visible to your
rendering. The clinic demo's split button is one implementation —
[`demo/src/main.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/main.ts):
`renderResponderMenu` draws from the list, and the click handler is the few
lines around `credentialGetterFor`.

### The wallet registry

`webWallets` takes any of four things:

```ts
webWallets: true                      // the built-in list of one (the demo wallet)
webWallets: "/config/wallets.json"    // a URL — fetched and validated
webWallets: { wallets: [ … ] }        // a registry object: exactly the JSON file's shape
webWallets: [ … ]                     // just the array of entries
```

The object form and the file form are the same structure, so you can inline
during development and move the identical JSON to a config endpoint later
without touching anything else:

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

Every form is validated the same way, and a malformed list throws rather
than silently falling back: which wallet you send people to is not a question
to answer by accident. `webWallets: true` uses the built-in list of one, this
project's demo wallet — where a deployment starts before it recognizes anyone
else's.

Treat the registry as a trust decision: every entry is a site you're willing
to hand a check-in request to, and the response comes back bound to *your*
origin, so a wallet you list can see what you asked for.

## Using a credential getter directly

The policy above is the convenient path. The three credential getters it
resolves to are exported too, for pages that only ever use one:

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

All three produce byte-identical wire traffic: real CBOR, real COSE
signatures, real HPKE encryption, verified the same way. Only the credential
getter differs — so a flow proven against the web wallet is proven against the
protocol.

The demo wallet's own source is worth reading if you're building a responder:
[`demo/wallet.html`](https://github.com/smart-health-checkin/client/blob/main/demo/wallet.html)
plus [`demo/src/wallet.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/wallet.ts).
It parses the DeviceRequest, shows the requesting origin and a per-item
consent screen, and signs and seals a DeviceResponse bound to that origin.

## Specify what the mock returns

Fabricated data is fine for a smoke test and useless for a real one. The mock
wallet takes a specification per request item, so a test can state precisely
what comes back — including the unhappy paths:

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

That drives the whole real pipeline — CBOR, COSE signing, HPKE sealing, and
verification on the way back in — so you're testing your integration, not a
stub. When you only want the response object and none of the wire work,
`buildMockResponse(request, spec)` returns it directly.

Two shapes a real wallet produces are spelled the same way: a list of specs
returns several artifacts for one item (a signed card *and* the same facts as
FHIR), and `alsoFulfills` lets one artifact answer several items (a clinical
summary that already contains the allergy list). Left to fabricate, the mock
does both where the request invites them.

For full control, `respond: (request) => SmartCheckinResponse` hands you the
request and takes whatever you build.

## Check browser support first

```ts
import { detectDcApiSupport } from "@smart-health-checkin/client";

const support = detectDcApiSupport();
if (support.state === "unsupported") {
  // support.reason explains why; show your ordinary form instead
}
```

`runCheckin` does this for you and returns `status: "unsupported"` without
ever prompting the patient — nobody sees a button that can't work.

**Desktop is not a dead end.** Where the browser supports the API — recent
Chrome, Safari 26 — a desktop check-in is still worth offering: the browser
runs a *cross-device* flow, showing a QR code the person scans with their
phone. The wallet on the phone shows the consent screen and answers, and the
response comes back to the page on the desktop, which is where the patient
was already working. So "on a laptop" is a reason to offer the platform
option, not to hide it.

Where the API is genuinely absent you'll get `unsupported` with a reason to
show. That's what the fallback is for, and why the web-wallet credential
getter exists:
it needs nothing but `window.open` and `postMessage`.

## How the web wallet hand-off works

`createWebWalletCredentialGetter({ walletUrl, target, timeoutMs })` opens the
wallet (a tab by default; `target: "popup"` for a window), waits for it to
announce readiness, posts the request, and resolves with the sealed response.
Closing the tab or declining rejects as a decline, which `runCheckin` reports
as `status: "declined"`.

One wrinkle worth knowing: the wallet can't observe your page's origin from
inside its own tab, so the request message carries `verifierOrigin`
explicitly. Both sides bind the session transcript to it, and a mismatch makes
the response fail to open — which is the intended behavior, not a bug to work
around.

Because the opener must be a genuine user gesture, call `requestCheckin` from
a click handler. Automated tests need synthesized input events (a scripted
`.click()` won't do) or the non-interactive mock.

## Key custody

The `authority` option decides where the verifier's private key lives:

```ts
await requestCheckin(myRequest, { authority: "browser-local" });        // default
await requestCheckin(myRequest, { authority: { server: "/checkin-api" } });
```

`browser-local` keeps the ephemeral, single-use HPKE key in page memory, and
that's the intended arrangement: the response must be readable by the page
for prefill to work, and a browser-only client means nobody has to port
CBOR/COSE/HPKE to their backend language. A `{ server }` authority is there
for deployments that deliberately don't want the page to hold the response —
implement the two-call contract (`prepareCredentialRequest` /
`completeCredentialRequest`) or pass your own `VerifierAuthority`. The seam
is specified in [Server-held keys](server-authority.md); the reasoning is in
the [Production checklist](production.md).

Next: [Kiosk and front-desk check-in](kiosk.md) · [Writing FHIR](fhir.md)
