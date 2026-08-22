import { describe, expect, test } from "bun:test";
import { requestCheckin, runCheckin } from "./index.js";
import { createMockWalletCredentialGetter } from "./mock-wallet.js";
import { createBrowserLocalAuthority, type VerifierAuthority } from "../browser/index.js";
import type { SmartCheckinResponse } from "../model/index.js";

import type { FetchLike } from "../fetch-like.js";
const ORIGIN = "http://localhost:3010";

function localAuthority(): VerifierAuthority {
  return createBrowserLocalAuthority({ origin: ORIGIN });
}

describe("runCheckin", () => {
  test("full pipeline with the mock wallet returns a validated response", async () => {
    const outcome = await runCheckin(
      { scenario: "new-patient" },
      {
        authority: localAuthority(),
        getCredential: createMockWalletCredentialGetter({ origin: ORIGIN }),
      },
    );
    expect(outcome.status).toBe("completed");
    expect(outcome.request.id).toBe("demo-new-patient");
    expect(outcome.response?.requestId).toBe("demo-new-patient");
    // the kit knows nothing about submission
    expect("submission" in outcome).toBe(false);
  });

  test("requestCheckin accepts an inline request init and returns the response", async () => {
    const response = await requestCheckin(
      {
        purpose: "Allergy review",
        items: [
          {
            id: "allergies",
            title: "Allergies and intolerances",
            content: {
              kind: "selection.fhir",
              profiles: [
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
              ],
            },
            accept: ["application/fhir+json"],
          },
        ],
      },
      {
        authority: localAuthority(),
        getCredential: createMockWalletCredentialGetter({ origin: ORIGIN }),
      },
    );
    const artifact = response.artifacts[0] as {
      value: { entry: Array<{ resource: { resourceType: string } }> };
    };
    expect(artifact.value.entry[0]!.resource.resourceType).toBe("AllergyIntolerance");
    expect(response.requestStatus.map((s) => s.item)).toEqual(["allergies"]);
  });

  test("registerScenario makes a custom name usable", async () => {
    const { registerScenario, resolveScenario } = await import("./scenarios.js");
    registerScenario("test-intake", {
      purpose: "Test intake",
      items: [
        {
          id: "meds",
          title: "Medication list",
          content: { kind: "selection.fhir" },
          accept: ["application/fhir+json"],
        },
      ],
    });
    const scenario = resolveScenario("test-intake");
    expect(scenario.request.type).toBe("smart-health-checkin-request");
    expect(scenario.request.id.length).toBeGreaterThan(0);
    expect(scenario.description).toBe("Test intake");
  });

  test("phq2 scenario yields a QuestionnaireResponse artifact", async () => {
    const outcome = await runCheckin(
      { scenario: "phq2-dayof" },
      {
        authority: localAuthority(),
        getCredential: createMockWalletCredentialGetter({ origin: ORIGIN }),
      },
    );
    expect(outcome.status).toBe("completed");
    const artifact = outcome.response!.artifacts[0] as { value: { resourceType: string } };
    expect(artifact.value.resourceType).toBe("QuestionnaireResponse");
  });

  test("user cancellation maps to declined", async () => {
    const outcome = await runCheckin(
      { scenario: "insurance-only" },
      {
        authority: localAuthority(),
        getCredential: async () => {
          const e = new Error("The request has been aborted.");
          e.name = "NotAllowedError";
          throw e;
        },
      },
    );
    expect(outcome.status).toBe("declined");
  });

  test("missing DC API support maps to unsupported", async () => {
    const outcome = await runCheckin(
      { scenario: "insurance-only" },
      {
        authority: localAuthority(),
        detectSupport: () => ({ state: "unsupported", reason: "test environment" }),
      },
    );
    expect(outcome.status).toBe("unsupported");
    expect(outcome.error?.message).toBe("test environment");
  });

  test("a custom authority returning a mismatched response fails at the validate stage", async () => {
    const bogus: SmartCheckinResponse = {
      type: "smart-health-checkin-response",
      version: "1",
      requestId: "some-other-request",
      artifacts: [],
      requestStatus: [],
    };
    const authority: VerifierAuthority = {
      kind: "test",
      async prepareCredentialRequest() {
        return { handle: "h", navigatorArgument: {} as never };
      },
      async completeCredentialRequest() {
        return {
          smartResponse: bogus,
          presentation: { origin: ORIGIN, deviceResponseHex: "" },
        };
      },
    };
    const outcome = await runCheckin(
      { scenario: "insurance-only" },
      { authority, getCredential: async () => ({ data: { response: "unused" } }) },
    );
    expect(outcome.status).toBe("error");
    expect(outcome.error?.stage).toBe("validate");
  });

  test("unknown scenario throws synchronously-shaped error", async () => {
    await expect(
      runCheckin({ scenario: "nope" }, { authority: localAuthority() }),
    ).rejects.toThrow(/unknown scenario/);
  });
});

