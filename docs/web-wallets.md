# Web wallets

This page describes how a check-in page, the Verifier, and a web wallet exchange a SMART Health Check-in request and response when the wallet is a website instead of an app on the phone.

Only the transport differs from a native wallet. The Verifier opens the wallet in a tab, and the two pages talk with `postMessage`. The SMART request and response, the mdoc wrapping, and the encryption are exactly what the Digital Credentials API carries ([spec §8](https://smart-health-checkin.org/spec/#8-same-device-presentation-flow)).

## The library does this for you

You need the rest of this page only to implement the exchange yourself, or to debug it.

| Side | Use |
| --- | --- |
| Verifier | [`wallets({ registry: "/wallets.json" })`](api/checkin.md#wallets), or [`webWallet(entry)`](api/checkin.md#webwallet) for one wallet, then [`wallet.start(request)`](api/checkin.md#start) inside the click |
| Verifier, no code | [`<smart-checkin-picker registry="/wallets.json">`](api/ui.md#smartcheckinpicker) from `/ui` |
| Web wallet | [`serveWebWallet({ onRequest })`](api/wallet.md#servewebwallet) from `/wallet`; see the [Wallet guide](build-a-wallet.md#web-wallets) |

Verifiers find web wallets in a [wallet registry](registry.md).

## Sequence

1. The Verifier opens the wallet in a new tab.
2. The wallet posts **ready**.
3. The Verifier posts the **request**.
4. The patient reviews and chooses in the wallet.
5. The wallet posts the **response** and may close itself.
6. The Verifier decrypts and checks the response, as it would a native wallet's.

## Opening the wallet

Browsers let a page open a tab only while it handles the patient's click, so the Verifier calls `window.open(walletUrl)` in the click handler, before any `await`. `walletUrl` comes from the wallet's [registry entry](registry.md), and the wallet opens in a new tab unless the entry has [`"target": "popup"`](api/checkin.md#target).

Building the request can take long enough for the browser to stop treating the page as handling a click, so open the tab first and build the request after. The wallet may then post `ready` before the request exists; send the request once both have happened.

Keep the window reference that `window.open` returns. The Verifier accepts a message only when its `event.source` is that window, its `event.origin` is the wallet's origin, and, for a response, its `requestId` matches the request.

## The three messages

### Ready: wallet to Verifier

The wallet sends this as soon as it loads.

```js
window.opener.postMessage({ type: "digital-credentials/web-wallet/ready" }, "*");
```

It carries no data, so `"*"` is safe here.

### Request: Verifier to wallet

The Verifier sends this after `ready`, to the wallet's origin only, never to `"*"`.

```js
walletWindow.postMessage({
  type: "digital-credentials/web-wallet/request",
  requestId: "<opaque, unique per request>",
  credentialRequestOptions: {
    digital: { requests: [
      { protocol: "org-iso-mdoc", data: { deviceRequest, encryptionInfo } }
    ] }
  }
}, walletOrigin);
```

`credentialRequestOptions` is the same argument the Verifier would pass to `navigator.credentials.get` ([VRQ-8](https://smart-health-checkin.org/spec/#VRQ-8)).

### Response: wallet to Verifier

The wallet sends this once, to the Verifier's origin only, with the request's `requestId`. It has one of three outcomes:

```js
// The patient shared
{ type: "digital-credentials/web-wallet/response", requestId, outcome: "approved",
  credential: { protocol: "org-iso-mdoc", data: { response } } }

// The patient cancelled
{ type: "digital-credentials/web-wallet/response", requestId, outcome: "declined" }

// Something failed
{ type: "digital-credentials/web-wallet/response", requestId, outcome: "error", message: "<what went wrong>" }
```

`response` is the base64url `dcapiResponse`, exactly what a native wallet returns ([HPKE-2](https://smart-health-checkin.org/spec/#HPKE-2)). A wallet should send `declined` or `error` rather than closing without a reply, so the Verifier can tell the patient what happened at once.

## The Verifier's origin

The wallet learns who is asking from the browser, never from the message.

- Accept a request only when `event.source === window.opener`.
- Use `event.origin` as the Verifier's origin. The message has no origin field, and a wallet must never trust one written inside a message.
- Reject the opaque origin `"null"`, because there is no way to reply to it.
- Show that origin to the patient during consent, prominently, as a website: "A website is asking for your health information", then the origin. Don't call it a practice or clinic, because the origin is all the wallet knows.
- Bind the `SessionTranscript` to it ([§8.3](https://smart-health-checkin.org/spec/#8-3-sessiontranscript)).
- Reply only to that origin.

## Processing in the wallet

A web wallet processes the request the same way a native wallet does ([§8.4](https://smart-health-checkin.org/spec/#8-4-wallet-request-handling-and-response-construction)):

- Pick the entry in `digital.requests` whose `protocol` is `org-iso-mdoc`.
- Validate the request.
- Ask the patient item by item.
- Build the SMART response and HPKE-encrypt the `DeviceResponse` ([§8.5](https://smart-health-checkin.org/spec/#8-5-hpke-encryption-and-verifier-processing)).

## Timeouts and closing

The Verifier treats the wallet's window closing before a response as a decline. It also gives up after a timeout, which in this library is five minutes. A wallet can't extend the timeout, even for a long form.
