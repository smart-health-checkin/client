/**
 * fhir — an OPTIONAL companion helper, not part of the check-in protocol
 * surface. It turns a SmartCheckinResponse into ordinary FHIR and posts it,
 * for apps that want that done for them.
 *
 * Deliberately separate from the kit: what happens to patient-supplied data
 * — where it lands, under whose authorization, with what review — is
 * deployment policy. The check-in flow itself never touches it. Use this,
 * your own FHIR client, or neither.
 *
 * Mapping defaults:
 * - fhir+json artifacts → POST entries in one transaction Bundle (each Bundle
 *   entry resource, or the single resource).
 * - smart-health-card artifacts → one DocumentReference per artifact holding
 *   the JWS payload (chain of custody preserved; unpacking is opt-in and not
 *   implemented here).
 * - a Provenance resource ties every created entry to the check-in: the
 *   request id is recoverable, patient/appointment context is linked, and the
 *   patient-supplied origin is explicit.
 * - No patient matching, ever: context is configuration.
 */

import type { SmartCheckinRequest, SmartCheckinResponse } from "../model/index.js";
import { base64UrlEncodeUtf8 } from "../wire/bytes.js";

export type PostMode = "transaction" | "individual";

export type { FetchLike } from "../fetch-like.js";
import type { FetchLike } from "../fetch-like.js";

export type CheckinBundleContext = {
  patient?: string;
  appointment?: string;
};

export type CheckinBundleEntry = {
  fullUrl: string;
  resource: Record<string, unknown>;
  /** Artifact id this entry came from; the Provenance entry has none. */
  artifactId?: string;
};

export type CheckinBundle = {
  entries: CheckinBundleEntry[];
  /** The transaction Bundle equivalent of the plan. */
  bundle: Record<string, unknown>;
};

export const CHECKIN_REQUEST_ID_SYSTEM =
  "https://smart-health-checkin.github.io/checkin-request-id";
export const CHECKIN_APPOINTMENT_SYSTEM =
  "https://smart-health-checkin.github.io/appointment-context";

/**
 * Map a check-in response to a FHIR transaction Bundle. Pure — no network.
 * Inspect or edit the result before sending it anywhere.
 */
export function buildCheckinBundle(input: {
  request: SmartCheckinRequest;
  response: SmartCheckinResponse;
  context?: CheckinBundleContext;
  provenance?: boolean;
  now?: () => Date;
}): CheckinBundle {
  const entries: CheckinBundleEntry[] = [];
  for (const artifact of input.response.artifacts) {
    if (artifact.mediaType === "application/fhir+json") {
      for (const resource of extractFhirResources(artifact.value)) {
        entries.push({
          fullUrl: `urn:uuid:${crypto.randomUUID()}`,
          resource,
          artifactId: artifact.id,
        });
      }
    } else if (artifact.mediaType === "application/smart-health-card") {
      entries.push({
        fullUrl: `urn:uuid:${crypto.randomUUID()}`,
        resource: smartHealthCardDocumentReference(artifact.value, input.context),
        artifactId: artifact.id,
      });
    }
  }

  if (input.provenance !== false && entries.length > 0) {
    entries.push({
      fullUrl: `urn:uuid:${crypto.randomUUID()}`,
      resource: buildProvenance({
        targets: entries.map((e) => e.fullUrl),
        requestId: input.request.id,
        context: input.context,
        recorded: (input.now ? input.now() : new Date()).toISOString(),
      }),
    });
  }

  return { entries, bundle: toTransactionBundle(entries) };
}

function extractFhirResources(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  const v = value as Record<string, unknown>;
  if (v.resourceType === "Bundle" && Array.isArray(v.entry)) {
    const out: Record<string, unknown>[] = [];
    for (const entry of v.entry) {
      const resource = (entry as { resource?: unknown })?.resource;
      if (resource && typeof resource === "object") {
        out.push(resource as Record<string, unknown>);
      }
    }
    return out;
  }
  if (typeof v.resourceType === "string") return [v];
  return [];
}

function smartHealthCardDocumentReference(
  value: { verifiableCredential: ReadonlyArray<string> },
  context?: CheckinBundleContext,
): Record<string, unknown> {
  return {
    resourceType: "DocumentReference",
    status: "current",
    ...(context?.patient ? { subject: { reference: context.patient } } : {}),
    content: [
      {
        attachment: {
          contentType: "application/smart-health-card",
          data: base64UrlEncodeUtf8(JSON.stringify(value)),
        },
      },
    ],
  };
}

