/**
 * Autofill POC: the provider's own data-collection form, prefilled by the
 * patient's app via `await requestCheckin(...)` — no FHIR submission, the
 * page keeps the response and populates its form inline.
 */

import {
  CheckinFlowError,
  createBrowserLocalAuthority,
  detectDcApiSupport,
  requestCheckin,
  resolveScenario,
} from "../../src/index.ts";

type AllergyRow = {
  name: string;
  detail: string;
  criticality?: string;
  decision: string;
  note: string;
};

const el = (id: string): HTMLElement => document.getElementById(id)!;
const mock = new URLSearchParams(location.hash.replace(/^#/, "")).get("mock") === "1";
const rows: AllergyRow[] = [];

function init(): void {
  const support = detectDcApiSupport();
  const note = el("status-note");
  const button = el("prefill") as HTMLButtonElement;
  if (mock) {
    note.textContent = "Mock wallet mode — fabricated demo allergies, no phone needed.";
  } else if (support.state === "supported") {
    note.textContent =
      "Your browser supports the Digital Credentials API. (Developers: add #mock=1 to use the built-in mock wallet.)";
  } else {
    note.textContent = `Digital Credentials API not available here (${support.reason}). Add #mock=1 to run with the built-in mock wallet.`;
    button.disabled = true;
  }
  button.onclick = () => void prefill();
  el("send").onclick = () => send();
}

async function prefill(): Promise<void> {
  const button = el("prefill") as HTMLButtonElement;
  button.disabled = true;
  button.textContent = "Waiting for your health app…";
  try {
    const response = await requestCheckin(resolveScenario("allergy-review").request, {
      mock,
      authority: createBrowserLocalAuthority({ origin: location.origin }),
    });
    rows.length = 0;
    for (const artifact of response.artifacts) {
      if (artifact.mediaType !== "application/fhir+json") continue;
      for (const resource of extractResources(artifact.value)) {
        if (resource.resourceType !== "AllergyIntolerance") continue;
        rows.push({
          name: codeText(resource) ?? "(unnamed allergy)",
          detail: reactionText(resource),
          criticality: typeof resource.criticality === "string" ? resource.criticality : undefined,
          decision: "confirm",
          note: "",
        });
      }
    }
    renderRows();
    el("status-note").textContent = rows.length
      ? `Prefilled ${rows.length} allergies from your app — review below.`
      : "Your app returned no allergy records — you can report that to the front desk.";
  } catch (e) {
    el("status-note").textContent =
      e instanceof CheckinFlowError && e.outcome.status === "declined"
        ? "Nothing was shared — you can fill the form at the front desk instead."
        : `Could not prefill: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    button.disabled = false;
    button.textContent = "Prefill from your health app";
  }
}

function renderRows(): void {
  el("review-card").hidden = rows.length === 0;
  const list = el("allergy-list");
  list.innerHTML = "";
  rows.forEach((row, index) => {
    const li = document.createElement("li");

    const head = document.createElement("div");
    head.className = "allergy-head";
    const name = document.createElement("span");
    name.className = "allergy-name";
    name.textContent = row.name;
    const detail = document.createElement("span");
    detail.className = "allergy-detail";
    detail.textContent = row.detail;
    head.append(name, detail);
    if (row.criticality) {
      const badge = document.createElement("span");
      badge.className = `badge${row.criticality === "high" ? " high" : ""}`;
      badge.textContent = `${row.criticality} risk`;
      head.append(badge);
    }

    const review = document.createElement("div");
    review.className = "review-row";
    const select = document.createElement("select");
    for (const [value, label] of [
      ["confirm", "Still accurate"],
      ["update", "Needs an update"],
      ["remove", "No longer an allergy"],
    ]) {
      const option = document.createElement("option");
      option.value = value!;
      option.textContent = label!;
      select.append(option);
    }
    select.value = row.decision;
    select.onchange = () => (rows[index]!.decision = select.value);
    const input = document.createElement("input");
    input.placeholder = "Add a note for your care team (optional)";
    input.oninput = () => (rows[index]!.note = input.value);
    review.append(select, input);

    li.append(head, review);
    list.append(li);
  });
}

function send(): void {
  el("sent-card").hidden = false;
  el("sent-json").textContent = JSON.stringify(
    {
      summary: "Patient-reviewed allergy list (prefilled from the patient's app)",
      source: "SMART Health Check-in — requestCheckin()",
      review: rows.map((row) => ({
        allergy: row.name,
        patientDecision: row.decision,
        ...(row.note ? { note: row.note } : {}),
      })),
    },
    null,
    2,
  );
  el("sent-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function extractResources(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object") return [];
  const v = value as Record<string, unknown>;
  if (v.resourceType === "Bundle" && Array.isArray(v.entry)) {
    return v.entry
      .map((entry) => (entry as { resource?: unknown }).resource)
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
  }
  if (typeof v.resourceType === "string") return [v];
  return [];
}

function codeText(resource: Record<string, unknown>): string | undefined {
  const code = resource.code as { text?: unknown } | undefined;
  return typeof code?.text === "string" ? code.text : undefined;
}

function reactionText(resource: Record<string, unknown>): string {
  const reactions = resource.reaction;
  if (!Array.isArray(reactions)) return "";
  const texts: string[] = [];
  for (const reaction of reactions) {
    const manifestations = (reaction as { manifestation?: unknown }).manifestation;
    if (!Array.isArray(manifestations)) continue;
    for (const manifestation of manifestations) {
      const text = (manifestation as { text?: unknown }).text;
      if (typeof text === "string") texts.push(text);
    }
  }
  return texts.length ? `reaction: ${texts.join(", ")}` : "";
}

init();