describe("mock wallet specification", () => {
  const REQUEST = {
    purpose: "Mock spec",
    items: [
      {
        id: "allergies",
        title: "Allergies",
        content: { kind: "selection.fhir" as const },
        accept: ["application/fhir+json"],
      },
      {
        id: "coverage",
        title: "Coverage",
        content: { kind: "selection.fhir" as const },
        accept: ["application/smart-health-card", "application/fhir+json"],
      },
      {
        id: "intake",
        title: "Intake",
        content: { kind: "form.fhir" as const, questionnaireCanonical: "https://example.org/q" },
        accept: ["application/fhir+json"],
      },
    ],
  };

  test("returns exactly the data a test pins, per item", async () => {
    const { requestCheckin, buildRequest } = await import("./index.js");
    const { createMockWalletCredentialGetter } = await import("./mock-wallet.js");
    const request = buildRequest(REQUEST);
    const myBundle = {
      resourceType: "Bundle",
      type: "collection",
      entry: [{ resource: { resourceType: "AllergyIntolerance", code: { text: "Sesame" } } }],
    };

    const response = await requestCheckin(request, {
      authority: localAuthority(),
      getCredential: createMockWalletCredentialGetter({
        origin: ORIGIN,
        items: {
          allergies: { fhir: myBundle },
          coverage: { healthCard: ["eyJ.mock.jws"] },
          intake: { status: "declined", message: "not now" },
        },
      }),
    });

    const allergy = response.artifacts.find((a) => a.fulfills.includes("allergies"))!;
    expect((allergy as { value: typeof myBundle }).value).toEqual(myBundle);

    const card = response.artifacts.find((a) => a.fulfills.includes("coverage"))!;
    expect(card.mediaType).toBe("application/smart-health-card");
    expect((card as { value: { verifiableCredential: string[] } }).value.verifiableCredential).toEqual([
      "eyJ.mock.jws",
    ]);

    expect(response.artifacts.some((a) => a.fulfills.includes("intake"))).toBe(false);
    const intakeStatus = response.requestStatus.find((s) => s.item === "intake")!;
    expect(intakeStatus.status).toBe("declined");
    expect(intakeStatus.message).toBe("not now");
  });

  test("fallback governs items the spec doesn't name", async () => {
    const { buildRequest } = await import("./index.js");
    const { buildMockResponse } = await import("./mock-wallet.js");
    const request = buildRequest(REQUEST);

    const declined = buildMockResponse(request, {
      items: { allergies: { fhir: { resourceType: "Bundle", type: "collection", entry: [] } } },
      fallback: { status: "unavailable" },
    });
    expect(declined.artifacts).toHaveLength(1);
    expect(declined.requestStatus.map((s) => s.status)).toEqual([
      "fulfilled",
      "unavailable",
      "unavailable",
    ]);

    // default fallback still invents plausible data for every item
    const fabricated = buildMockResponse(request);
    expect(fabricated.requestStatus).toHaveLength(3);
    expect(fabricated.artifacts.length).toBeGreaterThan(0);
  });
});

describe("server authority", () => {
  const authority = (completion: unknown): VerifierAuthority => ({
    kind: "server-owned-test",
    async prepareCredentialRequest() {
      return { handle: "h", navigatorArgument: {} as never };
    },
    async completeCredentialRequest() {
      return completion as never;
    },
  });

  test("a server that keeps the data yields a reference, not a response", async () => {
    const outcome = await runCheckin(
      { scenario: "insurance-only" },
      {
        authority: authority({ handledByServer: true, reference: "encounter-1/checkin-2" }),
        getCredential: async () => ({ data: { response: "sealed" } }),
      },
    );
    expect(outcome.status).toBe("completed");
    expect(outcome.response).toBeUndefined();
    expect(outcome.serverReference).toBe("encounter-1/checkin-2");
  });

  test("requestCheckin refuses that mode with an explanation", async () => {
    await expect(
      requestCheckin(
        { scenario: "insurance-only" },
        {
          authority: authority({ handledByServer: true }),
          getCredential: async () => ({ data: { response: "sealed" } }),
        },
      ),
    ).rejects.toThrow(/handledByServer/);
  });
});

describe("responder policy", () => {
  test("resolves platform + web wallets + mock into a renderable list", async () => {
    const { resolveResponders, credentialGetterFor } = await import("./responders.js");
    const responders = await resolveResponders(
      {
        platform: true,
        webWallets: [
          { id: "demo", name: "Demo Health Wallet", walletUrl: "/demo/wallet.html" },
          { id: "other", name: "Other Wallet", walletUrl: "https://other.example/w", target: "popup" },
        ],
        mock: true,
        origin: ORIGIN,
      },
      { detectSupport: () => ({ state: "unsupported", reason: "no DC API in this test" }) },
    );

    expect(responders.map((r) => [r.id, r.kind, r.available])).toEqual([
      ["platform", "platform", false],
      ["demo", "web", true],
      ["other", "web", true],
      ["mock", "mock", true],
    ]);
    // an unavailable platform option is listed with a reason, not hidden
    expect(responders[0]!.reason).toBe("no DC API in this test");

    expect(credentialGetterFor(responders[0]!, { origin: ORIGIN })).toBeUndefined();
    expect(typeof credentialGetterFor(responders[1]!, { origin: ORIGIN })).toBe("function");
    expect(typeof credentialGetterFor(responders[3]!, { origin: ORIGIN })).toBe("function");
  });

  test("a malformed registry throws instead of falling back", async () => {
    const { loadWalletRegistry, validateWalletRegistry } = await import("./wallet-registry.js");
    expect(validateWalletRegistry({ wallets: [] }).ok).toBe(false);
    expect(validateWalletRegistry({ wallets: [{ id: "a", name: "A" }] }).ok).toBe(false);
    expect(
      validateWalletRegistry({
        wallets: [
          { id: "a", name: "A", walletUrl: "/w" },
          { id: "a", name: "B", walletUrl: "/w2" },
        ],
      }).ok,
    ).toBe(false);
    await expect(loadWalletRegistry([{ id: "x" } as never])).rejects.toThrow(/invalid wallet registry/);
  });

  test("fetches a registry from a URL", async () => {
    const { loadWalletRegistry } = await import("./wallet-registry.js");
    const registry = await loadWalletRegistry("https://example.org/wallets.json", {
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({ wallets: [{ id: "w", name: "W", walletUrl: "/w" }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        )) as FetchLike,
    });
    expect(registry.wallets).toHaveLength(1);
    expect(registry.source).toBe("https://example.org/wallets.json");
  });
});
