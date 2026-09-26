[@smart-health-checkin/client API](index.md) / react

# react

## Type Aliases

### CheckinPickerProps

```ts
type CheckinPickerProps = {
  appearance?: "card" | "flat";
  checkinOptions?: Omit<CheckinOptions, "wallet" | "signal" | "session">;
  className?: string;
  description?: string;
  elementRef?: (element) => void;
  footer?: boolean;
  heading?: string;
  mock?: boolean;
  mode?: "checkin" | "pick";
  onChoose?: (detail) => void;
  onDeclined?: (detail) => void;
  onError?: (detail) => void;
  onResponse?: (detail) => void;
  platform?: boolean;
  registry?: string;
  remember?: boolean;
  request?: CheckinRequestInput;
  strings?: Partial<PickerStrings>;
  style?: CSSProperties;
  theme?: "light" | "dark" | "auto";
  wallets?: Wallet[];
};
```

Defined in: [src/react/index.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L22)

#### Properties

##### appearance?

```ts
optional appearance?: "card" | "flat";
```

Defined in: [src/react/index.ts:36](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L36)

##### checkinOptions?

```ts
optional checkinOptions?: Omit<CheckinOptions, "wallet" | "signal" | "session">;
```

Defined in: [src/react/index.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L44)

##### className?

```ts
optional className?: string;
```

Defined in: [src/react/index.ts:45](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L45)

##### description?

```ts
optional description?: string;
```

Defined in: [src/react/index.ts:40](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L40)

##### elementRef?

```ts
optional elementRef?: (element) => void;
```

Defined in: [src/react/index.ts:52](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L52)

