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

Defined in: [src/fhir/index.ts:51](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L51)

What `buildCheckinBundle` returns: the resources to write, and the same as a transaction Bundle.

#### Properties

##### bundle

```ts
bundle: Record<string, unknown>;
```

Defined in: [src/fhir/index.ts:55](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L55)

The transaction Bundle equivalent of the plan.

##### entries

```ts
entries: CheckinBundleEntry[];
```

Defined in: [src/fhir/index.ts:53](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L53)

Each resource to write, with the artifact it came from.

***

### CheckinBundleContext

```ts
type CheckinBundleContext = {
  appointment?: string;
  patient?: string;
};
```

Defined in: [src/fhir/index.ts:33](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L33)

The chart context to record on the Provenance. Nothing is matched: what you pass is what's written.

#### Properties

##### appointment?

```ts
optional appointment?: string;
```

Defined in: [src/fhir/index.ts:37](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L37)

An Appointment reference, such as "Appointment/456".

##### patient?

```ts
optional patient?: string;
```

Defined in: [src/fhir/index.ts:35](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L35)

A Patient reference, such as "Patient/123".

***

### CheckinBundleEntry

```ts
type CheckinBundleEntry = {
  artifactId?: string;
  fullUrl: string;
  resource: Record<string, unknown>;
};
```

Defined in: [src/fhir/index.ts:41](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L41)

One resource to write.

#### Properties

##### artifactId?

```ts
optional artifactId?: string;
```

Defined in: [src/fhir/index.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L47)

Artifact id this entry came from; the Provenance entry has none.

##### fullUrl

```ts
fullUrl: string;
```

Defined in: [src/fhir/index.ts:43](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L43)

The entry's `urn:uuid:` fullUrl.

##### resource

```ts
resource: Record<string, unknown>;
```

Defined in: [src/fhir/index.ts:45](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L45)

The resource to create.

***

### FetchLike

```ts
type FetchLike = (input, init?) => Promise<Response>;
```

Defined in: [src/fetch-like.ts:9](https://github.com/smart-health-checkin/client/blob/main/src/fetch-like.ts#L9)

The minimal fetch signature the library accepts, so callers can inject their
own client — auth headers, retries, tracing — without the library
depending on any particular one.

Lives on its own because both the check-in path and the optional FHIR
helper need it, and the check-in path must never import the FHIR module.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` \| `URL` \| `Request` |
| `init?` | `RequestInit` |

#### Returns

`Promise`\<`Response`\>

***

### PostMode

```ts
type PostMode = "transaction" | "individual";
```

Defined in: [src/fhir/index.ts:27](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L27)

"transaction": one transaction Bundle. "individual": one POST per resource, then the Provenance, for servers that handle transactions poorly.

***

### PostResult

```ts
type PostResult = {
  bundle: unknown;
  mode: PostMode;
  result: unknown;
};
```

Defined in: [src/fhir/index.ts:214](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L214)

What `postCheckinBundle` sent and what the server said.

#### Properties

##### bundle

```ts
bundle: unknown;
```

Defined in: [src/fhir/index.ts:218](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L218)

The plan's transaction Bundle.

##### mode

```ts
mode: PostMode;
```

Defined in: [src/fhir/index.ts:216](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L216)

How it was sent.

##### result

```ts
result: unknown;
```

Defined in: [src/fhir/index.ts:220](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L220)

What the server returned: the transaction response, or in "individual" mode one response body per POST.

## Variables

### CHECKIN\_APPOINTMENT\_SYSTEM

```ts
const CHECKIN_APPOINTMENT_SYSTEM: "https://smart-health-checkin.github.io/appointment-context" = "https://smart-health-checkin.github.io/appointment-context";
```

Defined in: [src/fhir/index.ts:60](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L60)

***

### CHECKIN\_REQUEST\_ID\_SYSTEM

```ts
const CHECKIN_REQUEST_ID_SYSTEM: "https://smart-health-checkin.github.io/checkin-request-id" = "https://smart-health-checkin.github.io/checkin-request-id";
```

Defined in: [src/fhir/index.ts:58](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L58)

## Functions

### buildCheckinBundle()

```ts
function buildCheckinBundle(input): CheckinBundle;
```

Defined in: [src/fhir/index.ts:67](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L67)

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

Defined in: [src/fhir/index.ts:228](https://github.com/smart-health-checkin/client/blob/main/src/fhir/index.ts#L228)

Post a bundle to a FHIR server. A convenience for demos and simple apps —
production deployments usually have their own client and auth, in which
case use `buildCheckinBundle` alone and send it yourself.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `plan` | [`CheckinBundle`](#checkinbundle) | - |
| `options` | \{ `fetchImpl?`: [`FetchLike`](#fetchlike); `fhirBase`: `string`; `mode?`: [`PostMode`](#postmode); \} | - |
| `options.fetchImpl?` | [`FetchLike`](#fetchlike) | Your own `fetch`, with your credentials, retries, and tracing. |
| `options.fhirBase` | `string` | The FHIR server's base URL. |
| `options.mode?` | [`PostMode`](#postmode) | "transaction" (default) or "individual". |

#### Returns

`Promise`\<[`PostResult`](#postresult)\>
