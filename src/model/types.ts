/**
 * Transport-neutral SMART Health Check-in clinical model (spec §§5–6).
 */

export type FhirCanonical = string;
export type FhirVersion = string;
export type FhirResourceType = string;
export type SmartHealthCheckinAcceptedMediaType =
  | "application/smart-health-card"
  | "application/fhir+json"
  | (string & {});

export type FhirProfileCollectionRef = FhirCanonical;

/**
 * What data an item means: existing records (`selection.fhir`, spec §5.4.1)
 * or a form for the patient to fill in (`form.fhir`, spec §5.4.2).
 */
export type SmartCheckinContentSelector =
  | {
      kind: "selection.fhir";
      /** Records with these exact profiles; `url|version` asks for that version only. */
      profiles?: ReadonlyArray<FhirCanonical>;
      /** Records with any profile from these implementation guides. */
      profilesFrom?: ReadonlyArray<FhirProfileCollectionRef>;
      /** Records of these resource types; also narrows `profiles` and `profilesFrom`. */
      resourceTypes?: ReadonlyArray<FhirResourceType>;
    }
  | {
      kind: "form.fhir";
      /** The Questionnaire's canonical URL, `|version` included; the QuestionnaireResponse echoes it exactly. */
      questionnaireCanonical?: FhirCanonical;
      /** The Questionnaire itself, inline, so the wallet needn't fetch it. */
      questionnaire?: unknown;
    };

/** One thing the request asks for. */
export type SmartCheckinRequestItem = {
  /** Your name for the item; look the answer up by it, as in `response.resources(id)`. */
  id: string;
  /** What the patient sees, such as "Insurance card". */
  title: string;
  /** One line on why you need it. */
  summary?: string;
  /** How much the item matters to you. Advice only: the patient can always decline. */
  required?: boolean;
  /** What data you mean: records or a form. */
  content: SmartCheckinContentSelector;
  /** The formats you can process, most preferred first. */
  accept: ReadonlyArray<SmartHealthCheckinAcceptedMediaType>;
};

/** A complete check-in request (spec §5). `checkinRequest` builds one from `{ purpose, items }`. */
export type SmartCheckinRequest = {
  type: "smart-health-checkin-request";
  version: "1";
  /** A unique id for this request; the response's `requestId` repeats it. */
  id: string;
  /** One line the patient sees at the top. */
  purpose?: string;
  /** The FHIR versions you can read. */
  fhirVersions?: ReadonlyArray<FhirVersion>;
  /** What you're asking for. */
  items: ReadonlyArray<SmartCheckinRequestItem>;
};

/** What the wallet says happened to one item. */
export type SmartCheckinItemStatus = {
  /** The item's `id`. */
  item: string;
  /** What happened to the item. */
  status: "fulfilled" | "partial" | "unavailable" | "declined" | "unsupported" | "error";
  /** The wallet's explanation, if it gave one. */
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

/** A wallet's answer, as it arrives after decryption (spec §6). `CheckinResponse` wraps it with lookups. */
export type SmartCheckinResponse = {
  type: "smart-health-checkin-response";
  version: "1";
  /** The `id` of the request this answers. */
  requestId: string;
  /** The data: FHIR resources and SMART Health Cards, each naming the items it fulfills. */
  artifacts: ReadonlyArray<SmartArtifact>;
  /** One status per item. */
  requestStatus: ReadonlyArray<SmartCheckinItemStatus>;
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };
