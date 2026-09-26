import { describe, expect, test } from "bun:test";
import { customWallet } from "../core/wallets.js";
import { answerHandoff, type HandoffAnswer, type HandoffEnvelope, type HandoffMailbox } from "./handoff.js";

const envelope: HandoffEnvelope = {
  v: 1,
  navigatorArgument: { digital: { requests: [] } },
  handoffOrigin: "https://clinic.example",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

function memoryMailbox(): HandoffMailbox & { answers: HandoffAnswer[] } {
  const answers: HandoffAnswer[] = [];
  return {
    answers,
    post: async () => {},
    fetch: async () => envelope,
    answer: async (_id, answer) => void answers.push(answer),
    waitForAnswer: async () => answers[0]!,
  };
}

describe("answerHandoff", () => {
  test("uses a session the page already opened instead of opening the wallet again", async () => {
    let opened = 0;
    const wallet = customWallet({
      id: "w",
      name: "W",
      open() {
        opened++;
        return { getCredential: async () => ({ protocol: "org-iso-mdoc", data: { response: "sealed" } }), cancel() {} };
      },
    });
    const session = wallet.open();
    const mailbox = memoryMailbox();
    const answer = await answerHandoff(mailbox, "s1", envelope, wallet, { session });
    expect(opened).toBe(1);
    expect(answer).toEqual({ credential: { protocol: "org-iso-mdoc", data: { response: "sealed" } } });
    expect(mailbox.answers).toEqual([answer]);
  });

  test("reports a decline to the kiosk", async () => {
    const wallet = customWallet({ id: "w", name: "W", open: () => ({ getCredential: async () => null, cancel() {} }) });
    const mailbox = memoryMailbox();
    expect(await answerHandoff(mailbox, "s1", envelope, wallet)).toEqual({ declined: true });
    expect(mailbox.answers).toEqual([{ declined: true }]);
  });
});
