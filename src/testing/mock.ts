/**
 * Mock wallet: answers a prepared org-iso-mdoc check-in request with a fully
 * signed, HPKE-sealed DeviceResponse fabricated from demo data — real CBOR,
 * real COSE signatures (ephemeral self-signed issuer), real MSO digests, real
 * HPKE. Lets the whole verifier pipeline run with no phone present.
 *
 * DEMO/TEST ONLY: the "issuer" is an ephemeral self-signed key created per
 * response. Never treat mock artifacts as clinically meaningful.
 */

import type {
  SmartCheckinItemStatus,
  SmartCheckinRequest,
  SmartCheckinRequestItem,
  SmartCheckinResponse,
} from "../model/index.js";
import { parseWalletRequest, sealWalletResponse } from "../wallet/seal.js";
import { validateSmartCheckinRequest } from "../model/index.js";

/**
 * What the mock wallet should return for one requested item.
 *
 * Tests usually want to pin exact data ("this allergy list, missing its
 * reaction") or exercise a non-happy status, so both are first-class.
 */
export type MockItemSpec =
  /**
   * Return this FHIR resource or Bundle for the item. `alsoFulfills` names
   * other request items this same artifact satisfies — one bundle answering
   * a "clinical summary" item and an "allergies" item at once, say — and
   * those items are then reported fulfilled without an artifact of their own.
   */
  | { fhir: unknown; fhirVersion?: string; alsoFulfills?: readonly string[] }
  /** Return a SMART Health Card artifact carrying these JWS strings. */
  | { healthCard: readonly string[]; alsoFulfills?: readonly string[] }
  /** Report a status with no artifact — declined, unavailable, error, … */
  | { status: SmartCheckinItemStatus["status"]; message?: string };

/** One item can be answered by several artifacts: give it a list. */
export type MockItemSpecs = MockItemSpec | readonly MockItemSpec[];

export type MockWalletOptions = {
  origin: string;
  /**
   * Exactly what to return, per request item id. Anything not named here
   * follows `fallback`.
   *
   * ```ts
   * createMockWalletCredentialGetter({
   *   origin: location.origin,
   *   items: {
   *     allergies: { fhir: myAllergyBundle },
   *     coverage: { status: "declined" },
   *   },
   *   fallback: { status: "unavailable" },
   * });
   * ```
   */
  items?: Record<string, MockItemSpecs>;
  /**
   * What to do with items `items` doesn't mention: "fabricate" (default)
   * invents plausible demo data; a spec applies that spec to all of them.
   */
  fallback?: "fabricate" | MockItemSpec;
  /** Full manual control: build the entire response yourself. */
  respond?: (request: SmartCheckinRequest) => SmartCheckinResponse;
};

/**
 * Build a response from a per-item specification. Exported so tests can
 * assert on the response without going through the wire layer at all.
 */
