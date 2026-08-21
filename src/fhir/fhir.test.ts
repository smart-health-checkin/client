import { describe, expect, test } from "bun:test";
import { buildCheckinBundle, postCheckinBundle, CHECKIN_REQUEST_ID_SYSTEM, type FetchLike } from "./index.js";
import type { SmartCheckinRequest, SmartCheckinResponse } from "../model/index.js";

const REQUEST: SmartCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "req-42",
  fhirVersions: ["4.0.1"],
  items: [
    {
      id: "summary",
      title: "Summary",
      content: { kind: "selection.fhir" },
      accept: ["application/fhir+json", "application/smart-health-card"],
    },
  ],
};

const RESPONSE: SmartCheckinResponse = {
  type: "smart-health-checkin-response",
  version: "1",
  requestId: "req-42",
  artifacts: [
    {
      id: "bundle",
      mediaType: "application/fhir+json",
      fhirVersion: "4.0.1",
      fulfills: ["summary"],
      value: {
        resourceType: "Bundle",
        type: "collection",
        entry: [
          { resource: { resourceType: "Condition", code: { text: "Migraine" } } },
          { resource: { resourceType: "AllergyIntolerance", code: { text: "Peanut" } } },
        ],
      },
    },
    {
      id: "qr",
      mediaType: "application/fhir+json",
      fhirVersion: "4.0.1",
      fulfills: ["summary"],
      value: { resourceType: "QuestionnaireResponse", status: "completed" },
    },
    {
      id: "shc",
      mediaType: "application/smart-health-card",
      fulfills: ["summary"],
      value: { verifiableCredential: ["a.b.c"] },
    },
  ],
  requestStatus: [{ item: "summary", status: "fulfilled" }],
};

describe("buildCheckinBundle", () => {
  test("maps artifacts to transaction entries plus one Provenance", () => {
    const plan = buildCheckinBundle({
      request: REQUEST,
      response: RESPONSE,
      context: { patient: "Patient/p1", appointment: "Appointment/a1" },
    });
    const types = plan.entries.map((e) => e.resource.resourceType);
    expect(types).toEqual([
      "Condition",
      "AllergyIntolerance",
      "QuestionnaireResponse",
      "DocumentReference",
      "Provenance",
    ]);
    const bundle = plan.bundle as {
      type: string;
      entry: Array<{ fullUrl: string; request: { method: string; url: string } }>;
    };
    expect(bundle.type).toBe("transaction");
    expect(bundle.entry.every((e) => e.request.method === "POST")).toBe(true);
    expect(new Set(bundle.entry.map((e) => e.fullUrl)).size).toBe(bundle.entry.length);

    const provenance = plan.entries.at(-1)!.resource as {
      target: Array<{ reference: string }>;
      agent: Array<{ who?: { reference: string } }>;
      entity: Array<{ what: { identifier: { system: string; value: string } } }>;
    };
    // appointment context rides as an identifier entity, never a target ref
    expect(provenance.target.map((t) => t.reference)).not.toContain("Appointment/a1");
    expect(provenance.entity.map((e) => e.what.identifier.value)).toContain("Appointment/a1");
    expect(provenance.agent[0]!.who?.reference).toBe("Patient/p1");
    expect(provenance.entity[0]!.what.identifier).toEqual({
      system: CHECKIN_REQUEST_ID_SYSTEM,
      value: "req-42",
    });
    // Every non-Provenance entry is a Provenance target.
    for (const entry of plan.entries.slice(0, -1)) {
      expect(provenance.target.map((t) => t.reference)).toContain(entry.fullUrl);
    }
  });

  test("SHC artifacts become DocumentReference wrappers; provenance can be disabled", () => {
    const plan = buildCheckinBundle({ request: REQUEST, response: RESPONSE, provenance: false });
    const types = plan.entries.map((e) => e.resource.resourceType);
    expect(types).not.toContain("Provenance");
    const docRef = plan.entries.find((e) => e.resource.resourceType === "DocumentReference")!
      .resource as { content: Array<{ attachment: { contentType: string; data: string } }> };
    expect(docRef.content[0]!.attachment.contentType).toBe("application/smart-health-card");
    expect(docRef.content[0]!.attachment.data.length).toBeGreaterThan(0);
  });
});

describe("postCheckinBundle", () => {
  const plan = buildCheckinBundle({ request: REQUEST, response: RESPONSE });

  test("transaction posts one Bundle to the base URL", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const result = await postCheckinBundle(plan, {
      fhirBase: "https://example.org/fhir/",
      fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
        return new Response(JSON.stringify({ resourceType: "Bundle", type: "transaction-response" }), {
          status: 200,
          headers: { "content-type": "application/fhir+json" },
        });
      }) as FetchLike,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://example.org/fhir");
    expect((calls[0]!.body as { type: string }).type).toBe("transaction");
    expect((result.result as { resourceType: string }).resourceType).toBe("Bundle");
  });

  test("individual mode posts resources then a rewired Provenance", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    let n = 0;
    await postCheckinBundle(plan, {
      fhirBase: "https://example.org/fhir",
      mode: "individual",
      fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        calls.push({ url: String(url), body });
        n++;
        return new Response(JSON.stringify({ resourceType: body.resourceType, id: `srv-${n}` }), {
          status: 201,
          headers: {
            "content-type": "application/fhir+json",
            location: `https://example.org/fhir/${String(body.resourceType)}/srv-${n}/_history/1`,
          },
        });
      }) as FetchLike,
    });
    const provenanceCall = calls.at(-1)!;
    expect(provenanceCall.url).toBe("https://example.org/fhir/Provenance");
    const targets = (provenanceCall.body as { target: Array<{ reference: string }> }).target;
    for (const target of targets) {
      expect(target.reference.startsWith("urn:uuid:")).toBe(false);
    }
  });

  test("transaction failure surfaces the OperationOutcome", async () => {
    await expect(
      postCheckinBundle(plan, {
        fhirBase: "https://example.org/fhir",
        fetchImpl: (async () =>
          new Response(
            JSON.stringify({ resourceType: "OperationOutcome", issue: [{ severity: "error" }] }),
            { status: 400 },
          )) as FetchLike,
      }),
    ).rejects.toThrow(/HTTP 400/);
  });
});
