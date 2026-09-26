/**
 * Cryptographic verification of an opened DeviceResponse (draft spec §8.7):
 *
 * - issuerAuth: COSE_Sign1 (ES256) over the tag-24 MSO payload, verified
 *   against the certificate carried in the x5chain header. Chain-of-trust
 *   policy (which anchors to accept) is the caller's; this module verifies
 *   the signature and surfaces the chain.
 * - deviceSignature: detached COSE_Sign1 over DeviceAuthentication (which
 *   binds the SessionTranscript), verified against the MSO deviceKey.
 * - MSO value digests: recomputed per issuer-signed item.
 *
 * New in this kit (the prototype checked digests only); byte-verified against
 * the spec's real-capture fixtures.
 */

import { arrayBufferCopy, concatBytes, sha256, bytesEqual } from "./bytes.js";
import { CborTag, cborDecode, cborEncode, mapGet } from "./cbor.js";
import { importCertificatePublicKey } from "./reader-auth.js";

const X5CHAIN_HEADER_LABEL = 33;

export type CoseSign1 = [Uint8Array, Map<unknown, unknown>, Uint8Array | null, Uint8Array];

export type IssuerAuthVerification = {
  present: boolean;
  signatureValid?: boolean;
  x5chain?: Uint8Array[];
  error?: string;
};

export type DeviceSignatureVerification = {
  present: boolean;
  signatureValid?: boolean;
  error?: string;
};

export type DigestVerification = {
  checked: number;
  matched: number;
  allMatch: boolean;
};

export type DocumentVerification = {
  docType?: string;
  issuerAuth: IssuerAuthVerification;
  deviceSignature: DeviceSignatureVerification;
  digests: DigestVerification;
};

/**
 * Verify every document in a DeviceResponse. All three checks are reported
 * independently so a caller can apply deployment trust policy (e.g. accept a
 * self-attested wallet chain while still requiring a valid signature).
 */
export async function verifyDeviceResponseSignatures(input: {
  deviceResponseBytes: Uint8Array;
  sessionTranscript: Uint8Array;
}): Promise<DocumentVerification[]> {
  const decoded = cborDecode(input.deviceResponseBytes);
  const documents = mapGet(decoded, "documents");
  if (!Array.isArray(documents)) return [];
  const out: DocumentVerification[] = [];
  for (const document of documents) {
    out.push(await verifyDocument(document, input.sessionTranscript));
  }
  return out;
}

async function verifyDocument(
  document: unknown,
  sessionTranscript: Uint8Array,
): Promise<DocumentVerification> {
  const docType = mapGet(document, "docType");
  const issuerSigned = mapGet(document, "issuerSigned");
  const issuerAuthRaw = mapGet(issuerSigned, "issuerAuth");

  const issuerAuth = await verifyIssuerAuth(issuerAuthRaw);
  const mso = decodeMso(issuerAuthRaw);
  const digests = await verifyValueDigests(mapGet(issuerSigned, "nameSpaces"), mso);
  const deviceSignature = await verifyDeviceSignature({
    document,
    mso,
    sessionTranscript,
    docType: typeof docType === "string" ? docType : "",
  });

  return {
    docType: typeof docType === "string" ? docType : undefined,
    issuerAuth,
    deviceSignature,
    digests,
  };
}

