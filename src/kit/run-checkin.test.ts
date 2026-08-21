import { describe, expect, test } from "bun:test";
import { requestCheckin, runCheckin } from "./index.js";
import { createMockWalletCredentialGetter } from "./mock-wallet.js";
import { createBrowserLocalAuthority, type VerifierAuthority } from "../browser/index.js";
import type { SmartCheckinResponse } from "../model/index.js";

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
