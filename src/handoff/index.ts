/**
 * `@smart-health-checkin/client/handoff`: hand a check-in from a screen with
 * no wallet (a kiosk, a front-desk tablet) to the patient's phone, through a
 * mailbox you provide.
 *
 * Kiosk: offer `handoffWallet({ mailbox, handoffUrl, onWaiting })` like any
 * other wallet. Phone: `fetchHandoff`, then `answerHandoff`.
 */
export {
  answerHandoff,
  fetchHandoff,
  handoffUrlFor,
  handoffWallet,
  sessionIdFromHash,
  type HandoffAnswer,
  type HandoffEnvelope,
  type HandoffMailbox,
  type HandoffOptions,
} from "../kit/handoff.js";
