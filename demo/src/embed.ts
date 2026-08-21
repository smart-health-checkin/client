/**
 * Embed example: register <smart-checkin>, define the page's own scenario
 * with registerScenario (no canned templates), and display the event payload.
 */

import { defineSmartCheckin } from "../../src/element-register.ts";
import { registerScenario, type CheckinOutcome } from "../../src/index.ts";

defineSmartCheckin();

registerScenario("visit-prep", {
  purpose: "A quick wellness check before today's visit",
  items: [
    {
      id: "phq2",
      title: "PHQ-2 questionnaire",
      required: true,
      content: {
        kind: "form.fhir",
        questionnaireCanonical: "https://fhir.loinc.org/Questionnaire/55757-9",
      },
      accept: ["application/fhir+json"],
    },
  ],
});

document.addEventListener("checkin-complete", (event) => {
  const outcome = (event as CustomEvent<CheckinOutcome>).detail;
  document.getElementById("outcome")!.textContent = JSON.stringify(outcome, null, 2);
});