export function buildMockResponse(
  request: SmartCheckinRequest,
  options: Pick<MockWalletOptions, "items" | "fallback"> = {},
): SmartCheckinResponse {
  const artifacts: Record<string, unknown>[] = [];
  const requestStatus: Record<string, unknown>[] = [];
  const fallback = options.fallback ?? "fabricate";
  // Items another artifact already answered (via alsoFulfills).
  const covered = new Set<string>();

  // Items left to the fabricator are fabricated together, not one at a time,
  // so it can answer several with one bundle the way a wallet would.
  // Items the library can't process (an unknown kind, a malformed selector) are
  // answered "unsupported" unless the caller configured something explicit.
  const validated = validateSmartCheckinRequest(request);
  const unsupported = new Map((validated.ok ? validated.unsupportedItems : []).map((u) => [u.id, u.message]));
  const unspecified = request.items.filter(
    (item) => options.items?.[item.id] === undefined && !unsupported.has(item.id),
  );
  const fabricated = fallback === "fabricate" && unspecified.length
    ? fabricateResponse({ ...request, items: unspecified })
    : undefined;
  const fabricatedStatus = new Map((fabricated?.requestStatus ?? []).map((s) => [s.item, s]));

  for (const item of request.items) {
    if (covered.has(item.id)) {
      requestStatus.push({ item: item.id, status: "fulfilled" });
      continue;
    }
    const configured = options.items?.[item.id];
    if (configured === undefined && unsupported.has(item.id)) {
      requestStatus.push({ item: item.id, status: "unsupported", message: unsupported.get(item.id) });
      continue;
    }
    const specs: readonly MockItemSpec[] | undefined =
      configured === undefined
        ? fallback === "fabricate" ? undefined : [fallback]
        : Array.isArray(configured) ? configured : [configured as MockItemSpec];

    if (specs === undefined) {
      // An artifact is emitted with the first item it fulfils; the rest are covered.
      for (const artifact of fabricated?.artifacts ?? []) {
        if (artifact.fulfills[0] !== item.id) continue;
        artifacts.push(artifact as unknown as Record<string, unknown>);
        for (const id of artifact.fulfills.slice(1)) covered.add(id);
      }
      const status = fabricatedStatus.get(item.id);
      if (status) requestStatus.push(status as unknown as Record<string, unknown>);
      continue;
    }

    let fulfilled = false;
    specs.forEach((spec, n) => {
      if ("status" in spec) {
        requestStatus.push({
          item: item.id,
          status: spec.status,
          ...(spec.message ? { message: spec.message } : {}),
        });
        return;
      }
      const also = (spec.alsoFulfills ?? []).filter((id) => id !== item.id);
      for (const id of also) covered.add(id);
      const id = specs.length > 1 ? `mock-${item.id}-${n + 1}` : `mock-${item.id}`;
      if ("healthCard" in spec) {
        artifacts.push({
          id,
          mediaType: "application/smart-health-card",
          fulfills: [item.id, ...also],
          value: { verifiableCredential: [...spec.healthCard] },
        });
      } else {
        artifacts.push({
          id,
          mediaType: "application/fhir+json",
          fhirVersion: spec.fhirVersion ?? request.fhirVersions?.[0] ?? "4.0.1",
          fulfills: [item.id, ...also],
          value: spec.fhir,
        });
      }
      fulfilled = true;
    });
    if (fulfilled) requestStatus.push({ item: item.id, status: "fulfilled" });
  }

  return {
    type: "smart-health-checkin-response",
    version: "1",
    requestId: request.id,
    artifacts,
    requestStatus,
  } as unknown as SmartCheckinResponse;
}

/**
 * A drop-in `getCredential` hook for runCheckin: parses the navigator
 * argument the same way a platform wallet would and returns a credential-like
 * object carrying the sealed response.
 */
export function createMockWalletCredentialGetter(options: MockWalletOptions) {
  return async (navigatorArgument: unknown): Promise<unknown> => {
    const parsed = parseWalletRequest(navigatorArgument);
    const smartResponse =
      options.respond?.(parsed.smartRequest) ??
      buildMockResponse(parsed.smartRequest, {
        items: options.items,
        fallback: options.fallback,
      });
    return sealWalletResponse({
      smartResponse,
      encryptionInfoBytes: parsed.encryptionInfoBytes,
      verifierOrigin: options.origin,
      // Check the mock's own answers; a custom `respond` may be deliberately wrong.
      ...(options.respond ? {} : { request: parsed.smartRequest }),
    });
  };
}

