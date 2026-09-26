/**
 * The demo's hand-off mailbox, on InstantDB.
 *
 * Both devices talk to the same Instant app: the kiosk posts the envelope and
 * subscribes for the answer; the phone reads the envelope and posts the
 * answer. One `handoffs` row per session holds timestamps and two storage
 * pointers; the payloads themselves are files, because neither is
 * size-bounded — an envelope can inline a questionnaire, and a sealed answer
 * can be a clinical summary with documents or several health cards.
 *
 * Everything that crosses it is public material or ciphertext, so the mailbox
 * needs no secrets and the app id is public. The rules (instant.perms.ts) make
 * the session id the capability: read and post with it, answer exactly once.
 * Schema and rules live at the repo root; push changes with
 *   bunx instant-cli push all --app 9cc51106-8018-43b8-8a37-fd8f414fdde5
 */
import { id, init, lookup } from "@instantdb/core";
import type { HandoffAnswer, HandoffEnvelope, HandoffMailbox } from "../../src/handoff/index.js";

export const INSTANT_APP_ID = "9cc51106-8018-43b8-8a37-fd8f414fdde5";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = init({ appId: INSTANT_APP_ID, devtool: false });

// Filenames carry a random suffix (see instant.perms.ts): the row records
// the one that counts, and nobody can overwrite a file they can't name.
const nonce = (): string => crypto.randomUUID().replace(/-/g, "");
const envelopePath = (sessionId: string): string => `handoffs/${sessionId}/envelope-${nonce()}.json`;
const answerPath = (sessionId: string): string => `handoffs/${sessionId}/answer-${nonce()}.json`;

async function upload(path: string, value: unknown): Promise<void> {
  await db.storage.uploadFile(path, new Blob([JSON.stringify(value)], { type: "application/json" }), {
    contentType: "application/json",
  });
}

/** Read a stored payload back; the rules require the session id alongside the path. */
async function download<T>(sessionId: string, path: string): Promise<T> {
  const files = await db.queryOnce(
    { $files: { $: { where: { path } } } },
    { ruleParams: { sessionId, path } },
  );
  const url = files.data?.$files?.[0]?.url;
  if (!url) throw new Error(`${path} is not available`);
  return (await (await fetch(url)).json()) as T;
}

type Row = { id: string; sessionId: string; envelopePath: string; answerPath?: string; createdAt: string; expiresAt: string };

export const instantMailbox: HandoffMailbox = {
  async post(sessionId, envelope) {
    const path = envelopePath(sessionId);
    await upload(path, envelope);
    await db.transact(
      db.tx.handoffs[id()].ruleParams({ sessionId }).update({
        sessionId,
        envelopePath: path,
        createdAt: envelope.createdAt,
        expiresAt: envelope.expiresAt,
      }),
    );
  },

  async fetch(sessionId) {
    const result = await db.queryOnce(
      { handoffs: { $: { where: { sessionId } } } },
      { ruleParams: { sessionId } },
    );
    const row: Row | undefined = result.data?.handoffs?.[0];
    if (!row) throw new Error("No such hand-off session. Scan the code on the kiosk again.");
    return download<HandoffEnvelope>(sessionId, row.envelopePath);
  },

  async answer(sessionId, answer) {
    const path = answerPath(sessionId);
    await upload(path, answer);
    // The rules allow this update once, and only to this field.
    await db.transact(
      db.tx.handoffs[lookup("sessionId", sessionId)].ruleParams({ sessionId }).update({ answerPath: path }),
    );
  },

  waitForAnswer(sessionId, options = {}) {
    return new Promise<HandoffAnswer>((resolve, reject) => {
      let done = false;
      const unsubscribe = db.subscribeQuery(
        { handoffs: { $: { where: { sessionId } } } },
        async (resp: { error?: { message: string }; data?: { handoffs?: Row[] } }) => {
          if (done) return;
          if (resp.error) { done = true; unsubscribe(); reject(new Error(resp.error.message)); return; }
          const row = resp.data?.handoffs?.[0];
          if (!row?.answerPath) return;
          done = true; unsubscribe();
          download<HandoffAnswer>(sessionId, row.answerPath).then(resolve, reject);
        },
        { ruleParams: { sessionId } },
      );
      options.signal?.addEventListener("abort", () => {
        if (done) return;
        done = true; unsubscribe();
        reject(new DOMException("hand-off cancelled", "AbortError"));
      });
    });
  },
};
