/**
 * model — transport-neutral SMART Health Check-in request/response types and
 * validators (spec §§5–6), checked against the spec's conformance cases.
 */

export type {
  FhirCanonical,
  FhirProfileCollectionRef,
  FhirResourceType,
  FhirVersion,
  SmartArtifact,
  SmartArtifactBase,
  SmartCheckinContentSelector,
  SmartCheckinItemStatus,
  SmartCheckinRequest,
  SmartCheckinRequestItem,
  SmartCheckinResponse,
  SmartHealthCheckinAcceptedMediaType,
  ValidationResult,
} from "./types.js";

export {
  parseSmartCheckinRequest,
  parseSmartCheckinResponse,
  STATUS_CODES,
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  validateSmartCheckinResponse,
  type ArtifactCheck,
  type ItemOutcome,
  type RequestValidation,
  type ResponseValidation,
  type UnsupportedItem,
  type ValidationIssue,
} from "./validate.js";

export {
  findWallet,
  loadWalletRegistry,
  validateWalletRegistry,
  type WalletRegistry,
  type WebWalletEntry,
} from "./registry.js";
