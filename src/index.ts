/** Public barrel for @smart-health-checkin/provider-kit. */

export {
  runCheckin,
  requestCheckin,
  buildRequest,
  registerScenario,
  CheckinFlowError,
  resolveRequest,
  SCENARIOS,
  resolveScenario,
  type CheckinConfig,
  type CheckinOutcome,
  type CheckinRequestInit,
  type RequestCheckinOptions,
  type RunCheckinHooks,
  type Scenario,
} from "./kit/index.ts";

export {
  createMockWalletCredentialGetter,
  fabricateResponse,
  parseWalletRequest,
  sealWalletResponse,
  type MockWalletOptions,
  type ParsedWalletRequest,
} from "./kit/mock-wallet.ts";

export {
  createWebWalletCredentialGetter,
  WalletDeclinedError,
  WEB_WALLET_READY_MESSAGE_TYPE,
  WEB_WALLET_REQUEST_MESSAGE_TYPE,
  WEB_WALLET_RESPONSE_MESSAGE_TYPE,
  type WebWalletCredential,
  type WebWalletOptions,
  type WebWalletResponseMessage,
} from "./kit/web-wallet.ts";

export {
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  validateSmartCheckinResponse,
  type SmartArtifact,
  type SmartCheckinContentSelector,
  type SmartCheckinItemStatus,
  type SmartCheckinRequest,
  type SmartCheckinRequestItem,
  type SmartCheckinResponse,
  type ValidationResult,
} from "./model/index.ts";

export {
  createBrowserLocalAuthority,
  createServerAuthority,
  detectDcApiSupport,
  extractDcapiResponse,
  type CredentialCompletion,
  type DcApiSupport,
  type PreparedCredentialRequest,
  type VerifierAuthority,
} from "./browser/index.ts";

export {
  buildWritePlan,
  executeWritePlan,
  CHECKIN_REQUEST_ID_SYSTEM,
  type SubmitMode,
  type SubmitResult,
  type WritePlan,
} from "./submit/index.ts";

