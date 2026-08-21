/**
 * Optional readerAuth (draft spec §8.2.6): ephemeral reader identity with a
 * self-signed P-256 certificate, detached COSE_Sign1 over
 * ReaderAuthentication, and verification. Includes the minimal DER helpers.
 * Ported from smart-health-checkin-mdoc rp-web/src/protocol/index.ts.
 */

import { arrayBufferCopy, concatBytes, utf8 } from "./bytes.ts";
import { CborTag, cborDecode, cborEncode } from "./cbor.ts";

export type ReaderIdentity = {
  keyPair: CryptoKeyPair;
  publicJwk: JsonWebKey;
  certificateDer: Uint8Array;
};

export async function createEphemeralReaderIdentity(
  subjectCommonName = "SMART Health Check-in Demo Verifier",
): Promise<ReaderIdentity> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const certificateDer = await createSelfSignedP256Certificate({
    subjectCommonName,
    keyPair,
  });
  return { keyPair, publicJwk, certificateDer };
}

export function buildReaderAuthenticationBytes(input: {
  sessionTranscriptBytes: Uint8Array;
  itemsRequestTag24Bytes: Uint8Array;
}): Uint8Array {
  return cborEncode(
    new CborTag(24, cborEncode([
      "ReaderAuthentication",
      cborDecode(input.sessionTranscriptBytes),
      cborDecode(input.itemsRequestTag24Bytes),
    ])),
  );
}

export async function signReaderAuth(input: {
  readerPrivateKey: CryptoKey;
  readerCertificateDer: Uint8Array;
  sessionTranscriptBytes: Uint8Array;
  itemsRequestTag24Bytes: Uint8Array;
}): Promise<Uint8Array> {
  const protectedBytes = cborEncode(new Map<unknown, unknown>([[1, -7]])); // alg: ES256
  const unprotected = new Map<unknown, unknown>([[33, [input.readerCertificateDer]]]); // x5chain
  const detachedPayload = buildReaderAuthenticationBytes(input);
  const sigStructure = cborEncode(["Signature1", protectedBytes, new Uint8Array(), detachedPayload]);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      input.readerPrivateKey,
      arrayBufferCopy(sigStructure),
    ),
  );
  return cborEncode([protectedBytes, unprotected, null, signature]);
}

export async function verifyReaderAuthSignature(input: {
  readerAuthBytes: Uint8Array;
  readerPublicKey: CryptoKey;
  sessionTranscriptBytes: Uint8Array;
  itemsRequestTag24Bytes: Uint8Array;
}): Promise<boolean> {
  const decoded = cborDecode(input.readerAuthBytes);
  if (!Array.isArray(decoded) || decoded.length !== 4) return false;
  const [protectedBytes, , payload, signature] = decoded;
  if (!(protectedBytes instanceof Uint8Array) || payload !== null || !(signature instanceof Uint8Array)) {
    return false;
  }
  const detachedPayload = buildReaderAuthenticationBytes(input);
  const sigStructure = cborEncode(["Signature1", protectedBytes, new Uint8Array(), detachedPayload]);
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    input.readerPublicKey,
    arrayBufferCopy(signature),
    arrayBufferCopy(sigStructure),
  );
}

async function createSelfSignedP256Certificate(input: {
  subjectCommonName: string;
  keyPair: CryptoKeyPair;
}): Promise<Uint8Array> {
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", input.keyPair.publicKey));
  const algorithm = derSequence(derOid("1.2.840.10045.4.3.2")); // ecdsa-with-SHA256
  const name = derSequence(
    derSet(
      derSequence(
        derOid("2.5.4.3"), // commonName
        derUtf8String(input.subjectCommonName),
      ),
    ),
  );
  const now = Date.now();
  const validity = derSequence(
    derUtcTime(new Date(now - 60_000)),
    derUtcTime(new Date(now + 30 * 86_400_000)),
  );
  const serial = crypto.getRandomValues(new Uint8Array(16));
  serial[0] = serial[0]! & 0x7f;
  if (serial.every((b) => b === 0)) serial[serial.length - 1] = 1;
  const tbsCertificate = derSequence(
    derInteger(serial),
    algorithm,
    name,
    validity,
    name,
    spki,
  );
  const rawSignature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      input.keyPair.privateKey,
      arrayBufferCopy(tbsCertificate),
    ),
  );
  return derSequence(
    tbsCertificate,
    algorithm,
    derBitString(ecdsaRawToDer(rawSignature)),
  );
}

// ---------------------------------------------------------------------------
// DER reading (used to pull the SubjectPublicKeyInfo out of an X.509 cert so
// COSE signatures carried with an x5chain header can be verified).

type DerNode = { tag: number; value: Uint8Array; raw: Uint8Array };

