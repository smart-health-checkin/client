[@smart-health-checkin/client API](index.md) / wire

# wire

## Classes

### CborTag

Defined in: [src/wire/cbor.ts:9](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L9)

#### Constructors

##### Constructor

```ts
new CborTag(tag, value): CborTag;
```

Defined in: [src/wire/cbor.ts:10](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L10)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `tag` | `number` |
| `value` | `unknown` |

###### Returns

[`CborTag`](#cbortag)

#### Properties

##### tag

```ts
readonly tag: number;
```

Defined in: [src/wire/cbor.ts:11](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L11)

##### value

```ts
readonly value: unknown;
```

Defined in: [src/wire/cbor.ts:12](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L12)

## Type Aliases

### CoseSign1

```ts
type CoseSign1 = [Uint8Array, Map<unknown, unknown>, Uint8Array | null, Uint8Array];
```

Defined in: [src/wire/verify.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L22)

***

### DcapiMdocResponse

```ts
type DcapiMdocResponse = {
  data: {
     response: string;
  };
  protocol: typeof PROTOCOL_ID;
};
```

Defined in: [src/wire/response.ts:41](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L41)

#### Properties

##### data

```ts
data: {
  response: string;
};
```

Defined in: [src/wire/response.ts:43](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L43)

###### response

```ts
response: string;
```

##### protocol

```ts
protocol: typeof PROTOCOL_ID;
```

Defined in: [src/wire/response.ts:42](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L42)

***

### DcapiResponseInspection

```ts
type DcapiResponseInspection = {
  cipherText?: {
     base64url: string;
     hex: string;
  };
  dcapiResponse: JsonValue;
  dcapiResponseDiagnostic: string;
  dcapiResponseHex: string;
  enc?: {
     base64url: string;
     hex: string;
  };
};
```

Defined in: [src/wire/response.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L48)

#### Properties

##### cipherText?

```ts
optional cipherText?: {
  base64url: string;
  hex: string;
};
```

Defined in: [src/wire/response.ts:53](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L53)

###### base64url

```ts
base64url: string;
```

###### hex

```ts
hex: string;
```

##### dcapiResponse

```ts
dcapiResponse: JsonValue;
```

Defined in: [src/wire/response.ts:51](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L51)

##### dcapiResponseDiagnostic

```ts
dcapiResponseDiagnostic: string;
```

Defined in: [src/wire/response.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L50)

##### dcapiResponseHex

```ts
dcapiResponseHex: string;
```

Defined in: [src/wire/response.ts:49](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L49)

##### enc?

```ts
optional enc?: {
  base64url: string;
  hex: string;
};
```

Defined in: [src/wire/response.ts:52](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L52)

###### base64url

```ts
base64url: string;
```

###### hex

```ts
hex: string;
```

***

### DeviceRequestInspection

```ts
type DeviceRequestInspection = {
  deviceRequest: JsonValue;
  deviceRequestDiagnostic: string;
  deviceRequestHex: string;
  docRequests: ItemsRequestInspection[];
};
```

Defined in: [src/wire/inspect-request.ts:41](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L41)

#### Properties

##### deviceRequest

```ts
deviceRequest: JsonValue;
```

Defined in: [src/wire/inspect-request.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L44)

##### deviceRequestDiagnostic

```ts
deviceRequestDiagnostic: string;
```

Defined in: [src/wire/inspect-request.ts:43](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L43)

##### deviceRequestHex

```ts
deviceRequestHex: string;
```

Defined in: [src/wire/inspect-request.ts:42](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L42)

##### docRequests

```ts
docRequests: ItemsRequestInspection[];
```

Defined in: [src/wire/inspect-request.ts:45](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L45)

***

### DeviceResponseDocumentInspection

```ts
type DeviceResponseDocumentInspection = {
  docType?: string;
  elements: IssuerSignedElementInspection[];
  issuerAuth?: {
     digestAlgorithm?: string;
     mso?: JsonValue;
     msoDiagnostic?: string;
  };
};
```

Defined in: [src/wire/response.ts:82](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L82)

#### Properties

##### docType?

```ts
optional docType?: string;
```

Defined in: [src/wire/response.ts:83](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L83)

##### elements

```ts
elements: IssuerSignedElementInspection[];
```

Defined in: [src/wire/response.ts:89](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L89)

##### issuerAuth?

```ts
optional issuerAuth?: {
  digestAlgorithm?: string;
  mso?: JsonValue;
  msoDiagnostic?: string;
};
```

Defined in: [src/wire/response.ts:84](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L84)

###### digestAlgorithm?

```ts
optional digestAlgorithm?: string;
```

###### mso?

```ts
optional mso?: JsonValue;
```

###### msoDiagnostic?

```ts
optional msoDiagnostic?: string;
```

***

### DeviceResponseInspection

```ts
type DeviceResponseInspection = {
  deviceResponse: JsonValue;
  deviceResponseDiagnostic: string;
  deviceResponseHex: string;
  documents: DeviceResponseDocumentInspection[];
  status?: number;
  version?: string;
};
```

Defined in: [src/wire/response.ts:92](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L92)

#### Properties

##### deviceResponse

```ts
deviceResponse: JsonValue;
```

Defined in: [src/wire/response.ts:95](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L95)

##### deviceResponseDiagnostic

```ts
deviceResponseDiagnostic: string;
```

Defined in: [src/wire/response.ts:94](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L94)

##### deviceResponseHex

```ts
deviceResponseHex: string;
```

Defined in: [src/wire/response.ts:93](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L93)

##### documents

```ts
documents: DeviceResponseDocumentInspection[];
```

Defined in: [src/wire/response.ts:98](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L98)

##### status?

```ts
optional status?: number;
```

Defined in: [src/wire/response.ts:97](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L97)

##### version?

```ts
optional version?: string;
```

Defined in: [src/wire/response.ts:96](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L96)

***

### DeviceSignatureVerification

```ts
type DeviceSignatureVerification = {
  error?: string;
  present: boolean;
  signatureValid?: boolean;
};
```

Defined in: [src/wire/verify.ts:31](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L31)

#### Properties

##### error?

```ts
optional error?: string;
```

Defined in: [src/wire/verify.ts:34](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L34)

##### present

```ts
present: boolean;
```

Defined in: [src/wire/verify.ts:32](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L32)

##### signatureValid?

```ts
optional signatureValid?: boolean;
```

Defined in: [src/wire/verify.ts:33](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L33)

***

### DigestVerification

```ts
type DigestVerification = {
  allMatch: boolean;
  checked: number;
  matched: number;
};
```

Defined in: [src/wire/verify.ts:37](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L37)

#### Properties

##### allMatch

```ts
allMatch: boolean;
```

Defined in: [src/wire/verify.ts:40](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L40)

##### checked

```ts
checked: number;
```

Defined in: [src/wire/verify.ts:38](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L38)

##### matched

```ts
matched: number;
```

Defined in: [src/wire/verify.ts:39](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L39)

***

### DocumentVerification

```ts
type DocumentVerification = {
  deviceSignature: DeviceSignatureVerification;
  digests: DigestVerification;
  docType?: string;
  issuerAuth: IssuerAuthVerification;
};
```

Defined in: [src/wire/verify.ts:43](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L43)

#### Properties

##### deviceSignature

```ts
deviceSignature: DeviceSignatureVerification;
```

Defined in: [src/wire/verify.ts:46](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L46)

##### digests

```ts
digests: DigestVerification;
```

Defined in: [src/wire/verify.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L47)

##### docType?

```ts
optional docType?: string;
```

Defined in: [src/wire/verify.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L44)

##### issuerAuth

```ts
issuerAuth: IssuerAuthVerification;
```

Defined in: [src/wire/verify.ts:45](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L45)

***

### EncryptionInfoInspection

```ts
type EncryptionInfoInspection = {
  encryptionInfo: JsonValue;
  encryptionInfoDiagnostic: string;
  encryptionInfoHex: string;
  nonce?: {
     base64url: string;
     hex: string;
  };
  recipientPublicKey?: JsonValue;
};
```

Defined in: [src/wire/inspect-request.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L48)

#### Properties

##### encryptionInfo

```ts
encryptionInfo: JsonValue;
```

Defined in: [src/wire/inspect-request.ts:51](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L51)

##### encryptionInfoDiagnostic

```ts
encryptionInfoDiagnostic: string;
```

Defined in: [src/wire/inspect-request.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L50)

##### encryptionInfoHex

```ts
encryptionInfoHex: string;
```

Defined in: [src/wire/inspect-request.ts:49](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L49)

##### nonce?

```ts
optional nonce?: {
  base64url: string;
  hex: string;
};
```

Defined in: [src/wire/inspect-request.ts:52](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L52)

###### base64url

```ts
base64url: string;
```

###### hex

```ts
hex: string;
```

##### recipientPublicKey?

```ts
optional recipientPublicKey?: JsonValue;
```

Defined in: [src/wire/inspect-request.ts:53](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L53)

***

### HpkeSealResult

```ts
type HpkeSealResult = {
  cipherText: Uint8Array;
  enc: Uint8Array;
  response: DcapiMdocResponse;
};
```

Defined in: [src/wire/response.ts:101](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L101)

#### Properties

##### cipherText

```ts
cipherText: Uint8Array;
```

Defined in: [src/wire/response.ts:103](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L103)

##### enc

```ts
enc: Uint8Array;
```

Defined in: [src/wire/response.ts:102](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L102)

##### response

```ts
response: DcapiMdocResponse;
```

Defined in: [src/wire/response.ts:104](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L104)

***

### IssuerAuthVerification

```ts
type IssuerAuthVerification = {
  error?: string;
  present: boolean;
  signatureValid?: boolean;
  x5chain?: Uint8Array[];
};
```

Defined in: [src/wire/verify.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L24)

#### Properties

##### error?

```ts
optional error?: string;
```

Defined in: [src/wire/verify.ts:28](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L28)

##### present

```ts
present: boolean;
```

Defined in: [src/wire/verify.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L25)

##### signatureValid?

```ts
optional signatureValid?: boolean;
```

Defined in: [src/wire/verify.ts:26](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L26)

##### x5chain?

```ts
optional x5chain?: Uint8Array[];
```

Defined in: [src/wire/verify.ts:27](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L27)

***

### IssuerSignedElementInspection

```ts
type IssuerSignedElementInspection = {
  digestID?: number;
  elementIdentifier?: string;
  elementValue?: JsonValue;
  issuerSignedItemDiagnostic: string;
  issuerSignedItemTag24Hex: string;
  namespace: string;
  random?: {
     base64url: string;
     hex: string;
  };
  smartHealthCheckinResponse: SmartResponseInspection;
  valueDigest?: {
     matches?: boolean;
     msoSha256?: string;
     recomputedSha256: string;
  };
};
```

Defined in: [src/wire/response.ts:66](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L66)

#### Properties

##### digestID?

```ts
optional digestID?: number;
```

Defined in: [src/wire/response.ts:68](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L68)

##### elementIdentifier?

```ts
optional elementIdentifier?: string;
```

Defined in: [src/wire/response.ts:70](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L70)

##### elementValue?

```ts
optional elementValue?: JsonValue;
```

Defined in: [src/wire/response.ts:71](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L71)

##### issuerSignedItemDiagnostic

```ts
issuerSignedItemDiagnostic: string;
```

Defined in: [src/wire/response.ts:73](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L73)

##### issuerSignedItemTag24Hex

```ts
issuerSignedItemTag24Hex: string;
```

Defined in: [src/wire/response.ts:72](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L72)

##### namespace

```ts
namespace: string;
```

Defined in: [src/wire/response.ts:67](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L67)

##### random?

```ts
optional random?: {
  base64url: string;
  hex: string;
};
```

Defined in: [src/wire/response.ts:69](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L69)

###### base64url

```ts
base64url: string;
```

###### hex

```ts
hex: string;
```

##### smartHealthCheckinResponse

```ts
smartHealthCheckinResponse: SmartResponseInspection;
```

Defined in: [src/wire/response.ts:79](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L79)

##### valueDigest?

```ts
optional valueDigest?: {
  matches?: boolean;
  msoSha256?: string;
  recomputedSha256: string;
};
```

Defined in: [src/wire/response.ts:74](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L74)

###### matches?

```ts
optional matches?: boolean;
```

###### msoSha256?

```ts
optional msoSha256?: string;
```

###### recomputedSha256

```ts
recomputedSha256: string;
```

***

### ItemsRequestInspection

```ts
type ItemsRequestInspection = {
  docType?: string;
  itemsRequest: JsonValue;
  itemsRequestDiagnostic: string;
  itemsRequestHex: string;
  readerAuth?: {
     payloadIsDetached: boolean;
     protectedHeaders?: JsonValue;
     readerAuthHex: string;
     signatureHex?: string;
     unprotectedHeaders?: JsonValue;
  };
  requestedElements: {
     elementIdentifier: string;
     intentToRetain: boolean;
     namespace: string;
  }[];
  requestInfo?: JsonValue;
  smartHealthCheckin: SmartRequestInspection;
};
```

Defined in: [src/wire/inspect-request.ts:12](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L12)

#### Properties

##### docType?

```ts
optional docType?: string;
```

Defined in: [src/wire/inspect-request.ts:16](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L16)

##### itemsRequest

```ts
itemsRequest: JsonValue;
```

Defined in: [src/wire/inspect-request.ts:15](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L15)

##### itemsRequestDiagnostic

```ts
itemsRequestDiagnostic: string;
```

Defined in: [src/wire/inspect-request.ts:14](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L14)

##### itemsRequestHex

```ts
itemsRequestHex: string;
```

Defined in: [src/wire/inspect-request.ts:13](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L13)

##### readerAuth?

```ts
optional readerAuth?: {
  payloadIsDetached: boolean;
  protectedHeaders?: JsonValue;
  readerAuthHex: string;
  signatureHex?: string;
  unprotectedHeaders?: JsonValue;
};
```

Defined in: [src/wire/inspect-request.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L24)

###### payloadIsDetached

```ts
payloadIsDetached: boolean;
```

###### protectedHeaders?

```ts
optional protectedHeaders?: JsonValue;
```

###### readerAuthHex

```ts
readerAuthHex: string;
```

###### signatureHex?

```ts
optional signatureHex?: string;
```

###### unprotectedHeaders?

```ts
optional unprotectedHeaders?: JsonValue;
```

##### requestedElements

```ts
requestedElements: {
  elementIdentifier: string;
  intentToRetain: boolean;
  namespace: string;
}[];
```

Defined in: [src/wire/inspect-request.ts:17](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L17)

###### elementIdentifier

```ts
elementIdentifier: string;
```

###### intentToRetain

```ts
intentToRetain: boolean;
```

###### namespace

```ts
namespace: string;
```

##### requestInfo?

```ts
optional requestInfo?: JsonValue;
```

Defined in: [src/wire/inspect-request.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L22)

##### smartHealthCheckin

```ts
smartHealthCheckin: SmartRequestInspection;
```

Defined in: [src/wire/inspect-request.ts:23](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L23)

***

### JsonValue

```ts
type JsonValue = 
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | {
[key: string]: JsonValue;
};
```

Defined in: [src/wire/cbor.ts:16](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L16)

***

### OpenWalletResponseResult

```ts
type OpenWalletResponseResult = {
  dcapiResponse: DcapiResponseInspection;
  deviceResponse: DeviceResponseInspection;
  deviceResponseBytes: Uint8Array;
  smartResponseValidation?: {
     ok: true;
     value: SmartCheckinResponse;
  };
};
```

Defined in: [src/wire/response.ts:107](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L107)

#### Properties

##### dcapiResponse

```ts
dcapiResponse: DcapiResponseInspection;
```

Defined in: [src/wire/response.ts:108](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L108)

##### deviceResponse

```ts
deviceResponse: DeviceResponseInspection;
```

Defined in: [src/wire/response.ts:110](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L110)

##### deviceResponseBytes

```ts
deviceResponseBytes: Uint8Array;
```

Defined in: [src/wire/response.ts:109](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L109)

##### smartResponseValidation?

```ts
optional smartResponseValidation?: {
  ok: true;
  value: SmartCheckinResponse;
};
```

Defined in: [src/wire/response.ts:111](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L111)

###### ok

```ts
ok: true;
```

###### value

```ts
value: SmartCheckinResponse;
```

***

### OrgIsoMdocInspection

```ts
type OrgIsoMdocInspection = {
  deviceRequest: DeviceRequestInspection;
  encryptionInfo?: EncryptionInfoInspection;
  protocol: typeof PROTOCOL_ID;
  sessionTranscript?: {
     diagnostic: string;
     hex: string;
     origin: string;
  };
};
```

Defined in: [src/wire/inspect-request.ts:56](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L56)

#### Properties

##### deviceRequest

```ts
deviceRequest: DeviceRequestInspection;
```

Defined in: [src/wire/inspect-request.ts:58](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L58)

##### encryptionInfo?

```ts
optional encryptionInfo?: EncryptionInfoInspection;
```

Defined in: [src/wire/inspect-request.ts:59](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L59)

##### protocol

```ts
protocol: typeof PROTOCOL_ID;
```

Defined in: [src/wire/inspect-request.ts:57](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L57)

##### sessionTranscript?

```ts
optional sessionTranscript?: {
  diagnostic: string;
  hex: string;
  origin: string;
};
```

Defined in: [src/wire/inspect-request.ts:60](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L60)

###### diagnostic

```ts
diagnostic: string;
```

###### hex

```ts
hex: string;
```

###### origin

```ts
origin: string;
```

***

### OrgIsoMdocNavigatorArgument

```ts
type OrgIsoMdocNavigatorArgument = {
  digital: {
     requests: [{
        data: {
           deviceRequest: string;
           encryptionInfo: string;
        };
        protocol: typeof PROTOCOL_ID;
     }];
  };
  mediation: "required";
};
```

Defined in: [src/wire/request.ts:31](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L31)

#### Properties

##### digital

```ts
digital: {
  requests: [{
     data: {
        deviceRequest: string;
        encryptionInfo: string;
     };
     protocol: typeof PROTOCOL_ID;
  }];
};
```

Defined in: [src/wire/request.ts:33](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L33)

###### requests

```ts
requests: [{
  data: {
     deviceRequest: string;
     encryptionInfo: string;
  };
  protocol: typeof PROTOCOL_ID;
}];
```

##### mediation

```ts
mediation: "required";
```

Defined in: [src/wire/request.ts:32](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L32)

***

### OrgIsoMdocRequestBundle

```ts
type OrgIsoMdocRequestBundle = {
  deviceRequestBytes: Uint8Array;
  encryptionInfoBytes: Uint8Array;
  itemsRequestTag24Bytes: Uint8Array;
  navigatorArgument: OrgIsoMdocNavigatorArgument;
  nonce: Uint8Array;
  readerAuthBytes?: Uint8Array;
  readerCertificateDer?: Uint8Array;
  readerKeyPair?: CryptoKeyPair;
  readerPublicJwk?: JsonWebKey;
  requestedElementIdentifier: string;
  sessionTranscriptBytes?: Uint8Array;
  smartRequestJson: string;
  verifierKeyPair: CryptoKeyPair;
  verifierPublicJwk: JsonWebKey;
};
```

Defined in: [src/wire/request.ts:46](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L46)

#### Properties

##### deviceRequestBytes

```ts
deviceRequestBytes: Uint8Array;
```

Defined in: [src/wire/request.ts:53](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L53)

##### encryptionInfoBytes

```ts
encryptionInfoBytes: Uint8Array;
```

Defined in: [src/wire/request.ts:54](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L54)

##### itemsRequestTag24Bytes

```ts
itemsRequestTag24Bytes: Uint8Array;
```

Defined in: [src/wire/request.ts:55](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L55)

##### navigatorArgument

```ts
navigatorArgument: OrgIsoMdocNavigatorArgument;
```

Defined in: [src/wire/request.ts:47](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L47)

##### nonce

```ts
nonce: Uint8Array;
```

Defined in: [src/wire/request.ts:50](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L50)

##### readerAuthBytes?

```ts
optional readerAuthBytes?: Uint8Array;
```

Defined in: [src/wire/request.ts:57](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L57)

##### readerCertificateDer?

```ts
optional readerCertificateDer?: Uint8Array;
```

Defined in: [src/wire/request.ts:60](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L60)

##### readerKeyPair?

```ts
optional readerKeyPair?: CryptoKeyPair;
```

Defined in: [src/wire/request.ts:58](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L58)

##### readerPublicJwk?

```ts
optional readerPublicJwk?: JsonWebKey;
```

Defined in: [src/wire/request.ts:59](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L59)

##### requestedElementIdentifier

```ts
requestedElementIdentifier: string;
```

Defined in: [src/wire/request.ts:51](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L51)

##### sessionTranscriptBytes?

```ts
optional sessionTranscriptBytes?: Uint8Array;
```

Defined in: [src/wire/request.ts:56](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L56)

##### smartRequestJson

```ts
smartRequestJson: string;
```

Defined in: [src/wire/request.ts:52](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L52)

##### verifierKeyPair

```ts
verifierKeyPair: CryptoKeyPair;
```

Defined in: [src/wire/request.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L48)

##### verifierPublicJwk

```ts
verifierPublicJwk: JsonWebKey;
```

Defined in: [src/wire/request.ts:49](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L49)

***

### ReaderIdentity

```ts
type ReaderIdentity = {
  certificateDer: Uint8Array;
  keyPair: CryptoKeyPair;
  publicJwk: JsonWebKey;
};
```

Defined in: [src/wire/reader-auth.ts:11](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L11)

#### Properties

##### certificateDer

```ts
certificateDer: Uint8Array;
```

Defined in: [src/wire/reader-auth.ts:14](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L14)

##### keyPair

```ts
keyPair: CryptoKeyPair;
```

Defined in: [src/wire/reader-auth.ts:12](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L12)

##### publicJwk

```ts
publicJwk: JsonWebKey;
```

Defined in: [src/wire/reader-auth.ts:13](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L13)

***

### SmartRequestCarrierResolution

```ts
type SmartRequestCarrierResolution = {
  companionElementIdentifier?: string;
  companionPresent: boolean;
  json?: string;
  requestInfoPresent: boolean;
  source: "requestInfo" | "companion" | "none";
};
```

Defined in: [src/wire/inspect-request.ts:33](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L33)

#### Properties

##### companionElementIdentifier?

```ts
optional companionElementIdentifier?: string;
```

Defined in: [src/wire/inspect-request.ts:38](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L38)

##### companionPresent

```ts
companionPresent: boolean;
```

Defined in: [src/wire/inspect-request.ts:37](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L37)

##### json?

```ts
optional json?: string;
```

Defined in: [src/wire/inspect-request.ts:34](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L34)

##### requestInfoPresent

```ts
requestInfoPresent: boolean;
```

Defined in: [src/wire/inspect-request.ts:36](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L36)

##### source

```ts
source: "requestInfo" | "companion" | "none";
```

Defined in: [src/wire/inspect-request.ts:35](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L35)

***

### SmartRequestInspection

```ts
type SmartRequestInspection = 
  | {
  json: string;
  present: true;
  valid: true;
  value: SmartCheckinRequest;
}
  | {
  error: string;
  json: string;
  present: true;
  valid: false;
}
  | {
  present: false;
};
```

Defined in: [src/wire/response.ts:61](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L61)

***

### SmartResponseInspection

```ts
type SmartResponseInspection = 
  | {
  json: string;
  present: true;
  valid: true;
  value: SmartCheckinResponse;
}
  | {
  error: string;
  json: string;
  present: true;
  valid: false;
}
  | {
  present: false;
};
```

Defined in: [src/wire/response.ts:56](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L56)

## Variables

### MDOC\_DOC\_TYPE

```ts
const MDOC_DOC_TYPE: "org.smarthealthit.checkin.1";
```

Defined in: [src/wire/request.ts:25](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L25)

***

### MDOC\_NAMESPACE

```ts
const MDOC_NAMESPACE: "org.smarthealthit.checkin";
```

Defined in: [src/wire/request.ts:26](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L26)

***

### PROTOCOL\_ID

```ts
const PROTOCOL_ID: "org-iso-mdoc";
```

Defined in: [src/wire/request.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L24)

***

### SMART\_REQUEST\_COMPANION\_ELEMENT\_PREFIX

```ts
const SMART_REQUEST_COMPANION_ELEMENT_PREFIX: "smart_request_b64u.";
```

Defined in: [src/wire/request.ts:29](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L29)

***

### SMART\_REQUEST\_INFO\_KEY

```ts
const SMART_REQUEST_INFO_KEY: "org.smarthealthit.checkin.request";
```

Defined in: [src/wire/request.ts:27](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L27)

***

### SMART\_RESPONSE\_ELEMENT\_ID

```ts
const SMART_RESPONSE_ELEMENT_ID: "smart_health_checkin_response";
```

Defined in: [src/wire/request.ts:28](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L28)

## Functions

### arrayBufferCopy()

```ts
function arrayBufferCopy(bytes): ArrayBuffer;
```

Defined in: [src/wire/bytes.ts:73](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L73)

Copy into a fresh ArrayBuffer (WebCrypto inputs must not be SharedArrayBuffer views).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

`ArrayBuffer`

***

### base64UrlDecodeBytes()

```ts
function base64UrlDecodeBytes(s): Uint8Array;
```

Defined in: [src/wire/bytes.ts:14](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L14)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `s` | `string` |

#### Returns

`Uint8Array`

***

### base64UrlDecodeUtf8()

```ts
function base64UrlDecodeUtf8(s): string;
```

Defined in: [src/wire/bytes.ts:26](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L26)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `s` | `string` |

#### Returns

`string`

***

### base64UrlEncodeBytes()

```ts
function base64UrlEncodeBytes(bytes): string;
```

Defined in: [src/wire/bytes.ts:6](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L6)

Byte and encoding primitives shared across the wire layer.
Ported from smart-health-checkin-mdoc rp-web/src/protocol/index.ts.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

`string`

***

### base64UrlEncodeUtf8()

```ts
function base64UrlEncodeUtf8(s): string;
```

Defined in: [src/wire/bytes.ts:22](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L22)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `s` | `string` |

#### Returns

`string`

***

### buildDcapiMdocResponse()

```ts
function buildDcapiMdocResponse(input): DcapiMdocResponse;
```

Defined in: [src/wire/response.ts:114](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L114)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `cipherText`: `Uint8Array`; `enc`: `Uint8Array`; \} |
| `input.cipherText` | `Uint8Array` |
| `input.enc` | `Uint8Array` |

