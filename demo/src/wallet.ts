/**
 * Demo Health Wallet — a wallet **web app** that answers SMART Health
 * Check-in requests over the web-wallet postMessage protocol.
 *
 * It runs the real responder side: it parses the DeviceRequest, shows a
 * consent screen with per-item choice, then signs (COSE) and HPKE-seals a
 * DeviceResponse bound to the verifier's origin. The data it holds is
 * fabricated demo content — this is a stand-in for a platform wallet, not a
 * real record store.
 */

import {
  WEB_WALLET_READY_MESSAGE_TYPE,
  WEB_WALLET_REQUEST_MESSAGE_TYPE,
  WEB_WALLET_RESPONSE_MESSAGE_TYPE,
  buildMockResponse,
  parseWalletRequest,
  sealWalletResponse,
  type MockItemSpec, type MockItemSpecs, DEMO_HEALTH_CARD_JWS,
  type SmartCheckinRequest,
  type SmartCheckinRequestItem,
  type SmartCheckinResponse,
} from "../../src/index.js";

/**
 * Two demo wallets, holding different records, so a registry with more than
 * one entry means something: pick a different wallet and different data comes
 * back. `?brand=` selects one.
 */
/**
 * The records are coded the way US Core expects — SNOMED CT / RxNorm for
 * allergy substances, RxNorm for medications, CVX for vaccines, SNOMED CT for
 * problems — with a human `text` alongside every coding.
 */
type Coding = { system: string; code: string; display: string };

const SCT = "http://snomed.info/sct";
const RXNORM = "http://www.nlm.nih.gov/research/umls/rxnorm";
const CVX = "http://hl7.org/fhir/sid/cvx";

type Brand = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  prescriber: string;
  allergies: Array<{
    substance: string;
    coding: Coding;
    reactions?: Array<{ text: string; coding?: Coding }>;
    criticality?: string;
  }>;
  medications: Array<{ text: string; coding: Coding; dosage: string; authoredOn: string }>;
  immunizations: Array<{ vaccine: string; coding: Coding; date: string }>;
  conditions: Array<{ text: string; coding: Coding }>;
  coverage: { plan: string; payor: string; subscriberId: string; group: string };
};

const BRANDS: Record<string, Brand> = {
  demo: {
    id: "demo",
    name: "Demo Health Wallet",
    tagline: "holds your records on this device",
    accent: "#6aa8ff",
    prescriber: "Demo Primary Care",
    allergies: [
      {
        substance: "Penicillin",
        coding: { system: SCT, code: "373270004", display: "Penicillin antibacterial" },
        reactions: [
          { text: "Hives", coding: { system: SCT, code: "126485001", display: "Urticaria" } },
        ],
        criticality: "high",
      },
      {
        substance: "Peanut",
        coding: { system: SCT, code: "256349002", display: "Peanut - dietary" },
        reactions: [{ text: "Oral itching" }],
        criticality: "low",
      },
      {
        substance: "Sulfa drugs (sulfonamides)",
        coding: { system: SCT, code: "387406002", display: "Sulfonamide" },
      },
      {
        substance: "Latex",
        coding: { system: SCT, code: "111088007", display: "Latex" },
        criticality: "unable-to-assess",
      },
    ],
    medications: [
      {
        text: "Lisinopril 10 mg — once daily",
        coding: { system: RXNORM, code: "314076", display: "lisinopril 10 MG Oral Tablet" },
        dosage: "Once daily",
        authoredOn: "2025-04-02",
      },
      {
        text: "Metformin 500 mg — twice daily",
        coding: {
          system: RXNORM,
          code: "861007",
          display: "metformin hydrochloride 500 MG Oral Tablet",
        },
        dosage: "Twice daily",
        authoredOn: "2025-06-15",
      },
    ],
    immunizations: [
      {
        vaccine: "Influenza, seasonal, injectable",
        coding: { system: CVX, code: "141", display: "Influenza, seasonal, injectable" },
        date: "2025-10-12",
      },
      {
        vaccine: "COVID-19 mRNA vaccine",
        coding: {
          system: CVX,
          code: "208",
          display: "COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3 mL dose",
        },
        date: "2025-09-03",
      },
      {
        vaccine: "Tdap (tetanus, diphtheria, pertussis)",
        coding: { system: CVX, code: "115", display: "Tdap" },
        date: "2021-06-18",
      },
    ],
    conditions: [
      {
        text: "Hypertension",
        coding: { system: SCT, code: "38341003", display: "Hypertensive disorder" },
      },
      {
        text: "Type 2 diabetes",
        coding: { system: SCT, code: "44054006", display: "Type 2 diabetes mellitus" },
      },
    ],
    coverage: {
      plan: "Demo Health plan (PPO)",
      payor: "Demo Mutual",
      subscriberId: "DEMO-4417",
      group: "DEMO-GRP-8821",
    },
  },
  evergreen: {
    id: "evergreen",
    name: "Evergreen Patient App",
    tagline: "your records from Evergreen Family Health",
    accent: "#3ac2aa",
    prescriber: "Evergreen Family Health",
    allergies: [
      {
        substance: "Amoxicillin",
        coding: { system: RXNORM, code: "723", display: "amoxicillin" },
        reactions: [
          { text: "Rash", coding: { system: SCT, code: "271807003", display: "Eruption" } },
        ],
        criticality: "low",
      },
      {
        substance: "Shellfish",
        coding: { system: SCT, code: "300913006", display: "Allergy to shellfish" },
      },
    ],
    medications: [
      {
        text: "Atorvastatin 20 mg — nightly",
        coding: { system: RXNORM, code: "617310", display: "atorvastatin 20 MG Oral Tablet" },
        dosage: "Nightly",
        authoredOn: "2025-02-11",
      },
      {
        text: "Levothyroxine 75 mcg — each morning",
        coding: {
          system: RXNORM,
          code: "966222",
          display: "levothyroxine sodium 0.075 MG Oral Tablet",
        },
        dosage: "Each morning",
        authoredOn: "2024-11-20",
      },
    ],
    immunizations: [
      {
        vaccine: "Influenza, seasonal, injectable",
        coding: { system: CVX, code: "141", display: "Influenza, seasonal, injectable" },
        date: "2025-11-02",
      },
      {
        vaccine: "Zoster (shingles), recombinant",
        coding: { system: CVX, code: "187", display: "zoster recombinant" },
        date: "2024-04-19",
      },
    ],
    conditions: [
      {
        text: "Hyperlipidaemia",
        coding: { system: SCT, code: "55822004", display: "Hyperlipidemia" },
      },
    ],
    coverage: {
      plan: "Evergreen Choice (PPO)",
      payor: "Evergreen Health Plan",
      subscriberId: "EVG-9082",
      group: "EVG-GRP-102",
    },
  },
};

