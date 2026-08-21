/**
 * Demo entry: fragment params → CheckinConfig → runCheckin → results.
 *
 * The page is styled as a plausible (fictional) clinic check-in surface;
 * everything technical lives in the DEVELOPER DETAIL section, where each
 * artifact can be expanded inline or opened as raw JSON in a new tab.
 * `mock=1` answers the request with the kit's built-in mock wallet (real
 * CBOR/COSE/HPKE, fabricated demo data) so the flow runs with no phone.
 */

import {
  SCENARIOS,
  createMockWalletCredentialGetter,
  createWebWalletCredentialGetter,
  createBrowserLocalAuthority,
  detectDcApiSupport,
  runCheckin,
  type CheckinConfig,
  type CheckinOutcome,
  type SmartCheckinRequest,
} from "../../src/index.ts";

const DEFAULT_FHIR_BASE = "https://hapi.fhir.org/baseR4";
const KNOWN_OPEN_SERVERS = [DEFAULT_FHIR_BASE];
const DEFAULT_SCENARIO = "insurance-only";
/** The demo is bound to a fictional patient on the public test server. */
const DEMO_PATIENT = "Patient/example";
const DEMO_PATIENT_NAME = "Jordan Reyes (demo)";
const DEMO_APPOINTMENT = "Appointment/demo-visit";

function parseFragment(): URLSearchParams {
  return new URLSearchParams(location.hash.replace(/^#/, ""));
}

function decodeRequestParam(value: string): SmartCheckinRequest | null {
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64)) as SmartCheckinRequest;
  } catch {
    return null;
  }
}

/**
 * Which responder answers the request:
 * - "platform": the browser's Digital Credentials API (a real wallet)
 * - "app": the demo wallet **web app** in a popup — a real consent screen
 * - "auto": non-interactive mock; answers instantly with fabricated data
 */
type WalletMode = "platform" | "app" | "auto";

type Resolved = {
  config: CheckinConfig;
  /** The exact SMART request that will ride in the wallet request. */
  request: SmartCheckinRequest;
  scenarioKey: string | null;
  passthrough: boolean;
  wallet: WalletMode;
  fhirBase: string;
  returnUrl?: string;
};

function resolveWalletMode(params: URLSearchParams): WalletMode {
  const wallet = params.get("wallet");
  if (wallet === "app" || wallet === "auto" || wallet === "platform") return wallet;
  // back-compat: mock=1 meant the non-interactive mock
  const mock = params.get("mock");
  if (mock === "app") return "app";
  if (mock === "1" || mock === "auto") return "auto";
  return "platform";
}

function credentialHooks(wallet: WalletMode): { getCredential?: (o: unknown) => Promise<unknown> } {
  if (wallet === "app") {
    return { getCredential: createWebWalletCredentialGetter({ walletUrl: "./wallet.html" }) };
  }
  if (wallet === "auto") {
    return { getCredential: createMockWalletCredentialGetter({ origin: location.origin }) };
  }
  return {};
}

function resolveConfig(params: URLSearchParams): Resolved {
  const rawRequest = params.get("request");
  const passthroughRequest = rawRequest ? decodeRequestParam(rawRequest) : null;
  const scenarioKey = passthroughRequest
    ? null
    : params.get("scenario") && SCENARIOS[params.get("scenario")!]
      ? params.get("scenario")!
      : DEFAULT_SCENARIO;

  const submitMode = params.get("submit");
  const fhirBase = params.get("fhir") ?? DEFAULT_FHIR_BASE;
  const returnUrl = params.get("returnUrl") ?? undefined;
  const request = passthroughRequest ?? SCENARIOS[scenarioKey!]!.request;
  const patient = params.get("patient") ?? DEMO_PATIENT;
  const appointment = params.get("appointment") ?? DEMO_APPOINTMENT;
  // The config shown to developers carries the request itself — a scenario is
  // just how this demo page picks one, never something an integrator writes.
  const config: CheckinConfig = {
    request: { request },
    context: {
      ...(patient ? { patient } : {}),
      ...(appointment ? { appointment } : {}),
    },
    submit: {
      fhirBase,
      mode: submitMode === "individual" || submitMode === "dry-run" ? submitMode : "transaction",
    },
    ...(returnUrl ? { complete: { returnUrl } } : {}),
  };
  return {
    config,
    request,
    scenarioKey,
    passthrough: passthroughRequest !== null,
    wallet: resolveWalletMode(params),
    fhirBase,
    returnUrl,
  };
}

const el = (id: string): HTMLElement => document.getElementById(id)!;

let running = false;
const devViews = new Map<string, string>();

function setDevView(view: string, value: unknown, preId: string): void {
  const json = JSON.stringify(value, null, 2);
  devViews.set(view, json);
  el(preId).textContent = json;
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".copy-btn")) {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const json = devViews.get(button.dataset.copy!);
    if (!json) return;
    void navigator.clipboard.writeText(json).then(() => {
      const original = button.textContent;
      button.textContent = "copied";
      setTimeout(() => (button.textContent = original), 1200);
    });
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".open-tab")) {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const json = devViews.get(button.dataset.view!);
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    window.open(URL.createObjectURL(blob), "_blank");
  });
}

