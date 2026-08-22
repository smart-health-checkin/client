/**
 * Who may answer a check-in request.
 *
 * The relying party declares a policy — the device's own wallet, a set of web
 * wallets it recognizes, and (in development) the mock — and this resolves it
 * into the concrete list of options to put in front of the person, with
 * anything unavailable in *this* browser already marked as such.
 *
 * The kit stops at the list. Rendering it — a menu, a split button, a row of
 * cards — is the page's business.
 */

import { detectDcApiSupport } from "../browser/index.js";
import type { FetchLike } from "../fetch-like.js";
import { createMockWalletCredentialGetter } from "./mock-wallet.js";
import { createWebWalletCredentialGetter } from "./web-wallet.js";
import {
  DEMO_WALLET_REGISTRY,
  loadWalletRegistry,
  type WalletRegistry,
  type WebWalletEntry,
} from "./wallet-registry.js";

export type ResponderPolicy = {
  /**
   * Offer the person's own wallet through the Digital Credentials API.
   * Default true, and worth keeping on desktop: browsers that support the API
   * offer a cross-device flow — a QR code the person scans with their phone,
   * whose wallet answers, with the response returning to this page. It is
   * listed as unavailable, not hidden, when the browser can't reach one.
   */
  platform?: boolean;
  /**
   * Web wallets this relying party recognizes: an inline list, a registry
   * object, or a URL to fetch one from. `true` uses the built-in demo
   * registry; omit or `false` for none.
   */
  webWallets?: true | false | string | WalletRegistry | WebWalletEntry[];
  /**
   * Offer the non-interactive mock. Development and demos only — never ship
   * a page that offers it in production.
   */
  mock?: boolean;
  /** Verifier origin for the mock responder; defaults to this page's. */
  origin?: string;
};

export type Responder = {
  /** Stable id: "platform", "mock", or the wallet's registry id. */
  id: string;
  kind: "platform" | "web" | "mock";
  name: string;
  description?: string;
  iconUrl?: string;
  homepage?: string;
  /** False when this browser can't use it; `reason` says why. */
  available: boolean;
  reason?: string;
  /** The wallet entry, for `kind: "web"`. */
  wallet?: WebWalletEntry;
};

/**
 * Resolve a policy into the options to render.
 *
 * ```ts
 * const responders = await resolveResponders({
 *   platform: true,
 *   webWallets: "/config/wallets.json",
 * });
 * // → render one button per responder; disable the unavailable ones
 * ```
 */
export async function resolveResponders(
  policy: ResponderPolicy = {},
  options: { detectSupport?: typeof detectDcApiSupport; fetchImpl?: FetchLike } = {},
): Promise<Responder[]> {
  const responders: Responder[] = [];

  if (policy.platform !== false) {
    const support = (options.detectSupport ?? detectDcApiSupport)();
    responders.push({
      id: "platform",
      kind: "platform",
      name: "Your own health app",
      description:
        "The wallet on this device — or, on a desktop, scan a QR code with your phone and answer there.",
      available: support.state === "supported",
      ...(support.state === "unsupported" ? { reason: support.reason } : {}),
    });
  }

  if (policy.webWallets) {
    const registry =
      policy.webWallets === true
        ? DEMO_WALLET_REGISTRY
        : await loadWalletRegistry(policy.webWallets, { fetchImpl: options.fetchImpl });
    for (const wallet of registry.wallets) {
      responders.push({
        id: wallet.id,
        kind: "web",
        name: wallet.name,
        ...(wallet.description ? { description: wallet.description } : {}),
        ...(wallet.iconUrl ? { iconUrl: wallet.iconUrl } : {}),
        ...(wallet.homepage ? { homepage: wallet.homepage } : {}),
        available: true,
        wallet,
      });
    }
  }

  if (policy.mock) {
    responders.push({
      id: "mock",
      kind: "mock",
      name: "Simulated response",
      description: "Answers instantly with fabricated data. Development only.",
      available: true,
    });
  }

  return responders;
}

/**
 * The `getCredential` to pass to `requestCheckin` / `runCheckin` for a chosen
 * responder. Returns undefined for the platform option, which is the default
 * path and needs no override.
 */
export function credentialGetterFor(
  responder: Responder,
  options: { origin?: string } = {},
): ((navigatorArgument: unknown) => Promise<unknown>) | undefined {
  const origin =
    options.origin ?? (typeof location !== "undefined" ? location.origin : undefined);

  if (responder.kind === "web") {
    if (!responder.wallet) throw new Error(`responder ${responder.id} has no wallet entry`);
    return createWebWalletCredentialGetter({
      walletUrl: responder.wallet.walletUrl,
      ...(responder.wallet.target ? { target: responder.wallet.target } : {}),
    });
  }

  if (responder.kind === "mock") {
    if (!origin) throw new Error("the mock responder needs an origin");
    return createMockWalletCredentialGetter({ origin });
  }

  return undefined;
}
