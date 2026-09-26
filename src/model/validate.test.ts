import { describe, expect, test } from "bun:test";
import {
  parseSmartCheckinRequest,
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  validateSmartCheckinResponse,
  type ResponseValidation,
} from "./validate.js";

/** Ids of the Artifacts that survived validation. */
const usableIds = (v: ResponseValidation) => (v.ok ? v.usableArtifacts.map((a) => a.id) : undefined);
/** The status the validation assigned an item, or undefined when it has none. */
const statusOf = (v: ResponseValidation, id: string) => (v.ok ? v.items.find((i) => i.id === id)?.status : "rejected");
import type { SmartCheckinRequest, SmartCheckinResponse } from "./types.js";

const REQUEST: SmartCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "req-1",
  purpose: "Clinic check-in",
  fhirVersions: ["4.0.1"],
  items: [
    {
      id: "summary",
      title: "Clinical summary",
      required: true,
      content: { kind: "selection.fhir", profilesFrom: ["http://hl7.org/fhir/us/core"] },
      accept: ["application/fhir+json"],
    },
    {
      id: "intake",
      title: "Intake form",
      content: { kind: "form.fhir", questionnaireCanonical: "https://example.org/q/intake|1" },
      accept: ["application/fhir+json"],
    },
  ],
};

const RESPONSE: SmartCheckinResponse = {
  type: "smart-health-checkin-response",
  version: "1",
  requestId: "req-1",
  artifacts: [
    {
      id: "a1",
      mediaType: "application/fhir+json",
      fhirVersion: "4.0.1",
      fulfills: ["summary", "intake"],
      value: { resourceType: "Bundle", type: "collection", entry: [] },
    },
  ],
  requestStatus: [
    { item: "summary", status: "fulfilled" },
    { item: "intake", status: "fulfilled" },
  ],
};

describe("request validation", () => {
  test("accepts a well-formed request", () => {
    expect(validateSmartCheckinRequest(REQUEST).ok).toBe(true);
  });

  test("rejects wrong discriminator, duplicate item ids, empty accept", () => {
    expect(validateSmartCheckinRequest({ ...REQUEST, type: "nope" }).ok).toBe(false);
    expect(
      validateSmartCheckinRequest({
        ...REQUEST,
        items: [REQUEST.items[0], REQUEST.items[0]],
      }).ok,
    ).toBe(false);
    expect(
      validateSmartCheckinRequest({
        ...REQUEST,
        items: [{ ...REQUEST.items[0]!, accept: [] }],
      }).ok,
    ).toBe(false);
  });

  test("ignores legacy form selector members; an empty form selector makes only that item unsupported", () => {
    const legacy = validateSmartCheckinRequest({
      ...REQUEST,
      items: [{ ...REQUEST.items[1]!, content: { kind: "form.fhir", questionnaireCanonical: "https://example.org/q", canonical: "x" } }],
    });
    expect(legacy.ok && legacy.unsupportedItems).toEqual([]);
    const empty = validateSmartCheckinRequest({
      ...REQUEST,
      items: [REQUEST.items[0]!, { ...REQUEST.items[1]!, content: { kind: "form.fhir" } }],
    });
    expect(empty.ok && empty.unsupportedItems.map((u) => [u.id, u.rule])).toEqual([["intake", "FORM-1"]]);
  });

  test("rejects duplicate member names in the JSON text ([JSON-2])", () => {
    expect(parseSmartCheckinRequest(JSON.stringify(REQUEST)).ok).toBe(true);
    const doubled = JSON.stringify(REQUEST).replace('"id":"req-1"', '"id":"req-1","id":"req-2"');
    const v = parseSmartCheckinRequest(doubled);
    expect(!v.ok && v.rule).toBe("JSON-2");
  });
});

