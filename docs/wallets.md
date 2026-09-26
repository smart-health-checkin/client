# Wallet picker

A wallet is anything that can answer a check-in request: the phone's own wallet, a wallet on the web, a kiosk hand-off, or a mock. Your page decides which to offer; the patient picks one.

- **Most pages:** drop in [the picker](#the-picker). It lists the wallets, runs the check-in, and hands you the result.
- **Your own UI:** call [`wallets()`](#kinds-of-wallet) and start the one the patient picks.

## The picker

`<smart-checkin-picker>` shows the patient the wallets they can use, runs the check-in with the one they pick, and tells your page what came back.

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/0.4.3/ui.js"></script>

<smart-checkin-picker registry="/wallets.json"></smart-checkin-picker>

<script type="module">
  const picker = document.querySelector("smart-checkin-picker");
  picker.request = myRequest;
  picker.addEventListener("smart-checkin-response", (e) => prefillMyForm(e.detail.response));
</script>
```

In a bundled app, `import "@smart-health-checkin/client/ui"` registers the element instead of the script tag.

What it does:

- The phone's own wallet leads when the browser can reach it. When it can't, that option is hidden.
- Web wallets from your registry follow, in registry order. With more than five, the first four show and the rest open in a searchable list.
- It opens a web wallet's tab inside the patient's click, so browsers don't block it.

<!-- example: picker-states -->
<!-- /example -->

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

### In Angular, Vue, and others

Import `@smart-health-checkin/client/ui` once, allow the element, and set `request` as a property, not an attribute.

Angular (standalone component):

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import type { CheckinResponse } from "@smart-health-checkin/client";
import "@smart-health-checkin/client/ui";

@Component({
  selector: "app-checkin",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<smart-checkin-picker registry="/wallets.json" [request]="request"
               (smart-checkin-response)="onResponse($event)"></smart-checkin-picker>`,
})
export class CheckinComponent {
  request = myRequest;
  onResponse(e: Event) {
    const { response } = (e as CustomEvent<{ response: CheckinResponse }>).detail;
    prefillMyForm(response);
  }
}
```

Vue: tell the compiler the tag is a custom element (`isCustomElement: (tag) => tag === "smart-checkin-picker"` in the Vue plugin's `template.compilerOptions`), then:

```html
<smart-checkin-picker registry="/wallets.json" :request.prop="request"
  @smart-checkin-response="(e) => prefillMyForm(e.detail.response)" />
```

### TypeScript and the element

TypeScript doesn't yet know the tag. Type lookups yourself, and cast events:

```ts
import type { CheckinResponse } from "@smart-health-checkin/client";
import type { SmartCheckinPicker } from "@smart-health-checkin/client/ui";

