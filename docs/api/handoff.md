[@smart-health-checkin/client API](index.md) / handoff

# handoff

## Type Aliases

### HandoffAnswer

```ts
type HandoffAnswer = 
  | {
  credential: {
     data: unknown;
     protocol: string;
  };
}
  | {
  declined: true;
  reason?: string;
};
```

Defined in: [src/kit/handoff.ts:35](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L35)

What the phone posts back: the wallet's credential, or a decline.

***

### HandoffEnvelope

```ts
type HandoffEnvelope = {
  createdAt: string;
  expiresAt: string;
  handoffOrigin: string;
  navigatorArgument: unknown;
  v: 1;
};
```

Defined in: [src/kit/handoff.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L24)

What the kiosk posts for the phone to pick up.

#### Properties

##### createdAt

```ts
createdAt: string;
```

Defined in: [src/kit/handoff.ts:30](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L30)

##### expiresAt

```ts
expiresAt: string;
```

Defined in: [src/kit/handoff.ts:31](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L31)

##### handoffOrigin

```ts
handoffOrigin: string;
```

Defined in: [src/kit/handoff.ts:29](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L29)

The hand-off page's origin — the one the kiosk computed the session transcript for.

##### navigatorArgument

```ts
navigatorArgument: unknown;
```

Defined in: [src/kit/handoff.ts:27](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L27)

Passed verbatim to navigator.credentials.get on the phone.

##### v

```ts
v: 1;
```

Defined in: [src/kit/handoff.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L25)

***

### HandoffMailbox

```ts
type HandoffMailbox = {
  answer: Promise<void>;
  fetch: Promise<HandoffEnvelope>;
  post: Promise<void>;
  waitForAnswer: Promise<HandoffAnswer>;
};
```

Defined in: [src/kit/handoff.ts:39](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L39)

`@smart-health-checkin/client/handoff`: hand a check-in from a screen with
no wallet (a kiosk, a front-desk tablet) to the patient's phone, through a
mailbox you provide.

Kiosk: offer `handoffWallet({ mailbox, handoffUrl, onWaiting })` like any
other wallet. Phone: `fetchHandoff`, then `answerHandoff`.

#### Methods

##### answer()

```ts
answer(sessionId, answer): Promise<void>;
```

Defined in: [src/kit/handoff.ts:45](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L45)

