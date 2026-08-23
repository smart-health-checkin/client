/**
 * The demo's hand-off mailbox, on InstantDB.
 *
 * One row per kiosk session. Both payloads live in Instant storage, because
 * neither is size-bounded: the envelope carries the request (which can inline
 * a questionnaire) and the answer carries the wallet's sealed response (which
 * can be a clinical summary with documents, or several health cards). The row
 * holds pointers and timestamps only.
 *
 * Push with: bunx instant-cli push all --app 9cc51106-8018-43b8-8a37-fd8f414fdde5
 */
import { i } from "@instantdb/core";

const schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    handoffs: i.entity({
      sessionId: i.string().unique().indexed(),
      envelopePath: i.string(),
      answerPath: i.string().optional(),
      createdAt: i.string(),
      expiresAt: i.string(),
    }),
  },
});

export type AppSchema = typeof schema;
export default schema;