export const DEMO_HEALTH_CARD_JWS =
  "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiIsImtpZCI6Im1vY2sta2V5In0.fZHNjtQwEIRfZVVcnZkkGmbAR1gkQFqB-Lus5tBxOhsjx4nszrBR5HdHDquBw4pj293V9VWvsDFCoxeZot7vf5FzLDt-pGFyvG95GKHgmw66Oh1Pdf3yWJYKFwO9QpaJoe-vw3GgID2Tk35nKLTxxZ-iyAXOCiZwy14sua9z85ONZJWut-EHh2hHD43DrtxVUNvrm9m3jnNP4DjOwfC3bSOePtSTA5jROTaSFRTYS1ig71d0s3Pfg4O-zusS6lo8I_yZxLKXjExDZlvR0WDdAo0vvHCEwoO9sM_YH8fQksc5nRUaG6S_Jcki1etXh6I8FmWNlNSzNjLhf2y8HS8c6CETRiGZ84XIiL38ZV4h_CjQuOVhvHm_5XwzOfJICnFuogm24fChzS3v7j4Vh0N1gkLDnjtrLOWM8uKOA_vs4t-QksJEyxi2BFobJ0c5gm3X3SwzOWTqiYMd26wThUJ2U5f1sSiroqyQUjqnlNJv.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function fabricateResponse(
  request: SmartCheckinRequest,
  include?: (itemId: string) => boolean,
): SmartCheckinResponse {
  const artifacts: Record<string, unknown>[] = [];
  const requestStatus: Record<string, unknown>[] = [];
  const wanted = request.items.filter((item) => !include || include(item.id));
  // A summary item whose profiles include another item's profiles answers
  // both with one bundle — the way a real wallet would, rather than sending
  // the same allergy list twice.
  const coveredBy = new Map<string, string>();
  for (const summary of wanted) {
    const profiles = summary.content.kind === "selection.fhir" ? summary.content.profiles ?? [] : [];
    if (summary.content.kind !== "selection.fhir" || !summary.content.profilesFrom?.length || profiles.length < 2) continue;
    for (const other of wanted) {
      if (other === summary || other.content.kind !== "selection.fhir" || !other.content.profiles?.length) continue;
      if (other.accept.includes("application/fhir+json") && other.content.profiles.every((p) => profiles.includes(p))) {
        coveredBy.set(other.id, summary.id);
      }
    }
  }
  for (const item of request.items) {
    if (include && !include(item.id)) {
      requestStatus.push({ item: item.id, status: "declined" });
      continue;
    }
    if (coveredBy.has(item.id)) {
      requestStatus.push({ item: item.id, status: "fulfilled" });
      continue;
    }
    const also = [...coveredBy].filter(([, by]) => by === item.id).map(([id]) => id);
    const wantsCard = item.accept.includes("application/smart-health-card");
    const wantsFhir = item.accept.includes("application/fhir+json") || !wantsCard;
    // Both accepted → both returned: the signed card, and the same facts as plain FHIR.
    if (wantsCard) {
      artifacts.push({
        id: wantsFhir ? `mock-${item.id}-card` : `mock-${item.id}`,
        mediaType: "application/smart-health-card",
        fulfills: [item.id, ...also],
        value: { verifiableCredential: [DEMO_HEALTH_CARD_JWS] },
      });
    }
    if (wantsFhir) {
      artifacts.push({
        id: wantsCard ? `mock-${item.id}-fhir` : `mock-${item.id}`,
        mediaType: "application/fhir+json",
        fhirVersion: request.fhirVersions?.[0] ?? "4.0.1",
        fulfills: [item.id, ...also],
        value: fabricateFhirValue(item),
      });
    }
    requestStatus.push({ item: item.id, status: "fulfilled" });
  }
  return {
    type: "smart-health-checkin-response",
    version: "1",
    requestId: request.id,
    artifacts,
    requestStatus,
  } as unknown as SmartCheckinResponse;
}

function fabricateFhirValue(item: SmartCheckinRequestItem): unknown {
  const content = item.content as { kind: string; profiles?: readonly string[]; resourceTypes?: readonly string[]; questionnaire?: { item?: unknown[] } };
  // Answer an inline form's own questions rather than a placeholder.
  if (content.kind === "form.fhir" && Array.isArray(content.questionnaire?.item)) {
    const value = fabricateBaseFhirValue(item) as Record<string, unknown>;
    const answers = answerQuestionnaireItems(content.questionnaire!.item as QuestionnaireItemLike[]);
    if (answers.length) value.item = answers;
    return value;
  }
  // A demographics item asking for a Patient gets a Patient.
  const wantsPatient =
    (content.profiles ?? []).some((p) => p.split("|")[0]!.endsWith("/us-core-patient")) ||
    (content.resourceTypes ?? []).includes("Patient");
  const value = wantsPatient ? fabricatePatient() : fabricateBaseFhirValue(item);
  return claimRequestedProfiles(value, content.profiles ?? []);
}

