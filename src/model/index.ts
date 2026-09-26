/**
 * model — transport-neutral SMART Health Check-in request/response types and
 * validators (draft spec §§5–6 as code). Ported from the spec prototype and
 * verified against the spec's fixtures.
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
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  validateSmartCheckinResponse,
} from "./validate.js";

export {
  findWallet,
  loadWalletRegistry,
  validateWalletRegistry,
  type WalletRegistry,
  type WebWalletEntry,
} from "./registry.js";
