/**
 * Demo app: a fictional clinic's check-in page.
 *
 * The point of the code below is the shape of the integration:
 *
 *   const response = await requestCheckin(request, { getCredential });
 *   // …then this page decides what to do with it.
 *
 * Posting to FHIR happens explicitly afterwards, using the optional `fhir`
 * helper — the check-in kit itself has no idea a FHIR server exists.
 */

import {
  SCENARIOS,
  CheckinFlowError,
  createBrowserLocalAuthority,
  createMockWalletCredentialGetter,
  createWebWalletCredentialGetter,
  detectDcApiSupport,
  requestCheckin,
  type SmartCheckinRequest,
  type SmartCheckinResponse,
} from "../../src/index.ts";
import { buildCheckinBundle, postCheckinBundle, type PostMode } from "../../src/fhir/index.ts";

const DEFAULT_FHIR_BASE = "https://hapi.fhir.org/baseR4";
const KNOWN_OPEN_SERVERS = [DEFAULT_FHIR_BASE];
const DEFAULT_SCENARIO = "insurance-only";
const DEMO_PATIENT = "Patient/example";
const DEMO_PATIENT_NAME = "Jordan Reyes (demo)";
const DEMO_APPOINTMENT = "Appointment/demo-visit";

type WalletMode = "platform" | "app" | "auto";
type AfterMode = "none" | PostMode;

type Settings = {
  request: SmartCheckinRequest;
  scenarioKey: string | null;
  wallet: WalletMode;
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
    : p.get("scenario") && SCENARIOS[p.get("scenario")!]
      ? p.get("scenario")!
      : DEFAULT_SCENARIO;
  const after = p.get("post");
  const walletParam = p.get("wallet") ?? (p.get("mock") === "1" ? "auto" : p.get("mock"));
  return {
    request: passthrough ?? SCENARIOS[scenarioKey!]!.request,
    scenarioKey,
    wallet: walletParam === "app" || walletParam === "auto" ? walletParam : "platform",
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
  if (key === "wallet") p.delete("mock");
  location.hash = `#${p.toString()}`;
}

function credentialGetter(wallet: WalletMode): ((o: unknown) => Promise<unknown>) | undefined {
  if (wallet === "app") return createWebWalletCredentialGetter({ walletUrl: "./wallet.html" });
  if (wallet === "auto") return createMockWalletCredentialGetter({ origin: location.origin });
  return undefined;
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
    details.className = "artifact";

    const summary = document.createElement("summary");
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = artifact.label;

    const tools = document.createElement("span");
    tools.className = "tools";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "copy";
    copy.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      void navigator.clipboard.writeText(json).then(() => {
        copy.textContent = "copied";
        setTimeout(() => (copy.textContent = "copy"), 1200);
      });
    };
    const openTab = document.createElement("button");
    openTab.type = "button";
    openTab.textContent = "open ↗";
    openTab.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const blob = new Blob([json], { type: "application/json" });
      window.open(URL.createObjectURL(blob), "_blank");
    };
    tools.append(copy, openTab);

    summary.append(label, tools);
    const pre = document.createElement("pre");
    pre.textContent = json;
    details.append(summary, pre);
    host.append(details);
  }
}

// ------------------------------------------------------------------ render

let running = false;

