/**
 * Web-wallet credential getter: a drop-in replacement for
 * `navigator.credentials.get` that hands the request to a wallet **web app**
 * in another tab (or a popup) over postMessage, and waits for the sealed
 * response.
 *
 * This exists so the whole flow — including a real consent screen where the
 * person chooses what to share — can be demonstrated on any browser, with no
 * platform wallet and no phone. The wire format is identical to the platform
 * Digital Credentials API path; only the credential getter differs.
 *
 * Message types match the web-wallet sketch in the spec prototype so the two
 * implementations stay compatible.
 */

import { CheckinError, WalletDeclinedError } from "../core/errors.js";

export const WEB_WALLET_REQUEST_MESSAGE_TYPE = "digital-credentials/web-wallet/request" as const;
export const WEB_WALLET_RESPONSE_MESSAGE_TYPE = "digital-credentials/web-wallet/response" as const;
export const WEB_WALLET_READY_MESSAGE_TYPE = "digital-credentials/web-wallet/ready" as const;

export type WebWalletCredential = { protocol: string; data: object };

export type WebWalletResponseMessage =
  | { type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE; requestId?: string; outcome: "approved"; credential: WebWalletCredential }
  | { type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE; requestId?: string; outcome: "declined" | "closed" }
  | { type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE; requestId?: string; outcome: "error"; message: string };

export type WebWalletOptions = {
  /**
   * URL of the wallet web app (same-origin or any origin you trust). Usually
   * comes from a registry entry — see `wallets()`.
   */
  walletUrl: string;
  /**
   * How to open the wallet. "tab" (default) opens a normal browser tab, which
   * behaves better on mobile and in browsers that resist popups; "popup"
   * opens a small window. Ignored if `features` is set.
   */
  target?: "tab" | "popup";
  /** Explicit window.open features string; implies a popup. */
  features?: string;
  /** Give up after this many ms (default 5 minutes). */
  timeoutMs?: number;
  /**
   * A window you already opened at `walletUrl` (or `about:blank`) inside the
   * person's click. Browsers only allow `window.open` during a click, and
   * building a request can take long enough to lose that permission; opening
   * first and passing the window here avoids a blocked tab. See `openWebWallet`.
   */
  window?: Window | null;
};

/**
 * Open a web wallet's tab right away, inside a click handler, before any
 * `await`. Pass the result as `window` to `createWebWalletCredentialGetter`.
 */
export function openWebWallet(options: Pick<WebWalletOptions, "walletUrl" | "target" | "features">): Window | null {
  const features = options.features ?? (options.target === "popup" ? "popup,width=460,height=720" : "");
  const url = new URL(options.walletUrl, location.href);
  const opened = window.open(url.href, "smart-checkin-wallet", features);
  if (opened) watchForReady(opened, url.origin);
  return opened;
}

// Wallets opened early may say "ready" before the request exists; remember it.
const readyWindows = new WeakSet<Window>();
function watchForReady(win: Window, origin: string): void {
  const onMessage = (event: MessageEvent): void => {
    if (event.source !== win || event.origin !== origin) return;
    if ((event.data as { type?: string } | null)?.type !== WEB_WALLET_READY_MESSAGE_TYPE) return;
    readyWindows.add(win);
    window.removeEventListener("message", onMessage);
  };
  window.addEventListener("message", onMessage);
  setTimeout(() => window.removeEventListener("message", onMessage), 10 * 60_000);
}

export function createWebWalletCredentialGetter(options: WebWalletOptions) {
  const timeoutMs = options.timeoutMs ?? 5 * 60_000;
  // An empty features string makes window.open use a tab.
  const features =
    options.features ?? (options.target === "popup" ? "popup,width=460,height=720" : "");

  return async (navigatorArgument: unknown): Promise<unknown> => {
    const walletUrl = new URL(options.walletUrl, location.href);
    const walletOrigin = walletUrl.origin;
    const popup = options.window && !options.window.closed ? options.window : window.open(walletUrl.href, "smart-checkin-wallet", features);
    if (!popup) {
      throw new CheckinError("blocked", "the browser blocked the wallet's tab; allow pop-ups for this site and try again");
    }

    const requestId = crypto.randomUUID();
    let settled = false;

    try {
      return await new Promise<unknown>((resolve, reject) => {
        const finish = (fn: () => void): void => {
          if (settled) return;
          settled = true;
          window.removeEventListener("message", onMessage);
          clearInterval(closedPoll);
          clearTimeout(timer);
          fn();
        };

        let sent = false;
        const sendRequest = (): void => {
          if (sent) return;
          sent = true;
          popup.postMessage(
            {
              type: WEB_WALLET_REQUEST_MESSAGE_TYPE,
              credentialRequestOptions: navigatorArgument,
              requestId,
              // No origin field: the wallet reads this page's origin from the
              // message event, which the browser sets and the sender cannot forge.
            },
            walletOrigin,
          );
        };

        const onMessage = (event: MessageEvent): void => {
          if (event.source !== popup || event.origin !== walletOrigin) return;
          const data = event.data as { type?: string } | null;
          if (!data || typeof data !== "object") return;

          if (data.type === WEB_WALLET_READY_MESSAGE_TYPE) {
            sendRequest();
            return;
          }

          if (data.type !== WEB_WALLET_RESPONSE_MESSAGE_TYPE) return;
          const message = data as WebWalletResponseMessage;
          if (message.requestId && message.requestId !== requestId) return;

          if (message.outcome === "approved") {
            finish(() => resolve(message.credential));
          } else if (message.outcome === "error") {
            finish(() => reject(new CheckinError("wallet-error", message.message ?? "the wallet reported an error")));
          } else {
            finish(() => reject(new WalletDeclinedError()));
          }
          popup.close();
        };

        const closedPoll = setInterval(() => {
          if (popup.closed) finish(() => reject(new WalletDeclinedError("the wallet tab was closed")));
        }, 400);

        const timer = setTimeout(() => {
          popup.close();
          finish(() => reject(new CheckinError("timeout", "the wallet didn't answer in time")));
        }, timeoutMs);

        window.addEventListener("message", onMessage);
        // Opened early by openWebWallet and already ready: send now.
        if (readyWindows.has(popup)) sendRequest();
      });
    } finally {
      if (!popup.closed) popup.close();
    }
  };
}
