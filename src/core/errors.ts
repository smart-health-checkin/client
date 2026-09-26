/**
 * How a check-in can fail. Every failure carries one of these codes, so pages
 * branch on the code instead of matching message text.
 */
export type CheckinErrorCode =
  /** This browser can't reach that wallet (no Digital Credentials API, for example). */
  | "unsupported"
  /** The browser blocked the wallet's tab. */
  | "blocked"
  /** The wallet didn't answer in time. */
  | "timeout"
  /** The wallet reported an error. */
  | "wallet-error"
  /** The response failed decryption, signatures, or validation. */
  | "invalid-response"
  /** A server holding the verifier keys failed. */
  | "server";

/**
 * An error with a code. Wallet transports throw it (a custom wallet can too),
 * and `runCheckin` reports its code in a failed result.
 */
export class CheckinError extends Error {
  readonly code: CheckinErrorCode;
  /** For `invalid-response`: which check failed, when known. */
  readonly check?: string;
  constructor(code: CheckinErrorCode, message: string, options: { check?: string } = {}) {
    super(message);
    this.name = "CheckinError";
    this.code = code;
    if (options.check) this.check = options.check;
  }
}

/**
 * Thrown by a wallet transport when the patient closes the wallet or says no.
 * `runCheckin` turns it into a `declined` result, not a failure.
 */
export class WalletDeclinedError extends Error {
  constructor(message = "the patient declined in the wallet") {
    super(message);
    this.name = "WalletDeclinedError";
  }
}

/** Whether an error from a wallet transport means the patient declined. */
export function isDecline(e: unknown): boolean {
  if (e instanceof WalletDeclinedError) return true;
  if (!(e instanceof Error)) return false;
  // The Digital Credentials API reports a dismissed picker as NotAllowedError or AbortError.
  return e.name === "NotAllowedError" || e.name === "AbortError";
}
