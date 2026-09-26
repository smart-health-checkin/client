import { describe, expect, test } from "bun:test";
import { mockWallet } from "../testing/index.js";
import { CheckinError, WalletDeclinedError } from "./errors.js";
import { checkinRequest } from "./request.js";
import { runCheckin } from "./run.js";
import { customWallet } from "./wallets.js";

// runCheckin binds the response to the page origin; give the test process one.
(globalThis as { location?: unknown }).location ??= { origin: "https://ehr.example", href: "https://ehr.example/checkin" };

const request = checkinRequest({
  purpose: "Before your visit",
  items: [
    { id: "allergies", title: "Allergies", content: { kind: "selection.fhir", resourceTypes: ["AllergyIntolerance"] }, accept: ["application/fhir+json"] },
    { id: "coverage", title: "Insurance", content: { kind: "selection.fhir", resourceTypes: ["Coverage"] }, accept: ["application/smart-health-card", "application/fhir+json"] },
  ],
});

const allergyBundle = {
  resourceType: "Bundle",
  type: "collection",
  entry: [
    { fullUrl: "urn:uuid:a1", resource: { resourceType: "AllergyIntolerance", id: "a1", patient: { reference: "urn:uuid:p1" } } },
    { fullUrl: "urn:uuid:p1", resource: { resourceType: "Patient", id: "p1" } },
  ],
};

describe("runCheckin outcomes", () => {
  test("completed: lookups by item over the response JSON", async () => {
    const result = await runCheckin(request, {
      wallet: mockWallet({ items: { allergies: { fhir: allergyBundle }, coverage: { status: "declined" } } }),
    });
    expect(result.status).toBe("completed");
    if (result.status !== "completed" || !result.response) throw new Error("no response");
    const r = result.response;
    expect(r.status("allergies")).toBe("fulfilled");
    expect(r.status("coverage")).toBe("declined");
    expect(r.resources("allergies", { type: "AllergyIntolerance" })).toHaveLength(1);
    expect(r.items().map((i) => [i.id, i.status])).toEqual([["allergies", "fulfilled"], ["coverage", "declined"]]);
    const [entry] = r.entries("allergies");
    expect(r.resolve(entry!, "urn:uuid:p1")?.resourceType).toBe("Patient");
    // The full payload is plain JSON, and JSON.stringify gives it back unchanged.
    expect(JSON.parse(JSON.stringify(r))).toEqual(r.json);
    expect(r.json.artifacts[0]?.fulfills).toContain("allergies");
  });

  test("declined when the wallet says no", async () => {
    const wallet = customWallet({ id: "no", name: "No", open: () => ({ getCredential: async () => { throw new WalletDeclinedError(); }, cancel() {} }) });
    expect((await runCheckin(request, { wallet })).status).toBe("declined");
  });

  test("failed with the transport's code", async () => {
    const wallet = customWallet({ id: "blocked", name: "Blocked", open: () => ({ getCredential: async () => { throw new CheckinError("blocked", "tab blocked"); }, cancel() {} }) });
    const result = await runCheckin(request, { wallet });
    expect(result.status === "failed" && result.error.code).toBe("blocked");
  });

  test("failed as unsupported for an unavailable wallet, without opening it", async () => {
    let opened = false;
    const wallet = customWallet({ id: "x", name: "X", available: false, unavailableReason: "no API", open: () => { opened = true; return { getCredential: async () => null, cancel() {} }; } });
    const result = await runCheckin(request, { wallet });
    expect(result.status === "failed" && result.error.code).toBe("unsupported");
    expect(opened).toBe(false);
  });

  test("failed as invalid-response for garbage from the wallet", async () => {
    const wallet = customWallet({ id: "g", name: "Garbage", open: () => ({ getCredential: async () => ({ protocol: "org-iso-mdoc", data: { response: "AAAA" } }), cancel() {} }) });
    const result = await runCheckin(request, { wallet });
    expect(result.status === "failed" && result.error.code).toBe("invalid-response");
  });

  test("the wallet opens synchronously, before runCheckin's first await", () => {
    let opened = false;
    const wallet = customWallet({ id: "s", name: "S", open: () => { opened = true; return { getCredential: async () => null, cancel() {} }; } });
    void runCheckin(request, { wallet });
    expect(opened).toBe(true);
  });

  test("a malformed request rejects", async () => {
    await expect(runCheckin({ items: [{ id: "x" }] } as never, { wallet: mockWallet() })).rejects.toThrow(/invalid check-in request/);
  });
});

// ---- SMART Health Cards, minted here with a throwaway key.
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function mintCard(issuer: string, tamper = false) {
  const keys = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const jwk = { ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1" };
  const payload = { iss: issuer, nbf: 1, vc: { type: ["https://smarthealth.cards#health-card"], credentialSubject: { fhirVersion: "4.0.1", fhirBundle: { resourceType: "Bundle", type: "collection", entry: [{ fullUrl: "resource:0", resource: { resourceType: "Coverage", status: "active" } }] } } } };
  const deflated = new Uint8Array(await new Response(new Blob([JSON.stringify(payload)]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
  const signingInput = `${b64url(new TextEncoder().encode(JSON.stringify({ zip: "DEF", alg: "ES256", kid: "k1" })))}.${b64url(deflated)}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, new TextEncoder().encode(signingInput)));
  if (tamper) sig[0]! ^= 0xff;
  return { jws: `${signingInput}.${b64url(sig)}`, jwks: { keys: [jwk] } };
}

describe("health card trust", () => {
  const withCard = (jws: string) => mockWallet({ items: { allergies: { status: "unavailable" }, coverage: { healthCard: [jws] } } });

  test("trusted issuer: in resources()", async () => {
    const { jws, jwks } = await mintCard("https://issuer.example");
    const result = await runCheckin(request, { wallet: withCard(jws), healthCards: { keys: { "https://issuer.example": jwks } } });
    if (result.status !== "completed" || !result.response) throw new Error(result.status);
    expect(result.response.resources("coverage")).toHaveLength(1);
    expect(result.response.healthCards("coverage")[0]).toMatchObject({ valid: true, trusted: true, accepted: true });
    expect(result.response.entries("coverage")[0]?.source).toBe("health-card");
  });

  test("valid but untrusted: out of resources() by default, in with any-valid", async () => {
    const { jws, jwks } = await mintCard("https://other.example");
    const fetchKeys = (async () => new Response(JSON.stringify(jwks))) as unknown as typeof fetch;
    const strict = await runCheckin(request, { wallet: withCard(jws), fetch: fetchKeys, healthCards: { issuers: ["https://issuer.example"] } });
    if (strict.status !== "completed" || !strict.response) throw new Error(strict.status);
    expect(strict.response.resources("coverage")).toHaveLength(0);
    expect(strict.response.healthCards("coverage")[0]).toMatchObject({ valid: true, trusted: false, accepted: false });
    expect(strict.response.entries("coverage")).toHaveLength(1);

    const open = await runCheckin(request, { wallet: withCard(jws), fetch: fetchKeys, healthCards: { accept: "any-valid" } });
    if (open.status !== "completed" || !open.response) throw new Error(open.status);
    expect(open.response.resources("coverage")).toHaveLength(1);
  });

  test("invalid signature: only with accept everything", async () => {
    const { jws, jwks } = await mintCard("https://issuer.example", true);
    const keys = { "https://issuer.example": jwks };
    const anyValid = await runCheckin(request, { wallet: withCard(jws), healthCards: { keys, accept: "any-valid" } });
    if (anyValid.status !== "completed" || !anyValid.response) throw new Error(anyValid.status);
    expect(anyValid.response.resources("coverage")).toHaveLength(0);
    expect(anyValid.response.healthCards("coverage")[0]?.valid).toBe(false);

    const everything = await runCheckin(request, { wallet: withCard(jws), healthCards: { keys, accept: "everything" } });
    if (everything.status !== "completed" || !everything.response) throw new Error(everything.status);
    expect(everything.response.resources("coverage")).toHaveLength(1);
  });
});
