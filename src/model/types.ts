/**
 * Transport-neutral SMART Health Check-in clinical model (draft spec §§5–6).
 * Ported from smart-health-checkin-mdoc rp-web/src/sdk/core.ts.
 */

export type FhirCanonical = string;
export type FhirVersion = string;
export type FhirResourceType = string;
export type SmartHealthCheckinAcceptedMediaType =
  | "application/smart-health-card"
  | "application/fhir+json"
  | (string & {});

export type FhirProfileCollectionRef = FhirCanonical;

export type SmartCheckinContentSelector =
  | {
      kind: "selection.fhir";
      profiles?: ReadonlyArray<FhirCanonical>;
      profilesFrom?: ReadonlyArray<FhirProfileCollectionRef>;
      resourceTypes?: ReadonlyArray<FhirResourceType>;
    }
  | {
      kind: "form.fhir";
      questionnaireCanonical?: FhirCanonical;
      questionnaire?: unknown;
    };

export type SmartCheckinRequestItem = {
  id: string;
  title: string;
  summary?: string;
  required?: boolean;
  content: SmartCheckinContentSelector;
  accept: ReadonlyArray<SmartHealthCheckinAcceptedMediaType>;
};

export type SmartCheckinRequest = {
  type: "smart-health-checkin-request";
  version: "1";
  id: string;
  purpose?: string;
  fhirVersions?: ReadonlyArray<FhirVersion>;
  items: ReadonlyArray<SmartCheckinRequestItem>;
};

export type SmartCheckinItemStatus = {
  item: string;
  status: "fulfilled" | "partial" | "unavailable" | "declined" | "unsupported" | "error";
  message?: string;
};

export type SmartArtifactBase = {
  id: string;
  mediaType: string;
  fulfills: ReadonlyArray<string>;
};

export type SmartArtifact =
  | (SmartArtifactBase & {
      mediaType: "application/smart-health-card";
      value: { verifiableCredential: ReadonlyArray<string> };
    })
  | (SmartArtifactBase & {
      mediaType: "application/fhir+json";
      fhirVersion: FhirVersion;
      value: unknown;
    });

export type SmartCheckinResponse = {
  type: "smart-health-checkin-response";
  version: "1";
  requestId: string;
  artifacts: ReadonlyArray<SmartArtifact>;
  requestStatus: ReadonlyArray<SmartCheckinItemStatus>;
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };
