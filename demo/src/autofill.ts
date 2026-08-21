/**
 * Autofill sketch: the provider's own form, prefilled by the patient's app
 * via `await requestCheckin(...)`, which then asks only for what the shared
 * record couldn't carry.
 *
 * Deliberately compact — this gestures at the capability rather than being a
 * production intake form. Two taps fill a gap: a symptom chip and a severity.
 */

import {
  CheckinFlowError,
  createBrowserLocalAuthority,
  createMockWalletCredentialGetter,
  createWebWalletCredentialGetter,
  detectDcApiSupport,
  requestCheckin,
} from "../../src/index.ts";

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

/** Severe tags are flagged so the care team sees them at a glance. */
const SYMPTOM_TAGS: Array<{ label: string; severe?: boolean }> = [
  { label: "Rash" },
  { label: "Itching" },
  { label: "Swelling" },
  { label: "GI upset" },
  { label: "Breathing", severe: true },
  { label: "Anaphylaxis", severe: true },
];

const SEVERITIES = ["mild", "moderate", "severe"] as const;
type Severity = (typeof SEVERITIES)[number] | "";

type Row = {
  name: string;
  /** What the record already said (empty = the gap we're here to fill). */
  reportedReactions: string[];
  criticality?: string;
  symptoms: Set<string>;
  severity: Severity;
  removed: boolean;
  gaps: { reaction: boolean; severity: boolean };
  /** Complete rows collapse; this reopens one. */
  expanded?: boolean;
};

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

const rows: Row[] = [];
let outputTab: "fhir" | "native" = "fhir";

// US Core requires substance + clinical status; reaction and criticality are
// optional, so records routinely arrive without them.
const gapsFor = (reactions: string[], criticality?: string) => ({
  reaction: reactions.length === 0,
  severity: !criticality || criticality === "unable-to-assess",
});

const needsDetail = (row: Row): boolean =>
  !row.removed &&
  ((row.gaps.reaction && row.symptoms.size === 0) || (row.gaps.severity && !row.severity));

function init(): void {
  const support = detectDcApiSupport();
  const note = el("status-note");
  const button = el("prefill") as HTMLButtonElement;
  if (wallet === "app") {
    note.textContent = "Demo wallet app: a wallet window opens where you choose what to share.";
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
  el("send").onclick = () => finalize();
  for (const tab of document.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
    tab.onclick = () => {
      outputTab = tab.dataset.tab as "fhir" | "native";
      renderOutput();
    };
  }
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
        const criticality =
          typeof resource.criticality === "string" ? resource.criticality : undefined;
        rows.push({
          name: codeText(resource) ?? "(unnamed allergy)",
          reportedReactions: reactions,
          criticality,
          symptoms: new Set(
            SYMPTOM_TAGS.filter((tag) => reactions.some((r) => matchesTag(tag.label, r))).map(
              (tag) => tag.label,
            ),
          ),
          severity: "",
          removed: false,
          gaps: gapsFor(reactions, criticality),
        });
      }
    }
    const missing = rows.filter(needsDetail).length;
    el("status-note").textContent = !rows.length
      ? "Your app returned no allergy records."
      : missing
        ? `${rows.length} allergies came from your app. ${missing} ${missing === 1 ? "is" : "are"} missing detail your record doesn't carry — only those need you.`
        : `${rows.length} allergies came from your app, all complete.`;
    el("review-card").hidden = false;
    render();
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

