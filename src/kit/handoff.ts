/**
 * Hand a check-in off to the patient's own phone.
 *
 * A kiosk, a front-desk screen, or a provider app has no wallet of its own.
 * So it mints the request here — and therefore holds the key the response is
 * sealed to — and shows a QR code. The phone opens a small hand-off page,
 * runs `navigator.credentials.get` with exactly the argument this page built,
 * and sends back what the wallet returned, still sealed. Only this page can
 * open it; the hand-off page and the mailbox between them see ciphertext.
 *
 * The mailbox is yours to provide: anything both devices can reach — a
 * realtime database, a WebSocket relay, your own API. Two records per
 * session, both public material: the navigator argument going out and the
 * sealed credential coming back.
 */

import { createBrowserLocalAuthority } from "../browser/index.js";
import type { SmartCheckinRequest } from "../model/index.js";
import { parseWalletRequest } from "./mock-wallet.js";
import { isDecline, WalletDeclinedError } from "../core/errors.js";
import { customWallet, platformWallet, type Wallet } from "../core/wallets.js";

/** What the kiosk posts for the phone to pick up. */
export type HandoffEnvelope = {
  v: 1;
  /** Passed verbatim to navigator.credentials.get on the phone. */
  navigatorArgument: unknown;
  /** The hand-off page's origin — the one the kiosk computed the session transcript for. */
  handoffOrigin: string;
  createdAt: string;
  expiresAt: string;
};

/** What the phone posts back: the wallet's credential, or a decline. */
export type HandoffAnswer =
  | { credential: { protocol: string; data: unknown } }
  | { declined: true; reason?: string };

export type HandoffMailbox = {
  /** Kiosk → phone. */
  post(sessionId: string, envelope: HandoffEnvelope): Promise<void>;
  /** Phone ← kiosk. Rejects if there is no such session. */
  fetch(sessionId: string): Promise<HandoffEnvelope>;
  /** Phone → kiosk. */
  answer(sessionId: string, answer: HandoffAnswer): Promise<void>;
  /** Kiosk ← phone. Resolves with the first answer; rejects on abort. */
  waitForAnswer(sessionId: string, options?: { signal?: AbortSignal }): Promise<HandoffAnswer>;
};

export type HandoffOptions = {
  mailbox: HandoffMailbox;
  /** The hand-off page the phone will open; the session id goes in its fragment. */
  handoffUrl: string;
  /** Called once the request is posted: show `url` as a QR code. */
  onWaiting?: (handoff: { url: string; sessionId: string }) => void;
  /** Default: random. */
  sessionId?: string;
  /** How long the phone may take to pick the request up. Default ten minutes. */
  ttlMs?: number;
  signal?: AbortSignal;
};

const here = (): string => (typeof location !== "undefined" ? location.href : "http://localhost/");

/** The URL the QR code carries. */
export function handoffUrlFor(handoffUrl: string, sessionId: string): string {
  const url = new URL(handoffUrl, here());
  url.hash = `session=${encodeURIComponent(sessionId)}`;
  return url.href;
}

/** The session id from a hand-off page's location hash, or null. */
export function sessionIdFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, "")).get("session");
}

function randomSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * The `getCredential` for a kiosk: posts the request, shows the QR, waits.
 * Pair it with an authority built for the hand-off page's origin — or use
 * `createHandoff`, which does both.
 */
export function createHandoffCredentialGetter(
  options: HandoffOptions,
): (navigatorArgument: unknown) => Promise<unknown> {
  return async (navigatorArgument) => {
    const sessionId = options.sessionId ?? randomSessionId();
    const now = Date.now();
    await options.mailbox.post(sessionId, {
      v: 1,
      navigatorArgument,
      handoffOrigin: new URL(options.handoffUrl, here()).origin,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + (options.ttlMs ?? 10 * 60_000)).toISOString(),
    });
    options.onWaiting?.({ url: handoffUrlFor(options.handoffUrl, sessionId), sessionId });
    const answer = await options.mailbox.waitForAnswer(sessionId, { signal: options.signal });
    if ("declined" in answer) throw new WalletDeclinedError(answer.reason ?? "declined on the phone");
    return answer.credential;
  };
}

/** Phone side, step one: pick the request up and recover what it asks for, to show the person. */
export async function fetchHandoff(
  mailbox: HandoffMailbox,
  sessionId: string,
): Promise<{ envelope: HandoffEnvelope; request: SmartCheckinRequest }> {
  const envelope = await mailbox.fetch(sessionId);
  if (Date.parse(envelope.expiresAt) < Date.now()) throw new Error("this hand-off has expired — start again at the kiosk");
  return { envelope, request: parseWalletRequest(envelope.navigatorArgument).smartRequest };
}

/**
 * Phone side, step two: ask the wallet and send back what it returned.
 * `getCredential` defaults to the browser's own navigator.credentials.get;
 * pass a web-wallet or mock getter to answer without a platform wallet. A
 * decline is reported to the kiosk as a decline, not as silence.
 */
export async function answerHandoff(
  mailbox: HandoffMailbox,
  sessionId: string,
  envelope: HandoffEnvelope,
  wallet: Wallet = platformWallet(),
): Promise<HandoffAnswer> {
  // Opened before the first await, so a web wallet's tab opens inside the click.
  const session = wallet.open();
  let answer: HandoffAnswer;
  try {
    const credential = (await session.getCredential(envelope.navigatorArgument)) as
      | { protocol?: unknown; data?: unknown }
      | null
      | undefined;
    answer =
      credential && typeof credential === "object"
        ? { credential: { protocol: String(credential.protocol ?? "org-iso-mdoc"), data: credential.data } }
        : { declined: true };
  } catch (e) {
    const err = e as { message?: string };
    if (isDecline(e)) {
      answer = { declined: true, ...(err.message ? { reason: err.message } : {}) };
    } else {
      throw e;
    }
  }
  await mailbox.answer(sessionId, answer);
  return answer;
}

/**
 * A kiosk's "use your phone" option as a wallet: posts the request to the
 * mailbox, calls `onWaiting` with the URL to show as a QR code, and waits for
 * the phone's answer.
 */
export function handoffWallet(options: Omit<HandoffOptions, "signal"> & { name?: string; description?: string }): Wallet {
  return customWallet({
    id: "handoff",
    kind: "handoff",
    name: options.name ?? "Use your phone",
    description: options.description ?? "Scan a code with your phone and answer there",
    keys: createBrowserLocalAuthority({ origin: new URL(options.handoffUrl, here()).origin }),
    open() {
      const controller = new AbortController();
      return { getCredential: createHandoffCredentialGetter({ ...options, signal: controller.signal }), cancel: () => controller.abort() };
    },
  });
}
