/**
 * `@smart-health-checkin/client/testing`: run check-ins without a real wallet.
 *
 *   const result = await mockWallet({ items: { coverage: { status: "declined" } } }).start(request);
 *
 * Development and tests only; never offer the mock wallet to patients.
 */
import { customWallet, type Wallet } from "../core/wallets.js";
import { createMockWalletCredentialGetter, type MockWalletOptions } from "../kit/mock-wallet.js";
import type { WalletRegistry } from "../model/index.js";

/** A wallet that answers at once with the data you specify, or plausible fabricated data. */
export function mockWallet(options: Omit<MockWalletOptions, "origin"> & { origin?: string } = {}): Wallet {
  return customWallet({
    id: "mock",
    kind: "mock",
    name: "Simulated response",
    description: "Answers instantly with made-up data. Development only.",
    open() {
      const origin = options.origin ?? location.origin;
      return { getCredential: createMockWalletCredentialGetter({ ...options, origin }), cancel() {} };
    },
  });
}

/** This project's demo web wallet, for demos. */
export const DEMO_WALLET_REGISTRY: WalletRegistry = {
  source: "demo",
  wallets: [
    {
      id: "demo",
      name: "Demo Health Wallet",
      walletUrl: "https://smart-health-checkin.org/client/demo/wallet.html",
      description: "This project's demo wallet, holding made-up records.",
      homepage: "https://smart-health-checkin.org/client/demo/",
    },
  ],
};

export {
  buildMockResponse,
  DEMO_HEALTH_CARD_JWS,
  fabricateResponse,
  type MockItemSpec,
  type MockItemSpecs,
  type MockWalletOptions,
} from "../kit/mock-wallet.js";
