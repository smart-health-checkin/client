import { describe, expect, test } from "bun:test";
import {
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  validateSmartCheckinResponse,
} from "./validate.js";
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

  test("rejects legacy form selector members and empty form selectors", () => {
    expect(
      validateSmartCheckinRequest({
        ...REQUEST,
        items: [
          {
            ...REQUEST.items[1]!,
            content: { kind: "form.fhir", canonical: "https://example.org/q" },
          },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateSmartCheckinRequest({
        ...REQUEST,
        items: [{ ...REQUEST.items[1]!, content: { kind: "form.fhir" } }],
      }).ok,
    ).toBe(false);
  });
});

describe("response validation", () => {
  test("accepts a well-formed response", () => {
    expect(validateSmartCheckinResponse(RESPONSE).ok).toBe(true);
  });

  test("rejects SHC artifacts with outer fhirVersion and fhir+json without one", () => {
    expect(
      validateSmartCheckinResponse({
        ...RESPONSE,
        artifacts: [
          {
            id: "shc",
            mediaType: "application/smart-health-card",
            fhirVersion: "4.0.1",
            fulfills: ["summary"],
            value: { verifiableCredential: ["x.y.z"] },
          },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateSmartCheckinResponse({
        ...RESPONSE,
        artifacts: [
          {
            id: "raw",
            mediaType: "application/fhir+json",
            fulfills: ["summary"],
            value: { resourceType: "Patient" },
          },
        ],
      }).ok,
    ).toBe(false);
  });

  test("rejects unknown media types and duplicated statuses", () => {
    expect(
      validateSmartCheckinResponse({
        ...RESPONSE,
        artifacts: [
          { id: "pdf", mediaType: "application/pdf", fulfills: ["summary"], value: "…" },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateSmartCheckinResponse({
        ...RESPONSE,
        requestStatus: [
          { item: "summary", status: "fulfilled" },
          { item: "summary", status: "declined" },
          { item: "intake", status: "fulfilled" },
        ],
      }).ok,
    ).toBe(false);
  });
});

describe("cross-validation (§6.6)", () => {
  test("accepts the matching pair", () => {
    expect(validateResponseAgainstRequest(REQUEST, RESPONSE).ok).toBe(true);
  });

  test("rejects requestId mismatch", () => {
    expect(
      validateResponseAgainstRequest(REQUEST, { ...RESPONSE, requestId: "other" }).ok,
    ).toBe(false);
  });

  test("rejects dangling fulfills references", () => {
    expect(
      validateResponseAgainstRequest(REQUEST, {
        ...RESPONSE,
        artifacts: [{ ...RESPONSE.artifacts[0]!, fulfills: ["ghost"] }],
      }).ok,
    ).toBe(false);
  });

  test("rejects mediaType not accepted by the fulfilled item", () => {
    expect(
      validateResponseAgainstRequest(REQUEST, {
        ...RESPONSE,
        artifacts: [
          {
            id: "shc",
            mediaType: "application/smart-health-card",
            fulfills: ["summary"],
            value: { verifiableCredential: ["x.y.z"] },
          },
        ],
      }).ok,
    ).toBe(false);
  });

  test("rejects fhirVersion outside request.fhirVersions", () => {
    expect(
      validateResponseAgainstRequest(REQUEST, {
        ...RESPONSE,
        artifacts: [{ ...RESPONSE.artifacts[0]!, fhirVersion: "5.0.0" }],
      }).ok,
    ).toBe(false);
  });

  test("rejects incomplete per-item status coverage", () => {
    expect(
      validateResponseAgainstRequest(REQUEST, {
        ...RESPONSE,
        requestStatus: [{ item: "summary", status: "fulfilled" }],
      }).ok,
    ).toBe(false);
  });
});

test("accepts an extension selector kind as a valid request item (spec §5.4.3)", () => {
  const request = {
    type: "smart-health-checkin-request",
    version: "1",
    id: "ext-1",
    items: [
      { id: "known", title: "Demographics", content: { kind: "selection.fhir", resourceTypes: ["Patient"] }, accept: ["application/fhir+json"] },
      { id: "ext", title: "Something new", content: { kind: "example.ktc-test", anything: true }, accept: ["application/fhir+json"] },
    ],
  };
  expect(validateSmartCheckinRequest(request).ok).toBe(true);
  const blank = { ...request, items: [{ ...request.items[1], content: { kind: "" } }] };
  expect(validateSmartCheckinRequest(blank).ok).toBe(false);
});

test("the mock wallet answers an extension selector item unsupported and the rest normally", async () => {
  const { buildMockResponse } = await import("../kit/mock-wallet.js");
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
