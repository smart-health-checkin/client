/**
 * Verifier-side response processing (spec §8.5): decode the
 * `["dcapi", {enc, cipherText}]` envelope, HPKE-open it, and walk the
 * DeviceResponse into an inspection structure with MSO digest checks and the
 * extracted SMART response.
 */

import {
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  validateSmartCheckinResponse,
  type SmartCheckinRequest,
  type SmartCheckinResponse,
} from "../model/index.js";
import {
  base64UrlDecodeBytes,
  base64UrlEncodeBytes,
  compareBytes,
  hex,
  sha256,
  arrayBufferCopy,
} from "./bytes.js";
import {
  CborTag,
  cborDecode,
  cborDiagnostic,
  cborEncode,
  cborToJsonValue,
  mapGet,
  type JsonValue,
} from "./cbor.js";
import { hpkeAesGcm, hpkeContext, hpkeNonce } from "./hpke.js";
import { WarningList, decodeBase64UrlLenient, type CheckinWarning } from "./warnings.js";
import {
  PROTOCOL_ID,
  SMART_REQUEST_INFO_KEY,
  SMART_RESPONSE_ELEMENT_ID,
  publicJwkToRawP256,
} from "./request.js";

export type DcapiMdocResponse = {
  protocol: typeof PROTOCOL_ID;
  data: {
    response: string;
  };
};

export type DcapiResponseInspection = {
  dcapiResponseHex: string;
  dcapiResponseDiagnostic: string;
  dcapiResponse: JsonValue;
  enc?: { hex: string; base64url: string };
  cipherText?: { hex: string; base64url: string };
};

export type SmartResponseInspection =
  | { present: true; json: string; valid: true; value: SmartCheckinResponse }
  | { present: true; json: string; valid: false; error: string }
  | { present: false };

export type SmartRequestInspection =
  | { present: true; json: string; valid: true; value: SmartCheckinRequest }
  | { present: true; json: string; valid: false; error: string }
  | { present: false };

export type IssuerSignedElementInspection = {
  namespace: string;
  digestID?: number;
  random?: { hex: string; base64url: string };
  elementIdentifier?: string;
  elementValue?: JsonValue;
  issuerSignedItemTag24Hex: string;
  issuerSignedItemDiagnostic: string;
  valueDigest?: {
    recomputedSha256: string;
    msoSha256?: string;
    matches?: boolean;
  };
  smartHealthCheckinResponse: SmartResponseInspection;
};

export type DeviceResponseDocumentInspection = {
  docType?: string;
  issuerAuth?: {
    mso?: JsonValue;
    msoDiagnostic?: string;
    digestAlgorithm?: string;
  };
  elements: IssuerSignedElementInspection[];
};

export type DeviceResponseInspection = {
  deviceResponseHex: string;
  deviceResponseDiagnostic: string;
  deviceResponse: JsonValue;
  version?: string;
  status?: number;
  documents: DeviceResponseDocumentInspection[];
};

export type HpkeSealResult = {
  enc: Uint8Array;
  cipherText: Uint8Array;
  response: DcapiMdocResponse;
};

export type OpenWalletResponseResult = {
  dcapiResponse: DcapiResponseInspection;
  deviceResponseBytes: Uint8Array;
  deviceResponse: DeviceResponseInspection;
  smartResponseValidation?: { ok: true; value: SmartCheckinResponse };
};

export function buildDcapiMdocResponse(input: {
  enc: Uint8Array;
  cipherText: Uint8Array;
}): DcapiMdocResponse {
  const response = cborEncode([
    "dcapi",
    new Map<unknown, unknown>([
      ["enc", input.enc],
      ["cipherText", input.cipherText],
    ]),
  ]);
  return {
    protocol: PROTOCOL_ID,
    data: {
      response: base64UrlEncodeBytes(response),
    },
  };
}

export function inspectDcapiMdocResponse(input: string | DcapiMdocResponse): DcapiResponseInspection {
  const response =
    typeof input === "string"
      ? input
      : typeof input.data?.response === "string"
        ? input.data.response
        : undefined;
  if (!response) throw new Error("missing direct mdoc data.response");

  const bytes = base64UrlDecodeBytes(response);
  const decoded = cborDecode(bytes);
  const fields = Array.isArray(decoded) ? decoded[1] : undefined;
  const enc = mapGet(fields, "enc");
  const cipherText = mapGet(fields, "cipherText");
  return {
    dcapiResponseHex: hex(bytes),
    dcapiResponseDiagnostic: cborDiagnostic(decoded),
    dcapiResponse: cborToJsonValue(decoded),
    enc: enc instanceof Uint8Array ? { hex: hex(enc), base64url: base64UrlEncodeBytes(enc) } : undefined,
    cipherText:
      cipherText instanceof Uint8Array
        ? { hex: hex(cipherText), base64url: base64UrlEncodeBytes(cipherText) }
        : undefined,
  };
}

