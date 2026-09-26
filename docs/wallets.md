# Offering wallets

A wallet is anything that can answer a check-in request. Your page decides which ones to offer; the patient picks one; you call `start` on it inside the click.

```ts
import { wallets } from "@smart-health-checkin/client";

const options = await wallets({ registry: "/wallets.json" });
myButton.onclick = () => options[0].start(myRequest).then(handleResult);
```

The [picker](picker.md) does all of this for you. This guide is for pages that draw their own UI, or want to know what the picker does.

## Kinds of wallet

| Kind | What it is | How you get one |
| --- | --- | --- |
| `platform` | A health app on the patient's device, reached through the browser's Digital Credentials API. On a desktop, the browser shows a QR code and the phone answers. | `platformWallet()`, or included by `wallets()` |
| `web` | A health app that's a website. It opens in a tab; the patient chooses there. | `webWallet(entry)`, or from a [registry](registry.md) |
| `handoff` | A kiosk's "use your phone": the request goes to the patient's phone through a mailbox. | `handoffWallet(...)` from `/handoff` ([Kiosk](kiosk.md)) |
| `mock` | Answers at once with made-up data. Development only. | `mockWallet()` from `/testing` ([Test and debug](testing.md)) |
| `custom` | Any transport you write. | `customWallet(...)` |

The phone's own wallet needs no configuration: the operating system decides which app answers. Web wallets are websites, so you decide which ones your page will send requests to.

## List what to offer

`wallets(options)` returns the wallets to show, in order.

| Option | Default | What it does |
| --- | --- | --- |
| `platform` | `true` | Offer the phone's own wallet. |
| `registry` | none | Web wallets: a `wallets.json` URL, a registry object, or a list of entries. With none, there are no web wallets. |
| `extra` | none | More wallets after the registry's, such as a `handoffWallet` or `mockWallet()`. |
| `includeUnavailable` | `false` | Keep wallets this browser can't use, marked `available: false` with `unavailableReason`. For developer tools. |

The order is: the phone's wallet, the registry's wallets in registry order, then `extra`. A registry that can't be loaded or is malformed throws; which wallets to send patients to isn't something to guess.

## What a wallet has

| Field | What it's for |
| --- | --- |
| `id` | `"platform"`, the registry id, `"handoff"`, `"mock"`, or yours |
| `kind` | One of the kinds above |
| `name`, `description`, `iconUrl` | What to show the patient |
| `available`, `unavailableReason` | Whether this browser can use it |
| `start(request, options?)` | Run a check-in with it. Call inside the click. |
| `open()` | Connect without running a check-in, for pick-mode UIs. Call inside the click. |

## Start one inside the click

Browsers only let a page open a new tab during a click. A web wallet's tab has to open before anything slow happens, so:

- Call `wallet.start(request)` directly in the click handler, before any `await`.
- `start` opens the tab first, then builds the request. The web-wallet hand-off copes with the wallet being ready before the request is.
- To stop waiting, pass an `AbortSignal`: `wallet.start(request, { signal })`. It closes the tab, and the check-in ends as `declined`.

If the tab is blocked anyway, the result is `failed` with code `blocked`.

## Browser support

- `detectDcApiSupport()` says whether this browser has the Digital Credentials API, and why not.
- `wallets()` leaves out the phone's wallet when the API is missing. Patients never see an option that can't work.
- Chrome on Android and desktop Chrome support it. Some browsers don't yet; web wallets still work there.

## Your own wallet transport

`customWallet` wraps anything that can turn the Digital Credentials API argument into a wallet's credential:

```ts
import { customWallet } from "@smart-health-checkin/client";

const myWallet = customWallet({
  id: "my-app",
  name: "My Health App",
  open: () => ({
    getCredential: (navigatorArgument) => myTransport.ask(navigatorArgument),
    cancel: () => myTransport.close(),
  }),
});
```

- `open` runs inside the click; do anything that needs the click there.
- Throw `WalletDeclinedError` when the patient says no, and `CheckinError` with a code for failures.

## How web wallets are reached

A web wallet opens in a tab, and the two pages exchange three messages. The library does both sides: `webWallet` for your page, `serveWebWallet` for a wallet. [Web wallet hand-off](web-wallet-handoff.md) describes the protocol, and [Build a wallet](build-a-wallet.md) covers the wallet side.

## Key custody

Whichever wallet answers, the response is encrypted to a key made for that one request. By default the key stays in the page. [Server-held keys](server-authority.md) covers keeping it on your server instead, with the `keys` option.

Next: [Wallet registries](registry.md) · [Kiosk](kiosk.md)
