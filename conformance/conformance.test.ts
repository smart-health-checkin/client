/**
 * The spec's conformance cases (github.com/smart-health-checkin/spec,
 * conformance/), run against this library. Cases are fetched at a pinned ref
 * by scripts/fetch-conformance.sh. Every claimed case must pass except those
 * listed in known-failures.json, which must still fail: a listed case that
 * starts passing fails this suite too, so remove it from the list.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateResponseAgainstRequest, validateSmartCheckinRequest, validateSmartCheckinResponse } from "../src/model/index.js";
import {
  CborTag,
  base64UrlDecodeBytes,
  bytesEqual,
  cborDecode,
  mapGet,
  openWalletResponse,
  verifyDeviceResponseSignatures,
  buildDcapiSessionTranscript,
} from "../src/wire/index.js";
import { parseWalletRequest, sealWalletResponse } from "../src/wallet/index.js";

const ROOT = join(import.meta.dir, "../spec-conformance");
if (process.env.SPEC_CONFORMANCE_DIR || !existsSync(join(ROOT, ".ref"))) {
  const fetched = Bun.spawnSync([join(import.meta.dir, "../scripts/fetch-conformance.sh")], { stdout: "inherit", stderr: "inherit" });
  if (!fetched.success) throw new Error("could not fetch conformance cases: run scripts/fetch-conformance.sh");
}

type Case = {
  id: string;
  capability: string;
  description: string;
  inputs: Record<string, string>;
  expected: { valid: boolean; outputs?: Record<string, string>; artifacts?: Record<string, string> };
  status: "active" | "pending";
};
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8")) as { cases: Case[] };
const config = JSON.parse(readFileSync(join(import.meta.dir, "known-failures.json"), "utf8")) as {
  claims: string[];
  notClaimed: Record<string, string>;
  knownFailures: Record<string, string>;
};

const text = (p: string) => readFileSync(join(ROOT, p), "utf8");
const trimmed = (p: string) => text(p).trim();
const bytes = (p: string) => new Uint8Array(readFileSync(join(ROOT, p)));
const jsonOf = (p: string) => JSON.parse(text(p));

async function privateKey(jwkPath: string): Promise<{ key: CryptoKey; publicJwk: JsonWebKey }> {
  const jwk = jsonOf(jwkPath) as JsonWebKey;
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  return { key, publicJwk: { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y } };
}

/** Did this library reach the expected verdict (and outputs) for the case? */
async function run(c: Case): Promise<boolean> {
  const i = c.inputs;
  const verdict = async (f: () => Promise<boolean> | boolean) => {
    try {
      return (await f()) === c.expected.valid;
    } catch {
      return c.expected.valid === false;
    }
  };
  switch (c.capability) {
    case "request-json":
      return verdict(() => validateSmartCheckinRequest(JSON.parse(text(i.request!))).ok);
    case "response-json":
      return verdict(() => validateSmartCheckinResponse(JSON.parse(text(i.response!))).ok);
    case "cross-validation":
      return verdict(() => validateResponseAgainstRequest(jsonOf(i.request!), jsonOf(i.response!)).ok);
    case "request-cbor":
      return verdict(() => {
        const parsed = parseWalletRequest(jsonOf(i.navigatorArgument!));
        if (!c.expected.valid) return true;
        return Bun.deepEquals(parsed.smartRequest, jsonOf(c.expected.outputs!.smartRequest!));
      });
    case "transcript": {
      const t = await buildDcapiSessionTranscript({ origin: trimmed(i.origin!), encryptionInfo: trimmed(i.encryptionInfo!) });
      return bytesEqual(t, bytes(c.expected.outputs!.sessionTranscript!));
    }
    case "hpke-open":
      return verdict(async () => {
        const { key, publicJwk } = await privateKey(i.recipientPrivateJwk!);
        const sessionTranscript = await buildDcapiSessionTranscript({ origin: trimmed(i.origin!), encryptionInfo: trimmed(i.encryptionInfo!) });
        const opened = await openWalletResponse({ response: jsonOf(i.credential!), recipientPrivateKey: key, recipientPublicJwk: publicJwk, sessionTranscript });
        if (!c.expected.valid) return true;
        return bytesEqual(opened.deviceResponseBytes, bytes(c.expected.outputs!.deviceResponse!));
      });
    case "mdoc-verify":
      return verdict(async () => {
        const [v] = await verifyDeviceResponseSignatures({ deviceResponseBytes: bytes(i.deviceResponse!), sessionTranscript: bytes(i.sessionTranscript!) });
        return !!v && !!v.issuerAuth.signatureValid && !!v.deviceSignature.signatureValid && v.digests.allMatch;
      });
    case "wallet-response": {
      const { smartRequest, encryptionInfoBytes } = parseWalletRequest(jsonOf(i.navigatorArgument!));
      void smartRequest;
      const credential = await sealWalletResponse({ smartResponse: jsonOf(i.smartResponse!), encryptionInfoBytes, verifierOrigin: trimmed(i.origin!) });
      return referenceVerifies(credential, c);
    }
  }
  throw new Error(`no runner for ${c.capability}`);
}

