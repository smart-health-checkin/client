/**
 * `<smart-checkin-picker>`: a drop-in control that lets a patient choose how
 * to answer a SMART Health Check-in request, then runs the check-in.
 *
 * ```html
 * <script type="module" src="https://smart-health-checkin.org/client/lib/ui.js"></script>
 * <smart-checkin-picker wallets="/wallets.json"></smart-checkin-picker>
 * <script type="module">
 *   const picker = document.querySelector("smart-checkin-picker");
 *   picker.request = { scenario: "medications" };
 *   picker.addEventListener("smart-checkin-response", (e) => fill(e.detail.response));
 * </script>
 * ```
 *
 * Attributes:
 * - `wallets`: URL of a wallet registry (wallets.json), or "demo" for the built-in list. Omit for no web wallets.
 * - `platform="off"`: don't offer the device's own wallet.
 * - `remember`: remember the last app used on this site (stored in the browser). Off unless present.
 * - `mock`: offer the simulated responder. Development only.
 * - `mode="pick"`: only choose; the page runs the flow (see the `smart-checkin-choose` event and `setOutcome`).
 * - `theme`: "light" (default), "dark", or "auto" (follow the device).
 * - `appearance="flat"`: no card border or background.
 * - `footer="off"`: hide the SMART Health Check-in mark.
 * - `heading`, `description`: replace the two lines at the top.
 *
 * Properties: `request` (what to ask for), `strings` (any text), `responders`
 * (a pre-resolved list, instead of the attributes), `checkinOptions`
 * (e.g. a server authority), `origin`.
 *
 * Events (all bubble and cross shadow roots):
 * - `smart-checkin-choose`: `{ responder, getCredential, cancel }`, fired inside the click.
 * - `smart-checkin-response`: `{ responder, response, outcome }`.
 * - `smart-checkin-declined`: `{ responder }`.
 * - `smart-checkin-error`: `{ responder?, message, outcome? }`.
 */

import { runCheckin, type CheckinOptions, type CheckinOutcome, type CheckinRequestInput } from "../kit/index.js";
import { resolveResponders, type Responder, type ResponderPolicy } from "../kit/responders.js";
import { arrangeResponders, monogram, recallChoice, rememberChoice, startResponder, type StartedResponder } from "../picker/index.js";
import { ICONS, STARBURST_SVG } from "./icons.js";
import { DEFAULT_STRINGS, fill, type PickerStrings } from "./strings.js";
import { PICKER_CSS } from "./styles.js";

type View =
  | { kind: "loading" }
  | { kind: "choose" }
  | { kind: "waiting"; responder: Responder }
  | { kind: "done"; responder: Responder }
  | { kind: "declined"; responder: Responder }
  | { kind: "error"; responder?: Responder; message: string; blocked: boolean };