/** Wallet-side seal — used by tests and the demo's mock wallet. */
export async function hpkeSealDirectMdoc(input: {
  plaintext: Uint8Array;
  recipientPublicJwk: JsonWebKey;
  info: Uint8Array;
  aad?: Uint8Array;
}): Promise<HpkeSealResult> {
  const recipientPublicKey = await crypto.subtle.importKey(
    "jwk",
    input.recipientPublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
  const ephemeralKeyPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;
  const enc = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey));
  const dh = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: recipientPublicKey },
      ephemeralKeyPair.privateKey,
      256,
    ),
  );
  const recipientPublicBytes = publicJwkToRawP256(input.recipientPublicJwk);
  const context = await hpkeContext({
    dh,
    enc,
    recipientPublicBytes,
    info: input.info,
  });
  const cipherText = await hpkeAesGcm(true, {
    key: context.key,
    nonce: hpkeNonce(context.baseNonce),
    aad: input.aad ?? new Uint8Array(),
    data: input.plaintext,
  });
  return {
    enc,
    cipherText,
    response: buildDcapiMdocResponse({ enc, cipherText }),
  };
}

export async function openWalletResponse(input: {
  response: string | DcapiMdocResponse;
  recipientPrivateKey: CryptoKey;
  recipientPublicJwk: JsonWebKey;
  sessionTranscript: Uint8Array;
  smartRequest?: unknown;
  aad?: Uint8Array;
}): Promise<OpenWalletResponseResult> {
  const dcapiResponse = inspectDcapiMdocResponse(input.response);
  if (!dcapiResponse.enc || !dcapiResponse.cipherText) {
    throw new Error("direct dcapi response missing enc or cipherText");
  }
  const enc = base64UrlDecodeBytes(dcapiResponse.enc.base64url);
  const cipherText = base64UrlDecodeBytes(dcapiResponse.cipherText.base64url);
  const deviceResponseBytes = await hpkeOpen({
    enc,
    cipherText,
    recipientPrivateKey: input.recipientPrivateKey,
    recipientPublicJwk: input.recipientPublicJwk,
    info: input.sessionTranscript,
    aad: input.aad,
  });
  const deviceResponse = await inspectDeviceResponseBytes(deviceResponseBytes);
  const smartResponseValidation =
    input.smartRequest === undefined
      ? undefined
      : validateOpenedSmartResponseAgainstRequest(input.smartRequest, deviceResponse);
  return {
    dcapiResponse,
    deviceResponseBytes,
    deviceResponse,
    smartResponseValidation,
  };
}

async function hpkeOpen(input: {
  enc: Uint8Array;
  cipherText: Uint8Array;
  recipientPrivateKey: CryptoKey;
  recipientPublicJwk: JsonWebKey;
  info: Uint8Array;
  aad?: Uint8Array;
}): Promise<Uint8Array> {
  const ephemeralPublicKey = await crypto.subtle.importKey(
    "raw",
    arrayBufferCopy(input.enc),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
  const dh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: ephemeralPublicKey }, input.recipientPrivateKey, 256),
  );
  const context = await hpkeContext({
    dh,
    enc: input.enc,
    recipientPublicBytes: publicJwkToRawP256(input.recipientPublicJwk),
    info: input.info,
  });
  return hpkeAesGcm(false, {
    key: context.key,
    nonce: hpkeNonce(context.baseNonce),
    aad: input.aad ?? new Uint8Array(),
    data: input.cipherText,
  });
}

export type OpenedCredential =
  | { ok: true; deviceResponseBytes: Uint8Array; warnings: CheckinWarning[] }
  | { ok: false; error: string; rule: string; warnings: CheckinWarning[] };

/**
 * The Verifier's first two steps (spec §8.5, [VRS-2] and [VRS-3]): decode the
 * credential and decrypt it. Fails only if it can't be decoded, lacks `enc`
 * or `cipherText`, or doesn't decrypt; a protocol other than `org-iso-mdoc`,
 * padded base64url, and a first entry other than `"dcapi"` are warnings.
 * Never throws.
 *
 * `credential` is `{protocol, data: {response}}` or the `data.response` string.
 */
