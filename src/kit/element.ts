/**
 * <smart-checkin> — the declarative face of runCheckin. Attributes map 1:1
 * onto CheckinConfig; the element renders a launch button, runs the flow on
 * click, dispatches a `checkin-complete` CustomEvent<CheckinOutcome>
 * (bubbles, composed, cancelable), and — unless the event was
 * preventDefault()ed — navigates to `return-url` on completion.
 */

import type { SmartCheckinRequest } from "../model/index.ts";
import { runCheckin, type RunCheckinHooks } from "./index.ts";
import type { CheckinConfig } from "./types.ts";
import { createMockWalletCredentialGetter } from "./mock-wallet.ts";

const ATTRS = [
  "scenario",
  "request-json",
  "patient",
  "appointment",
  "fhir-base",
  "submit-mode",
  "return-url",
  "label",
  "mock",
  "disabled",
] as const;

export class SmartCheckinElement extends HTMLElement {
  static observedAttributes = [...ATTRS];

  private button: HTMLButtonElement;
  private busy = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { display: inline-block; }
      button {
        font: inherit;
        font-weight: 500;
        padding: var(--smart-checkin-padding, 0.55em 1.2em);
        border-radius: var(--smart-checkin-radius, 6px);
        border: 1px solid var(--smart-checkin-accent, #0e7c6b);
        background: var(--smart-checkin-accent, #0e7c6b);
        color: var(--smart-checkin-accent-contrast, #ffffff);
        cursor: pointer;
      }
      button:disabled { opacity: 0.45; cursor: not-allowed; }
      button:focus-visible { outline: 2px solid var(--smart-checkin-accent, #0e7c6b); outline-offset: 2px; }
    `;
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.addEventListener("click", () => void this.start());
    shadow.append(style, this.button);
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private render(): void {
    this.button.textContent = this.busy
      ? "Waiting for wallet…"
      : this.getAttribute("label") ?? "Share for check-in";
    this.button.disabled = this.busy || this.hasAttribute("disabled");
  }

  /** Build the CheckinConfig from the element's current attributes. */
  buildConfig(): CheckinConfig {
    const scenario = this.getAttribute("scenario");
    const requestJson = this.getAttribute("request-json");
    if (!scenario && !requestJson) {
      throw new Error("<smart-checkin> needs a scenario or request-json attribute");
    }
    const patient = this.getAttribute("patient") ?? undefined;
    const appointment = this.getAttribute("appointment") ?? undefined;
    const fhirBase = this.getAttribute("fhir-base");
    const submitModeAttr = this.getAttribute("submit-mode");
    const returnUrl = this.getAttribute("return-url") ?? undefined;
    return {
      request: requestJson
        ? { request: JSON.parse(requestJson) as SmartCheckinRequest }
        : { scenario: scenario! },
      ...(patient || appointment ? { context: { patient, appointment } } : {}),
      ...(fhirBase
        ? {
            submit: {
              fhirBase,
              mode:
                submitModeAttr === "individual" || submitModeAttr === "dry-run"
                  ? submitModeAttr
                  : "transaction",
            },
          }
        : {}),
      ...(returnUrl ? { complete: { returnUrl } } : {}),
    };
  }

  async start(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.render();
    try {
      const config = this.buildConfig();
      const hooks: RunCheckinHooks = this.hasAttribute("mock")
        ? { getCredential: createMockWalletCredentialGetter({ origin: location.origin }) }
        : {};
      const outcome = await runCheckin(config, hooks);
      const proceed = this.dispatchEvent(
        new CustomEvent("checkin-complete", {
          detail: outcome,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
      const returnUrl = this.getAttribute("return-url");
      if (proceed && returnUrl && outcome.status === "completed") {
        location.assign(returnUrl);
      }
    } finally {
      this.busy = false;
      this.render();
    }
  }
}

/** Register the element (idempotent). */
export function defineSmartCheckin(tagName = "smart-checkin"): void {
  if (typeof customElements !== "undefined" && !customElements.get(tagName)) {
    customElements.define(tagName, SmartCheckinElement);
  }
}