Receives the element, e.g. to call `setOutcome` in pick mode.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `element` | [`SmartCheckinPicker`](ui.md#smartcheckinpicker) & `HTMLElement` \| `null` |

###### Returns

`void`

##### footer?

```ts
optional footer?: boolean;
```

Defined in: [src/react/index.ts:38](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L38)

Show the SMART Health Check-in mark (default true).

##### heading?

```ts
optional heading?: string;
```

Defined in: [src/react/index.ts:39](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L39)

##### mock?

```ts
optional mock?: boolean;
```

Defined in: [src/react/index.ts:32](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L32)

Offer the simulated responder. Development only.

##### mode?

```ts
optional mode?: "checkin" | "pick";
```

Defined in: [src/react/index.ts:34](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L34)

"checkin" (default) runs the flow; "pick" only chooses.

##### onChoose?

```ts
optional onChoose?: (detail) => void;
```

Defined in: [src/react/index.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L47)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `detail` | \{ `session?`: [`WalletSession`](checkin.md#walletsession); `wallet`: [`Wallet`](checkin.md#wallet-1); \} |
| `detail.session?` | [`WalletSession`](checkin.md#walletsession) |
| `detail.wallet` | [`Wallet`](checkin.md#wallet-1) |

###### Returns

`void`

##### onDeclined?

```ts
optional onDeclined?: (detail) => void;
```

Defined in: [src/react/index.ts:49](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L49)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `detail` | \{ `result?`: [`CheckinResult`](checkin.md#checkinresult); `wallet`: [`Wallet`](checkin.md#wallet-1); \} |
| `detail.result?` | [`CheckinResult`](checkin.md#checkinresult) |
| `detail.wallet` | [`Wallet`](checkin.md#wallet-1) |

###### Returns

`void`

##### onError?

```ts
optional onError?: (detail) => void;
```

Defined in: [src/react/index.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L50)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `detail` | \{ `code?`: [`CheckinErrorCode`](checkin.md#checkinerrorcode-1); `message`: `string`; `wallet?`: [`Wallet`](checkin.md#wallet-1); \} |
| `detail.code?` | [`CheckinErrorCode`](checkin.md#checkinerrorcode-1) |
| `detail.message` | `string` |
| `detail.wallet?` | [`Wallet`](checkin.md#wallet-1) |

###### Returns

`void`

##### onResponse?

```ts
optional onResponse?: (detail) => void;
```

Defined in: [src/react/index.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L48)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `detail` | \{ `response`: [`CheckinResponse`](checkin.md#checkinresponse); `result`: [`CheckinResult`](checkin.md#checkinresult); `wallet`: [`Wallet`](checkin.md#wallet-1); \} |
| `detail.response` | [`CheckinResponse`](checkin.md#checkinresponse) |
| `detail.result` | [`CheckinResult`](checkin.md#checkinresult) |
| `detail.wallet` | [`Wallet`](checkin.md#wallet-1) |

###### Returns

`void`

##### platform?

```ts
optional platform?: boolean;
```

Defined in: [src/react/index.ts:28](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L28)

Offer the device's own wallet (default true).

##### registry?

```ts
optional registry?: string;
```

Defined in: [src/react/index.ts:26](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L26)

Wallet registry URL. Omit for no web wallets.

##### remember?

```ts
optional remember?: boolean;
```

Defined in: [src/react/index.ts:30](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L30)

Remember the last app used on this site (default false).

##### request?

```ts
optional request?: CheckinRequestInput;
```

Defined in: [src/react/index.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L24)

What to ask for. Required unless `mode="pick"`.

##### strings?

```ts
optional strings?: Partial<PickerStrings>;
```

Defined in: [src/react/index.ts:41](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L41)

##### style?

```ts
optional style?: CSSProperties;
```

Defined in: [src/react/index.ts:46](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L46)

##### theme?

```ts
optional theme?: "light" | "dark" | "auto";
```

Defined in: [src/react/index.ts:35](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L35)

##### wallets?

```ts
optional wallets?: Wallet[];
```

Defined in: [src/react/index.ts:43](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L43)

The wallets to offer (from `wallets()`), instead of `registry` / `platform` / `mock`.

## Functions

### CheckinPicker()

```ts
function CheckinPicker(props): DOMElement<DOMAttributes<SmartCheckinPicker & HTMLElement>, SmartCheckinPicker & HTMLElement>;
```

Defined in: [src/react/index.ts:56](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L56)

The `<smart-checkin-picker>` element as a React component.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `props` | [`CheckinPickerProps`](#checkinpickerprops) |

#### Returns

`DOMElement`\<`DOMAttributes`\<[`SmartCheckinPicker`](ui.md#smartcheckinpicker) & `HTMLElement`\>, [`SmartCheckinPicker`](ui.md#smartcheckinpicker) & `HTMLElement`\>

***

### useCheckin()

```ts
function useCheckin(request, options?): {
  response: CheckinResponse | undefined;
  result: CheckinResult | undefined;
  start: (wallet) => 
     | Promise<undefined>
     | Promise<
     | {
     request: SmartCheckinRequest;
     response?: CheckinResponse;
     serverReference?: string;
     status: "completed";
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
  }>;
  status: "declined" | "waiting" | "completed" | "failed" | "idle";
  wallets: Wallet[];
};
```

Defined in: [src/react/index.ts:116](https://github.com/smart-health-checkin/client/blob/main/src/react/index.ts#L116)

For pages drawing their own buttons: the wallets to offer, and `start`,
which runs a check-in with one of them. Call `start(wallet)` from a click
handler; it opens a web wallet's tab inside the click.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`CheckinRequestInput`](checkin.md#checkinrequestinput) |
| `options` | [`WalletsOptions`](checkin.md#walletsoptions) & `Omit`\<[`CheckinOptions`](checkin.md#checkinoptions), `"wallet"` \| `"session"` \| `"signal"`\> |

#### Returns

```ts
{
  response: CheckinResponse | undefined;
  result: CheckinResult | undefined;
  start: (wallet) => 
     | Promise<undefined>
     | Promise<
     | {
     request: SmartCheckinRequest;
     response?: CheckinResponse;
     serverReference?: string;
     status: "completed";
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
  }>;
  status: "declined" | "waiting" | "completed" | "failed" | "idle";
  wallets: Wallet[];
}
```

##### response

```ts
response: CheckinResponse | undefined;
```

##### result

```ts
result: CheckinResult | undefined;
```

##### start

```ts
start: (wallet) => 
  | Promise<undefined>
  | Promise<
  | {
  request: SmartCheckinRequest;
  response?: CheckinResponse;
  serverReference?: string;
  status: "completed";
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
}>;
```

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `wallet` | [`Wallet`](checkin.md#wallet-1) \| `undefined` |

###### Returns

  \| `Promise`\<`undefined`\>
  \| `Promise`\<
  \| \{
  `request`: [`SmartCheckinRequest`](checkin.md#smartcheckinrequest);
  `response?`: [`CheckinResponse`](checkin.md#checkinresponse);
  `serverReference?`: `string`;
  `status`: `"completed"`;
  `wallet`: [`Wallet`](checkin.md#wallet-1);
\}
  \| \{
  `request`: [`SmartCheckinRequest`](checkin.md#smartcheckinrequest);
  `status`: `"declined"`;
  `wallet`: [`Wallet`](checkin.md#wallet-1);
\}
  \| \{
  `error`: \{
     `check?`: `string`;
     `code`: [`CheckinErrorCode`](checkin.md#checkinerrorcode-1);
     `message`: `string`;
  \};
  `request`: [`SmartCheckinRequest`](checkin.md#smartcheckinrequest);
  `status`: `"failed"`;
  `wallet`: [`Wallet`](checkin.md#wallet-1);
\}\>

##### status

```ts
status: "declined" | "waiting" | "completed" | "failed" | "idle";
```

##### wallets

```ts
wallets: Wallet[] = list;
```

## References

### PickerOutcome

Re-exports [PickerOutcome](ui.md#pickeroutcome)
