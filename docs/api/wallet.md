[@smart-health-checkin/client API](index.md) / wallet

# wallet

## Type Aliases

### MatchableEntry

```ts
type MatchableEntry = {
  fullUrl: string;
  resource: MatchableResource;
};
```

Defined in: [src/wallet/match.ts:17](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L17)

#### Properties

##### fullUrl

```ts
fullUrl: string;
```

Defined in: [src/wallet/match.ts:17](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L17)

##### resource

```ts
resource: MatchableResource;
```

Defined in: [src/wallet/match.ts:17](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L17)

***

### MatchableResource

```ts
type MatchableResource = {
[key: string]: unknown;
  meta?: {
     profile?: ReadonlyArray<string>;
  };
  resourceType: string;
};
```

Defined in: [src/wallet/match.ts:16](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L16)

Which of a patient's records answer a `selection.fhir` item (spec §5.4.1, §5.5).

- `profiles`: a resource matches when its `meta.profile` has the requested
  canonical. Unversioned requests match any version; versioned ones need
  that exact version.
- `profilesFrom`: matches any profile under the family's URL.
- `profiles` and `profilesFrom` together are additive; `resourceTypes`
  narrows either, or selects by type on its own.
- No selector at all: everything.

`selectEntries` also brings along the resources a match references (a
prescriber, a payer), so references in the returned Bundle resolve.

#### Indexable

```ts
[key: string]: unknown
```

#### Properties

##### meta?

```ts
optional meta?: {
  profile?: ReadonlyArray<string>;
};
```

Defined in: [src/wallet/match.ts:16](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L16)

###### profile?

```ts
optional profile?: ReadonlyArray<string>;
```

##### resourceType

```ts
resourceType: string;
```

Defined in: [src/wallet/match.ts:16](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L16)

***

### ParsedWalletRequest

```ts
type ParsedWalletRequest = {
  deviceRequestBytes: Uint8Array;
  encryptionInfoBytes: Uint8Array;
  smartRequest: SmartCheckinRequest;
};
```

