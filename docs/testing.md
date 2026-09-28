# Testing

Run check-ins without a real wallet, test against known-good and deliberately broken counterparts, and read what went wrong when a check-in fails.

- **In code:** [`mockWallet()`](api/testing.md#mockwallet) from `@smart-health-checkin/client/testing`.
- **In a browser:** the connectathon's [Testing EHR](#testing-ehr) and [SMART Testing Wallet](#smart-testing-wallet).
- **When it fails:** every failed result carries a code. See [Reading a failed result](#reading-a-failed-result).

Never offer the mock wallet or the testing tools to patients.

## The mock wallet

[`mockWallet()`](api/testing.md#mockwallet) is a [`Wallet`](api/checkin.md#wallet) that answers at once, with no consent screen. It runs the real wire layer: it signs and encrypts a response, and [`runCheckin`](api/checkin.md#runcheckin) opens and validates it like any other.

```ts
import { runCheckin } from "@smart-health-checkin/client";
import { mockWallet } from "@smart-health-checkin/client/testing";

const result = await runCheckin(request, { wallet: mockWallet() });
```

With no options it makes up plausible data for every item. Pin exact answers per item with [`items`](api/testing.md#items):

```ts
const wallet = mockWallet({
  items: {
    allergies: { fhir: myAllergyBundle },
    coverage: { status: "declined" },
  },
  fallback: { status: "unavailable" },
});
```

### Per-item answers

| Spec | What the item gets |
| --- | --- |
| [`{ fhir: resourceOrBundle }`](api/testing.md#mockitemspec) | One `application/fhir+json` artifact with that value. |
| `{ fhir, fhirVersion }` | The same, with a FHIR version other than 4.0.1. |
| `{ healthCard: [jws, …] }` | One `application/smart-health-card` artifact carrying those cards. |
| `{ status: "declined" }` | A status and no artifact. Also `unavailable`, `unsupported`, `error`, `partial`. |
| `{ status, message }` | The same, with a message. |
| `[spec, spec]` | Several artifacts for one item. |

Add [`alsoFulfills: ["otherItem"]`](api/testing.md#mockitemspec) to a `fhir` or `healthCard` spec when one artifact answers several items. Those items are then reported fulfilled without an artifact of their own.

### Other options

| Option | What it does |
| --- | --- |
| [`fallback`](api/testing.md#fallback) | What items not named in `items` get: `"fabricate"` (the default) or a spec applied to all of them. |
| [`respond`](api/testing.md#respond) | `(request) => response`: build the whole response yourself. |
| [`origin`](api/testing.md#origin) | The origin the response is bound to. Defaults to `location.origin`. |

### Without the wire layer

To test your own code on a response, skip sealing and opening entirely:

| Function | Returns |
| --- | --- |
| [`buildMockResponse(request, { items, fallback })`](api/testing.md#buildmockresponse) | The response the mock wallet would send, as plain JSON. |
| [`fabricateResponse(request)`](api/testing.md#fabricateresponse) | Made-up data for every item of any request. |

## In unit tests

[`runCheckin`](api/checkin.md#runcheckin) binds the response to the page's origin, so it needs `location`. Browsers have it. In Bun or Node, set a stand-in before the first check-in:

```ts
(globalThis as { location?: unknown }).location ??= {
  origin: "https://ehr.example",
  href: "https://ehr.example/checkin",
};
```

Then test outcomes directly:

```ts
import { expect, test } from "bun:test";
import { runCheckin } from "@smart-health-checkin/client";
import { mockWallet } from "@smart-health-checkin/client/testing";

test("a declined item is reported, the rest still arrives", async () => {
  const result = await runCheckin(request, {
    wallet: mockWallet({ items: { allergies: { fhir: myAllergyBundle }, coverage: { status: "declined" } } }),
  });
  if (result.status !== "completed") throw new Error(result.status);
  expect(result.response.status("coverage")).toBe("declined");
  expect(result.response.resources("allergies", { type: "AllergyIntolerance" })).toHaveLength(1);
});
```

To test failures, wrap a transport that throws with [`customWallet`](api/checkin.md#customwallet):

```ts
import { CheckinError, customWallet } from "@smart-health-checkin/client";

const blocked = customWallet({
  id: "blocked",
  name: "Blocked",
  open: () => ({
    getCredential: async () => {
      throw new CheckinError("blocked", "tab blocked");
    },
    cancel() {},
  }),
});
```

## The mock in a page

Add the [`mock`](api/ui.md#attributes) attribute to the picker. It offers a "Simulated response" option after the real ones.

```html
<smart-checkin-picker registry="/wallets.json" mock></smart-checkin-picker>
```

## Health cards when testing

By default only cards from trusted issuers reach [`resources()`](api/checkin.md#resources), and test issuers usually aren't trusted. While testing, loosen [`accept`](api/checkin.md#accept) to include cards from any issuer whose signature verifies, or every card, including ones whose signature fails:

```ts
import { configureHealthCardTrust } from "@smart-health-checkin/client";

configureHealthCardTrust({ accept: "any-valid" });
configureHealthCardTrust({ accept: "everything" });
```

To trust one test issuer without fetching its keys, pass them instead: [`configureHealthCardTrust({ keys: { [issuer]: jwks } })`](api/checkin.md#keys-1). [SMART Health Cards](responses.md#smart-health-cards) explains each setting and how to see every card's result.

## The connectathon tools

Two hosted tools let you test against a known-good counterpart.

### Testing EHR

<https://smart-health-checkin.org/connectathon/testing-ehr/>

- Sends a connectathon scenario, a request you build from items, or one you paste.
- Sends it to a registry wallet, this device's own wallet, or any web wallet by URL, so you can test before you're registered.
- Shows the verdict first, then each failing check with what to fix, then what came back: readable, as JSON, and the wire layers.
- Downloads the whole run, keeps recent runs in the browser, and opens a prefilled issue for a result.

### SMART Testing Wallet

<https://smart-health-checkin.org/connectathon/testing-wallet/>

A web wallet with synthetic patients. It can send a deliberately broken or very large response, so you can check your page's error handling.

To test your own page: open the wallet, set faults or a response size in its testing panel, choose "Copy wallet URL for these settings", and add that URL to your page's wallet list as a web wallet, for example with [`webWallet()`](api/checkin.md#webwallet). Then run check-ins from your page as usual; each one gets those options, and the wallet's approval screen shows them. For example, [bad signature](https://smart-health-checkin.org/connectathon/testing-wallet/eyJmYXVsdHMiOlsiYmFkLXNpZ25hdHVyZSJdfQ/) and [5 MB response](https://smart-health-checkin.org/connectathon/testing-wallet/eyJzaXplIjoiNW0ifQ/). These [config URLs](https://github.com/smart-health-checkin/connectathon/blob/main/testing-wallet/FEATURES.md#config-urls) are the Testing Wallet's own format, not part of SMART Health Check-in: your page opens them like any wallet URL. The [Testing EHR](#testing-ehr) can build them too, under "Testing Wallet options".

| Fault | What the wallet sends |
| --- | --- |
| `wrong-canonical` | A QuestionnaireResponse whose `questionnaire` drops the version or changes the URL |
| `missing-status` | One item with no status |
| `duplicate-status` | One item with two statuses |
| `wrong-request-id` | A `requestId` that doesn't match |
| `unaccepted-media-type` | An artifact in a type the item didn't accept |
| `bad-signature` | A corrupted issuer signature |
| `bad-encryption` | A corrupted HPKE ciphertext |
| `wrong-origin` | A transcript bound to a different origin |
| `bad-shc-signature` | A SMART Health Card with a broken signature |
| `combine-allergies-meds` | Allergies and medications in one shared Bundle. A valid response, for scenario [shared-artifact](https://smart-health-checkin.org/connectathon/advanced.html#shared-artifact). |

What this library does with each, and what your page should do (spec [§6.4](https://smart-health-checkin.org/spec/#6-4-verifier-cross-validation) and [§8.5](https://smart-health-checkin.org/spec/#8-5-hpke-encryption-and-verifier-processing)):

- **`combine-allergies-meds`:** accept the response intact.
- **`bad-shc-signature`:** accept the response. The card arrives with `valid: false` and is left out of `resources()`.
- **`bad-signature`:** complete the check-in with a `device-signature` or `issuer-signature` warning in [`result.warnings`](api/checkin.md#checkinresult).
- **`wrong-canonical` and `unaccepted-media-type`:** complete it with that record set aside; [`response.disregarded()`](api/checkin.md#disregarded) says why.
- **`missing-status` and `duplicate-status`:** complete it; that item has no status ([`response.status(id)`](api/checkin.md#status) is `undefined`).
- **`wrong-request-id`, `bad-encryption`, and `wrong-origin`:** fail with `invalid-response`.

The wallet's response size setting makes a valid response of about 512 KB, 1 MB, 2 MB, or 5 MB, by adding earlier records such as past lab results to one item's Bundle. Use it to check that your page handles a large response the way it handles a small one.

## Reading a failed result

A failed result has [`error.code`](api/checkin.md#checkinerrorcode), `error.message`, and sometimes [`error.check`](api/checkin.md#checkinresult).

```ts
if (result.status === "failed") console.log(result.error.code, result.error.check, result.error.message);
```

| Code | What happened | What to check |
| --- | --- | --- |
| `unsupported` | This browser can't reach that wallet. The wallet was never opened. | [`wallet.available`](api/checkin.md#available) and [`wallet.unavailableReason`](api/checkin.md#unavailablereason). For the platform wallet, [`detectDcApiSupport()`](api/checkin.md#detectdcapisupport). |
| `blocked` | The browser blocked the wallet's tab. | That [`start()`](api/checkin.md#start) or [`runCheckin()`](api/checkin.md#runcheckin) runs inside the click, before any `await`. |
| `timeout` | The web wallet didn't answer in 5 minutes. | That the wallet posts `ready` to its opener and replies with the same `requestId`. |
| `wallet-error` | The wallet reported an error, or its transport threw. | The message: it's the wallet's own words. |
| `invalid-response` | The response couldn't be decoded or decrypted, had no SMART response in it, or answers a different request. | `error.check`, the spec requirement that failed: `VRS-3` didn't decrypt (usually the wrong origin), `VRS-2`/`VRS-4`/`VRS-8` couldn't find the parts, `XV-1`/`XV-2` a response that isn't a reply to this request. |
| `server` | Server-held keys failed to prepare or open the request. | Your key server's logs. |

A declined check-in is not a failure: `result.status` is `"declined"`, with no error.

## The demos

Each demo page runs the real flow and shows one way to use the library. Source is in [`demo/src/`](https://github.com/smart-health-checkin/client/tree/main/demo/src).

| Page | What it shows |
| --- | --- |
| [Clinic check-in](../demo/) | A clinic website's check-in page: [the picker](wallets.md#the-picker), the raw response, the optional FHIR helper |
| [Tutorial's finished page](../demo/tutorial.html) | The finished page from [the tutorial](tutorial.md): the picker, a request, and a form filled from the answer |
| [React](../demo/react.html) | [`<CheckinPicker>`](api/react.md#checkinpicker) and [`response.resources("meds", { type: "MedicationRequest" })`](api/checkin.md#resources) |
| [Angular](../demo/angular.html) | A small service over `wallets()` and `wallet.start` |
| [Form autofill](../demo/autofill.html) | [The picker](wallets.md#the-picker), then prefill from [`response.resources`](api/checkin.md#resources) and ask only for what's missing |
| [Kiosk](../demo/kiosk.html) and its [phone page](../demo/handoff.html) | [`handoffWallet()`](api/handoff.md#handoffwallet), and the picker in [pick mode](wallets.md#pick-only) with [`answerHandoff`](api/handoff.md#answerhandoff) |
| Demo wallet ([source](https://github.com/smart-health-checkin/client/blob/main/demo/src/wallet.ts)) | A web wallet built on [`serveWebWallet`](api/wallet.md#servewebwallet) |

The clinic check-in demo takes options in the URL fragment, such as `#wallet=mock` to offer only the simulated response or `#wallet=platform` to offer only the device's own wallet. [Clinic check-in demo options](../demo/README.md) lists them.
