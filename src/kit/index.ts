/**
 * kit — the product surface, deliberately narrow: build a check-in request,
 * invoke the patient's wallet, verify what comes back, hand your code a
 * validated SmartCheckinResponse. That's it.
 *
 * What happens next — writing FHIR, taking payment, prefilling forms,
 * routing the patient — is your application's business. The kit has no
 * opinion, no configuration, and no code for it. (An optional, separate
 * FHIR helper lives in `src/fhir` for when a demo or app wants one.)
 */

import {
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  type SmartCheckinRequest,
  type SmartCheckinResponse,
} from "../model/index.js";
import {
  createBrowserLocalAuthority,
  createServerAuthority,
  detectDcApiSupport,
  type CredentialCompletion,
  type VerifierAuthority,
} from "../browser/index.js";
import { buildRequest, resolveScenario, type CheckinRequestInit } from "./scenarios.js";

export {
  SCENARIOS,
  buildRequest,
  registerScenario,
  resolveScenario,
  type CheckinRequestInit,
  type Scenario,
} from "./scenarios.js";

/** What to ask for: an inline init, a complete request, or a registered name. */
export type CheckinRequestInput =
  | SmartCheckinRequest
  | CheckinRequestInit
  | { scenario: string };

export type CheckinOptions = {
  /**
   * Where the verifier's private key material lives. Default "browser-local"
   * (page memory — fine for demos); use a server-owned authority in
   * production.
   */
  authority?: "browser-local" | { server: string } | VerifierAuthority;
  /**
   * Override the mediator. Defaults to the platform Digital Credentials API;
   * pass a web-wallet or mock getter to run without a platform wallet.
   */
  getCredential?: (options: unknown) => Promise<unknown>;
  /** Test seam. */
  detectSupport?: typeof detectDcApiSupport;
};

export type CheckinOutcome = {
  status: "completed" | "declined" | "unsupported" | "error";
  /** The request as sent (scenario/init resolved). */
  request: SmartCheckinRequest;
  /** Present iff the flow completed; always validated against the request. */
  response?: SmartCheckinResponse;
  error?: {
    stage: "prepare" | "credential" | "open" | "validate";
    message: string;
  };
};

export function resolveRequest(input: CheckinRequestInput): SmartCheckinRequest {
  const candidate =
    "type" in input
      ? input
      : "items" in input
        ? buildRequest(input)
        : resolveScenario(input.scenario).request;
  const validation = validateSmartCheckinRequest(candidate);
  if (!validation.ok) throw new Error(`invalid check-in request: ${validation.error}`);
  return validation.value;
}

function resolveAuthority(options: CheckinOptions): VerifierAuthority {
  const authority = options.authority ?? "browser-local";
  if (authority === "browser-local") return createBrowserLocalAuthority();
  if (typeof authority === "object" && "server" in authority) {
    return createServerAuthority(authority.server);
  }
  return authority;
}

function isUserDecline(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return (
    e.name === "NotAllowedError" ||
    e.name === "AbortError" ||
    /cancel|abort|dismiss/i.test(e.message)
  );
}

/**
 * Run the flow and report what happened, without throwing for ordinary
 * outcomes (declined, unsupported browser). Use this when you want to branch
 * on `status`; use `requestCheckin` when you just want the data.
 */
export async function runCheckin(
  input: CheckinRequestInput,
  options: CheckinOptions = {},
): Promise<CheckinOutcome> {
  const request = resolveRequest(input);

  const detect = options.detectSupport ?? detectDcApiSupport;
  if (!options.getCredential) {
    const support = detect();
    if (support.state === "unsupported") {
      return { status: "unsupported", request, error: { stage: "prepare", message: support.reason } };
    }
  }

  let authority: VerifierAuthority;
  let prepared;
  try {
    authority = resolveAuthority(options);
    prepared = await authority.prepareCredentialRequest({ request });
  } catch (e) {
    return outcomeError(request, "prepare", e);
  }

  let credential: unknown;
  try {
    const getCredential =
      options.getCredential ??
      ((args: unknown) => navigator.credentials.get(args as CredentialRequestOptions));
    credential = await getCredential(prepared.navigatorArgument);
    if (credential === null || credential === undefined) {
      return { status: "declined", request };
    }
  } catch (e) {
    if (isUserDecline(e)) return { status: "declined", request };
    return outcomeError(request, "credential", e);
  }

  let completion: CredentialCompletion;
  try {
    completion = await authority.completeCredentialRequest({
      handle: prepared.handle,
      credential,
    });
  } catch (e) {
    return outcomeError(request, "open", e);
  }

  // Authorities are expected to validate, but never trust a custom one:
  // re-run the §6.6 cross-checks before handing anything to the caller.
  const crossCheck = validateResponseAgainstRequest(request, completion.smartResponse);
  if (!crossCheck.ok) {
    return outcomeError(request, "validate", new Error(crossCheck.error));
  }
  return { status: "completed", request, response: crossCheck.value };
}

function outcomeError(
  request: SmartCheckinRequest,
  stage: "prepare" | "credential" | "open" | "validate",
  e: unknown,
): CheckinOutcome {
  return {
    status: "error",
    request,
    error: { stage, message: e instanceof Error ? e.message : String(e) },
  };
}

/** Thrown by `requestCheckin` when the flow does not complete. */
export class CheckinFlowError extends Error {
  constructor(readonly outcome: CheckinOutcome) {
    super(
      outcome.error
        ? `check-in ${outcome.status} at ${outcome.error.stage}: ${outcome.error.message}`
        : `check-in ${outcome.status}`,
    );
    this.name = "CheckinFlowError";
  }
}

/**
 * Ask, await, use the answer:
 *
 *   const response = await requestCheckin({ purpose: "…", items: [ … ] });
 *
 * Returns the validated response, or throws CheckinFlowError (which carries
 * the outcome, so you can fall back gracefully on "declined").
 */
export async function requestCheckin(
  input: CheckinRequestInput,
  options: CheckinOptions = {},
): Promise<SmartCheckinResponse> {
  const outcome = await runCheckin(input, options);
  if (outcome.status !== "completed" || !outcome.response) {
    throw new CheckinFlowError(outcome);
  }
  return outcome.response;
}
