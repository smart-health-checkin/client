/**
 * The requests the demos send, as plain request objects. (0.1 had these as
 * built-in named "scenarios"; 0.2 dropped that: a request is just data.)
 */
import type { SmartCheckinRequest } from "../../src/index.js";

export type DemoRequest = { label: string; description: string; request: SmartCheckinRequest };

export const DEMO_REQUESTS: Record<string, DemoRequest> = {
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

export function demoRequest(key: string): DemoRequest {
  const found = DEMO_REQUESTS[key];
  if (!found) throw new Error(`unknown demo request "${key}" (known: ${Object.keys(DEMO_REQUESTS).join(", ")})`);
  return found;
}
