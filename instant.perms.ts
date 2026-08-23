/**
 * Permissions for the hand-off mailbox. The session id is the capability:
 * whoever holds it can read the session, post its envelope, and answer it
 * exactly once. Nothing is deletable, nothing else is updatable, and no
 * client can invent attributes.
 */
import type { InstantRules } from "@instantdb/core";

const rules = {
  $default: { allow: { $default: "false" } },
  attrs: { allow: { $default: "false" } },

  handoffs: {
    bind: {
      knowsSession: "data.sessionId == ruleParams.sessionId",
      createFields:
        "request.modifiedFields.all(field, field in ['sessionId', 'envelopePath', 'createdAt', 'expiresAt'])",
      // Payload filenames carry a random suffix: uploading to an existing
      // path counts as a create, so a fixed name could be overwritten by
      // anyone holding the session id. A pointer the row already holds
      // can't be changed, and the file it names can't be guessed.
      pathsUnderSession:
        "data.envelopePath.startsWith('handoffs/' + data.sessionId + '/envelope-')",
      answerOnce:
        "request.modifiedFields.all(field, field == 'answerPath') && " +
        "data.answerPath == null && " +
        "newData.answerPath.startsWith('handoffs/' + data.sessionId + '/answer-')",
    },
    allow: {
      view: "knowsSession",
      create: "knowsSession && createFields && pathsUnderSession",
      update: "knowsSession && answerOnce",
      delete: "false",
    },
  },

  $files: {
    bind: {
      underHandoffs: "data.path.startsWith('handoffs/')",
      knownPath:
        "data.path == ruleParams.path && data.path.startsWith('handoffs/' + ruleParams.sessionId + '/')",
    },
    allow: {
      view: "knownPath",
      create: "underHandoffs",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