describe("response validation", () => {
  test("accepts a well-formed response", () => {
    expect(validateSmartCheckinResponse(RESPONSE).ok).toBe(true);
  });

  test("sets aside a health card with an outer fhirVersion, and FHIR JSON without one ([XV-8], [XV-9])", () => {
    const v = validateSmartCheckinResponse({
      ...RESPONSE,
      artifacts: [
        RESPONSE.artifacts[0]!,
        { id: "shc", mediaType: "application/smart-health-card", fhirVersion: "4.0.1", fulfills: ["summary"], value: { verifiableCredential: ["x.y.z"] } },
        { id: "raw", mediaType: "application/fhir+json", fulfills: ["summary"], value: { resourceType: "Patient" } },
      ],
    } as never);
    expect(usableIds(v)).toEqual(["a1"]);
  });

  test("sets aside unknown media types; a repeated status leaves that item with none ([XV-3], [XV-6])", () => {
    const pdf = validateSmartCheckinResponse({
      ...RESPONSE,
      artifacts: [{ id: "pdf", mediaType: "application/pdf", fulfills: ["summary"], value: "…" }],
    } as never);
    expect(usableIds(pdf)).toEqual([]);
    const repeated = validateSmartCheckinResponse({
      ...RESPONSE,
      requestStatus: [
        { item: "summary", status: "fulfilled" },
        { item: "summary", status: "declined" },
        { item: "intake", status: "fulfilled" },
      ],
    });
    expect(statusOf(repeated, "summary")).toBeUndefined();
    expect(statusOf(repeated, "intake")).toBe("fulfilled");
  });
});

describe("cross-validation (§6.4)", () => {
  test("accepts the matching pair", () => {
    expect(validateResponseAgainstRequest(REQUEST, RESPONSE).ok).toBe(true);
  });

  test("rejects a requestId mismatch ([XV-2])", () => {
    const v = validateResponseAgainstRequest(REQUEST, { ...RESPONSE, requestId: "other" });
    expect(!v.ok && v.rule).toBe("XV-2");
  });

  test("sets aside an Artifact naming an item not in the request ([XV-5])", () => {
    const v = validateResponseAgainstRequest(REQUEST, { ...RESPONSE, artifacts: [{ ...RESPONSE.artifacts[0]!, fulfills: ["ghost"] }] });
    expect(usableIds(v)).toEqual([]);
  });

  test("sets aside an Artifact whose mediaType an item doesn't accept ([XV-7])", () => {
    const v = validateResponseAgainstRequest(REQUEST, {
      ...RESPONSE,
      artifacts: [
        RESPONSE.artifacts[0]!,
        { id: "shc", mediaType: "application/smart-health-card", fulfills: ["summary"], value: { verifiableCredential: ["x.y.z"] } },
      ],
    });
    expect(usableIds(v)).toEqual(["a1"]);
  });

  test("sets aside an Artifact whose fhirVersion the request didn't list ([XV-8])", () => {
    const v = validateResponseAgainstRequest(REQUEST, { ...RESPONSE, artifacts: [{ ...RESPONSE.artifacts[0]!, fhirVersion: "5.0.0" }] });
    expect(usableIds(v)).toEqual([]);
  });

  test("an item with no status row has no status; the rest of the response stands ([XV-3])", () => {
    const v = validateResponseAgainstRequest(REQUEST, { ...RESPONSE, requestStatus: [{ item: "summary", status: "fulfilled" }] });
    expect(statusOf(v, "summary")).toBe("fulfilled");
    expect(statusOf(v, "intake")).toBeUndefined();
    expect(v.ok && v.items.find((i) => i.id === "intake")?.problems[0]?.rule).toBe("XV-3");
  });
});

test("an extension selector kind makes only that item unsupported (spec §5.4.3)", () => {
  const request = {
    type: "smart-health-checkin-request",
    version: "1",
    id: "ext-1",
    items: [
      { id: "known", title: "Demographics", content: { kind: "selection.fhir", resourceTypes: ["Patient"] }, accept: ["application/fhir+json"] },
      { id: "ext", title: "Something new", content: { kind: "example.ktc-test", anything: true }, accept: ["application/fhir+json"] },
    ],
  };
  const v = validateSmartCheckinRequest(request);
  expect(v.ok && v.unsupportedItems.map((u) => [u.id, u.rule])).toEqual([["ext", "SEL-9"]]);
  const noKind = { ...request, items: [{ ...request.items[1], content: { anything: true } }] };
  expect(validateSmartCheckinRequest(noKind).ok).toBe(false);
});