function render(): void {
  const list = el("allergy-list");
  list.innerHTML = "";
  // Incomplete rows first: that's the only part that needs the patient.
  const ordered = [...rows].sort((a, b) => Number(needsDetail(b)) - Number(needsDetail(a)));

  for (const row of ordered) {
    const index = rows.indexOf(row);
    const li = document.createElement("li");
    li.className = row.removed ? "removed" : needsDetail(row) ? "gap" : "done";

    const head = document.createElement("div");
    head.className = "line";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = row.name;
    const said = document.createElement("span");
    said.className = "said";
    said.textContent = row.reportedReactions.length
      ? row.reportedReactions.join(", ")
      : "allergen only";
    head.append(name, said);

    const state = document.createElement("span");
    state.className = "state";
    if (row.removed) state.textContent = "removed";
    else if (needsDetail(row)) state.textContent = "needs you";
    else state.textContent = summaryOf(row) || (row.criticality ?? "");
    head.append(state);

    const remove = document.createElement("button");
    remove.className = "linkish";
    remove.type = "button";
    remove.textContent = row.removed ? "undo" : "not mine";
    remove.onclick = () => {
      rows[index]!.removed = !rows[index]!.removed;
      render();
    };
    head.append(remove);
    li.append(head);

    // Controls appear only while a row needs input (or was reopened).
    if (!row.removed && (needsDetail(row) || row.expanded)) {
      const ask = document.createElement("div");
      ask.className = "ask";
      ask.textContent = row.gaps.reaction
        ? "Record doesn't say what happens — tap what you get, and how bad:"
        : "What happens, and how bad?";
      const controls = document.createElement("div");
      controls.className = "controls";

      for (const tag of SYMPTOM_TAGS) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = tag.label;
        chip.setAttribute("aria-pressed", String(row.symptoms.has(tag.label)));
        if (tag.severe) chip.dataset.severe = "1";
        chip.onclick = () => {
          const set = rows[index]!.symptoms;
          if (set.has(tag.label)) set.delete(tag.label);
          else set.add(tag.label);
          render();
        };
        controls.append(chip);
      }

      const sev = document.createElement("span");
      sev.className = "sev";
      for (const level of SEVERITIES) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = level;
        button.setAttribute("aria-pressed", String(row.severity === level));
        button.onclick = () => {
          rows[index]!.severity = rows[index]!.severity === level ? "" : level;
          render();
        };
        sev.append(button);
      }
      controls.append(sev);
      li.append(ask, controls);
    } else if (!row.removed && (row.symptoms.size || row.severity)) {
      const change = document.createElement("button");
      change.className = "linkish change";
      change.type = "button";
      change.textContent = "change";
      change.onclick = () => {
        rows[index]!.expanded = true;
        render();
      };
      li.append(change);
    }

    list.append(li);
  }

  const outstanding = rows.filter(needsDetail).length;
  const progress = el("progress");
  progress.textContent = !rows.length
    ? ""
    : outstanding
      ? `${outstanding} still ${outstanding === 1 ? "needs" : "need"} a detail your record doesn't have.`
      : "Everything the clinic asked for is filled in.";
  progress.className = outstanding ? "progress outstanding" : "progress";
  renderOutput();
}

function summaryOf(row: Row): string {
  const parts = [...row.symptoms];
  if (row.severity) parts.push(row.severity);
  return parts.join(" · ");
}

// ---------------------------------------------------------------- output

/**
 * The same reviewed data in two shapes. Which one an EHR wants is entirely
 * its own business: the check-in page is ordinary application code, so it can
 * write standard FHIR, its own internal model, or both.
 */
function asFhir(): unknown {
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: rows
      .filter((row) => !row.removed)
      .map((row) => ({
        resource: {
          resourceType: "AllergyIntolerance",
          clinicalStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                code: "active",
              },
            ],
          },
          code: { text: row.name },
          ...(row.severity
            ? { criticality: row.severity === "severe" ? "high" : "low" }
            : row.criticality
              ? { criticality: row.criticality }
              : {}),
          ...(row.symptoms.size
            ? {
                reaction: [
                  {
                    manifestation: [...row.symptoms].map((text) => ({ text })),
                    ...(row.severity ? { severity: row.severity } : {}),
                  },
                ],
              }
            : {}),
        },
        request: { method: "POST", url: "AllergyIntolerance" },
      })),
  };
}

function asNative(): unknown {
  return {
    checkinPacket: "ALLERGY_REVIEW",
    encounter: "ENC-88213",
    reviewedBy: "PATIENT",
    items: rows.map((row) => ({
      allergen: row.name,
      status: row.removed ? "REMOVED_BY_PT" : "CONFIRMED_BY_PT",
      reactions: [...row.symptoms].map((s) => s.toUpperCase().replace(/ /g, "_")),
      severity: row.severity ? row.severity.slice(0, 3).toUpperCase() : null,
      ptSupplied: [
        ...(row.gaps.reaction && row.symptoms.size ? ["REACTION"] : []),
        ...(row.gaps.severity && row.severity ? ["SEVERITY"] : []),
      ],
      needsNurseReview: row.symptoms.has("Anaphylaxis") || row.severity === "severe",
    })),
  };
}

function renderOutput(): void {
  if (el("sent-card").hidden) return;
  for (const tab of document.querySelectorAll<HTMLButtonElement>("[data-tab]")) {
    tab.setAttribute("aria-pressed", String(tab.dataset.tab === outputTab));
  }
  el("sent-json").textContent = JSON.stringify(
    outputTab === "fhir" ? asFhir() : asNative(),
    null,
    2,
  );
  el("tab-note").textContent =
    outputTab === "fhir"
      ? "Standard FHIR: reaction manifestations and criticality populated from what the patient just told you, ready to POST."
      : "Or the EHR's own model — same review, native codes, routing flags. The check-in page decides; the protocol never sees this.";
}

function finalize(): void {
  el("sent-card").hidden = false;
  renderOutput();
  el("sent-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---------------------------------------------------------------- helpers

function matchesTag(tagLabel: string, reactionText: string): boolean {
  const tag = tagLabel.toLowerCase();
  const reaction = reactionText.toLowerCase();
  return reaction.includes(tag) || tag.includes(reaction.split(" ")[0]!);
}

function extractResources(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object") return [];
  const v = value as Record<string, unknown>;
  if (v.resourceType === "Bundle" && Array.isArray(v.entry)) {
    return v.entry
      .map((entry) => (entry as { resource?: unknown }).resource)
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
  }
  return typeof v.resourceType === "string" ? [v] : [];
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
