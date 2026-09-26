/**
 * browser — the thin DOM layer: Digital Credentials API support detection,
 * the navigator.credentials.get call, and the key-custody seam
 * (KeyCustody). Everything below this layer is DOM-free.
 */

import type { SmartCheckinRequest, SmartCheckinResponse } from "../model/index.js";
import {
  buildOrgIsoMdocRequest,
  openWalletResponse,
  type DcapiMdocResponse,
  type OrgIsoMdocNavigatorArgument,
  type OrgIsoMdocRequestBundle,
} from "../wire/index.js";

export type DcApiSupport =
  | { state: "supported" }
  | { state: "unsupported"; reason: string };

export function detectDcApiSupport(): DcApiSupport {
  if (typeof navigator === "undefined") {
    return { state: "unsupported", reason: "no navigator (server-side environment)" };
  }
  const credentials = (navigator as Navigator & { credentials?: unknown }).credentials;
  if (!credentials || typeof (credentials as { get?: unknown }).get !== "function") {
    return { state: "unsupported", reason: "navigator.credentials.get is not available" };
  }
  const w = globalThis as unknown as {
    DigitalCredential?: unknown;
    IdentityCredential?: unknown;
  };
  if (!w.DigitalCredential && !w.IdentityCredential) {
    return {
      state: "unsupported",
      reason: "this browser has no Digital Credentials API (need Chrome 141+ or Safari 26+)",
    };
  }
  return { state: "supported" };
}

export type PreparedCredentialRequest = {
  /** Opaque handle for completing the request with the same key custody. */
  handle: string;
  /** Pass to navigator.credentials.get(...). */
  navigatorArgument: OrgIsoMdocNavigatorArgument;
};

export type PresentationContext = {
  origin: string;
  /** DeviceResponse bytes, for audit or debugging. */
  deviceResponseHex?: string;
};

/**
 * The result of opening a wallet response. Two shapes, because there are two
 * reasons to hold keys on a server:
 *
 * - `smartResponse` — the server opened and verified it and hands the data
 *   back, so the page can still prefill forms. Key custody and an audit
 *   point, without giving up the in-page workflow.
 * - `handledByServer` — the server keeps the data; the page learns only that
 *   it succeeded. For deployments where the page must not hold PHI. In-page
 *   prefill is not possible in this mode, by construction.
 */
export type CredentialCompletion =
  | {
      /** Opened and wire-verified; the caller still cross-checks it against the request. */
      smartResponse: SmartCheckinResponse;
      presentation: PresentationContext;
      handledByServer?: false;
    }
  | {
      handledByServer: true;
      /** Optional server-side handle for what it stored (an encounter id, a queue entry). */
      reference?: string;
      presentation?: PresentationContext;
    };

/**
 * The key-custody seam.
 *
 * browser-local — the default — generates an ephemeral, single-use HPKE key
 * in the page. That is the intended arrangement: the page must be able to
 * read the response for prefill workflows, and keeping the client
 * browser-only means no per-language server SDK has to exist.
 *
 * A server-owned implementation keeps the key behind two HTTP calls for
 * deployments that specifically don't want the page to hold the response.
 */
export type KeyCustody = {
  kind: string;
  prepareCredentialRequest(input: { request: SmartCheckinRequest }): Promise<PreparedCredentialRequest>;
  completeCredentialRequest(input: { handle: string; credential: unknown }): Promise<CredentialCompletion>;
};

type BrowserLocalSession = {
  bundle: OrgIsoMdocRequestBundle;
  request: SmartCheckinRequest;
  origin: string;
};

