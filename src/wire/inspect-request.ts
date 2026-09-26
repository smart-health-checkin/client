/**
 * Diagnostics for the request side: decode a DeviceRequest, an
 * EncryptionInfo, or a whole Digital Credentials API argument into readable
 * form (hex, CBOR diagnostic notation, JSON, and the SMART request inside).
 * Used by the spec repo's inspection tools; not needed to run a check-in.
 */
import { base64UrlDecodeBytes, base64UrlEncodeBytes, hex } from "./bytes.js";
import { CborTag, cborDecode, cborDiagnostic, cborEncode, cborToJsonValue, mapGet, type JsonValue } from "./cbor.js";
import { buildDcapiSessionTranscript, PROTOCOL_ID, SMART_REQUEST_INFO_KEY } from "./request.js";
import { inspectSmartRequestInfoValue, type SmartRequestInspection } from "./response.js";

export type ItemsRequestInspection = {
  itemsRequestHex: string;
  itemsRequestDiagnostic: string;
  itemsRequest: JsonValue;
  docType?: string;
  requestedElements: Array<{
    namespace: string;
    elementIdentifier: string;
    intentToRetain: boolean;
  }>;
  requestInfo?: JsonValue;
  smartHealthCheckin: SmartRequestInspection;
  readerAuth?: {
    readerAuthHex: string;
    payloadIsDetached: boolean;
    protectedHeaders?: JsonValue;
    unprotectedHeaders?: JsonValue;
    signatureHex?: string;
  };
};

export type SmartRequestCarrierResolution = {
  json?: string;
  source: "requestInfo" | "companion" | "none";
  requestInfoPresent: boolean;
  companionPresent: boolean;
  companionElementIdentifier?: string;
};

export type DeviceRequestInspection = {
  deviceRequestHex: string;
  deviceRequestDiagnostic: string;
  deviceRequest: JsonValue;
  docRequests: ItemsRequestInspection[];
};

export type EncryptionInfoInspection = {
  encryptionInfoHex: string;
  encryptionInfoDiagnostic: string;
  encryptionInfo: JsonValue;
  nonce?: { hex: string; base64url: string };
  recipientPublicKey?: JsonValue;
};

export type OrgIsoMdocInspection = {
  protocol: typeof PROTOCOL_ID;
  deviceRequest: DeviceRequestInspection;
  encryptionInfo?: EncryptionInfoInspection;
  sessionTranscript?: {
    origin: string;
    hex: string;
    diagnostic: string;
  };
};

export async function inspectOrgIsoMdocNavigatorArgument(
  arg: unknown,
  options: { origin?: string } = {},
): Promise<OrgIsoMdocInspection> {
  const request = extractOrgIsoMdocRequest(arg);
  const deviceRequestBytes = base64UrlDecodeBytes(request.data.deviceRequest);
  const encryptionInfoBytes = request.data.encryptionInfo
    ? base64UrlDecodeBytes(request.data.encryptionInfo)
    : undefined;
  const inspection: OrgIsoMdocInspection = {
    protocol: PROTOCOL_ID,
    deviceRequest: inspectDeviceRequestBytes(deviceRequestBytes),
  };

  if (encryptionInfoBytes) {
    inspection.encryptionInfo = inspectEncryptionInfoBytes(encryptionInfoBytes);
    if (options.origin) {
      const sessionTranscript = await buildDcapiSessionTranscript({
        origin: options.origin,
        encryptionInfo: encryptionInfoBytes,
      });
      inspection.sessionTranscript = {
        origin: options.origin,
        hex: hex(sessionTranscript),
        diagnostic: cborDiagnostic(cborDecode(sessionTranscript)),
      };
    }
  }

  return inspection;
}

export function inspectDeviceRequestBytes(bytes: Uint8Array): DeviceRequestInspection {
  const decoded = cborDecode(bytes);
  const docRequests = mapGet(decoded, "docRequests");
  const inspections: ItemsRequestInspection[] = [];

  if (Array.isArray(docRequests)) {
    for (const docRequest of docRequests) {
      const itemsRequestTag = mapGet(docRequest, "itemsRequest");
      if (!(itemsRequestTag instanceof CborTag) || itemsRequestTag.tag !== 24) {
        continue;
      }
      if (!(itemsRequestTag.value instanceof Uint8Array)) {
        continue;
      }
      const inspection = inspectItemsRequestBytes(itemsRequestTag.value);
      const readerAuth = mapGet(docRequest, "readerAuth");
      if (readerAuth !== undefined) {
        inspection.readerAuth = inspectReaderAuth(readerAuth);
      }
      inspections.push(inspection);
    }
  }

  return {
    deviceRequestHex: hex(bytes),
    deviceRequestDiagnostic: cborDiagnostic(decoded),
    deviceRequest: cborToJsonValue(decoded),
    docRequests: inspections,
  };
}

