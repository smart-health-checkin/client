/**
 * `@smart-health-checkin/client/wallet`: for building a wallet.
 *
 * - `serveWebWallet`: the web wallet's side of the hand-off.
 * - `parseWalletRequest`, `sealWalletResponse`: read a request, seal a response (native or web).
 * - `selects`, `selectEntries`: which records answer a `selection.fhir` item.
 * - `buildSignedDeviceResponse`, `recipientJwkFromEncryptionInfo`: lower-level
 *   pieces for wallets that seal their own responses.
 */
export { serveWebWallet, type ServeWebWalletOptions, type WebWalletAnswer, type WebWalletRequestContext } from "./serve-web-wallet.js";
export { selectEntries, selects, type MatchableEntry, type MatchableResource, type SelectionContent } from "./match.js";
export {
  buildSignedDeviceResponse,
  parseWalletRequest,
  recipientJwkFromEncryptionInfo,
  sealWalletResponse,
  type ParsedWalletRequest,
} from "../kit/mock-wallet.js";
export {
  WEB_WALLET_READY_MESSAGE_TYPE,
  WEB_WALLET_REQUEST_MESSAGE_TYPE,
  WEB_WALLET_RESPONSE_MESSAGE_TYPE,
  type WebWalletCredential,
  type WebWalletResponseMessage,
} from "../kit/web-wallet.js";
