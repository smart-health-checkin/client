import { validateSmartCheckinRequest, type SmartCheckinRequest, type SmartCheckinRequestItem } from "../model/index.js";

/** Everything a request needs except what the library fills in. */
export type CheckinRequestInit = {
  /** Defaults to a random UUID. */
  id?: string;
  /** Shown to the patient by some wallets. */
  purpose?: string;
  /** Defaults to ["4.0.1"]. */
  fhirVersions?: ReadonlyArray<string>;
  items: ReadonlyArray<SmartCheckinRequestItem>;
};

/** What `runCheckin` accepts: a complete request, or the parts to build one from. */
export type CheckinRequestInput = SmartCheckinRequest | CheckinRequestInit;

/**
 * Build and validate a request. `type` and `version` are fixed by the spec,
 * `id` defaults to a UUID, `fhirVersions` to ["4.0.1"]. Throws on an invalid request.
 */
export function checkinRequest(init: CheckinRequestInit): SmartCheckinRequest {
  return toRequest(init);
}

/** A complete, validated request from either input shape. Throws on an invalid request. */
export function toRequest(input: CheckinRequestInput): SmartCheckinRequest {
  const candidate: SmartCheckinRequest =
    "type" in input
      ? input
      : {
          type: "smart-health-checkin-request",
          version: "1",
          id: input.id ?? crypto.randomUUID(),
          ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
          fhirVersions: input.fhirVersions ?? ["4.0.1"],
          items: input.items,
        };
  const validation = validateSmartCheckinRequest(candidate);
  if (!validation.ok) throw new Error(`invalid check-in request: ${validation.error}`);
  return validation.value;
}
