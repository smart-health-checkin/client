/**
 * `@smart-health-checkin/client`: add SMART Health Check-in to an EHR page.
 *
 *   const result = await runCheckin(request);                     // the phone's own wallet
 *   const options = await wallets({ registry: "/wallets.json" }); // or let the patient choose
 *   button.onclick = () => options[1].start(request).then(show);
 *
 *   if (result.status === "completed") result.response.resources("allergies");
 *
 * Other entry points: `/ui` (the picker element), `/react`, `/picker`,
 * `/wallet` (building a wallet), `/handoff` (kiosks), `/fhir`, `/testing`,
 * `/model`, `/wire`.
 */

export { runCheckin, type CheckinOptions, type CheckinResult, type KeyCustody } from "./core/run.js";
export { checkinRequest, type CheckinRequestInit, type CheckinRequestInput } from "./core/request.js";
export {
  customWallet,
  platformWallet,
  wallets,
  webWallet,
  type Wallet,
  type WalletSession,
  type WalletsOptions,
} from "./core/wallets.js";
export { CheckinError, WalletDeclinedError, type CheckinErrorCode } from "./core/errors.js";
export { CheckinResponse, type FhirResource, type ItemStatus, type ResourceEntry } from "./core/response.js";
export {
  configureHealthCardTrust,
  healthCardTrust,
  VCI_DIRECTORY_URL,
  type HealthCard,
  type HealthCardTrust,
} from "./core/health-cards.js";
export {
  detectDcApiSupport,
  type CredentialCompletion,
  type DcApiSupport,
  type PreparedCredentialRequest,
  type PresentationContext,
} from "./browser/index.js";
export type {
  SmartArtifact,
  SmartCheckinContentSelector,
  SmartCheckinItemStatus,
  SmartCheckinRequest,
  SmartCheckinRequestItem,
  SmartCheckinResponse,
  WalletRegistry,
  WebWalletEntry,
} from "./model/index.js";
