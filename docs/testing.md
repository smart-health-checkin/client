# Test and debug

Run check-ins without a real wallet, test against known-good and deliberately broken counterparts, and read what went wrong when a check-in fails.

- **In code:** `mockWallet()` from `@smart-health-checkin/client/testing`.
- **In a browser:** the connectathon's Testing EHR and SMART Testing Wallet.
- **When it fails:** every failed result carries a code. See [Reading a failed result](#reading-a-failed-result).

Never offer the mock wallet or the testing tools to patients.

## The mock wallet

`mockWallet()` is a `Wallet` that answers at once, with no consent screen. It runs the real wire layer: it signs and encrypts a response, and `runCheckin` opens and validates it like any other.

```ts
import { runCheckin } from "@smart-health-checkin/client";
import { mockWallet } from "@smart-health-checkin/client/testing";

const result = await runCheckin(request, { wallet: mockWallet() });
```

With no options it makes up plausible data for every item. Pin exact answers per item with `items`:

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
| `{ fhir: resourceOrBundle }` | One `application/fhir+json` artifact with that value. |
| `{ fhir, fhirVersion }` | The same, with a FHIR version other than 4.0.1. |
| `{ healthCard: [jws, …] }` | One `application/smart-health-card` artifact carrying those cards. |
| `{ status: "declined" }` | A status and no artifact. Also `unavailable`, `unsupported`, `error`, `partial`. |
| `{ status, message }` | The same, with a message. |
| `[spec, spec]` | Several artifacts for one item. |

Add `alsoFulfills: ["otherItem"]` to a `fhir` or `healthCard` spec when one artifact answers several items. Those items are then reported fulfilled without an artifact of their own.

### Other options

| Option | What it does |
| --- | --- |
| `fallback` | What items not named in `items` get: `"fabricate"` (the default) or a spec applied to all of them. |
| `respond` | `(request) => response`: build the whole response yourself. |
| `origin` | The EHR origin the response is bound to. Defaults to `location.origin`. |

### Without the wire layer

To test your own code on a response, skip sealing and opening entirely:

| Function | Returns |
| --- | --- |
| `buildMockResponse(request, { items, fallback })` | The response the mock wallet would send, as plain JSON. |
| `fabricateResponse(request)` | Made-up data for every item of any request. |

## In unit tests

`runCheckin` binds the response to the page's origin, so it needs `location`. Browsers have it. In Bun or Node, set a stand-in before the first check-in:

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
  if (result.status !== "completed" || !result.response) throw new Error(result.status);
  expect(result.response.status("coverage")).toBe("declined");
  expect(result.response.resources("allergies", { type: "AllergyIntolerance" })).toHaveLength(1);
});
```

To test failures, wrap a transport that throws with `customWallet`:

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

## In a demo page

Add the `mock` attribute to the picker. It offers a "Simulated response" option after the real ones.

```html
<smart-checkin-picker registry="/wallets.json" mock></smart-checkin-picker>
```

## Health cards when testing

By default only cards from trusted issuers reach `resources()`. Test issuers usually aren't trusted, so loosen it for testing:

```ts
import { configureHealthCardTrust } from "@smart-health-checkin/client";

configureHealthCardTrust({ accept: "any-valid" });  // any issuer, valid signature
configureHealthCardTrust({ accept: "everything" }); // invalid cards too, marked
```

| `accept` | Cards in `resources()` |
| --- | --- |
| `"trusted"` (default) | Valid cards from trusted issuers |
| `"any-valid"` | Valid cards from any issuer |
| `"everything"` | Every card, including ones whose signature fails |

Whatever `accept` says, `healthCards(item)` lists every card with `valid`, `trusted`, `accepted`, and `reason`. To trust a test issuer without fetching its keys, pass them: `configureHealthCardTrust({ keys: { [issuer]: jwks } })`.

## The connectathon tools

Two hosted tools let you test against a known-good counterpart.

### Testing EHR

<https://smart-health-checkin.org/connectathon/testing-ehr/>

- Sends any connectathon scenario to any registry wallet, or to this device's own wallet.
- Checks the response against the spec and lists each check as pass or fail, with what went wrong.
- Links a finished run to a prefilled result report.

### SMART Testing Wallet

<https://smart-health-checkin.org/connectathon/testing-wallet/>

A web wallet with synthetic patients. Its testing panel can send a deliberately broken response, so you can check your EHR's error handling. Pick faults in the Testing EHR, or open the wallet with `#faults=…`.

| Fault | What the wallet sends |
| --- | --- |
| `wrong-canonical` | A QuestionnaireResponse whose `questionnaire` drops the version or changes the URL |
| `missing-status` | One item with no status |
| `duplicate-status` | One item with two statuses |
| `wrong-request-id` | A `requestId` that doesn't match |
| `unaccepted-media-type` | An artifact in a type the item didn't accept |
| `oversized` | A response padded past 3 MB |
| `bad-signature` | A corrupted issuer signature |
| `bad-encryption` | A corrupted HPKE ciphertext |
| `wrong-origin` | A transcript bound to a different origin |
| `bad-shc-signature` | A SMART Health Card with a broken signature |

Every fault except `oversized` and `bad-shc-signature` should end your check-in as failed with `invalid-response`. `bad-shc-signature` arrives as a card with `valid: false`, left out of `resources()`. `oversized` should arrive intact.

## Reading a failed result

A failed result has `error.code`, `error.message`, and sometimes `error.check`.

```ts
if (result.status === "failed") console.log(result.error.code, result.error.check, result.error.message);
```

| Code | What happened | What to check |
| --- | --- | --- |
| `unsupported` | This browser can't reach that wallet. The wallet was never opened. | `wallet.available` and `wallet.unavailableReason`. For the platform wallet, `detectDcApiSupport()`. |
| `blocked` | The browser blocked the wallet's tab. | That `start()` or `runCheckin()` runs inside the click, before any `await`. |
| `timeout` | The web wallet didn't answer in 5 minutes. | That the wallet posts `ready` to its opener and replies with the same `requestId`. |
| `wallet-error` | The wallet reported an error, or its transport threw. | The message: it's the wallet's own words. |
| `invalid-response` | The response failed decryption, signatures, or validation. | `error.check`: `open` for decryption and signatures, `cross` for a response that doesn't match the request. |
| `server` | Server-held keys failed to prepare or open the request. | Your key server's logs. |

A declined check-in is not a failure: `result.status` is `"declined"`, with no error.