function buildProvenance(input: {
  targets: string[];
  requestId: string;
  context?: CheckinBundleContext;
  recorded: string;
}): Record<string, unknown> {
  // target carries only the resources created in this plan; appointment
  // context rides as an identifier entity so nothing has to resolve on the
  // target server.
  return {
    resourceType: "Provenance",
    target: input.targets.map((reference) => ({ reference })),
    recorded: input.recorded,
    agent: [
      {
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
              code: "author",
            },
          ],
          text: "Patient-supplied via SMART Health Check-in",
        },
        ...(input.context?.patient ? { who: { reference: input.context.patient } } : {}),
      },
    ],
    entity: [
      {
        role: "source",
        what: {
          identifier: {
            system: CHECKIN_REQUEST_ID_SYSTEM,
            value: input.requestId,
          },
        },
      },
      ...(input.context?.appointment
        ? [
            {
              role: "source",
              what: {
                identifier: {
                  system: CHECKIN_APPOINTMENT_SYSTEM,
                  value: input.context.appointment,
                },
              },
            },
          ]
        : []),
    ],
  };
}

function toTransactionBundle(entries: CheckinBundleEntry[]): Record<string, unknown> {
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries.map((entry) => ({
      fullUrl: entry.fullUrl,
      resource: entry.resource,
      request: {
        method: "POST",
        url: String(entry.resource.resourceType ?? ""),
      },
    })),
  };
}

export type PostResult = {
  mode: PostMode;
  bundle: unknown;
  result: unknown;
};

/**
 * Post a bundle to a FHIR server. A convenience for demos and simple apps —
 * production deployments usually have their own client and auth, in which
 * case use `buildCheckinBundle` alone and send it yourself.
 */
export async function postCheckinBundle(
  plan: CheckinBundle,
  options: {
    fhirBase: string;
    mode?: PostMode;
    fetchImpl?: FetchLike;
  },
): Promise<PostResult> {
  const mode = options.mode ?? "transaction";
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.fhirBase.replace(/\/$/, "");
  const headers = {
    "content-type": "application/fhir+json",
    accept: "application/fhir+json",
  };

  if (mode === "transaction") {
    const res = await fetchImpl(base, {
      method: "POST",
      headers,
      body: JSON.stringify(plan.bundle),
    });
    const body = await readJsonSafely(res);
    if (!res.ok) {
      throw new Error(`FHIR transaction failed: HTTP ${res.status}${detail(body)}`);
    }
    return { mode, bundle: plan.bundle, result: body };
  }

  // individual mode: post each resource, then rewrite urn:uuid references in
  // the Provenance to the server-assigned locations before posting it.
  const locations = new Map<string, string>();
  const results: unknown[] = [];
  const provenanceEntries = plan.entries.filter(
    (e) => e.resource.resourceType === "Provenance",
  );
  const resourceEntries = plan.entries.filter(
    (e) => e.resource.resourceType !== "Provenance",
  );
  for (const entry of resourceEntries) {
    const res = await fetchImpl(`${base}/${String(entry.resource.resourceType)}`, {
      method: "POST",
      headers,
      body: JSON.stringify(entry.resource),
    });
    const body = await readJsonSafely(res);
    if (!res.ok) {
      throw new Error(
        `FHIR create failed for ${String(entry.resource.resourceType)}: HTTP ${res.status}${detail(body)}`,
      );
    }
    const assigned = referenceFromCreateResult(res, body);
    if (assigned) locations.set(entry.fullUrl, assigned);
    results.push(body);
  }
  for (const entry of provenanceEntries) {
    const rewritten = JSON.parse(JSON.stringify(entry.resource), (_key, value) => {
      if (typeof value === "string" && locations.has(value)) return locations.get(value);
      return value;
    }) as Record<string, unknown>;
    const res = await fetchImpl(`${base}/Provenance`, {
      method: "POST",
      headers,
      body: JSON.stringify(rewritten),
    });
    const body = await readJsonSafely(res);
    if (!res.ok) {
      throw new Error(`FHIR create failed for Provenance: HTTP ${res.status}${detail(body)}`);
    }
    results.push(body);
  }
  return { mode, bundle: plan.bundle, result: results };
}

function referenceFromCreateResult(res: Response, body: unknown): string | undefined {
  const location = res.headers.get("location") ?? res.headers.get("content-location");
  if (location) {
    const match = location.match(/([A-Za-z]+\/[A-Za-z0-9\-.]+)(?:\/_history\/.*)?$/);
    if (match) return match[1];
  }
  if (body && typeof body === "object") {
    const b = body as { resourceType?: unknown; id?: unknown };
    if (typeof b.resourceType === "string" && typeof b.id === "string") {
      return `${b.resourceType}/${b.id}`;
    }
  }
  return undefined;
}

async function readJsonSafely(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function detail(body: unknown): string {
  if (body && typeof body === "object" && (body as { resourceType?: unknown }).resourceType === "OperationOutcome") {
    return ` — ${JSON.stringify(body)}`;
  }
  return "";
}
