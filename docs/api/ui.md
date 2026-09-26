[@smart-health-checkin/client API](index.md) / ui

# ui

## Classes

### SmartCheckinPicker

Defined in: [src/ui/picker-element.ts:124](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L124)

The `<smart-checkin-picker>` element. Importing `@smart-health-checkin/client/ui`
(or loading the hosted `ui.js`) registers it; the Wallet picker guide
explains how to use it.

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/ui.js"></script>
<smart-checkin-picker registry="/wallets.json"></smart-checkin-picker>
<script type="module">
  const picker = document.querySelector("smart-checkin-picker");
  picker.request = { purpose: "Before your visit", items: [ ... ] };
  picker.addEventListener("smart-checkin-response", (e) => fill(e.detail.response));
</script>
```

#### Attributes

| Attribute | What it does |
| --- | --- |
| `registry` | URL of a wallet registry (`wallets.json`). Omit it for no web wallets. |
| `platform="off"` | Don't offer the phone's own wallet. |
| `remember` | Remember the last wallet used on this site, in this browser. Off unless present. |
| `mock` | Offer the simulated wallet. Development only. |
| `mode="pick"` | Only choose; the page runs the check-in (see `smart-checkin-choose` and `setOutcome`). |
| `theme` | `light` (default), `dark`, or `auto` to follow the device. |
| `appearance="flat"` | No card border or background. |
| `footer="off"` | Hide the SMART Health Check-in mark. |
| `motion` | `subtle` (default) or `none`. A reduced-motion preference on the device always means `none`. |
| `heading`, `description` | Replace the two lines at the top. |

The properties `request`, `wallets`, `checkinOptions`, `strings`, and
`motion` are listed under Accessors below.

#### Events

All bubble and cross shadow roots. `SmartCheckinPickerEventMap` gives each
one's `detail`: `smart-checkin-choose` (fired inside the click),
`smart-checkin-response`, `smart-checkin-declined`, and `smart-checkin-error`.

#### CSS custom properties

Set them on the element or any ancestor. Dark values apply with `theme="dark"`.

| Property | Default (light) |
| --- | --- |
| `--smart-checkin-font` | Inter, then the system font |
| `--smart-checkin-accent`, `--smart-checkin-accent-hover`, `--smart-checkin-on-accent` | `#0E6FB8`, `#094D80`, white |
| `--smart-checkin-text`, `--smart-checkin-text-muted`, `--smart-checkin-text-faint` | `#1F2933`, `#4B5563`, `#7B8794` |
| `--smart-checkin-surface`, `--smart-checkin-row`, `--smart-checkin-border` | white, white, `#E4E7EB` |
| `--smart-checkin-icon-background` | white, behind wallet icons |
| `--smart-checkin-focus` | the accent, for focus rings |
| `--smart-checkin-radius`, `--smart-checkin-radius-large`, `--smart-checkin-icon-radius` | `10px`, `14px`, `9px` |
| `--smart-checkin-success`, `--smart-checkin-warning` | `#1A8C76`, `#B85C17` |
| `--smart-checkin-mark-purple`, `--smart-checkin-mark-muted` | `#722772`, `#B9C2CC`: the starburst's purple petal, and its petals when declined or failed |
| `--smart-checkin-motion-speed` | `1`; multiplies every duration |
| `--smart-checkin-card-border`, `--smart-checkin-card-padding` | `1px solid` the border color, `16px` |

#### Parts

For anything the custom properties don't cover, style these with `::part()`:
`container`, `card`, `title`, `description`, `primary`, `list`, `row`,
`more`, `icon`, `status`, `mark` (the starburst beside a status), `check`
(on the mark when shared), `footer`, and `dialog`.

#### Extends

- `HTMLElementBase`

#### Accessors

##### checkinOptions

###### Get Signature

```ts
get checkinOptions(): Omit<CheckinOptions, "wallet" | "signal" | "session">;
```

Defined in: [src/ui/picker-element.ts:181](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L181)

Passed to `runCheckin`: `keys`, `healthCards`, `fetch`.

###### Returns

