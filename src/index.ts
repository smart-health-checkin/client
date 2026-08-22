/**
 * Public barrel: the check-in protocol surface.
 *
 * The kit's job ends when your code has a validated SmartCheckinResponse.
 * FHIR writing is a separate, optional module — import it from
 * `./fhir/index.ts` (built as `fhir.js` on the site) if you want it.
 */

export {
  requestCheckin,
  runCheckin,
  resolveRequest,
  buildRequest,
  registerScenario,
  resolveScenario,
  SCENARIOS,
  CheckinFlowError,
  type CheckinOptions,
  type CheckinOutcome,
  type CheckinRequestInit,
  type CheckinRequestInput,
  type Scenario,
} from "./kit/index.js";

export {
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  validateSmartCheckinResponse,
  type FhirCanonical,
  type FhirProfileCollectionRef,
  type FhirResourceType,
  type FhirVersion,
  type SmartArtifact,
  type SmartArtifactBase,
  type SmartCheckinContentSelector,
  type SmartCheckinItemStatus,
  type SmartCheckinRequest,
  type SmartCheckinRequestItem,
  type SmartCheckinResponse,
  type SmartHealthCheckinAcceptedMediaType,
  type ValidationResult,
} from "./model/index.js";

// Protocol identifiers and the raw DC API argument shape, for callers that
// inspect or construct wire material directly.
export {
  MDOC_DOC_TYPE,
  MDOC_NAMESPACE,
  PROTOCOL_ID,
  SMART_REQUEST_INFO_KEY,
  SMART_RESPONSE_ELEMENT_ID,
  type OrgIsoMdocNavigatorArgument,
} from "./wire/request.js";

export {
  createBrowserLocalAuthority,
  createServerAuthority,
  detectDcApiSupport,
  extractDcapiResponse,
  type CredentialCompletion,
  type DcapiMdocResponse,
  type DcApiSupport,
  type PreparedCredentialRequest,
  type VerifierAuthority,
} from "./browser/index.js";

// Wallet-side helpers: the demo wallet app and phone-free testing.
export {
  buildMockResponse,
  createMockWalletCredentialGetter,
  fabricateResponse,
  parseWalletRequest,
  sealWalletResponse,
  type MockItemSpec,
  type MockWalletOptions,
  type ParsedWalletRequest,
} from "./kit/mock-wallet.js";

export type { FetchLike } from "./fetch-like.js";

export {
  DEMO_WALLET_REGISTRY,
  findWallet,
  loadWalletRegistry,
  validateWalletRegistry,
  type WalletRegistry,
  type WebWalletEntry,
} from "./kit/wallet-registry.js";

export {
  credentialGetterFor,
  resolveResponders,
  type Responder,
  type ResponderPolicy,
} from "./kit/responders.js";

export {
  createWebWalletCredentialGetter,
  WalletDeclinedError,
  WEB_WALLET_READY_MESSAGE_TYPE,
  WEB_WALLET_REQUEST_MESSAGE_TYPE,
  WEB_WALLET_RESPONSE_MESSAGE_TYPE,
  type WebWalletCredential,
  type WebWalletOptions,
  type WebWalletResponseMessage,
} from "./kit/web-wallet.js";
