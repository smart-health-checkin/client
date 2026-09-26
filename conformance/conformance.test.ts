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
import { parseSmartCheckinRequest, parseSmartCheckinResponse, type ResponseValidation } from "../src/model/index.js";
import {
  CborTag,
  base64UrlDecodeBytes,
  bytesEqual,
  cborDecode,
  mapGet,
  checkDeviceResponse,
  openWalletCredential,
  buildDcapiSessionTranscript,
  type CheckinWarning,
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
  expected: {
    outcome: "accept" | "warn" | "reject" | "warn-or-reject";
    warnings?: string[];
    outputs?: Record<string, string>;
    items?: Record<string, "unsupported" | "unknown">;
    artifacts?: Record<string, "accepted" | "rejected">;
  };
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
 * when the library rejects the input; otherwise it returns the warnings it
 * reported and whether the outputs match. This library reports warnings, so
 * it is held to them: a warn case must report every expected code, and an
 * accept case must report none.
 */
async function judge(c: Case, attempt: () => Promise<{ ok: boolean; warnings?: CheckinWarning[] }> | { ok: boolean; warnings?: CheckinWarning[] }): Promise<boolean> {
  let result: { ok: boolean; warnings?: CheckinWarning[] } | undefined;
  try {
    result = await attempt();
  } catch (e) {
    if (!(e instanceof Rejected) && !(e instanceof Error)) throw e;
    result = undefined;
  }
  const codes = new Set((result?.warnings ?? []).map((w) => w.code));
  switch (c.expected.outcome) {
    case "reject": return result === undefined;
    case "warn-or-reject": return result === undefined || (result.ok && (c.expected.warnings ?? []).every((w) => codes.has(w as never)));
    case "warn": return !!result?.ok && (c.expected.warnings ?? []).every((w) => codes.has(w as never));
    default: return !!result?.ok && codes.size === 0;
  }
}

/** Per-Artifact and per-item expectations for a response. */
function responseMatches(c: Case, v: ResponseValidation): boolean {
  if (!v.ok) return false;
  for (const [id, want] of Object.entries(c.expected.artifacts ?? {})) {
    const checks = v.artifacts.filter((a) => a.id === id);
    if (!checks.length) return false;
    if (checks.some((a) => a.usable !== (want === "accepted"))) return false;
  }
  for (const [id] of Object.entries(c.expected.items ?? {})) {
    const item = v.items.find((i) => i.id === id);
    if (item && item.status !== undefined) return false;
  }
  return true;
}

async function run(c: Case): Promise<boolean> {
  const i = c.inputs;
  const out = c.expected.outputs ?? {};
  switch (c.capability) {
    case "request-json":
      return judge(c, () => {
        const v = parseSmartCheckinRequest(text(i.request!));
        accepted(v.ok);
        if (!v.ok) return { ok: false };
        const unsupported = new Set(v.unsupportedItems.map((u) => u.id));
        return { ok: Object.keys(c.expected.items ?? {}).every((id) => unsupported.has(id)) };
      });
    case "response-json":
      return judge(c, () => {
        const v = parseSmartCheckinResponse(text(i.response!));
        accepted(v.ok);
        return { ok: responseMatches(c, v) };
      });
    case "cross-validation":
      return judge(c, () => {
        const v = parseSmartCheckinResponse(text(i.response!), jsonOf(i.request!));
        accepted(v.ok);
        return { ok: responseMatches(c, v) };
      });
    case "request-cbor":
      return judge(c, () => {
        const parsed = parseWalletRequest(jsonOf(i.navigatorArgument!));
        return { ok: !out.smartRequest || Bun.deepEquals(parsed.smartRequest, jsonOf(out.smartRequest)), warnings: parsed.warnings };
      });
    case "transcript": {
      const t = await buildDcapiSessionTranscript({ origin: trimmed(i.origin!), encryptionInfo: trimmed(i.encryptionInfo!) });
      return bytesEqual(t, bytes(out.sessionTranscript!));
    }
    case "hpke-open":
      return judge(c, async () => {
        const { key, publicJwk } = await privateKey(i.recipientPrivateJwk!);
        const sessionTranscript = await buildDcapiSessionTranscript({ origin: trimmed(i.origin!), encryptionInfo: trimmed(i.encryptionInfo!) });
        const opened = await openWalletCredential({ credential: jsonOf(i.credential!), recipientPrivateKey: key, recipientPublicJwk: publicJwk, sessionTranscript });
        accepted(opened.ok);
        if (!opened.ok) return { ok: false };
        return { ok: !out.deviceResponse || bytesEqual(opened.deviceResponseBytes, bytes(out.deviceResponse)), warnings: opened.warnings };
      });
    case "mdoc-verify":
      return judge(c, async () => {
        const checked = await checkDeviceResponse({
          deviceResponseBytes: bytes(i.deviceResponse!),
          sessionTranscript: bytes(i.sessionTranscript!),
          ...(i.now ? { now: new Date(trimmed(i.now)) } : {}),
        });
        accepted(checked.ok);
        return { ok: checked.ok, warnings: checked.warnings };
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
  const opened = await openWalletCredential({ credential, recipientPrivateKey: key, recipientPublicJwk: publicJwk, sessionTranscript });
  if (!opened.ok || opened.warnings.length) return false;
  const checked = await checkDeviceResponse({ deviceResponseBytes: opened.deviceResponseBytes, sessionTranscript });
  if (!checked.ok || checked.warnings.length) return false;
  const doc = (mapGet(cborDecode(opened.deviceResponseBytes), "documents") as unknown[])[0];
  const deviceSignature = mapGet(mapGet(mapGet(doc, "deviceSigned"), "deviceAuth"), "deviceSignature") as unknown[];
  if (deviceSignature[2] !== null) return false;
  return Bun.deepEquals(JSON.parse(checked.smartResponseText), jsonOf(i.smartResponse!));
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
void CborTag;
