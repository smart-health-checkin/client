# Wallet picker

A wallet is anything that can answer a check-in request: the phone's own wallet, a wallet on the web, a kiosk hand-off, or a mock. Your page decides which to offer; the patient picks one.

- **Most pages:** drop in [the picker](#the-picker). It lists the wallets, runs the check-in, and hands you the result.
- **Your own buttons:** start the wallets yourself; see [Without the picker](#without-the-picker).

## The picker

[`<smart-checkin-picker>`](api/ui.md#smartcheckinpicker) shows the patient the wallets they can use, runs the check-in with the one they pick, and tells your page what came back.

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/0.4.4/ui.js"></script>

<smart-checkin-picker registry="/wallets.json"></smart-checkin-picker>

<script type="module">
  const picker = document.querySelector("smart-checkin-picker");
  picker.request = myRequest;
  picker.addEventListener("smart-checkin-response", (e) => prefillMyForm(e.detail.response));
</script>
```

In a bundled app, `import "@smart-health-checkin/client/ui"` registers the element instead of the script tag. [Install](install.md) covers both ways of loading the library.

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

[`<CheckinPicker>`](api/react.md#checkinpicker) renders the same element, and its props are [`CheckinPickerProps`](api/react.md#checkinpickerprops). React is needed only for this module.

### In Angular, Vue, and others

Import [`@smart-health-checkin/client/ui`](api/ui.md) once, allow the element, and set [`request`](api/ui.md#request) as a property, not an attribute.

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

Importing `@smart-health-checkin/client/ui` also tells TypeScript about the tag. `document.querySelector("smart-checkin-picker")` returns a [`SmartCheckinPicker`](api/ui.md#smartcheckinpicker), and its `addEventListener` types each event's `detail` from [`SmartCheckinPickerEventMap`](api/ui.md#smartcheckinpickereventmap):

```ts
import "@smart-health-checkin/client/ui";

const picker = document.querySelector("smart-checkin-picker")!;
picker.request = myRequest;
picker.addEventListener("smart-checkin-response", (e) => {
  if (e.detail.response) prefillMyForm(e.detail.response);
});
```

`response` is optional in the type because a server that [keeps the data](production.md#keeping-the-key-on-a-server) sends none. Importing `@smart-health-checkin/client/react` types the element's attributes in JSX as well, though [`<CheckinPicker>`](api/react.md#checkinpicker) is simpler there.

### Attributes

| Attribute | What it does |
| --- | --- |
| [`registry`](api/ui.md#attributes) | URL of a [wallet registry](#registries-and-icons). Omit it for no web wallets. |
| [`platform="off"`](api/ui.md#attributes) | Don't offer the phone's own wallet. |
| [`remember`](api/ui.md#attributes) | Remember the last app used on this site, in this browser. Off unless present. |
| [`mock`](api/ui.md#attributes) | Offer a simulated response. Development only. |
| [`mode="pick"`](api/ui.md#attributes) | Only choose; your page runs the check-in. See [Pick only](#pick-only). |
| [`theme`](api/ui.md#attributes) | `light` (default), `dark`, or `auto` to follow the device. |
| [`appearance="flat"`](api/ui.md#attributes) | No card border or background. |
| [`footer="off"`](api/ui.md#attributes) | Hide the SMART Health Check-in mark. |
| [`motion`](api/ui.md#attributes) | `subtle` (default) or `none`. See [Motion](#motion). |
| [`heading`](api/ui.md#attributes), [`description`](api/ui.md#attributes) | Replace the two lines at the top. |

### Properties

| Property | What it does |
| --- | --- |
| [`request`](api/ui.md#request) | What to ask for. Required unless `mode="pick"`. |
| [`motion`](api/ui.md#motion) | `"subtle"` or `"none"`; reflects the `motion` attribute. |
| [`wallets`](api/ui.md#wallets) | A list from [`wallets()`](api/checkin.md#wallets), used instead of `registry`, `platform`, and `mock`. Use it to add a kiosk hand-off or your own wallets. |
| [`checkinOptions`](api/ui.md#checkinoptions) | Passed to [`runCheckin`](api/checkin.md#runcheckin): [`keys`](api/checkin.md#keys) for server-held keys, [`healthCards`](api/checkin.md#healthcards-1) for card trust. |
| [`strings`](api/ui.md#strings) | Replace any text, for wording or translation. See [`DEFAULT_STRINGS`](api/ui.md#defaultstrings). |

### Events

All events bubble and cross shadow roots. [`SmartCheckinPickerEventMap`](api/ui.md#smartcheckinpickereventmap) types each one's `detail`.

| Event | `detail` | When |
| --- | --- | --- |
| [`smart-checkin-response`](api/ui.md#smart-checkin-response) | `{ wallet, response?, result }` | The check-in finished. `response` is a [`CheckinResponse`](responses.md), absent only when a key server kept the data. |
| [`smart-checkin-declined`](api/ui.md#smart-checkin-declined) | `{ wallet, result }` | The patient closed the app or said no. |
| [`smart-checkin-error`](api/ui.md#smart-checkin-error) | `{ wallet?, code?, message, result? }` | Anything else went wrong, including a registry that wouldn't load. [Codes](testing.md#reading-a-failed-result). |
| [`smart-checkin-choose`](api/ui.md#smart-checkin-choose) | `{ wallet, session? }` | The patient picked a wallet. In pick mode, `session` is the opened wallet. |

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
| [`--smart-checkin-font`](api/ui.md#css-custom-properties) | Inter, then the system font |
| [`--smart-checkin-accent`](api/ui.md#css-custom-properties), [`--smart-checkin-accent-hover`](api/ui.md#css-custom-properties), [`--smart-checkin-on-accent`](api/ui.md#css-custom-properties) | `#0E6FB8`, `#094D80`, white |
| [`--smart-checkin-text`](api/ui.md#css-custom-properties), [`--smart-checkin-text-muted`](api/ui.md#css-custom-properties), [`--smart-checkin-text-faint`](api/ui.md#css-custom-properties) | `#1F2933`, `#4B5563`, `#7B8794` |
| [`--smart-checkin-surface`](api/ui.md#css-custom-properties), [`--smart-checkin-row`](api/ui.md#css-custom-properties), [`--smart-checkin-border`](api/ui.md#css-custom-properties) | white, white, `#E4E7EB` |
| [`--smart-checkin-icon-background`](api/ui.md#css-custom-properties) | white, behind wallet icons |
| [`--smart-checkin-focus`](api/ui.md#css-custom-properties) | the accent color, for focus rings |
| [`--smart-checkin-radius`](api/ui.md#css-custom-properties), [`--smart-checkin-radius-large`](api/ui.md#css-custom-properties), [`--smart-checkin-icon-radius`](api/ui.md#css-custom-properties) | `10px`, `14px`, `9px` |
| [`--smart-checkin-success`](api/ui.md#css-custom-properties) | `#1A8C76`, the check when shared |
| [`--smart-checkin-mark-purple`](api/ui.md#css-custom-properties) | `#722772` (dark `#A04CA0`), the starburst's purple petal, lifted in dark themes as in the site's logo |
| [`--smart-checkin-mark-muted`](api/ui.md#css-custom-properties) | `#B9C2CC` (dark `#4A5866`), the mark's petals when declined or failed |
| [`--smart-checkin-motion-speed`](api/ui.md#css-custom-properties) | `1`; multiplies every duration. See [Motion](#motion). |
| [`--smart-checkin-card-border`](api/ui.md#css-custom-properties), [`--smart-checkin-card-padding`](api/ui.md#css-custom-properties) | `1px solid` the border color, `16px` |

For anything else, style these parts with `::part()`: [`container`](api/ui.md#parts), [`card`](api/ui.md#parts), [`title`](api/ui.md#parts), [`description`](api/ui.md#parts), [`primary`](api/ui.md#parts), [`list`](api/ui.md#parts), [`row`](api/ui.md#parts), [`more`](api/ui.md#parts), [`icon`](api/ui.md#parts), [`status`](api/ui.md#parts), [`mark`](api/ui.md#parts) (the starburst beside a status), [`check`](api/ui.md#parts) (on the mark when shared), [`footer`](api/ui.md#parts), [`dialog`](api/ui.md#parts).

### Motion

With [`motion="subtle"`](api/ui.md#attributes), the default, the picker moves a little:

| State | What moves |
| --- | --- |
| Choosing | The choices fade up in turn (180 ms each, 40 ms apart). A press shrinks one slightly. |
| Waiting for the wallet | A soft dim wedge turns round the starburst, once every 2.6 s, until the wallet answers. The petals stay bright. |
| Shared | The check and the message fade in (240 ms). |
| Declined or failed | The petals fade to gray (320 ms) and the message fades in. |

- `motion="none"` stops all of it: the mark is still, and state changes happen at once.
- A device set to reduce motion (`prefers-reduced-motion: reduce`) always gets `none`, whatever the attribute says.
- [`--smart-checkin-motion-speed`](api/ui.md#css-custom-properties) scales every duration: `2` is half as fast, `0.5` twice as fast.

The wedge is drawn in [`--smart-checkin-surface`](api/ui.md#css-custom-properties), so it matches the card in light and dark themes. Set that property if your card has another background.

```css
smart-checkin-picker { --smart-checkin-motion-speed: 1.5; }
smart-checkin-picker::part(mark) { width: 36px; height: 30px; }
```

### Pick only

Use [`mode="pick"`](api/ui.md#attributes) when your page runs the check-in itself, for example to inspect the raw response.

- Listen for [`smart-checkin-choose`](api/ui.md#smart-checkin-choose). Its `session` is the chosen wallet, already opened inside the click.
- Run the check-in with it: [`runCheckin`](api/checkin.md#runcheckin)`(myRequest, { wallet, session })`.
- Tell the picker how it ended with [`setOutcome`](api/ui.md#setoutcome): `picker.setOutcome({ status: "completed" })`, `{ status: "declined" }`, or `{ status: "failed", message, code }`.

## Without the picker

You can leave the picker out and start a check-in from buttons you draw yourself. You might do that when your site has its own design system and the picker doesn't fit it even after [styling](#styling). It also makes sense when you offer only one wallet, because a list with a single choice only adds a step, and when the check-in should feel like part of your own page, such as one "Fill in from my health app" button beside the form it fills.

The library does the same work either way: it opens the wallet, decrypts and checks the answer, and gives you a [`CheckinResult`](api/checkin.md#checkinresult). What the picker did around that becomes your code:

- **Availability.** Offer only the wallets this browser can use. [`wallets()`](api/checkin.md#wallets) leaves out the rest, and a single wallet's [`available`](api/checkin.md#available) says whether it can run here. The phone's own wallet needs the Digital Credentials API, which not every browser has.
- **Starting inside the click.** Call [`wallet.start()`](api/checkin.md#start) as the first thing in your click handler, before any `await`, so a web wallet's tab can open. [Starting inside the click](#starting-inside-the-click) explains why, and how to stop waiting.
- **Waiting.** While the wallet is open, say so, and don't let a second click start another check-in.
- **Every ending.** `start()` doesn't throw when a check-in doesn't complete. It resolves with a [`status`](api/checkin.md#checkinresult) of `"completed"`, `"declined"` when the patient said no or closed the wallet, or `"failed"` with an [`error.code`](testing.md#reading-a-failed-result). Declined and failed check-ins go back to your own form ([Fallback](production.md#fallback)).

### One button for the phone's wallet

This button starts the patient's own wallet through [`platformWallet()`](api/checkin.md#platformwallet). It stays hidden in a browser without the Digital Credentials API, so those patients see only your form. On a desktop, the browser shows a QR code and the patient answers on their phone.

```ts
import { platformWallet, type CheckinResult } from "@smart-health-checkin/client";

const button = document.querySelector<HTMLButtonElement>("#fill-from-app")!;
const note = document.querySelector<HTMLElement>("#checkin-note")!;
const phone = platformWallet();
button.hidden = !phone.available;

button.onclick = async () => {
  const running = phone.start(myRequest); // first, inside the click
  button.disabled = true;
  note.textContent = "Waiting for your health app…";
  showOutcome(await running);
  button.disabled = false;
};

function showOutcome(result: CheckinResult) {
  if (result.status === "completed") {
    prefillMyForm(result.response);
    note.textContent = "Filled in from your health app. Please check it.";
  } else if (result.status === "declined") {
    note.textContent = "Nothing was shared. Please fill in the form.";
  } else if (result.status === "failed") {
    note.textContent = "That didn't work. Please fill in the form.";
    console.warn("check-in failed:", result.error.code, result.error.message);
  }
}
```

<!-- example: one-button -->
<!-- /example -->

### A button for each wallet

To offer web wallets as well, list them with [`wallets()`](api/checkin.md#wallets) and draw a button for each. The list comes [in order](#kinds-of-wallet), with the phone's own wallet first when this browser can reach it. It's empty when nothing is available, and `wallets()` throws when the [registry](#registries-and-icons) can't be loaded, so both cases leave the patient with your form. `showOutcome` is the function from the first example.

```ts
import { wallets } from "@smart-health-checkin/client";

const list = document.querySelector<HTMLElement>("#checkin-wallets")!;
const offered = await wallets({ registry: "/wallets.json" }).catch(() => []);

for (const wallet of offered) {
  const button = document.createElement("button");
  button.textContent = wallet.name;
  button.onclick = async () => {
    const running = wallet.start(myRequest); // a web wallet's tab opens here
    for (const b of list.querySelectorAll("button")) b.disabled = true;
    showOutcome(await running);
    for (const b of list.querySelectorAll("button")) b.disabled = false;
  };
  list.append(button);
}
```

Each wallet also has a [`description`](api/checkin.md#description) and an [`iconUrl`](api/checkin.md#iconurl) if you want to show more than the name. [`@smart-health-checkin/client/picker`](api/picker.md) has the picker's own logic for a longer list:

| Function | What it does |
| --- | --- |
| [`arrangeWallets(list)`](api/picker.md#arrangewallets) | Returns `{ primary, inline, more }`: what leads, what's listed, and what's behind "more". |
| [`rememberChoice(id)`](api/picker.md#rememberchoice), [`recallChoice()`](api/picker.md#recallchoice) | Keep the last choice for this site, if you want that. |
| [`monogram(name)`](api/picker.md#monogram) | The letter and color for a wallet without an icon. |

### In React

The [`useCheckin`](api/react.md#usecheckin) hook lists the wallets and gives you [`start`](api/react.md#start) for your own buttons. Its [`status`](api/react.md#status) is `"waiting"` while a wallet is open.

```tsx
import { useCheckin } from "@smart-health-checkin/client/react";

function CheckinButtons() {
  const { wallets, start, status } = useCheckin(myRequest, { registry: "/wallets.json" });
  return wallets.map((wallet) => (
    <button key={wallet.id} disabled={status === "waiting"}
      onClick={() => start(wallet).then((result) => result && showOutcome(result))}>
      {wallet.name}
    </button>
  ));
}
```

## Kinds of wallet

| Kind | What it is | How you get one |
| --- | --- | --- |
| `platform` | A wallet on the patient's device, reached through the browser's Digital Credentials API. On a desktop, the browser shows a QR code and the phone answers. | [`platformWallet()`](api/checkin.md#platformwallet), or included by [`wallets()`](api/checkin.md#wallets) |
| `web` | A wallet that's a website. It opens in a tab; the patient chooses there. | [`webWallet(entry)`](api/checkin.md#webwallet), or from a [registry](#registries-and-icons) |
| `handoff` | A kiosk's "use your phone" option. | [`handoffWallet(...)`](api/handoff.md#handoffwallet); see [Kiosk hand-off](#kiosk-hand-off) |
| `mock` | Answers at once with made-up data. Development only. | [`mockWallet()`](api/testing.md#mockwallet) from `/testing` |
| `custom` | Any transport you write. | [`customWallet(...)`](api/checkin.md#customwallet); see [Custom transports](#custom-transports) |

[`wallets()`](api/checkin.md#wallets) returns what to offer, in order: the phone's app, the registry's web wallets, then [`extra`](api/checkin.md#extra).

```ts
import { wallets } from "@smart-health-checkin/client";

const options = await wallets({ registry: "/wallets.json" });
```

| Option | Default | What it does |
| --- | --- | --- |
| [`platform`](api/checkin.md#platform) | `true` | Offer the phone's own app. It's left out when the browser can't reach one. |
| [`registry`](api/checkin.md#registry) | none | A `wallets.json` URL, a registry object, or a list of entries. With none, no web wallets. |
| [`extra`](api/checkin.md#extra) | none | More wallets after the registry's, such as a hand-off or [`mockWallet()`](api/testing.md#mockwallet). |
| [`includeUnavailable`](api/checkin.md#includeunavailable) | `false` | Keep wallets this browser can't use, marked `available: false` with [`unavailableReason`](api/checkin.md#unavailablereason). For developer tools. |

Each [`Wallet`](api/checkin.md#wallet) has [`id`](api/checkin.md#id-3), [`kind`](api/checkin.md#kind-3), [`name`](api/checkin.md#name), [`description`](api/checkin.md#description), [`iconUrl`](api/checkin.md#iconurl), [`available`](api/checkin.md#available), and the two methods below, [`start`](api/checkin.md#start) and [`open`](api/checkin.md#open).

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

- Call [`wallet.start(request)`](api/checkin.md#start) directly in the click handler, before any `await`. [`runCheckin`](api/checkin.md#runcheckin)`(request, { wallet })` works the same way.
- `start` opens the tab first, then builds the request. The hand-off copes with the wallet being ready before the request is.
- To stop waiting, pass an `AbortSignal` as [`signal`](api/checkin.md#signal): `wallet.start(request, { signal })`. The tab closes and the check-in ends as `declined`.
- If the tab is blocked anyway, the result is `failed` with code `blocked`.

[`wallet.open()`](api/checkin.md#open) connects without running a check-in, for pick-mode UIs. It has the same rule: call it inside the click.

## Kiosk hand-off

A kiosk or front-desk screen has no wallet, but the patient's phone does. The screen shows a QR code; the phone opens a small page, asks its wallet, and sends the sealed answer back. Only the screen can read it.

<!-- example: kiosk-handoff -->
1. **Start**, on the kiosk: `phone.start(request)` makes the request and a key pair, keeps the private key, and posts the request with the public key to your mailbox under a random session id.
2. **Scan:** `onWaiting` gives the kiosk a URL carrying the session id, to show as a QR code. The patient scans it, and on the phone `fetchHandoff` picks up the request and shows what the kiosk asks for.
3. **Share**, on the phone: the patient picks a wallet in the picker, and `answerHandoff` asks it. The wallet seals its answer to the kiosk's public key.
4. **Return:** the sealed answer goes back through the mailbox, which can't read it. The kiosk opens it with its key and checks it, and `start()` resolves with a `CheckinResult`.
<!-- /example -->

### The kiosk

The phone is just another wallet. [`handoffWallet`](api/handoff.md#handoffwallet) takes the [`HandoffOptions`](api/handoff.md#handoffoptions):

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
- Offer it next to other wallets with [`wallets`](api/checkin.md#wallets)`({ extra: [phone] })`, or the picker's [`wallets`](api/ui.md#wallets) property.

### The phone page

The page reads the session id with [`sessionIdFromHash`](api/handoff.md#sessionidfromhash), and [`fetchHandoff`](api/handoff.md#fetchhandoff) picks up the request so you can show what the kiosk asks for.

```ts
import { answerHandoff, fetchHandoff, sessionIdFromHash } from "@smart-health-checkin/client/handoff";

const sessionId = sessionIdFromHash(location.hash)!;
const { envelope, request } = await fetchHandoff(myMailbox, sessionId);
showMyConsentScreen(request);

myShareButton.onclick = () => answerHandoff(myMailbox, sessionId, envelope);
```

[`answerHandoff`](api/handoff.md#answerhandoff) asks the phone's own wallet unless you pass another wallet. Call it inside the click.

With the picker in [pick mode](#pick-only), let the patient choose the wallet, then pass the session the picker opened:

```ts
picker.addEventListener("smart-checkin-choose", ({ detail: { wallet, session } }) =>
  answerHandoff(myMailbox, sessionId, envelope, wallet, { session }));
```

The [kiosk's phone page](../demo/handoff.html) works this way.

### The mailbox

You provide the mailbox, a [`HandoffMailbox`](api/handoff.md#handoffmailbox) somewhere both devices can reach: a realtime database, a WebSocket relay, or two endpoints on your API.

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
- **Sessions expire.** `fetchHandoff` refuses a session older than the kiosk's [`ttlMs`](api/handoff.md#ttlms), ten minutes unless you change it. The mailbox should delete sessions after the same time.
- **The mailbox needs no keys of its own.** It carries the request, the kiosk's public key, and the sealed answer, and it can't open the answer. Serve the hand-off page from an origin you control.

The demo's mailbox uses InstantDB: [`mailbox-instant.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/mailbox-instant.ts). Try it: [the kiosk demo](../demo/kiosk.html).

## Custom transports

[`customWallet`](api/checkin.md#customwallet) wraps anything that can turn the Digital Credentials API argument into a wallet's answer.

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

- `open` runs inside the click and returns a [`WalletSession`](api/checkin.md#walletsession); do anything that needs the click there.
- Throw [`WalletDeclinedError`](api/checkin.md#walletdeclinederror) when the patient says no, and [`CheckinError`](api/checkin.md#checkinerror) with a [`code`](api/checkin.md#checkinerrorcode) for failures.
- Web wallets use a documented hand-off between two pages. [Web wallets](web-wallets.md) describes it.