const picker = document.querySelector<SmartCheckinPicker & HTMLElement>("smart-checkin-picker")!;
picker.request = myRequest;
picker.addEventListener("smart-checkin-response", (e) => {
  const { response } = (e as CustomEvent<{ response: CheckinResponse }>).detail;
});
```

In React, `<CheckinPicker>` is fully typed; writing `<smart-checkin-picker>` in JSX isn't.

### Attributes

| Attribute | What it does |
| --- | --- |
| `registry` | URL of a [wallet registry](#registries-and-icons). Omit it for no web wallets. |
| `platform="off"` | Don't offer the phone's own wallet. |
| `remember` | Remember the last app used on this site, in this browser. Off unless present. |
| `mock` | Offer a simulated response. Development only. |
| `mode="pick"` | Only choose; your page runs the check-in. See [Pick only](#pick-only). |
| `theme` | `light` (default), `dark`, or `auto` to follow the device. |
| `appearance="flat"` | No card border or background. |
| `footer="off"` | Hide the SMART Health Check-in mark. |
| `motion` | `subtle` (default) or `none`. See [Motion](#motion). |
| `heading`, `description` | Replace the two lines at the top. |

### Properties

| Property | What it does |
| --- | --- |
| `request` | What to ask for. Required unless `mode="pick"`. |
| `motion` | `"subtle"` or `"none"`; reflects the `motion` attribute. |
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

Set custom properties on the element or any ancestor. They are enough to match a clinic's own site: each set below restyles the whole picker. Its `[theme="dark"]` rule gives the colors for when your page sets `theme="dark"`; with `theme="auto"`, put them in a `prefers-color-scheme: dark` media query instead.

<!-- example: picker-skins -->

```css
/* Portal blue */
smart-checkin-picker {
  --smart-checkin-font: "Source Sans 3", sans-serif;
  --smart-checkin-accent: #205E9B;
  --smart-checkin-accent-hover: #184A7B;
  --smart-checkin-border: #E3DDD7;
  --smart-checkin-radius: 24px;
  --smart-checkin-radius-large: 8px;
  --smart-checkin-icon-radius: 50%;
}
smart-checkin-picker[theme="dark"] {
  --smart-checkin-accent: #6FA8DC;
  --smart-checkin-accent-hover: #8FBDE6;
  --smart-checkin-border: #3A4150;
}
```

```css
/* Clinic teal */
smart-checkin-picker {
  --smart-checkin-font: "Nunito Sans", sans-serif;
  --smart-checkin-accent: #00735F;
  --smart-checkin-accent-hover: #005A4A;
  --smart-checkin-surface: #F2F7F6;
  --smart-checkin-border: #C9D6D4;
  --smart-checkin-text: #0F2A2A;
  --smart-checkin-text-muted: #4A6363;
  --smart-checkin-radius: 3px;
  --smart-checkin-radius-large: 4px;
  --smart-checkin-icon-radius: 3px;
}
smart-checkin-picker[theme="dark"] {
  --smart-checkin-accent: #3DD2B4;
  --smart-checkin-accent-hover: #6ADFC6;
  --smart-checkin-surface: #0F2322;
  --smart-checkin-row: #16302E;
  --smart-checkin-border: #2A4543;
  --smart-checkin-text: #E1F0ED;
  --smart-checkin-text-muted: #A5C2BE;
}
```

<!-- /example -->

| Property | Default |
| --- | --- |
| `--smart-checkin-font` | Inter, then the system font |
| `--smart-checkin-accent`, `--smart-checkin-accent-hover`, `--smart-checkin-on-accent` | `#0E6FB8`, `#094D80`, white |
| `--smart-checkin-text`, `--smart-checkin-text-muted`, `--smart-checkin-text-faint` | `#1F2933`, `#4B5563`, `#7B8794` |
| `--smart-checkin-surface`, `--smart-checkin-row`, `--smart-checkin-border` | white, white, `#E4E7EB` |
| `--smart-checkin-radius`, `--smart-checkin-radius-large`, `--smart-checkin-icon-radius` | `10px`, `14px`, `9px` |
| `--smart-checkin-success` | `#1A8C76`, the check when shared |
| `--smart-checkin-mark-purple` | `#722772` (dark `#A04CA0`), the starburst's purple petal, lifted in dark themes as in the site's logo |
| `--smart-checkin-mark-muted` | `#B9C2CC` (dark `#4A5866`), the mark's petals when declined or failed |
| `--smart-checkin-motion-speed` | `1`; multiplies every duration. See [Motion](#motion). |
| `--smart-checkin-card-border`, `--smart-checkin-card-padding` | `1px solid` the border color, `16px` |

For anything else, style these parts with `::part()`: `card`, `title`, `description`, `primary`, `list`, `row`, `more`, `icon`, `status`, `mark` (the starburst beside a status), `check` (on the mark when shared), `footer`, `dialog`.

### Motion

With `motion="subtle"`, the default, the picker moves a little:

| State | What moves |
| --- | --- |
| Choosing | The choices fade up in turn (180 ms each, 40 ms apart). A press shrinks one slightly. |
| Waiting for the wallet | A soft dim wedge turns round the starburst, once every 2.6 s, until the wallet answers. The petals stay bright. |
| Shared | The check and the message fade in (240 ms). |
| Declined or failed | The petals fade to gray (320 ms) and the message fades in. |

- `motion="none"` stops all of it: the mark is still, and state changes happen at once.
- A device set to reduce motion (`prefers-reduced-motion: reduce`) always gets `none`, whatever the attribute says.
- `--smart-checkin-motion-speed` scales every duration: `2` is half as fast, `0.5` twice as fast.

The wedge is drawn in `--smart-checkin-surface`, so it matches the card in light and dark themes. Set that property if your card has another background.

```css
smart-checkin-picker { --smart-checkin-motion-speed: 1.5; }
smart-checkin-picker::part(mark) { width: 36px; height: 30px; }
```

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
| `platform` | A wallet on the patient's device, reached through the browser's Digital Credentials API. On a desktop, the browser shows a QR code and the phone answers. | `platformWallet()`, or included by `wallets()` |
| `web` | A wallet that's a website. It opens in a tab; the patient chooses there. | `webWallet(entry)`, or from a [registry](#registries-and-icons) |
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

A kiosk or front-desk screen has no wallet. The patient's phone does. The screen shows a QR code; the phone opens a small page, asks its wallet, and sends the sealed answer back. Only the screen can read it.

```
  kiosk (this page)          mailbox           phone (hand-off page)        wallet
  1 request, key, QR code ─► envelope ───────► 2 fetchHandoff: show items
                                               3 answerHandoff ───────────► patient chooses;
  5 open, verify, check   ◄─ answer ◄───────── 4 sealed answer              sealed to the kiosk
```

### The kiosk

The phone is just another wallet:

```ts
import { handoffWallet } from "@smart-health-checkin/client/handoff";

const phone = handoffWallet({
  mailbox: myMailbox,                         // yours; see "The mailbox" below
  handoffUrl: "/checkin/handoff.html",        // the page the phone opens
  onWaiting: ({ url }) => drawMyQrCode(url),
});

const result = await phone.start(myRequest);
```

- The key stays on the kiosk, bound to the hand-off page's origin: the wallet answers the page that asked, and that page is on the phone.
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

`answerHandoff` asks the phone's own wallet unless you pass another wallet. Call it inside the click.

With the picker in [pick mode](#pick-only), let the patient choose the wallet, then pass the session the picker opened:

```ts
picker.addEventListener("smart-checkin-choose", ({ detail: { wallet, session } }) =>
  answerHandoff(myMailbox, sessionId, envelope, wallet, { session }));
```

The [kiosk's phone page](../demo/handoff.html) works this way.

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
- Web wallets use a documented hand-off between two pages. [Web wallets](web-wallets.md) describes it.

Next: [Responses](responses.md)