/** The reference check for a wallet's output: opens, verifies, detached device signature, validityInfo, same SMART response. */
async function referenceVerifies(credential: unknown, c: Case): Promise<boolean> {
  const i = c.inputs;
  const { key, publicJwk } = await privateKey(i.recipientPrivateJwk!);
  const sessionTranscript = await buildDcapiSessionTranscript({ origin: trimmed(i.origin!), encryptionInfo: trimmed(i.encryptionInfo!) });
  const opened = await openWalletResponse({ response: credential as never, recipientPrivateKey: key, recipientPublicJwk: publicJwk, sessionTranscript });
  const [v] = await verifyDeviceResponseSignatures({ deviceResponseBytes: opened.deviceResponseBytes, sessionTranscript });
  if (!v?.issuerAuth.signatureValid || !v.deviceSignature.signatureValid || !v.digests.allMatch) return false;
  const doc = (mapGet(cborDecode(opened.deviceResponseBytes), "documents") as unknown[])[0];
  const deviceSignature = mapGet(mapGet(mapGet(doc, "deviceSigned"), "deviceAuth"), "deviceSignature") as unknown[];
  if (deviceSignature[2] !== null) return false;
  const issuerAuth = mapGet(mapGet(doc, "issuerSigned"), "issuerAuth") as unknown[];
  const mso = cborDecode(((cborDecode(issuerAuth[2] as Uint8Array)) as CborTag).value as Uint8Array);
  if (!(mapGet(mso, "validityInfo") instanceof Map)) return false;
  const items = mapGet(mapGet(mapGet(doc, "issuerSigned"), "nameSpaces"), "org.smarthealthit.checkin") as CborTag[];
  const element = mapGet(cborDecode(items[0]!.value as Uint8Array), "elementValue");
  return typeof element === "string" && Bun.deepEquals(JSON.parse(element), jsonOf(i.smartResponse!));
}

const claimed = new Set(config.claims);
for (const id of Object.keys(config.knownFailures)) {
  if (!manifest.cases.some((c) => c.id === id)) throw new Error(`known-failures.json lists ${id}, which isn't in the manifest`);
}

describe("spec conformance", () => {
  for (const c of manifest.cases) {
    const skip = c.status === "pending" || !claimed.has(c.capability);
    const known = config.knownFailures[c.id];
    test.skipIf(skip)(`${c.id}${known ? " (known failure)" : ""}`, async () => {
      const passed = await run(c);
      if (known) expect(passed, `${c.id} passes now: remove it from known-failures.json`).toBe(false);
      else expect(passed, `${c.id}: ${c.description}`).toBe(true);
    });
  }
});

void base64UrlDecodeBytes;
