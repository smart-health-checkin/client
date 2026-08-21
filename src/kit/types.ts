/**
 * kit — public config and outcome types. This file IS the API contract the
 * README documents; keep the two in lockstep.
 */

import type { SmartCheckinRequest, SmartCheckinResponse } from "../model/index.ts";
import type { VerifierAuthority } from "../browser/index.ts";
import type { SubmitMode } from "../submit/index.ts";

export type CheckinConfig = {
  /** What to ask the patient for. Exactly one of: */
  request:
    | { scenario: string }
    | { request: SmartCheckinRequest };

  /** FHIR context on the target server; stamped into Provenance, never guessed. */
  context?: { patient?: string; appointment?: string };

  /** Where and how to submit the response. Omit for display-only flows. */
  submit?: {
    fhirBase: string;
    mode?: SubmitMode;
    provenance?: boolean;
  };

  /** Closed-loop return leg: where the patient lands after completion. */
  complete?: { returnUrl?: string };

  /** Key custody for the verifier crypto. Default: browser-local. */
  authority?: "browser-local" | { server: string } | VerifierAuthority;
};

export type CheckinOutcome = {
  status: "completed" | "declined" | "unsupported" | "error";
  request: SmartCheckinRequest;
  response?: SmartCheckinResponse;
  submission?: {
    mode: SubmitMode;
    bundle: unknown;
    result?: unknown;
  };
  error?: {
    stage: "prepare" | "credential" | "open" | "validate" | "submit";
    message: string;
  };
};
