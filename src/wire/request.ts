/**
 * Verifier-side request construction for the direct `org-iso-mdoc` binding
 * (draft spec §8.2–8.3): ItemsRequest/DeviceRequest bytes, encryptionInfo,
 * SessionTranscript, and the navigator.credentials.get argument.
 * Ported from smart-health-checkin-mdoc rp-web/src/protocol/index.ts.
 */

import type { SmartCheckinRequest } from "../model/index.ts";
import {
  base64UrlDecodeBytes,
  base64UrlDecodeUtf8,
  base64UrlEncodeBytes,
  base64UrlEncodeUtf8,
  concatBytes,
  sha256,
} from "./bytes.ts";
import { CborTag, cborDecode, cborEncode } from "./cbor.ts";
import {
  createEphemeralReaderIdentity,
  signReaderAuth,
  type ReaderIdentity,
} from "./reader-auth.ts";

export const PROTOCOL_ID = "org-iso-mdoc" as const;
export const MDOC_DOC_TYPE = "org.smarthealthit.checkin.1" as const;
export const MDOC_NAMESPACE = "org.smarthealthit.checkin" as const;
export const SMART_REQUEST_INFO_KEY = "org.smarthealthit.checkin.request" as const;
export const SMART_RESPONSE_ELEMENT_ID = "smart_health_checkin_response" as const;
export const SMART_REQUEST_COMPANION_ELEMENT_PREFIX = "smart_request_b64u." as const;

export type OrgIsoMdocNavigatorArgument = {
  mediation: "required";
  digital: {
    requests: [
      {
        protocol: typeof PROTOCOL_ID;
        data: {
          deviceRequest: string;
          encryptionInfo: string;
        };
      },
    ];
  };
};

export type OrgIsoMdocRequestBundle = {
  navigatorArgument: OrgIsoMdocNavigatorArgument;
  verifierKeyPair: CryptoKeyPair;
  verifierPublicJwk: JsonWebKey;
  nonce: Uint8Array;
  requestedElementIdentifier: string;
  smartRequestJson: string;
  deviceRequestBytes: Uint8Array;
  encryptionInfoBytes: Uint8Array;
  itemsRequestTag24Bytes: Uint8Array;
  sessionTranscriptBytes?: Uint8Array;
  readerAuthBytes?: Uint8Array;
  readerKeyPair?: CryptoKeyPair;
  readerPublicJwk?: JsonWebKey;
  readerCertificateDer?: Uint8Array;
};

export async function buildOrgIsoMdocRequest(
  smartRequest: SmartCheckinRequest,
  options: {
    nonce?: Uint8Array;
    verifierKeyPair?: CryptoKeyPair;
    deviceRequestVersion?: "1.0" | "1.1";
    responseElementIdentifier?: string;
    includeCompanionElement?: boolean;
    origin?: string;
    readerAuth?: boolean;
    readerIdentity?: ReaderIdentity;
  } = {},
): Promise<OrgIsoMdocRequestBundle> {
  const verifierKeyPair =
    options.verifierKeyPair ??
    ((await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    )) as CryptoKeyPair);
  const verifierPublicJwk = await crypto.subtle.exportKey("jwk", verifierKeyPair.publicKey);
  const nonce = options.nonce ?? crypto.getRandomValues(new Uint8Array(32));
  if (nonce.length < 16) throw new Error("dcapi nonce must be at least 16 bytes");

  const smartRequestJson = JSON.stringify(smartRequest);
  const requestedElementIdentifier =
    options.responseElementIdentifier ?? SMART_RESPONSE_ELEMENT_ID;
  const encryptionInfoBytes = buildEncryptionInfoBytes({
    nonce,
    recipientPublicJwk: verifierPublicJwk,
  });
  const itemsRequestTag24Bytes = buildItemsRequestTag24Bytes({
    smartRequestJson,
    responseElementIdentifier: requestedElementIdentifier,
    includeCompanionElement: options.includeCompanionElement,
  });
  const shouldSignReaderAuth = options.readerAuth ?? options.origin !== undefined;
  const sessionTranscriptBytes = options.origin
    ? await buildDcapiSessionTranscript({
        origin: options.origin,
        encryptionInfo: encryptionInfoBytes,
      })
    : undefined;
  const readerIdentity =
    shouldSignReaderAuth && sessionTranscriptBytes
      ? options.readerIdentity ?? (await createEphemeralReaderIdentity())
      : undefined;
  const readerAuthBytes =
    readerIdentity && sessionTranscriptBytes
      ? await signReaderAuth({
          readerPrivateKey: readerIdentity.keyPair.privateKey,
          readerCertificateDer: readerIdentity.certificateDer,
          sessionTranscriptBytes,
          itemsRequestTag24Bytes,
        })
      : undefined;
  const deviceRequestBytes = buildDeviceRequestBytesFromParts({
    itemsRequestTag24Bytes,
    readerAuthBytes,
    version: options.deviceRequestVersion ?? "1.0",
  });

  return {
    navigatorArgument: {
      mediation: "required",
      digital: {
        requests: [
          {
            protocol: PROTOCOL_ID,
            data: {
              deviceRequest: base64UrlEncodeBytes(deviceRequestBytes),
              encryptionInfo: base64UrlEncodeBytes(encryptionInfoBytes),
            },
          },
        ],
      },
    },
    verifierKeyPair,
    verifierPublicJwk,
    nonce,
    requestedElementIdentifier,
    smartRequestJson,
    deviceRequestBytes,
    encryptionInfoBytes,
    itemsRequestTag24Bytes,
    sessionTranscriptBytes,
    readerAuthBytes,
    readerKeyPair: readerIdentity?.keyPair,
    readerPublicJwk: readerIdentity?.publicJwk,
    readerCertificateDer: readerIdentity?.certificateDer,
  };
}

