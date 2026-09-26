/**
 * Demo app: a fictional clinic's check-in page.
 *
 * The point of the code below is the shape of the integration:
 *
 *   picker.request = request;
 *   picker.addEventListener("smart-checkin-response", (e) => use(e.detail.response));
 *   // …then this page decides what to do with the response.
 *
 * `<smart-checkin-picker>` lists the wallets, runs the check-in with the one
 * the patient picks, and reports back; everything after that is this page.
 * Posting to FHIR happens explicitly afterwards, using the optional `fhir`
 * helper — the check-in kit itself has no idea a FHIR server exists.
 */

import { wallets, type SmartCheckinRequest, type SmartCheckinResponse } from "../../src/index.js";
import { DEMO_REQUESTS } from "./requests.js";
import { explainResponse, renderExplorer } from "./explore.js";
import { buildCheckinBundle, postCheckinBundle, type PostMode } from "../../src/fhir/index.js";
import { showShareLink } from "./share-link.js";
import type { SmartCheckinPicker } from "../../src/ui/index.js";
import { followPageTheme } from "./site.js";
import { DEFAULT_REGISTRY, pickerChoice, setUpPicker } from "./demo-picker.js";

// The demo never posts anywhere unless you set a base in Demo controls.
const DEFAULT_FHIR_BASE = "";
const KNOWN_OPEN_SERVERS = ["https://hapi.fhir.org/baseR4"];
const DEFAULT_SCENARIO = "visit-prep";
const DEMO_PATIENT = "Patient/example";
const DEMO_PATIENT_NAME = "Jordan Reyes (demo)";
const DEMO_APPOINTMENT = "Appointment/demo-visit";

type AfterMode = "none" | PostMode;

type Settings = {
  request: SmartCheckinRequest;
  scenarioKey: string | null;
  /** Offer only this wallet (`wallet=`); null offers every one. */
  wallet: string | null;
  /** The wallet registry (`wallets=`). */
  registry: string;
  after: AfterMode;
  patient: string;
  appointment: string;
  fhirBase: string;
  returnUrl: string;
};

