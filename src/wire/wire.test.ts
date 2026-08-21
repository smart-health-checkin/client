/**
 * Wire-layer conformance tests against the vendored fixture corpus
 * (fixtures/PROVENANCE.md). The real-capture fixtures are byte oracles: the
 * kit must reproduce the exact bytes a real Chrome/Android session produced,
 * open the real encrypted response, and verify its signatures.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  base64UrlDecodeBytes,
  base64UrlEncodeBytes,
  bytesEqual,
  hex,
} from "./bytes.ts";
import { cborDecode, cborEncode, mapGet, CborTag } from "./cbor.ts";
import {
  SMART_REQUEST_INFO_KEY,
  buildDcapiSessionTranscript,
  buildDeviceRequestBytesFromParts,
  buildEncryptionInfoBytes,
  buildItemsRequestTag24Bytes,
} from "./request.ts";
import {
  buildReaderAuthenticationBytes,
  importCertificatePublicKey,
  verifyReaderAuthSignature,
} from "./reader-auth.ts";
import {
  firstSmartCheckinResponse,
  hpkeSealDirectMdoc,
  openWalletResponse,
} from "./response.ts";
import {
  buildDeviceAuthenticationBytes,
  verifyDeviceResponseSignatures,
} from "./verify.ts";

const FIXTURES = join(import.meta.dir, "../../fixtures");
const REQ = join(FIXTURES, "dcapi-requests/real-chrome-android-smart-checkin");
const RESP = join(FIXTURES, "responses/real-chrome-android-smart-checkin");
const TS_BASIC = join(FIXTURES, "dcapi-requests/ts-smart-checkin-basic");
const TS_READERAUTH = join(FIXTURES, "dcapi-requests/ts-smart-checkin-readerauth");

const bytes = (path: string): Uint8Array => new Uint8Array(readFileSync(path));
const text = (path: string): string => readFileSync(path, "utf8").trim();
const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

function smartRequestJsonFromItemsRequestTag24(tag24Bytes: Uint8Array): string {
  const tag = cborDecode(tag24Bytes);
  if (!(tag instanceof CborTag) || !(tag.value instanceof Uint8Array)) {
    throw new Error("fixture items request is not tag24(bytes)");
  }
  const itemsRequest = cborDecode(tag.value);
  const value = mapGet(mapGet(itemsRequest, "requestInfo"), SMART_REQUEST_INFO_KEY);
  if (typeof value !== "string") throw new Error("fixture requestInfo carrier missing");
  return value;
}

function nonceFromEncryptionInfo(encryptionInfoBytes: Uint8Array): Uint8Array {
  const decoded = cborDecode(encryptionInfoBytes);
  const nonce = mapGet(Array.isArray(decoded) ? decoded[1] : undefined, "nonce");
  if (!(nonce instanceof Uint8Array)) throw new Error("fixture encryptionInfo has no nonce");
  return nonce;
}

describe("real Chrome/Android request capture (byte oracles)", () => {
  const metadata = json(join(REQ, "metadata.json")) as { origin: string };
  const itemsRequestTag24 = bytes(join(REQ, "items-request-tag24.cbor"));
  const encryptionInfo = bytes(join(REQ, "encryption-info.cbor"));
  const deviceRequest = bytes(join(REQ, "device-request.cbor"));
  const sessionTranscript = bytes(join(REQ, "session-transcript.cbor"));
  const readerAuth = bytes(join(REQ, "reader-auth.cbor"));

  test("rebuilds ItemsRequest tag-24 bytes exactly", () => {
    const smartRequestJson = smartRequestJsonFromItemsRequestTag24(itemsRequestTag24);
    const rebuilt = buildItemsRequestTag24Bytes({ smartRequestJson });
    expect(hex(rebuilt)).toBe(hex(itemsRequestTag24));
  });

  test("rebuilds encryptionInfo bytes exactly", () => {
    const recipientPublicJwk = json(join(REQ, "recipient-public.jwk.json")) as JsonWebKey;
    const rebuilt = buildEncryptionInfoBytes({
      nonce: nonceFromEncryptionInfo(encryptionInfo),
      recipientPublicJwk,
    });
    expect(hex(rebuilt)).toBe(hex(encryptionInfo));
    expect(base64UrlEncodeBytes(rebuilt)).toBe(text(join(REQ, "encryption-info.b64u")));
  });

  test("rebuilds the SessionTranscript exactly from origin + encryptionInfo", async () => {
    const rebuilt = await buildDcapiSessionTranscript({
      origin: metadata.origin,
      encryptionInfo,
    });
    expect(hex(rebuilt)).toBe(hex(sessionTranscript));
  });

  test("rebuilds DeviceRequest bytes exactly from captured parts", () => {
    const version = mapGet(cborDecode(deviceRequest), "version");
    const rebuilt = buildDeviceRequestBytesFromParts({
      itemsRequestTag24Bytes: itemsRequestTag24,
      readerAuthBytes: readerAuth,
      version: version === "1.1" ? "1.1" : "1.0",
    });
    expect(hex(rebuilt)).toBe(hex(deviceRequest));
    expect(base64UrlEncodeBytes(rebuilt)).toBe(text(join(REQ, "device-request.b64u")));
  });

  test("rebuilds the detached ReaderAuthentication payload exactly", () => {
    const rebuilt = buildReaderAuthenticationBytes({
      sessionTranscriptBytes: sessionTranscript,
      itemsRequestTag24Bytes: itemsRequestTag24,
    });
    expect(hex(rebuilt)).toBe(hex(bytes(join(REQ, "reader-auth-detached-payload.cbor"))));
  });

  test("verifies the captured readerAuth signature via its x5chain certificate", async () => {
    const decoded = cborDecode(readerAuth);
    if (!Array.isArray(decoded)) throw new Error("readerAuth is not COSE_Sign1");
    const unprotected = decoded[1];
    const chain = unprotected instanceof Map ? unprotected.get(33) : undefined;
    const certificateDer = Array.isArray(chain) ? chain[0] : chain;
    if (!(certificateDer instanceof Uint8Array)) throw new Error("no x5chain in readerAuth");
    const readerPublicKey = await importCertificatePublicKey(certificateDer);
    expect(
      await verifyReaderAuthSignature({
        readerAuthBytes: readerAuth,
        readerPublicKey,
        sessionTranscriptBytes: sessionTranscript,
        itemsRequestTag24Bytes: itemsRequestTag24,
      }),
    ).toBe(true);
  });
});

describe("synthetic TS request fixtures (byte oracles)", () => {
  for (const dir of [TS_BASIC, TS_READERAUTH]) {
    test(`rebuilds core request bytes for ${dir.split("/").pop()}`, () => {
      const deviceRequestHex = text(join(dir, "device-request.cbor.hex"));
      const deviceRequestBytes = base64UrlDecodeBytes(text(join(dir, "device-request.b64u")));
      expect(hex(deviceRequestBytes)).toBe(deviceRequestHex);

      const decoded = cborDecode(deviceRequestBytes);
      const docRequests = mapGet(decoded, "docRequests");
      if (!Array.isArray(docRequests) || docRequests.length === 0) {
        throw new Error("fixture DeviceRequest has no docRequests");
      }
      const itemsRequestTag = mapGet(docRequests[0], "itemsRequest");
      if (!(itemsRequestTag instanceof CborTag) || !(itemsRequestTag.value instanceof Uint8Array)) {
        throw new Error("fixture itemsRequest is not tag24");
      }
      const fixtureTag24Bytes = new Uint8Array(cborEncode(itemsRequestTag));
      const rebuiltTag24 = buildItemsRequestTag24Bytes({
        smartRequestJson: smartRequestJsonFromItemsRequestTag24(fixtureTag24Bytes),
      });
      expect(hex(rebuiltTag24)).toBe(hex(fixtureTag24Bytes));

      const readerAuth = mapGet(docRequests[0], "readerAuth");
      const version = mapGet(decoded, "version");
      const rebuiltDeviceRequest = buildDeviceRequestBytesFromParts({
        itemsRequestTag24Bytes: fixtureTag24Bytes,
        readerAuthBytes: readerAuth === undefined ? undefined : new Uint8Array(cborEncode(readerAuth)),
        version: version === "1.1" ? "1.1" : "1.0",
      });
      expect(hex(rebuiltDeviceRequest)).toBe(hex(deviceRequestBytes));

      const encryptionInfoBytes = base64UrlDecodeBytes(text(join(dir, "encryption-info.b64u")));
      expect(hex(encryptionInfoBytes)).toBe(text(join(dir, "encryption-info.cbor.hex")));
      const recipientPublicJwk = json(join(dir, "recipient-public.jwk.json")) as JsonWebKey;
      const rebuiltEncryptionInfo = buildEncryptionInfoBytes({
        nonce: nonceFromEncryptionInfo(encryptionInfoBytes),
        recipientPublicJwk,
      });
      expect(hex(rebuiltEncryptionInfo)).toBe(hex(encryptionInfoBytes));
    });
  }

  test("verifies the readerauth fixture signature with the checked-in reader key", async () => {
    const readerPublicJwk = json(join(TS_READERAUTH, "reader-public.jwk.json")) as JsonWebKey;
    const readerPublicKey = await crypto.subtle.importKey(
      "jwk",
      readerPublicJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"],
    );
    const ok = await verifyReaderAuthSignature({
      readerAuthBytes: bytes(join(TS_READERAUTH, "reader-auth.cbor")),
      readerPublicKey,
      sessionTranscriptBytes: bytes(join(TS_READERAUTH, "session-transcript.cbor")),
      itemsRequestTag24Bytes: bytes(join(TS_READERAUTH, "items-request-tag24.cbor")),
    });
    expect(ok).toBe(true);
  });

  test("rejects a tampered SessionTranscript", async () => {
    const readerPublicJwk = json(join(TS_READERAUTH, "reader-public.jwk.json")) as JsonWebKey;
    const readerPublicKey = await crypto.subtle.importKey(
      "jwk",
      readerPublicJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"],
    );
    const tampered = bytes(join(TS_READERAUTH, "session-transcript.cbor"));
    tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 0x01;
    const ok = await verifyReaderAuthSignature({
      readerAuthBytes: bytes(join(TS_READERAUTH, "reader-auth.cbor")),
      readerPublicKey,
      sessionTranscriptBytes: tampered,
      itemsRequestTag24Bytes: bytes(join(TS_READERAUTH, "items-request-tag24.cbor")),
    });
    expect(ok).toBe(false);
  });
});


describe("real Chrome/Android response capture", () => {
  const sessionTranscript = bytes(join(RESP, "session-transcript.cbor"));
  const recipientPrivateJwk = json(join(REQ, "recipient-private.jwk.json")) as JsonWebKey;
  const recipientPublicJwk = json(join(REQ, "recipient-public.jwk.json")) as JsonWebKey;
  const dcapiResponseB64u = text(join(RESP, "dcapi-response.cbor.b64u"));
  const expectedDeviceResponse = bytes(join(RESP, "device-response.cbor"));

  async function importRecipientPrivateKey(): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      "jwk",
      recipientPrivateJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    );
  }

  test("HPKE-opens the captured response to the exact DeviceResponse bytes", async () => {
    const opened = await openWalletResponse({
      response: dcapiResponseB64u,
      recipientPrivateKey: await importRecipientPrivateKey(),
      recipientPublicJwk,
      sessionTranscript,
      smartRequest: json(join(REQ, "smart-request.hydrated.json")),
    });
    expect(hex(opened.deviceResponseBytes)).toBe(hex(expectedDeviceResponse));

    const smart = firstSmartCheckinResponse(opened.deviceResponse);
    if (!smart.present || !smart.valid) throw new Error("SMART response missing/invalid");
    const expected = json(join(RESP, "smart-response.expected.json"));
    expect(JSON.parse(smart.json)).toEqual(expected);
    expect(opened.smartResponseValidation?.ok).toBe(true);

    for (const document of opened.deviceResponse.documents) {
      for (const element of document.elements) {
        if (element.smartHealthCheckinResponse.present) {
          expect(element.valueDigest?.matches).toBe(true);
        }
      }
    }
  });

  test("verifies issuerAuth, deviceSignature, and MSO digests", async () => {
    const verifications = await verifyDeviceResponseSignatures({
      deviceResponseBytes: expectedDeviceResponse,
      sessionTranscript,
    });
    expect(verifications.length).toBeGreaterThan(0);
    const doc = verifications[0]!;
    expect(doc.issuerAuth.present).toBe(true);
    expect(doc.issuerAuth.signatureValid).toBe(true);
    expect(doc.deviceSignature.present).toBe(true);
    expect(doc.deviceSignature.signatureValid).toBe(true);
    expect(doc.digests.allMatch).toBe(true);
  });

  test("rebuilds DeviceAuthentication bytes exactly", () => {
    const decoded = cborDecode(expectedDeviceResponse);
    const documents = mapGet(decoded, "documents");
    if (!Array.isArray(documents) || documents.length === 0) throw new Error("no documents");
    const document = documents[0];
    const docType = mapGet(document, "docType");
    const deviceNameSpaces = mapGet(mapGet(document, "deviceSigned"), "nameSpaces");
    const rebuilt = buildDeviceAuthenticationBytes({
      sessionTranscript,
      docType: String(docType),
      deviceNameSpaces,
    });
    expect(hex(rebuilt)).toBe(hex(bytes(join(RESP, "device-authentication.cbor"))));
  });

  test("rejects the response under a tampered SessionTranscript", async () => {
    const tampered = new Uint8Array(sessionTranscript);
    tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 0x01;
    await expect(
      openWalletResponse({
        response: dcapiResponseB64u,
        recipientPrivateKey: await importRecipientPrivateKey(),
        recipientPublicJwk,
        sessionTranscript: tampered,
      }),
    ).rejects.toThrow();
  });

  test("HPKE seal/open round trip", async () => {
    const plaintext = (await import("./cbor.ts")).cborEncode(
      new Map<string, unknown>([
        ["version", "1.0"],
        ["documents", []],
        ["status", 0],
      ]),
    );
    const sealed = await hpkeSealDirectMdoc({
      plaintext,
      recipientPublicJwk,
      info: sessionTranscript,
    });
    const opened = await openWalletResponse({
      response: sealed.response,
      recipientPrivateKey: await importRecipientPrivateKey(),
      recipientPublicJwk,
      sessionTranscript,
    });
    expect(bytesEqual(opened.deviceResponseBytes, plaintext)).toBe(true);
  });
});
