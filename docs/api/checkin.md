[@smart-health-checkin/client API](index.md) / index

# @smart-health-checkin/client

## Classes

### CheckinError

Defined in: [src/core/errors.ts:23](https://github.com/smart-health-checkin/client/blob/main/src/core/errors.ts#L23)

An error with a code. Wallet transports throw it (a custom wallet can too),
and `runCheckin` reports its code in a failed result.

#### Extends

- `Error`

#### Constructors

##### Constructor

```ts
new CheckinError(
   code, 
   message, 
   options?): CheckinError;
```

Defined in: [src/core/errors.ts:27](https://github.com/smart-health-checkin/client/blob/main/src/core/errors.ts#L27)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `code` | [`CheckinErrorCode`](#checkinerrorcode-1) |
| `message` | `string` |
| `options` | \{ `check?`: `string`; \} |
| `options.check?` | `string` |

###### Returns

[`CheckinError`](#checkinerror)

###### Overrides

```ts
Error.constructor
```

#### Properties

##### check?

```ts
readonly optional check?: string;
```

Defined in: [src/core/errors.ts:26](https://github.com/smart-health-checkin/client/blob/main/src/core/errors.ts#L26)

For `invalid-response`: which check failed, when known.

##### code

```ts
readonly code: CheckinErrorCode;
```

Defined in: [src/core/errors.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/core/errors.ts#L24)

***

### CheckinResponse

Defined in: [src/core/response.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L48)

A validated response, with lookups by the item ids in your request. A
completed `runCheckin` result carries one as `response`.

#### Constructors

##### Constructor

```ts
new CheckinResponse(
   validation, 
   request, 
   cards?): CheckinResponse;
```

Defined in: [src/core/response.ts:60](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L60)

From a successful `validateResponseAgainstRequest`; `runCheckin` builds it for you.

###### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `validation` | \{ `artifacts`: [`ArtifactCheck`](model.md#artifactcheck)[]; `items`: [`ItemOutcome`](model.md#itemoutcome)[]; `ok`: `true`; `usableArtifacts`: [`SmartArtifact`](#smartartifact)[]; `value`: [`SmartCheckinResponse`](#smartcheckinresponse); \} | `undefined` | - |
| `validation.artifacts` | [`ArtifactCheck`](model.md#artifactcheck)[] | `undefined` | - |
| `validation.items` | [`ItemOutcome`](model.md#itemoutcome)[] | `undefined` | One entry per status row's item id (without a request) or per request item (with one). |
| `validation.ok` | `true` | `undefined` | - |
| `validation.usableArtifacts` | [`SmartArtifact`](#smartartifact)[] | `undefined` | The Artifacts that passed every check, in response order. |
| `validation.value` | [`SmartCheckinResponse`](#smartcheckinresponse) | `undefined` | The response exactly as received. |
| `request` | [`SmartCheckinRequest`](#smartcheckinrequest) | `undefined` | - |
| `cards` | readonly [`HealthCard`](#healthcard)[] | `[]` | - |

###### Returns

[`CheckinResponse`](#checkinresponse)

#### Properties

##### json

```ts
readonly json: SmartCheckinResponse;
```

Defined in: [src/core/response.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L50)

The response as received.

##### request

```ts
readonly request: SmartCheckinRequest;
```

Defined in: [src/core/response.ts:52](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L52)

The request it answers.

#### Methods

##### artifacts()

```ts
artifacts(itemId): SmartArtifact[];
```

Defined in: [src/core/response.ts:94](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L94)

The usable artifacts that fulfill the item. An artifact fulfilling several items is returned for each.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `itemId` | `string` |

###### Returns

[`SmartArtifact`](#smartartifact)[]

##### disregarded()

```ts
disregarded(): {
  artifact: unknown;
  id?: string;
  index: number;
  problems: ValidationIssue[];
}[];
```

Defined in: [src/core/response.ts:99](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L99)

Artifacts set aside because they failed a check ([XV-4]), with the reasons.

###### Returns

\{
  `artifact`: `unknown`;
  `id?`: `string`;
  `index`: `number`;
  `problems`: [`ValidationIssue`](model.md#validationissue)[];
\}[]

##### entries()

```ts
entries(itemId): ResourceEntry[];
```

Defined in: [src/core/response.ts:111](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L111)

The item's resources with where each came from. Lists every health card's resources, accepted or not.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `itemId` | `string` |

###### Returns

[`ResourceEntry`](#resourceentry)[]

##### form()

```ts
form(itemId): FhirResource | undefined;
```

Defined in: [src/core/response.ts:149](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L149)

The QuestionnaireResponse for a form item.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `itemId` | `string` |

###### Returns

[`FhirResource`](#fhirresource) \| `undefined`

##### healthCards()

```ts
healthCards(itemId): HealthCard[];
```

Defined in: [src/core/response.ts:106](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L106)

Every SMART Health Card for the item, with its trust result, accepted or not.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `itemId` | `string` |

###### Returns

[`HealthCard`](#healthcard)[]

##### items()

```ts
items(): {
  artifacts: SmartArtifact[];
  id: string;
  message?: string;
  problems: ValidationIssue[];
  status?:   | "fulfilled"
     | "partial"
     | "unavailable"
     | "declined"
     | "unsupported"
     | "error";
  title: string;
}[];
```

Defined in: [src/core/response.ts:79](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L79)

Every requested item with its status, usable artifacts, and any problems, in request order.

###### Returns

\{
  `artifacts`: [`SmartArtifact`](#smartartifact)[];
  `id`: `string`;
  `message?`: `string`;
  `problems`: [`ValidationIssue`](model.md#validationissue)[];
  `status?`:   \| `"fulfilled"`
     \| `"partial"`
     \| `"unavailable"`
     \| `"declined"`
     \| `"unsupported"`
     \| `"error"`;
  `title`: `string`;
\}[]

##### resolve()

```ts
resolve(entry, reference): FhirResource | undefined;
```

Defined in: [src/core/response.ts:157](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L157)

Follow a reference from an entry within its own Bundle or card:
`urn:uuid:…` and other fullUrls, `resource:N` in a card, or `Type/id`.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`ResourceEntry`](#resourceentry) |
| `reference` | `string` |

###### Returns

[`FhirResource`](#fhirresource) \| `undefined`

##### resources()

```ts
resources(itemId, options?): FhirResource[];
```

Defined in: [src/core/response.ts:141](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L141)

FHIR resources for the item, from Bundles and from health cards the
trust configuration accepts, optionally only one resource type.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `itemId` | `string` |
| `options` | \{ `type?`: `string`; \} |
| `options.type?` | `string` |

###### Returns

[`FhirResource`](#fhirresource)[]

##### status()

```ts
status(itemId): 
  | "fulfilled"
  | "partial"
  | "unavailable"
  | "declined"
  | "unsupported"
  | "error"
  | undefined;
```

Defined in: [src/core/response.ts:74](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L74)

The item's status: "fulfilled", "partial", "declined", "unavailable",
"unsupported", or "error"; undefined when the response has no valid
status for it ([XV-3]).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `itemId` | `string` |

###### Returns

  \| `"fulfilled"`
  \| `"partial"`
  \| `"unavailable"`
  \| `"declined"`
  \| `"unsupported"`
  \| `"error"`
  \| `undefined`

##### toJSON()

```ts
toJSON(): SmartCheckinResponse;
```

Defined in: [src/core/response.ts:166](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L166)

The same plain JSON as `json`, so `JSON.stringify(response)` gives the response as received.

###### Returns

[`SmartCheckinResponse`](#smartcheckinresponse)

***

### WalletDeclinedError

Defined in: [src/core/errors.ts:39](https://github.com/smart-health-checkin/client/blob/main/src/core/errors.ts#L39)

Thrown by a wallet transport when the patient closes the wallet or says no.
`runCheckin` turns it into a `declined` result, not a failure.

#### Extends

- `Error`

#### Constructors

##### Constructor

```ts
new WalletDeclinedError(message?): WalletDeclinedError;
```

Defined in: [src/core/errors.ts:40](https://github.com/smart-health-checkin/client/blob/main/src/core/errors.ts#L40)

###### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `message` | `string` | `"the patient declined in the wallet"` |

###### Returns

[`WalletDeclinedError`](#walletdeclinederror)

###### Overrides

```ts
Error.constructor
```

## Type Aliases

### CheckinErrorCode

```ts
type CheckinErrorCode = 
  | "unsupported"
  | "blocked"
  | "timeout"
  | "wallet-error"
  | "invalid-response"
  | "server";
```

Defined in: [src/core/errors.ts:5](https://github.com/smart-health-checkin/client/blob/main/src/core/errors.ts#L5)

How a check-in can fail. Every failure carries one of these codes, so pages
branch on the code instead of matching message text.

***

### CheckinOptions

```ts
type CheckinOptions = {
  fetch?: typeof fetch;
  healthCards?: HealthCardTrust;
  keys?:   | "browser"
     | {
     server: string;
   }
     | KeyCustody;
  session?: WalletSession;
  signal?: AbortSignal;
  wallet?: Wallet;
};
```

Defined in: [src/core/run.ts:32](https://github.com/smart-health-checkin/client/blob/main/src/core/run.ts#L32)

`@smart-health-checkin/client`: add SMART Health Check-in to an EHR page.

  const result = await runCheckin(request);                     // the phone's own wallet
  const options = await wallets({ registry: "/wallets.json" }); // or let the patient choose
  button.onclick = () => options[1].start(request).then(show);

  if (result.status === "completed") result.response.resources("allergies");

Other entry points: `/ui` (the picker element), `/react`, `/picker`,
`/wallet` (building a wallet), `/handoff` (kiosks), `/fhir`, `/testing`,
`/model`, `/wire`.

#### Properties

##### fetch?

```ts
optional fetch?: typeof fetch;
```

Defined in: [src/core/run.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/core/run.ts#L44)

Used to fetch health-card issuer keys and directories.

##### healthCards?

```ts
optional healthCards?: HealthCardTrust;
```

Defined in: [src/core/run.ts:40](https://github.com/smart-health-checkin/client/blob/main/src/core/run.ts#L40)

Trust for SMART Health Cards in the response; defaults to `configureHealthCardTrust`.

##### keys?

```ts
optional keys?: 
  | "browser"
  | {
  server: string;
}
  | KeyCustody;
```

Defined in: [src/core/run.ts:38](https://github.com/smart-health-checkin/client/blob/main/src/core/run.ts#L38)

Where the key that opens the response lives: "browser" (default, a fresh key in the page), `{ server }` for server-held keys, or your own `KeyCustody`.

##### session?

```ts
optional session?: WalletSession;
```

Defined in: [src/core/run.ts:36](https://github.com/smart-health-checkin/client/blob/main/src/core/run.ts#L36)

A session already opened with `wallet.open()`, for example by the picker in pick mode.

##### signal?

```ts
optional signal?: AbortSignal;
```

Defined in: [src/core/run.ts:42](https://github.com/smart-health-checkin/client/blob/main/src/core/run.ts#L42)

Abort to stop waiting (closes a web wallet's tab); the check-in ends as declined.

##### wallet?

```ts
optional wallet?: Wallet;
```

Defined in: [src/core/run.ts:34](https://github.com/smart-health-checkin/client/blob/main/src/core/run.ts#L34)

Which wallet to ask. Defaults to the phone's own wallet.

***

### CheckinRequestInit

```ts
type CheckinRequestInit = {
  fhirVersions?: ReadonlyArray<string>;
  id?: string;
  items: ReadonlyArray<SmartCheckinRequestItem>;
  purpose?: string;
};
```

Defined in: [src/core/request.ts:4](https://github.com/smart-health-checkin/client/blob/main/src/core/request.ts#L4)

Everything a request needs except what the library fills in.

#### Properties

##### fhirVersions?

```ts
optional fhirVersions?: ReadonlyArray<string>;
```

Defined in: [src/core/request.ts:10](https://github.com/smart-health-checkin/client/blob/main/src/core/request.ts#L10)

Defaults to ["4.0.1"].

##### id?

```ts
optional id?: string;
```

Defined in: [src/core/request.ts:6](https://github.com/smart-health-checkin/client/blob/main/src/core/request.ts#L6)

Defaults to a random UUID.

##### items

```ts
items: ReadonlyArray<SmartCheckinRequestItem>;
```

Defined in: [src/core/request.ts:11](https://github.com/smart-health-checkin/client/blob/main/src/core/request.ts#L11)

##### purpose?

```ts
optional purpose?: string;
```

Defined in: [src/core/request.ts:8](https://github.com/smart-health-checkin/client/blob/main/src/core/request.ts#L8)

Shown to the patient by some wallets.

***

### CheckinRequestInput

```ts
type CheckinRequestInput = 
  | SmartCheckinRequest
  | CheckinRequestInit;
```

Defined in: [src/core/request.ts:15](https://github.com/smart-health-checkin/client/blob/main/src/core/request.ts#L15)

What `runCheckin` accepts: a complete request, or the parts to build one from.

***

### CheckinResult

```ts
type CheckinResult = 
  | {
  request: SmartCheckinRequest;
  response: CheckinResponse;
  status: "completed";
  wallet: Wallet;
  warnings: CheckinWarning[];
}
  | {
  request: SmartCheckinRequest;
  serverReference?: string;
  status: "kept-on-server";
  wallet: Wallet;
}
  | {
  request: SmartCheckinRequest;
  status: "declined";
  wallet: Wallet;
}
  | {
  error: {
     check?: string;
     code: CheckinErrorCode;
     message: string;
  };
  request: SmartCheckinRequest;
  status: "failed";
  wallet: Wallet;
};
```

Defined in: [src/core/run.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/core/run.ts#L47)

`@smart-health-checkin/client`: add SMART Health Check-in to an EHR page.

  const result = await runCheckin(request);                     // the phone's own wallet
  const options = await wallets({ registry: "/wallets.json" }); // or let the patient choose
  button.onclick = () => options[1].start(request).then(show);

  if (result.status === "completed") result.response.resources("allergies");

Other entry points: `/ui` (the picker element), `/react`, `/picker`,
`/wallet` (building a wallet), `/handoff` (kiosks), `/fhir`, `/testing`,
`/model`, `/wire`.

#### Union Members

##### Type Literal

```ts
{
  request: SmartCheckinRequest;
  response: CheckinResponse;
  status: "completed";
  wallet: Wallet;
  warnings: CheckinWarning[];
}
```

###### request

```ts
request: SmartCheckinRequest;
```

###### response

```ts
response: CheckinResponse;
```

The validated response.

###### status

```ts
status: "completed";
```

###### wallet

```ts
wallet: Wallet;
```

###### warnings

```ts
warnings: CheckinWarning[];
```

Transport and signature problems that didn't stop the check-in: a
receiver continues past them and reports them (spec §2, [RCV-1]).
Empty when everything checked out.

***

##### Type Literal

```ts
{
  request: SmartCheckinRequest;
  serverReference?: string;
  status: "kept-on-server";
  wallet: Wallet;
}
```

###### request

```ts
request: SmartCheckinRequest;
```

###### serverReference?

```ts
optional serverReference?: string;
```

The server's handle for what it stored (an encounter id, a queue entry), if it returned one.

###### status

```ts
status: "kept-on-server";
```

Server key custody kept the data; the page gets only a handle.

###### wallet

```ts
wallet: Wallet;
```

***

##### Type Literal

```ts
{
  request: SmartCheckinRequest;
  status: "declined";
  wallet: Wallet;
}
```

***

##### Type Literal

```ts
{
  error: {
     check?: string;
     code: CheckinErrorCode;
     message: string;
  };
  request: SmartCheckinRequest;
  status: "failed";
  wallet: Wallet;
}
```

***

### CredentialCompletion

```ts
type CredentialCompletion = 
  | {
  handledByServer?: false;
  presentation: PresentationContext;
  smartResponse: SmartCheckinResponse;
  warnings?: CheckinWarning[];
}
  | {
  handledByServer: true;
  presentation?: PresentationContext;
  reference?: string;
};
```

Defined in: [src/browser/index.ts:72](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L72)

The result of opening a wallet response. Two shapes, because there are two
reasons to hold keys on a server:

- `smartResponse` — the server opened and verified it and hands the data
  back, so the page can still prefill forms. Key custody and an audit
  point, without giving up the in-page workflow.
- `handledByServer` — the server keeps the data; the page learns only that
  it succeeded. For deployments where the page must not hold PHI. In-page
  prefill is not possible in this mode, by construction.

#### Union Members

##### Type Literal

```ts
{
  handledByServer?: false;
  presentation: PresentationContext;
  smartResponse: SmartCheckinResponse;
  warnings?: CheckinWarning[];
}
```

###### handledByServer?

```ts
optional handledByServer?: false;
```

###### presentation

```ts
presentation: PresentationContext;
```

###### smartResponse

```ts
smartResponse: SmartCheckinResponse;
```

Opened and wire-checked; the caller still cross-checks it against the request.

###### warnings?

```ts
optional warnings?: CheckinWarning[];
```

Transport and signature findings that didn't stop the check-in (spec §2, [RCV-1]).

***

##### Type Literal

```ts
{
  handledByServer: true;
  presentation?: PresentationContext;
  reference?: string;
}
```

###### handledByServer

```ts
handledByServer: true;
```

###### presentation?

```ts
optional presentation?: PresentationContext;
```

###### reference?

```ts
optional reference?: string;
```

Optional server-side handle for what it stored (an encounter id, a queue entry).

***

### DcApiSupport

```ts
type DcApiSupport = 
  | {
  state: "supported";
}
  | {
  reason: string;
  state: "unsupported";
};
```

Defined in: [src/browser/index.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L22)

Whether this browser has the Digital Credentials API; when not, `reason` says why.

***

### FhirResource

```ts
type FhirResource = {
[key: string]: unknown;
  resourceType: string;
};
```

Defined in: [src/core/response.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L25)

#### Indexable

```ts
[key: string]: unknown
```

#### Properties

##### resourceType

```ts
resourceType: string;
```

Defined in: [src/core/response.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L25)

***

### HealthCard

```ts
type HealthCard = {
  accepted: boolean;
  bundle?: {
     entry?: {
        fullUrl?: string;
        resource?: Record<string, unknown>;
     }[];
     resourceType: "Bundle";
  };
  fulfills: ReadonlyArray<string>;
  issuer?: string;
  jws: string;
  reason?: string;
  trusted: boolean;
  valid: boolean;
};
```

Defined in: [src/core/health-cards.ts:36](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L36)

A SMART Health Card from a response, with the result of checking it.

#### Properties

##### accepted

```ts
accepted: boolean;
```

Defined in: [src/core/health-cards.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L50)

Included by `resources()` under the configured `accept`.

##### bundle?

```ts
optional bundle?: {
  entry?: {
     fullUrl?: string;
     resource?: Record<string, unknown>;
  }[];
  resourceType: "Bundle";
};
```

Defined in: [src/core/health-cards.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L44)

The card's FHIR Bundle (`vc.credentialSubject.fhirBundle`), when it could be decoded.

###### entry?

```ts
optional entry?: {
  fullUrl?: string;
  resource?: Record<string, unknown>;
}[];
```

###### resourceType

```ts
resourceType: "Bundle";
```

##### fulfills

```ts
fulfills: ReadonlyArray<string>;
```

Defined in: [src/core/health-cards.ts:38](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L38)

The item ids the card's artifact fulfills.

##### issuer?

```ts
optional issuer?: string;
```

Defined in: [src/core/health-cards.ts:42](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L42)

The issuer URL from the payload, when it could be decoded.

##### jws

```ts
jws: string;
```

Defined in: [src/core/health-cards.ts:40](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L40)

The compact JWS as received.

##### reason?

```ts
optional reason?: string;
```

Defined in: [src/core/health-cards.ts:52](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L52)

Why it isn't valid or trusted, when it isn't.

##### trusted

```ts
trusted: boolean;
```

Defined in: [src/core/health-cards.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L48)

The issuer is trusted by the configuration.

##### valid

```ts
valid: boolean;
```

Defined in: [src/core/health-cards.ts:46](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L46)

The signature verified against the issuer's key.

***

### HealthCardTrust

```ts
type HealthCardTrust = {
  accept?: "trusted" | "any-valid" | "everything";
  directory?: "vci" | string;
  issuers?: ReadonlyArray<string>;
  keys?: Readonly<Record<string, {
     keys: ReadonlyArray<JsonWebKey & {
        kid?: string;
     }>;
  }>>;
};
```

Defined in: [src/core/health-cards.ts:19](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L19)

Which SMART Health Card issuers to trust, and which cards `resources()` includes.

#### Properties

##### accept?

```ts
optional accept?: "trusted" | "any-valid" | "everything";
```

Defined in: [src/core/health-cards.ts:32](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L32)

Which cards `resources()` includes: "trusted" (default) only cards from a
trusted issuer with a valid signature; "any-valid" any card whose
signature verifies against its own issuer's published keys; "everything"
invalid cards too. Every card is always listed by `healthCards()`.

##### directory?

```ts
optional directory?: "vci" | string;
```

Defined in: [src/core/health-cards.ts:21](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L21)

An issuer directory: "vci", or the URL of a file shaped like the VCI directory.

##### issuers?

```ts
optional issuers?: ReadonlyArray<string>;
```

Defined in: [src/core/health-cards.ts:23](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L23)

Issuer URLs to trust, in addition to any directory.

##### keys?

```ts
optional keys?: Readonly<Record<string, {
  keys: ReadonlyArray<JsonWebKey & {
     kid?: string;
  }>;
}>>;
```

Defined in: [src/core/health-cards.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L25)

Keys to trust without fetching, by issuer URL.

***

### ItemStatus

```ts
type ItemStatus = SmartCheckinItemStatus["status"];
```

Defined in: [src/core/response.ts:28](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L28)

An item's status in a response: fulfilled, partial, unavailable, declined, unsupported, or error.

***

### KeyCustody

```ts
type KeyCustody = {
  kind: string;
  completeCredentialRequest: Promise<CredentialCompletion>;
  prepareCredentialRequest: Promise<PreparedCredentialRequest>;
};
```

Defined in: [src/browser/index.ts:99](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L99)

The key-custody seam.

browser-local — the default — generates an ephemeral, single-use HPKE key
in the page. That is the intended arrangement: the page must be able to
read the response for prefill workflows, and keeping the client
browser-only means no per-language server SDK has to exist.

A server-owned implementation keeps the key behind two HTTP calls for
deployments that specifically don't want the page to hold the response.

#### Properties

##### kind

```ts
kind: string;
```

Defined in: [src/browser/index.ts:100](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L100)

#### Methods

##### completeCredentialRequest()

```ts
completeCredentialRequest(input): Promise<CredentialCompletion>;
```

Defined in: [src/browser/index.ts:102](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L102)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `credential`: `unknown`; `handle`: `string`; \} |
| `input.credential` | `unknown` |
| `input.handle` | `string` |

###### Returns

`Promise`\<[`CredentialCompletion`](#credentialcompletion)\>

##### prepareCredentialRequest()

```ts
prepareCredentialRequest(input): Promise<PreparedCredentialRequest>;
```

Defined in: [src/browser/index.ts:101](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L101)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `request`: [`SmartCheckinRequest`](#smartcheckinrequest); \} |
| `input.request` | [`SmartCheckinRequest`](#smartcheckinrequest) |

###### Returns

`Promise`\<[`PreparedCredentialRequest`](#preparedcredentialrequest)\>

***

### PreparedCredentialRequest

```ts
type PreparedCredentialRequest = {
  handle: string;
  navigatorArgument: OrgIsoMdocNavigatorArgument;
};
```

Defined in: [src/browser/index.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L48)

#### Properties

##### handle

```ts
handle: string;
```

Defined in: [src/browser/index.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L50)

Opaque handle for completing the request with the same key custody.

##### navigatorArgument

```ts
navigatorArgument: OrgIsoMdocNavigatorArgument;
```

Defined in: [src/browser/index.ts:52](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L52)

Pass to navigator.credentials.get(...).

***

### PresentationContext

```ts
type PresentationContext = {
  deviceResponseHex?: string;
  origin: string;
};
```

Defined in: [src/browser/index.ts:55](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L55)

#### Properties

##### deviceResponseHex?

```ts
optional deviceResponseHex?: string;
```

Defined in: [src/browser/index.ts:58](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L58)

DeviceResponse bytes, for audit or debugging.

##### origin

```ts
origin: string;
```

Defined in: [src/browser/index.ts:56](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L56)

***

### ResourceEntry

```ts
type ResourceEntry = {
  artifactId: string;
  card?: HealthCard;
  fullUrl?: string;
  resource: FhirResource;
  source: "bundle" | "health-card";
};
```

Defined in: [src/core/response.ts:31](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L31)

A resource from a response, with where it came from.

#### Properties

##### artifactId

```ts
artifactId: string;
```

Defined in: [src/core/response.ts:37](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L37)

The artifact this came from.

##### card?

```ts
optional card?: HealthCard;
```

Defined in: [src/core/response.ts:39](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L39)

For resources from a health card: the card, with its trust result.

##### fullUrl?

```ts
optional fullUrl?: string;
```

Defined in: [src/core/response.ts:41](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L41)

The resource's fullUrl in its Bundle, for resolving references.

##### resource

```ts
resource: FhirResource;
```

Defined in: [src/core/response.ts:33](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L33)

The FHIR resource.

##### source

```ts
source: "bundle" | "health-card";
```

Defined in: [src/core/response.ts:35](https://github.com/smart-health-checkin/client/blob/main/src/core/response.ts#L35)

Whether it came from a FHIR Bundle or resource, or from a SMART Health Card.

***

### SmartArtifact

```ts
type SmartArtifact = 
  | SmartArtifactBase & {
  mediaType: "application/smart-health-card";
  value: {
     verifiableCredential: ReadonlyArray<string>;
  };
}
  | SmartArtifactBase & {
  fhirVersion: FhirVersion;
  mediaType: "application/fhir+json";
  value: unknown;
};
```

Defined in: [src/model/types.ts:83](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L83)

***

### SmartCheckinContentSelector

```ts
type SmartCheckinContentSelector = 
  | {
  kind: "selection.fhir";
  profiles?: ReadonlyArray<FhirCanonical>;
  profilesFrom?: ReadonlyArray<FhirProfileCollectionRef>;
  resourceTypes?: ReadonlyArray<FhirResourceType>;
}
  | {
  kind: "form.fhir";
  questionnaire?: unknown;
  questionnaireCanonical?: FhirCanonical;
};
```

Defined in: [src/model/types.ts:19](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L19)

What data an item means: existing records (`selection.fhir`, spec §5.4.1)
or a form for the patient to fill in (`form.fhir`, spec §5.4.2).

#### Union Members

##### Type Literal

```ts
{
  kind: "selection.fhir";
  profiles?: ReadonlyArray<FhirCanonical>;
  profilesFrom?: ReadonlyArray<FhirProfileCollectionRef>;
  resourceTypes?: ReadonlyArray<FhirResourceType>;
}
```

###### kind

```ts
kind: "selection.fhir";
```

###### profiles?

```ts
optional profiles?: ReadonlyArray<FhirCanonical>;
```

Records with these exact profiles; `url|version` asks for that version only.

###### profilesFrom?

```ts
optional profilesFrom?: ReadonlyArray<FhirProfileCollectionRef>;
```

Records with any profile from these implementation guides.

###### resourceTypes?

```ts
optional resourceTypes?: ReadonlyArray<FhirResourceType>;
```

Records of these resource types; also narrows `profiles` and `profilesFrom`.

***

##### Type Literal

```ts
{
  kind: "form.fhir";
  questionnaire?: unknown;
  questionnaireCanonical?: FhirCanonical;
}
```

###### kind

```ts
kind: "form.fhir";
```

###### questionnaire?

```ts
optional questionnaire?: unknown;
```

The Questionnaire itself, inline, so the wallet needn't fetch it.

###### questionnaireCanonical?

```ts
optional questionnaireCanonical?: FhirCanonical;
```

The Questionnaire's canonical URL, `|version` included; the QuestionnaireResponse echoes it exactly.

***

### SmartCheckinItemStatus

```ts
type SmartCheckinItemStatus = {
  item: string;
  message?: string;
  status:   | "fulfilled"
     | "partial"
     | "unavailable"
     | "declined"
     | "unsupported"
     | "error";
};
```

Defined in: [src/model/types.ts:68](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L68)

What the wallet says happened to one item.

#### Properties

##### item

```ts
item: string;
```

Defined in: [src/model/types.ts:70](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L70)

The item's `id`.

##### message?

```ts
optional message?: string;
```

Defined in: [src/model/types.ts:74](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L74)

The wallet's explanation, if it gave one.

##### status

```ts
status: 
  | "fulfilled"
  | "partial"
  | "unavailable"
  | "declined"
  | "unsupported"
  | "error";
```

Defined in: [src/model/types.ts:72](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L72)

What happened to the item.

***

### SmartCheckinRequest

```ts
type SmartCheckinRequest = {
  fhirVersions?: ReadonlyArray<FhirVersion>;
  id: string;
  items: ReadonlyArray<SmartCheckinRequestItem>;
  purpose?: string;
  type: "smart-health-checkin-request";
  version: "1";
};
```

Defined in: [src/model/types.ts:54](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L54)

A complete check-in request (spec §5). `checkinRequest` builds one from `{ purpose, items }`.

#### Properties

##### fhirVersions?

```ts
optional fhirVersions?: ReadonlyArray<FhirVersion>;
```

Defined in: [src/model/types.ts:62](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L62)

The FHIR versions you can read.

##### id

```ts
id: string;
```

Defined in: [src/model/types.ts:58](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L58)

A unique id for this request; the response's `requestId` repeats it.

##### items

```ts
items: ReadonlyArray<SmartCheckinRequestItem>;
```

Defined in: [src/model/types.ts:64](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L64)

What you're asking for.

##### purpose?

```ts
optional purpose?: string;
```

Defined in: [src/model/types.ts:60](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L60)

One line the patient sees at the top.

##### type

```ts
type: "smart-health-checkin-request";
```

Defined in: [src/model/types.ts:55](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L55)

##### version

```ts
version: "1";
```

Defined in: [src/model/types.ts:56](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L56)

***

### SmartCheckinRequestItem

```ts
type SmartCheckinRequestItem = {
  accept: ReadonlyArray<SmartHealthCheckinAcceptedMediaType>;
  content: SmartCheckinContentSelector;
  id: string;
  required?: boolean;
  summary?: string;
  title: string;
};
```

Defined in: [src/model/types.ts:38](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L38)

One thing the request asks for.

#### Properties

##### accept

```ts
accept: ReadonlyArray<SmartHealthCheckinAcceptedMediaType>;
```

Defined in: [src/model/types.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L50)

The formats you can process, most preferred first.

##### content

```ts
content: SmartCheckinContentSelector;
```

Defined in: [src/model/types.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L48)

What data you mean: records or a form.

##### id

```ts
id: string;
```

Defined in: [src/model/types.ts:40](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L40)

Your name for the item; look the answer up by it, as in `response.resources(id)`.

##### required?

```ts
optional required?: boolean;
```

Defined in: [src/model/types.ts:46](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L46)

How much the item matters to you. Advice only: the patient can always decline.

##### summary?

```ts
optional summary?: string;
```

Defined in: [src/model/types.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L44)

One line on why you need it.

##### title

```ts
title: string;
```

Defined in: [src/model/types.ts:42](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L42)

What the patient sees, such as "Insurance card".

***

### SmartCheckinResponse

```ts
type SmartCheckinResponse = {
  artifacts: ReadonlyArray<SmartArtifact>;
  requestId: string;
  requestStatus: ReadonlyArray<SmartCheckinItemStatus>;
  type: "smart-health-checkin-response";
  version: "1";
};
```

Defined in: [src/model/types.ts:95](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L95)

A wallet's answer, as it arrives after decryption (spec §6). `CheckinResponse` wraps it with lookups.

#### Properties

##### artifacts

```ts
artifacts: ReadonlyArray<SmartArtifact>;
```

Defined in: [src/model/types.ts:101](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L101)

The data: FHIR resources and SMART Health Cards, each naming the items it fulfills.

##### requestId

```ts
requestId: string;
```

Defined in: [src/model/types.ts:99](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L99)

The `id` of the request this answers.

##### requestStatus

```ts
requestStatus: ReadonlyArray<SmartCheckinItemStatus>;
```

Defined in: [src/model/types.ts:103](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L103)

One status per item.

##### type

```ts
type: "smart-health-checkin-response";
```

Defined in: [src/model/types.ts:96](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L96)

##### version

```ts
version: "1";
```

Defined in: [src/model/types.ts:97](https://github.com/smart-health-checkin/client/blob/main/src/model/types.ts#L97)

***

### Wallet

```ts
type Wallet = {
  available: boolean;
  description?: string;
  entry?: WebWalletEntry;
  homepage?: string;
  iconUrl?: string;
  id: string;
  keys?: KeyCustody;
  kind: "platform" | "web" | "handoff" | "mock" | "custom";
  name: string;
  unavailableReason?: string;
  open: WalletSession;
  start: Promise<CheckinResult>;
};
```

Defined in: [src/core/wallets.ts:30](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L30)

#### Properties

##### available

```ts
available: boolean;
```

Defined in: [src/core/wallets.ts:39](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L39)

False when this browser can't use it; `unavailableReason` says why.

##### description?

```ts
optional description?: string;
```

Defined in: [src/core/wallets.ts:35](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L35)

##### entry?

```ts
optional entry?: WebWalletEntry;
```

Defined in: [src/core/wallets.ts:42](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L42)

The registry entry, for web wallets.

##### homepage?

```ts
optional homepage?: string;
```

Defined in: [src/core/wallets.ts:37](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L37)

##### iconUrl?

```ts
optional iconUrl?: string;
```

Defined in: [src/core/wallets.ts:36](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L36)

##### id

```ts
id: string;
```

Defined in: [src/core/wallets.ts:32](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L32)

"platform", a registry id, "handoff", "mock", or your own.

##### keys?

```ts
optional keys?: KeyCustody;
```

Defined in: [src/core/wallets.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L44)

Key custody this wallet needs (a kiosk hand-off binds to the hand-off page's origin). Used unless the caller passes `keys`.

##### kind

```ts
kind: "platform" | "web" | "handoff" | "mock" | "custom";
```

Defined in: [src/core/wallets.ts:33](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L33)

##### name

```ts
name: string;
```

Defined in: [src/core/wallets.ts:34](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L34)

##### unavailableReason?

```ts
optional unavailableReason?: string;
```

Defined in: [src/core/wallets.ts:40](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L40)

#### Methods

##### open()

```ts
open(): WalletSession;
```

Defined in: [src/core/wallets.ts:46](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L46)

Connect to the wallet. Synchronous; call inside the click.

###### Returns

[`WalletSession`](#walletsession)

##### start()

```ts
start(request, options?): Promise<CheckinResult>;
```

Defined in: [src/core/wallets.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L48)

Run a check-in with this wallet. Call inside the click.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`CheckinRequestInput`](#checkinrequestinput) |
| `options?` | `Omit`\<[`CheckinOptions`](#checkinoptions), `"wallet"` \| `"session"`\> |

###### Returns

`Promise`\<[`CheckinResult`](#checkinresult)\>

***

### WalletRegistry

```ts
type WalletRegistry = {
  source?: string;
  wallets: WebWalletEntry[];
};
```

Defined in: [src/model/registry.ts:31](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L31)

#### Properties

##### source?

```ts
optional source?: string;
```

Defined in: [src/model/registry.ts:33](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L33)

Free-form label for where this list came from.

##### wallets

```ts
wallets: WebWalletEntry[];
```

Defined in: [src/model/registry.ts:34](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L34)

***

### WalletSession

```ts
type WalletSession = {
  cancel: void;
  getCredential: Promise<unknown>;
};
```

Defined in: [src/core/wallets.ts:23](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L23)

A connection to a wallet, opened inside the click.

#### Methods

##### cancel()

```ts
cancel(): void;
```

Defined in: [src/core/wallets.ts:27](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L27)

Stop waiting: closes a web wallet's tab. The check-in then ends as declined.

###### Returns

`void`

##### getCredential()

```ts
getCredential(navigatorArgument): Promise<unknown>;
```

Defined in: [src/core/wallets.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L25)

Send the Digital Credentials API argument; resolves with the wallet's credential.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `navigatorArgument` | `unknown` |

###### Returns

`Promise`\<`unknown`\>

***

### WalletsOptions

```ts
type WalletsOptions = {
  extra?: ReadonlyArray<Wallet>;
  fetch?: typeof fetch;
  includeUnavailable?: boolean;
  platform?: boolean;
  registry?:   | string
     | WalletRegistry
     | WebWalletEntry[];
};
```

Defined in: [src/core/wallets.ts:120](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L120)

#### Properties

##### extra?

```ts
optional extra?: ReadonlyArray<Wallet>;
```

Defined in: [src/core/wallets.ts:126](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L126)

More wallets to offer after the registry's, such as `handoffWallet(...)` or `mockWallet()`.

##### fetch?

```ts
optional fetch?: typeof fetch;
```

Defined in: [src/core/wallets.ts:129](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L129)

##### includeUnavailable?

```ts
optional includeUnavailable?: boolean;
```

Defined in: [src/core/wallets.ts:128](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L128)

Keep wallets this browser can't use in the list, marked unavailable.

##### platform?

```ts
optional platform?: boolean;
```

Defined in: [src/core/wallets.ts:122](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L122)

Offer the phone's own wallet (default true). Listed only when this browser can reach it, unless `includeUnavailable`.

##### registry?

```ts
optional registry?: 
  | string
  | WalletRegistry
  | WebWalletEntry[];
```

Defined in: [src/core/wallets.ts:124](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L124)

Web wallets: a registry URL, a registry, or a list of entries. None by default.

***

### WebWalletEntry

```ts
type WebWalletEntry = {
  description?: string;
  homepage?: string;
  iconUrl?: string;
  id: string;
  name: string;
  target?: "tab" | "popup";
  walletUrl: string;
};
```

Defined in: [src/model/registry.ts:14](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L14)

#### Properties

##### description?

```ts
optional description?: string;
```

Defined in: [src/model/registry.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L22)

One line for a picker menu.

##### homepage?

```ts
optional homepage?: string;
```

Defined in: [src/model/registry.ts:26](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L26)

Where to learn about or install the wallet.

##### iconUrl?

```ts
optional iconUrl?: string;
```

Defined in: [src/model/registry.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L24)

Icon for a picker. Prefer a `data:` URL: loading a remote icon tells the wallet's server someone is on your page.

##### id

```ts
id: string;
```

Defined in: [src/model/registry.ts:16](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L16)

Stable identifier used in URLs, storage, and telemetry.

##### name

```ts
name: string;
```

Defined in: [src/model/registry.ts:18](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L18)

What the person sees: "Demo wallet".

##### target?

```ts
optional target?: "tab" | "popup";
```

Defined in: [src/model/registry.ts:28](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L28)

Open in a tab (default) or a popup window.

##### walletUrl

```ts
walletUrl: string;
```

Defined in: [src/model/registry.ts:20](https://github.com/smart-health-checkin/client/blob/main/src/model/registry.ts#L20)

The page that answers check-in requests.

## Variables

### VCI\_DIRECTORY\_URL

```ts
const VCI_DIRECTORY_URL: "https://raw.githubusercontent.com/the-commons-project/vci-directory/main/vci-issuers.json" = "https://raw.githubusercontent.com/the-commons-project/vci-directory/main/vci-issuers.json";
```

Defined in: [src/core/health-cards.ts:15](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L15)

The public list of SMART Health Card issuers maintained by the VCI coalition.

## Functions

### checkinRequest()

```ts
function checkinRequest(init): SmartCheckinRequest;
```

Defined in: [src/core/request.ts:21](https://github.com/smart-health-checkin/client/blob/main/src/core/request.ts#L21)

Build and validate a request. `type` and `version` are fixed by the spec,
`id` defaults to a UUID, `fhirVersions` to ["4.0.1"]. Throws on an invalid request.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `init` | [`CheckinRequestInit`](#checkinrequestinit) |

#### Returns

[`SmartCheckinRequest`](#smartcheckinrequest)

***

### configureHealthCardTrust()

```ts
function configureHealthCardTrust(trust): void;
```

Defined in: [src/core/health-cards.ts:72](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L72)

Set the trust used for every check-in that doesn't pass its own.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `trust` | [`HealthCardTrust`](#healthcardtrust) |

#### Returns

`void`

***

### customWallet()

```ts
function customWallet(init): Wallet;
```

Defined in: [src/core/wallets.ts:105](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L105)

Wrap any transport as a wallet: for experiments, tests, and new kinds of wallet.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `init` | \{ `available?`: `boolean`; `description?`: `string`; `iconUrl?`: `string`; `id`: `string`; `keys?`: [`KeyCustody`](#keycustody); `kind?`: `"platform"` \| `"web"` \| `"handoff"` \| `"mock"` \| `"custom"`; `name`: `string`; `open`: () => [`WalletSession`](#walletsession); `unavailableReason?`: `string`; \} | - |
| `init.available?` | `boolean` | - |
| `init.description?` | `string` | - |
| `init.iconUrl?` | `string` | - |
| `init.id` | `string` | - |
| `init.keys?` | [`KeyCustody`](#keycustody) | - |
| `init.kind?` | `"platform"` \| `"web"` \| `"handoff"` \| `"mock"` \| `"custom"` | - |
| `init.name` | `string` | - |
| `init.open` | () => [`WalletSession`](#walletsession) | Called inside the click. Return how to reach the wallet. |
| `init.unavailableReason?` | `string` | - |

#### Returns

[`Wallet`](#wallet-1)

***

### detectDcApiSupport()

```ts
function detectDcApiSupport(): DcApiSupport;
```

Defined in: [src/browser/index.ts:27](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L27)

Whether this browser can reach the phone's own wallet through the Digital Credentials API. `platformWallet()` uses it for `available`.

#### Returns

[`DcApiSupport`](#dcapisupport)

***

### healthCardTrust()

```ts
function healthCardTrust(): HealthCardTrust;
```

Defined in: [src/core/health-cards.ts:77](https://github.com/smart-health-checkin/client/blob/main/src/core/health-cards.ts#L77)

The trust currently configured.

#### Returns

[`HealthCardTrust`](#healthcardtrust)

***

### platformWallet()

```ts
function platformWallet(): Wallet;
```

Defined in: [src/core/wallets.ts:65](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L65)

The phone's own wallet, through the browser's Digital Credentials API.

#### Returns

[`Wallet`](#wallet-1)

***

### runCheckin()

```ts
function runCheckin(input, options?): Promise<CheckinResult>;
```

Defined in: [src/core/run.ts:81](https://github.com/smart-health-checkin/client/blob/main/src/core/run.ts#L81)

Run a check-in and report what happened. Never throws for an ordinary
outcome (declined, failed); throws only for a malformed request.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`CheckinRequestInput`](#checkinrequestinput) |
| `options` | [`CheckinOptions`](#checkinoptions) |

#### Returns

`Promise`\<[`CheckinResult`](#checkinresult)\>

***

### wallets()

```ts
function wallets(options?): Promise<Wallet[]>;
```

Defined in: [src/core/wallets.ts:137](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L137)

The wallets a page offers, in order: the platform wallet, the registry's
web wallets in registry order, then `extra`. Throws if a registry can't be
loaded or is malformed.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`WalletsOptions`](#walletsoptions) |

#### Returns

`Promise`\<[`Wallet`](#wallet-1)[]\>

***

### webWallet()

```ts
function webWallet(entry): Wallet;
```

Defined in: [src/core/wallets.ts:84](https://github.com/smart-health-checkin/client/blob/main/src/core/wallets.ts#L84)

A web wallet from a registry entry. Opens in a tab (or a popup, if the entry says so).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`WebWalletEntry`](#webwalletentry) |

#### Returns

[`Wallet`](#wallet-1)
