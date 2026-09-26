[@smart-health-checkin/client API](index.md) / model

# model

## Type Aliases

### FhirCanonical

```ts
type FhirCanonical = string;
```

Defined in: [src/model/types.ts:6](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L6)

Transport-neutral SMART Health Check-in clinical model (draft spec §§5–6).
Ported from smart-health-checkin-mdoc rp-web/src/sdk/core.ts.

***

### FhirProfileCollectionRef

```ts
type FhirProfileCollectionRef = FhirCanonical;
```

Defined in: [src/model/types.ts:14](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L14)

model — transport-neutral SMART Health Check-in request/response types and
validators (draft spec §§5–6 as code). Ported from the spec prototype and
verified against the vendored fixtures.

***

### FhirResourceType

```ts
type FhirResourceType = string;
```

Defined in: [src/model/types.ts:8](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L8)

model — transport-neutral SMART Health Check-in request/response types and
validators (draft spec §§5–6 as code). Ported from the spec prototype and
verified against the vendored fixtures.

***

### FhirVersion

```ts
type FhirVersion = string;
```

Defined in: [src/model/types.ts:7](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L7)

model — transport-neutral SMART Health Check-in request/response types and
validators (draft spec §§5–6 as code). Ported from the spec prototype and
verified against the vendored fixtures.

***

### SmartArtifactBase

```ts
type SmartArtifactBase = {
  fulfills: ReadonlyArray<string>;
  id: string;
  mediaType: string;
};
```

Defined in: [src/model/types.ts:53](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L53)

model — transport-neutral SMART Health Check-in request/response types and
validators (draft spec §§5–6 as code). Ported from the spec prototype and
verified against the vendored fixtures.

#### Properties

##### fulfills

```ts
fulfills: ReadonlyArray<string>;
```

Defined in: [src/model/types.ts:56](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L56)

##### id

```ts
id: string;
```

Defined in: [src/model/types.ts:54](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L54)

##### mediaType

```ts
mediaType: string;
```

Defined in: [src/model/types.ts:55](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L55)

***

### SmartHealthCheckinAcceptedMediaType

```ts
type SmartHealthCheckinAcceptedMediaType = 
  | "application/smart-health-card"
  | "application/fhir+json"
  | string & {
};
```

Defined in: [src/model/types.ts:9](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L9)

model — transport-neutral SMART Health Check-in request/response types and
validators (draft spec §§5–6 as code). Ported from the spec prototype and
verified against the vendored fixtures.

***

### ValidationResult

```ts
type ValidationResult<T> = 
  | {
  ok: true;
  value: T;
}
  | {
  error: string;
  ok: false;
};
```

Defined in: [src/model/types.ts:78](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L78)

model — transport-neutral SMART Health Check-in request/response types and
validators (draft spec §§5–6 as code). Ported from the spec prototype and
verified against the vendored fixtures.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Functions

### findWallet()

```ts
function findWallet(registry, id): WebWalletEntry | undefined;
```

Defined in: [src/model/registry.ts:107](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L107)

Look one up by id.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `registry` | [`WalletRegistry`](checkin.md#walletregistry) |
| `id` | `string` |

#### Returns

[`WebWalletEntry`](checkin.md#webwalletentry) \| `undefined`

***

### loadWalletRegistry()

```ts
function loadWalletRegistry(source, options?): Promise<WalletRegistry>;
```

Defined in: [src/model/registry.ts:79](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L79)

Resolve a registry from whatever a deployment configured: the built-in
default, an inline object or array, or a URL to fetch JSON from.

```ts
const registry = await loadWalletRegistry("/config/wallets.json");
```

A fetched list is validated before use; a malformed one throws rather than
silently falling back, because "which wallet are we sending people to" is
not a question to answer by accident.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | \| `string` \| [`WebWalletEntry`](checkin.md#webwalletentry)[] \| [`WalletRegistry`](checkin.md#walletregistry) |
| `options` | \{ `fetchImpl?`: [`FetchLike`](fhir.md#fetchlike); \} |
| `options.fetchImpl?` | [`FetchLike`](fhir.md#fetchlike) |

#### Returns

`Promise`\<[`WalletRegistry`](checkin.md#walletregistry)\>

***

### validateResponseAgainstRequest()

```ts
function validateResponseAgainstRequest(request, response): ValidationResult<SmartCheckinResponse>;
```

Defined in: [src/model/validate.ts:185](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L185)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | `unknown` |
| `response` | `unknown` |

#### Returns

[`ValidationResult`](#validationresult)\<[`SmartCheckinResponse`](checkin.md#smartcheckinresponse)\>

***

### validateSmartCheckinRequest()

```ts
function validateSmartCheckinRequest(v): ValidationResult<SmartCheckinRequest>;
```

Defined in: [src/model/validate.ts:14](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L14)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `v` | `unknown` |

#### Returns

[`ValidationResult`](#validationresult)\<[`SmartCheckinRequest`](checkin.md#smartcheckinrequest)\>

***

### validateSmartCheckinResponse()

```ts
function validateSmartCheckinResponse(v): ValidationResult<SmartCheckinResponse>;
```

Defined in: [src/model/validate.ts:109](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L109)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `v` | `unknown` |

#### Returns

[`ValidationResult`](#validationresult)\<[`SmartCheckinResponse`](checkin.md#smartcheckinresponse)\>

***

### validateWalletRegistry()

```ts
function validateWalletRegistry(value): ValidationResult<WalletRegistry>;
```

Defined in: [src/model/registry.ts:37](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L37)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

#### Returns

[`ValidationResult`](#validationresult)\<[`WalletRegistry`](checkin.md#walletregistry)\>

## References

### SmartArtifact

Re-exports [SmartArtifact](checkin.md#smartartifact)

***

### SmartCheckinContentSelector

Re-exports [SmartCheckinContentSelector](checkin.md#smartcheckincontentselector)

***

### SmartCheckinItemStatus

Re-exports [SmartCheckinItemStatus](checkin.md#smartcheckinitemstatus)

***

### SmartCheckinRequest

Re-exports [SmartCheckinRequest](checkin.md#smartcheckinrequest)

***

### SmartCheckinRequestItem

Re-exports [SmartCheckinRequestItem](checkin.md#smartcheckinrequestitem)

***

### SmartCheckinResponse

Re-exports [SmartCheckinResponse](checkin.md#smartcheckinresponse)

***

### WalletRegistry

Re-exports [WalletRegistry](checkin.md#walletregistry)

***

### WebWalletEntry

Re-exports [WebWalletEntry](checkin.md#webwalletentry)