export function buildDeviceRequestBytes(input: {
  smartRequestJson: string;
  responseElementIdentifier?: string;
  version?: "1.0" | "1.1";
}): Uint8Array {
  return buildDeviceRequestBytesFromParts({
    itemsRequestTag24Bytes: buildItemsRequestTag24Bytes(input),
    version: input.version ?? "1.0",
  });
}

export function buildItemsRequestTag24Bytes(input: {
  smartRequestJson: string;
  responseElementIdentifier?: string;
  /**
   * Also carry the request JSON as a `smart_request_b64u.<b64u>` requested
   * element, for wallets that cannot read `requestInfo`. Off by default: the
   * spec's primary carrier is requestInfo, the real platform captures omit
   * the companion, and it roughly doubles the request size.
   */
  includeCompanionElement?: boolean;
}): Uint8Array {
  const responseElementIdentifier =
    input.responseElementIdentifier ?? SMART_RESPONSE_ELEMENT_ID;
  const elements: Record<string, boolean> = {
    [responseElementIdentifier]: true,
  };
  if (input.includeCompanionElement) {
    elements[buildSmartRequestCompanionElementIdentifier(input.smartRequestJson)] = false;
  }
  const itemsRequest: Record<string, unknown> = {
    docType: MDOC_DOC_TYPE,
    nameSpaces: {
      [MDOC_NAMESPACE]: elements,
    },
    requestInfo: {
      [SMART_REQUEST_INFO_KEY]: input.smartRequestJson,
    },
  };
  return cborEncode(new CborTag(24, cborEncode(itemsRequest)));
}

export function buildDeviceRequestBytesFromParts(input: {
  itemsRequestTag24Bytes: Uint8Array;
  readerAuthBytes?: Uint8Array;
  version: "1.0" | "1.1";
}): Uint8Array {
  const deviceRequest: Record<string, unknown> = {
    version: input.version,
    docRequests: [
      {
        itemsRequest: cborDecode(input.itemsRequestTag24Bytes),
        readerAuth: input.readerAuthBytes ? cborDecode(input.readerAuthBytes) : undefined,
      },
    ],
  };
  return cborEncode(deviceRequest);
}

export function publicJwkToCoseKey(jwk: JsonWebKey): Map<number, number | Uint8Array> {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y) {
    throw new Error("expected P-256 EC public JWK");
  }
  return new Map<number, number | Uint8Array>([
    [1, 2], // kty: EC2
    [-1, 1], // crv: P-256
    [-2, base64UrlDecodeBytes(jwk.x)],
    [-3, base64UrlDecodeBytes(jwk.y)],
  ]);
}

export function publicJwkToRawP256(jwk: JsonWebKey): Uint8Array {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y) {
    throw new Error("expected P-256 EC public JWK");
  }
  return concatBytes([
    new Uint8Array([0x04]),
    base64UrlDecodeBytes(jwk.x),
    base64UrlDecodeBytes(jwk.y),
  ]);
}

export function buildEncryptionInfoBytes(input: {
  nonce: Uint8Array;
  recipientPublicJwk: JsonWebKey;
}): Uint8Array {
  return cborEncode([
    "dcapi",
    new Map<unknown, unknown>([
      ["nonce", input.nonce],
      ["recipientPublicKey", publicJwkToCoseKey(input.recipientPublicJwk)],
    ]),
  ]);
}

/**
 * SessionTranscript (spec §8.3) — both verifier and wallet compute this
 * identically:
 *   dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
 *   handover  = ["dcapi", SHA-256(dcapiInfo)]
 *   SessionTranscript = CBOR([null, null, handover])
 */
export async function buildDcapiSessionTranscript(input: {
  origin: string;
  encryptionInfo: string | Uint8Array;
}): Promise<Uint8Array> {
  const encryptionInfo =
    typeof input.encryptionInfo === "string"
      ? input.encryptionInfo
      : base64UrlEncodeBytes(input.encryptionInfo);
  const dcapiInfo = cborEncode([encryptionInfo, input.origin]);
  const handover = ["dcapi", await sha256(dcapiInfo)];
  return cborEncode([null, null, handover]);
}

export function buildSmartRequestCompanionElementIdentifier(
  smartRequestJson: string,
): string {
  return `${SMART_REQUEST_COMPANION_ELEMENT_PREFIX}${base64UrlEncodeUtf8(smartRequestJson)}`;
}

export function decodeSmartRequestCompanionElementIdentifier(
  elementIdentifier: string,
): string | undefined {
  if (!elementIdentifier.startsWith(SMART_REQUEST_COMPANION_ELEMENT_PREFIX)) {
    return undefined;
  }
  const encoded = elementIdentifier.slice(SMART_REQUEST_COMPANION_ELEMENT_PREFIX.length);
  if (!encoded) {
    throw new Error("SMART request companion element has an empty payload");
  }
  return base64UrlDecodeUtf8(encoded);
}
