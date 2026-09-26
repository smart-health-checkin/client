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
  expected: { outcome: "accept" | "warn" | "reject" | "warn-or-reject"; warnings?: string[]; outputs?: Record<string, string> };
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

class Rejected extends Error {}
const accepted = (ok: boolean) => { if (!ok) throw new Rejected(); };

/**
 * Did this library reach the expected outcome for the case? `attempt` throws
 * when the library rejects the input; otherwise it returns whether the
 * outputs match. accept and warn both require accepting (warnings are
 * advisory, and this library doesn't report them yet).
 */
async function judge(c: Case, attempt: () => Promise<boolean> | boolean): Promise<boolean> {
  let rejected = false;
  let outputsOk = false;
  try {
    outputsOk = await attempt();
  } catch {
    rejected = true;
  }
  switch (c.expected.outcome) {
    case "reject": return rejected;
    case "warn-or-reject": return rejected || outputsOk;
    default: return !rejected && outputsOk;
  }
}

async function run(c: Case): Promise<boolean> {
  const i = c.inputs;
  const out = c.expected.outputs ?? {};
  switch (c.capability) {
    case "request-json":
      return judge(c, () => { accepted(validateSmartCheckinRequest(JSON.parse(text(i.request!))).ok); return true; });
    case "response-json":
      return judge(c, () => { accepted(validateSmartCheckinResponse(JSON.parse(text(i.response!))).ok); return true; });
    case "cross-validation":
      return judge(c, () => { accepted(validateResponseAgainstRequest(jsonOf(i.request!), jsonOf(i.response!)).ok); return true; });
    case "request-cbor":
      return judge(c, () => {
        const parsed = parseWalletRequest(jsonOf(i.navigatorArgument!));
        return !out.smartRequest || Bun.deepEquals(parsed.smartRequest, jsonOf(out.smartRequest));
      });
    case "transcript": {
      const t = await buildDcapiSessionTranscript({ origin: trimmed(i.origin!), encryptionInfo: trimmed(i.encryptionInfo!) });
      return bytesEqual(t, bytes(out.sessionTranscript!));
    }
    case "hpke-open":
      return judge(c, async () => {
        const { key, publicJwk } = await privateKey(i.recipientPrivateJwk!);
        const sessionTranscript = await buildDcapiSessionTranscript({ origin: trimmed(i.origin!), encryptionInfo: trimmed(i.encryptionInfo!) });
        const opened = await openWalletResponse({ response: jsonOf(i.credential!), recipientPrivateKey: key, recipientPublicJwk: publicJwk, sessionTranscript });
        return !out.deviceResponse || bytesEqual(opened.deviceResponseBytes, bytes(out.deviceResponse));
      });
    case "mdoc-verify":
      // The library's only mdoc check today: every signature and digest must verify.
      return judge(c, async () => {
        const [v] = await verifyDeviceResponseSignatures({ deviceResponseBytes: bytes(i.deviceResponse!), sessionTranscript: bytes(i.sessionTranscript!) });
        accepted(!!v && !!v.issuerAuth.signatureValid && !!v.deviceSignature.signatureValid && v.digests.allMatch);
        return true;
      });
    case "wallet-response": {
      const { encryptionInfoBytes } = parseWalletRequest(jsonOf(i.navigatorArgument!));
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