Phone → kiosk.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `sessionId` | `string` |
| `answer` | [`HandoffAnswer`](#handoffanswer) |

###### Returns

`Promise`\<`void`\>

##### fetch()

```ts
fetch(sessionId): Promise<HandoffEnvelope>;
```

Defined in: [src/kit/handoff.ts:43](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L43)

Phone ← kiosk. Rejects if there is no such session.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `sessionId` | `string` |

###### Returns

`Promise`\<[`HandoffEnvelope`](#handoffenvelope)\>

##### post()

```ts
post(sessionId, envelope): Promise<void>;
```

Defined in: [src/kit/handoff.ts:41](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L41)

Kiosk → phone.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `sessionId` | `string` |
| `envelope` | [`HandoffEnvelope`](#handoffenvelope) |

###### Returns

`Promise`\<`void`\>

##### waitForAnswer()

```ts
waitForAnswer(sessionId, options?): Promise<HandoffAnswer>;
```

Defined in: [src/kit/handoff.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L47)

Kiosk ← phone. Resolves with the first answer; rejects on abort.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `sessionId` | `string` |
| `options?` | \{ `signal?`: `AbortSignal`; \} |
| `options.signal?` | `AbortSignal` |

###### Returns

`Promise`\<[`HandoffAnswer`](#handoffanswer)\>

***

### HandoffOptions

```ts
type HandoffOptions = {
  handoffUrl: string;
  mailbox: HandoffMailbox;
  onWaiting?: (handoff) => void;
  sessionId?: string;
  signal?: AbortSignal;
  ttlMs?: number;
};
```

Defined in: [src/kit/handoff.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L50)

`@smart-health-checkin/client/handoff`: hand a check-in from a screen with
no wallet (a kiosk, a front-desk tablet) to the patient's phone, through a
mailbox you provide.

Kiosk: offer `handoffWallet({ mailbox, handoffUrl, onWaiting })` like any
other wallet. Phone: `fetchHandoff`, then `answerHandoff`.

#### Properties

##### handoffUrl

```ts
handoffUrl: string;
```

Defined in: [src/kit/handoff.ts:53](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L53)

The hand-off page the phone will open; the session id goes in its fragment.

##### mailbox

```ts
mailbox: HandoffMailbox;
```

Defined in: [src/kit/handoff.ts:51](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L51)

##### onWaiting?

```ts
optional onWaiting?: (handoff) => void;
```

Defined in: [src/kit/handoff.ts:55](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L55)

Called once the request is posted: show `url` as a QR code.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `handoff` | \{ `sessionId`: `string`; `url`: `string`; \} |
| `handoff.sessionId` | `string` |
| `handoff.url` | `string` |

###### Returns

`void`

##### sessionId?

```ts
optional sessionId?: string;
```

Defined in: [src/kit/handoff.ts:57](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L57)

Default: random.

##### signal?

```ts
optional signal?: AbortSignal;
```

Defined in: [src/kit/handoff.ts:60](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L60)

##### ttlMs?

```ts
optional ttlMs?: number;
```

Defined in: [src/kit/handoff.ts:59](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L59)

How long the phone may take to pick the request up. Default ten minutes.

## Functions

### answerHandoff()

```ts
function answerHandoff(
   mailbox, 
   sessionId, 
   envelope, 
wallet?): Promise<HandoffAnswer>;
```

Defined in: [src/kit/handoff.ts:123](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L123)

Phone side, step two: ask the wallet and send back what it returned.
`getCredential` defaults to the browser's own navigator.credentials.get;
pass a web-wallet or mock getter to answer without a platform wallet. A
decline is reported to the kiosk as a decline, not as silence.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `mailbox` | [`HandoffMailbox`](#handoffmailbox) |
| `sessionId` | `string` |
| `envelope` | [`HandoffEnvelope`](#handoffenvelope) |
| `wallet` | [`Wallet`](checkin.md#wallet-1) |

#### Returns

`Promise`\<[`HandoffAnswer`](#handoffanswer)\>

***

### fetchHandoff()

```ts
function fetchHandoff(mailbox, sessionId): Promise<{
  envelope: HandoffEnvelope;
  request: SmartCheckinRequest;
}>;
```

Defined in: [src/kit/handoff.ts:108](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L108)

Phone side, step one: pick the request up and recover what it asks for, to show the person.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `mailbox` | [`HandoffMailbox`](#handoffmailbox) |
| `sessionId` | `string` |

#### Returns

`Promise`\<\{
  `envelope`: [`HandoffEnvelope`](#handoffenvelope);
  `request`: [`SmartCheckinRequest`](checkin.md#smartcheckinrequest);
\}\>

***

### handoffUrlFor()

```ts
function handoffUrlFor(handoffUrl, sessionId): string;
```

Defined in: [src/kit/handoff.ts:66](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L66)

The URL the QR code carries.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handoffUrl` | `string` |
| `sessionId` | `string` |

#### Returns

`string`

***

### handoffWallet()

```ts
function handoffWallet(options): Wallet;
```

Defined in: [src/kit/handoff.ts:158](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L158)

A kiosk's "use your phone" option as a wallet: posts the request to the
mailbox, calls `onWaiting` with the URL to show as a QR code, and waits for
the phone's answer.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `Omit`\<[`HandoffOptions`](#handoffoptions), `"signal"`\> & \{ `description?`: `string`; `name?`: `string`; \} |

#### Returns

[`Wallet`](checkin.md#wallet-1)

***

### sessionIdFromHash()

```ts
function sessionIdFromHash(hash): string | null;
```

Defined in: [src/kit/handoff.ts:73](https://github.com/smart-health-checkin/client/blob/main/src/kit/handoff.ts#L73)

The session id from a hand-off page's location hash, or null.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `hash` | `string` |

#### Returns

`string` \| `null`
