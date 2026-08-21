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

type Resolved = {
  config: CheckinConfig;
  /** The exact SMART request that will ride in the wallet request. */
  request: SmartCheckinRequest;
  scenarioKey: string | null;
  passthrough: boolean;
  mock: boolean;
  fhirBase: string;
  returnUrl?: string;
};

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
  const config: CheckinConfig = {
    request: passthroughRequest ? { request: passthroughRequest } : { scenario: scenarioKey! },
    context: {
      ...(params.get("patient") ? { patient: params.get("patient")! } : {}),
      ...(params.get("appointment") ? { appointment: params.get("appointment")! } : {}),
    },
    submit: {
      fhirBase,
      mode: submitMode === "individual" || submitMode === "dry-run" ? submitMode : "transaction",
    },
    ...(returnUrl ? { complete: { returnUrl } } : {}),
  };
  return {
    config,
    request: passthroughRequest ?? SCENARIOS[scenarioKey!]!.request,
    scenarioKey,
    passthrough: passthroughRequest !== null,
    mock: params.get("mock") === "1",
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
  const { config, request, scenarioKey, passthrough, mock, fhirBase } = resolved;

  // demo bar: scenario chips
  const links = el("scenario-links");
  links.replaceChildren(
    ...Object.keys(SCENARIOS).map((key) => {
      const a = document.createElement("a");
      a.textContent = key;
      const params = parseFragment();
      params.set("scenario", key);
      params.delete("request");
      a.href = `#${params.toString()}`;
      if (key === scenarioKey) a.setAttribute("aria-current", "true");
      return a;
    }),
  );
  el("demo-note").textContent = passthrough
    ? "· full request passed via #request="
    : mock
      ? "· mock wallet on"
      : "";

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
  addContext("Patient:", config.context?.patient ?? "not linked");
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
  if (mock) {
    statusNote.textContent =
      "Mock wallet mode: the request is answered locally with fabricated demo data (real CBOR/COSE/HPKE) — no phone needed.";
    updateStart();
  } else if (support.state === "supported") {
    statusNote.textContent =
      "Your browser supports the Digital Credentials API — a health app on this device can answer. (Developers: add mock=1 to the URL to use the built-in mock wallet.)";
    updateStart();
  } else {
    statusNote.textContent = `Digital Credentials API not available here (${support.reason}). Add mock=1 to the URL fragment to run the flow with the built-in mock wallet.`;
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
      resolved.mock
        ? { getCredential: createMockWalletCredentialGetter({ origin: location.origin }) }
        : {},
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
