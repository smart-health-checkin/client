/**
 * The demos' `<smart-checkin-picker>` setup, shared by the clinic demo, the
 * form autofill demo, and the kiosk's phone page.
 *
 * By default the picker offers the phone's own wallet (where this browser can
 * reach it), the web wallets in `./wallets.json`, and the simulated response
 * (the `mock` attribute). Two URL fragment options change that:
 *
 * - `wallets=<url>`: a different wallet registry.
 * - `wallet=<id>`: offer only that wallet: `platform`, `mock`, or a registry id
 *   such as `demo`. An id the registry doesn't have is ignored.
 *
 * Each page also calls `followPageTheme(picker)` from site.ts, so a dark page
 * gets a dark picker.
 */
import "../../src/ui/index.js";
import type { SmartCheckinPicker } from "../../src/ui/index.js";
import { wallets } from "../../src/index.js";

export const DEFAULT_REGISTRY = "./wallets.json";

export type PickerChoice = { registry: string; wallet: string | null };

export function pickerChoice(params: URLSearchParams): PickerChoice {
  return { registry: params.get("wallets") || DEFAULT_REGISTRY, wallet: params.get("wallet") || null };
}

/** Point a picker at the wallets `choice` asks for. */
export async function setUpPicker(picker: SmartCheckinPicker, choice: PickerChoice): Promise<void> {
  picker.wallets = undefined;
  for (const name of ["registry", "platform", "mock"]) picker.removeAttribute(name);

  if (choice.wallet === "platform") return; // the platform wallet is on unless platform="off"
  if (choice.wallet === "mock") {
    picker.setAttribute("platform", "off");
    picker.setAttribute("mock", "");
    return;
  }
  if (choice.wallet) {
    const listed = await wallets({ registry: choice.registry, platform: false }).catch(() => []);
    const only = listed.filter((w) => w.id === choice.wallet);
    if (only.length) {
      picker.wallets = only;
      return;
    }
  }
  picker.setAttribute("registry", choice.registry);
  picker.setAttribute("mock", "");
}
