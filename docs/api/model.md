[@smart-health-checkin/client API](index.md) / model

# model

## Type Aliases

### ArtifactCheck

```ts
type ArtifactCheck = {
  id?: string;
  index: number;
  problems: ValidationIssue[];
  usable: boolean;
};
```

Defined in: [src/model/validate.ts:35](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L35)

One Artifact's result: usable, or disregarded with the reasons.

#### Properties

##### id?

```ts
optional id?: string;
```

Defined in: [src/model/validate.ts:38](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L38)

##### index

```ts
index: number;
```

Defined in: [src/model/validate.ts:37](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L37)

Position in `artifacts[]`.

##### problems

```ts
problems: ValidationIssue[];
```

Defined in: [src/model/validate.ts:40](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L40)

##### usable

```ts
usable: boolean;
```

Defined in: [src/model/validate.ts:39](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L39)

***

### FhirCanonical

```ts
type FhirCanonical = string;
```

Defined in: [src/model/types.ts:5](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L5)

Transport-neutral SMART Health Check-in clinical model (spec §§5–6).

***

### FhirProfileCollectionRef

```ts
type FhirProfileCollectionRef = FhirCanonical;
```

Defined in: [src/model/types.ts:13](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L13)

model — transport-neutral SMART Health Check-in request/response types and
validators (spec §§5–6), checked against the spec's conformance cases.

***

### FhirResourceType

```ts
type FhirResourceType = string;
```

Defined in: [src/model/types.ts:7](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L7)

model — transport-neutral SMART Health Check-in request/response types and
validators (spec §§5–6), checked against the spec's conformance cases.

***

### FhirVersion

```ts
type FhirVersion = string;
```

Defined in: [src/model/types.ts:6](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L6)

model — transport-neutral SMART Health Check-in request/response types and
validators (spec §§5–6), checked against the spec's conformance cases.

***

### ItemOutcome

```ts
type ItemOutcome = {
  artifacts: SmartArtifact[];
  id: string;
  message?: string;
  problems: ValidationIssue[];
  status?: SmartCheckinItemStatus["status"];
};
```

Defined in: [src/model/validate.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L44)

One request item's outcome in a response.

#### Properties

##### artifacts

```ts
artifacts: SmartArtifact[];
```

Defined in: [src/model/validate.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L50)

Usable Artifacts listing this item.

##### id

```ts
id: string;
```

Defined in: [src/model/validate.ts:45](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L45)

##### message?

```ts
optional message?: string;
```

Defined in: [src/model/validate.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L48)

##### problems

```ts
problems: ValidationIssue[];
```

Defined in: [src/model/validate.ts:51](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L51)

##### status?

```ts
optional status?: SmartCheckinItemStatus["status"];
```

Defined in: [src/model/validate.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L47)

The item's status, or undefined when it has no valid status ([XV-3]).

***

### RequestValidation

```ts
type RequestValidation = 
  | {
  ok: true;
  unsupportedItems: UnsupportedItem[];
  value: SmartCheckinRequest;
}
  | {
  error: string;
  ok: false;
  rule: string;
};
```

Defined in: [src/model/validate.ts:30](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L30)

***

### ResponseValidation

```ts
type ResponseValidation = 
  | {
  artifacts: ArtifactCheck[];
  items: ItemOutcome[];
  ok: true;
  usableArtifacts: SmartArtifact[];
  value: SmartCheckinResponse;
}
  | {
  error: string;
  ok: false;
  rule: string;
};
```

Defined in: [src/model/validate.ts:54](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L54)

#### Union Members

##### Type Literal

```ts
{
  artifacts: ArtifactCheck[];
  items: ItemOutcome[];
  ok: true;
  usableArtifacts: SmartArtifact[];
  value: SmartCheckinResponse;
}
```

###### artifacts

```ts
artifacts: ArtifactCheck[];
```

###### items

```ts
items: ItemOutcome[];
```

One entry per status row's item id (without a request) or per request item (with one).

###### ok

```ts
ok: true;
```

###### usableArtifacts

```ts
usableArtifacts: SmartArtifact[];
```

The Artifacts that passed every check, in response order.