function render(): void {
  const resolved = resolveConfig(parseFragment());
  const { config, request, scenarioKey, passthrough, wallet, fhirBase } = resolved;

  // demo bar: scenario dropdown
  const select = el("scenario-select") as HTMLSelectElement;
  select.replaceChildren(
    ...Object.keys(SCENARIOS).map((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      return option;
    }),
    ...(passthrough
      ? [
          (() => {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "(custom request via URL)";
            return option;
          })(),
        ]
      : []),
  );
  select.value = passthrough ? "" : scenarioKey!;
  select.onchange = () => {
    if (!select.value) return;
    const params = parseFragment();
    params.set("scenario", select.value);
    params.delete("request");
    location.hash = `#${params.toString()}`;
  };
  const setParam = (key: string, value: string, dropWhen?: string): void => {
    const params = parseFragment();
    if (!value || value === dropWhen) params.delete(key);
    else params.set(key, value);
    if (key === "wallet") params.delete("mock");
    location.hash = `#${params.toString()}`;
  };

  const walletSelect = el("wallet-select") as HTMLSelectElement;
  walletSelect.value = wallet;
  walletSelect.onchange = () => setParam("wallet", walletSelect.value, "platform");

  const submitSelect = el("submit-select") as HTMLSelectElement;
  submitSelect.value = config.submit?.mode ?? "transaction";
  submitSelect.onchange = () => setParam("submit", submitSelect.value, "transaction");

  const bindInput = (id: string, key: string, current: string, fallback: string): void => {
    const input = el(id) as HTMLInputElement;
    input.value = current;
    input.placeholder = fallback;
    input.onchange = () => setParam(key, input.value.trim(), fallback);
  };
  bindInput("patient-input", "patient", config.context?.patient ?? "", DEMO_PATIENT);
  bindInput("appointment-input", "appointment", config.context?.appointment ?? "", DEMO_APPOINTMENT);
  bindInput("fhir-input", "fhir", fhirBase, DEFAULT_FHIR_BASE);
  bindInput("return-input", "returnUrl", resolved.returnUrl ?? "", "");

  // visit context
  const context: string[] = [];
  const contextEl = el("visit-context");
  contextEl.innerHTML = "";
  const addContext = (label: string, value: string): void => {
    const span = document.createElement("span");
    const b = document.createElement("b");
    b.textContent = value;
    span.append(`${label} `, b);
    contextEl.append(span);
  };
  const patientRef = config.context?.patient;
  addContext(
    "Patient:",
    patientRef === DEMO_PATIENT ? `${DEMO_PATIENT_NAME} · ${patientRef}` : patientRef ?? "not linked",
  );
  addContext("Appointment:", config.context?.appointment ?? "upcoming visit");
  addContext("Records destination:", (() => {
    try { return new URL(fhirBase).host; } catch { return fhirBase; }
  })());
  void context;

  // requested items, patient-facing
  el("purpose-line").textContent = request.purpose
    ? `${request.purpose} — please share:`
    : "Please share the following before your visit:";
  const items = el("request-items");
  items.innerHTML = "";
  for (const item of request.items) {
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

  // developer views (named for what they are — no invented keys)
  setDevView("config", config, "config-json");
  setDevView("request", request, "request-json");

  // backend note + acknowledgment
  const note = el("backend-note");
  const ackWrap = el("backend-ack-wrap");
  const ack = el("backend-ack") as HTMLInputElement;
  const knownServer = KNOWN_OPEN_SERVERS.includes(fhirBase);
  if (knownServer) {
    note.textContent =
      "Demo backend: the public HAPI test server (periodically wiped — test data only).";
    ackWrap.hidden = true;
  } else {
    let host = fhirBase;
    try {
      host = new URL(fhirBase).host;
    } catch {
      /* show raw value */
    }
    note.textContent = `Caution: this link submits shared data to ${host}. Only proceed with test data and a server you recognize.`;
    ackWrap.hidden = false;
  }

  // wallet-path note + start button
  const support = detectDcApiSupport();
  const statusNote = el("status-note");
  const start = el("start") as HTMLButtonElement;
  const updateStart = (): void => {
    start.disabled = running || (!knownServer && !ack.checked);
  };
  if (wallet === "app") {
    statusNote.textContent =
      "Demo wallet app: the request opens in a wallet window where you choose what to share. Real CBOR/COSE/HPKE, fabricated demo records — no phone needed.";
    updateStart();
  } else if (wallet === "auto") {
    statusNote.textContent =
      "Automatic mock wallet: the request is answered instantly with fabricated demo data, no consent screen. Useful for scripted testing.";
    updateStart();
  } else if (support.state === "supported") {
    statusNote.textContent =
      "Your browser supports the Digital Credentials API — a health app on this device can answer. No wallet on this device? Switch the responder to \"demo wallet app\" above.";
    updateStart();
  } else {
    statusNote.textContent = `Digital Credentials API not available here (${support.reason}). Switch the responder to "demo wallet app" above to run the flow anyway.`;
    start.disabled = true;
  }
  ack.onchange = updateStart;

  start.onclick = () => void startCheckin(resolved);
  el("outcome-section").hidden = true;
  el("dev-response").hidden = true;
  el("outcome-bundle").hidden = true;
  el("dev-result").hidden = true;
}

async function startCheckin(resolved: Resolved): Promise<void> {
  const start = el("start") as HTMLButtonElement;
  running = true;
  start.disabled = true;
  start.textContent = "Waiting for your health app…";
  try {
    const outcome = await runCheckin(
      {
        ...resolved.config,
        authority: createBrowserLocalAuthority({ origin: location.origin }),
      },
      credentialHooks(resolved.wallet),
    );
    renderOutcome(outcome, resolved);
  } catch (e) {
    renderFailure(e instanceof Error ? e.message : String(e));
  } finally {
    running = false;
    start.disabled = false;
    start.textContent = "Check in with your health app";
  }
}

const HEADLINES: Record<CheckinOutcome["status"], string> = {
  completed: "You're checked in",
  declined: "Check-in cancelled",
  unsupported: "Check-in isn't available in this browser",
  error: "Check-in didn't finish",
};

function renderOutcome(outcome: CheckinOutcome, resolved: Resolved): void {
  const section = el("outcome-section");
  section.hidden = false;
  el("outcome-headline").textContent = HEADLINES[outcome.status];
  el("outcome-status").textContent = outcome.status;
  el("outcome-status").dataset.status = outcome.status;

  const summary = el("outcome-summary");
  summary.innerHTML = "";
  if (outcome.error) {
    summary.append(line(`Failed at the ${outcome.error.stage} stage: ${outcome.error.message}`));
  }
  if (outcome.status === "declined") {
    summary.append(line("Nothing was shared. You can check in at the front desk instead."));
  }

  const itemsTable = el("outcome-items");
  itemsTable.innerHTML = "";
  if (outcome.response) {
    const statusById = new Map(outcome.response.requestStatus.map((s) => [s.item, s.status]));
    for (const item of outcome.request.items) {
      const row = document.createElement("tr");
      const fulfilledBy = outcome.response.artifacts
        .filter((a) => a.fulfills.includes(item.id))
        .map((a) => a.mediaType)
        .join(", ");
      row.innerHTML = `<td>${escapeHtml(item.title)}</td><td>${escapeHtml(
        statusById.get(item.id) ?? "—",
      )}</td><td>${escapeHtml(fulfilledBy || "—")}</td>`;
      itemsTable.append(row);
    }
    el("dev-response").hidden = false;
    setDevView("response", outcome.response, "response-json");
  }

  if (outcome.submission) {
    el("outcome-bundle-title").textContent =
      outcome.submission.mode === "dry-run"
        ? "Dry run: nothing was sent — the write plan is in Developer detail below."
        : "Your information was delivered to the clinic's record system.";
    el("outcome-bundle").hidden = false;
    el("bundle-summary-label").textContent =
      outcome.submission.mode === "dry-run"
        ? "FHIR write plan (dry-run — not posted)"
        : `FHIR transaction (posted to ${resolved.fhirBase})`;
    setDevView("bundle", outcome.submission.bundle, "bundle-json");

    const linksWrap = el("created-links");
    linksWrap.innerHTML = "";
    if (outcome.submission.result !== undefined) {
      el("dev-result").hidden = false;
      setDevView("result", outcome.submission.result, "result-json");
      const result = outcome.submission.result as
        | { entry?: Array<{ response?: { location?: string } }> }
        | undefined;
      for (const entry of result?.entry ?? []) {
        const location = entry.response?.location;
        if (!location) continue;
        const a = document.createElement("a");
        a.href = `${resolved.fhirBase}/${location.replace(/\/_history\/.*$/, "")}`;
        a.textContent = `${location.replace(/\/_history\/.*$/, "")} ↗`;
        a.target = "_blank";
        a.rel = "noreferrer";
        linksWrap.append(a);
      }
    }
  } else {
    el("outcome-bundle-title").textContent = "";
  }

  const returnWrap = el("return-wrap");
  returnWrap.innerHTML = "";
  if (resolved.returnUrl && outcome.status === "completed") {
    const a = document.createElement("a");
    a.className = "return-link";
    a.href = resolved.returnUrl;
    a.textContent = "Continue check-in →";
    returnWrap.append(a);
  }

  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderFailure(message: string): void {
  const section = el("outcome-section");
  section.hidden = false;
  el("outcome-headline").textContent = HEADLINES.error;
  el("outcome-status").textContent = "error";
  el("outcome-status").dataset.status = "error";
  el("outcome-summary").textContent = message;
  el("outcome-items").innerHTML = "";
}

function line(text: string): HTMLParagraphElement {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

window.addEventListener("hashchange", render);
render();
