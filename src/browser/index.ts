/**
 * browser — the thin DOM layer: Digital Credentials API support detection,
 * the navigator.credentials.get call, and the key-custody seam
 * (KeyCustody). Everything below this layer is DOM-free.
 */

import type { SmartCheckinRequest, SmartCheckinResponse } from "../model/index.js";
import { CheckinError } from "../core/errors.js";
import {
  buildOrgIsoMdocRequest,
  checkDeviceResponse,
  JsonSyntaxError,
  openWalletCredential,
  parseJsonStrict,
  type CheckinWarning,
  type DcapiMdocResponse,
  type OrgIsoMdocNavigatorArgument,
  type OrgIsoMdocRequestBundle,
} from "../wire/index.js";

/** Whether this browser has the Digital Credentials API; when not, `reason` says why. */
export type DcApiSupport =
  | { state: "supported" }
  | { state: "unsupported"; reason: string };

/** Whether this browser can reach the phone's own wallet through the Digital Credentials API. `platformWallet()` uses it for `available`. */
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
      /** Opened and wire-checked; the caller still cross-checks it against the request. */
      smartResponse: SmartCheckinResponse;
      presentation: PresentationContext;
      /** Transport and signature findings that didn't stop the check-in (spec §2, [RCV-1]). */
      warnings?: CheckinWarning[];
      handledByServer?: false;
    }
  | {
      handledByServer: true;
      /** Optional server-side handle for what it stored (an encounter id, a queue entry). */
      reference?: string;
      presentation?: PresentationContext;
    };

/**
 * Where the key that opens a wallet's response lives: the `keys` option of
 * `runCheckin`. The default, `"browser"`, makes a single-use key in the page
 * for each check-in. `{ server: "/checkin-api" }` keeps it on your server,
 * behind the two calls below (the "Going to production" guide explains when
 * that's worth it). To call a different API, or to send a bearer token instead
 * of the page's cookies, implement this type yourself.
 *
 * #### The server's two calls
 *
 * Both are `POST` with JSON bodies, sent with the page's cookies
 * (`credentials: "include"`). Nothing between the page and the wallet
 * changes.
 *
 * **Prepare:** `POST {server}/credential-requests` with `{ "request": SmartCheckinRequest }`.
 * The server:
 *
 * - decides what to ask for. It may build its own request and ignore the
 *   page's, so a compromised page can't widen what is asked;
 * - builds the wire request with a fresh key, using
 *   `buildOrgIsoMdocRequest(request, { origin })` from `/wire` or the same
 *   steps in its own language, with the page's origin taken from its own
 *   configuration, never from the request body;
 * - stores the key, the request, the origin, the user's session, and an
 *   expiry under a handle of at least 128 random bits;
 * - replies `{ "handle": string, "navigatorArgument": {...} }`.
 *
 * Rate-limit this call: each one makes a key and a record.
 *
 * **Complete:** `POST {server}/credential-requests/{handle}/complete` with
 * `{ "credential": <what the wallet returned> }`. The server:
 *
 * - rejects a handle that is unknown, expired, already used, or from another
 *   session;
 * - opens and checks the credential with `openWalletCredential` and then
 *   `checkDeviceResponse` from `/wire`, keeping their `warnings`;
 * - checks the SMART response against the request it stored, with
 *   `validateResponseAgainstRequest` from `/model`, never against anything
 *   the page sent;
 * - deletes the key;
 * - replies with a `CredentialCompletion`: `{ smartResponse, presentation, warnings }`
 *   to hand the data to the page, or `{ "handledByServer": true, "reference"?: string }`
 *   to keep it, in which case `runCheckin` resolves with status `"kept-on-server"`.
 *
 * Any HTTP error from either call ends the check-in as failed with code
 * `server`. For a server in another language, the spec's conformance
 * fixtures include a real capture with a published test key.
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
      // Spec §8.5: fail only where a step says so; everything else is a warning.
      const opened = await openWalletCredential({
        credential: extractDcapiResponse(credential),
        recipientPrivateKey: session.bundle.verifierKeyPair.privateKey,
        recipientPublicJwk: session.bundle.verifierPublicJwk,
        sessionTranscript: session.bundle.sessionTranscriptBytes,
      });
      if (!opened.ok) throw new CheckinError("invalid-response", opened.error, { check: opened.rule });
      const checked = await checkDeviceResponse({
        deviceResponseBytes: opened.deviceResponseBytes,
        sessionTranscript: session.bundle.sessionTranscriptBytes,
      });
      if (!checked.ok) throw new CheckinError("invalid-response", checked.error, { check: checked.rule });
      let smartResponse: SmartCheckinResponse;
      try {
        smartResponse = parseJsonStrict(checked.smartResponseText) as SmartCheckinResponse;
      } catch (e) {
        if (e instanceof JsonSyntaxError) throw new CheckinError("invalid-response", `the SMART response is not valid JSON: ${e.message}`, { check: "JSON-2" });
        throw e;
      }
      return {
        smartResponse,
        presentation: { origin: session.origin },
        warnings: [...opened.warnings, ...checked.warnings],
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
 * server can bind a check-in to the authenticated session. `KeyCustody`
 * describes what the server must store and check.
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
    // Keep the protocol as the wallet reported it; the Verifier warns if it differs ([VRS-2]).
    const protocol = (typeof c.protocol === "string" ? c.protocol : "org-iso-mdoc") as DcapiMdocResponse["protocol"];
    if (typeof c.data === "string") {
      try {
        const parsed = JSON.parse(c.data) as { response?: unknown };
        if (typeof parsed.response === "string") return { protocol, data: { response: parsed.response } };
      } catch {
        return c.data; // raw base64url string
      }
    }
    if (c.data && typeof c.data === "object") {
      const data = c.data as { response?: unknown };
      if (typeof data.response === "string") return { protocol, data: { response: data.response } };
    }
  }
  throw new Error("could not extract an org-iso-mdoc response from the credential object");
}

/** Re-exported for callers that inspect raw wallet responses. */
export type { DcapiMdocResponse } from "../wire/response.js";