export type PickerOutcome =
  | { status: "completed" }
  | { status: "declined" }
  | { status: "error"; message: string };

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const isMobile = (): boolean => {
  const uaData = (navigator as { userAgentData?: { mobile?: boolean } }).userAgentData;
  return uaData?.mobile === true || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

export class SmartCheckinPicker extends HTMLElementBase {
  static observedAttributes = ["wallets", "platform", "remember", "mock", "mode", "heading", "description"];

  /** What to ask the patient for. Required unless `mode="pick"`. */
  request?: CheckinRequestInput;
  /** Options passed through to `runCheckin` (for example a server-owned authority). */
  checkinOptions: Omit<CheckinOptions, "getCredential"> = {};
  /** Verifier origin for the mock responder; defaults to this page's. */
  origin?: string;

  private _strings: PickerStrings = DEFAULT_STRINGS;
  private _responders?: Responder[];
  private resolved: Responder[] = [];
  private view: View = { kind: "loading" };
  private ignoreRemembered = false;
  private started?: StartedResponder;
  private runId = 0;
  private loadId = 0;
  private query = "";
  private root!: ShadowRoot;
  private main!: HTMLElement;
  private dialog!: HTMLDialogElement;

  /** Replace any of the picker's text. Missing keys keep their defaults. */
  get strings(): PickerStrings {
    return this._strings;
  }
  set strings(value: Partial<PickerStrings>) {
    this._strings = { ...DEFAULT_STRINGS, ...value };
    this.render();
  }

  /** A pre-resolved responder list (from `resolveResponders`), used instead of the attributes. */
  get responders(): Responder[] | undefined {
    return this._responders;
  }
  set responders(value: Responder[] | undefined) {
    this._responders = value;
    void this.load();
  }

  connectedCallback(): void {
    if (!this.root) {
      this.root = this.attachShadow({ mode: "open" });
      this.root.innerHTML = `<style>${PICKER_CSS}</style><div part="container"></div><dialog part="dialog"></dialog>`;
      this.main = this.root.querySelector("div")!;
      this.dialog = this.root.querySelector("dialog")!;
      this.root.addEventListener("click", (e) => this.onClick(e));
      this.root.addEventListener("input", (e) => this.onInput(e));
      this.dialog.addEventListener("click", (e) => {
        if (e.target === this.dialog) this.dialog.close(); // a click on the backdrop
      });
    }
    void this.load();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (!this.root || oldValue === newValue) return;
    if (["wallets", "platform", "mock"].includes(name)) void this.load();
    else this.render();
  }

  /** In `mode="pick"`, tell the picker how the check-in ended so it can say so. */
  setOutcome(outcome: PickerOutcome): void {
    const responder = this.view.kind === "waiting" ? this.view.responder : undefined;
    if (!responder) return;
    if (outcome.status === "completed") {
      this.view = { kind: "done", responder };
      if (this.hasAttribute("remember")) rememberChoice(responder.id);
    } else if (outcome.status === "declined") this.view = { kind: "declined", responder };
    else this.view = { kind: "error", responder, message: outcome.message, blocked: /blocked/i.test(outcome.message) };
    this.render();
  }

  /** Back to the list of apps. */
  reset(): void {
    this.started?.cancel();
    this.started = undefined;
    this.runId++;
    this.view = this.resolved.length ? { kind: "choose" } : { kind: "loading" };
    this.render();
  }

  private policy(): ResponderPolicy {
    const wallets = this.getAttribute("wallets");
    return {
      platform: this.getAttribute("platform") !== "off",
      ...(wallets ? { webWallets: wallets === "demo" ? true : wallets } : {}),
      ...(this.hasAttribute("mock") ? { mock: true } : {}),
      ...(this.origin ? { origin: this.origin } : {}),
    };
  }

  private async load(): Promise<void> {
    if (!this.root) return;
    const id = ++this.loadId;
    this.view = { kind: "loading" };
    this.render();
    try {
      const list = this._responders ?? (await resolveResponders(this.policy()));
      if (id !== this.loadId) return;
      this.resolved = list;
      this.view = { kind: "choose" };
    } catch (e) {
      if (id !== this.loadId) return;
      this.resolved = [];
      const message = e instanceof Error ? e.message : String(e);
      this.view = { kind: "error", message: `Couldn't load the list of health apps: ${message}`, blocked: false };
      this.emit("smart-checkin-error", { message });
    }
    this.render();
  }

  private arranged() {
    const preferred = this.hasAttribute("remember") && !this.ignoreRemembered ? recallChoice() : undefined;
    return arrangeResponders(this.resolved, preferred ? { preferred } : {});
  }

  // ---- interaction. Everything that opens a wallet runs synchronously in the click.
  private onClick(event: Event): void {
    const target = (event.target as Element).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const byId = (id?: string) => this.resolved.find((r) => r.id === id);
    if (action === "choose") {
      const responder = byId(target.dataset.id);
      if (responder) this.choose(responder);
    } else if (action === "more") {
      this.query = "";
      this.renderDialog();
      this.dialog.showModal();
      this.dialog.querySelector("input")?.focus();
    } else if (action === "close") {
      this.dialog.close();
    } else if (action === "different") {
      this.ignoreRemembered = true;
      this.reset();
    } else if (action === "cancel" || action === "reset") {
      this.reset();
    } else if (action === "retry") {
      const responder = "responder" in this.view ? this.view.responder : undefined;
      if (responder) this.choose(responder);
      else void this.load();
    }
  }

  private onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.name !== "search") return;
    this.query = input.value;
    const list = this.dialog.querySelector<HTMLElement>("[data-results]");
    if (list) list.innerHTML = this.results();
  }

  private choose(responder: Responder): void {
    this.started?.cancel();
    const started = startResponder(responder, this.origin ? { origin: this.origin } : {});
    this.started = started;
    if (this.dialog.open) this.dialog.close();
    const runId = ++this.runId;
    this.view = { kind: "waiting", responder };
    this.render();
    this.emit("smart-checkin-choose", { responder, getCredential: started.getCredential, cancel: started.cancel });
    if (this.getAttribute("mode") === "pick") return;
    if (!this.request) {
      this.view = { kind: "error", responder, message: "This page didn't say what to ask for (the picker's request property is not set).", blocked: false };
      this.render();
      return;
    }
    void this.run(runId, responder, started, this.request);
  }

  private async run(runId: number, responder: Responder, started: StartedResponder, request: CheckinRequestInput): Promise<void> {
    let outcome: CheckinOutcome;
    try {
      outcome = await runCheckin(request, {
        ...this.checkinOptions,
        ...(started.getCredential ? { getCredential: started.getCredential } : {}),
      });
    } catch (e) {
      outcome = { status: "error", error: { stage: "prepare", message: e instanceof Error ? e.message : String(e) } } as CheckinOutcome;
    }
    if (runId !== this.runId) return; // cancelled or superseded
    if (outcome.status === "completed") {
      this.view = { kind: "done", responder };
      if (this.hasAttribute("remember")) rememberChoice(responder.id);
      this.emit("smart-checkin-response", { responder, response: outcome.response, outcome });
    } else if (outcome.status === "declined") {
      this.view = { kind: "declined", responder };
      this.emit("smart-checkin-declined", { responder });
    } else {
      const message = outcome.error?.message ?? "the check-in could not be completed";
      this.view = { kind: "error", responder, message, blocked: /blocked/i.test(message) };
      this.emit("smart-checkin-error", { responder, message, outcome });
    }
    this.render();
  }

  private emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  // ---- rendering
  private t(key: keyof PickerStrings, values: Record<string, string | number> = {}): string {
    return esc(fill(this._strings[key], values));
  }

  private icon(r: Responder, extra = ""): string {
    if (r.kind === "platform") return `<span class="icon${extra}" part="icon">${isMobile() ? ICONS.phone : ICONS.qr}</span>`;
    if (r.kind === "mock") return `<span class="icon${extra}" part="icon">${ICONS.flask}</span>`;
    if (r.iconUrl) return `<span class="icon${extra}" part="icon"><img alt="" src="${esc(r.iconUrl)}" data-fallback="${esc(r.name)}"></span>`;
    const m = monogram(r.name);
    return `<span class="icon letter${extra}" part="icon" style="background:${m.color}" aria-hidden="true">${esc(m.letter)}</span>`;
  }

  private primaryButton(r: Responder, remembered: boolean, only: boolean): string {
    let name: string, detail: string, glyph: string;
    if (r.kind === "platform") {
      const mobile = isMobile();
      name = this.t(mobile ? "platformTitle" : "platformTitleDesktop");
      detail = this.t(mobile ? "platformDetail" : "platformDetailDesktop");
      glyph = mobile ? ICONS.phone : ICONS.qr;
    } else {
      name = this.t("onlyTitle", { name: r.name });
      detail = remembered ? this.t("rememberedDetail") : only ? this.t("onlyDetail") : esc(r.description ?? "");
      glyph = r.iconUrl ? `<img alt="" src="${esc(r.iconUrl)}" data-fallback="${esc(r.name)}">` : this.icon(r);
    }
    return `<button class="primary" part="primary" data-action="choose" data-id="${esc(r.id)}"><span class="glyph">${glyph}</span><span class="text"><span class="name">${name}</span>${detail ? `<span class="detail">${detail}</span>` : ""}</span></button>`;
  }

  private row(r: Responder): string {
    const detail = esc(r.description ?? "");
    return `<li><button class="row" part="row" data-action="choose" data-id="${esc(r.id)}">${this.icon(r)}<span class="text"><span class="name">${esc(r.name)}</span>${detail ? `<span class="detail">${detail}</span>` : ""}</span>${ICONS.chevron}</button></li>`;
  }

  private moreRow(more: Responder[]): string {
    const peek = more.slice(0, 3).map((r) => this.icon(r)).join("");
    return `<li><button class="row" part="row more" data-action="more"><span class="stack">${peek}</span><span class="text"><span class="name">${this.t("moreTitle")}</span><span class="detail">${this.t("moreDetail", { count: more.length })}</span></span>${ICONS.chevron}</button></li>`;
  }

  private header(): string {
    const heading = this.getAttribute("heading") ?? this._strings.heading;
    const description = this.getAttribute("description") ?? this._strings.description;
    return `<h2 class="title" part="title">${esc(heading)}</h2>${description ? `<p class="description" part="description">${esc(description)}</p>` : ""}`;
  }

  private footer(): string {
    return `<div class="footer" part="footer">${STARBURST_SVG}${this.t("footer")}</div>`;
  }

  private status(badge: string, title: string, detail: string, actions = ""): string {
    return `<div class="status" part="status" role="status">${badge}<span class="text"><span class="name">${title}</span><span class="detail">${detail}</span></span></div>${actions}`;
  }

  private chooseView(): string {
    const { primary, inline, more, remembered } = this.arranged();
    if (!primary && !inline.length) return this.header() + this.status("", this.t("noneTitle"), this.t("noneDetail"));
    const parts = [this.header()];
    if (primary) parts.push(this.primaryButton(primary, !!remembered, !remembered && !inline.length && primary.kind !== "platform"));
    if (remembered) {
      parts.push(`<button class="link" data-action="different">${this.t("useDifferent")}</button>`);
      return parts.join("");
    }
    if (inline.length) {
      if (primary) parts.push(`<div class="divider">${this.t("webDivider")}</div>`);
      parts.push(`<ul class="list" part="list">${inline.map((r) => this.row(r)).join("")}${more.length ? this.moreRow(more) : ""}</ul>`);
    }
    return parts.join("");
  }

  private render(): void {
    if (!this.main) return;
    const v = this.view;
    let body: string;
    if (v.kind === "loading") body = this.header() + this.status(`<span class="spinner"></span>`, this.t("loading"), "");
    else if (v.kind === "choose") body = this.chooseView();
    else if (v.kind === "waiting") {
      const web = v.responder.kind === "web";
      body = this.status(
        `<span class="spinner" aria-hidden="true"></span>`,
        web ? this.t("waitingWebTitle", { name: v.responder.name }) : this.t("waitingPlatformTitle"),
        web ? this.t("waitingWebDetail") : this.t("waitingPlatformDetail"),
        web ? `<div class="actions"><button class="button" data-action="cancel">${this.t("cancel")}</button></div>` : "",
      );
    } else if (v.kind === "done") {
      body = this.status(`<span class="badge ok">${ICONS.check}</span>`, this.t("doneTitle", { name: v.responder.name }), this.t("doneDetail"), `<button class="link" data-action="different">${this.t("shareAgain")}</button>`);
    } else if (v.kind === "declined") {
      body = this.status(`<span class="badge warn">${ICONS.alert}</span>`, this.t("declinedTitle"), this.t("declinedDetail", { name: v.responder.name }), this.actions());
    } else {
      body = this.status(
        `<span class="badge warn">${ICONS.alert}</span>`,
        this.t(v.blocked ? "blockedTitle" : "errorTitle"),
        v.blocked ? this.t("blockedDetail") : this.t("errorDetail", { message: v.message }),
        this.actions(),
      );
    }
    this.main.innerHTML = `<div class="card" part="card">${body}${this.footer()}</div>`;
    this.wireImages(this.main);
  }

  private actions(): string {
    return `<div class="actions"><button class="button accent" data-action="retry">${this.t("tryAgain")}</button><button class="button" data-action="different">${this.t("chooseDifferent")}</button></div>`;
  }

  private results(): string {
    const q = this.query.trim().toLowerCase();
    const matches = this.selectable().filter((r) => !q || r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q));
    if (!matches.length) return `<p class="empty">${this.t("noMatches", { query: this.query.trim() })}</p>`;
    return `<ul class="list" part="list">${matches.map((r) => this.row(r)).join("")}</ul>`;
  }

  // The full list behind "more": every app except the platform wallet, which is always the main button.
  private selectable(): Responder[] {
    return arrangeResponders(this.resolved).all.filter((r) => r.kind !== "platform");
  }

  private renderDialog(): void {
    const count = this.selectable().length;
    this.dialog.setAttribute("aria-label", this._strings.selectorTitle);
    this.dialog.innerHTML = `<div class="card" part="card dialog-card">
      <div class="dialog-head"><span class="text"><span class="name">${this.t("selectorTitle")}</span><span class="detail">${this.t("selectorDetail", { count })}</span></span><button class="close" data-action="close" aria-label="${this.t("close")}">${ICONS.close}</button></div>
      <label class="search">${ICONS.search}<span class="visually-hidden">${this.t("search")}</span><input name="search" type="search" autocomplete="off" placeholder="${this.t("search")}"></label>
      <div data-results>${this.results()}</div>${this.footer()}</div>`;
    this.wireImages(this.dialog);
  }

  // A wallet icon that fails to load becomes its letter tile.
  private wireImages(scope: ParentNode): void {
    scope.querySelectorAll<HTMLImageElement>("img[data-fallback]").forEach((img) => {
      img.addEventListener("error", () => {
        const m = monogram(img.dataset.fallback ?? "?");
        const tile = document.createElement("span");
        tile.className = "icon letter";
        tile.style.background = m.color;
        tile.textContent = m.letter;
        const holder = img.closest(".icon, .glyph");
        if (holder?.classList.contains("icon")) holder.replaceWith(tile);
        else img.replaceWith(tile);
      }, { once: true });
    });
  }
}

/** Register `<smart-checkin-picker>` (safe to call more than once). */
export function defineCheckinPicker(tagName = "smart-checkin-picker"): void {
  if (typeof customElements === "undefined" || customElements.get(tagName)) return;
  customElements.define(tagName, class extends SmartCheckinPicker {});
}
