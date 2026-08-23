/**
 * Scenarios and request construction.
 *
 * A scenario is just a named SmartCheckinRequest. The built-in entries are
 * demo templates; real deployments define their requests inline with
 * buildRequest(...) or register their own names with registerScenario(...).
 */

import {
  validateSmartCheckinRequest,
  type SmartCheckinRequest,
  type SmartCheckinRequestItem,
} from "../model/index.js";

export type Scenario = {
  label: string;
  description: string;
  request: SmartCheckinRequest;
};

/** Everything a request needs except the boilerplate the kit can fill in. */
export type CheckinRequestInit = {
  id?: string;
  purpose?: string;
  fhirVersions?: ReadonlyArray<string>;
  items: ReadonlyArray<SmartCheckinRequestItem>;
};

/**
 * Complete a request from the parts an integrator actually cares about:
 * `type`/`version` are fixed by the spec, `id` defaults to a UUID, and
 * `fhirVersions` defaults to ["4.0.1"]. Validates before returning.
 */
export function buildRequest(init: CheckinRequestInit): SmartCheckinRequest {
  const candidate: SmartCheckinRequest = {
    type: "smart-health-checkin-request",
    version: "1",
    id: init.id ?? crypto.randomUUID(),
    ...(init.purpose !== undefined ? { purpose: init.purpose } : {}),
    fhirVersions: init.fhirVersions ?? ["4.0.1"],
    items: init.items,
  };
  const validation = validateSmartCheckinRequest(candidate);
  if (!validation.ok) throw new Error(`invalid check-in request: ${validation.error}`);
  return validation.value;
}

/**
 * Register (or replace) a named scenario — lets declarative surfaces like
 * <smart-checkin scenario="my-intake"> use requests your code defines.
 */
export function registerScenario(
  key: string,
  request: SmartCheckinRequest | CheckinRequestInit,
  meta: { label?: string; description?: string } = {},
): Scenario {
  const full =
    "type" in request
      ? (() => {
          const validation = validateSmartCheckinRequest(request);
          if (!validation.ok) throw new Error(`invalid check-in request: ${validation.error}`);
          return validation.value;
        })()
      : buildRequest(request);
  const scenario: Scenario = {
    label: meta.label ?? key,
    description: meta.description ?? full.purpose ?? key,
    request: full,
  };
  SCENARIOS[key] = scenario;
  return scenario;
}

export const SCENARIOS: Record<string, Scenario> = {
  "visit-prep": {
    label: "visit-prep",
    description: "Before a visit: a clinical summary, allergies, insurance, and a PHQ-2 — one bundle answers two items, and the insurance item comes back twice.",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "demo-visit-prep",
      purpose: "Before your visit with Dr. Reyes",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "us-core-summary",
          title: "Clinical summary",
          summary: "Problems, allergies, and current medications.",
          content: {
            kind: "selection.fhir",
            profilesFrom: ["http://hl7.org/fhir/us/core"],
            profiles: [
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
            ],
          },
          accept: ["application/fhir+json"],
        },
        {
          id: "allergies",
          title: "Allergies and intolerances",
          summary: "So we can check them against anything we prescribe.",
          required: true,
          content: {
            kind: "selection.fhir",
            profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
          },
          accept: ["application/fhir+json"],
        },
        {
          id: "coverage",
          title: "Insurance coverage",
          summary: "So we can verify benefits before you arrive.",
          content: { kind: "selection.fhir", profilesFrom: ["http://hl7.org/fhir/us/carin-bb"] },
          accept: ["application/smart-health-card", "application/fhir+json"],
        },
        {
          id: "phq2",
          title: "Two questions about your mood",
          content: {
            kind: "form.fhir",
            questionnaireCanonical: "https://fhir.loinc.org/Questionnaire/55757-9",
          },
          accept: ["application/fhir+json"],
        },
      ],
    },
  },
  "insurance-only": {
    label: "insurance-only",
    description:
      "Coverage details ahead of the visit (CARIN profiles, SMART Health Card preferred).",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "demo-insurance-only",
      purpose: "Insurance verification for your upcoming visit",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "coverage",
          title: "Insurance coverage",
          required: true,
          content: { kind: "selection.fhir", profilesFrom: ["http://hl7.org/fhir/us/carin-bb"] },
          accept: ["application/smart-health-card", "application/fhir+json"],
        },
      ],
    },
  },
  "new-patient": {
    label: "new-patient",
    description: "US Core summary for a first visit: problems, allergies, meds.",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "demo-new-patient",
      purpose: "New patient intake",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "us-core-summary",
          title: "Clinical summary",
          summary: "Problems, allergies, and current medications.",
          required: true,
          content: {
            kind: "selection.fhir",
            profilesFrom: ["http://hl7.org/fhir/us/core"],
            profiles: [
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
            ],
          },
          accept: ["application/fhir+json"],
        },
      ],
    },
  },
  "phq2-dayof": {
    label: "phq2-dayof",
    description: "Day-of PHQ-2 — requested close to the visit so the answers are fresh.",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "demo-phq2-dayof",
      purpose: "A quick two-question wellness check before today's visit",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "phq2",
          title: "PHQ-2 questionnaire",
          required: true,
          content: {
            kind: "form.fhir",
            questionnaireCanonical: "https://fhir.loinc.org/Questionnaire/55757-9",
          },
          accept: ["application/fhir+json"],
        },
      ],
    },
  },
  "allergy-review": {
    label: "allergy-review",
    description: "Prefill the clinic's allergy-review form from the patient's app.",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "demo-allergy-review",
      purpose: "Review your allergy list before your visit",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "allergies",
          title: "Allergies and intolerances",
          summary: "Your current allergy list, so you can review and correct it.",
          required: true,
          content: {
            kind: "selection.fhir",
            profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
          },
          accept: ["application/fhir+json"],
        },
      ],
    },
  },
  "medlist-refresh": {
    label: "medlist-refresh",
    description: "Current medication list before a follow-up visit.",
    request: {
      type: "smart-health-checkin-request",
      version: "1",
      id: "demo-medlist-refresh",
      purpose: "Confirm your current medications",
      fhirVersions: ["4.0.1"],
      items: [
        {
          id: "meds",
          title: "Medication list",
          required: true,
          content: {
            kind: "selection.fhir",
            profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"],
          },
          accept: ["application/fhir+json"],
        },
      ],
    },
  },
};

export function resolveScenario(key: string): Scenario {
  const scenario = SCENARIOS[key];
  if (!scenario) {
    throw new Error(
      `unknown scenario "${key}" (known: ${Object.keys(SCENARIOS).join(", ")})`,
    );
  }
  return scenario;
}