export function inspectItemsRequestBytes(bytes: Uint8Array): ItemsRequestInspection {
  const decoded = cborDecode(bytes);
  const docType = mapGet(decoded, "docType");
  const nameSpaces = mapGet(decoded, "nameSpaces");
  const requestInfo = mapGet(decoded, "requestInfo");
  const smartRequestJson = mapGet(requestInfo, SMART_REQUEST_INFO_KEY);
  const requestedElements: ItemsRequestInspection["requestedElements"] = [];

  if (nameSpaces instanceof Map) {
    for (const [namespace, elements] of nameSpaces.entries()) {
      if (typeof namespace !== "string" || !(elements instanceof Map)) continue;
      for (const [elementIdentifier, intentToRetain] of elements.entries()) {
        if (typeof elementIdentifier !== "string") continue;
        requestedElements.push({
          namespace,
          elementIdentifier,
          intentToRetain: intentToRetain === true,
        });
      }
    }
  }

  return {
    itemsRequestHex: hex(bytes),
    itemsRequestDiagnostic: cborDiagnostic(decoded),
    itemsRequest: cborToJsonValue(decoded),
    docType: typeof docType === "string" ? docType : undefined,
    requestedElements,
    requestInfo: requestInfo === undefined ? undefined : cborToJsonValue(requestInfo),
    smartHealthCheckin: inspectSmartRequestInfoValue(smartRequestJson),
  };
}

function inspectReaderAuth(readerAuth: unknown): NonNullable<ItemsRequestInspection["readerAuth"]> {
  const protectedBytes = Array.isArray(readerAuth) ? readerAuth[0] : undefined;
  const unprotected = Array.isArray(readerAuth) ? readerAuth[1] : undefined;
  const payload = Array.isArray(readerAuth) ? readerAuth[2] : undefined;
  const signature = Array.isArray(readerAuth) ? readerAuth[3] : undefined;
  return {
    readerAuthHex: hex(cborEncode(readerAuth)),
    payloadIsDetached: payload === null,
    protectedHeaders: protectedBytes instanceof Uint8Array
      ? cborToJsonValue(cborDecode(protectedBytes))
      : undefined,
    unprotectedHeaders: unprotected === undefined ? undefined : cborToJsonValue(unprotected),
    signatureHex: signature instanceof Uint8Array ? hex(signature) : undefined,
  };
}

export function inspectEncryptionInfoBytes(bytes: Uint8Array): EncryptionInfoInspection {
  const decoded = cborDecode(bytes);
  const fields = Array.isArray(decoded) ? decoded[1] : undefined;
  const nonce = mapGet(fields, "nonce");
  const recipientPublicKey = mapGet(fields, "recipientPublicKey");

  return {
    encryptionInfoHex: hex(bytes),
    encryptionInfoDiagnostic: cborDiagnostic(decoded),
    encryptionInfo: cborToJsonValue(decoded),
    nonce:
      nonce instanceof Uint8Array
        ? { hex: hex(nonce), base64url: base64UrlEncodeBytes(nonce) }
        : undefined,
    recipientPublicKey:
      recipientPublicKey === undefined ? undefined : cborToJsonValue(recipientPublicKey),
  };
}


function extractOrgIsoMdocRequest(arg: unknown): {
  protocol: typeof PROTOCOL_ID;
  data: { deviceRequest: string; encryptionInfo?: string };
} {
  if (typeof arg !== "object" || arg === null) {
    throw new Error("navigator argument must be an object");
  }
  const requests =
    (arg as { digital?: { requests?: unknown } }).digital?.requests ??
    (arg as { requests?: unknown }).requests;
  if (!Array.isArray(requests)) {
    throw new Error("navigator argument missing digital.requests[] or requests[]");
  }
  const request = requests.find(
    (r) => typeof r === "object" && r !== null && (r as { protocol?: unknown }).protocol === PROTOCOL_ID,
  );
  if (typeof request !== "object" || request === null) {
    throw new Error(`navigator argument has no ${PROTOCOL_ID} request`);
  }
  const data = (request as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) {
    throw new Error(`${PROTOCOL_ID} request missing data object`);
  }
  const deviceRequest = (data as { deviceRequest?: unknown }).deviceRequest;
  const encryptionInfo = (data as { encryptionInfo?: unknown }).encryptionInfo;
  if (typeof deviceRequest !== "string") {
    throw new Error(`${PROTOCOL_ID} request data.deviceRequest must be a string`);
  }
  if (encryptionInfo !== undefined && typeof encryptionInfo !== "string") {
    throw new Error(`${PROTOCOL_ID} request data.encryptionInfo must be a string`);
  }
  return {
    protocol: PROTOCOL_ID,
    data: { deviceRequest, encryptionInfo },
  };
}
