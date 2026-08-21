# Wallets and browser support

Something has to answer the request. By default that's the browser's Digital
Credentials API handing it to a wallet the patient has installed — but you can
substitute any mediator, which is what makes this testable without a phone.

## The three mediators

```ts
// 1. Platform wallet (the default) — nothing to pass.
await requestCheckin(myRequest);

// 2. A wallet web app in a tab: a real consent screen, any browser.
import { createWebWalletCredentialGetter } from "@smart-health-checkin/checkin-client";
await requestCheckin(myRequest, {
  getCredential: createWebWalletCredentialGetter({ walletUrl: "/wallet.html" }),
});

// 3. Non-interactive mock: instant, fabricated data, for scripted tests.
import { createMockWalletCredentialGetter } from "@smart-health-checkin/checkin-client";
await requestCheckin(myRequest, {
  getCredential: createMockWalletCredentialGetter({ origin: location.origin }),
});
```

All three produce byte-identical wire traffic: real CBOR, real COSE
signatures, real HPKE encryption, verified the same way. Only the mediator
differs — so a flow proven against the web wallet is proven against the
protocol.

The demo wallet's own source is worth reading if you're building a responder:
[`demo/wallet.html`](https://github.com/smart-health-checkin/checkin-client/blob/main/demo/wallet.html)
plus [`demo/src/wallet.ts`](https://github.com/smart-health-checkin/checkin-client/blob/main/demo/src/wallet.ts).
It parses the DeviceRequest, shows the requesting origin and a per-item
consent screen, and signs and seals a DeviceResponse bound to that origin.

## Checking support before you offer it

```ts
import { detectDcApiSupport } from "@smart-health-checkin/checkin-client";

const support = detectDcApiSupport();
if (support.state === "unsupported") {
  // support.reason explains why; show your ordinary form instead
}
```

`runCheckin` does this for you and returns `status: "unsupported"` without
ever prompting the patient — nobody sees a button that can't work.

As of this writing the platform API is available in recent Chrome on Android
and Safari 26; elsewhere you'll get `unsupported`. That's precisely why the
fallback matters, and why the web-wallet mediator exists: it needs nothing but
`window.open` and `postMessage`.

## The web wallet in a bit more detail

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

`browser-local` keeps the ephemeral HPKE key in page memory — fine for demos
and low-stakes flows. A server-owned authority keeps it on your backend, which
also gives you a natural audit point; implement the two-call contract
(`prepareCredentialRequest` / `completeCredentialRequest`) or pass your own
`VerifierAuthority`. See [Production](production.md).

Next: [Writing FHIR](fhir.md) · [Production checklist](production.md)