const brand =
  BRANDS[new URLSearchParams(location.search).get("brand") ?? "demo"] ?? BRANDS.demo!;

/** Answer each requested item out of this wallet's own records. */
function respond(request: SmartCheckinRequest): SmartCheckinResponse {
  const items: Record<string, MockItemSpecs> = {};
  for (const item of request.items) {
    const spec = specFor(item);
    // A signed card and the same facts as plain FHIR, when both are welcome.
    items[item.id] =
      "fhir" in spec && item.accept.includes("application/smart-health-card") && item.accept.includes("application/fhir+json")
        ? [{ healthCard: [DEMO_HEALTH_CARD_JWS] }, spec]
        : spec;
  }
  // One bundle for a summary item and any item its profiles already cover —
  // a wallet doesn't send the allergy list twice.
  for (const summary of request.items) {
    if (summary.content.kind !== "selection.fhir" || !summary.content.profilesFrom?.length) continue;
    const profiles = summary.content.profiles ?? [];
    const spec = items[summary.id];
    if (!spec || Array.isArray(spec) || !("fhir" in spec)) continue;
    const covered = request.items
      .filter((o) => o !== summary && o.content.kind === "selection.fhir" && o.content.profiles?.length && o.accept.includes("application/fhir+json"))
      .filter((o) => (o.content as { profiles?: readonly string[] }).profiles!.every((p) => profiles.includes(p)))
      .map((o) => o.id);
    if (!covered.length) continue;
    items[summary.id] = { ...spec, alsoFulfills: covered };
    for (const id of covered) delete items[id];
  }
  return buildMockResponse(request, { items });
}

