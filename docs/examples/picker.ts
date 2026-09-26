/**
 * The live examples of <smart-checkin-picker> in the Wallet picker guide
 * (docs/wallets.md; the snippets are picker-states.html and picker-skins.html).
 *
 * The element is the library's hosted build (/lib/ui.js, loaded by the page),
 * not bundled here. It runs a real check-in with each wallet, but the wallets
 * are simulated: none opens, and after a moment each answers the way the
 * example's Outcome says. "Shared" answers with made-up data through the
 * library's mock wallet, so the picker decrypts and checks a real response.
 */
import { customWallet, platformWallet, type Wallet, type WalletSession } from "../../src/index.js";
import { createMockWalletCredentialGetter } from "../../src/testing/mock.js";
import { STARBURST_ICON_URL } from "../../src/ui/icons.js";
import type { SmartCheckinPicker } from "../../src/ui/picker-element.js";
import { DEMO_REQUESTS } from "../../demo/src/requests.js";
import { pageIsDark, watchPageTheme } from "../../demo/src/site.js";

type Picker = SmartCheckinPicker & HTMLElement;
type Outcome = "shared" | "declined" | "cancelled" | "error" | "never";

const REQUEST = DEMO_REQUESTS["allergy-review"]!.request;
const ANSWER_AFTER_MS = 1600;

const glyph = (bg: string, fg: string, path: string) =>
  "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`);