/** Ephemeral, single-use verifier key held in the page. The default. */
export function createBrowserKeyCustody(options: { origin?: string } = {}): KeyCustody {
  const origin =
    options.origin ??
    (typeof location !== "undefined" ? location.origin : undefined);
  if (!origin) throw new Error("browser key custody needs an origin");
  const sessions = new Map<string, BrowserLocalSession>();
  let counter = 0;

  return {
    kind: "browser-local",

    async prepareCredentialRequest({ request }) {
      const bundle = await buildOrgIsoMdocRequest(request, { origin });
      const handle = `local-${++counter}-${crypto.randomUUID()}`;
      sessions.set(handle, { bundle, request, origin });
      return { handle, navigatorArgument: bundle.navigatorArgument };
    },

    async completeCredentialRequest({ handle, credential }) {
      const session = sessions.get(handle);
      if (!session) throw new Error(`unknown credential request handle ${handle}`);
      sessions.delete(handle);
      if (!session.bundle.sessionTranscriptBytes) {
        throw new Error("missing session transcript (origin was not set at prepare time)");
      }
      const opened = await openWalletResponse({
        response: extractDcapiResponse(credential),
        recipientPrivateKey: session.bundle.verifierKeyPair.privateKey,
        recipientPublicJwk: session.bundle.verifierPublicJwk,
        sessionTranscript: session.bundle.sessionTranscriptBytes,
        smartRequest: session.request,
      });
      if (!opened.smartResponseValidation) {
        throw new Error("wallet response did not contain a validated SMART response");
      }
      return {
        smartResponse: opened.smartResponseValidation.value,
        presentation: {
          origin: session.origin,
          deviceResponseHex: opened.deviceResponse.deviceResponseHex,
        },
      };
    },
  };
}

/**
 * HTTP client for server-held keys. Two calls, JSON both ways:
 *
 *   POST {base}/credential-requests
 *     → { "request": SmartCheckinRequest }
 *     ← { "handle": string, "navigatorArgument": {...} }
 *
 *   POST {base}/credential-requests/{handle}/complete
 *     → { "credential": <what navigator.credentials.get returned> }
 *     ← { "smartResponse": {...}, "presentation": {...} }
 *       or { "handledByServer": true, "reference"?: string }
 *
 * Requests carry the page's credentials (`credentials: "include"`), so the
 * server can bind a check-in to the authenticated session. The full contract,
 * including what the server must store and verify, is in
 * docs/server-authority.md.
 */
export function createServerKeyCustody(baseUrl: string): KeyCustody {
  const base = baseUrl.replace(/\/$/, "");
  return {
    kind: "server-owned",

    async prepareCredentialRequest({ request }) {
      const res = await fetch(`${base}/credential-requests`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ request }),
      });
      if (!res.ok) throw new Error(`prepare failed: HTTP ${res.status}`);
      return (await res.json()) as PreparedCredentialRequest;
    },

    async completeCredentialRequest({ handle, credential }) {
      const res = await fetch(`${base}/credential-requests/${encodeURIComponent(handle)}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) throw new Error(`complete failed: HTTP ${res.status}`);
      return (await res.json()) as CredentialCompletion;
    },
  };
}

/**
 * Pull the org-iso-mdoc response payload out of whatever the browser's
 * credential object looks like: a DigitalCredential with `.data` (object or
 * JSON string), a bare `{protocol, data}` object, or the raw base64url
 * response string.
 */
export function extractDcapiResponse(credential: unknown): string | DcapiMdocResponse {
  if (typeof credential === "string") return credential;
  if (credential && typeof credential === "object") {
    const c = credential as { data?: unknown; protocol?: unknown };
    if (typeof c.data === "string") {
      try {
        const parsed = JSON.parse(c.data) as { response?: unknown };
        if (typeof parsed.response === "string") {
          return { protocol: "org-iso-mdoc", data: { response: parsed.response } };
        }
      } catch {
        return c.data; // raw base64url string
      }
    }
    if (c.data && typeof c.data === "object") {
      const data = c.data as { response?: unknown };
      if (typeof data.response === "string") {
        return { protocol: "org-iso-mdoc", data: { response: data.response } };
      }
    }
    const direct = credential as { data?: { response?: unknown } };
    if (typeof direct.data?.response === "string") {
      return { protocol: "org-iso-mdoc", data: { response: direct.data.response } };
    }
  }
  throw new Error("could not extract an org-iso-mdoc response from the credential object");
}

/** Re-exported for callers that inspect raw wallet responses. */
export type { DcapiMdocResponse } from "../wire/response.js";
