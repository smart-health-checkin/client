/**
 * The device signature binds a response to this session. ISO 18013-5 detaches
 * its payload; an attached payload is accepted only when it is exactly this
 * session's DeviceAuthentication. Also checks the MSO the wallet-side code
 * builds carries ISO validityInfo.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSignedDeviceResponse } from "../wallet/seal.js";
import { CborTag, cborDecode, cborEncode, mapGet } from "./cbor.js";
import { buildDcapiSessionTranscript } from "./request.js";
import { verifyDeviceResponseSignatures } from "./verify.js";

const FIXTURES = join(import.meta.dir, "../../fixtures");
// The fixtures come from the spec repo at a pinned tag. fetch-spec.sh returns
// at once when they are already current.
{
  const fetched = Bun.spawnSync([join(import.meta.dir, "../../scripts/fetch-spec.sh")], { stdout: "inherit", stderr: "inherit" });
  if (!fetched.success) throw new Error("could not fetch the spec fixtures: run scripts/fetch-spec.sh");
}
// A synthetic DeviceResponse whose device signature carries an attached payload
// equal to this session's DeviceAuthentication (spec conformance case).
const ATTACHED = join(FIXTURES, "../spec-conformance/mdoc-verify/attached-payload-equal");
const bytes = (path: string): Uint8Array => new Uint8Array(readFileSync(path));

const transcript = (origin: string) =>
  buildDcapiSessionTranscript({ origin, encryptionInfo: "AAAA" });

function deviceSignatureOf(deviceResponseBytes: Uint8Array): unknown[] {
  const doc = (mapGet(cborDecode(deviceResponseBytes), "documents") as unknown[])[0];
  return mapGet(mapGet(mapGet(doc, "deviceSigned"), "deviceAuth"), "deviceSignature") as unknown[];
}

/** Re-encode the DeviceResponse with the device signature's COSE_Sign1 changed. */
function withDeviceSignature(deviceResponseBytes: Uint8Array, change: (cose: unknown[]) => unknown[]): Uint8Array {
  const decoded = cborDecode(deviceResponseBytes) as Map<string, unknown>;
  const doc = (decoded.get("documents") as Map<string, unknown>[])[0]!;
  const deviceAuth = (doc.get("deviceSigned") as Map<string, unknown>).get("deviceAuth") as Map<string, unknown>;
  deviceAuth.set("deviceSignature", change(deviceAuth.get("deviceSignature") as unknown[]));
  return cborEncode(decoded);
}

describe("device signature", () => {
  test("a detached signature over this session verifies", async () => {
    const sessionTranscript = await transcript("https://clinic.example");
    const response = await buildSignedDeviceResponse({ smartResponseJson: "{}", sessionTranscript });
    expect(deviceSignatureOf(response)[2]).toBeNull();
    const [v] = await verifyDeviceResponseSignatures({ deviceResponseBytes: response, sessionTranscript });
    expect(v!.deviceSignature.signatureValid).toBe(true);
  });

  test("an attached payload equal to this session's DeviceAuthentication verifies", async () => {
    const response = bytes(join(ATTACHED, "device-response.cbor"));
    expect(deviceSignatureOf(response)[2]).toBeInstanceOf(Uint8Array);
    const [v] = await verifyDeviceResponseSignatures({
      deviceResponseBytes: response,
      sessionTranscript: bytes(join(ATTACHED, "session-transcript.cbor")),
    });
    expect(v!.deviceSignature.signatureValid).toBe(true);
  });

  test("an attached payload signed for another session is rejected", async () => {
    // The signature is genuinely valid over its attached payload, so
    // trusting the attached bytes would pass it under any transcript.
    const [v] = await verifyDeviceResponseSignatures({
      deviceResponseBytes: bytes(join(ATTACHED, "device-response.cbor")),
      sessionTranscript: await transcript("https://someone-else.example"),
    });
    expect(v!.deviceSignature.signatureValid).toBe(false);
    expect(v!.deviceSignature.error).toContain("attached payload");
  });

  test("a detached signature checked under another session is rejected", async () => {
    const response = await buildSignedDeviceResponse({
      smartResponseJson: "{}",
      sessionTranscript: await transcript("https://clinic.example"),
    });
    const [v] = await verifyDeviceResponseSignatures({
      deviceResponseBytes: response,
      sessionTranscript: await transcript("https://someone-else.example"),
    });
    expect(v!.deviceSignature.signatureValid).toBe(false);
  });

  test("a tampered signature is rejected", async () => {
    const sessionTranscript = await transcript("https://clinic.example");
    const response = await buildSignedDeviceResponse({ smartResponseJson: "{}", sessionTranscript });
    const tampered = withDeviceSignature(response, (cose) => {
      const sig = new Uint8Array(cose[3] as Uint8Array);
      sig[0] = sig[0]! ^ 0x01;
      return [cose[0], cose[1], cose[2], sig];
    });
    const [v] = await verifyDeviceResponseSignatures({ deviceResponseBytes: tampered, sessionTranscript });
    expect(v!.deviceSignature.signatureValid).toBe(false);
  });
});

describe("MSO built by the wallet-side code", () => {
  test("carries ISO validityInfo as whole-second UTC tdates, valid for one day", async () => {
    const now = new Date("2026-09-26T12:34:56.789Z");
    const response = await buildSignedDeviceResponse({
      smartResponseJson: "{}",
      sessionTranscript: await transcript("https://clinic.example"),
      now,
    });
    const doc = (mapGet(cborDecode(response), "documents") as unknown[])[0];
    const issuerAuth = mapGet(mapGet(doc, "issuerSigned"), "issuerAuth") as unknown[];
    const msoTag = cborDecode(issuerAuth[2] as Uint8Array) as CborTag;
    expect(msoTag.tag).toBe(24);
    const mso = cborDecode(msoTag.value as Uint8Array);
    expect(mapGet(mso, "version")).toBe("1.0");
    expect(mapGet(mso, "digestAlgorithm")).toBe("SHA-256");
    const validity = mapGet(mso, "validityInfo");
    const tdate = (key: string) => {
      const value = mapGet(validity, key);
      expect(value).toBeInstanceOf(CborTag);
      expect((value as CborTag).tag).toBe(0);
      return (value as CborTag).value;
    };
    expect(tdate("signed")).toBe("2026-09-26T12:34:56Z");
    expect(tdate("validFrom")).toBe("2026-09-26T12:34:56Z");
    expect(tdate("validUntil")).toBe("2026-09-27T12:34:56Z");
  });
});
