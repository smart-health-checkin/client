/**
 * Autofill POC: the provider's own data-collection form, prefilled by the
 * patient's app via `await requestCheckin(...)` — no FHIR submission, the
 * page keeps the response and populates its form inline.
 */

import {
  CheckinFlowError,
  createBrowserLocalAuthority,
  createMockWalletCredentialGetter,
  createWebWalletCredentialGetter,
  detectDcApiSupport,
  requestCheckin,
} from "../../src/index.ts";

// The request is defined inline, right where it's used — the kit fills in
// the type/version/id boilerplate. This is the primary integration ergonomic.
const ALLERGY_REVIEW = {
  purpose: "Review your allergy list before your visit",
  items: [
    {
      id: "allergies",
      title: "Allergies and intolerances",
      summary: "Your current allergy list, so you can review and correct it.",
      required: true,
      content: {
        kind: "selection.fhir" as const,
        profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
      },
      accept: ["application/fhir+json"],
    },
  ],
};

type AllergyRow = {
  name: string;
  detail: string;
  criticality?: string;
  decision: "confirm" | "update" | "remove";
  /** Symptom tags the patient adds — the detail the record usually lacks. */
  symptoms: Set<string>;
  severity: "" | "mild" | "moderate" | "severe";
  note: string;
  /** True when the patient added this row rather than the wallet. */
  addedByPatient?: boolean;
};

/** Symptom vocabulary for the demo (severe ones flagged for the care team). */
const SYMPTOM_TAGS: Array<{ label: string; severe?: boolean }> = [
  { label: "Hives / rash" },
  { label: "Itching" },
  { label: "Swelling" },
  { label: "Stomach upset" },
  { label: "Wheezing", severe: true },
  { label: "Trouble breathing", severe: true },
  { label: "Anaphylaxis", severe: true },
];

