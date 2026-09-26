/**
 * The phone's side of a kiosk check-in. Opened from the QR code, it picks the
 * request up from the mailbox, shows what the kiosk is asking for, lets the
 * person choose who answers, and sends the wallet's sealed credential back.
 * Nothing is opened here; this page cannot read the response.
 */
import { wallets, type Wallet } from "../../src/index.js";
import { answerHandoff, fetchHandoff, sessionIdFromHash } from "../../src/handoff/index.js";
import { mockWallet } from "../../src/testing/index.js";
import { instantMailbox } from "./mailbox-instant.js";

const el = (id: string): HTMLElement => document.getElementById(id)!;

async function main(): Promise<void> {
  const sessionId = sessionIdFromHash(location.hash);
  if (!sessionId) {
    el("note").textContent = "Scan the code on the kiosk screen to start.";
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

  // The same wallets a check-in page offers; the phone's own leads, because
  // this page is meant to be open on the phone that has one.
  const offered = await wallets({ registry: "./wallets.json", extra: [mockWallet()] });
  const choices = el("choices");
  offered.forEach((wallet, index) => render(wallet, index === 0));

  function render(responder: Wallet, primary: boolean): void {
    const button = document.createElement("button");
    button.type = "button";
    button.className = primary ? "smart-btn primary" : "smart-btn";
    button.textContent = responder.kind === "platform" ? "Share from my health app" : responder.name;
    button.title = responder.description ?? "";
    button.onclick = async () => {
      for (const b of choices.querySelectorAll("button")) (b as HTMLButtonElement).disabled = true;
      el("note").textContent = responder.kind === "web" ? "Choose what to share in the wallet tab…" : "Asking your wallet…";
      try {
        const answer = await answerHandoff(instantMailbox, sessionId!, envelope, responder);
        el("ask").hidden = true;
        el("note").textContent = "";
        el("done").hidden = false;
        el("done-headline").textContent = "declined" in answer ? "Nothing was shared" : "Sent to the kiosk";
        el("done-text").textContent = "declined" in answer
          ? "The kiosk has been told. You can check in at the front desk instead."
          : "Your wallet's answer is on its way, sealed to the kiosk. You can put your phone away.";
      } catch (e) {
        el("note").textContent = `Couldn't send: ${(e as Error).message}`;
        for (const b of choices.querySelectorAll("button")) (b as HTMLButtonElement).disabled = false;
      }
    };
    choices.append(button);
  }
}

void main();
