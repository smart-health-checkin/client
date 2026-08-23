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
type Brand = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  allergies: Array<{ substance: string; reactions?: string[]; criticality?: string }>;
  medications: string[];
  conditions: string[];
};

const BRANDS: Record<string, Brand> = {
  demo: {
    id: "demo",
    name: "Demo Health Wallet",
    tagline: "holds your records on this device",
    accent: "#6aa8ff",
    allergies: [
      { substance: "Penicillin", reactions: ["Hives"], criticality: "high" },
      { substance: "Peanut", reactions: ["Oral itching"], criticality: "low" },
      { substance: "Sulfa drugs (sulfonamides)" },
      { substance: "Latex", criticality: "unable-to-assess" },
    ],
    medications: ["Lisinopril 10 mg — once daily", "Metformin 500 mg — twice daily"],
    conditions: ["Hypertension", "Type 2 diabetes"],
  },
  evergreen: {
    id: "evergreen",
    name: "Evergreen Patient App",
    tagline: "your records from Evergreen Family Health",
    accent: "#3ac2aa",
    allergies: [
      { substance: "Amoxicillin", reactions: ["Rash"], criticality: "low" },
      { substance: "Shellfish" },
    ],
    medications: ["Atorvastatin 20 mg — nightly", "Levothyroxine 75 mcg — each morning"],
    conditions: ["Hyperlipidaemia"],
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
            },
          ],
        },
        code: { text: allergy.substance },
        ...(allergy.criticality ? { criticality: allergy.criticality } : {}),
        ...(allergy.reactions
          ? { reaction: [{ manifestation: allergy.reactions.map((text) => ({ text })) }] }
          : {}),
        patient: subject,
      })),
    );
  }

  if (hints.includes("medication")) {
    return bundle(
      brand.medications.map((text) => ({
        resourceType: "MedicationRequest",
        status: "active",
        intent: "order",
        medicationCodeableConcept: { text },
        subject,
      })),
    );
  }

  if (hints.includes("carin") || hints.includes("coverage") || hints.includes("insurance")) {
    return bundle([
      {
        resourceType: "Coverage",
        status: "active",
        type: { text: `${brand.name} plan` },
        subscriberId: brand.id === "demo" ? "DEMO-4417" : "EVG-9082",
        beneficiary: subject,
      },
    ]);
  }

  return bundle(
    brand.conditions.map((text) => ({
      resourceType: "Condition",
      clinicalStatus: {
        coding: [
          { system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" },
        ],
      },
      code: { text },
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
