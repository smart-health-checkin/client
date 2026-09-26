/**
 * Picker logic without UI.
 *
 * `resolveResponders` says who can answer in this browser. This module turns
 * that list into what a picker shows, and starts the chosen one correctly:
 *
 * - `arrangeResponders` groups and orders the options: the platform wallet
 *   leads when this browser can reach one, unavailable options are hidden,
 *   web wallets follow in registry order, and a long list is split into the
 *   first few and "more".
 * - `startResponder` must be called synchronously inside the click. It opens
 *   a web wallet's tab right away (browsers block tabs opened later) and
 *   returns the credential getter to hand to `requestCheckin`.
 * - `rememberChoice` / `recallChoice` keep the last choice per site, off
 *   unless the page asks for it.
 *
 * `<smart-checkin-picker>` (from `@smart-health-checkin/client/ui`) is built
 * on these; use them directly to draw your own picker.
 */

import type { Responder } from "../kit/responders.js";
import { credentialGetterFor } from "../kit/responders.js";
import { createWebWalletCredentialGetter, openWebWallet } from "../kit/web-wallet.js";

export type ArrangeOptions = {
  /** Show every web wallet inline up to this many (default 5). */
  inlineMax?: number;
  /** Past `inlineMax`, show this many inline and the rest under "more" (default 4). */
  inlineShown?: number;
  /** Keep unavailable responders instead of hiding them (for debugging). */
  includeUnavailable?: boolean;
  /** A responder id to lead with, e.g. from `recallChoice`. */
  preferred?: string;
};

export type ArrangedResponders = {
  /** The one to present as the main action; undefined when nothing is available. */
  primary?: Responder;
  /** Web wallets (and the mock) shown under the primary action. */
  inline: Responder[];
  /** Web wallets behind "more", for long registries. Empty when everything fits. */
  more: Responder[];
  /** Every shown responder, in display order. */
  all: Responder[];
  /** The remembered responder when `preferred` matched an available one. */
  remembered?: Responder;
};

/**
 * Group and order responders for display.
 *
 * The primary action is the remembered choice if there is one, else the
 * platform wallet when available, else the only option when there is exactly
 * one. Everything else is listed in the order given.
 */
export function arrangeResponders(responders: Responder[], options: ArrangeOptions = {}): ArrangedResponders {
  const inlineMax = options.inlineMax ?? 5;
  const inlineShown = Math.min(options.inlineShown ?? 4, inlineMax);
  const shown = options.includeUnavailable ? responders : responders.filter((r) => r.available);
  const remembered = options.preferred ? shown.find((r) => r.id === options.preferred) : undefined;
  const platform = shown.find((r) => r.kind === "platform");
  const primary = remembered ?? platform ?? (shown.length === 1 ? shown[0] : undefined);
  const listed = shown.filter((r) => r !== primary);
  const inline = listed.length > inlineMax ? listed.slice(0, inlineShown) : listed;
  const more = listed.length > inlineMax ? listed.slice(inlineShown) : [];
  return {
    ...(primary ? { primary } : {}),
    inline,
    more,
    all: [...(primary ? [primary] : []), ...listed],
    ...(remembered ? { remembered } : {}),
  };
}

export type StartedResponder = {
  /** Pass to `requestCheckin` / `runCheckin` as `getCredential`; undefined means the platform default. */
  getCredential?: (navigatorArgument: unknown) => Promise<unknown>;
  /** Close a web wallet's tab; the pending check-in then ends as declined. No-op for the platform wallet. */
  cancel(): void;
};

/**
 * Start a responder. Call this synchronously in the click handler, before any
 * `await`: for a web wallet it opens the tab now, while the browser still
 * allows it, and returns a getter that talks to that tab. For the platform
 * wallet `getCredential` is undefined (the flow uses `navigator.credentials.get`).
 */
export function startResponder(responder: Responder, options: { origin?: string } = {}): StartedResponder {
  if (responder.kind === "web" && responder.wallet) {
    const target = responder.wallet.target ? { target: responder.wallet.target } : {};
    const opened = openWebWallet({ walletUrl: responder.wallet.walletUrl, ...target });
    return {
      getCredential: createWebWalletCredentialGetter({ walletUrl: responder.wallet.walletUrl, ...target, window: opened }),
      cancel: () => opened?.close(),
    };
  }
  const getCredential = credentialGetterFor(responder, options);
  return { ...(getCredential ? { getCredential } : {}), cancel: () => {} };
}

const STORAGE_KEY = "smart-health-checkin:last-responder";

/** Remember the responder the person used, in this browser, for this site. */
export function rememberChoice(responderId: string, key = STORAGE_KEY): void {
  try {
    localStorage.setItem(key, responderId);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); remembering is optional.
  }
}

/** The responder id remembered for this site, if any. */
export function recallChoice(key = STORAGE_KEY): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Forget the remembered responder. */
export function forgetChoice(key = STORAGE_KEY): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // nothing to forget
  }
}

/** A letter and a stable color for a wallet with no icon. */
export function monogram(name: string): { letter: string; color: string } {
  const palette = ["#6E4FA2", "#0E6FB8", "#1A8C76", "#B85C17", "#B5345C", "#3B6E8F"];
  const sum = [...name].reduce((acc, ch) => acc + (ch.codePointAt(0) ?? 0), 0);
  const letter = [...name.trim()][0]?.toUpperCase() ?? "?";
  return { letter, color: palette[sum % palette.length]! };
}
