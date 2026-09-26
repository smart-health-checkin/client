// The bridge page for native apps (see docs/native-apps.md).
//
// A native Android app opens this page in a Custom Tab and asks Chrome for a
// message channel. Chrome grants it only if this site's
// /.well-known/assetlinks.json lists the app (delegate_permission/common.use_as_origin),
// so messages on the channel come from that app and no other.
//
// The app sends one message, the check-in to run:
//   {"type":"checkin","request":{…SMART request…},"registry":"https://…/wallets.json"}
// The page runs it like any web page would, with the picker (the phone's wallet
// and the registry's web wallets), and answers with one of:
//   {"type":"result-begin","total":N,"chars":C,"sha256":"<hex of the UTF-8 JSON>"}
//   {"type":"result-part","i":0..N-1,"data":"<slice of the JSON text>"}  (N of these)
//   {"type":"result-end"}
//   {"type":"declined"}
//   {"type":"failed","code":"…","message":"…"}
// The result JSON is {"response": <the checked SMART response>, "wallet": "<wallet id>"}.
// It goes in parts because each channel message crosses Android IPC, which caps
// a single message at about 1 MB; parts keep the whole response unlimited.
import "../../src/ui/index.js";
import type { SmartCheckinPicker } from "../../src/ui/index.js";
import type { SmartCheckinRequest } from "../../src/model/index.js";

/** Characters per part: 200k UTF-16 chars stays well under the ~1 MB IPC limit. */
const PART_CHARS = 200_000;

const picker = document.getElementById("picker") as SmartCheckinPicker & HTMLElement;
const purpose = document.getElementById("purpose")!;
const status = document.getElementById("status")!;
let port: MessagePort | undefined;

// Chrome delivers the app's first message on window, carrying the channel's port.
// Later messages from the app arrive on the port, and replies go out on it.
window.addEventListener("message", (event) => {
  if (port || !event.ports[0]) return;
  port = event.ports[0];
  port.onmessage = (e) => onAppMessage(e.data);
  onAppMessage(event.data);
});

function onAppMessage(data: unknown): void {
  let message: { type?: string; request?: SmartCheckinRequest; registry?: string };
  try {
    message = typeof data === "string" ? JSON.parse(data) : (data as typeof message);
  } catch {
    return;
  }
  if (message?.type !== "checkin" || !message.request) return;
  purpose.textContent = message.request.purpose ?? "Choose the health app that holds your records.";
  if (message.registry) picker.setAttribute("registry", message.registry);
  picker.request = message.request;
  picker.hidden = false;
}

function send(message: object): void {
  port?.postMessage(JSON.stringify(message));
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

picker.addEventListener("smart-checkin-response", async (e) => {
  const { wallet, response } = (e as CustomEvent).detail;
  const text = JSON.stringify({ response: response.json, wallet: wallet.id });
  const total = Math.ceil(text.length / PART_CHARS);
  send({ type: "result-begin", total, chars: text.length, sha256: await sha256Hex(text) });
  for (let i = 0; i < total; i++) send({ type: "result-part", i, data: text.slice(i * PART_CHARS, (i + 1) * PART_CHARS) });
  send({ type: "result-end" });
  status.textContent = "Sent to the app. You can go back to it now.";
});
picker.addEventListener("smart-checkin-declined", () => {
  send({ type: "declined" });
  status.textContent = "Nothing was shared.";
});
picker.addEventListener("smart-checkin-error", (e) => {
  const { code, message } = (e as CustomEvent).detail;
  send({ type: "failed", code, message });
  status.textContent = message;
});