type QuestionnaireItemLike = { linkId?: string; text?: string; type?: string; answerOption?: Array<Record<string, unknown>>; item?: QuestionnaireItemLike[] };

/** Answer choice questions with their first option and groups recursively; skip the rest. */
function answerQuestionnaireItems(items: QuestionnaireItemLike[]): unknown[] {
  return items.flatMap((i): unknown[] => {
    if (!i.linkId) return [];
    if (i.type === "group") {
      const children = answerQuestionnaireItems(i.item ?? []);
      return children.length ? [{ linkId: i.linkId, ...(i.text ? { text: i.text } : {}), item: children }] : [];
    }
    if ((i.type === "choice" || i.type === "open-choice") && i.answerOption?.[0]) {
      const { valueCoding, valueString, valueInteger } = i.answerOption[0] as Record<string, unknown>;
      const answer = valueCoding ? { valueCoding } : valueString !== undefined ? { valueString } : valueInteger !== undefined ? { valueInteger } : undefined;
      return answer ? [{ linkId: i.linkId, ...(i.text ? { text: i.text } : {}), answer: [answer] }] : [];
    }
    if (i.type === "boolean") return [{ linkId: i.linkId, ...(i.text ? { text: i.text } : {}), answer: [{ valueBoolean: false }] }];
    return [];
  });
}

function fabricatePatient(): unknown {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [{
      resource: {
        resourceType: "Patient",
        identifier: [{ system: "urn:smart-health-checkin:mock-run", value: crypto.randomUUID() }],
        name: [{ family: "Demo", given: ["Mock"] }],
        gender: "unknown",
        birthDate: "1980-01-01",
      },
    }],
  };
}

/**
 * Put each requested exact profile on the fabricated resources of the type it
 * names (us-core-allergyintolerance on AllergyIntolerance, C4DIC-Coverage on
 * Coverage), so the result claims what the item asked for.
 */
function claimRequestedProfiles(value: unknown, profiles: readonly string[]): unknown {
  const v = value as { resourceType?: string; entry?: Array<{ resource?: Record<string, unknown> }> } | undefined;
  if (!profiles.length || v?.resourceType !== "Bundle" || !Array.isArray(v.entry)) return value;
  for (const entry of v.entry) {
    const r = entry.resource;
    if (!r || typeof r.resourceType !== "string") continue;
    const type = r.resourceType.toLowerCase();
    const claims = profiles.filter((p) => p.split("|")[0]!.split("/").pop()!.toLowerCase().includes(type));
    if (claims.length) {
      const meta = (r.meta ?? {}) as { profile?: string[] };
      r.meta = { ...meta, profile: [...new Set([...(meta.profile ?? []), ...claims])] };
    }
  }
  return value;
}