const el = (id: string): HTMLElement => document.getElementById(id)!;
const params = new URLSearchParams(location.hash.replace(/^#/, ""));
const walletParam = params.get("wallet") ?? (params.get("mock") === "1" ? "auto" : params.get("mock"));
const wallet: "platform" | "app" | "auto" =
  walletParam === "app" ? "app" : walletParam === "auto" ? "auto" : "platform";
const credentialGetter =
  wallet === "app"
    ? createWebWalletCredentialGetter({ walletUrl: "./wallet.html" })
    : wallet === "auto"
      ? createMockWalletCredentialGetter({ origin: location.origin })
      : undefined;
const rows: AllergyRow[] = [];

function init(): void {
  const support = detectDcApiSupport();
  const note = el("status-note");
  const button = el("prefill") as HTMLButtonElement;
  if (wallet === "app") {
    note.textContent =
      "Demo wallet app: a wallet window opens where you choose what to share.";
  } else if (wallet === "auto") {
    note.textContent = "Automatic mock wallet — fabricated demo allergies, no consent screen.";
  } else if (support.state === "supported") {
    note.textContent =
      "Your browser supports the Digital Credentials API. (No wallet here? Add #wallet=app for the demo wallet window.)";
  } else {
    note.textContent = `Digital Credentials API not available here (${support.reason}). Add #wallet=app to run with the demo wallet window.`;
    button.disabled = true;
  }
  button.onclick = () => void prefill();
  el("send").onclick = () => send();
  el("add-allergy").onclick = () => addAllergy();
}

async function prefill(): Promise<void> {
  const button = el("prefill") as HTMLButtonElement;
  button.disabled = true;
  button.textContent = "Waiting for your health app…";
  try {
    const response = await requestCheckin(ALLERGY_REVIEW, {
      authority: createBrowserLocalAuthority({ origin: location.origin }),
      ...(credentialGetter ? { getCredential: credentialGetter } : {}),
    });
    rows.length = 0;
    for (const artifact of response.artifacts) {
      if (artifact.mediaType !== "application/fhir+json") continue;
      for (const resource of extractResources(artifact.value)) {
        if (resource.resourceType !== "AllergyIntolerance") continue;
        const reactions = reactionTexts(resource);
        rows.push({
          name: codeText(resource) ?? "(unnamed allergy)",
          detail: reactions.length ? `reported reaction: ${reactions.join(", ")}` : "",
          criticality: typeof resource.criticality === "string" ? resource.criticality : undefined,
          decision: "confirm",
          // Pre-select tags that match what the record already says, so the
          // patient is confirming rather than starting from nothing.
          symptoms: new Set(
            SYMPTOM_TAGS.filter((tag) =>
              reactions.some((r) => tag.label.toLowerCase().split(" ")[0]!.startsWith(r.toLowerCase().split(" ")[0]!.slice(0, 4)) ||
                r.toLowerCase().includes(tag.label.toLowerCase().split(" ")[0]!)),
            ).map((tag) => tag.label),
          ),
          severity: "",
          note: "",
        });
      }
    }
    renderRows();
    el("status-note").textContent = rows.length
      ? `Prefilled ${rows.length} allergies from your app — review and add detail below.`
      : "Your app returned no allergy records — add any you know of below.";
    el("review-card").hidden = false;
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
  const list = el("allergy-list");
  list.innerHTML = "";
  rows.forEach((row, index) => {
    const li = document.createElement("li");
    if (row.decision === "remove") li.className = "row-removed";

    const head = document.createElement("div");
    head.className = "allergy-head";
    const name = document.createElement("span");
    name.className = "allergy-name";
    name.textContent = row.name;
    const detail = document.createElement("span");
    detail.className = "allergy-detail";
    detail.textContent = row.addedByPatient ? "added by you" : row.detail;
    head.append(name, detail);
    if (row.criticality) {
      const badge = document.createElement("span");
      badge.className = `badge${row.criticality === "high" ? " high" : ""}`;
      badge.textContent = `${row.criticality} risk`;
      head.append(badge);
    }
    li.append(head);

    const decisionRow = document.createElement("div");
    decisionRow.className = "review-row";
    const decision = document.createElement("select");
    for (const [value, label] of [
      ["confirm", "Still accurate"],
      ["update", "Needs an update"],
      ["remove", "No longer an allergy"],
    ] as const) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      decision.append(option);
    }
    decision.value = row.decision;
    decision.onchange = () => {
      rows[index]!.decision = decision.value as AllergyRow["decision"];
      renderRows();
    };
    const severity = document.createElement("select");
    for (const [value, label] of [
      ["", "How bad? (optional)"],
      ["mild", "Mild"],
      ["moderate", "Moderate"],
      ["severe", "Severe"],
    ] as const) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      severity.append(option);
    }
    severity.value = row.severity;
    severity.onchange = () => (rows[index]!.severity = severity.value as AllergyRow["severity"]);
    decisionRow.append(decision, severity);
    li.append(decisionRow);

    if (row.decision !== "remove") {
      const tagsLabel = document.createElement("div");
      tagsLabel.className = "field-label";
      tagsLabel.textContent = "What happens when you're exposed?";
      const tags = document.createElement("div");
      tags.className = "tags";
      for (const tag of SYMPTOM_TAGS) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tag";
        button.textContent = tag.label;
        button.setAttribute("aria-pressed", String(row.symptoms.has(tag.label)));
        if (tag.severe) button.dataset.severe = "1";
        button.onclick = () => {
          const set = rows[index]!.symptoms;
          if (set.has(tag.label)) set.delete(tag.label);
          else set.add(tag.label);
          button.setAttribute("aria-pressed", String(set.has(tag.label)));
        };
        tags.append(button);
      }
      li.append(tagsLabel, tags);

      const noteRow = document.createElement("div");
      noteRow.className = "review-row";
      const input = document.createElement("input");
      input.placeholder = "Anything else your care team should know (optional)";
      input.value = row.note;
      input.oninput = () => (rows[index]!.note = input.value);
      noteRow.append(input);
      li.append(noteRow);
    }

    list.append(li);
  });
}

function addAllergy(): void {
  const name = prompt("What are you allergic to?");
  if (!name?.trim()) return;
  rows.push({
    name: name.trim(),
    detail: "",
    decision: "update",
    symptoms: new Set(),
    severity: "",
    note: "",
    addedByPatient: true,
  });
  renderRows();
}

function send(): void {
  el("sent-card").hidden = false;
  el("sent-json").textContent = JSON.stringify(
    {
      summary: "Patient-reviewed allergy list (prefilled from the patient's app)",
      source: "SMART Health Check-in — requestCheckin()",
      review: rows.map((row) => ({
        allergy: row.name,
        origin: row.addedByPatient ? "added-by-patient" : "from-patient-app",
        patientDecision: row.decision,
        ...(row.decision !== "remove" && row.symptoms.size
          ? { symptoms: [...row.symptoms] }
          : {}),
        ...(row.severity ? { severity: row.severity } : {}),
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

function reactionTexts(resource: Record<string, unknown>): string[] {
  const reactions = resource.reaction;
  if (!Array.isArray(reactions)) return [];
  const texts: string[] = [];
  for (const reaction of reactions) {
    const manifestations = (reaction as { manifestation?: unknown }).manifestation;
    if (!Array.isArray(manifestations)) continue;
    for (const manifestation of manifestations) {
      const text = (manifestation as { text?: unknown }).text;
      if (typeof text === "string") texts.push(text);
    }
  }
  return texts;
}

init();
