[@smart-health-checkin/client API](index.md) / testing

# testing

## Type Aliases

### MockItemSpec

```ts
type MockItemSpec = 
  | {
  alsoFulfills?: readonly string[];
  fhir: unknown;
  fhirVersion?: string;
}
  | {
  alsoFulfills?: readonly string[];
  healthCard: readonly string[];
}
  | {
  message?: string;
  status: SmartCheckinItemStatus["status"];
};
```

Defined in: src/testing/mock.ts:25

What the mock wallet should return for one requested item.

Tests usually want to pin exact data ("this allergy list, missing its
reaction") or exercise a non-happy status, so both are first-class.

#### Union Members

##### Type Literal

```ts
{
  alsoFulfills?: readonly string[];
  fhir: unknown;
  fhirVersion?: string;
}
```

Return this FHIR resource or Bundle for the item. `alsoFulfills` names
other request items this same artifact satisfies — one bundle answering
a "clinical summary" item and an "allergies" item at once, say — and
those items are then reported fulfilled without an artifact of their own.

***

##### Type Literal

```ts
{
  alsoFulfills?: readonly string[];
  healthCard: readonly string[];
}
```

Return a SMART Health Card artifact carrying these JWS strings.

***

##### Type Literal

```ts
{
  message?: string;
  status: SmartCheckinItemStatus["status"];
}
```

Report a status with no artifact — declined, unavailable, error, …

***

### MockItemSpecs

```ts
type MockItemSpecs = 
  | MockItemSpec
  | readonly MockItemSpec[];
```

Defined in: src/testing/mock.ts:39

One item can be answered by several artifacts: give it a list.

***

### MockWalletOptions

```ts
type MockWalletOptions = {
  fallback?: "fabricate" | MockItemSpec;
  items?: Record<string, MockItemSpecs>;
  origin: string;
  respond?: (request) => SmartCheckinResponse;
};
```

Defined in: src/testing/mock.ts:41

#### Properties

##### fallback?

```ts
optional fallback?: "fabricate" | MockItemSpec;
```

Defined in: src/testing/mock.ts:63

What to do with items `items` doesn't mention: "fabricate" (default)
invents plausible demo data; a spec applies that spec to all of them.

##### items?

```ts
optional items?: Record<string, MockItemSpecs>;
```

Defined in: src/testing/mock.ts:58

Exactly what to return, per request item id. Anything not named here
follows `fallback`.

```ts
createMockWalletCredentialGetter({
  origin: location.origin,
  items: {
    allergies: { fhir: myAllergyBundle },
    coverage: { status: "declined" },
  },
  fallback: { status: "unavailable" },
});
```

##### origin

```ts
origin: string;
```

Defined in: src/testing/mock.ts:42

##### respond?

```ts
optional respond?: (request) => SmartCheckinResponse;
```

Defined in: src/testing/mock.ts:65

Full manual control: build the entire response yourself.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`SmartCheckinRequest`](checkin.md#smartcheckinrequest) |

###### Returns

[`SmartCheckinResponse`](checkin.md#smartcheckinresponse)

## Variables

### DEMO\_HEALTH\_CARD\_JWS

```ts
const DEMO_HEALTH_CARD_JWS: "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiIsImtpZCI6Im1vY2sta2V5In0.fZHNjtQwEIRfZVVcnZkkGmbAR1gkQFqB-Lus5tBxOhsjx4nszrBR5HdHDquBw4pj293V9VWvsDFCoxeZot7vf5FzLDt-pGFyvG95GKHgmw66Oh1Pdf3yWJYKFwO9QpaJoe-vw3GgID2Tk35nKLTxxZ-iyAXOCiZwy14sua9z85ONZJWut-EHh2hHD43DrtxVUNvrm9m3jnNP4DjOwfC3bSOePtSTA5jROTaSFRTYS1ig71d0s3Pfg4O-zusS6lo8I_yZxLKXjExDZlvR0WDdAo0vvHCEwoO9sM_YH8fQksc5nRUaG6S_Jcki1etXh6I8FmWNlNSzNjLhf2y8HS8c6CETRiGZ84XIiL38ZV4h_CjQuOVhvHm_5XwzOfJICnFuogm24fChzS3v7j4Vh0N1gkLDnjtrLOWM8uKOA_vs4t-QksJEyxi2BFobJ0c5gm3X3SwzOWTqiYMd26wThUJ2U5f1sSiroqyQUjqnlNJv.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" = "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiIsImtpZCI6Im1vY2sta2V5In0.fZHNjtQwEIRfZVVcnZkkGmbAR1gkQFqB-Lus5tBxOhsjx4nszrBR5HdHDquBw4pj293V9VWvsDFCoxeZot7vf5FzLDt-pGFyvG95GKHgmw66Oh1Pdf3yWJYKFwO9QpaJoe-vw3GgID2Tk35nKLTxxZ-iyAXOCiZwy14sua9z85ONZJWut-EHh2hHD43DrtxVUNvrm9m3jnNP4DjOwfC3bSOePtSTA5jROTaSFRTYS1ig71d0s3Pfg4O-zusS6lo8I_yZxLKXjExDZlvR0WDdAo0vvHCEwoO9sM_YH8fQksc5nRUaG6S_Jcki1etXh6I8FmWNlNSzNjLhf2y8HS8c6CETRiGZ84XIiL38ZV4h_CjQuOVhvHm_5XwzOfJICnFuogm24fChzS3v7j4Vh0N1gkLDnjtrLOWM8uKOA_vs4t-QksJEyxi2BFobJ0c5gm3X3SwzOWTqiYMd26wThUJ2U5f1sSiroqyQUjqnlNJv.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
```

Defined in: src/testing/mock.ts:186

***

### DEMO\_WALLET\_REGISTRY

```ts
const DEMO_WALLET_REGISTRY: WalletRegistry;
```

Defined in: [src/testing/index.ts:27](https://github.com/smart-health-checkin/client/blob/main/src/testing/index.ts#L27)

This project's demo web wallet, for demos.

## Functions

### buildMockResponse()

```ts
function buildMockResponse(request, options?): SmartCheckinResponse;
```

Defined in: src/testing/mock.ts:72

Build a response from a per-item specification. Exported so tests can
assert on the response without going through the wire layer at all.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`SmartCheckinRequest`](checkin.md#smartcheckinrequest) |
| `options` | `Pick`\<[`MockWalletOptions`](#mockwalletoptions), `"items"` \| `"fallback"`\> |

#### Returns

[`SmartCheckinResponse`](checkin.md#smartcheckinresponse)

***

### fabricateResponse()

```ts
function fabricateResponse(request, include?): SmartCheckinResponse;
```

Defined in: src/testing/mock.ts:189

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`SmartCheckinRequest`](checkin.md#smartcheckinrequest) |
| `include?` | (`itemId`) => `boolean` |

#### Returns

[`SmartCheckinResponse`](checkin.md#smartcheckinresponse)

***

### mockWallet()

```ts
function mockWallet(options?): Wallet;
```

Defined in: [src/testing/index.ts:13](https://github.com/smart-health-checkin/client/blob/main/src/testing/index.ts#L13)

A wallet that answers at once with the data you specify, or plausible fabricated data.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `Omit`\<[`MockWalletOptions`](#mockwalletoptions), `"origin"`\> & \{ `origin?`: `string`; \} |

#### Returns

[`Wallet`](checkin.md#wallet-1)
