/**
 * Angular example: the same flow, rendered by Angular through a service that
 * wraps the vanilla async core.
 *
 * There is no Angular (or React) code inside the library. A binding owns three
 * things, and this service shows all three: the responder list the component
 * renders (resolved from a policy), the one call, and its state.
 */

import "@angular/compiler"; // JIT: this page has no Angular build step
import { Component, Injectable, inject, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";
import {
  CheckinFlowError,
  credentialGetterFor,
  requestCheckin,
  resolveResponders,
  type CheckinRequestInput,
  type Responder,
  type ResponderPolicy,
  type SmartCheckinResponse,
} from "../../../src/index.js";

type Status = "idle" | "waiting" | "done" | "declined" | "error";

@Injectable({ providedIn: "root" })
export class CheckinService {
  readonly responders = signal<Responder[]>([]);
  readonly status = signal<Status>("idle");
  readonly response = signal<SmartCheckinResponse | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  private policy?: ResponderPolicy;

  /** Who may answer in this browser; availability and the default come back in the list. */
  async configure(policy: ResponderPolicy): Promise<void> {
    this.policy = policy;
    this.responders.set(await resolveResponders(policy));
  }

  async request(input: CheckinRequestInput, responder = this.responders().find((r) => r.isDefault)): Promise<void> {
    if (!responder) return;
    this.status.set("waiting");
    this.error.set(undefined);
    try {
      this.response.set(await requestCheckin(input, {
        getCredential: credentialGetterFor(responder, { origin: this.policy?.origin }),
      }));
      this.status.set("done");
    } catch (e) {
      if (e instanceof CheckinFlowError && e.outcome.status === "declined") {
        this.status.set("declined");
      } else {
        this.error.set(e instanceof Error ? e.message : String(e));
        this.status.set("error");
      }
    }
  }
}

// What this page accepts, and which one leads. The demo wallet leads because
// it works in any browser; a real deployment would more likely say "platform".
const POLICY: ResponderPolicy = {
  platform: true,
  webWallets: "./wallets.json",
  mock: true,
  default: "demo",
  origin: location.origin,
};

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

@Component({
  selector: "app-root",
  standalone: true,
  template: `
    <div class="card">
      <h2>Medication review</h2>
      <p class="muted">
        Rendered by Angular. The check-in call is the same plain async function
        the vanilla and React examples use.
      </p>

      <!-- Rendering is the page's business: one control per responder, the default leading. -->
      <div class="choices">
        @for (r of checkin.responders(); track r.id) {
          <button
            [class]="r.isDefault ? 'smart-btn primary' : 'smart-btn'"
            [disabled]="!r.available || checkin.status() === 'waiting'"
            [title]="r.reason ?? r.description ?? ''"
            (click)="start(r)">
            {{ r.kind === "platform" ? "Prefill from my health app" : r.name }}
          </button>
        }
      </div>
      @if (checkin.status() === "waiting") {
        <p class="note">Waiting for the wallet…</p>
      }

      @if (checkin.status() === "declined") {
        <p class="note">Nothing was shared — fill the form manually.</p>
      }
      @if (checkin.status() === "error") {
        <p class="note error">{{ checkin.error() }}</p>
      }
      @if (medications().length) {
        <ul class="meds">
          @for (med of medications(); track med) {
            <li>{{ med }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class AppComponent {
  readonly checkin = inject(CheckinService);

  constructor() {
    void this.checkin.configure(POLICY);
  }

  medications = () => {
    const response = this.checkin.response();
    if (!response) return [] as string[];
    return response.artifacts
      .filter((a) => a.mediaType === "application/fhir+json")
      .flatMap((a) => resourcesOf((a as { value: unknown }).value))
      .filter((r) => r.resourceType === "MedicationRequest")
      .map((r) => (r.medicationCodeableConcept as { text?: string } | undefined)?.text ?? "(unnamed)");
  };

  start(responder?: Responder): void {
    void this.checkin.request(REQUEST, responder);
  }
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

void bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
