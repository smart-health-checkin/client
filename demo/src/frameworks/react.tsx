/** React example: <CheckinPicker> from @smart-health-checkin/client/react. */

import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import type { CheckinResponse } from "../../../src/index.js";
import { CheckinPicker } from "../../../src/react/index.js";

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
  const [response, setResponse] = useState<CheckinResponse | undefined>();
  const [note, setNote] = useState<string | undefined>();

  const medications = response?.resources("meds", { type: "MedicationRequest" }).map(medicationText) ?? [];

  return (
    <div className="card">
      <h2>Medication review</h2>
      <p className="muted">
        Rendered by React. The picker is the same element every page uses,
        wrapped as a component with callbacks.
      </p>

      <CheckinPicker
        request={REQUEST}
        registry="./wallets.json"
        mock
        heading="Confirm your medications"
        description="Bring in your medication list from a health app you use."
        onResponse={({ response }) => { setResponse(response); setNote(undefined); }}
        onDeclined={() => setNote("Nothing was shared. Fill in the list yourself.")}
        onError={({ message }) => setNote(message)}
      />

      {note && <p className="note">{note}</p>}
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

function medicationText(resource: Record<string, unknown>): string {
  const code = resource.medicationCodeableConcept as { text?: string } | undefined;
  return code?.text ?? "(unnamed medication)";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MedicationCheckin />
  </StrictMode>,
);