export async function openWalletCredential(input: {
  credential: unknown;
  recipientPrivateKey: CryptoKey;
  recipientPublicJwk: JsonWebKey;
  sessionTranscript: Uint8Array;
}): Promise<OpenedCredential> {
  const w = new WarningList();
  const fail = (error: string, rule: string): OpenedCredential => ({ ok: false, error, rule, warnings: w.items });
  const c = input.credential as { protocol?: unknown; data?: { response?: unknown } } | string;
  let response: unknown = c;
  if (typeof c === "object" && c !== null) {
    if (c.protocol !== PROTOCOL_ID) w.add("protocol", "VRS-2", `protocol is ${JSON.stringify(c.protocol)}, not ${PROTOCOL_ID}`);
    response = c.data?.response;
  }
  if (typeof response !== "string") return fail("the credential has no data.response string", "VRS-2");
  let fields: unknown;
  try {
    const decoded = cborDecode(decodeBase64UrlLenient(response, w, "VRS-2", "data.response"), w.duplicateKeys);
    if (!Array.isArray(decoded)) return fail("data.response is not a CBOR array", "VRS-2");
    if (decoded[0] !== "dcapi") w.add("dcapi-response", "VRS-2", `the response's first entry is ${JSON.stringify(decoded[0])}, not "dcapi"`);
    fields = decoded[1];
  } catch (e) {
    return fail(`data.response can't be decoded: ${e instanceof Error ? e.message : String(e)}`, "VRS-2");
  }
  const enc = mapGet(fields, "enc");
  const cipherText = mapGet(fields, "cipherText");
  if (!(enc instanceof Uint8Array) || !(cipherText instanceof Uint8Array)) return fail("the response lacks enc or cipherText", "VRS-2");
  try {
    const deviceResponseBytes = await hpkeOpen({
      enc,
      cipherText,
      recipientPrivateKey: input.recipientPrivateKey,
      recipientPublicJwk: input.recipientPublicJwk,
      info: input.sessionTranscript,
    });
    return { ok: true, deviceResponseBytes, warnings: w.items };
  } catch {
    return fail("the response does not decrypt with this session's key, origin, and encryptionInfo", "VRS-3");
  }
}

function validateOpenedSmartResponseAgainstRequest(
  smartRequest: unknown,
  deviceResponse: DeviceResponseInspection,
): { ok: true; value: SmartCheckinResponse } {
  const response = firstSmartCheckinResponse(deviceResponse);
  if (!response.present) {
    throw new Error("SMART response is absent");
  }
  if (!response.valid) {
    throw new Error(`SMART response failed schema validation: ${response.error}`);
  }
  const validation = validateResponseAgainstRequest(smartRequest, response.value);
  if (!validation.ok) {
    throw new Error(`SMART response does not match request: ${validation.error}`);
  }
  return validation;
}

export function firstSmartCheckinResponse(
  deviceResponse: DeviceResponseInspection,
): SmartResponseInspection {
  for (const document of deviceResponse.documents) {
    for (const element of document.elements) {
      if (element.smartHealthCheckinResponse.present) return element.smartHealthCheckinResponse;
    }
  }
  return { present: false };
}

export async function inspectDeviceResponseBytes(bytes: Uint8Array): Promise<DeviceResponseInspection> {
  const decoded = cborDecode(bytes);
  const version = mapGet(decoded, "version");
  const status = mapGet(decoded, "status");
  const documents = mapGet(decoded, "documents");
  const documentInspections: DeviceResponseDocumentInspection[] = [];

  if (Array.isArray(documents)) {
    for (const document of documents) {
      documentInspections.push(await inspectDeviceResponseDocument(document));
    }
  }

  return {
    deviceResponseHex: hex(bytes),
    deviceResponseDiagnostic: cborDiagnostic(decoded),
    deviceResponse: cborToJsonValue(decoded),
    version: typeof version === "string" ? version : undefined,
    status: typeof status === "number" ? status : undefined,
    documents: documentInspections,
  };
}

async function inspectDeviceResponseDocument(
  document: unknown,
): Promise<DeviceResponseDocumentInspection> {
  const docType = mapGet(document, "docType");
  const issuerSigned = mapGet(document, "issuerSigned");
  const nameSpaces = mapGet(issuerSigned, "nameSpaces");
  const issuerAuth = inspectIssuerAuth(mapGet(issuerSigned, "issuerAuth"));
  const elements: IssuerSignedElementInspection[] = [];

  if (nameSpaces instanceof Map) {
    for (const [namespace, items] of nameSpaces.entries()) {
      if (typeof namespace !== "string" || !Array.isArray(items)) continue;
      for (const item of items) {
        elements.push(await inspectIssuerSignedItem(namespace, item, issuerAuth?.mso));
      }
    }
  }

  return {
    docType: typeof docType === "string" ? docType : undefined,
    issuerAuth,
    elements,
  };
}