const el = (id: string): HTMLElement => document.getElementById(id)!;
const params = (): URLSearchParams => new URLSearchParams(location.hash.replace(/^#/, ""));

function decodeRequestParam(value: string): SmartCheckinRequest | null {
  try {
    return JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/"))) as SmartCheckinRequest;
  } catch {
    return null;
  }
}

function readSettings(): Settings {
  const p = params();
  const passthrough = p.get("request") ? decodeRequestParam(p.get("request")!) : null;
  const scenarioKey = passthrough
    ? null
    : p.get("scenario") && DEMO_REQUESTS[p.get("scenario")!]
      ? p.get("scenario")!
      : DEFAULT_SCENARIO;
  const after = p.get("post");
  return {
    request: passthrough ?? DEMO_REQUESTS[scenarioKey!]!.request,
    scenarioKey,
    ...pickerChoice(p),
    after: after === "transaction" || after === "individual" ? after : "none",
    patient: p.get("patient") ?? DEMO_PATIENT,
    appointment: p.get("appointment") ?? DEMO_APPOINTMENT,
    fhirBase: p.get("fhir") ?? DEFAULT_FHIR_BASE,
    returnUrl: p.get("returnUrl") ?? "",
  };
}

function setParam(key: string, value: string, dropWhen?: string): void {
  const p = params();
  if (!value || value === dropWhen) p.delete(key);
  else p.set(key, value);
  location.hash = `#${p.toString()}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------- artifacts

type Artifact = { key: string; label: string; value: unknown };
const artifacts: Artifact[] = [];

function showArtifact(key: string, label: string, value: unknown): void {
  const index = artifacts.findIndex((a) => a.key === key);
  const artifact = { key, label, value };
  if (index >= 0) artifacts[index] = artifact;
  else artifacts.push(artifact);
  renderArtifacts();
}

function renderArtifacts(): void {
  const host = el("artifacts");
  host.innerHTML = "";
  for (const artifact of artifacts) {
    const json = JSON.stringify(artifact.value, null, 2);
    const details = document.createElement("details");
    details.className = "artifact smart-details";

    const summary = document.createElement("summary");
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = artifact.label;

    const tools = document.createElement("span");
    tools.className = "tools";
    const openTab = document.createElement("button");
    openTab.className = "smart-btn sm mono";
    openTab.type = "button";
    openTab.textContent = "open ↗";
    openTab.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const blob = new Blob([json], { type: "application/json" });
      window.open(URL.createObjectURL(blob), "_blank");
    };
    tools.append(openTab);

    summary.append(label, tools);
    // The chrome gives the block a copy button.
    const pre = document.createElement("pre");
    pre.className = "smart-code short";
    SmartJson.renderJson(pre, artifact.value);
    details.append(summary, pre);
    host.append(details);
  }
}

// ------------------------------------------------------------------ render

const picker = document.getElementById("picker") as SmartCheckinPicker;
followPageTheme(picker);
let current: Settings;
let pickerSetup = "";

function render(): void {
  const s = readSettings();
  current = s;

  const scenarioSelect = el("scenario-select") as HTMLSelectElement;
  const options = Object.keys(DEMO_REQUESTS).map((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    return option;
  });
  if (s.scenarioKey === null) {
    const custom = document.createElement("option");
    custom.value = "";
    custom.textContent = "(custom request from URL)";
    options.push(custom);
  }
  scenarioSelect.replaceChildren(...options);
  scenarioSelect.value = s.scenarioKey ?? "";
  scenarioSelect.onchange = () => {
    const p = params();
    p.set("scenario", scenarioSelect.value);
    p.delete("request");
    location.hash = `#${p.toString()}`;
  };

  const afterSelect = el("submit-select") as HTMLSelectElement;
  afterSelect.value = s.after;
  afterSelect.onchange = () => setParam("post", afterSelect.value, "none");

  const bind = (id: string, key: string, value: string, fallback: string): void => {
    const input = el(id) as HTMLInputElement;
    input.value = value;
    input.placeholder = fallback;
    input.onchange = () => setParam(key, input.value.trim(), fallback);
  };
  bind("patient-input", "patient", s.patient, DEMO_PATIENT);
  bind("appointment-input", "appointment", s.appointment, DEMO_APPOINTMENT);
  bind("fhir-input", "fhir", s.fhirBase, DEFAULT_FHIR_BASE);
  bind("return-input", "returnUrl", s.returnUrl, "");
  bind("registry-input", "wallets", params().get("wallets") ?? "", DEFAULT_REGISTRY);
  void renderWalletSelect(s);

  const copyLink = el("copy-link") as HTMLButtonElement;
  copyLink.onclick = () => {
    void navigator.clipboard.writeText(location.href).then(() => {
      copyLink.textContent = "Copied";
      setTimeout(() => (copyLink.textContent = "Copy link to this setup"), 1200);
    });
  };

  // visit context
  const contextEl = el("visit-context");
  contextEl.innerHTML = "";
  const addContext = (label: string, value: string): void => {
    const span = document.createElement("span");
    const b = document.createElement("b");
    b.textContent = value;
    span.append(`${label} `, b);
    contextEl.append(span);
  };
  addContext(
    "Patient:",
    s.patient === DEMO_PATIENT ? `${DEMO_PATIENT_NAME} · ${s.patient}` : s.patient || "not linked",
  );
  addContext("Appointment:", s.appointment || "upcoming visit");
  if (s.after !== "none") addContext("Records go to:", s.fhirBase ? hostOf(s.fhirBase) : "nowhere — no FHIR base set");

  // requested items
  el("purpose-line").textContent = s.request.purpose
    ? `${s.request.purpose} — please share:`
    : "Please share the following before your visit:";
  const items = el("request-items");
  items.innerHTML = "";
  for (const item of s.request.items) {
    const li = document.createElement("li");
    const body = document.createElement("div");
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = item.title;
    body.append(title);
    if (item.summary) {
      const summary = document.createElement("div");
      summary.className = "item-summary";
      summary.textContent = item.summary;
      body.append(summary);
    }
    const chip = document.createElement("span");
    chip.className = "chip smart-chip";
    chip.textContent = item.required ? "requested" : "optional";
    li.append(body, chip);
    items.append(li);
  }

  artifacts.length = 0;
  showArtifact("request", "Check-in request (what this page asks for)", s.request);

  // the backend caution only applies when this page will actually post
  const note = el("backend-note");
  const ackWrap = el("backend-ack-wrap");
  const ack = el("backend-ack") as HTMLInputElement;
  const willPost = s.after !== "none" && !!s.fhirBase;
  const knownServer = KNOWN_OPEN_SERVERS.includes(s.fhirBase);
  const needsAck = willPost && !knownServer;
  note.hidden = s.after === "none";
  ackWrap.hidden = !needsAck;
  if (!willPost && s.after !== "none") {
    note.textContent = "No FHIR base is set, so nothing will be posted — the response stays in this page. Set one in Demo controls to post.";
  } else if (willPost) {
    note.textContent = knownServer
      ? "This page will post results to the public HAPI test server (periodically wiped — test data only)."
      : `Caution: this page will post shared data to ${hostOf(s.fhirBase)}. Only proceed with test data and a server you recognize.`;
  }

  // The picker: which wallets it offers comes from the URL; what it asks for
  // is the scenario. It stays inert until a posting caution is acknowledged.
  const setup = JSON.stringify([s.registry, s.wallet]);
  if (setup !== pickerSetup) {
    pickerSetup = setup;
    void setUpPicker(picker, { registry: s.registry, wallet: s.wallet });
  }
  picker.request = s.request;
  picker.reset();
  const gate = (): void => {
    picker.inert = needsAck && !ack.checked;
  };
  gate();
  ack.onchange = gate;
  el("outcome-section").hidden = true;
}

/** Demo controls: offer every wallet, or only one of them. */
let registryNames: { url: string; list: Promise<Array<{ id: string; name: string }>> } | undefined;
async function renderWalletSelect(s: Settings): Promise<void> {
  if (registryNames?.url !== s.registry) {
    registryNames = { url: s.registry, list: wallets({ registry: s.registry, platform: false }).catch(() => []) };
  }
  const listed = await registryNames.list;
  const select = el("wallet-select") as HTMLSelectElement;
  const choices: Array<[string, string]> = [
    ["", "every wallet"],
    ["platform", "the device's own wallet"],
    ...listed.map((w): [string, string] => [w.id, w.name]),
    ["mock", "the simulated response"],
  ];
  if (s.wallet && !choices.some(([id]) => id === s.wallet)) choices.push([s.wallet, `${s.wallet} (not in the registry)`]);
  select.replaceChildren(...choices.map(([value, label]) => Object.assign(document.createElement("option"), { value, textContent: label })));
  select.value = s.wallet ?? "";
  select.onchange = () => setParam("wallet", select.value);
}

// -------------------------------------------------------------------- flow

// The picker runs the check-in; this page takes it from the result.
picker.addEventListener("smart-checkin-response", (event) => {
  const { response } = event.detail;
  if (response) void checkedIn(current, response.json);
});
picker.addEventListener("smart-checkin-declined", () => renderOutcome("declined", current));
picker.addEventListener("smart-checkin-error", (event) => {
  // Only a check-in that started has an outcome; the picker shows the rest itself.
  const { wallet, message, code } = event.detail;
  if (wallet) renderOutcome("failed", current, undefined, code ? `${message} (${code})` : message);
});

async function checkedIn(s: Settings, response: SmartCheckinResponse): Promise<void> {
  try {
    showArtifact("response", "SMART response (verified and validated)", response);
    renderOutcome("completed", s, response);

    // From here it is ordinary application code. This page happens to post
    // FHIR using the optional helper; the check-in library was not involved.
    if (s.after !== "none" && s.fhirBase) {
      const bundle = buildCheckinBundle({
        request: s.request,
        response,
        context: { patient: s.patient, appointment: s.appointment },
      });
      showArtifact("bundle", "FHIR transaction Bundle (built by this app)", bundle.bundle);
      const posted = await postCheckinBundle(bundle, { fhirBase: s.fhirBase, mode: s.after });
      showArtifact("result", `Server response from ${hostOf(s.fhirBase)}`, posted.result);
      el("outcome-note").textContent = "Your information was delivered to the clinic's record system.";
      renderCreatedLinks(posted.result, s.fhirBase);
    } else {
      el("outcome-note").textContent =
        "The response stayed in this page. See Developer detail for exactly what came back.";
    }
  } catch (e) {
    renderOutcome("failed", s, undefined, e instanceof Error ? e.message : String(e));
  }
}

const HEADLINES: Record<string, string> = {
  completed: "You're checked in",
  declined: "Check-in cancelled",
  failed: "Check-in didn't finish",
};

const STATUS_TONE: Record<string, string> = { completed: "ok", failed: "bad" };

function renderOutcome(
  status: string,
  s: Settings,
  response?: SmartCheckinResponse,
  message?: string,
): void {
  const section = el("outcome-section");
  section.hidden = false;
  el("outcome-headline").textContent = HEADLINES[status] ?? status;
  el("outcome-status").textContent = status;
  el("outcome-status").className = `smart-chip ${STATUS_TONE[status] ?? ""}`;
  showShareLink(document.getElementById("share-link"), "clinic-demo", status);

  el("outcome-summary").textContent =
    status === "declined"
      ? "Nothing was shared. You can check in at the front desk instead."
      : (message ?? "");

  const explore = el("explore");
  explore.innerHTML = "";
  if (response) void explainResponse(s.request, response).then((view) => renderExplorer(explore, view));
  el("outcome-note").textContent = "";

  const returnWrap = el("return-wrap");
  returnWrap.innerHTML = "";
  if (s.returnUrl && status === "completed") {
    const a = document.createElement("a");
    a.className = "return-link smart-btn primary";
    a.href = s.returnUrl;
    a.textContent = "Continue check-in →";
    returnWrap.append(a);
  }
  section.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderCreatedLinks(result: unknown, fhirBase: string): void {
  const entries = (result as { entry?: Array<{ response?: { location?: string } }> })?.entry ?? [];
  const links = entries
    .map((entry) => entry.response?.location?.replace(/\/_history\/.*$/, ""))
    .filter((location): location is string => !!location);
  if (!links.length) return;
  const list = document.createElement("div");
  list.className = "dev-links";
  for (const location of links) {
    const a = document.createElement("a");
    a.className = "smart-btn sm mono";
    a.href = `${fhirBase}/${location}`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = `${location} ↗`;
    list.append(a);
  }
  el("return-wrap").append(list);
}

// ------------------------------------------------------------------ wiring

const toggle = el("demo-toggle") as HTMLButtonElement;
toggle.onclick = () => {
  const panel = el("demo-panel");
  const open = panel.hidden;
  panel.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
};

window.addEventListener("hashchange", render);

try {
  render();
} finally {
  // index.html keeps the panels invisible until this first render (no layout shift).
  document.querySelector("main")?.removeAttribute("data-pending");
}