function render(): void {
  const s = readSettings();

  const scenarioSelect = el("scenario-select") as HTMLSelectElement;
  const options = Object.keys(SCENARIOS).map((key) => {
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

  const walletSelect = el("wallet-select") as HTMLSelectElement;
  walletSelect.value = s.wallet;
  walletSelect.onchange = () => setParam("wallet", walletSelect.value, "platform");

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
  if (s.after !== "none") addContext("Records go to:", hostOf(s.fhirBase));

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
    chip.className = "chip";
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
  const knownServer = KNOWN_OPEN_SERVERS.includes(s.fhirBase);
  const needsAck = s.after !== "none" && !knownServer;
  note.hidden = s.after === "none";
  ackWrap.hidden = !needsAck;
  if (s.after !== "none") {
    note.textContent = knownServer
      ? "This page will post results to the public HAPI test server (periodically wiped — test data only)."
      : `Caution: this page will post shared data to ${hostOf(s.fhirBase)}. Only proceed with test data and a server you recognize.`;
  }

  const support = detectDcApiSupport();
  const statusNote = el("status-note");
  const start = el("start") as HTMLButtonElement;
  const updateStart = (): void => {
    start.disabled = running || (needsAck && !ack.checked);
  };
  if (s.wallet === "app") {
    statusNote.textContent =
      "Demo wallet app: opens in a new tab where you choose what to share. Real CBOR/COSE/HPKE over fabricated records — no phone needed.";
    updateStart();
  } else if (s.wallet === "auto") {
    statusNote.textContent =
      "Automatic mock wallet: answers instantly with fabricated data and no consent screen — for scripted testing.";
    updateStart();
  } else if (support.state === "supported") {
    statusNote.textContent =
      "Your browser supports the Digital Credentials API — a health app on this device can answer. No wallet here? Switch the responder in Demo controls.";
    updateStart();
  } else {
    statusNote.textContent = `Digital Credentials API not available here (${support.reason}). Switch the responder in Demo controls to run the flow anyway.`;
    start.disabled = true;
  }
  ack.onchange = updateStart;

  start.onclick = () => void checkIn(s);
  el("outcome-section").hidden = true;
}

// -------------------------------------------------------------------- flow

async function checkIn(s: Settings): Promise<void> {
  const start = el("start") as HTMLButtonElement;
  running = true;
  start.disabled = true;
  start.textContent = "Waiting for your health app…";

  try {
    // 1. Ask, and await the validated response. This is the entire kit API.
    const getCredential = credentialGetter(s.wallet);
    const response = await requestCheckin(s.request, {
      authority: createBrowserLocalAuthority({ origin: location.origin }),
      ...(getCredential ? { getCredential } : {}),
    });
    showArtifact("response", "SMART response (verified and validated)", response);
    renderOutcome("completed", s, response);

    // 2. From here it is ordinary application code. This page happens to post
    //    FHIR using the optional helper — the kit was not involved.
    if (s.after !== "none") {
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
        "The response stayed in this page — see Developer detail for exactly what came back.";
    }
  } catch (e) {
    if (e instanceof CheckinFlowError) {
      renderOutcome(e.outcome.status, s, e.outcome.response, e.outcome.error?.message);
    } else {
      renderOutcome("error", s, undefined, e instanceof Error ? e.message : String(e));
    }
  } finally {
    running = false;
    start.disabled = false;
    start.textContent = "Check in with your health app";
  }
}

const HEADLINES: Record<string, string> = {
  completed: "You're checked in",
  declined: "Check-in cancelled",
  unsupported: "Check-in isn't available in this browser",
  error: "Check-in didn't finish",
};

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
  el("outcome-status").dataset.status = status;

  el("outcome-summary").textContent =
    status === "declined"
      ? "Nothing was shared. You can check in at the front desk instead."
      : (message ?? "");

  const table = el("outcome-items");
  table.innerHTML = "";
  if (response) {
    const statusById = new Map(response.requestStatus.map((r) => [r.item, r.status]));
    for (const item of s.request.items) {
      const row = document.createElement("tr");
      const sharedAs = response.artifacts
        .filter((a) => a.fulfills.includes(item.id))
        .map((a) => a.mediaType)
        .join(", ");
      for (const text of [item.title, statusById.get(item.id) ?? "—", sharedAs || "—"]) {
        const cell = document.createElement("td");
        cell.textContent = text;
        row.append(cell);
      }
      table.append(row);
    }
  }
  el("outcome-note").textContent = "";

  const returnWrap = el("return-wrap");
  returnWrap.innerHTML = "";
  if (s.returnUrl && status === "completed") {
    const a = document.createElement("a");
    a.className = "return-link";
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
render();