const WEB_WALLETS: Array<[string, string, string, string?]> = [
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

const named = (name: string, message: string): Error => Object.assign(new Error(message), { name });
const shareMadeUpData = createMockWalletCredentialGetter({ origin: location.origin });

/** A wallet session that answers as `outcome()` says, after a moment. */
function simulatedSession(outcome: () => Outcome): WalletSession {
  let stop!: (e: Error) => void;
  const stopped = new Promise<never>((_, reject) => (stop = reject));
  stopped.catch(() => {}); // cancelled before it was asked
  const answer = async (navigatorArgument: unknown): Promise<unknown> => {
    const chosen = outcome();
    if (chosen === "never") return new Promise(() => {});
    await new Promise((r) => setTimeout(r, ANSWER_AFTER_MS));
    // A wallet reports a patient who said no, or closed it, the way the Digital Credentials API does.
    if (chosen === "declined") throw named("NotAllowedError", "The patient said no.");
    if (chosen === "cancelled") throw named("AbortError", "The patient closed the wallet.");
    if (chosen === "error") throw new Error("The health app stopped before it answered.");
    return shareMadeUpData(navigatorArgument);
  };
  return {
    getCredential: (navigatorArgument) => Promise.race([stopped, answer(navigatorArgument)]),
    cancel: () => stop(named("AbortError", "Cancelled")),
  };
}

/** The phone's wallet, shown as available or not whatever this browser is. */
const phone = (available: boolean, outcome: () => Outcome): Wallet =>
  customWallet({ id: "platform", kind: "platform", name: platformWallet().name, available, open: () => simulatedSession(outcome) });

const web = (n: number, outcome: () => Outcome): Wallet[] =>
  WEB_WALLETS.slice(0, n).map(([id, name, description, iconUrl]) =>
    customWallet({ id, kind: "web", name, description, ...(iconUrl ? { iconUrl } : {}), open: () => simulatedSession(outcome) }));

const SITUATIONS: Record<string, (o: () => Outcome) => Wallet[]> = {
  both: (o) => [phone(true, o), ...web(2, o)],
  "no-api": (o) => [phone(false, o), ...web(2, o)],
  "phone-only": (o) => [phone(true, o)],
  one: (o) => [phone(false, o), ...web(1, o)],
  five: (o) => [phone(true, o), ...web(5, o)],
  nine: (o) => [phone(true, o), ...web(9, o)],
  none: (o) => [phone(false, o)],
};

const control = (root: Element, name: string): HTMLSelectElement => root.querySelector<HTMLSelectElement>(`[data-pg="${name}"]`)!;

// ---- What patients see: situations and outcomes -------------------------

function statesExample(root: HTMLElement): void {
  const picker = root.querySelector<Picker>("smart-checkin-picker")!;
  const event = root.querySelector<HTMLElement>("[data-pg='event']")!;
  const situation = control(root, "situation");
  const outcome = control(root, "outcome");
  const remember = control(root, "remember");
  const chosenOutcome = () => outcome.value as Outcome;

  picker.request = REQUEST;
  const list = () => (picker.wallets = SITUATIONS[situation.value]!(chosenOutcome));
  list();
  situation.addEventListener("change", list);
  remember.addEventListener("change", () => picker.toggleAttribute("remember", remember.value === "on"));
  watchPageTheme(() => picker.setAttribute("theme", pageIsDark() ? "dark" : "light"));

  const say = (name: string, rest = "") => (event.innerHTML = `Your page got <code>${name}</code>${rest}.`);
  picker.addEventListener("smart-checkin-choose", () => say("smart-checkin-choose", ", and the picker waits for the wallet"));
  picker.addEventListener("smart-checkin-response", (e) => {
    const items = e.detail.response?.items() ?? [];
    say("smart-checkin-response", `, with ${items.map((i) => `${i.id} ${i.status ?? "unanswered"}`).join(", ")}`);
  });
  picker.addEventListener("smart-checkin-declined", () => say("smart-checkin-declined"));
  picker.addEventListener("smart-checkin-error", (e) => say("smart-checkin-error", e.detail.code ? `, code <code>${e.detail.code}</code>` : ""));
}

// ---- Styling: skins, theme, appearance ----------------------------------

function skinsExample(root: HTMLElement): void {
  const picker = root.querySelector<Picker>("smart-checkin-picker")!;
  const clinic = root.querySelector<HTMLElement>(".pg-clinic")!;
  const skin = control(root, "skin");
  const theme = control(root, "theme");
  const appearance = control(root, "appearance");

  // Each skin is a CSS block from the guide, labelled by its opening comment.
  // The example applies that same text, scoped to this picker.
  const blocks = [...root.querySelectorAll<HTMLElement>(".pg-css pre")].map((pre) => {
    const css = pre.textContent ?? "";
    const label = /\/\*\s*(.+?)\s*\*\//.exec(css)?.[1] ?? "Skin";
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return { pre, css, label, id };
  });
  const style = document.createElement("style");
  style.textContent = blocks.map((b) => b.css.replaceAll("smart-checkin-picker", `[data-pg-skin="${b.id}"] smart-checkin-picker`)).join("\n");
  root.append(style);
  for (const b of blocks) skin.add(new Option(b.label, b.id));
  if (blocks[0]) skin.value = blocks[0].id; // open on a skin, so its CSS shows
  const defaults = root.querySelector<HTMLElement>("[data-pg='defaults']")!;

  picker.request = REQUEST;
  picker.wallets = SITUATIONS.both!(() => "shared");

  const apply = () => {
    const dark = theme.value === "page" ? pageIsDark() : theme.value === "dark";
    clinic.dataset.pgSkin = skin.value;
    clinic.classList.toggle("dark", dark);
    picker.setAttribute("theme", dark ? "dark" : "light");
    if (appearance.value === "flat") picker.setAttribute("appearance", "flat");
    else picker.removeAttribute("appearance");
    for (const b of blocks) b.pre.hidden = b.id !== skin.value;
    defaults.hidden = skin.value !== "smart";
  };
  for (const c of [skin, theme, appearance]) c.addEventListener("change", apply);
  watchPageTheme(apply);
}

const states = document.querySelector<HTMLElement>("[data-picker-example='states']");
if (states) statesExample(states);
const skins = document.querySelector<HTMLElement>("[data-picker-example='skins']");
if (skins) skinsExample(skins);
