/**
 * The phone's side of a kiosk check-in. Opened from the QR code, it picks the
 * request up from the mailbox, shows what the kiosk is asking for, lets the
 * person choose who answers, and sends the wallet's sealed credential back.
 * Nothing is opened here; this page cannot read the response.
 *
 * The choice is `<smart-checkin-picker mode="pick">`: it opens the chosen
 * wallet inside the click and hands this page the session, and
 * `answerHandoff` sends the kiosk's request through it.
 */
import type { SmartCheckinPicker } from "../../src/ui/index.js";
import { answerHandoff, fetchHandoff, sessionIdFromHash } from "../../src/handoff/index.js";
import { instantMailbox } from "./mailbox-instant.js";
import { followPageTheme } from "./site.js";
import { pickerChoice, setUpPicker } from "./demo-picker.js";

const el = (id: string): HTMLElement => document.getElementById(id)!;

async function main(): Promise<void> {
  const sessionId = sessionIdFromHash(location.hash);
  if (!sessionId) {
    const kiosk = Object.assign(document.createElement("a"), { href: "./kiosk.html", textContent: "kiosk demo" });
    el("note").replaceChildren("Scan the code on the kiosk screen to start. No kiosk? Open the ", kiosk, " on another screen.");
    return;
  }

  let handoff;
  try {
    handoff = await fetchHandoff(instantMailbox, sessionId);
  } catch (e) {
    el("note").textContent = (e as Error).message;
    return;
  }
  const { envelope, request } = handoff;

  el("purpose").textContent = request.purpose ?? "Check in for your visit";
  el("from").textContent = new URL(envelope.handoffOrigin).host;
  const list = el("items");
  for (const item of request.items) {
    const li = document.createElement("li");
    li.textContent = item.title;
    list.append(li);
  }
  el("ask").hidden = false;
  el("note").textContent = "";

  // The same wallets a check-in page offers; the phone's own leads where this
  // browser can reach it, because this page is meant to be open on that phone.
  const picker = el("picker") as SmartCheckinPicker;
  followPageTheme(picker);
  await setUpPicker(picker, pickerChoice(new URLSearchParams(location.hash.replace(/^#/, ""))));

  picker.addEventListener("smart-checkin-choose", async (event) => {
    const { wallet, session } = event.detail;
    try {
      const answer = await answerHandoff(instantMailbox, sessionId, envelope, wallet, session ? { session } : {});
      el("ask").hidden = true;
      el("done").hidden = false;
      el("done-headline").textContent = "declined" in answer ? "Nothing was shared" : "Sent to the kiosk";
      el("done-text").textContent = "declined" in answer
        ? "The kiosk has been told. You can check in at the front desk instead."
        : "Your wallet's answer is on its way, sealed to the kiosk. You can put your phone away.";
    } catch (e) {
      picker.setOutcome({ status: "failed", message: `Couldn't send: ${(e as Error).message}` });
    }
  });
}

void main();
