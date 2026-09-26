// Demo of <smart-checkin-picker>: canned situations (a fixed responder list,
// so any browser can show the phone-wallet cases) and a live mode.
import { customWallet, platformWallet, webWallet, type Wallet } from "../../src/index.js";
import { STARBURST_ICON_URL, type SmartCheckinPicker } from "../../src/ui/index.js";
import { DEMO_REQUESTS } from "./requests.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const picker = $("picker") as SmartCheckinPicker & HTMLElement;
const log = $("log");

const glyph = (bg: string, fg: string, path: string) =>
  "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`);

const WALLETS: Array<[string, string, string, string?]> = [
  ["smart-testing-wallet", "SMART Testing Wallet", "Reference wallet with synthetic patients", STARBURST_ICON_URL],
  ["flexpa", "Flexpa Health Wallet", "Your records from insurers and providers"],
  ["juniper", "Juniper Health", "Health records on the web", glyph("#2F6B4F", "#E8F3EC", "M24 8c7 6 10 12 10 18a10 10 0 0 1-20 0c0-6 3-12 10-18z")],
  ["harbor", "Harbor Health Records", "Records from Harbor clinics", glyph("#1D3557", "#F1FAEE", "M10 30h28l-4 8H14zM23 10h2v18h-2zM25 12l10 12H25z")],
  ["pocket", "Pocket Chart", "Carry your chart with you"],
  ["lantern", "Lantern", "Personal health record", glyph("#F4A261", "#264653", "M18 12h12v4H18zM16 18h16l-2 16H18zM20 36h8v3h-8z")],
  ["meridian", "Meridian Health App", "From Meridian Health System"],
  ["aspen", "Aspen PHR", "Personal health record", glyph("#6D597A", "#FFF", "M24 9l12 22H12zM22 31h4v8h-4z")],
  ["carecard", "CareCard", "Insurance and health cards", glyph("#E63946", "#FFF", "M10 16h28v18H10zM10 20h28v4H10z")],
];

// A platform wallet that looks available (or not) whatever this browser is, for the canned situations.
const platform = (available: boolean): Wallet => {
  const real = platformWallet();
  return customWallet({ id: "platform", kind: "platform", name: real.name, available, open: real.open });
};
const webWallets = (n: number): Wallet[] =>
  WALLETS.slice(0, n).map(([id, name, description, iconUrl]) =>
    webWallet({ id, name, description, walletUrl: "./wallet.html", ...(iconUrl ? { iconUrl } : {}) }));

const SITUATIONS: Record<string, () => Wallet[] | undefined> = {
  live: () => undefined,
  connectathon: () => [platform(true), ...webWallets(2)],
  "no-api": () => [platform(false), ...webWallets(2)],
  "platform-only": () => [platform(true)],
  one: () => [platform(false), ...webWallets(1)],
  five: () => [platform(true), ...webWallets(5)],
  nine: () => [platform(true), ...webWallets(9)],
  none: () => [platform(false)],
};

function apply(): void {
  const situation = ($("situation") as HTMLSelectElement).value;
  const skin = ($("skin") as HTMLSelectElement).value;
  const theme = ($("theme") as HTMLSelectElement).value;
  $("clinic").className = `clinic skin-${skin}${theme === "dark" ? " dark" : ""}`;
  picker.setAttribute("theme", theme);
  picker.toggleAttribute("remember", ($("remember") as HTMLSelectElement).value === "on");
  if (($("appearance") as HTMLSelectElement).value === "flat") picker.setAttribute("appearance", "flat");
  else picker.removeAttribute("appearance");
  if (situation === "live") {
    picker.removeAttribute("mode");
    picker.setAttribute("registry", "./wallets.json");
    picker.setAttribute("mock", "");
    picker.wallets = undefined;
  } else {
    picker.setAttribute("mode", "pick"); // canned lists: choosing is the demo; nothing runs
    picker.wallets = SITUATIONS[situation]!();
  }
}

// Canned situations only pretend: don't let choosing a web wallet open a real tab.
const realOpen = window.open.bind(window);
window.open = ((...args: Parameters<typeof window.open>) =>
  ($("situation") as HTMLSelectElement).value === "live" ? realOpen(...args) : null) as typeof window.open;

picker.request = DEMO_REQUESTS["allergy-review"]!.request;
for (const id of ["situation", "skin", "theme", "appearance", "remember"]) $(id).addEventListener("change", apply);
apply();

const show = (line: string) => {
  log.textContent = (log.textContent === "Events from the picker appear here." ? "" : log.textContent + "\n") + line;
};
picker.addEventListener("smart-checkin-choose", (e) => {
  const { wallet } = (e as CustomEvent).detail as { wallet: Wallet };
  show(`choose → ${wallet.id}`);
  // In the canned situations nothing runs; pretend the patient shared, after a moment.
  if (picker.getAttribute("mode") === "pick") {
    setTimeout(() => picker.setOutcome({ status: "completed" }), 1200);
  }
});
picker.addEventListener("smart-checkin-response", (e) => {
  const { wallet, response } = (e as CustomEvent).detail;
  show(`response from ${wallet.id}: ${response.json.artifacts.length} artifact(s), statuses ${JSON.stringify(response.items().map((i: { id: string; status?: string }) => `${i.id}=${i.status}`))}`);
});
picker.addEventListener("smart-checkin-declined", (e) => show(`declined in ${(e as CustomEvent).detail.wallet.id}`));
picker.addEventListener("smart-checkin-error", (e) => show(`error (${(e as CustomEvent).detail.code ?? "load"}): ${(e as CustomEvent).detail.message}`));
