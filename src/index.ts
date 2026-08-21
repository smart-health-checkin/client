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
  type SmartArtifact,
  type SmartCheckinContentSelector,
  type SmartCheckinItemStatus,
  type SmartCheckinRequest,
  type SmartCheckinRequestItem,
  type SmartCheckinResponse,
  type ValidationResult,
} from "./model/index.js";

export {
  createBrowserLocalAuthority,
  createServerAuthority,
  detectDcApiSupport,
  extractDcapiResponse,
  type CredentialCompletion,
  type DcApiSupport,
  type PreparedCredentialRequest,
  type VerifierAuthority,
} from "./browser/index.js";

// Wallet-side helpers: the demo wallet app and phone-free testing.
export {
  createMockWalletCredentialGetter,
  fabricateResponse,
  parseWalletRequest,
  sealWalletResponse,
  type MockWalletOptions,
  type ParsedWalletRequest,
} from "./kit/mock-wallet.js";

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
