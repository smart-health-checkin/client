/**
 * HPKE (RFC 9180) base mode over WebCrypto for the direct mdoc response:
 * DHKEM(P-256, HKDF-SHA256) + HKDF-SHA256 + AES-128-GCM.
 * `info` is the SessionTranscript bytes; `aad` is empty (spec §8.6).
 * Ported from smart-health-checkin-mdoc rp-web/src/protocol/index.ts.
 */

import { arrayBufferCopy, concatBytes, i2osp, utf8 } from "./bytes.js";

const HPKE_KEM_DHKEM_P256_HKDF_SHA256 = 0x0010;
const HPKE_KDF_HKDF_SHA256 = 0x0001;
const HPKE_AEAD_AES_128_GCM = 0x0001;
const HPKE_NH = 32;
const HPKE_NK = 16;
const HPKE_NN = 12;

export async function hpkeContext(input: {
  dh: Uint8Array;
  enc: Uint8Array;
  recipientPublicBytes: Uint8Array;
  info: Uint8Array;
}): Promise<{ key: Uint8Array; baseNonce: Uint8Array }> {
  const kemSuiteId = concatBytes([
    utf8("KEM"),
    i2osp(HPKE_KEM_DHKEM_P256_HKDF_SHA256, 2),
  ]);
  const hpkeSuiteId = concatBytes([
    utf8("HPKE"),
    i2osp(HPKE_KEM_DHKEM_P256_HKDF_SHA256, 2),
    i2osp(HPKE_KDF_HKDF_SHA256, 2),
    i2osp(HPKE_AEAD_AES_128_GCM, 2),
  ]);
  const kemContext = concatBytes([input.enc, input.recipientPublicBytes]);
  const eaePrk = await hpkeLabeledExtract(kemSuiteId, new Uint8Array(), "eae_prk", input.dh);
  const sharedSecret = await hpkeLabeledExpand(kemSuiteId, eaePrk, "shared_secret", kemContext, HPKE_NH);

  const pskIdHash = await hpkeLabeledExtract(hpkeSuiteId, new Uint8Array(), "psk_id_hash", new Uint8Array());
  const infoHash = await hpkeLabeledExtract(hpkeSuiteId, new Uint8Array(), "info_hash", input.info);
  const keyScheduleContext = concatBytes([new Uint8Array([0]), pskIdHash, infoHash]);
  const secret = await hpkeLabeledExtract(hpkeSuiteId, sharedSecret, "secret", new Uint8Array());
  const key = await hpkeLabeledExpand(hpkeSuiteId, secret, "key", keyScheduleContext, HPKE_NK);
  const baseNonce = await hpkeLabeledExpand(hpkeSuiteId, secret, "base_nonce", keyScheduleContext, HPKE_NN);
  return { key, baseNonce };
}

async function hpkeLabeledExtract(
  suiteId: Uint8Array,
  salt: Uint8Array,
  label: string,
  ikm: Uint8Array,
): Promise<Uint8Array> {
  return hkdfExtract(
    salt,
    concatBytes([utf8("HPKE-v1"), suiteId, utf8(label), ikm]),
  );
}

async function hpkeLabeledExpand(
  suiteId: Uint8Array,
  prk: Uint8Array,
  label: string,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  return hkdfExpand(
    prk,
    concatBytes([i2osp(length, 2), utf8("HPKE-v1"), suiteId, utf8(label), info]),
    length,
  );
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    arrayBufferCopy(salt.length === 0 ? new Uint8Array(HPKE_NH) : salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, arrayBufferCopy(ikm)));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const n = Math.ceil(length / HPKE_NH);
  if (n > 255) throw new Error("HKDF expand length too large");
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    arrayBufferCopy(prk),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const chunks: Uint8Array[] = [];
  let previous = new Uint8Array();
  for (let i = 1; i <= n; i++) {
    previous = new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        hmacKey,
        arrayBufferCopy(concatBytes([previous, info, new Uint8Array([i])])),
      ),
    );
    chunks.push(previous);
  }
  return concatBytes(chunks).slice(0, length);
}

export async function hpkeAesGcm(
  encrypt: boolean,
  input: { key: Uint8Array; nonce: Uint8Array; aad: Uint8Array; data: Uint8Array },
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    arrayBufferCopy(input.key),
    { name: "AES-GCM", length: 128 },
    false,
    encrypt ? ["encrypt"] : ["decrypt"],
  );
  const params: AesGcmParams = {
    name: "AES-GCM",
    iv: arrayBufferCopy(input.nonce),
    additionalData: arrayBufferCopy(input.aad),
    tagLength: 128,
  };
  const out = encrypt
    ? await crypto.subtle.encrypt(params, key, arrayBufferCopy(input.data))
    : await crypto.subtle.decrypt(params, key, arrayBufferCopy(input.data));
  return new Uint8Array(out);
}

export function hpkeNonce(baseNonce: Uint8Array, sequenceNumber = 0): Uint8Array {
  const nonce = new Uint8Array(baseNonce);
  const sequence = i2osp(sequenceNumber, HPKE_NN);
  for (let i = 0; i < nonce.length; i++) nonce[i] = nonce[i]! ^ sequence[i]!;
  return nonce;
}
