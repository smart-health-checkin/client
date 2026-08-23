/**
 * The kiosk: a screen with no wallet. It mints the request, shows a QR code,
 * and waits. The patient's phone opens handoff.html, asks its wallet, and the
 * sealed answer comes back through the mailbox — only this page can open it.
 */
import QRCode from "qrcode";
import {
  createHandoff,
  runCheckin,
  SCENARIOS,
  type CheckinOutcome,
  type SmartCheckinRequest,
} from "../../src/index.js";
import { instantMailbox } from "./mailbox-instant.js";
import { explainResponse, renderExplorer } from "./explore.js";

const el = (id: string): HTMLElement => document.getElementById(id)!;
const params = (): URLSearchParams => new URLSearchParams(location.hash.replace(/^#/, ""));
const DEFAULT_SCENARIO = "new-patient";
const HANDOFF_URL = new URL("./handoff.html", location.href).href;

let controller: AbortController | null = null;

function scenarioKey(): string {
  const key = params().get("scenario");
  return key && SCENARIOS[key] ? key : DEFAULT_SCENARIO;
}

function setStatus(text: string): void {
  el("status").textContent = text;
}

function renderAsk(request: SmartCheckinRequest): void {
  el("purpose").textContent = request.purpose ?? "Check in for your visit";
  const list = el("items");
  list.innerHTML = "";
  for (const item of request.items) {
    const li = document.createElement("li");
    li.textContent = item.title;
    list.append(li);
  }
}

function renderOutcome(outcome: CheckinOutcome): void {
  const section = el("outcome");
  section.hidden = false;
  el("qr-panel").hidden = true;
  const headline =
    outcome.status === "completed" ? "You're checked in"
    : outcome.status === "declined" ? "Check-in cancelled"
    : "Check-in didn't finish";
  el("outcome-headline").textContent = headline;
  el("error").textContent = outcome.error ? `${outcome.error.stage}: ${outcome.error.message}` : "";
  const explore = el("explore");
  explore.innerHTML = "";
  if (outcome.response) void explainResponse(outcome.request, outcome.response).then((view) => renderExplorer(explore, view));
  setStatus("");
}

async function start(): Promise<void> {
  controller?.abort();
  controller = new AbortController();
  const request = SCENARIOS[scenarioKey()]!.request;
  renderAsk(request);
  el("outcome").hidden = true;
  el("qr-panel").hidden = false;
  (el("qr") as HTMLCanvasElement).getContext("2d")?.clearRect(0, 0, 400, 400);
  setStatus("Preparing…");

  const outcome = await runCheckin(request, {
    ...createHandoff({
      mailbox: instantMailbox,
      handoffUrl: HANDOFF_URL,
      signal: controller.signal,
      onWaiting: async ({ url }) => {
        await QRCode.toCanvas(el("qr") as HTMLCanvasElement, url, { width: 260, margin: 1 });
        (el("open-here") as HTMLAnchorElement).href = url;
        setStatus("Scan with your phone's camera and follow the link. This screen updates when your phone has answered.");
      },
    }),
  });
  renderOutcome(outcome);
}

// demo controls: scenario
const select = el("scenario-select") as HTMLSelectElement;
for (const [key, scenario] of Object.entries(SCENARIOS)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = scenario.label;
  select.append(option);
}
select.value = scenarioKey();
select.onchange = () => {
  const p = params();
  if (select.value === DEFAULT_SCENARIO) p.delete("scenario"); else p.set("scenario", select.value);
  location.hash = `#${p.toString()}`;
  void start();
};
el("restart").onclick = () => void start();
void start();
