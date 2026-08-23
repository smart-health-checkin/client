/** React example: the same flow, rendered by React via the useCheckin hook. */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { ResponderPolicy } from "../../../src/index.js";
import { useCheckin } from "./use-checkin.js";

// What this page accepts, and which one leads. The demo wallet leads because
// it works in any browser; a real deployment would more likely say "platform".
const POLICY: ResponderPolicy = {
  platform: true,
  webWallets: "./wallets.json",
  mock: true,
  default: "demo",
  origin: location.origin,
};

const REQUEST = {
  purpose: "Confirm your medications before your visit",
  items: [
    {
      id: "meds",
      title: "Medication list",
      summary: "What you're currently taking.",
      required: true,
      content: {
        kind: "selection.fhir" as const,
        profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"],
      },
      accept: ["application/fhir+json"],
    },
  ],
};

function MedicationCheckin() {
  const { status, response, error, responders, start } = useCheckin(REQUEST, POLICY);

  const medications =
    response?.artifacts
      .filter((a) => a.mediaType === "application/fhir+json")
      .flatMap((a) => resourcesOf(a.value))
      .filter((r) => r.resourceType === "MedicationRequest")
      .map((r) => medicationText(r)) ?? [];

  return (
    <div className="card">
      <h2>Medication review</h2>
      <p className="muted">
        Rendered by React. The check-in call is the same plain async function
        the vanilla and Angular examples use.
      </p>

      {/* Rendering is the page's business: one control per responder, the default leading. */}
      <div className="choices">
        {responders.map((r) => (
          <button
            key={r.id}
            className={r.isDefault ? "smart-btn primary" : "smart-btn"}
            disabled={!r.available || status === "waiting"}
            title={r.reason ?? r.description ?? ""}
            onClick={() => void start(r)}
          >
            {r.kind === "platform" ? "Prefill from my health app" : r.name}
          </button>
        ))}
      </div>
      {status === "waiting" && <p className="note">Waiting for the wallet…</p>}

      {status === "declined" && <p className="note">Nothing was shared — fill the form manually.</p>}
      {status === "error" && <p className="note error">{error}</p>}

      {medications.length > 0 && (
        <ul className="meds">
          {medications.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function resourcesOf(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object") return [];
  const v = value as Record<string, unknown>;
  if (v.resourceType === "Bundle" && Array.isArray(v.entry)) {
    return v.entry
      .map((entry) => (entry as { resource?: unknown }).resource)
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
  }
  return typeof v.resourceType === "string" ? [v] : [];
}

function medicationText(resource: Record<string, unknown>): string {
  const code = resource.medicationCodeableConcept as { text?: string } | undefined;
  return code?.text ?? "(unnamed medication)";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MedicationCheckin />
  </StrictMode>,
);
