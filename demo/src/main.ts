/**
 * Demo entry: fragment params → CheckinConfig → runCheckin → results.
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
    scenarioKey,
    passthrough: passthroughRequest !== null,
    mock: params.get("mock") === "1",
    fhirBase,
    returnUrl,
  };
}

const el = (id: string): HTMLElement => document.getElementById(id)!;

let running = false;

function render(): void {
  const resolved = resolveConfig(parseFragment());
  const { config, scenarioKey, passthrough, mock, fhirBase } = resolved;

  // scenario chips
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

  const detail = el("scenario-detail");
  detail.innerHTML = "";
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = passthrough
    ? "Full request object passed through via #request= (overrides any scenario)."
    : SCENARIOS[scenarioKey!]!.description;
  detail.append(p);

  const requestShown = passthrough
    ? (config.request as { request: SmartCheckinRequest }).request
    : SCENARIOS[scenarioKey!]!.request;
  el("config-json").textContent = JSON.stringify(
    { config, resolvedRequest: requestShown },
    null,
    2,
  );

  // backend note + acknowledgment
  const note = el("backend-note");
  const ackWrap = el("backend-ack-wrap");
  const ack = el("backend-ack") as HTMLInputElement;
  const knownServer = KNOWN_OPEN_SERVERS.includes(fhirBase);
  if (knownServer) {
    note.textContent =
      "Submitting to the public HAPI test server (periodically wiped — test data only).";
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
      "This browser supports the Digital Credentials API — a wallet on this device can answer. Add mock=1 to the URL to use the built-in mock wallet instead.";
    updateStart();
  } else {
    statusNote.textContent = `Digital Credentials API not available here (${support.reason}). Add mock=1 to the URL fragment to run the flow with the built-in mock wallet.`;
    start.disabled = true;
  }
  ack.onchange = updateStart;

  start.onclick = () => void startCheckin(resolved);
  el("outcome-section").hidden = true;
}

async function startCheckin(resolved: Resolved): Promise<void> {
  const start = el("start") as HTMLButtonElement;
  running = true;
  start.disabled = true;
  start.textContent = "Waiting for wallet…";
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
    start.textContent = "Start check-in";
  }
}

function renderOutcome(outcome: CheckinOutcome, resolved: Resolved): void {
  const section = el("outcome-section");
  section.hidden = false;
  el("outcome-status").textContent = outcome.status;
  el("outcome-status").dataset.status = outcome.status;

  const summary = el("outcome-summary");
  summary.innerHTML = "";
  if (outcome.error) {
    summary.append(line(`Failed at the ${outcome.error.stage} stage: ${outcome.error.message}`));
  }
  if (outcome.status === "declined") {
    summary.append(line("The request was declined or dismissed — nothing was shared."));
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
  }

  const bundleBlock = el("outcome-bundle");
  if (outcome.submission) {
    bundleBlock.hidden = false;
    el("outcome-bundle-title").textContent =
      outcome.submission.mode === "dry-run"
        ? "Write plan (dry-run — nothing was posted)"
        : `Submitted to ${resolved.fhirBase}`;
    el("bundle-json").textContent = JSON.stringify(outcome.submission.bundle, null, 2);

    const linksWrap = el("created-links");
    linksWrap.innerHTML = "";
    const result = outcome.submission.result as
      | { entry?: Array<{ response?: { location?: string } }> }
      | undefined;
    if (result?.entry) {
      for (const entry of result.entry) {
        const location = entry.response?.location;
        if (!location) continue;
        const a = document.createElement("a");
        a.href = `${resolved.fhirBase}/${location.replace(/\/_history\/.*$/, "")}`;
        a.textContent = location.replace(/\/_history\/.*$/, "");
        a.target = "_blank";
        a.rel = "noreferrer";
        linksWrap.append(a);
      }
    }
  } else {
    bundleBlock.hidden = true;
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
  el("outcome-status").textContent = "error";
  el("outcome-status").dataset.status = "error";
  el("outcome-summary").textContent = message;
  el("outcome-items").innerHTML = "";
  el("outcome-bundle").hidden = true;
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