function specFor(item: SmartCheckinRequestItem): MockItemSpec {
  const hints = `${item.title} ${item.summary ?? ""} ${JSON.stringify(item.content)}`.toLowerCase();
  const bundle = (resources: Record<string, unknown>[]): MockItemSpec => ({
    fhir: { resourceType: "Bundle", type: "collection", entry: resources.map((resource) => ({ resource })) },
  });
  const subject = { display: `${brand.name} demo patient` };

  if (item.content.kind === "form.fhir") {
    return {
      fhir: {
        resourceType: "QuestionnaireResponse",
        status: "completed",
        ...(item.content.questionnaireCanonical
          ? { questionnaire: item.content.questionnaireCanonical }
          : {}),
        item: [
          {
            linkId: "demo-1",
            text: item.title,
            answer: [{ valueString: `Answered in ${brand.name}` }],
          },
        ],
      },
    };
  }

  if (hints.includes("allerg")) {
    return bundle(
      brand.allergies.map((allergy) => ({
        resourceType: "AllergyIntolerance",
        clinicalStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
              code: "active",
              display: "Active",
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
              code: "confirmed",
              display: "Confirmed",
            },
          ],
        },
        code: { coding: [allergy.coding], text: allergy.substance },
        ...(allergy.criticality ? { criticality: allergy.criticality } : {}),
        ...(allergy.reactions
          ? {
              reaction: [
                {
                  manifestation: allergy.reactions.map((reaction) => ({
                    ...(reaction.coding ? { coding: [reaction.coding] } : {}),
                    text: reaction.text,
                  })),
                },
              ],
            }
          : {}),
        patient: subject,
      })),
    );
  }

  if (hints.includes("medication")) {
    return bundle(
      brand.medications.map((medication) => ({
        resourceType: "MedicationRequest",
        status: "active",
        intent: "order",
        reportedBoolean: true,
        medicationCodeableConcept: { coding: [medication.coding], text: medication.text },
        subject,
        authoredOn: medication.authoredOn,
        requester: { display: brand.prescriber },
        dosageInstruction: [{ text: medication.dosage }],
      })),
    );
  }

  if (hints.includes("immuniz") || hints.includes("vaccin")) {
    return bundle(
      brand.immunizations.map((immunization) => ({
        resourceType: "Immunization",
        status: "completed",
        vaccineCode: { coding: [immunization.coding], text: immunization.vaccine },
        patient: subject,
        occurrenceDateTime: immunization.date,
        primarySource: true,
      })),
    );
  }

  if (hints.includes("carin") || hints.includes("coverage") || hints.includes("insurance")) {
    return bundle([
      {
        resourceType: "Coverage",
        status: "active",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              code: "PPO",
              display: "preferred provider organization policy",
            },
          ],
          text: brand.coverage.plan,
        },
        subscriberId: brand.coverage.subscriberId,
        beneficiary: subject,
        relationship: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/subscriber-relationship",
              code: "self",
              display: "Self",
            },
          ],
        },
        period: { start: "2026-01-01" },
        payor: [{ display: brand.coverage.payor }],
        class: [
          {
            type: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/coverage-class",
                  code: "group",
                  display: "Group",
                },
              ],
            },
            value: brand.coverage.group,
            name: `${brand.coverage.payor} employer group`,
          },
        ],
      },
    ]);
  }

  return bundle(
    brand.conditions.map((condition) => ({
      resourceType: "Condition",
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
            display: "Active",
          },
        ],
      },
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/condition-category",
              code: "problem-list-item",
              display: "Problem List Item",
            },
          ],
        },
      ],
      code: { coding: [condition.coding], text: condition.text },
      subject,
    })),
  );
}

const el = (id: string): HTMLElement => document.getElementById(id)!;

type Pending = {
  requestId?: string;
  smartRequest: SmartCheckinRequest;
  encryptionInfoBytes: Uint8Array;
  verifierOrigin: string;
  replyTo: MessageEventSource;
  replyOrigin: string;
};

let pending: Pending | undefined;

function reply(message: Record<string, unknown>): void {
  if (!pending) return;
  (pending.replyTo as Window).postMessage(
    { type: WEB_WALLET_RESPONSE_MESSAGE_TYPE, requestId: pending.requestId, ...message },
    pending.replyOrigin,
  );
}

function showError(message: string): void {
  const error = el("error");
  error.hidden = false;
  error.textContent = message;
}

window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as { type?: string } | null;
  if (!data || typeof data !== "object" || data.type !== WEB_WALLET_REQUEST_MESSAGE_TYPE) return;
  if (!event.source) return;

  const message = data as {
    credentialRequestOptions?: unknown;
    requestId?: string;
    verifierOrigin?: string;
  };
  try {
    const parsed = parseWalletRequest(message.credentialRequestOptions);
    pending = {
      requestId: message.requestId,
      smartRequest: parsed.smartRequest,
      encryptionInfoBytes: parsed.encryptionInfoBytes,
      // The verifier tells us its origin; a platform wallet gets this from
      // the browser instead. Both sides must agree or the response won't open.
      verifierOrigin: message.verifierOrigin ?? event.origin,
      replyTo: event.source,
      replyOrigin: event.origin,
    };
    renderConsent(pending);
  } catch (e) {
    showError(`Could not read the request: ${e instanceof Error ? e.message : String(e)}`);
    pending = {
      requestId: message.requestId,
      smartRequest: {} as SmartCheckinRequest,
      encryptionInfoBytes: new Uint8Array(),
      verifierOrigin: event.origin,
      replyTo: event.source,
      replyOrigin: event.origin,
    };
    reply({ outcome: "error", message: e instanceof Error ? e.message : String(e) });
  }
});

