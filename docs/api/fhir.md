[@smart-health-checkin/client API](index.md) / fhir

# fhir

## Type Aliases

### CheckinBundle

```ts
type CheckinBundle = {
  bundle: Record<string, unknown>;
  entries: CheckinBundleEntry[];
};
```

Defined in: [src/fhir/index.ts:43](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L43)

#### Properties

##### bundle

```ts
bundle: Record<string, unknown>;
```

Defined in: [src/fhir/index.ts:46](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L46)

The transaction Bundle equivalent of the plan.

##### entries

```ts
entries: CheckinBundleEntry[];
```

Defined in: [src/fhir/index.ts:44](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L44)

***

### CheckinBundleContext

```ts
type CheckinBundleContext = {
  appointment?: string;
  patient?: string;
};
```

Defined in: [src/fhir/index.ts:31](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L31)

#### Properties

##### appointment?

```ts
optional appointment?: string;
```

Defined in: [src/fhir/index.ts:33](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L33)

##### patient?

```ts
optional patient?: string;
```

Defined in: [src/fhir/index.ts:32](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L32)

***

### CheckinBundleEntry

```ts
type CheckinBundleEntry = {
  artifactId?: string;
  fullUrl: string;
  resource: Record<string, unknown>;
};
```

Defined in: [src/fhir/index.ts:36](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L36)

#### Properties

##### artifactId?

```ts
optional artifactId?: string;
```

Defined in: [src/fhir/index.ts:40](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L40)

Artifact id this entry came from; the Provenance entry has none.

##### fullUrl

```ts
fullUrl: string;
```

Defined in: [src/fhir/index.ts:37](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L37)

##### resource

```ts
resource: Record<string, unknown>;
```

Defined in: [src/fhir/index.ts:38](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L38)

***

### PostMode

```ts
type PostMode = "transaction" | "individual";
```

Defined in: [src/fhir/index.ts:26](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L26)

***

### PostResult

```ts
type PostResult = {
  bundle: unknown;
  mode: PostMode;
  result: unknown;
};
```

Defined in: [src/fhir/index.ts:204](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L204)

#### Properties

##### bundle

```ts
bundle: unknown;
```

Defined in: [src/fhir/index.ts:206](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L206)

##### mode

```ts
mode: PostMode;
```

Defined in: [src/fhir/index.ts:205](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L205)

##### result

```ts
result: unknown;
```

Defined in: [src/fhir/index.ts:207](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L207)

## Variables

### CHECKIN\_APPOINTMENT\_SYSTEM

```ts
const CHECKIN_APPOINTMENT_SYSTEM: "https://smart-health-checkin.github.io/appointment-context" = "https://smart-health-checkin.github.io/appointment-context";
```

Defined in: [src/fhir/index.ts:51](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L51)

***

### CHECKIN\_REQUEST\_ID\_SYSTEM

```ts
const CHECKIN_REQUEST_ID_SYSTEM: "https://smart-health-checkin.github.io/checkin-request-id" = "https://smart-health-checkin.github.io/checkin-request-id";
```

Defined in: [src/fhir/index.ts:49](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L49)

## Functions

### buildCheckinBundle()

```ts
function buildCheckinBundle(input): CheckinBundle;
```

Defined in: [src/fhir/index.ts:58](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L58)

Map a check-in response to a FHIR transaction Bundle. Pure — no network.
Inspect or edit the result before sending it anywhere.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `context?`: [`CheckinBundleContext`](#checkinbundlecontext); `now?`: () => `Date`; `provenance?`: `boolean`; `request`: [`SmartCheckinRequest`](checkin.md#smartcheckinrequest); `response`: [`SmartCheckinResponse`](checkin.md#smartcheckinresponse); \} |
| `input.context?` | [`CheckinBundleContext`](#checkinbundlecontext) |
| `input.now?` | () => `Date` |
| `input.provenance?` | `boolean` |
| `input.request` | [`SmartCheckinRequest`](checkin.md#smartcheckinrequest) |
| `input.response` | [`SmartCheckinResponse`](checkin.md#smartcheckinresponse) |

#### Returns

[`CheckinBundle`](#checkinbundle)

***

### postCheckinBundle()

```ts
function postCheckinBundle(plan, options): Promise<PostResult>;
```

Defined in: [src/fhir/index.ts:215](https://github.com/smart-health-checkin/client/blob/6b1a732d88832c43b68aa3c7b5813da746507653/src/fhir/index.ts#L215)

Post a bundle to a FHIR server. A convenience for demos and simple apps —
production deployments usually have their own client and auth, in which
case use `buildCheckinBundle` alone and send it yourself.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `plan` | [`CheckinBundle`](#checkinbundle) |
| `options` | \{ `fetchImpl?`: [`FetchLike`](checkin.md#fetchlike); `fhirBase`: `string`; `mode?`: [`PostMode`](#postmode); \} |
| `options.fetchImpl?` | [`FetchLike`](checkin.md#fetchlike) |
| `options.fhirBase` | `string` |
| `options.mode?` | [`PostMode`](#postmode) |

#### Returns

`Promise`\<[`PostResult`](#postresult)\>

## References

### FetchLike

Re-exports [FetchLike](checkin.md#fetchlike)