export async function verifyIssuerAuth(issuerAuthRaw: unknown): Promise<IssuerAuthVerification> {
  const cose = asCoseSign1(issuerAuthRaw);
  if (!cose) return { present: false };
  try {
    const x5chain = extractX5Chain(cose);
    if (x5chain.length === 0) {
      return { present: true, signatureValid: false, error: "no x5chain certificate in issuerAuth headers" };
    }
    const publicKey = await importCertificatePublicKey(x5chain[0]!);
    const signatureValid = await verifyCoseSign1(cose, publicKey);
    return { present: true, signatureValid, x5chain };
  } catch (e) {
    return {
      present: true,
      signatureValid: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function decodeMso(issuerAuthRaw: unknown): unknown {
  const cose = asCoseSign1(issuerAuthRaw);
  if (!cose || !(cose[2] instanceof Uint8Array)) return undefined;
  const msoTag = cborDecode(cose[2]);
  if (!(msoTag instanceof CborTag) || msoTag.tag !== 24 || !(msoTag.value instanceof Uint8Array)) {
    return undefined;
  }
  return cborDecode(msoTag.value);
}

async function verifyValueDigests(nameSpaces: unknown, mso: unknown): Promise<DigestVerification> {
  const valueDigests = mapGet(mso, "valueDigests");
  let checked = 0;
  let matched = 0;
  if (nameSpaces instanceof Map) {
    for (const [namespace, items] of nameSpaces.entries()) {
      if (typeof namespace !== "string" || !Array.isArray(items)) continue;
      const namespaceDigests =
        valueDigests instanceof Map ? valueDigests.get(namespace) : undefined;
      for (const item of items) {
        if (!(item instanceof CborTag) || item.tag !== 24 || !(item.value instanceof Uint8Array)) {
          continue;
        }
        checked++;
        const digestID = mapGet(cborDecode(item.value), "digestID");
        const expected =
          namespaceDigests instanceof Map && typeof digestID === "number"
            ? namespaceDigests.get(digestID)
            : undefined;
        if (!(expected instanceof Uint8Array)) continue;
        const recomputed = await sha256(cborEncode(item));
        if (bytesEqual(recomputed, expected)) matched++;
      }
    }
  }
  return { checked, matched, allMatch: checked > 0 && matched === checked };
}

/**
 * DeviceAuthentication (ISO/IEC 18013-5):
 *   DeviceAuthentication = ["DeviceAuthentication", SessionTranscript,
 *                           DocType, DeviceNameSpacesBytes]
 *   DeviceAuthenticationBytes = #6.24(bstr .cbor DeviceAuthentication)
 * The deviceSignature COSE_Sign1 carries a detached payload equal to
 * DeviceAuthenticationBytes.
 */
export function buildDeviceAuthenticationBytes(input: {
  sessionTranscript: Uint8Array;
  docType: string;
  deviceNameSpaces: unknown;
}): Uint8Array {
  return cborEncode(
    new CborTag(24, cborEncode([
      "DeviceAuthentication",
      cborDecode(input.sessionTranscript),
      input.docType,
      input.deviceNameSpaces,
    ])),
  );
}

async function verifyDeviceSignature(input: {
  document: unknown;
  mso: unknown;
  sessionTranscript: Uint8Array;
  docType: string;
}): Promise<DeviceSignatureVerification> {
  const deviceSigned = mapGet(input.document, "deviceSigned");
  const deviceAuth = mapGet(deviceSigned, "deviceAuth");
  const cose = asCoseSign1(mapGet(deviceAuth, "deviceSignature"));
  if (!cose) return { present: false };
  try {
    const deviceNameSpaces = mapGet(deviceSigned, "nameSpaces");
    const deviceKeyInfo = mapGet(input.mso, "deviceKeyInfo");
    const deviceKey = mapGet(deviceKeyInfo, "deviceKey");
    if (!(deviceKey instanceof Map)) {
      return { present: true, signatureValid: false, error: "MSO deviceKey missing" };
    }
    const publicKey = await importCoseEc2PublicKey(deviceKey);
    const detachedPayload = buildDeviceAuthenticationBytes({
      sessionTranscript: input.sessionTranscript,
      docType: input.docType,
      deviceNameSpaces,
    });
    // ISO 18013-5 detaches this payload (null). An attached one is accepted
    // only if it is exactly this session's DeviceAuthentication; otherwise a
    // signature made for another session or origin would verify.
    const attached = cose[2];
    if (attached !== null && !bytesEqual(attached, detachedPayload)) {
      return {
        present: true,
        signatureValid: false,
        error: "deviceSignature carries an attached payload that is not this session's DeviceAuthentication",
      };
    }
    const signatureValid = await verifyCoseSign1([cose[0], cose[1], null, cose[3]], publicKey, detachedPayload);
    return { present: true, signatureValid };
  } catch (e) {
    return {
      present: true,
      signatureValid: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function asCoseSign1(value: unknown): CoseSign1 | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const [protectedBytes, unprotected, payload, signature] = value;
  if (!(protectedBytes instanceof Uint8Array)) return undefined;
  if (!(signature instanceof Uint8Array)) return undefined;
  if (payload !== null && !(payload instanceof Uint8Array)) return undefined;
  const headers = unprotected instanceof Map ? unprotected : new Map();
  return [protectedBytes, headers, payload ?? null, signature];
}

function extractX5Chain(cose: CoseSign1): Uint8Array[] {
  const [protectedBytes, unprotected] = cose;
  const candidates: unknown[] = [unprotected.get(X5CHAIN_HEADER_LABEL)];
  try {
    const protectedHeaders = cborDecode(protectedBytes);
    if (protectedHeaders instanceof Map) {
      candidates.push(protectedHeaders.get(X5CHAIN_HEADER_LABEL));
    }
  } catch {
    // empty or non-map protected headers
  }
  for (const candidate of candidates) {
    if (candidate instanceof Uint8Array) return [candidate];
    if (Array.isArray(candidate) && candidate.every((c) => c instanceof Uint8Array)) {
      return candidate as Uint8Array[];
    }
  }
  return [];
}

async function verifyCoseSign1(
  cose: CoseSign1,
  publicKey: CryptoKey,
  detachedPayload?: Uint8Array,
): Promise<boolean> {
  const [protectedBytes, , payload, signature] = cose;
  const actualPayload = payload ?? detachedPayload;
  if (!actualPayload) throw new Error("COSE_Sign1 has no payload (detached payload required)");
  const sigStructure = cborEncode(["Signature1", protectedBytes, new Uint8Array(), actualPayload]);
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    arrayBufferCopy(normalizeEcdsaSignature(signature)),
    arrayBufferCopy(sigStructure),
  );
}

async function importCoseEc2PublicKey(coseKey: Map<unknown, unknown>): Promise<CryptoKey> {
  const kty = coseKey.get(1);
  const crv = coseKey.get(-1);
  const x = coseKey.get(-2);
  const y = coseKey.get(-3);
  if (kty !== 2 || crv !== 1 || !(x instanceof Uint8Array) || !(y instanceof Uint8Array)) {
    throw new Error("expected EC2 P-256 COSE_Key");
  }
  const raw = concatBytes([new Uint8Array([0x04]), x, y]);
  return crypto.subtle.importKey(
    "raw",
    arrayBufferCopy(raw),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
}

/** COSE uses raw r||s ECDSA signatures; tolerate DER-encoded ones. */
function normalizeEcdsaSignature(signature: Uint8Array): Uint8Array {
  if (signature.length === 64) return signature;
  if (signature[0] === 0x30) {
    // SEQUENCE { INTEGER r, INTEGER s }
    let offset = 2;
    if (signature[1]! & 0x80) offset += signature[1]! & 0x7f;
    const readInt = (): Uint8Array => {
      if (signature[offset] !== 0x02) throw new Error("invalid DER ECDSA signature");
      const length = signature[offset + 1]!;
      let start = offset + 2;
      let n = length;
      while (n > 32 && signature[start] === 0) {
        start++;
        n--;
      }
      if (n > 32) throw new Error("DER ECDSA integer too long");
      const out = new Uint8Array(32);
      out.set(signature.slice(start, start + n), 32 - n);
      offset = offset + 2 + length;
      return out;
    };
    const r = readInt();
    const s = readInt();
    return concatBytes([r, s]);
  }
  throw new Error(`unsupported ECDSA signature length ${signature.length}`);
}