function renderConsent(request: Pending): void {
  el("waiting").hidden = true;
  el("consent").hidden = false;
  el("requester-origin").textContent = request.verifierOrigin;
  el("purpose").textContent =
    request.smartRequest.purpose ?? "This site is asking for health information.";

  // Preview what this wallet would actually return, per item.
  const preview = respond(request.smartRequest);
  const previewByItem = new Map<string, string>();
  for (const artifact of preview.artifacts) {
    for (const itemId of artifact.fulfills) {
      previewByItem.set(itemId, describeArtifact(artifact));
    }
  }

  const list = el("items");
  list.innerHTML = "";
  for (const item of request.smartRequest.items) {
    const li = document.createElement("li");

    const top = document.createElement("div");
    top.className = "item-top";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.itemId = item.id;
    checkbox.id = `item-${item.id}`;
    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = item.title;
    label.append(title);
    if (item.summary) {
      const summary = document.createElement("div");
      summary.className = "item-summary";
      summary.textContent = item.summary;
      label.append(summary);
    }
    const previewText = previewByItem.get(item.id);
    if (previewText) {
      const previewEl = document.createElement("div");
      previewEl.className = "item-preview";
      previewEl.textContent = previewText;
      label.append(previewEl);
    }
    top.append(checkbox, label);
    li.append(top);
    list.append(li);
  }

  (el("share") as HTMLButtonElement).onclick = () => void share(request);
  (el("decline") as HTMLButtonElement).onclick = () => {
    reply({ outcome: "declined" });
    window.close();
  };
}

function describeArtifact(artifact: {
  mediaType: string;
  value?: unknown;
}): string {
  if (artifact.mediaType === "application/smart-health-card") {
    return "will share: a verifiable health card";
  }
  const value = artifact.value as { resourceType?: string; entry?: unknown[] } | undefined;
  if (value?.resourceType === "Bundle" && Array.isArray(value.entry)) {
    const types = value.entry
      .map((entry) => (entry as { resource?: { resourceType?: string } }).resource?.resourceType)
      .filter((t): t is string => !!t);
    const counts = new Map<string, number>();
    for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1);
    const summary = [...counts.entries()].map(([type, n]) => `${n}× ${type}`).join(", ");
    return `will share: ${summary || "no records"}`;
  }
  if (value?.resourceType) return `will share: 1× ${value.resourceType}`;
  return "will share: health data";
}

async function share(request: Pending): Promise<void> {
  const shareButton = el("share") as HTMLButtonElement;
  shareButton.disabled = true;
  shareButton.textContent = "Sharing…";
  try {
    const selected = new Set(
      [...document.querySelectorAll<HTMLInputElement>('#items input[type="checkbox"]')]
        .filter((input) => input.checked)
        .map((input) => input.dataset.itemId!),
    );
    const full = respond(request.smartRequest);
    // honour per-item consent: drop what wasn't selected
    const smartResponse: SmartCheckinResponse = {
      ...full,
      artifacts: full.artifacts.filter((a) => a.fulfills.some((id) => selected.has(id))),
      requestStatus: full.requestStatus.map((status) =>
        selected.has(status.item) ? status : { item: status.item, status: "declined" as const },
      ),
    };
    const credential = await sealWalletResponse({
      smartResponse,
      encryptionInfoBytes: request.encryptionInfoBytes,
      verifierOrigin: request.verifierOrigin,
    });
    reply({ outcome: "approved", credential });
    window.close();
  } catch (e) {
    showError(`Could not build the response: ${e instanceof Error ? e.message : String(e)}`);
    reply({ outcome: "error", message: e instanceof Error ? e.message : String(e) });
    shareButton.disabled = false;
    shareButton.textContent = "Share selected";
  }
}

// Brand this wallet instance.
document.title = brand.name;
const nameEl = document.querySelector(".wallet-name");
if (nameEl) nameEl.textContent = brand.name;
const tagEl = document.querySelector(".wallet-tag");
if (tagEl) tagEl.textContent = brand.tagline;
document.documentElement.style.setProperty("--accent", brand.accent);

// Tell the opener we're ready for a request.
if (window.opener) {
  (window.opener as Window).postMessage({ type: WEB_WALLET_READY_MESSAGE_TYPE }, "*");
} else {
  el("waiting").textContent =
    "Open this wallet from a check-in page — it answers requests sent to it.";
}
