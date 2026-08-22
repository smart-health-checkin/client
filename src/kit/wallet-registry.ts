/**
 * Web-wallet registry.
 *
 * A platform wallet is chosen by the operating system; a *web* wallet is a
 * site, so somebody has to decide which one to open. This is the data model
 * for that list: a default of one (the demo wallet), or a list you supply
 * inline or fetch from a URL, so a deployment can offer whatever wallets it
 * recognizes and let the person pick at the moment they click.
 *
 * Deliberately data, not UI. Rendering a picker is the page's business — see
 * the demo for one implementation.
 */

import type { ValidationResult } from "../model/index.js";
import type { FetchLike } from "../fetch-like.js";

export type WebWalletEntry = {
  /** Stable identifier used in URLs, storage, and telemetry. */
  id: string;
  /** What the person sees: "Demo Health Wallet". */
  name: string;
  /** The page that answers check-in requests. */
  walletUrl: string;
  /** One line for a picker menu. */
  description?: string;
  /** Icon for a picker menu; must be same-origin or CORS-readable. */
  iconUrl?: string;
  /** Where to learn about or install the wallet. */
  homepage?: string;
  /** Open in a tab (default) or a popup window. */
  target?: "tab" | "popup";
};

export type WalletRegistry = {
  /** Free-form label for where this list came from. */
  source?: string;
  wallets: WebWalletEntry[];
};

/** The list every deployment starts with: this project's demo wallet. */
export const DEMO_WALLET_REGISTRY: WalletRegistry = {
  source: "built-in",
  wallets: [
    {
      id: "demo",
      name: "Demo Health Wallet",
      walletUrl: "/demo/wallet.html",
      description: "This project's reference wallet, holding fabricated records.",
      homepage: "https://smart-health-checkin.org/demo/wallet.html",
    },
  ],
};

export function validateWalletRegistry(value: unknown): ValidationResult<WalletRegistry> {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "registry must be an object" };
  }
  const wallets = (value as { wallets?: unknown }).wallets;
  if (!Array.isArray(wallets) || wallets.length === 0) {
    return { ok: false, error: "registry.wallets must be a non-empty array" };
  }
  const ids = new Set<string>();
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i] as Record<string, unknown>;
    if (typeof wallet !== "object" || wallet === null) {
      return { ok: false, error: `wallets[${i}] is not an object` };
    }
    for (const field of ["id", "name", "walletUrl"] as const) {
      if (typeof wallet[field] !== "string" || !wallet[field]) {
        return { ok: false, error: `wallets[${i}].${field} is required` };
      }
    }
    if (ids.has(wallet.id as string)) {
      return { ok: false, error: `wallets[${i}].id "${String(wallet.id)}" is duplicated` };
    }
    ids.add(wallet.id as string);
    if (wallet.target !== undefined && wallet.target !== "tab" && wallet.target !== "popup") {
      return { ok: false, error: `wallets[${i}].target must be "tab" or "popup"` };
    }
  }
  return { ok: true, value: value as WalletRegistry };
}

/**
 * Resolve a registry from whatever a deployment configured: the built-in
 * default, an inline object or array, or a URL to fetch JSON from.
 *
 * ```ts
 * const registry = await loadWalletRegistry("/config/wallets.json");
 * ```
 *
 * A fetched list is validated before use; a malformed one throws rather than
 * silently falling back, because "which wallet are we sending people to" is
 * not a question to answer by accident.
 */
export async function loadWalletRegistry(
  source?: string | WalletRegistry | WebWalletEntry[],
  options: { fetchImpl?: FetchLike } = {},
): Promise<WalletRegistry> {
  if (source === undefined) return DEMO_WALLET_REGISTRY;

  if (Array.isArray(source)) {
    const candidate = { wallets: source, source: "inline" };
    const validation = validateWalletRegistry(candidate);
    if (!validation.ok) throw new Error(`invalid wallet registry: ${validation.error}`);
    return validation.value;
  }

  if (typeof source === "object") {
    const validation = validateWalletRegistry(source);
    if (!validation.ok) throw new Error(`invalid wallet registry: ${validation.error}`);
    return validation.value;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(source, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`wallet registry fetch failed: HTTP ${res.status}`);
  const body = (await res.json()) as unknown;
  const candidate = Array.isArray(body) ? { wallets: body } : body;
  const validation = validateWalletRegistry(candidate);
  if (!validation.ok) throw new Error(`invalid wallet registry at ${source}: ${validation.error}`);
  return { source, ...validation.value };
}

/** Look one up by id. */
export function findWallet(registry: WalletRegistry, id: string): WebWalletEntry | undefined {
  return registry.wallets.find((wallet) => wallet.id === id);
}