function fabricateBaseFhirValue(item: SmartCheckinRequestItem): unknown {
  // Unique per run: real check-ins are distinct, and duplicate-detecting
  // servers (e.g. public HAPI) reject content-identical re-creates.
  const runId = crypto.randomUUID();
  const mockIdentifier = { system: "urn:smart-health-checkin:mock-run", value: runId };
  const demoPatient = { display: "Demo patient (mock wallet)" };
  if (item.content.kind === "form.fhir") {
    return {
      resourceType: "QuestionnaireResponse",
      identifier: mockIdentifier,
      status: "completed",
      ...(item.content.questionnaireCanonical
        ? { questionnaire: item.content.questionnaireCanonical }
        : {}),
      item: [
        {
          linkId: "mock-1",
          text: `Mock answer for ${item.title}`,
          answer: [{ valueString: `Mock wallet demo answer (run ${runId.slice(0, 8)})` }],
        },
      ],
    };
  }

  // Keyword-match the selector so demos get plausible USCDI content: real
  // codings (CVX, RxNorm, SNOMED CT) and the US Core required/must-support
  // elements, so the artifacts validate against the profiles verifiers ask for.
  const hints = `${item.title} ${item.summary ?? ""} ${JSON.stringify(item.content)}`.toLowerCase();
  const bundle = (resources: Record<string, unknown>[]): unknown => ({
    resourceType: "Bundle",
    type: "collection",
    entry: resources.map((resource) => ({ resource })),
  });
  const SCT = "http://snomed.info/sct";
  const RXNORM = "http://www.nlm.nih.gov/research/umls/rxnorm";
  const CVX = "http://hl7.org/fhir/sid/cvx";
  const allergyActive = {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
        code: "active",
        display: "Active",
      },
    ],
  };
  const allergyConfirmed = {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
        code: "confirmed",
        display: "Confirmed",
      },
    ],
  };

  if (hints.includes("coverage") || hints.includes("insur") || hints.includes("carin")) {
    return bundle([
      {
        resourceType: "Coverage",
        identifier: [mockIdentifier],
        status: "active",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              code: "PPO",
              display: "preferred provider organization policy",
            },
          ],
          text: "Demo Health plan (PPO)",
        },
        subscriberId: "DEMO-4417",
        beneficiary: demoPatient,
        relationship: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/subscriber-relationship",
              code: "self",
              display: "Self",
            },
          ],
        },
        period: { start: "2026-01-01" },
        payor: [{ display: "Demo Mutual" }],
        class: [
          {
            type: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/coverage-class",
                  code: "group",
                  display: "Group",
                },
              ],
            },
            value: "DEMO-GRP-8821",
            name: "Demo Mutual employer group",
          },
        ],
      },
    ]);
  }

  if (hints.includes("allerg")) {
    return bundle([
      {
        resourceType: "AllergyIntolerance",
        identifier: [mockIdentifier],
        clinicalStatus: allergyActive,
        verificationStatus: allergyConfirmed,
        code: {
          coding: [{ system: SCT, code: "373270004", display: "Penicillin antibacterial" }],
          text: "Penicillin",
        },
        criticality: "high",
        patient: demoPatient,
        reaction: [
          {
            manifestation: [
              {
                coding: [{ system: SCT, code: "126485001", display: "Urticaria" }],
                text: "Hives",
              },
            ],
          },
        ],
      },
      {
        resourceType: "AllergyIntolerance",
        identifier: [{ ...mockIdentifier, value: `${runId}-2` }],
        clinicalStatus: allergyActive,
        verificationStatus: allergyConfirmed,
        code: {
          coding: [{ system: SCT, code: "256349002", display: "Peanut - dietary" }],
          text: "Peanut",
        },
        criticality: "low",
        patient: demoPatient,
        reaction: [{ manifestation: [{ text: "Oral itching" }] }],
      },
      // Deliberately sparse — a very common real-world shape. US Core only
      // requires the substance and clinical status, so plenty of records
      // carry no reaction and no criticality. This is exactly the gap a
      // check-in form should elicit rather than re-asking what's known.
      {
        resourceType: "AllergyIntolerance",
        identifier: [{ ...mockIdentifier, value: `${runId}-3` }],
        clinicalStatus: allergyActive,
        code: {
          coding: [{ system: SCT, code: "387406002", display: "Sulfonamide" }],
          text: "Sulfa drugs (sulfonamides)",
        },
        patient: demoPatient,
      },
      {
        resourceType: "AllergyIntolerance",
        identifier: [{ ...mockIdentifier, value: `${runId}-4` }],
        clinicalStatus: allergyActive,
        code: {
          coding: [{ system: SCT, code: "111088007", display: "Latex" }],
          text: "Latex",
        },
        criticality: "unable-to-assess",
        patient: demoPatient,
      },
    ]);
  }

  if (hints.includes("immuniz") || hints.includes("vaccin")) {
    return bundle([
      {
        resourceType: "Immunization",
        identifier: [mockIdentifier],
        status: "completed",
        vaccineCode: {
          coding: [{ system: CVX, code: "141", display: "Influenza, seasonal, injectable" }],
          text: "Influenza, seasonal, injectable",
        },
        patient: demoPatient,
        occurrenceDateTime: "2025-10-12",
        primarySource: true,
        lotNumber: "FLU-77031",
      },
      {
        resourceType: "Immunization",
        identifier: [{ ...mockIdentifier, value: `${runId}-2` }],
        status: "completed",
        vaccineCode: {
          coding: [
            { system: CVX, code: "208", display: "COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3 mL dose" },
          ],
          text: "COVID-19 mRNA vaccine",
        },
        patient: demoPatient,
        occurrenceDateTime: "2025-09-03",
        primarySource: true,
      },
      {
        resourceType: "Immunization",
        identifier: [{ ...mockIdentifier, value: `${runId}-3` }],
        status: "completed",
        vaccineCode: {
          coding: [{ system: CVX, code: "115", display: "Tdap" }],
          text: "Tdap (tetanus, diphtheria, pertussis)",
        },
        patient: demoPatient,
        occurrenceDateTime: "2021-06-18",
        primarySource: true,
      },
    ]);
  }

  if (hints.includes("medication")) {
    return bundle([
      {
        resourceType: "MedicationRequest",
        identifier: [mockIdentifier],
        status: "active",
        intent: "order",
        reportedBoolean: true,
        medicationCodeableConcept: {
          coding: [{ system: RXNORM, code: "314076", display: "lisinopril 10 MG Oral Tablet" }],
          text: "Lisinopril 10 mg — once daily",
        },
        subject: demoPatient,
        authoredOn: "2025-04-02",
        requester: { display: "Demo Primary Care" },
        dosageInstruction: [{ text: "Once daily" }],
      },
      {
        resourceType: "MedicationRequest",
        identifier: [{ ...mockIdentifier, value: `${runId}-2` }],
        status: "active",
        intent: "order",
        reportedBoolean: true,
        medicationCodeableConcept: {
          coding: [
            { system: RXNORM, code: "861007", display: "metformin hydrochloride 500 MG Oral Tablet" },
          ],
          text: "Metformin 500 mg — twice daily",
        },
        subject: demoPatient,
        authoredOn: "2025-06-15",
        requester: { display: "Demo Primary Care" },
        dosageInstruction: [{ text: "Twice daily" }],
      },
    ]);
  }

  const conditionActive = {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
        code: "active",
        display: "Active",
      },
    ],
  };
  const problemListItem = [
    {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-category",
          code: "problem-list-item",
          display: "Problem List Item",
        },
      ],
    },
  ];

  if (hints.includes("condition") || hints.includes("problem")) {
    return bundle([
      {
        resourceType: "Condition",
        identifier: [mockIdentifier],
        clinicalStatus: conditionActive,
        category: problemListItem,
        code: {
          coding: [{ system: SCT, code: "38341003", display: "Hypertensive disorder" }],
          text: "Hypertension",
        },
        subject: demoPatient,
      },
      {
        resourceType: "Condition",
        identifier: [{ ...mockIdentifier, value: `${runId}-2` }],
        clinicalStatus: conditionActive,
        category: problemListItem,
        code: {
          coding: [{ system: SCT, code: "44054006", display: "Type 2 diabetes mellitus" }],
          text: "Type 2 diabetes",
        },
        subject: demoPatient,
      },
    ]);
  }

  // Nothing recognized: a text-only condition — an honest "we can't code
  // an arbitrary demo item" rather than a fabricated coding.
  return bundle([
    {
      resourceType: "Condition",
      identifier: [mockIdentifier],
      clinicalStatus: conditionActive,
      category: problemListItem,
      code: { text: `Mock condition for "${item.title}"` },
      subject: demoPatient,
    },
  ]);
}

/** Build a signed DeviceResponse carrying the SMART response element. */