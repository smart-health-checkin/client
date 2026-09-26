/**
 * Run a check-in: ask a wallet, open and verify its answer, cross-check it
 * against the request, check any SMART Health Cards, and report what happened.
 *
 *   const result = await runCheckin(request);                  // the phone's own wallet
 *   const result = await runCheckin(request, { wallet });      // any wallet from wallets()
 *
 * Call it inside the click: the wallet is opened before the first `await`.
 */

import {
  createBrowserKeyCustody,
  createServerKeyCustody,
  type CredentialCompletion,
  type KeyCustody,
} from "../browser/index.js";
import { validateResponseAgainstRequest, type SmartCheckinRequest } from "../model/index.js";
import type { CheckinWarning } from "../wire/warnings.js";
import { CheckinError, isDecline, type CheckinErrorCode } from "./errors.js";
import { checkHealthCard, healthCardTrust, type HealthCard, type HealthCardTrust } from "./health-cards.js";
import { toRequest, type CheckinRequestInput } from "./request.js";
import { CheckinResponse } from "./response.js";
import { platformWallet, type Wallet, type WalletSession } from "./wallets.js";

/**
 * Where the verifier's private key lives. "browser" (default): a fresh key in
 * the page for each check-in. `{ server }`: your server holds it, behind two
 * HTTP calls (see the server-held keys guide). Or your own implementation.
 */
export type { KeyCustody };

export type CheckinOptions = {
  /** Which wallet to ask. Defaults to the phone's own wallet. */
  wallet?: Wallet;
  /** A session already opened with `wallet.open()`, for example by the picker in pick mode. */
  session?: WalletSession;
  keys?: "browser" | { server: string } | KeyCustody;
  /** Trust for SMART Health Cards in the response; defaults to `configureHealthCardTrust`. */
  healthCards?: HealthCardTrust;
  /** Abort to stop waiting (closes a web wallet's tab); the check-in ends as declined. */
  signal?: AbortSignal;
  /** Used to fetch health-card issuer keys and directories. */
  fetch?: typeof fetch;
};

export type CheckinResult =
  | {
      status: "completed";
      request: SmartCheckinRequest;
      wallet: Wallet;
      /** The validated response. */
      response: CheckinResponse;
      /**
       * Transport and signature problems that didn't stop the check-in: a
       * receiver continues past them and reports them (spec §2, [RCV-1]).
       * Empty when everything checked out.
       */
      warnings: CheckinWarning[];
    }
  | {
      /** Server key custody kept the data; the page gets only a handle. */
      status: "kept-on-server";
      request: SmartCheckinRequest;
      wallet: Wallet;
      /** The server's handle for what it stored (an encounter id, a queue entry), if it returned one. */
      serverReference?: string;
    }
  | { status: "declined"; request: SmartCheckinRequest; wallet: Wallet }
  | {
      status: "failed";
      request: SmartCheckinRequest;
      wallet: Wallet;
      error: { code: CheckinErrorCode; message: string; check?: string };
    };

/**
 * Run a check-in and report what happened. Never throws for an ordinary
 * outcome (declined, failed); throws only for a malformed request.
 */
export async function runCheckin(input: CheckinRequestInput, options: CheckinOptions = {}): Promise<CheckinResult> {
  // Everything up to wallet.open() is synchronous, so a web wallet's tab opens inside the click.
  const request = toRequest(input);
  const wallet = options.wallet ?? platformWallet();
  const failed = (code: CheckinErrorCode, message: string, check?: string): CheckinResult => ({
    status: "failed",
    request,
    wallet,
    error: { code, message, ...(check ? { check } : {}) },
  });
  if (!wallet.available) return failed("unsupported", wallet.unavailableReason ?? `${wallet.name} isn't available in this browser`);
  const session = options.session ?? wallet.open();
  if (options.signal?.aborted) session.cancel();
  options.signal?.addEventListener("abort", () => session.cancel(), { once: true });

  const custody = resolveCustody(options.keys ?? wallet.keys);
  const serverHeld = custody.kind !== "browser-local";

  let prepared;
  try {
    prepared = await custody.prepareCredentialRequest({ request });
  } catch (e) {
    session.cancel();
    if (serverHeld) return failed("server", messageOf(e));
    throw e;
  }

  let credential: unknown;
  try {
    credential = await session.getCredential(prepared.navigatorArgument);
    if (credential === null || credential === undefined) return { status: "declined", request, wallet };
  } catch (e) {
    if (isDecline(e)) return { status: "declined", request, wallet };
    if (e instanceof CheckinError) return failed(e.code, e.message, e.check);
    return failed("wallet-error", messageOf(e));
  }

  let completion: CredentialCompletion;
  try {
    completion = await custody.completeCredentialRequest({ handle: prepared.handle, credential });
  } catch (e) {
    if (e instanceof CheckinError) return failed(e.code, e.message, e.check);
    return serverHeld ? failed("server", messageOf(e)) : failed("invalid-response", messageOf(e), "open");
  }
  if (completion.handledByServer) {
    return { status: "kept-on-server", request, wallet, ...(completion.reference ? { serverReference: completion.reference } : {}) };
  }

  // Never trust a custom custody implementation's validation: cross-check here.
  // Only [XV-1] and [XV-2] fail; other problems set aside one Artifact or item.
  const crossCheck = validateResponseAgainstRequest(request, completion.smartResponse);
  if (!crossCheck.ok) return failed("invalid-response", crossCheck.error, crossCheck.rule);

  const trust = { ...healthCardTrust(), ...options.healthCards };
  const cards: HealthCard[] = [];
  for (const artifact of crossCheck.usableArtifacts) {
    if (artifact.mediaType !== "application/smart-health-card") continue;
    for (const jws of artifact.value.verifiableCredential) {
      cards.push(await checkHealthCard(jws, artifact.fulfills, trust, options.fetch ?? fetch));
    }
  }
  return {
    status: "completed",
    request,
    wallet,
    response: new CheckinResponse(crossCheck, request, cards),
    warnings: completion.warnings ?? [],
  };
}

function resolveCustody(keys: CheckinOptions["keys"]): KeyCustody {
  if (!keys || keys === "browser") return createBrowserKeyCustody();
  if ("server" in keys && typeof keys.server === "string") return createServerKeyCustody(keys.server);
  return keys as KeyCustody;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
