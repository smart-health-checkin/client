/**
 * kit — product facade: runCheckin(config) orchestrates
 * configure → launch → receive → submit, and returns a CheckinOutcome.
 * Navigation (the closed-loop return leg) is the caller's or the element's
 * job — runCheckin itself has no navigation side effects.
 */

import {
  validateResponseAgainstRequest,
  validateSmartCheckinRequest,
  type SmartCheckinRequest,
} from "../model/index.ts";
import {
  createBrowserLocalAuthority,
  createServerAuthority,
  detectDcApiSupport,
  type CredentialCompletion,
  type VerifierAuthority,
} from "../browser/index.ts";
import { buildWritePlan, executeWritePlan, type FetchLike } from "../submit/index.ts";
import { buildRequest, resolveScenario, type CheckinRequestInit } from "./scenarios.ts";
import { createMockWalletCredentialGetter } from "./mock-wallet.ts";
import type { CheckinConfig, CheckinOutcome } from "./types.ts";
import type { SmartCheckinResponse } from "../model/index.ts";

export type { CheckinConfig, CheckinOutcome } from "./types.ts";
export {
  SCENARIOS,
  buildRequest,
  registerScenario,
  resolveScenario,
  type CheckinRequestInit,
  type Scenario,
} from "./scenarios.ts";

export type RunCheckinHooks = {
  /** Injectable for tests and the demo's mock mode. */
  getCredential?: (options: unknown) => Promise<unknown>;
  detectSupport?: typeof detectDcApiSupport;
  fetchImpl?: FetchLike;
};

export function resolveRequest(config: CheckinConfig): SmartCheckinRequest {
  const request =
    "scenario" in config.request
      ? resolveScenario(config.request.scenario).request
      : config.request.request;
  const validation = validateSmartCheckinRequest(request);
  if (!validation.ok) throw new Error(`invalid check-in request: ${validation.error}`);
  return validation.value;
}

function resolveAuthority(config: CheckinConfig): VerifierAuthority {
  const authority = config.authority ?? "browser-local";
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

export async function runCheckin(
  config: CheckinConfig,
  hooks: RunCheckinHooks = {},
): Promise<CheckinOutcome> {
  let request: SmartCheckinRequest;
  try {
    request = resolveRequest(config);
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }

  const detect = hooks.detectSupport ?? detectDcApiSupport;
  if (!hooks.getCredential) {
    const support = detect();
    if (support.state === "unsupported") {
      return {
        status: "unsupported",
        request,
        error: { stage: "prepare", message: support.reason },
      };
    }
  }

  let authority: VerifierAuthority;
  let prepared;
  try {
    authority = resolveAuthority(config);
    prepared = await authority.prepareCredentialRequest({ request });
  } catch (e) {
    return outcomeError(request, "prepare", e);
  }

  let credential: unknown;
  try {
    const getCredential =
      hooks.getCredential ??
      ((options: unknown) =>
        navigator.credentials.get(options as CredentialRequestOptions));
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
  // re-run the §6.6 cross-checks before doing anything with the response.
  const crossCheck = validateResponseAgainstRequest(request, completion.smartResponse);
  if (!crossCheck.ok) {
    return outcomeError(request, "validate", new Error(crossCheck.error));
  }
  const response = crossCheck.value;

  if (!config.submit) {
    return { status: "completed", request, response };
  }

  try {
    const plan = buildWritePlan({
      request,
      response,
      context: config.context,
      provenance: config.submit.provenance,
    });
    const submission = await executeWritePlan(plan, {
      fhirBase: config.submit.fhirBase,
      mode: config.submit.mode,
      fetchImpl: hooks.fetchImpl,
    });
    return { status: "completed", request, response, submission };
  } catch (e) {
    return {
      status: "error",
      request,
      response,
      error: { stage: "submit", message: e instanceof Error ? e.message : String(e) },
    };
  }
}

function outcomeError(
  request: SmartCheckinRequest,
  stage: "prepare" | "credential" | "open" | "validate" | "submit",
  e: unknown,
): CheckinOutcome {
  return {
    status: "error",
    request,
    error: { stage, message: e instanceof Error ? e.message : String(e) },
  };
}

/**
 * The autofill-shaped API: ask, await, get the validated response back —
 * no FHIR submission, no side effects. Provider-side code uses the returned
 * artifacts to prefill its own forms and stays in full control of what
 * happens next.
 *
 *   // define the request inline — type/version/id boilerplate is filled in:
 *   const response = await requestCheckin({ purpose: "…", items: [ … ] });
 *   // or pass a complete SmartCheckinRequest, or a registered scenario name:
 *   await requestCheckin(myFullRequest);
 *   await requestCheckin({ scenario: "my-registered-intake" });
 *
 * Throws CheckinFlowError when the flow does not complete (declined,
 * unsupported browser, or an error) — the outcome rides on the error for
 * graceful fallbacks.
 */
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

export type RequestCheckinOptions = {
  authority?: CheckinConfig["authority"];
  /** Demo/testing only: answer with the built-in mock wallet. */
  mock?: boolean;
};

export async function requestCheckin(
  request: SmartCheckinRequest | CheckinRequestInit | { scenario: string },
  options: RequestCheckinOptions = {},
): Promise<SmartCheckinResponse> {
  const resolved: SmartCheckinRequest | { scenario: string } =
    "type" in request
      ? request
      : "items" in request
        ? buildRequest(request)
        : request;
  const config: CheckinConfig = {
    request: "type" in resolved ? { request: resolved } : { scenario: resolved.scenario },
    ...(options.authority ? { authority: options.authority } : {}),
  };
  const hooks: RunCheckinHooks = options.mock
    ? { getCredential: createMockWalletCredentialGetter({ origin: location.origin }) }
    : {};
  const outcome = await runCheckin(config, hooks);
  if (outcome.status !== "completed" || !outcome.response) {
    throw new CheckinFlowError(outcome);
  }
  return outcome.response;
}
