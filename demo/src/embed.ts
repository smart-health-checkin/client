/** Embed example: register <smart-checkin> and display its event payload. */

import { defineSmartCheckin } from "../../src/element-register.ts";
import type { CheckinOutcome } from "../../src/index.ts";

defineSmartCheckin();

document.addEventListener("checkin-complete", (event) => {
  const outcome = (event as CustomEvent<CheckinOutcome>).detail;
  document.getElementById("outcome")!.textContent = JSON.stringify(outcome, null, 2);
});