Defined in: [src/wallet/seal.ts:29](https://github.com/smart-health-checkin/client/blob/main/src/wallet/seal.ts#L29)

#### Properties

##### deviceRequestBytes

```ts
deviceRequestBytes: Uint8Array;
```

Defined in: [src/wallet/seal.ts:31](https://github.com/smart-health-checkin/client/blob/main/src/wallet/seal.ts#L31)

##### encryptionInfoBytes

```ts
encryptionInfoBytes: Uint8Array;
```

Defined in: [src/wallet/seal.ts:32](https://github.com/smart-health-checkin/client/blob/main/src/wallet/seal.ts#L32)

##### smartRequest

```ts
smartRequest: SmartCheckinRequest;
```

Defined in: [src/wallet/seal.ts:30](https://github.com/smart-health-checkin/client/blob/main/src/wallet/seal.ts#L30)

***

### SelectionContent

```ts
type SelectionContent = {
  kind: "selection.fhir";
  profiles?: ReadonlyArray<string>;
  profilesFrom?: ReadonlyArray<string>;
  resourceTypes?: ReadonlyArray<string>;
};
```

Defined in: [src/wallet/match.ts:19](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L19)

#### Properties

##### kind

```ts
kind: "selection.fhir";
```

Defined in: [src/wallet/match.ts:20](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L20)

##### profiles?

```ts
optional profiles?: ReadonlyArray<string>;
```

Defined in: [src/wallet/match.ts:21](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L21)

##### profilesFrom?

```ts
optional profilesFrom?: ReadonlyArray<string>;
```

Defined in: [src/wallet/match.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L22)

##### resourceTypes?

```ts
optional resourceTypes?: ReadonlyArray<string>;
```

Defined in: [src/wallet/match.ts:23](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L23)

***

### ServeWebWalletOptions

```ts
type ServeWebWalletOptions = {
  closeAfterReply?: boolean;
  onInvalidRequest?: void;
  onRequest: Promise<WebWalletAnswer>;
};
```

Defined in: [src/wallet/serve-web-wallet.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L44)

`@smart-health-checkin/client/wallet`: for building a wallet.

- `serveWebWallet`: the web wallet's side of the hand-off.
- `parseWalletRequest`, `sealWalletResponse`: read a request, seal a response (native or web).
- `selects`, `selectEntries`: which records answer a `selection.fhir` item.
- `buildSignedDeviceResponse`, `recipientJwkFromEncryptionInfo`: lower-level
  pieces for wallets that seal their own responses.

#### Properties

##### closeAfterReply?

```ts
optional closeAfterReply?: boolean;
```

Defined in: [src/wallet/serve-web-wallet.ts:49](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L49)

Close the tab after replying (default true).

#### Methods

##### onInvalidRequest()?

```ts
optional onInvalidRequest(message, origin): void;
```

Defined in: [src/wallet/serve-web-wallet.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L47)

Called when a request can't be read; the EHR also gets an error reply.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `origin` | `string` |

###### Returns

`void`

##### onRequest()

```ts
onRequest(context): Promise<WebWalletAnswer>;
```

Defined in: [src/wallet/serve-web-wallet.ts:45](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L45)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`WebWalletRequestContext`](#webwalletrequestcontext) |

###### Returns

`Promise`\<[`WebWalletAnswer`](#webwalletanswer)\>

***

### WebWalletAnswer

```ts
type WebWalletAnswer = 
  | {
  response: SmartCheckinResponse;
}
  | {
  credential: {
     data: {
        response: string;
     };
     protocol: string;
  };
}
  | {
  declined: true;
}
  | {
  error: string;
};
```

Defined in: [src/wallet/serve-web-wallet.ts:34](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L34)

What the wallet answers with.

#### Union Members

##### Type Literal

```ts
{
  response: SmartCheckinResponse;
}
```

Seal this response for the EHR and send it.

***

##### Type Literal

```ts
{
  credential: {
     data: {
        response: string;
     };
     protocol: string;
  };
}
```

Send a credential you sealed yourself (for example, to inject faults when testing).

***

##### Type Literal

```ts
{
  declined: true;
}
```

The patient said no.

***

##### Type Literal

```ts
{
  error: string;
}
```

Something went wrong; the EHR sees the message.

***

### WebWalletCredential

```ts
type WebWalletCredential = {
  data: object;
  protocol: string;
};
```

Defined in: [src/kit/web-wallet.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/kit/web-wallet.ts#L22)

#### Properties

##### data

```ts
data: object;
```

Defined in: [src/kit/web-wallet.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/kit/web-wallet.ts#L22)

##### protocol

```ts
protocol: string;
```

Defined in: [src/kit/web-wallet.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/kit/web-wallet.ts#L22)

***

### WebWalletRequestContext

```ts
type WebWalletRequestContext = {
  origin: string;
  parsed: ParsedWalletRequest;
  request: SmartCheckinRequest;
};
```

Defined in: [src/wallet/serve-web-wallet.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L24)

`@smart-health-checkin/client/wallet`: for building a wallet.

- `serveWebWallet`: the web wallet's side of the hand-off.
- `parseWalletRequest`, `sealWalletResponse`: read a request, seal a response (native or web).
- `selects`, `selectEntries`: which records answer a `selection.fhir` item.
- `buildSignedDeviceResponse`, `recipientJwkFromEncryptionInfo`: lower-level
  pieces for wallets that seal their own responses.

#### Properties

##### origin

```ts
origin: string;
```

Defined in: [src/wallet/serve-web-wallet.ts:28](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L28)

The EHR page's origin, from the browser. Show it to the patient; the response is bound to it.

##### parsed

```ts
parsed: ParsedWalletRequest;
```

Defined in: [src/wallet/serve-web-wallet.ts:30](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L30)

The parsed wire request, for wallets that seal their own responses.

##### request

```ts
request: SmartCheckinRequest;
```

Defined in: [src/wallet/serve-web-wallet.ts:26](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L26)

The SMART request, validated.

***

### WebWalletResponseMessage

```ts
type WebWalletResponseMessage = 
  | {
  credential: WebWalletCredential;
  outcome: "approved";
  requestId?: string;
  type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE;
}
  | {
  outcome: "declined" | "closed";
  requestId?: string;
  type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE;
}
  | {
  message: string;
  outcome: "error";
  requestId?: string;
  type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE;
};
```

Defined in: [src/kit/web-wallet.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/kit/web-wallet.ts#L24)

## Variables

### WEB\_WALLET\_READY\_MESSAGE\_TYPE

```ts
const WEB_WALLET_READY_MESSAGE_TYPE: "digital-credentials/web-wallet/ready";
```

Defined in: [src/kit/web-wallet.ts:20](https://github.com/smart-health-checkin/client/blob/main/src/kit/web-wallet.ts#L20)

***

### WEB\_WALLET\_REQUEST\_MESSAGE\_TYPE

```ts
const WEB_WALLET_REQUEST_MESSAGE_TYPE: "digital-credentials/web-wallet/request";
```

Defined in: [src/kit/web-wallet.ts:18](https://github.com/smart-health-checkin/client/blob/main/src/kit/web-wallet.ts#L18)

***

### WEB\_WALLET\_RESPONSE\_MESSAGE\_TYPE

```ts
const WEB_WALLET_RESPONSE_MESSAGE_TYPE: "digital-credentials/web-wallet/response";
```

Defined in: [src/kit/web-wallet.ts:19](https://github.com/smart-health-checkin/client/blob/main/src/kit/web-wallet.ts#L19)

## Functions

### buildSignedDeviceResponse()

```ts
function buildSignedDeviceResponse(input): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [src/wallet/seal.ts:132](https://github.com/smart-health-checkin/client/blob/main/src/wallet/seal.ts#L132)

A structurally real SMART Health Card: a JWS whose payload is the raw-DEFLATEd
`{ iss, nbf, vc.credentialSubject.fhirBundle }` (one Patient, one Coverage),
so anything that decodes cards can show what is in it. The signature is
zeros — nothing verifies it, and nothing should.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `sessionTranscript`: `Uint8Array`; `smartResponseJson`: `string`; \} |
| `input.sessionTranscript` | `Uint8Array` |
| `input.smartResponseJson` | `string` |

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### parseWalletRequest()

```ts
function parseWalletRequest(navigatorArgument): ParsedWalletRequest;
```

Defined in: [src/wallet/seal.ts:36](https://github.com/smart-health-checkin/client/blob/main/src/wallet/seal.ts#L36)

Wallet side: recover the SMART request from a navigator.credentials.get argument.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `navigatorArgument` | `unknown` |

#### Returns

[`ParsedWalletRequest`](#parsedwalletrequest)

***

### recipientJwkFromEncryptionInfo()

```ts
function recipientJwkFromEncryptionInfo(encryptionInfoBytes): JsonWebKey;
```

Defined in: [src/wallet/seal.ts:107](https://github.com/smart-health-checkin/client/blob/main/src/wallet/seal.ts#L107)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `encryptionInfoBytes` | `Uint8Array` |

#### Returns

`JsonWebKey`

***

### sealWalletResponse()

```ts
function sealWalletResponse(input): Promise<{
  data: {
     response: string;
  };
  protocol: string;
}>;
```

Defined in: [src/wallet/seal.ts:52](https://github.com/smart-health-checkin/client/blob/main/src/wallet/seal.ts#L52)

Wallet side: sign and HPKE-seal a SMART response for the verifier.
`verifierOrigin` is the requesting page's origin — the SessionTranscript
binds to it, so a response cannot be replayed to a different origin.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `encryptionInfoBytes`: `Uint8Array`; `smartResponse`: [`SmartCheckinResponse`](checkin.md#smartcheckinresponse); `verifierOrigin`: `string`; \} |
| `input.encryptionInfoBytes` | `Uint8Array` |
| `input.smartResponse` | [`SmartCheckinResponse`](checkin.md#smartcheckinresponse) |
| `input.verifierOrigin` | `string` |

#### Returns

`Promise`\<\{
  `data`: \{
     `response`: `string`;
  \};
  `protocol`: `string`;
\}\>

***

### selectEntries()

```ts
function selectEntries(
   content, 
   entries, 
   options?): MatchableEntry[];
```

Defined in: [src/wallet/match.ts:60](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L60)

The entries that answer the selector, plus the entries they reference.
`exclude` names fullUrls never to pull in by reference (usually the
Patient, which has its own item).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `content` | [`SelectionContent`](#selectioncontent) |
| `entries` | readonly [`MatchableEntry`](#matchableentry)[] |
| `options` | \{ `exclude?`: readonly `string`[]; \} |
| `options.exclude?` | readonly `string`[] |

#### Returns

[`MatchableEntry`](#matchableentry)[]

***

### selects()

```ts
function selects(content, resource): boolean;
```

Defined in: [src/wallet/match.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/wallet/match.ts#L44)

Does this resource answer the selector?

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `content` | [`SelectionContent`](#selectioncontent) |
| `resource` | [`MatchableResource`](#matchableresource) |

#### Returns

`boolean`

***

### serveWebWallet()

```ts
function serveWebWallet(options): {
  opened: boolean;
  stop: void;
};
```

Defined in: [src/wallet/serve-web-wallet.ts:56](https://github.com/smart-health-checkin/client/blob/main/src/wallet/serve-web-wallet.ts#L56)

Start answering. Returns `{ opened }`: false when the page wasn't opened by
an EHR (no `window.opener`), so the wallet can show its own landing page.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ServeWebWalletOptions`](#servewebwalletoptions) |

#### Returns

```ts
{
  opened: boolean;
  stop: void;
}
```

##### opened

```ts
opened: boolean;
```

##### stop()

```ts
stop(): void;
```

###### Returns

`void`