function derRead(bytes: Uint8Array, offset: number): { node: DerNode; next: number } {
  if (offset + 2 > bytes.length) throw new Error("DER: truncated");
  const tag = bytes[offset]!;
  let lengthByte = bytes[offset + 1]!;
  let contentStart = offset + 2;
  let length = lengthByte;
  if (lengthByte & 0x80) {
    const numBytes = lengthByte & 0x7f;
    if (numBytes === 0 || numBytes > 4) throw new Error("DER: unsupported length");
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = length * 256 + bytes[offset + 2 + i]!;
    }
    contentStart = offset + 2 + numBytes;
  }
  const end = contentStart + length;
  if (end > bytes.length) throw new Error("DER: value exceeds input");
  return {
    node: {
      tag,
      value: bytes.slice(contentStart, end),
      raw: bytes.slice(offset, end),
    },
    next: end,
  };
}

function derChildren(node: DerNode): DerNode[] {
  const out: DerNode[] = [];
  let offset = 0;
  while (offset < node.value.length) {
    const { node: child, next } = derRead(node.value, offset);
    out.push(child);
    offset = next;
  }
  return out;
}

/**
 * Extract the SubjectPublicKeyInfo (DER) from an X.509 certificate.
 *
 * Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
 * TBSCertificate ::= SEQUENCE { [0] version OPTIONAL, serialNumber, signature,
 *   issuer, validity, subject, subjectPublicKeyInfo, ... }
 */
export function certificateSubjectPublicKeyInfo(certificateDer: Uint8Array): Uint8Array {
  const { node: certificate } = derRead(certificateDer, 0);
  if (certificate.tag !== 0x30) throw new Error("certificate is not a DER SEQUENCE");
  const tbs = derChildren(certificate)[0];
  if (!tbs || tbs.tag !== 0x30) throw new Error("tbsCertificate is not a DER SEQUENCE");
  const fields = derChildren(tbs);
  let index = 0;
  if (fields[index] && (fields[index]!.tag & 0xe0) === 0xa0) index++; // [0] version
  index += 5; // serialNumber, signature, issuer, validity, subject
  const spki = fields[index];
  if (!spki || spki.tag !== 0x30) throw new Error("subjectPublicKeyInfo not found");
  return spki.raw;
}

export async function importCertificatePublicKey(
  certificateDer: Uint8Array,
): Promise<CryptoKey> {
  const spki = certificateSubjectPublicKeyInfo(certificateDer);
  return crypto.subtle.importKey(
    "spki",
    arrayBufferCopy(spki),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
}

function derSequence(...items: Uint8Array[]): Uint8Array {
  return derValue(0x30, concatBytes(items));
}

function derSet(...items: Uint8Array[]): Uint8Array {
  return derValue(0x31, concatBytes(items));
}

function derUtf8String(value: string): Uint8Array {
  return derValue(0x0c, utf8(value));
}

function derUtcTime(value: Date): Uint8Array {
  const year = value.getUTCFullYear();
  if (year < 1950 || year >= 2050) throw new Error("UTCTime year out of range");
  const yy = String(year % 100).padStart(2, "0");
  const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(value.getUTCDate()).padStart(2, "0");
  const hh = String(value.getUTCHours()).padStart(2, "0");
  const mi = String(value.getUTCMinutes()).padStart(2, "0");
  const ss = String(value.getUTCSeconds()).padStart(2, "0");
  return derValue(0x17, utf8(`${yy}${mm}${dd}${hh}${mi}${ss}Z`));
}

function derOid(oid: string): Uint8Array {
  const parts = oid.split(".").map((part) => Number(part));
  if (parts.length < 2 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`invalid OID ${oid}`);
  }
  const [first, second, ...rest] = parts as [number, number, ...number[]];
  return derValue(0x06, new Uint8Array([
    40 * first + second,
    ...rest.flatMap(derBase128),
  ]));
}

function derInteger(value: Uint8Array): Uint8Array {
  let start = 0;
  while (start < value.length - 1 && value[start] === 0) start++;
  let bytes: Uint8Array = value.slice(start);
  if (bytes.length === 0) bytes = new Uint8Array([0]);
  if ((bytes[0]! & 0x80) !== 0) bytes = concatBytes([new Uint8Array([0]), bytes]);
  return derValue(0x02, bytes);
}

function derBitString(value: Uint8Array): Uint8Array {
  return derValue(0x03, concatBytes([new Uint8Array([0]), value]));
}

function derValue(tag: number, value: Uint8Array): Uint8Array {
  return concatBytes([new Uint8Array([tag]), derLength(value.length), value]);
}

function derLength(length: number): Uint8Array {
  if (length < 0x80) return new Uint8Array([length]);
  const bytes: number[] = [];
  for (let value = length; value > 0; value = Math.floor(value / 256)) {
    bytes.unshift(value & 0xff);
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function derBase128(value: number): number[] {
  if (value === 0) return [0];
  const out: number[] = [];
  for (let v = value; v > 0; v = Math.floor(v / 128)) {
    out.unshift(v & 0x7f);
  }
  for (let i = 0; i < out.length - 1; i++) out[i] = out[i]! | 0x80;
  return out;
}

function ecdsaRawToDer(rawSignature: Uint8Array): Uint8Array {
  if (rawSignature.length !== 64) throw new Error("expected raw P-256 signature");
  return derSequence(
    derInteger(rawSignature.slice(0, 32)),
    derInteger(rawSignature.slice(32)),
  );
}
