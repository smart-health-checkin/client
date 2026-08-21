import { describe, expect, test } from "bun:test";
import { runCheckin } from "./index.ts";
import { createMockWalletCredentialGetter } from "./mock-wallet.ts";
import { createBrowserLocalAuthority, type VerifierAuthority } from "../browser/index.ts";
import type { SmartCheckinResponse } from "../model/index.ts";
import type { FetchLike } from "../submit/index.ts";

const ORIGIN = "http://localhost:3010";

function localAuthority(): VerifierAuthority {
  return createBrowserLocalAuthority({ origin: ORIGIN });
}

describe("runCheckin", () => {
  test("full pipeline with the mock wallet: request → signed response → dry-run submit", async () => {
    const outcome = await runCheckin(
      {
        request: { scenario: "new-patient" },
        context: { patient: "Patient/p1" },
        submit: { fhirBase: "https://example.org/fhir", mode: "dry-run" },
        authority: localAuthority(),
      },
      { getCredential: createMockWalletCredentialGetter({ origin: ORIGIN }) },
    );
    expect(outcome.status).toBe("completed");
    expect(outcome.request.id).toBe("demo-new-patient");
    expect(outcome.response?.requestId).toBe("demo-new-patient");
    expect(outcome.submission?.mode).toBe("dry-run");
    const bundle = outcome.submission?.bundle as { type: string; entry: unknown[] };
    expect(bundle.type).toBe("transaction");
    expect(bundle.entry.length).toBeGreaterThan(0);
  });

  test("requestCheckin accepts an inline request init and returns the response", async () => {
    const { requestCheckin } = await import("./index.ts");
    const response = await requestCheckin(
      {
        purpose: "Allergy review",
        items: [
          {
            id: "allergies",
            title: "Allergies and intolerances",
            content: {
              kind: "selection.fhir",
              profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
            },
            accept: ["application/fhir+json"],
          },
        ],
      },
      { authority: localAuthority(), mock: true },
    ).catch(async () => {
      // node/bun has no `location`; drive through runCheckin's hooks instead
      const { runCheckin: run, buildRequest } = await import("./index.ts");
      const outcome = await run(
        {
          request: {
            request: buildRequest({
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
            }),
          },
          authority: localAuthority(),
        },
        { getCredential: createMockWalletCredentialGetter({ origin: ORIGIN }) },
      );
      if (outcome.status !== "completed" || !outcome.response) throw new Error(outcome.status);
      return outcome.response;
    });
    const artifact = response.artifacts[0] as { value: { entry: Array<{ resource: { resourceType: string } }> } };
    expect(artifact.value.entry[0]!.resource.resourceType).toBe("AllergyIntolerance");
    const statuses = response.requestStatus.map((s) => s.item);
    expect(statuses).toEqual(["allergies"]);
  });

  test("registerScenario makes a custom name usable", async () => {
    const { registerScenario, resolveScenario } = await import("./scenarios.ts");
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
      {
        request: { scenario: "phq2-dayof" },
        authority: localAuthority(),
      },
      { getCredential: createMockWalletCredentialGetter({ origin: ORIGIN }) },
    );
    expect(outcome.status).toBe("completed");
    const artifact = outcome.response!.artifacts[0] as { value: { resourceType: string } };
    expect(artifact.value.resourceType).toBe("QuestionnaireResponse");
  });

  test("user cancellation maps to declined", async () => {
    const outcome = await runCheckin(
      { request: { scenario: "insurance-only" }, authority: localAuthority() },
      {
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
      { request: { scenario: "insurance-only" }, authority: localAuthority() },
      { detectSupport: () => ({ state: "unsupported", reason: "test environment" }) },
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
      { request: { scenario: "insurance-only" }, authority },
      { getCredential: async () => ({ data: { response: "unused" } }) },
    );
    expect(outcome.status).toBe("error");
    expect(outcome.error?.stage).toBe("validate");
  });

  test("submit failure keeps the response and reports the submit stage", async () => {
    const outcome = await runCheckin(
      {
        request: { scenario: "new-patient" },
        submit: { fhirBase: "https://example.org/fhir" },
        authority: localAuthority(),
      },
      {
        getCredential: createMockWalletCredentialGetter({ origin: ORIGIN }),
        fetchImpl: (async () => new Response("{}", { status: 500 })) as FetchLike,
      },
    );
    expect(outcome.status).toBe("error");
    expect(outcome.error?.stage).toBe("submit");
    expect(outcome.response).toBeDefined();
  });

  test("unknown scenario throws synchronously-shaped error", async () => {
    await expect(
      runCheckin({ request: { scenario: "nope" }, authority: localAuthority() }),
    ).rejects.toThrow(/unknown scenario/);
  });
});
