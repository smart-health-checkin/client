/**
 * Angular example: the same flow, rendered by Angular through a service that
 * wraps the vanilla async core.
 *
 * There is no Angular (or React) code inside the library — the binding below
 * is the entire integration surface, and it's about twenty lines.
 */

import "@angular/compiler"; // JIT: this page has no Angular build step
import { Component, Injectable, inject, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";
import {
  CheckinFlowError,
  createBrowserLocalAuthority,
  createWebWalletCredentialGetter,
  requestCheckin,
  type CheckinOptions,
  type CheckinRequestInput,
  type SmartCheckinResponse,
} from "../../../src/index.js";

type Status = "idle" | "waiting" | "done" | "declined" | "error";

@Injectable({ providedIn: "root" })
export class CheckinService {
  readonly status = signal<Status>("idle");
  readonly response = signal<SmartCheckinResponse | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);

  async request(input: CheckinRequestInput, options?: CheckinOptions): Promise<void> {
    this.status.set("waiting");
    this.error.set(undefined);
    try {
      this.response.set(await requestCheckin(input, options));
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

      <button class="primary" (click)="start()" [disabled]="checkin.status() === 'waiting'">
        {{ checkin.status() === "waiting" ? "Waiting for your health app…" : "Prefill from your health app" }}
      </button>

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

  medications = () => {
    const response = this.checkin.response();
    if (!response) return [] as string[];
    return response.artifacts
      .filter((a) => a.mediaType === "application/fhir+json")
      .flatMap((a) => resourcesOf((a as { value: unknown }).value))
      .filter((r) => r.resourceType === "MedicationRequest")
      .map((r) => (r.medicationCodeableConcept as { text?: string } | undefined)?.text ?? "(unnamed)");
  };

  start(): void {
    void this.checkin.request(REQUEST, {
      authority: createBrowserLocalAuthority({ origin: location.origin }),
      getCredential: createWebWalletCredentialGetter({ walletUrl: "./wallet.html" }),
    });
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
