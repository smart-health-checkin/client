/** Public barrel for @smart-health-checkin/provider-kit. */

export {
  runCheckin,
  resolveRequest,
  SCENARIOS,
  resolveScenario,
  type CheckinConfig,
  type CheckinOutcome,
  type RunCheckinHooks,
  type Scenario,
} from "./kit/index.ts";

export {
  createMockWalletCredentialGetter,
  fabricateResponse,
  type MockWalletOptions,
} from "./kit/mock-wallet.ts";

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
