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

<smart-checkin-picker wallets="/wallets.json"></smart-checkin-picker>

<script type="module">
  const picker = document.querySelector("smart-checkin-picker");
  picker.request = { scenario: "allergy-review" };
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
  request={request}
  wallets="/wallets.json"
  onResponse={({ response }) => setResponse(response)}
  onDeclined={() => setNote("Nothing was shared.")}
/>
```

`<CheckinPicker>` renders the same element. React is a peer dependency, needed only for this module.

## Attributes

| Attribute | What it does |
|---|---|
| `wallets` | URL of a wallet registry (`wallets.json`), or `demo` for the built-in list. Omit it for no web wallets. |
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
| `request` | What to ask for: a request, `{ purpose, items }`, or `{ scenario }`. Required unless `mode="pick"`. |
| `strings` | Replace any text, for wording or translation. See `DEFAULT_STRINGS`. |
| `responders` | A list from `resolveResponders`, used instead of `wallets`, `platform`, and `mock`. |
| `checkinOptions` | Passed to `runCheckin`, for example a server-owned authority. |

## Events

All events bubble and cross shadow roots.

| Event | `detail` | When |
|---|---|---|
| `smart-checkin-choose` | `{ responder, getCredential, cancel }` | The patient picked an app. Fired inside the click. |
| `smart-checkin-response` | `{ responder, response, outcome }` | The check-in finished and the response validated. |
| `smart-checkin-declined` | `{ responder }` | The patient closed the wallet or declined. |
| `smart-checkin-error` | `{ responder?, message }` | Anything else went wrong, including a registry that wouldn't load. |

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

1. Listen for `smart-checkin-choose`. Its `getCredential` is ready to use: for a web wallet it talks to the tab the picker just opened; for the phone's wallet it's `undefined`, meaning the platform default.
2. Run the flow with it: `runCheckin(request, { getCredential })`, or your own code.
3. Tell the picker how it ended, so it can say so: `picker.setOutcome({ status: "completed" })`, `{ status: "declined" }`, or `{ status: "error", message }`.

## Build your own

`@smart-health-checkin/client/picker` has the logic without the UI.

| Function | What it does |
|---|---|
| `arrangeResponders(responders)` | Returns `{ primary, inline, more }`: what leads, what's listed, and what's behind "more". |
| `startResponder(responder)` | Call it in the click handler, before any `await`. Opens a web wallet's tab and returns `{ getCredential, cancel }`. |
| `rememberChoice(id)`, `recallChoice()` | Keep the last choice for this site, if you want that. |
| `monogram(name)` | The letter and color for a wallet without an icon. |

In React, `useCheckin(request, policy)` from `@smart-health-checkin/client/react` does the same for pages drawing their own buttons.
