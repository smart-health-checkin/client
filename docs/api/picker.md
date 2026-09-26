[@smart-health-checkin/client API](index.md) / picker

# picker

## Type Aliases

### ArrangedWallets

```ts
type ArrangedWallets = {
  all: Wallet[];
  inline: Wallet[];
  more: Wallet[];
  primary?: Wallet;
  remembered?: Wallet;
};
```

Defined in: [src/picker/index.ts:29](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L29)

#### Properties

##### all

```ts
all: Wallet[];
```

Defined in: [src/picker/index.ts:37](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L37)

Every shown wallet, in display order.

##### inline

```ts
inline: Wallet[];
```

Defined in: [src/picker/index.ts:33](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L33)

Wallets listed under the main action.

##### more

```ts
more: Wallet[];
```

Defined in: [src/picker/index.ts:35](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L35)

Wallets behind "more", for long registries. Empty when everything fits.

##### primary?

```ts
optional primary?: Wallet;
```

Defined in: [src/picker/index.ts:31](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L31)

The one to present as the main action; undefined when nothing is available.

##### remembered?

```ts
optional remembered?: Wallet;
```

Defined in: [src/picker/index.ts:39](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L39)

The remembered wallet when `preferred` matched an available one.

***

### ArrangeOptions

```ts
type ArrangeOptions = {
  includeUnavailable?: boolean;
  inlineMax?: number;
  inlineShown?: number;
  preferred?: string;
};
```

Defined in: [src/picker/index.ts:18](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L18)

#### Properties

##### includeUnavailable?

```ts
optional includeUnavailable?: boolean;
```

Defined in: [src/picker/index.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L24)

Keep unavailable wallets instead of hiding them (for debugging).

##### inlineMax?

```ts
optional inlineMax?: number;
```

Defined in: [src/picker/index.ts:20](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L20)

Show every web wallet inline up to this many (default 5).

##### inlineShown?

```ts
optional inlineShown?: number;
```

Defined in: [src/picker/index.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L22)

Past `inlineMax`, show this many inline and the rest under "more" (default 4).

##### preferred?

```ts
optional preferred?: string;
```

Defined in: [src/picker/index.ts:26](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L26)

A wallet id to lead with, e.g. from `recallChoice`.

## Functions

### arrangeWallets()

```ts
function arrangeWallets(list, options?): ArrangedWallets;
```

Defined in: [src/picker/index.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L47)

Group and order wallets for display. The main action is the remembered
choice if there is one, else the platform wallet when available, else the
only option when there is exactly one. The rest keep their order.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `list` | readonly [`Wallet`](checkin.md#wallet-1)[] |
| `options` | [`ArrangeOptions`](#arrangeoptions) |

#### Returns

[`ArrangedWallets`](#arrangedwallets)

***

### forgetChoice()

```ts
function forgetChoice(key?): void;
```

Defined in: [src/picker/index.ts:87](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L87)

Forget the remembered wallet.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `key` | `string` | `STORAGE_KEY` |

#### Returns

`void`

***

### monogram()

```ts
function monogram(name): {
  color: string;
  letter: string;
};
```

Defined in: [src/picker/index.ts:96](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L96)

A letter and a stable color for a wallet with no icon.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

```ts
{
  color: string;
  letter: string;
}
```

##### color

```ts
color: string;
```

##### letter

```ts
letter: string;
```

***

### recallChoice()

```ts
function recallChoice(key?): string | undefined;
```

Defined in: [src/picker/index.ts:78](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L78)

The wallet id remembered for this site, if any.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `key` | `string` | `STORAGE_KEY` |

#### Returns

`string` \| `undefined`

***

### rememberChoice()

```ts
function rememberChoice(walletId, key?): void;
```

Defined in: [src/picker/index.ts:69](https://github.com/smart-health-checkin/client/blob/main/src/picker/index.ts#L69)

Remember the wallet the patient used, in this browser, for this site.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `walletId` | `string` | `undefined` |
| `key` | `string` | `STORAGE_KEY` |

#### Returns

`void`
