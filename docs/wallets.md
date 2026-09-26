# Offering wallets

A wallet is anything that can answer a check-in request: the phone's own health app, a health app on the web, a kiosk hand-off, or a mock. Your page decides which to offer; the patient picks one.

- **Most pages:** drop in [the picker](#the-picker). It lists the wallets, runs the check-in, and hands you the result.
- **Your own UI:** call [`wallets()`](#kinds-of-wallet) and start the one the patient picks.

## The picker

`<smart-checkin-picker>` shows the patient the health apps they can use, runs the check-in with the one they pick, and tells your page what came back.

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/0.2.1/ui.js"></script>

<smart-checkin-picker registry="/wallets.json"></smart-checkin-picker>

<script type="module">
  const picker = document.querySelector("smart-checkin-picker");
  picker.request = myRequest;
  picker.addEventListener("smart-checkin-response", (e) => prefillMyForm(e.detail.response));
</script>
```

What it does:

- The phone's own health app leads when the browser can reach it. When it can't, that option is hidden.
- Web wallets from your registry follow, in registry order. With more than five, the first four show and the rest open in a searchable list.
- It opens a web wallet's tab inside the patient's click, so browsers don't block it.

[Try it](../demo/picker.html) in different situations and styles. In a bundled app, `import "@smart-health-checkin/client/ui"` registers it.

### In React

```tsx
import { CheckinPicker } from "@smart-health-checkin/client/react";

<CheckinPicker
  request={myRequest}
  registry="/wallets.json"
  onResponse={({ response }) => setResponse(response)}
  onDeclined={() => setNote("Nothing was shared.")}
/>
```

`<CheckinPicker>` renders the same element. React is needed only for this module.

### Attributes

| Attribute | What it does |
| --- | --- |
| `registry` | URL of a [wallet registry](#registries-and-icons). Omit it for no web wallets. |
| `platform="off"` | Don't offer the phone's own health app. |
| `remember` | Remember the last app used on this site, in this browser. Off unless present. |
| `mock` | Offer a simulated response. Development only. |
| `mode="pick"` | Only choose; your page runs the check-in. See [Pick only](#pick-only). |
| `theme` | `light` (default), `dark`, or `auto` to follow the device. |
| `appearance="flat"` | No card border or background. |
| `footer="off"` | Hide the SMART Health Check-in mark. |
| `heading`, `description` | Replace the two lines at the top. |

### Properties

| Property | What it does |
| --- | --- |
| `request` | What to ask for. Required unless `mode="pick"`. |
| `wallets` | A list from `wallets()`, used instead of `registry`, `platform`, and `mock`. Use it to add a kiosk hand-off or your own wallets. |
| `checkinOptions` | Passed to `runCheckin`: `keys` for server-held keys, `healthCards` for card trust. |
| `strings` | Replace any text, for wording or translation. See `DEFAULT_STRINGS`. |

### Events

All events bubble and cross shadow roots.

| Event | `detail` | When |
| --- | --- | --- |
| `smart-checkin-response` | `{ wallet, response, result }` | The check-in finished. `response` is a [`CheckinResponse`](responses.md). |
| `smart-checkin-declined` | `{ wallet, result }` | The patient closed the app or said no. |
| `smart-checkin-error` | `{ wallet?, code?, message, result? }` | Anything else went wrong, including a registry that wouldn't load. [Codes](testing.md#reading-a-failed-result). |
| `smart-checkin-choose` | `{ wallet, session? }` | The patient picked a wallet. In pick mode, `session` is the opened wallet. |

### Styling

Set custom properties on the element or any ancestor.

```css
smart-checkin-picker {
  --smart-checkin-accent: #205E9B;
  --smart-checkin-radius: 24px;
  --smart-checkin-font: "Source Sans 3", sans-serif;
}
```

| Property | Default |
| --- | --- |
| `--smart-checkin-font` | Inter, then the system font |
| `--smart-checkin-accent`, `--smart-checkin-accent-hover`, `--smart-checkin-on-accent` | `#0E6FB8`, `#094D80`, white |
| `--smart-checkin-text`, `--smart-checkin-text-muted`, `--smart-checkin-text-faint` | `#1F2933`, `#4B5563`, `#7B8794` |
| `--smart-checkin-surface`, `--smart-checkin-row`, `--smart-checkin-border` | white, white, `#E4E7EB` |
| `--smart-checkin-radius`, `--smart-checkin-radius-large`, `--smart-checkin-icon-radius` | `10px`, `14px`, `9px` |
| `--smart-checkin-success`, `--smart-checkin-warning` | `#1A8C76`, `#B85C17` |
| `--smart-checkin-card-border`, `--smart-checkin-card-padding` | `1px solid` the border color, `16px` |

For anything else, style these parts with `::part()`: `card`, `title`, `description`, `primary`, `list`, `row`, `more`, `icon`, `status`, `footer`, `dialog`.

### Pick only

Use `mode="pick"` when your page runs the check-in itself, for example to inspect the raw response.

- Listen for `smart-checkin-choose`. Its `session` is the chosen wallet, already opened inside the click.
- Run the check-in with it: `runCheckin(myRequest, { wallet, session })`.
- Tell the picker how it ended: `picker.setOutcome({ status: "completed" })`, `{ status: "declined" }`, or `{ status: "failed", message, code }`.

### Build your own picker

`@smart-health-checkin/client/picker` has the logic without the UI.

| Function | What it does |
| --- | --- |
| `arrangeWallets(list)` | Returns `{ primary, inline, more }`: what leads, what's listed, and what's behind "more". |
| `rememberChoice(id)`, `recallChoice()` | Keep the last choice for this site, if you want that. |
| `monogram(name)` | The letter and color for a wallet without an icon. |

In React, `useCheckin(myRequest, { registry })` from `/react` gives you the wallets and `start(wallet)` for your own buttons.

## Kinds of wallet

| Kind | What it is | How you get one |
| --- | --- | --- |
| `platform` | A health app on the patient's device, reached through the browser's Digital Credentials API. On a desktop, the browser shows a QR code and the phone answers. | `platformWallet()`, or included by `wallets()` |
| `web` | A health app that's a website. It opens in a tab; the patient chooses there. | `webWallet(entry)`, or from a [registry](#registries-and-icons) |
| `handoff` | A kiosk's "use your phone" option. | `handoffWallet(...)`; see [Kiosk hand-off](#kiosk-hand-off) |
| `mock` | Answers at once with made-up data. Development only. | `mockWallet()` from `/testing` |
| `custom` | Any transport you write. | `customWallet(...)`; see [Custom transports](#custom-transports) |

`wallets()` returns what to offer, in order: the phone's app, the registry's web wallets, then `extra`.

```ts
import { wallets } from "@smart-health-checkin/client";

const options = await wallets({ registry: "/wallets.json" });
```

| Option | Default | What it does |
| --- | --- | --- |
| `platform` | `true` | Offer the phone's own app. It's left out when the browser can't reach one. |
| `registry` | none | A `wallets.json` URL, a registry object, or a list of entries. With none, no web wallets. |
| `extra` | none | More wallets after the registry's, such as a hand-off or `mockWallet()`. |
| `includeUnavailable` | `false` | Keep wallets this browser can't use, marked `available: false` with `unavailableReason`. For developer tools. |

Each wallet has `id`, `kind`, `name`, `description`, `iconUrl`, `available`, and the two methods below.

## Registries and icons

A registry is a `wallets.json` file listing the web wallets your page offers. You decide which websites your patients' data can be sent to, so the list is yours.

```json
{
  "wallets": [
    {
      "id": "smart-testing-wallet",
      "name": "SMART Testing Wallet",
      "walletUrl": "https://smart-health-checkin.org/connectathon/testing-wallet/",
      "description": "Reference wallet with synthetic patients",
      "iconUrl": "data:image/svg+xml,…"
    }
  ]
}
```

- Every field is in [Registry format](registry.md).
- A registry that can't be loaded or is malformed throws. Which apps patients are sent to shouldn't be decided by accident.
- **Icons:** prefer `data:` URLs. An icon loaded from a wallet's server tells that server someone is on your check-in page. Wallets without an icon get a colored letter tile.
- **The connectathon registry** is at [smart-health-checkin.org/connectathon/wallets.json](https://smart-health-checkin.org/connectathon/wallets.json). It inlines every icon, and lists the SMART Testing Wallet first.

## Starting inside the click

Browsers only let a page open a new tab during a click. A web wallet's tab has to open before anything slow happens.

```ts
button.onclick = () => wallet.start(myRequest).then(handleResult);
```

- Call `wallet.start(request)` directly in the click handler, before any `await`. `runCheckin(request, { wallet })` works the same way.
- `start` opens the tab first, then builds the request. The hand-off copes with the wallet being ready before the request is.
- To stop waiting, pass an `AbortSignal`: `wallet.start(request, { signal })`. The tab closes and the check-in ends as `declined`.
- If the tab is blocked anyway, the result is `failed` with code `blocked`.

`wallet.open()` connects without running a check-in, for pick-mode UIs. It has the same rule: call it inside the click.

## Kiosk hand-off

A kiosk or front-desk screen has no health app. The patient's phone does. The screen shows a QR code; the phone opens a small page, asks its health app, and sends the sealed answer back. Only the screen can read it.

```
  kiosk (this page)          mailbox           phone (hand-off page)        health app
  1 request, key, QR code ─► envelope ───────► 2 fetchHandoff: show items
                                               3 answerHandoff ───────────► patient chooses;
  5 open, verify, check   ◄─ answer ◄───────── 4 sealed answer              sealed to the kiosk
```

### The kiosk

The phone is just another wallet:

```ts
import { handoffWallet } from "@smart-health-checkin/client/handoff";

const phone = handoffWallet({
  mailbox: myMailbox,                         // yours; see below
  handoffUrl: "/checkin/handoff.html",        // the page the phone opens
  onWaiting: ({ url }) => drawMyQrCode(url),
});

const result = await phone.start(myRequest);
```

- The key stays on the kiosk, bound to the hand-off page's origin: the health app answers the page that asked, and that page is on the phone.
- The result is the usual one, after the same checks as any check-in.
- Offer it next to other wallets with `wallets({ extra: [phone] })`, or the picker's `wallets` property.

### The phone page

```ts
import { answerHandoff, fetchHandoff, sessionIdFromHash } from "@smart-health-checkin/client/handoff";

const sessionId = sessionIdFromHash(location.hash)!;
const { envelope, request } = await fetchHandoff(myMailbox, sessionId);
showMyConsentScreen(request);

myShareButton.onclick = () => answerHandoff(myMailbox, sessionId, envelope);
```

`answerHandoff` asks the phone's own health app unless you pass another wallet. Call it inside the click.

### The mailbox

You provide the mailbox, somewhere both devices can reach: a realtime database, a WebSocket relay, or two endpoints on your API.

```ts
type HandoffMailbox = {
  post(sessionId, envelope): Promise<void>;                       // kiosk → phone
  fetch(sessionId): Promise<HandoffEnvelope>;                     // phone ← kiosk
  answer(sessionId, answer): Promise<void>;                       // phone → kiosk
  waitForAnswer(sessionId, { signal }?): Promise<HandoffAnswer>;  // kiosk ← phone
};
```

- **Session ids are secrets.** Whoever has one can read the request and post an answer. The library makes 192 random bits; don't shorten them.
- **An answer is written once.** The first one wins.
- **Sessions expire.** `fetchHandoff` refuses stale ones; the mailbox should delete them too. Ten minutes is plenty.
- **Nothing in it is secret**, so it needs no keys. Serve the hand-off page from an origin you control.

The demo's mailbox uses InstantDB: [`mailbox-instant.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/mailbox-instant.ts). Try it: [the kiosk demo](../demo/kiosk.html).

## Custom transports

`customWallet` wraps anything that can turn the Digital Credentials API argument into a wallet's answer.

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
- Web wallets use a documented hand-off between two pages. [Web wallet hand-off](web-wallet-handoff.md) describes it.

Next: [Using the answer](responses.md)
