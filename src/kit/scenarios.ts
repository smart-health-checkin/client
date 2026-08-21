/**
 * Scenario library: named, canned SmartCheckinRequest templates. A scenario
 * is just a reproducible config fragment — the demo links to them and tests
 * use them, and deployments are expected to write their own.
 */

import type { SmartCheckinRequest } from "../model/index.ts";

export type Scenario = {
  label: string;
  description: string;
  request: SmartCheckinRequest;
};

export const SCENARIOS: Record<string, Scenario> = {
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