`Omit`\<[`CheckinOptions`](checkin.md#checkinoptions), `"wallet"` \| `"signal"` \| `"session"`\>

###### Set Signature

```ts
set checkinOptions(value): void;
```

Defined in: [src/ui/picker-element.ts:184](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L184)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | \| `Omit`\<[`CheckinOptions`](checkin.md#checkinoptions), `"wallet"` \| `"session"` \| `"signal"`\> \| `undefined` |

###### Returns

`void`

##### motion

###### Get Signature

```ts
get motion(): PickerMotion;
```

Defined in: [src/ui/picker-element.ts:165](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L165)

How much the picker moves: "subtle" (the default: short fades, and a sweep
round the mark while it waits) or "none". Reflects the `motion` attribute.
A reduced-motion preference on the device always means none.

###### Returns

[`PickerMotion`](#pickermotion)

###### Set Signature

```ts
set motion(value): void;
```

Defined in: [src/ui/picker-element.ts:168](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L168)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | [`PickerMotion`](#pickermotion) |

###### Returns

`void`

##### request

###### Get Signature

```ts
get request(): CheckinRequestInput | undefined;
```

Defined in: [src/ui/picker-element.ts:173](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L173)

What to ask the patient for. Required unless `mode="pick"`.

###### Returns

[`CheckinRequestInput`](checkin.md#checkinrequestinput) \| `undefined`

###### Set Signature

```ts
set request(value): void;
```

Defined in: [src/ui/picker-element.ts:176](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L176)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | [`CheckinRequestInput`](checkin.md#checkinrequestinput) \| `undefined` |

###### Returns

`void`

##### strings

###### Get Signature

```ts
get strings(): {
  blockedDetail: string;
  blockedTitle: string;
  cancel: string;
  chooseDifferent: string;
  close: string;
  declinedDetail: string;
  declinedTitle: string;
  description: string;
  doneDetail: string;
  doneTitle: string;
  errorDetail: string;
  errorTitle: string;
  footer: string;
  heading: string;
  loading: string;
  moreDetail: string;
  moreTitle: string;
  noMatches: string;
  noneDetail: string;
  noneTitle: string;
  onlyDetail: string;
  onlyTitle: string;
  platformDetail: string;
  platformDetailDesktop: string;
  platformTitle: string;
  platformTitleDesktop: string;
  rememberedDetail: string;
  search: string;
  selectorDetail: string;
  selectorTitle: string;
  shareAgain: string;
  tryAgain: string;
  useDifferent: string;
  waitingPlatformDetail: string;
  waitingPlatformTitle: string;
  waitingWebDetail: string;
  waitingWebTitle: string;
  webDivider: string;
};
```

Defined in: [src/ui/picker-element.ts:189](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L189)

Replace any of the picker's text. Missing keys keep their defaults.

###### Returns

```ts
{
  blockedDetail: string;
  blockedTitle: string;
  cancel: string;
  chooseDifferent: string;
  close: string;
  declinedDetail: string;
  declinedTitle: string;
  description: string;
  doneDetail: string;
  doneTitle: string;
  errorDetail: string;
  errorTitle: string;
  footer: string;
  heading: string;
  loading: string;
  moreDetail: string;
  moreTitle: string;
  noMatches: string;
  noneDetail: string;
  noneTitle: string;
  onlyDetail: string;
  onlyTitle: string;
  platformDetail: string;
  platformDetailDesktop: string;
  platformTitle: string;
  platformTitleDesktop: string;
  rememberedDetail: string;
  search: string;
  selectorDetail: string;
  selectorTitle: string;
  shareAgain: string;
  tryAgain: string;
  useDifferent: string;
  waitingPlatformDetail: string;
  waitingPlatformTitle: string;
  waitingWebDetail: string;
  waitingWebTitle: string;
  webDivider: string;
}
```

###### blockedDetail

```ts
blockedDetail: string = "Allow pop-ups for this site, then try again.";
```

###### blockedTitle

```ts
blockedTitle: string = "Your browser blocked the new tab";
```

###### cancel

```ts
cancel: string = "Cancel";
```

###### chooseDifferent

```ts
chooseDifferent: string = "Choose a different app";
```

###### close

```ts
close: string = "Close";
```

###### declinedDetail

```ts
declinedDetail: string = "You closed {name} before sharing. You can try again or fill in the form yourself.";
```

###### declinedTitle

```ts
declinedTitle: string = "Nothing was shared";
```

###### description

```ts
description: string = "Fill in this form from a health app you already use.";
```

###### doneDetail

```ts
doneDetail: string = "Your information was added to this page.";
```

###### doneTitle

```ts
doneTitle: string = "Shared from {name}";
```

###### errorDetail

```ts
errorDetail: string = "{message}";
```

###### errorTitle

```ts
errorTitle: string = "Something went wrong";
```

###### footer

```ts
footer: string = "SMART Health Check-in";
```

###### heading

```ts
heading: string = "Share your health information";
```

###### loading

```ts
loading: string = "Looking for health apps…";
```

###### moreDetail

```ts
moreDetail: string = "{count} more, and a search box";
```

###### moreTitle

```ts
moreTitle: string = "More health apps";
```

###### noMatches

```ts
noMatches: string = "No apps match “{query}”.";
```

###### noneDetail

```ts
noneDetail: string = "You can fill in the form yourself, or open this page on a phone with a health app.";
```

###### noneTitle

```ts
noneTitle: string = "No health apps can connect from this browser";
```

###### onlyDetail

```ts
onlyDetail: string = "Opens in a new tab";
```

###### onlyTitle

```ts
onlyTitle: string = "Continue with {name}";
```

###### platformDetail

```ts
platformDetail: string = "Your phone shows the health apps you have";
```

###### platformDetailDesktop

```ts
platformDetailDesktop: string = "Scan a code with your phone's camera";
```

###### platformTitle

```ts
platformTitle: string = "Use an app on this phone";
```

###### platformTitleDesktop

```ts
platformTitleDesktop: string = "Use an app on your phone";
```

###### rememberedDetail

```ts
rememberedDetail: string = "You used this last time";
```

###### search

```ts
search: string = "Find your app";
```

###### selectorDetail

```ts
selectorDetail: string = "{count} apps can fill in this form.";
```

###### selectorTitle

```ts
selectorTitle: string = "Choose a health app";
```

###### shareAgain

```ts
shareAgain: string = "Share again or use a different app";
```

###### tryAgain

```ts
tryAgain: string = "Try again";
```

###### useDifferent

```ts
useDifferent: string = "Use a different app";
```

###### waitingPlatformDetail

```ts
waitingPlatformDetail: string = "Your phone is asking which health app to use and what to share.";
```

###### waitingPlatformTitle

```ts
waitingPlatformTitle: string = "Finish on your phone";
```

###### waitingWebDetail

```ts
waitingWebDetail: string = "It opened in a new tab. Choose what to share there, and you'll come back here.";
```

###### waitingWebTitle

```ts
waitingWebTitle: string = "Finish in {name}";
```

###### webDivider

```ts
webDivider: string = "or a health app on the web";
```

###### Set Signature

```ts
set strings(value): void;
```

Defined in: [src/ui/picker-element.ts:192](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L192)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `Partial`\<[`PickerStrings`](#pickerstrings)\> |

###### Returns

`void`

##### wallets

###### Get Signature

```ts
get wallets(): Wallet[] | undefined;
```

Defined in: [src/ui/picker-element.ts:198](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L198)

The wallets to offer (from `wallets()`), instead of the `registry` / `platform` / `mock` attributes.

###### Returns

[`Wallet`](checkin.md#wallet-1)[] \| `undefined`

###### Set Signature

```ts
set wallets(value): void;
```

Defined in: [src/ui/picker-element.ts:201](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L201)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | [`Wallet`](checkin.md#wallet-1)[] \| `undefined` |

###### Returns

`void`

#### Methods

##### reset()

```ts
reset(): void;
```

Defined in: [src/ui/picker-element.ts:242](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L242)

Back to the list of wallets, cancelling anything in progress.

###### Returns

`void`

##### setOutcome()

```ts
setOutcome(outcome): void;
```

Defined in: [src/ui/picker-element.ts:230](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L230)

In `mode="pick"`, tell the picker how the check-in ended so it can say so.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `outcome` | [`PickerOutcome`](#pickeroutcome) |

###### Returns

`void`

## Type Aliases

### PickerMotion

```ts
type PickerMotion = "subtle" | "none";
```

Defined in: [src/ui/picker-element.ts:53](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L53)

The `motion` attribute's values.

***

### PickerOutcome

```ts
type PickerOutcome = 
  | {
  status: "completed";
}
  | {
  status: "declined";
}
  | {
  code?: CheckinErrorCode;
  message: string;
  status: "failed";
};
```

Defined in: [src/ui/picker-element.ts:28](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L28)

In pick mode, how the page's check-in ended.

***

### PickerStrings

```ts
type PickerStrings = typeof DEFAULT_STRINGS;
```

Defined in: [src/ui/strings.ts:53](https://github.com/smart-health-checkin/client/blob/main/src/ui/strings.ts#L53)

***

### SmartCheckinPickerEventMap

```ts
type SmartCheckinPickerEventMap = {
  smart-checkin-choose: CustomEvent<{
     session?: WalletSession;
     wallet: Wallet;
  }>;
  smart-checkin-declined: CustomEvent<{
     result?: CheckinResult;
     wallet: Wallet;
  }>;
  smart-checkin-error: CustomEvent<{
     code?: CheckinErrorCode;
     message: string;
     result?: CheckinResult;
     wallet?: Wallet;
  }>;
  smart-checkin-response: CustomEvent<{
     response?: CheckinResponse;
     result: CheckinResult;
     wallet: Wallet;
  }>;
};
```

Defined in: [src/ui/picker-element.ts:45](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L45)

The element's events and what each carries in `detail`.

#### Properties

##### smart-checkin-choose

```ts
smart-checkin-choose: CustomEvent<{
  session?: WalletSession;
  wallet: Wallet;
}>;
```

Defined in: [src/ui/picker-element.ts:46](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L46)

##### smart-checkin-declined

```ts
smart-checkin-declined: CustomEvent<{
  result?: CheckinResult;
  wallet: Wallet;
}>;
```

Defined in: [src/ui/picker-element.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L48)

##### smart-checkin-error

```ts
smart-checkin-error: CustomEvent<{
  code?: CheckinErrorCode;
  message: string;
  result?: CheckinResult;
  wallet?: Wallet;
}>;
```

Defined in: [src/ui/picker-element.ts:49](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L49)

##### smart-checkin-response

```ts
smart-checkin-response: CustomEvent<{
  response?: CheckinResponse;
  result: CheckinResult;
  wallet: Wallet;
}>;
```

Defined in: [src/ui/picker-element.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L47)

## Variables

### DEFAULT\_STRINGS

```ts
const DEFAULT_STRINGS: {
  blockedDetail: string;
  blockedTitle: string;
  cancel: string;
  chooseDifferent: string;
  close: string;
  declinedDetail: string;
  declinedTitle: string;
  description: string;
  doneDetail: string;
  doneTitle: string;
  errorDetail: string;
  errorTitle: string;
  footer: string;
  heading: string;
  loading: string;
  moreDetail: string;
  moreTitle: string;
  noMatches: string;
  noneDetail: string;
  noneTitle: string;
  onlyDetail: string;
  onlyTitle: string;
  platformDetail: string;
  platformDetailDesktop: string;
  platformTitle: string;
  platformTitleDesktop: string;
  rememberedDetail: string;
  search: string;
  selectorDetail: string;
  selectorTitle: string;
  shareAgain: string;
  tryAgain: string;
  useDifferent: string;
  waitingPlatformDetail: string;
  waitingPlatformTitle: string;
  waitingWebDetail: string;
  waitingWebTitle: string;
  webDivider: string;
};
```

Defined in: [src/ui/strings.ts:6](https://github.com/smart-health-checkin/client/blob/main/src/ui/strings.ts#L6)

Every piece of text the picker shows. Override any of them (for wording or
translation) with the element's `strings` property. `{name}`, `{count}`,
`{query}`, and `{message}` are filled in where they appear.

#### Type Declaration

##### blockedDetail

```ts
blockedDetail: string = "Allow pop-ups for this site, then try again.";
```

##### blockedTitle

```ts
blockedTitle: string = "Your browser blocked the new tab";
```

##### cancel

```ts
cancel: string = "Cancel";
```

##### chooseDifferent

```ts
chooseDifferent: string = "Choose a different app";
```

##### close

```ts
close: string = "Close";
```

##### declinedDetail

```ts
declinedDetail: string = "You closed {name} before sharing. You can try again or fill in the form yourself.";
```

##### declinedTitle

```ts
declinedTitle: string = "Nothing was shared";
```

##### description

```ts
description: string = "Fill in this form from a health app you already use.";
```

##### doneDetail

```ts
doneDetail: string = "Your information was added to this page.";
```

##### doneTitle

```ts
doneTitle: string = "Shared from {name}";
```

##### errorDetail

```ts
errorDetail: string = "{message}";
```

##### errorTitle

```ts
errorTitle: string = "Something went wrong";
```

##### footer

```ts
footer: string = "SMART Health Check-in";
```

##### heading

```ts
heading: string = "Share your health information";
```

##### loading

```ts
loading: string = "Looking for health apps…";
```

##### moreDetail

```ts
moreDetail: string = "{count} more, and a search box";
```

##### moreTitle

```ts
moreTitle: string = "More health apps";
```

##### noMatches

```ts
noMatches: string = "No apps match “{query}”.";
```

##### noneDetail

```ts
noneDetail: string = "You can fill in the form yourself, or open this page on a phone with a health app.";
```

##### noneTitle

```ts
noneTitle: string = "No health apps can connect from this browser";
```

##### onlyDetail

```ts
onlyDetail: string = "Opens in a new tab";
```

##### onlyTitle

```ts
onlyTitle: string = "Continue with {name}";
```

##### platformDetail

```ts
platformDetail: string = "Your phone shows the health apps you have";
```

##### platformDetailDesktop

```ts
platformDetailDesktop: string = "Scan a code with your phone's camera";
```

##### platformTitle

```ts
platformTitle: string = "Use an app on this phone";
```

##### platformTitleDesktop

```ts
platformTitleDesktop: string = "Use an app on your phone";
```

##### rememberedDetail

```ts
rememberedDetail: string = "You used this last time";
```

##### search

```ts
search: string = "Find your app";
```

##### selectorDetail

```ts
selectorDetail: string = "{count} apps can fill in this form.";
```

##### selectorTitle

```ts
selectorTitle: string = "Choose a health app";
```

##### shareAgain

```ts
shareAgain: string = "Share again or use a different app";
```

##### tryAgain

```ts
tryAgain: string = "Try again";
```

##### useDifferent

```ts
useDifferent: string = "Use a different app";
```

##### waitingPlatformDetail

```ts
waitingPlatformDetail: string = "Your phone is asking which health app to use and what to share.";
```

##### waitingPlatformTitle

```ts
waitingPlatformTitle: string = "Finish on your phone";
```

##### waitingWebDetail

```ts
waitingWebDetail: string = "It opened in a new tab. Choose what to share there, and you'll come back here.";
```

##### waitingWebTitle

```ts
waitingWebTitle: string = "Finish in {name}";
```

##### webDivider

```ts
webDivider: string = "or a health app on the web";
```

***

### PICKER\_CSS

```ts
const PICKER_CSS: string;
```

Defined in: [src/ui/styles.ts:20](https://github.com/smart-health-checkin/client/blob/main/src/ui/styles.ts#L20)

***

### STARBURST\_ICON\_URL

```ts
const STARBURST_ICON_URL: string;
```

Defined in: [src/ui/icons.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/ui/icons.ts#L25)

The starburst on white, as a data: URL suitable for a wallet registry's iconUrl.

***

### STARBURST\_SVG

```ts
const STARBURST_SVG: "<svg viewBox=\"57.0752 -11.1948 95.1696 95.1696\" aria-hidden=\"true\" focusable=\"false\"><polygon class=\"petal-purple\" fill=\"#722772\" points=\"83.91 0 93.42 0 104.56 18.47 116.03 0 125.28 0 104.58 33.96\"/><polygon fill=\"#e24a31\" points=\"60.61 35.72 65.37 28.16 87.76 28.16 76.67 9.49 81.3 1.87 101.89 35.72\"/><polygon fill=\"#e77d26\" points=\"128 1.73 132.76 9.55 121.5 28.16 144.06 28.16 148.69 35.72 107.4 35.72\"/><polygon fill=\"#89bf44\" points=\"148.72 38.78 143.97 46.33 121.57 46.33 132.66 65.16 128.03 72.78 107.44 38.78\"/><polygon fill=\"#f1b42a\" points=\"81.28 72.77 76.53 64.94 87.78 46.33 65.23 46.33 60.6 38.78 101.89 38.78\"/><polygon fill=\"#64aed0\" points=\"125.46 73.22 115.89 73.22 104.68 54.63 93.14 73.22 83.82 73.22 104.66 39.04\"/></svg>";
```

Defined in: [src/ui/icons.ts:14](https://github.com/smart-health-checkin/client/blob/main/src/ui/icons.ts#L14)

The SMART starburst, square viewBox, for inline use.

## Functions

### defineCheckinPicker()

```ts
function defineCheckinPicker(tagName?): void;
```

Defined in: [src/ui/picker-element.ts:557](https://github.com/smart-health-checkin/client/blob/main/src/ui/picker-element.ts#L557)

Register `<smart-checkin-picker>` (safe to call more than once).

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `tagName` | `string` | `"smart-checkin-picker"` |

#### Returns

`void`
