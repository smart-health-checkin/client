/**
 * The demo's hand-off mailbox, on InstantDB.
 *
 * Both devices talk to the same Instant app: the kiosk writes the envelope
 * and subscribes for the answer; the phone reads the envelope and writes the
 * answer. Everything that crosses it is public material or ciphertext — the
 * navigator argument going out, the HPKE-sealed credential coming back — so
 * the mailbox needs no secrets and the Instant app id is public.
 *
 * The app's schema and permission rules predate this page (they were written
 * for the spec repo's earlier kiosk demo) and can only be changed from the
 * Instant dashboard, so the rows keep that design's names: the envelope rides
 * in `requests.encryptedRequest` (it is not encrypted), and the answer is a
 * blob in Instant storage under `submissions/<session>/`. Your own mailbox
 * would not look like this; see docs/kiosk.md for the contract it implements.
 */
import { id, init } from "@instantdb/core";
import type { HandoffAnswer, HandoffEnvelope, HandoffMailbox } from "../../src/index.js";

export const INSTANT_APP_ID = "9cc51106-8018-43b8-8a37-fd8f414fdde5";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = init({ appId: INSTANT_APP_ID, devtool: false });

const randomId = (): string =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const instantMailbox: HandoffMailbox = {
  async post(sessionId, envelope) {
    await db.transact(
      db.tx.requests[id()].ruleParams({ requestId: sessionId }).update({ requestId: sessionId, encryptedRequest: envelope }),
    );
  },

  async fetch(sessionId) {
    const result = await db.queryOnce(
      { requests: { $: { where: { requestId: sessionId } } } },
      { ruleParams: { requestId: sessionId } },
    );
    const row = result.data?.requests?.[0];
    if (!row) throw new Error("No such hand-off session. Scan the code on the kiosk again.");
    return row.encryptedRequest as HandoffEnvelope;
  },

  async answer(sessionId, answer) {
    const submissionId = randomId();
    const storagePath = `submissions/${sessionId}/${submissionId}.bin`;
    const uploaded = await db.storage.uploadFile(
      storagePath,
      new Blob([JSON.stringify(answer)], { type: "application/octet-stream" }),
      { contentType: "application/octet-stream" },
    );
    await db.transact(
      db.tx.submissions[id()].ruleParams({ requestId: sessionId }).update({
        submissionId, requestId: sessionId, storagePath, storageFileId: uploaded.data.id,
        iv: "", phoneEphemeralPublicKeyJwk: {},
      }),
    );
  },

  waitForAnswer(sessionId, options = {}) {
    return new Promise<HandoffAnswer>((resolve, reject) => {
      let done = false;
      const unsubscribe = db.subscribeQuery(
        { submissions: { $: { where: { requestId: sessionId } } } },
        async (resp: { error?: { message: string }; data?: { submissions?: Array<{ storagePath: string }> } }) => {
          if (done) return;
          if (resp.error) { done = true; unsubscribe(); reject(new Error(resp.error.message)); return; }
          const row = resp.data?.submissions?.[0];
          if (!row) return;
          done = true; unsubscribe();
          try {
            const files = await db.queryOnce(
              { $files: { $: { where: { path: row.storagePath } } } },
              { ruleParams: { requestId: sessionId, storagePath: row.storagePath } },
            );
            const url = files.data?.$files?.[0]?.url;
            if (!url) throw new Error("the answer was recorded but its contents are not available");
            const text = await (await fetch(url)).text();
            resolve(JSON.parse(text) as HandoffAnswer);
          } catch (e) { reject(e); }
        },
        { ruleParams: { requestId: sessionId } },
      );
      options.signal?.addEventListener("abort", () => {
        if (done) return;
        done = true; unsubscribe();
        reject(new DOMException("hand-off cancelled", "AbortError"));
      });
    });
  },
};
