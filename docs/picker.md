# Wallet picker

`<smart-checkin-picker>` is a drop-in control for a check-in page. It shows the patient the ways they can answer, runs the check-in with the one they pick, and tells the page what came back.

- The phone's own wallet leads when the browser can reach one. When it can't, that option is hidden.
- Web wallets from your registry follow, in registry order. With more than five, the first four show and the rest open in a searchable list.
- It opens a web wallet's tab inside the patient's click, so browsers don't block it.

[Try it](../demo/picker.html) in different situations and skins.

## Add it to a page

### One script tag

The hosted file bundles everything it needs.

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/ui.js"></script>

<smart-checkin-picker registry="/wallets.json"></smart-checkin-picker>

<script type="module">
  const picker = document.querySelector("smart-checkin-picker");
  picker.request = myRequest;
  picker.addEventListener("smart-checkin-response", (e) => {
    fillTheForm(e.detail.response);
  });
</script>
```

To pin a version, use `/client/lib/<version>/ui.js`. The current version is in `/client/lib/version.json`.

### From the package

```ts
import "@smart-health-checkin/client/ui"; // registers <smart-checkin-picker>
```

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

`<CheckinPicker>` renders the same element. React is a peer dependency, needed only for this module.

## Attributes

| Attribute | What it does |
|---|---|
| `registry` | URL of a [wallet registry](registry.md) (`wallets.json`). Omit it for no web wallets. |
| `platform="off"` | Don't offer the phone's own wallet. |
| `remember` | Remember the last app used on this site, in this browser. Off unless present. |
| `mock` | Offer a simulated response. Development only. |
| `mode="pick"` | Only choose; your page runs the check-in. See [Pick only](#pick-only). |
| `theme` | `light` (default), `dark`, or `auto` to follow the device. |
| `appearance="flat"` | No card border or background. |
| `footer="off"` | Hide the SMART Health Check-in mark. |
| `heading`, `description` | Replace the two lines at the top. |

## Properties

| Property | What it does |
|---|---|
| `request` | What to ask for: `{ purpose, items }` or a complete request. Required unless `mode="pick"`. |
| `strings` | Replace any text, for wording or translation. See `DEFAULT_STRINGS`. |
| `wallets` | A list from `wallets()`, used instead of `registry`, `platform`, and `mock`. Use it to add a kiosk hand-off or your own wallets. |
| `checkinOptions` | Passed to `runCheckin`: `keys` for server-held keys, `healthCards` for card trust. |

## Events

All events bubble and cross shadow roots.

| Event | `detail` | When |
|---|---|---|
| `smart-checkin-choose` | `{ wallet, session? }` | The patient picked a wallet. In pick mode, `session` is the opened wallet. |
| `smart-checkin-response` | `{ wallet, response, result }` | The check-in finished; `response` is a [`CheckinResponse`](responses.md). |
| `smart-checkin-declined` | `{ wallet, result }` | The patient closed the wallet or declined. |
| `smart-checkin-error` | `{ wallet?, code?, message, result? }` | Anything else went wrong, including a registry that wouldn't load. `code` is a [`CheckinErrorCode`](getting-started.md#when-it-doesnt-complete). |

## Styling

Set custom properties on the element or any ancestor. Everything else follows from these.

```css
smart-checkin-picker {
  --smart-checkin-accent: #205E9B;
  --smart-checkin-radius: 24px;
  --smart-checkin-font: "Source Sans 3", sans-serif;
}
```

| Property | Default |
|---|---|
| `--smart-checkin-font` | Inter, then the system font |
| `--smart-checkin-accent`, `--smart-checkin-accent-hover`, `--smart-checkin-on-accent` | SMART blue `#0E6FB8`, `#094D80`, white |
| `--smart-checkin-text`, `--smart-checkin-text-muted`, `--smart-checkin-text-faint` | `#1F2933`, `#4B5563`, `#7B8794` |
| `--smart-checkin-surface`, `--smart-checkin-row`, `--smart-checkin-border` | white, white, `#E4E7EB` |
| `--smart-checkin-radius`, `--smart-checkin-radius-large`, `--smart-checkin-icon-radius` | `10px`, `14px`, `9px` |
| `--smart-checkin-success`, `--smart-checkin-warning` | `#1A8C76`, `#B85C17` |
| `--smart-checkin-card-border`, `--smart-checkin-card-padding` | `1px solid` the border color, `16px` |

For anything the variables don't cover, style these parts with `::part()`: `card`, `title`, `description`, `primary`, `list`, `row`, `more`, `icon`, `status`, `footer`, `dialog`.

## Wallet icons

A registry entry's `iconUrl` is shown next to its name. Without one, the wallet gets a colored letter tile.

Prefer `data:` URLs in your registry. An icon loaded from a wallet's own server tells that server someone is on your check-in page. The connectathon registry inlines every icon when it's built.

## Pick only

Use `mode="pick"` when your page runs the check-in itself, for example to inspect the raw response.

1. Listen for `smart-checkin-choose`. Its `session` is the chosen wallet, already opened inside the click.
2. Run the flow with it: `runCheckin(myRequest, { wallet, session })`, or pass `session.getCredential` to your own code.
3. Tell the picker how it ended: `picker.setOutcome({ status: "completed" })`, `{ status: "declined" }`, or `{ status: "failed", message, code? }`.

## Build your own

`@smart-health-checkin/client/picker` has the logic without the UI.

| Function | What it does |
| --- | --- |
| `arrangeWallets(list)` | Returns `{ primary, inline, more }`: what leads, what's listed, and what's behind "more". |
| `rememberChoice(id)`, `recallChoice()` | Keep the last choice for this site, if you want that. |
| `monogram(name)` | The letter and color for a wallet without an icon. |

Start the chosen wallet with `wallet.start(myRequest)` in the click handler, before any `await`.

In React, `useCheckin(myRequest, { registry })` from `@smart-health-checkin/client/react` gives you the wallets and `start(wallet)` for your own buttons.