###### value

```ts
value: SmartCheckinResponse;
```

The response exactly as received.

***

##### Type Literal

```ts
{
  error: string;
  ok: false;
  rule: string;
}
```

***

### SmartArtifactBase

```ts
type SmartArtifactBase = {
  fulfills: ReadonlyArray<string>;
  id: string;
  mediaType: string;
};
```

Defined in: [src/model/types.ts:52](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L52)

model — transport-neutral SMART Health Check-in request/response types and
validators (spec §§5–6), checked against the spec's conformance cases.

#### Properties

##### fulfills

```ts
fulfills: ReadonlyArray<string>;
```

Defined in: [src/model/types.ts:55](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L55)

##### id

```ts
id: string;
```

Defined in: [src/model/types.ts:53](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L53)

##### mediaType

```ts
mediaType: string;
```

Defined in: [src/model/types.ts:54](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L54)

***

### SmartHealthCheckinAcceptedMediaType

```ts
type SmartHealthCheckinAcceptedMediaType = 
  | "application/smart-health-card"
  | "application/fhir+json"
  | string & {
};
```

Defined in: [src/model/types.ts:8](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L8)

model — transport-neutral SMART Health Check-in request/response types and
validators (spec §§5–6), checked against the spec's conformance cases.

***

### UnsupportedItem

```ts
type UnsupportedItem = {
  id: string;
} & ValidationIssue;
```

Defined in: [src/model/validate.ts:28](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L28)

A request item this library's validation says a Wallet can't process.

#### Type Declaration

##### id

```ts
id: string;
```

***

### ValidationIssue

```ts
type ValidationIssue = {
  message: string;
  rule: string;
};
```

Defined in: [src/model/validate.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L25)

One problem found, with the spec requirement it comes from.

#### Properties

##### message

```ts
message: string;
```

Defined in: [src/model/validate.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L25)

##### rule

```ts
rule: string;
```

Defined in: [src/model/validate.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L25)

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

Defined in: [src/model/types.ts:77](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L77)

model — transport-neutral SMART Health Check-in request/response types and
validators (spec §§5–6), checked against the spec's conformance cases.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Variables

### STATUS\_CODES

```ts
const STATUS_CODES: readonly ["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"];
```

Defined in: [src/model/validate.ts:67](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L67)

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

### parseSmartCheckinRequest()

```ts
function parseSmartCheckinRequest(text): RequestValidation;
```

Defined in: [src/model/validate.ts:73](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L73)

Parse and validate SMART request JSON text, rejecting duplicate member names ([JSON-2]).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

#### Returns

[`RequestValidation`](#requestvalidation)

***

### parseSmartCheckinResponse()

```ts
function parseSmartCheckinResponse(text, request?): ResponseValidation;
```

Defined in: [src/model/validate.ts:149](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L149)

Parse and validate SMART response JSON text, rejecting duplicate member names ([JSON-2]).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |
| `request?` | `unknown` |

#### Returns

[`ResponseValidation`](#responsevalidation)

***

### validateResponseAgainstRequest()

```ts
function validateResponseAgainstRequest(request, response): ResponseValidation;
```

Defined in: [src/model/validate.ts:169](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L169)

Check a response against the request it answers ([XV-1]..[XV-12]). Fails
only when the request is invalid or on [XV-1] and [XV-2].

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | `unknown` |
| `response` | `unknown` |

#### Returns

[`ResponseValidation`](#responsevalidation)

***

### validateSmartCheckinRequest()

```ts
function validateSmartCheckinRequest(v): RequestValidation;
```

Defined in: [src/model/validate.ts:78](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L78)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `v` | `unknown` |

#### Returns

[`RequestValidation`](#requestvalidation)

***

### validateSmartCheckinResponse()

```ts
function validateSmartCheckinResponse(v): ResponseValidation;
```

Defined in: [src/model/validate.ts:156](https://github.com/smart-health-checkin/client/blob/main/src/model/validate.ts#L156)

Validate a response on its own: the checks that don't need the request.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `v` | `unknown` |

#### Returns

[`ResponseValidation`](#responsevalidation)

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
