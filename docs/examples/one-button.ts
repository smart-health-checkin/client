/**
 * The live example of "One button for the phone's wallet" in the Wallet
 * picker guide (docs/wallets.md; the snippet is one-button.html). The code
 * after the setup is the guide's, with a simulated wallet standing in for
 * platformWallet(), so it runs in any browser and answers as the example's
 * Outcome says.
 */
import { customWallet, platformWallet, type CheckinResponse, type CheckinResult } from "../../src/index.js";
import { DEMO_REQUESTS } from "../../demo/src/requests.js";
import { simulatedSession, type Outcome } from "./simulated.js";

const root = document.querySelector<HTMLElement>("[data-button-example]");
if (root) {
  const myRequest = DEMO_REQUESTS["allergy-review"]!.request;
  const outcome = root.querySelector<HTMLSelectElement>("[data-pg='outcome']")!;
  const allergies = root.querySelector<HTMLTextAreaElement>("[data-pg='allergies']")!;
  const prefillMyForm = (response: CheckinResponse) => {
    const names = response.resources("allergies", { type: "AllergyIntolerance" }).map((r) => {
      const code = r.code as { text?: string; coding?: Array<{ display?: string }> } | undefined;
      return code?.text ?? code?.coding?.[0]?.display ?? "An allergy with no name";
    });
    allergies.value = names.join("\n");
  };

  // From here on, the guide's code.
  const button = document.querySelector<HTMLButtonElement>("#fill-from-app")!;
  const note = document.querySelector<HTMLElement>("#checkin-note")!;
  const phone = customWallet({ id: "platform", kind: "platform", name: platformWallet().name, open: () => simulatedSession(() => outcome.value as Outcome) });
  button.hidden = !phone.available;

  button.onclick = async () => {
    const running = phone.start(myRequest); // first, inside the click
    button.disabled = true;
    note.textContent = "Waiting for your health app…";
    showOutcome(await running);
    button.disabled = false;
  };

  function showOutcome(result: CheckinResult) {
    if (result.status === "completed") {
      prefillMyForm(result.response);
      note.textContent = "Filled in from your health app. Please check it.";
    } else if (result.status === "declined") {
      note.textContent = "Nothing was shared. Please fill in the form.";
    } else if (result.status === "failed") {
      note.textContent = "That didn't work. Please fill in the form.";
      console.warn("check-in failed:", result.error.code, result.error.message);
    }
  }
}
