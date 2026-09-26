/**
 * Angular example: the same flow, rendered by Angular through a service that
 * wraps the vanilla async core.
 *
 * The library has no Angular bindings; this service is all it takes: the
 * wallets to offer (from `wallets()`), `wallet.start(request)` inside the
 * click, and the result as state.
 */

import "@angular/compiler"; // JIT: this page has no Angular build step
import { Component, Injectable, inject, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";
import {
  wallets,
  type CheckinRequestInput,
  type CheckinResponse,
  type Wallet,
  type WalletsOptions,
} from "../../../src/index.js";
import { mockWallet } from "../../../src/testing/index.js";

type Status = "idle" | "waiting" | "completed" | "kept-on-server" | "declined" | "failed";

@Injectable({ providedIn: "root" })
export class CheckinService {
  readonly wallets = signal<Wallet[]>([]);
  readonly status = signal<Status>("idle");
  readonly response = signal<CheckinResponse | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);

  /** The wallets to offer in this browser. */
  async configure(options: WalletsOptions): Promise<void> {
    this.wallets.set(await wallets(options));
  }

  /** Call from the click handler: a web wallet's tab opens inside the click. */
  async request(input: CheckinRequestInput, wallet: Wallet): Promise<void> {
    const running = wallet.start(input);
    this.status.set("waiting");
    this.error.set(undefined);
    const result = await running;
    this.status.set(result.status);
    if (result.status === "completed") this.response.set(result.response);
    if (result.status === "failed") this.error.set(result.error.message);
  }
}

// The wallets this page offers: the phone's own, the demo registry, and the mock.
const WALLETS: WalletsOptions = { registry: "./wallets.json", extra: [mockWallet()] };

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

      <!-- This page draws its own buttons; <smart-checkin-picker> would also work here. -->
      <div class="choices">
        @for (w of checkin.wallets(); track w.id; let first = $first) {
          <button
            [class]="first ? 'smart-btn primary' : 'smart-btn'"
            [disabled]="checkin.status() === 'waiting'"
            [title]="w.description ?? ''"
            (click)="start(w)">
            {{ w.kind === "platform" ? "Prefill from my health app" : w.name }}
          </button>
        }
      </div>
      @if (checkin.status() === "waiting") {
        <p class="note">Waiting for the wallet…</p>
      }

      @if (checkin.status() === "declined") {
        <p class="note">Nothing was shared — fill the form manually.</p>
      }
      @if (checkin.status() === "failed") {
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
    void this.checkin.configure(WALLETS);
  }

  medications = () => {
    const response = this.checkin.response();
    if (!response) return [] as string[];
    return response
      .resources("meds", { type: "MedicationRequest" })
      .map((r) => (r.medicationCodeableConcept as { text?: string } | undefined)?.text ?? "(unnamed)");
  };

  start(wallet: Wallet): void {
    void this.checkin.request(REQUEST, wallet);
  }
}

void bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