#### Returns

[`DcapiMdocResponse`](#dcapimdocresponse)

***

### buildDcapiSessionTranscript()

```ts
function buildDcapiSessionTranscript(input): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [src/wire/request.ts:258](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L258)

SessionTranscript (spec §8.3) — both verifier and wallet compute this
identically:
  dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
  handover  = ["dcapi", SHA-256(dcapiInfo)]
  SessionTranscript = CBOR([null, null, handover])

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `encryptionInfo`: `string` \| `Uint8Array`\<`ArrayBufferLike`\>; `origin`: `string`; \} |
| `input.encryptionInfo` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> |
| `input.origin` | `string` |

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### buildDeviceAuthenticationBytes()

```ts
function buildDeviceAuthenticationBytes(input): Uint8Array;
```

Defined in: [src/wire/verify.ts:161](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L161)

DeviceAuthentication (ISO/IEC 18013-5):
  DeviceAuthentication = ["DeviceAuthentication", SessionTranscript,
                          DocType, DeviceNameSpacesBytes]
  DeviceAuthenticationBytes = #6.24(bstr .cbor DeviceAuthentication)
The deviceSignature COSE_Sign1 carries a detached payload equal to
DeviceAuthenticationBytes.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `deviceNameSpaces`: `unknown`; `docType`: `string`; `sessionTranscript`: `Uint8Array`; \} |
| `input.deviceNameSpaces` | `unknown` |
| `input.docType` | `string` |
| `input.sessionTranscript` | `Uint8Array` |

#### Returns

`Uint8Array`

***

### buildDeviceRequestBytes()

```ts
function buildDeviceRequestBytes(input): Uint8Array;
```

Defined in: [src/wire/request.ts:156](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L156)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `responseElementIdentifier?`: `string`; `smartRequestJson`: `string`; `version?`: `"1.0"` \| `"1.1"`; \} |
| `input.responseElementIdentifier?` | `string` |
| `input.smartRequestJson` | `string` |
| `input.version?` | `"1.0"` \| `"1.1"` |

#### Returns

`Uint8Array`

***

### buildDeviceRequestBytesFromParts()

```ts
function buildDeviceRequestBytesFromParts(input): Uint8Array;
```

Defined in: [src/wire/request.ts:198](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L198)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `itemsRequestTag24Bytes`: `Uint8Array`; `readerAuthBytes?`: `Uint8Array`\<`ArrayBufferLike`\>; `version`: `"1.0"` \| `"1.1"`; \} |
| `input.itemsRequestTag24Bytes` | `Uint8Array` |
| `input.readerAuthBytes?` | `Uint8Array`\<`ArrayBufferLike`\> |
| `input.version` | `"1.0"` \| `"1.1"` |

#### Returns

`Uint8Array`

***

### buildEncryptionInfoBytes()

```ts
function buildEncryptionInfoBytes(input): Uint8Array;
```

Defined in: [src/wire/request.ts:238](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L238)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `nonce`: `Uint8Array`; `recipientPublicJwk`: `JsonWebKey`; \} |
| `input.nonce` | `Uint8Array` |
| `input.recipientPublicJwk` | `JsonWebKey` |

#### Returns

`Uint8Array`

***

### buildItemsRequestTag24Bytes()

```ts
function buildItemsRequestTag24Bytes(input): Uint8Array;
```

Defined in: [src/wire/request.ts:167](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L167)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | \{ `includeCompanionElement?`: `boolean`; `responseElementIdentifier?`: `string`; `smartRequestJson`: `string`; \} | - |
| `input.includeCompanionElement?` | `boolean` | Also carry the request JSON as a `smart_request_b64u.<b64u>` requested element, for wallets that cannot read `requestInfo`. Off by default: the spec's primary carrier is requestInfo, the real platform captures omit the companion, and it roughly doubles the request size. |
| `input.responseElementIdentifier?` | `string` | - |
| `input.smartRequestJson` | `string` | - |

#### Returns

`Uint8Array`

***

### buildOrgIsoMdocRequest()

```ts
function buildOrgIsoMdocRequest(smartRequest, options?): Promise<OrgIsoMdocRequestBundle>;
```

Defined in: [src/wire/request.ts:63](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L63)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `smartRequest` | [`SmartCheckinRequest`](checkin.md#smartcheckinrequest) |
| `options` | \{ `deviceRequestVersion?`: `"1.0"` \| `"1.1"`; `includeCompanionElement?`: `boolean`; `nonce?`: `Uint8Array`\<`ArrayBufferLike`\>; `origin?`: `string`; `readerAuth?`: `boolean`; `readerIdentity?`: [`ReaderIdentity`](#readeridentity); `responseElementIdentifier?`: `string`; `verifierKeyPair?`: `CryptoKeyPair`; \} |
| `options.deviceRequestVersion?` | `"1.0"` \| `"1.1"` |
| `options.includeCompanionElement?` | `boolean` |
| `options.nonce?` | `Uint8Array`\<`ArrayBufferLike`\> |
| `options.origin?` | `string` |
| `options.readerAuth?` | `boolean` |
| `options.readerIdentity?` | [`ReaderIdentity`](#readeridentity) |
| `options.responseElementIdentifier?` | `string` |
| `options.verifierKeyPair?` | `CryptoKeyPair` |

#### Returns

`Promise`\<[`OrgIsoMdocRequestBundle`](#orgisomdocrequestbundle)\>

***

### buildReaderAuthenticationBytes()

```ts
function buildReaderAuthenticationBytes(input): Uint8Array;
```

Defined in: [src/wire/reader-auth.ts:33](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L33)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `itemsRequestTag24Bytes`: `Uint8Array`; `sessionTranscriptBytes`: `Uint8Array`; \} |
| `input.itemsRequestTag24Bytes` | `Uint8Array` |
| `input.sessionTranscriptBytes` | `Uint8Array` |

#### Returns

`Uint8Array`

***

### buildSmartRequestCompanionElementIdentifier()

```ts
function buildSmartRequestCompanionElementIdentifier(smartRequestJson): string;
```

Defined in: [src/wire/request.ts:271](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L271)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `smartRequestJson` | `string` |

#### Returns

`string`

***

### bytesEqual()

```ts
function bytesEqual(a, b): boolean;
```

Defined in: [src/wire/bytes.ts:68](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L68)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `a` | `Uint8Array` |
| `b` | `Uint8Array` |

#### Returns

`boolean`

***

### cborDecode()

```ts
function cborDecode(bytes): unknown;
```

Defined in: [src/wire/cbor.ts:83](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L83)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

`unknown`

***

### cborDiagnostic()

```ts
function cborDiagnostic(value): string;
```

Defined in: [src/wire/cbor.ts:187](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L187)

CBOR diagnostic notation (subset), for debug UIs and fixtures.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

#### Returns

`string`

***

### cborEncode()

```ts
function cborEncode(value): Uint8Array;
```

Defined in: [src/wire/cbor.ts:24](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L24)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

#### Returns

`Uint8Array`

***

### cborToJsonValue()

```ts
function cborToJsonValue(value): JsonValue;
```

Defined in: [src/wire/cbor.ts:209](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L209)

Lossy JSON projection of decoded CBOR (bytes → {$bytes, hex}, tags → {$tag, value}).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

#### Returns

[`JsonValue`](#jsonvalue)

***

### certificateSubjectPublicKeyInfo()

```ts
function certificateSubjectPublicKeyInfo(certificateDer): Uint8Array;
```

Defined in: [src/wire/reader-auth.ts:183](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L183)

Extract the SubjectPublicKeyInfo (DER) from an X.509 certificate.

Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
TBSCertificate ::= SEQUENCE { [0] version OPTIONAL, serialNumber, signature,
  issuer, validity, subject, subjectPublicKeyInfo, ... }

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `certificateDer` | `Uint8Array` |

#### Returns

`Uint8Array`

***

### compareBytes()

```ts
function compareBytes(a, b): number;
```

Defined in: [src/wire/bytes.ts:59](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L59)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `a` | `Uint8Array` |
| `b` | `Uint8Array` |

#### Returns

`number`

***

### concatBytes()

```ts
function concatBytes(parts): Uint8Array;
```

Defined in: [src/wire/bytes.ts:48](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L48)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `parts` | readonly `Uint8Array`\<`ArrayBufferLike`\>[] |

#### Returns

`Uint8Array`

***

### createEphemeralReaderIdentity()

```ts
function createEphemeralReaderIdentity(subjectCommonName?): Promise<ReaderIdentity>;
```

Defined in: [src/wire/reader-auth.ts:17](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L17)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `subjectCommonName` | `string` | `"SMART Health Check-in Demo Verifier"` |

#### Returns

`Promise`\<[`ReaderIdentity`](#readeridentity)\>

***

### decodeSmartRequestCompanionElementIdentifier()

```ts
function decodeSmartRequestCompanionElementIdentifier(elementIdentifier): string | undefined;
```

Defined in: [src/wire/request.ts:277](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L277)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `elementIdentifier` | `string` |

#### Returns

`string` \| `undefined`

***

### extractDcapiResponse()

```ts
function extractDcapiResponse(credential): string | DcapiMdocResponse;
```

Defined in: [src/browser/index.ts:201](https://github.com/smart-health-checkin/client/blob/main/src/browser/index.ts#L201)

Pull the org-iso-mdoc response payload out of whatever the browser's
credential object looks like: a DigitalCredential with `.data` (object or
JSON string), a bare `{protocol, data}` object, or the raw base64url
response string.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `credential` | `unknown` |

#### Returns

`string` \| [`DcapiMdocResponse`](#dcapimdocresponse)

***

### firstSmartCheckinResponse()

```ts
function firstSmartCheckinResponse(deviceResponse): SmartResponseInspection;
```

Defined in: [src/wire/response.ts:277](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L277)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `deviceResponse` | [`DeviceResponseInspection`](#deviceresponseinspection) |

#### Returns

[`SmartResponseInspection`](#smartresponseinspection)

***

### hex()

```ts
function hex(bytes): string;
```

Defined in: [src/wire/bytes.ts:30](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L30)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

`string`

***

### hexDecode()

```ts
function hexDecode(s): Uint8Array;
```

Defined in: [src/wire/bytes.ts:34](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L34)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `s` | `string` |

#### Returns

`Uint8Array`

***

### hpkeAesGcm()

```ts
function hpkeAesGcm(encrypt, input): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [src/wire/hpke.ts:108](https://github.com/smart-health-checkin/client/blob/main/src/wire/hpke.ts#L108)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `encrypt` | `boolean` |
| `input` | \{ `aad`: `Uint8Array`; `data`: `Uint8Array`; `key`: `Uint8Array`; `nonce`: `Uint8Array`; \} |
| `input.aad` | `Uint8Array` |
| `input.data` | `Uint8Array` |
| `input.key` | `Uint8Array` |
| `input.nonce` | `Uint8Array` |

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### hpkeContext()

```ts
function hpkeContext(input): Promise<{
  baseNonce: Uint8Array;
  key: Uint8Array;
}>;
```

Defined in: [src/wire/hpke.ts:17](https://github.com/smart-health-checkin/client/blob/main/src/wire/hpke.ts#L17)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `dh`: `Uint8Array`; `enc`: `Uint8Array`; `info`: `Uint8Array`; `recipientPublicBytes`: `Uint8Array`; \} |
| `input.dh` | `Uint8Array` |
| `input.enc` | `Uint8Array` |
| `input.info` | `Uint8Array` |
| `input.recipientPublicBytes` | `Uint8Array` |

#### Returns

`Promise`\<\{
  `baseNonce`: `Uint8Array`;
  `key`: `Uint8Array`;
\}\>

***

### hpkeNonce()

```ts
function hpkeNonce(baseNonce, sequenceNumber?): Uint8Array;
```

Defined in: [src/wire/hpke.ts:131](https://github.com/smart-health-checkin/client/blob/main/src/wire/hpke.ts#L131)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `baseNonce` | `Uint8Array` | `undefined` |
| `sequenceNumber` | `number` | `0` |

#### Returns

`Uint8Array`

***

### hpkeSealDirectMdoc()

```ts
function hpkeSealDirectMdoc(input): Promise<HpkeSealResult>;
```

Defined in: [src/wire/response.ts:160](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L160)

Wallet-side seal — used by tests and the demo's mock wallet.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `aad?`: `Uint8Array`\<`ArrayBufferLike`\>; `info`: `Uint8Array`; `plaintext`: `Uint8Array`; `recipientPublicJwk`: `JsonWebKey`; \} |
| `input.aad?` | `Uint8Array`\<`ArrayBufferLike`\> |
| `input.info` | `Uint8Array` |
| `input.plaintext` | `Uint8Array` |
| `input.recipientPublicJwk` | `JsonWebKey` |

#### Returns

`Promise`\<[`HpkeSealResult`](#hpkesealresult)\>

***

### i2osp()

```ts
function i2osp(value, length): Uint8Array;
```

Defined in: [src/wire/bytes.ts:83](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L83)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `number` |
| `length` | `number` |

#### Returns

`Uint8Array`

***

### importCertificatePublicKey()

```ts
function importCertificatePublicKey(certificateDer): Promise<CryptoKey>;
```

Defined in: [src/wire/reader-auth.ts:197](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L197)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `certificateDer` | `Uint8Array` |

#### Returns

`Promise`\<`CryptoKey`\>

***

### inspectDcapiMdocResponse()

```ts
function inspectDcapiMdocResponse(input): DcapiResponseInspection;
```

Defined in: [src/wire/response.ts:133](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L133)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` \| [`DcapiMdocResponse`](#dcapimdocresponse) |

#### Returns

[`DcapiResponseInspection`](#dcapiresponseinspection)

***

### inspectDeviceRequestBytes()

```ts
function inspectDeviceRequestBytes(bytes): DeviceRequestInspection;
```

Defined in: [src/wire/inspect-request.ts:99](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L99)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

[`DeviceRequestInspection`](#devicerequestinspection)

***

### inspectDeviceResponseBytes()

```ts
function inspectDeviceResponseBytes(bytes): Promise<DeviceResponseInspection>;
```

Defined in: [src/wire/response.ts:288](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L288)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

`Promise`\<[`DeviceResponseInspection`](#deviceresponseinspection)\>

***

### inspectEncryptionInfoBytes()

```ts
function inspectEncryptionInfoBytes(bytes): EncryptionInfoInspection;
```

Defined in: [src/wire/inspect-request.ts:179](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L179)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

[`EncryptionInfoInspection`](#encryptioninfoinspection)

***

### inspectItemsRequestBytes()

```ts
function inspectItemsRequestBytes(bytes): ItemsRequestInspection;
```

Defined in: [src/wire/inspect-request.ts:130](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L130)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

[`ItemsRequestInspection`](#itemsrequestinspection)

***

### inspectOrgIsoMdocNavigatorArgument()

```ts
function inspectOrgIsoMdocNavigatorArgument(arg, options?): Promise<OrgIsoMdocInspection>;
```

Defined in: [src/wire/inspect-request.ts:67](https://github.com/smart-health-checkin/client/blob/main/src/wire/inspect-request.ts#L67)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arg` | `unknown` |
| `options` | \{ `origin?`: `string`; \} |
| `options.origin?` | `string` |

#### Returns

`Promise`\<[`OrgIsoMdocInspection`](#orgisomdocinspection)\>

***

### inspectSmartRequestInfoValue()

```ts
function inspectSmartRequestInfoValue(value): SmartRequestInspection;
```

Defined in: [src/wire/response.ts:446](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L446)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

#### Returns

[`SmartRequestInspection`](#smartrequestinspection)

***

### mapGet()

```ts
function mapGet(value, key): unknown;
```

Defined in: [src/wire/cbor.ts:249](https://github.com/smart-health-checkin/client/blob/main/src/wire/cbor.ts#L249)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |
| `key` | `string` \| `number` |

#### Returns

`unknown`

***

### openWalletResponse()

```ts
function openWalletResponse(input): Promise<OpenWalletResponseResult>;
```

Defined in: [src/wire/response.ts:206](https://github.com/smart-health-checkin/client/blob/main/src/wire/response.ts#L206)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `aad?`: `Uint8Array`\<`ArrayBufferLike`\>; `recipientPrivateKey`: `CryptoKey`; `recipientPublicJwk`: `JsonWebKey`; `response`: `string` \| [`DcapiMdocResponse`](#dcapimdocresponse); `sessionTranscript`: `Uint8Array`; `smartRequest?`: `unknown`; \} |
| `input.aad?` | `Uint8Array`\<`ArrayBufferLike`\> |
| `input.recipientPrivateKey` | `CryptoKey` |
| `input.recipientPublicJwk` | `JsonWebKey` |
| `input.response` | `string` \| [`DcapiMdocResponse`](#dcapimdocresponse) |
| `input.sessionTranscript` | `Uint8Array` |
| `input.smartRequest?` | `unknown` |

#### Returns

`Promise`\<[`OpenWalletResponseResult`](#openwalletresponseresult)\>

***

### publicJwkToCoseKey()

```ts
function publicJwkToCoseKey(jwk): Map<number, number | Uint8Array<ArrayBufferLike>>;
```

Defined in: [src/wire/request.ts:215](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L215)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `jwk` | `JsonWebKey` |

#### Returns

`Map`\<`number`, `number` \| `Uint8Array`\<`ArrayBufferLike`\>\>

***

### publicJwkToRawP256()

```ts
function publicJwkToRawP256(jwk): Uint8Array;
```

Defined in: [src/wire/request.ts:227](https://github.com/smart-health-checkin/client/blob/main/src/wire/request.ts#L227)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `jwk` | `JsonWebKey` |

#### Returns

`Uint8Array`

***

### sha256()

```ts
function sha256(bytes): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [src/wire/bytes.ts:79](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L79)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### signReaderAuth()

```ts
function signReaderAuth(input): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [src/wire/reader-auth.ts:46](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L46)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `itemsRequestTag24Bytes`: `Uint8Array`; `readerCertificateDer`: `Uint8Array`; `readerPrivateKey`: `CryptoKey`; `sessionTranscriptBytes`: `Uint8Array`; \} |
| `input.itemsRequestTag24Bytes` | `Uint8Array` |
| `input.readerCertificateDer` | `Uint8Array` |
| `input.readerPrivateKey` | `CryptoKey` |
| `input.sessionTranscriptBytes` | `Uint8Array` |

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### utf8()

```ts
function utf8(s): Uint8Array;
```

Defined in: [src/wire/bytes.ts:44](https://github.com/smart-health-checkin/client/blob/main/src/wire/bytes.ts#L44)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `s` | `string` |

#### Returns

`Uint8Array`

***

### verifyDeviceResponseSignatures()

```ts
function verifyDeviceResponseSignatures(input): Promise<DocumentVerification[]>;
```

Defined in: [src/wire/verify.ts:55](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L55)

Verify every document in a DeviceResponse. All three checks are reported
independently so a caller can apply deployment trust policy (e.g. accept a
self-attested wallet chain while still requiring a valid signature).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `deviceResponseBytes`: `Uint8Array`; `sessionTranscript`: `Uint8Array`; \} |
| `input.deviceResponseBytes` | `Uint8Array` |
| `input.sessionTranscript` | `Uint8Array` |

#### Returns

`Promise`\<[`DocumentVerification`](#documentverification)[]\>

***

### verifyIssuerAuth()

```ts
function verifyIssuerAuth(issuerAuthRaw): Promise<IssuerAuthVerification>;
```

Defined in: [src/wire/verify.ts:95](https://github.com/smart-health-checkin/client/blob/main/src/wire/verify.ts#L95)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `issuerAuthRaw` | `unknown` |

#### Returns

`Promise`\<[`IssuerAuthVerification`](#issuerauthverification)\>

***

### verifyReaderAuthSignature()

```ts
function verifyReaderAuthSignature(input): Promise<boolean>;
```

Defined in: [src/wire/reader-auth.ts:66](https://github.com/smart-health-checkin/client/blob/main/src/wire/reader-auth.ts#L66)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `itemsRequestTag24Bytes`: `Uint8Array`; `readerAuthBytes`: `Uint8Array`; `readerPublicKey`: `CryptoKey`; `sessionTranscriptBytes`: `Uint8Array`; \} |
| `input.itemsRequestTag24Bytes` | `Uint8Array` |
| `input.readerAuthBytes` | `Uint8Array` |
| `input.readerPublicKey` | `CryptoKey` |
| `input.sessionTranscriptBytes` | `Uint8Array` |

#### Returns

`Promise`\<`boolean`\>
