/**
 * Wallets: every way a patient can answer.
 *
 * A `Wallet` is the phone's own wallet (through the Digital Credentials API),
 * a web wallet from a registry, a kiosk hand-off, a mock, or anything you
 * wrap with `customWallet`. `wallets()` lists what a page offers:
 *
 *   const options = await wallets({ registry: "/wallets.json" });
 *   button.onclick = () => options[0].start(request).then(show);
 *
 * Call `start` (or `open`) inside the click, before any `await`: a web
 * wallet's tab must open while the browser still allows it.
 */

import { detectDcApiSupport } from "../browser/index.js";
import { loadWalletRegistry, type WalletRegistry, type WebWalletEntry } from "../model/registry.js";
import { createWebWalletCredentialGetter, openWebWallet } from "../kit/web-wallet.js";
import type { CheckinOptions, CheckinResult, KeyCustody } from "./run.js";
import { runCheckin } from "./run.js";
import type { CheckinRequestInput } from "./request.js";

/** A connection to a wallet, opened inside the click. */
export type WalletSession = {
  /** Send the Digital Credentials API argument; resolves with the wallet's credential. */
  getCredential(navigatorArgument: unknown): Promise<unknown>;
  /** Stop waiting: closes a web wallet's tab. The check-in then ends as declined. */
  cancel(): void;
};

export type Wallet = {
  /** "platform", a registry id, "handoff", "mock", or your own. */
  id: string;
  kind: "platform" | "web" | "handoff" | "mock" | "custom";
  name: string;
  description?: string;
  iconUrl?: string;
  homepage?: string;
  /** False when this browser can't use it; `unavailableReason` says why. */
  available: boolean;
  unavailableReason?: string;
  /** The registry entry, for web wallets. */
  entry?: WebWalletEntry;
  /** Key custody this wallet needs (a kiosk hand-off binds to the hand-off page's origin). Used unless the caller passes `keys`. */
  keys?: KeyCustody;
  /** Connect to the wallet. Synchronous; call inside the click. */
  open(): WalletSession;
  /** Run a check-in with this wallet. Call inside the click. */
  start(request: CheckinRequestInput, options?: Omit<CheckinOptions, "wallet" | "session">): Promise<CheckinResult>;
};

type WalletInit = Omit<Wallet, "start" | "available"> & { available?: boolean };

function makeWallet(init: WalletInit): Wallet {
  const wallet: Wallet = {
    available: true,
    ...init,
    start(request, options = {}) {
      return runCheckin(request, { ...options, wallet });
    },
  };
  return wallet;
}

/** The phone's own wallet, through the browser's Digital Credentials API. */
export function platformWallet(): Wallet {
  const support = typeof navigator === "undefined" ? { state: "unsupported" as const, reason: "no browser" } : detectDcApiSupport();
  return makeWallet({
    id: "platform",
    kind: "platform",
    name: "Your phone's health app",
    available: support.state === "supported",
    ...(support.state === "unsupported" ? { unavailableReason: support.reason } : {}),
    open() {
      const controller = new AbortController();
      return {
        getCredential: (arg) => navigator.credentials.get({ ...(arg as CredentialRequestOptions), signal: controller.signal }),
        cancel: () => controller.abort(),
      };
    },
  });
}

/** A web wallet from a registry entry. Opens in a tab (or a popup, if the entry says so). */
export function webWallet(entry: WebWalletEntry): Wallet {
  const target = entry.target ? { target: entry.target } : {};
  return makeWallet({
    id: entry.id,
    kind: "web",
    name: entry.name,
    ...(entry.description ? { description: entry.description } : {}),
    ...(entry.iconUrl ? { iconUrl: entry.iconUrl } : {}),
    ...(entry.homepage ? { homepage: entry.homepage } : {}),
    entry,
    open() {
      const tab = openWebWallet({ walletUrl: entry.walletUrl, ...target });
      return {
        getCredential: createWebWalletCredentialGetter({ walletUrl: entry.walletUrl, ...target, window: tab }),
        cancel: () => tab?.close(),
      };
    },
  });
}

/** Wrap any transport as a wallet: for experiments, tests, and new kinds of wallet. */
export function customWallet(init: {
  id: string;
  name: string;
  kind?: Wallet["kind"];
  description?: string;
  iconUrl?: string;
  available?: boolean;
  unavailableReason?: string;
  keys?: KeyCustody;
  /** Called inside the click. Return how to reach the wallet. */
  open: () => WalletSession;
}): Wallet {
  return makeWallet({ ...init, kind: init.kind ?? "custom" });
}

export type WalletsOptions = {
  /** Offer the phone's own wallet (default true). Listed only when this browser can reach it, unless `includeUnavailable`. */
  platform?: boolean;
  /** Web wallets: a registry URL, a registry, or a list of entries. None by default. */
  registry?: string | WalletRegistry | WebWalletEntry[];
  /** More wallets to offer after the registry's, such as `handoffWallet(...)` or `mockWallet()`. */
  extra?: ReadonlyArray<Wallet>;
  /** Keep wallets this browser can't use in the list, marked unavailable. */
  includeUnavailable?: boolean;
  fetch?: typeof fetch;
};

/**
 * The wallets a page offers, in order: the platform wallet, the registry's
 * web wallets in registry order, then `extra`. Throws if a registry can't be
 * loaded or is malformed.
 */
export async function wallets(options: WalletsOptions = {}): Promise<Wallet[]> {
  const list: Wallet[] = [];
  if (options.platform !== false) list.push(platformWallet());
  if (options.registry) {
    const registry = await loadWalletRegistry(options.registry, options.fetch ? { fetchImpl: options.fetch } : {});
    list.push(...registry.wallets.map(webWallet));
  }
  list.push(...(options.extra ?? []));
  return options.includeUnavailable ? list : list.filter((w) => w.available);
}
