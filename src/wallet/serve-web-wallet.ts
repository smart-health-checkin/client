/**
 * The web wallet's side of the hand-off (docs: web-wallet hand-off).
 *
 *   serveWebWallet({
 *     async onRequest({ request, origin }) {
 *       const answer = await askThePatient(request, origin);
 *       return { response: answer };           // the library seals and replies
 *     },
 *   });
 *
 * It posts `ready` to the opener, accepts one request from the opener only,
 * takes the EHR's origin from the browser (never from the message), and
 * replies to that origin with the same requestId.
 */

import type { SmartCheckinRequest, SmartCheckinResponse } from "../model/index.js";
import { parseWalletRequest, sealWalletResponse, type ParsedWalletRequest } from "./seal.js";
import {
  WEB_WALLET_READY_MESSAGE_TYPE,
  WEB_WALLET_REQUEST_MESSAGE_TYPE,
  WEB_WALLET_RESPONSE_MESSAGE_TYPE,
} from "../kit/web-wallet.js";

export type WebWalletRequestContext = {
  /** The SMART request, validated. */
  request: SmartCheckinRequest;
  /** Items this library can't process; answer each `unsupported`. */
  unsupportedItems: ParsedWalletRequest["unsupportedItems"];
  /** The EHR page's origin, from the browser. Show it to the patient; the response is bound to it. */
  origin: string;
  /** The parsed wire request, for wallets that seal their own responses. */
  parsed: ParsedWalletRequest;
};

/** What the wallet answers with. */
export type WebWalletAnswer =
  /**
   * Seal this response for the EHR and send it. It is checked against the
   * request first, and a mismatch becomes an error reply. If the patient
   * reviewed the request and declined everything, send `declineAll(request)`.
   */
  | { response: SmartCheckinResponse }
  /** Send a credential you sealed yourself (for example, to inject faults when testing). */
  | { credential: { protocol: string; data: { response: string } } }
  /** The patient closed the wallet without reviewing the request ([HOLD-4]). */
  | { declined: true }
  /** Something went wrong; the EHR sees the message. */
  | { error: string };

export type ServeWebWalletOptions = {
  onRequest(context: WebWalletRequestContext): Promise<WebWalletAnswer>;
  /** Called when a request can't be read; the EHR also gets an error reply. */
  onInvalidRequest?(message: string, origin: string): void;
  /** Close the tab after replying (default true). */
  closeAfterReply?: boolean;
};

/**
 * Start answering. Returns `{ opened }`: false when the page wasn't opened by
 * an EHR (no `window.opener`), so the wallet can show its own landing page.
 */
export function serveWebWallet(options: ServeWebWalletOptions): { opened: boolean; stop(): void } {
  let handled = false;
  const onMessage = async (event: MessageEvent) => {
    const data = event.data as { type?: string; requestId?: string; credentialRequestOptions?: unknown } | null;
    if (!data || data.type !== WEB_WALLET_REQUEST_MESSAGE_TYPE) return;
    // Only the page that opened this wallet, and never an opaque origin we can't reply to.
    if (event.source !== window.opener || event.origin === "null" || handled) return;
    handled = true;
    const ehr = event.source as Window;
    const origin = event.origin;
    const reply = (message: Record<string, unknown>) => {
      ehr.postMessage({ type: WEB_WALLET_RESPONSE_MESSAGE_TYPE, requestId: data.requestId, ...message }, origin);
      if (options.closeAfterReply !== false) setTimeout(() => window.close(), 100);
    };

    let parsed: ParsedWalletRequest;
    try {
      parsed = parseWalletRequest(data.credentialRequestOptions);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      options.onInvalidRequest?.(message, origin);
      reply({ outcome: "error", message: `could not read the request: ${message}` });
      return;
    }

    try {
      const answer = await options.onRequest({ request: parsed.smartRequest, unsupportedItems: parsed.unsupportedItems, origin, parsed });
      if ("declined" in answer) reply({ outcome: "declined" });
      else if ("error" in answer) reply({ outcome: "error", message: answer.error });
      else {
        const credential =
          "credential" in answer
            ? answer.credential
            : await sealWalletResponse({
                smartResponse: answer.response,
                encryptionInfoBytes: parsed.encryptionInfoBytes,
                verifierOrigin: origin,
                request: parsed.smartRequest,
              });
        reply({ outcome: "approved", credential });
      }
    } catch (e) {
      reply({ outcome: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  window.addEventListener("message", onMessage);
  const opened = !!window.opener;
  if (opened) (window.opener as Window).postMessage({ type: WEB_WALLET_READY_MESSAGE_TYPE }, "*");
  return { opened, stop: () => window.removeEventListener("message", onMessage) };
}
