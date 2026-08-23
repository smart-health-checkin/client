/**
 * The phone's side of a kiosk check-in. Opened from the QR code, it picks the
 * request up from the mailbox, shows what the kiosk is asking for, lets the
 * person choose who answers, and sends the wallet's sealed credential back.
 * Nothing is opened here; this page cannot read the response.
 */
import {
  answerHandoff,
  credentialGetterFor,
  fetchHandoff,
  resolveResponders,
  sessionIdFromHash,
  type Responder,
} from "../../src/index.js";
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

  // The same policy a check-in page uses; here the platform wallet leads,
  // because this page is meant to be open on the phone that has one.
  const responders = await resolveResponders({
    platform: true,
    webWallets: "./wallets.json",
    mock: true,
    origin: location.origin,
    default: "platform",
  });
  const choices = el("choices");
  for (const responder of responders) render(responder);

  function render(responder: Responder): void {
    const button = document.createElement("button");
    button.type = "button";
    button.className = responder.isDefault ? "smart-btn primary" : "smart-btn";
    button.textContent = responder.kind === "platform" ? "Share from my health app" : responder.name;
    button.disabled = !responder.available;
    button.title = responder.reason ?? responder.description ?? "";
    button.onclick = async () => {
      for (const b of choices.querySelectorAll("button")) (b as HTMLButtonElement).disabled = true;
      el("note").textContent = responder.kind === "web" ? "Choose what to share in the wallet tab…" : "Asking your wallet…";
      try {
        const answer = await answerHandoff(instantMailbox, sessionId!, envelope, credentialGetterFor(responder, { origin: location.origin }));
        el("ask").hidden = true;
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