function inspectIssuerAuth(issuerAuth: unknown): DeviceResponseDocumentInspection["issuerAuth"] | undefined {
  if (!Array.isArray(issuerAuth) || !(issuerAuth[2] instanceof Uint8Array)) {
    return undefined;
  }
  const msoTag = cborDecode(issuerAuth[2]);
  if (!(msoTag instanceof CborTag) || msoTag.tag !== 24 || !(msoTag.value instanceof Uint8Array)) {
    return undefined;
  }
  const mso = cborDecode(msoTag.value);
  const digestAlgorithm = mapGet(mso, "digestAlgorithm");
  return {
    mso: cborToJsonValue(mso),
    msoDiagnostic: cborDiagnostic(mso),
    digestAlgorithm: typeof digestAlgorithm === "string" ? digestAlgorithm : undefined,
  };
}

async function inspectIssuerSignedItem(
  namespace: string,
  item: unknown,
  msoJson?: JsonValue,
): Promise<IssuerSignedElementInspection> {
  if (!(item instanceof CborTag) || item.tag !== 24 || !(item.value instanceof Uint8Array)) {
    throw new Error("issuer signed item must be tag 24 around CBOR bytes");
  }

  const tag24Bytes = cborEncode(item);
  const issuerSignedItem = cborDecode(item.value);
  const digestID = mapGet(issuerSignedItem, "digestID");
  const random = mapGet(issuerSignedItem, "random");
  const elementIdentifier = mapGet(issuerSignedItem, "elementIdentifier");
  const elementValue = mapGet(issuerSignedItem, "elementValue");
  const recomputedDigest = await sha256(tag24Bytes);
  const msoDigest = lookupMsoDigest(msoJson, namespace, digestID);
  const smartHealthCheckinResponse =
    elementIdentifier === SMART_RESPONSE_ELEMENT_ID
      ? inspectSmartResponseValue(elementValue)
      : { present: false as const };

  return {
    namespace,
    digestID: typeof digestID === "number" ? digestID : undefined,
    random:
      random instanceof Uint8Array
        ? { hex: hex(random), base64url: base64UrlEncodeBytes(random) }
        : undefined,
    elementIdentifier: typeof elementIdentifier === "string" ? elementIdentifier : undefined,
    elementValue: elementValue === undefined ? undefined : cborToJsonValue(elementValue),
    issuerSignedItemTag24Hex: hex(tag24Bytes),
    issuerSignedItemDiagnostic: cborDiagnostic(issuerSignedItem),
    valueDigest: {
      recomputedSha256: hex(recomputedDigest),
      msoSha256: msoDigest ? hex(msoDigest) : undefined,
      matches: msoDigest ? compareBytes(recomputedDigest, msoDigest) === 0 : undefined,
    },
    smartHealthCheckinResponse,
  };
}

function lookupMsoDigest(msoJson: JsonValue | undefined, namespace: string, digestID: unknown): Uint8Array | undefined {
  if (
    typeof msoJson !== "object" ||
    msoJson === null ||
    Array.isArray(msoJson) ||
    typeof digestID !== "number"
  ) {
    return undefined;
  }
  const valueDigests = msoJson.valueDigests;
  if (typeof valueDigests !== "object" || valueDigests === null || Array.isArray(valueDigests)) {
    return undefined;
  }
  const namespaceDigests = valueDigests[namespace];
  if (
    typeof namespaceDigests !== "object" ||
    namespaceDigests === null ||
    Array.isArray(namespaceDigests)
  ) {
    return undefined;
  }
  const digest = namespaceDigests[String(digestID)];
  if (typeof digest !== "object" || digest === null || Array.isArray(digest)) {
    return undefined;
  }
  const encoded = digest.$bytes;
  return typeof encoded === "string" ? base64UrlDecodeBytes(encoded) : undefined;
}

function inspectSmartResponseValue(value: unknown): SmartResponseInspection {
  if (value === undefined) return { present: false };
  if (typeof value !== "string") {
    return { present: true, json: "", valid: false, error: "SMART response elementValue is not a string" };
  }
  try {
    const parsed = JSON.parse(value);
    const validated = validateSmartCheckinResponse(parsed);
    if (!validated.ok) {
      return { present: true, json: value, valid: false, error: validated.error };
    }
    return { present: true, json: value, valid: true, value: validated.value };
  } catch (e) {
    return {
      present: true,
      json: value,
      valid: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function inspectSmartRequestInfoValue(value: unknown): SmartRequestInspection {
  if (value === undefined) return { present: false };
  if (typeof value !== "string") {
    return {
      present: true,
      json: "",
      valid: false,
      error: `requestInfo["${SMART_REQUEST_INFO_KEY}"] is not a string`,
    };
  }
  try {
    const parsed = JSON.parse(value);
    const validated = validateSmartCheckinRequest(parsed);
    if (!validated.ok) {
      return { present: true, json: value, valid: false, error: validated.error };
    }
    return { present: true, json: value, valid: true, value: validated.value };
  } catch (e) {
    return {
      present: true,
      json: value,
      valid: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
