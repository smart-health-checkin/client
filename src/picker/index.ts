/**
 * Picker logic without UI, for pages drawing their own picker.
 *
 * - `arrangeWallets` groups and orders what `wallets()` returned: the phone's
 *   wallet leads when this browser can reach it, unavailable wallets are
 *   hidden, web wallets follow in registry order, and a long list is split
 *   into the first few and "more".
 * - `rememberChoice` / `recallChoice` keep the last choice per site, off
 *   unless the page asks for it.
 * - `monogram` gives a letter tile for a wallet without an icon.
 *
 * Start the chosen wallet with `wallet.start(request)` inside the click.
 * `<smart-checkin-picker>` (from `@smart-health-checkin/client/ui`) is built on these.
 */

import type { Wallet } from "../core/wallets.js";

export type ArrangeOptions = {
  /** Show every web wallet inline up to this many (default 5). */
  inlineMax?: number;
  /** Past `inlineMax`, show this many inline and the rest under "more" (default 4). */
  inlineShown?: number;
  /** Keep unavailable wallets instead of hiding them (for debugging). */
  includeUnavailable?: boolean;
  /** A wallet id to lead with, e.g. from `recallChoice`. */
  preferred?: string;
};

export type ArrangedWallets = {
  /** The one to present as the main action; undefined when nothing is available. */
  primary?: Wallet;
  /** Wallets listed under the main action. */
  inline: Wallet[];
  /** Wallets behind "more", for long registries. Empty when everything fits. */
  more: Wallet[];
  /** Every shown wallet, in display order. */
  all: Wallet[];
  /** The remembered wallet when `preferred` matched an available one. */
  remembered?: Wallet;
};

/**
 * Group and order wallets for display. The main action is the remembered
 * choice if there is one, else the platform wallet when available, else the
 * only option when there is exactly one. The rest keep their order.
 */
export function arrangeWallets(list: ReadonlyArray<Wallet>, options: ArrangeOptions = {}): ArrangedWallets {
  const inlineMax = options.inlineMax ?? 5;
  const inlineShown = Math.min(options.inlineShown ?? 4, inlineMax);
  const shown = options.includeUnavailable ? [...list] : list.filter((w) => w.available);
  const remembered = options.preferred ? shown.find((w) => w.id === options.preferred) : undefined;
  const platform = shown.find((w) => w.kind === "platform");
  const primary = remembered ?? platform ?? (shown.length === 1 ? shown[0] : undefined);
  const listed = shown.filter((w) => w !== primary);
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

const STORAGE_KEY = "smart-health-checkin:last-wallet";

/** Remember the wallet the patient used, in this browser, for this site. */
export function rememberChoice(walletId: string, key = STORAGE_KEY): void {
  try {
    localStorage.setItem(key, walletId);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); remembering is optional.
  }
}

/** The wallet id remembered for this site, if any. */
export function recallChoice(key = STORAGE_KEY): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Forget the remembered wallet. */
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