test("the mock wallet answers an extension selector item unsupported and the rest normally", async () => {
  const { buildMockResponse } = await import("../testing/mock.js");
  const request = {
    type: "smart-health-checkin-request" as const,
    version: "1" as const,
    id: "ext-2",
    items: [
      { id: "known", title: "Allergies", content: { kind: "selection.fhir" as const, resourceTypes: ["AllergyIntolerance"] }, accept: ["application/fhir+json"] },
      { id: "ext", title: "Something new", content: { kind: "example.ktc-test" }, accept: ["application/fhir+json"] },
    ],
  };
  const response = buildMockResponse(request as any);
  const status = new Map(response.requestStatus.map((s) => [s.item, s.status]));
  expect(status.get("ext")).toBe("unsupported");
  expect(status.get("known")).toBe("fulfilled");
});

test("a QuestionnaireResponse that doesn't echo the requested canonical is set aside ([XV-10])", () => {
  const request = {
    type: "smart-health-checkin-request",
    version: "1",
    id: "qr-1",
    items: [{ id: "form", title: "Form", content: { kind: "form.fhir", questionnaireCanonical: "https://example.org/Q/intake|2" }, accept: ["application/fhir+json"] }],
  };
  const response = (questionnaire: string) => ({
    type: "smart-health-checkin-response",
    version: "1",
    requestId: "qr-1",
    artifacts: [{ id: "a", mediaType: "application/fhir+json", fhirVersion: "4.0.1", fulfills: ["form"], value: { resourceType: "QuestionnaireResponse", status: "completed", questionnaire } }],
    requestStatus: [{ item: "form", status: "fulfilled" }],
  });
  expect(usableIds(validateResponseAgainstRequest(request, response("https://example.org/Q/intake|2")))).toEqual(["a"]);
  const stripped = validateResponseAgainstRequest(request, response("https://example.org/Q/intake"));
  expect(usableIds(stripped)).toEqual([]);
  expect(stripped.ok && stripped.items[0]?.problems.map((p) => p.rule)).toEqual(["XV-12"]);
});

test("the mock answers a Patient item with a Patient, claims requested profiles, and answers inline forms", async () => {
  const { buildMockResponse } = await import("../testing/mock.js");
  const UC = "http://hl7.org/fhir/us/core/StructureDefinition/";
  const request = {
    type: "smart-health-checkin-request" as const,
    version: "1" as const,
    id: "mock-1",
    items: [
      { id: "patient", title: "Demographics", content: { kind: "selection.fhir" as const, profiles: [UC + "us-core-patient"] }, accept: ["application/fhir+json"] },
      { id: "allergies", title: "Allergies", content: { kind: "selection.fhir" as const, profiles: [UC + "us-core-allergyintolerance"] }, accept: ["application/fhir+json"] },
      { id: "form", title: "Mood", content: { kind: "form.fhir" as const, questionnaireCanonical: "https://example.org/Q/phq-2",
        questionnaire: { resourceType: "Questionnaire", url: "https://example.org/Q/phq-2", item: [
          { linkId: "q1", text: "Little interest", type: "choice", answerOption: [{ valueCoding: { system: "http://loinc.org", code: "LA6568-5", display: "Not at all" } }] },
        ] } }, accept: ["application/fhir+json"] },
    ],
  };
  const response = buildMockResponse(request as any);
  const value = (id: string) => (response.artifacts.find((a) => a.fulfills.includes(id)) as any).value;
  expect(value("patient").entry[0].resource.resourceType).toBe("Patient");
  expect(value("patient").entry[0].resource.meta.profile).toEqual([UC + "us-core-patient"]);
  expect(value("allergies").entry.every((e: any) => e.resource.meta.profile.includes(UC + "us-core-allergyintolerance"))).toBe(true);
  expect(value("form").item[0].linkId).toBe("q1");
  expect(value("form").item[0].answer[0].valueCoding.code).toBe("LA6568-5");
});
