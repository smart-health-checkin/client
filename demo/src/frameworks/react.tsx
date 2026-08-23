/** React example: the same flow, rendered by React via the useCheckin hook. */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserLocalAuthority,
  createWebWalletCredentialGetter,
} from "../../../src/index.js";
import { useCheckin } from "./use-checkin.js";

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
  const { status, response, error, start } = useCheckin(REQUEST, {
    authority: createBrowserLocalAuthority({ origin: location.origin }),
    getCredential: createWebWalletCredentialGetter({ walletUrl: "./wallet.html" }),
  });

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

      <button className="smart-btn primary" onClick={() => void start()} disabled={status === "waiting"}>
        {status === "waiting" ? "Waiting for your health app…" : "Prefill from your health app"}
      </button>

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
