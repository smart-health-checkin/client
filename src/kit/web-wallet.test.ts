import { afterEach, expect, test } from "bun:test";
import {
  createWebWalletCredentialGetter,
  WEB_WALLET_READY_MESSAGE_TYPE,
  WEB_WALLET_REQUEST_MESSAGE_TYPE,
  WEB_WALLET_RESPONSE_MESSAGE_TYPE,
} from "./web-wallet.js";

// A minimal stand-in for the browser: one opener page and one wallet window.
const saved: Record<string, unknown> = {};
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) (globalThis as any)[k] = v;
});

function fakeBrowser(walletOrigin: string) {
  const listeners = new Set<(e: MessageEvent) => void>();
  const sentToWallet: { data: any; targetOrigin: string }[] = [];
  const popup = {
    closed: false,
    close() { this.closed = true; },
    postMessage(data: any, targetOrigin: string) { sentToWallet.push({ data, targetOrigin }); },
  };
  for (const k of ["window", "location", "addEventListener", "removeEventListener"]) saved[k] = (globalThis as any)[k];
  (globalThis as any).location = { href: "https://ehr.example/checkin", origin: "https://ehr.example" };
  (globalThis as any).window = {
    open: () => popup,
    addEventListener: (_: string, fn: any) => listeners.add(fn),
    removeEventListener: (_: string, fn: any) => listeners.delete(fn),
  };
  (globalThis as any).addEventListener = (globalThis as any).window.addEventListener;
  (globalThis as any).removeEventListener = (globalThis as any).window.removeEventListener;
  const fromWallet = (data: any) => {
    for (const fn of [...listeners]) fn({ origin: walletOrigin, source: popup, data } as unknown as MessageEvent);
  };
  return { popup, sentToWallet, fromWallet };
}

test("the request message carries no origin field and targets only the wallet origin", async () => {
  const b = fakeBrowser("https://wallet.example");
  const get = createWebWalletCredentialGetter({ walletUrl: "https://wallet.example/w", timeoutMs: 2000 });
  const pending = get({ digital: { requests: [{ protocol: "org-iso-mdoc", data: {} }] } });

  b.fromWallet({ type: WEB_WALLET_READY_MESSAGE_TYPE });
  expect(b.sentToWallet).toHaveLength(1);
  const sent = b.sentToWallet[0]!;
  expect(sent.targetOrigin).toBe("https://wallet.example");
  expect(sent.data.type).toBe(WEB_WALLET_REQUEST_MESSAGE_TYPE);
  expect("verifierOrigin" in sent.data).toBe(false);

  const credential = { protocol: "org-iso-mdoc", data: { response: "x" } };
  b.fromWallet({ type: WEB_WALLET_RESPONSE_MESSAGE_TYPE, requestId: sent.data.requestId, outcome: "approved", credential });
  expect(await pending).toEqual(credential);
});

test("messages from any other origin are ignored", async () => {
  const b = fakeBrowser("https://evil.example");
  const get = createWebWalletCredentialGetter({ walletUrl: "https://wallet.example/w", timeoutMs: 200 });
  const pending = get({});
  b.fromWallet({ type: WEB_WALLET_READY_MESSAGE_TYPE });
  expect(b.sentToWallet).toHaveLength(0);
  await expect(pending).rejects.toThrow(/timed out/);
});
