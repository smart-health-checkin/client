/**
 * Web-wallet credential getter: a drop-in replacement for
 * `navigator.credentials.get` that hands the request to a wallet **web app**
 * in another tab (or a popup) over postMessage, and waits for the sealed
 * response.
 *
 * This exists so the whole flow — including a real consent screen where the
 * person chooses what to share — can be demonstrated on any browser, with no
 * platform wallet and no phone. The wire format is identical to the platform
 * Digital Credentials API path; only the mediator differs.
 *
 * Message types match the web-wallet sketch in the spec prototype so the two
 * implementations stay compatible.
 */

export const WEB_WALLET_REQUEST_MESSAGE_TYPE = "digital-credentials/web-wallet/request" as const;
export const WEB_WALLET_RESPONSE_MESSAGE_TYPE = "digital-credentials/web-wallet/response" as const;
export const WEB_WALLET_READY_MESSAGE_TYPE = "digital-credentials/web-wallet/ready" as const;

export type WebWalletCredential = { protocol: string; data: object };

export type WebWalletResponseMessage =
  | { type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE; requestId?: string; outcome: "approved"; credential: WebWalletCredential }
  | { type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE; requestId?: string; outcome: "declined" | "closed" }
  | { type: typeof WEB_WALLET_RESPONSE_MESSAGE_TYPE; requestId?: string; outcome: "error"; message: string };

export type WebWalletOptions = {
  /** URL of the wallet web app (same-origin or any origin you trust). */
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
};

/** Thrown when the person closes or declines in the wallet app. */
export class WalletDeclinedError extends Error {
  readonly name = "NotAllowedError";
  constructor(message = "the request was declined in the wallet") {
    super(message);
  }
}

export function createWebWalletCredentialGetter(options: WebWalletOptions) {
  const timeoutMs = options.timeoutMs ?? 5 * 60_000;
  // An empty features string makes window.open use a tab.
  const features =
    options.features ?? (options.target === "popup" ? "popup,width=460,height=720" : "");

  return async (navigatorArgument: unknown): Promise<unknown> => {
    const walletUrl = new URL(options.walletUrl, location.href);
    const walletOrigin = walletUrl.origin;
    const popup = window.open(walletUrl.href, "smart-checkin-wallet", features);
    if (!popup) {
      throw new Error("the wallet tab was blocked — allow pop-ups for this site and try again");
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

        const onMessage = (event: MessageEvent): void => {
          if (event.origin !== walletOrigin) return;
          const data = event.data as { type?: string } | null;
          if (!data || typeof data !== "object") return;

          if (data.type === WEB_WALLET_READY_MESSAGE_TYPE) {
            popup.postMessage(
              {
                type: WEB_WALLET_REQUEST_MESSAGE_TYPE,
                credentialRequestOptions: navigatorArgument,
                requestId,
                // The wallet must bind its SessionTranscript to the verifier's
                // origin, which it cannot observe from inside the popup.
                verifierOrigin: location.origin,
              },
              walletOrigin,
            );
            return;
          }

          if (data.type !== WEB_WALLET_RESPONSE_MESSAGE_TYPE) return;
          const message = data as WebWalletResponseMessage;
          if (message.requestId && message.requestId !== requestId) return;

          if (message.outcome === "approved") {
            finish(() => resolve(message.credential));
          } else if (message.outcome === "error") {
            finish(() => reject(new Error(`wallet error: ${message.message}`)));
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
          finish(() => reject(new Error("timed out waiting for the wallet")));
        }, timeoutMs);

        window.addEventListener("message", onMessage);
      });
    } finally {
      if (!popup.closed) popup.close();
    }
  };
}
