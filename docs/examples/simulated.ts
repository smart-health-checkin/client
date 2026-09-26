/**
 * Simulated wallets for the guides' live examples (picker.ts, one-button.ts).
 * A simulated session answers after a moment the way the example's Outcome
 * says. "Shared" answers with made-up data through the library's mock
 * wallet, so the page decrypts and checks a real response.
 */
import type { WalletSession } from "../../src/index.js";
import { createMockWalletCredentialGetter } from "../../src/testing/mock.js";

export type Outcome = "shared" | "declined" | "cancelled" | "error" | "never";

const ANSWER_AFTER_MS = 1600;

const named = (name: string, message: string): Error => Object.assign(new Error(message), { name });
const shareMadeUpData = createMockWalletCredentialGetter({ origin: location.origin });

/** A wallet session that answers as `outcome()` says, after a moment. */
export function simulatedSession(outcome: () => Outcome): WalletSession {
  let stop!: (e: Error) => void;
  const stopped = new Promise<never>((_, reject) => (stop = reject));
  stopped.catch(() => {}); // cancelled before it was asked
  const answer = async (navigatorArgument: unknown): Promise<unknown> => {
    const chosen = outcome();
    if (chosen === "never") return new Promise(() => {});
    await new Promise((r) => setTimeout(r, ANSWER_AFTER_MS));
    // A wallet reports a patient who said no, or closed it, the way the Digital Credentials API does.
    if (chosen === "declined") throw named("NotAllowedError", "The patient said no.");
    if (chosen === "cancelled") throw named("AbortError", "The patient closed the wallet.");
    if (chosen === "error") throw new Error("The health app stopped before it answered.");
    return shareMadeUpData(navigatorArgument);
  };
  return {
    getCredential: (navigatorArgument) => Promise.race([stopped, answer(navigatorArgument)]),
    cancel: () => stop(named("AbortError", "Cancelled")),
  };
}

