/**
 * Angular binding — drop this into an Angular app.
 *
 * It is not built by this repo's demo site (that would drag in the whole
 * Angular toolchain); it is here to show that the wrapper is trivial and
 * framework-shaped, because the core is a plain async function with no
 * framework dependency at all.
 *
 * ```ts
 * // app.component.ts
 * export class AppComponent {
 *   constructor(readonly checkin: CheckinService) {}
 *   async prefill() {
 *     const response = await this.checkin.request(MY_REQUEST);
 *     // …populate your form
 *   }
 * }
 * ```
 */

// @ts-nocheck — Angular is not a dependency of this repo; this file is a
// copy-paste reference, type-checked in *your* app rather than here.

import { Injectable, signal } from "@angular/core";
import {
  CheckinFlowError,
  requestCheckin,
  type CheckinOptions,
  type CheckinRequestInput,
  type SmartCheckinResponse,
} from "@smart-health-checkin/provider-kit";

export type CheckinStatus = "idle" | "waiting" | "done" | "declined" | "error";

@Injectable({ providedIn: "root" })
export class CheckinService {
  readonly status = signal<CheckinStatus>("idle");
  readonly response = signal<SmartCheckinResponse | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);

  async request(
    input: CheckinRequestInput,
    options?: CheckinOptions,
  ): Promise<SmartCheckinResponse | undefined> {
    this.status.set("waiting");
    this.error.set(undefined);
    try {
      const response = await requestCheckin(input, options);
      this.response.set(response);
      this.status.set("done");
      return response;
    } catch (e) {
      if (e instanceof CheckinFlowError && e.outcome.status === "declined") {
        this.status.set("declined");
      } else {
        this.error.set(e instanceof Error ? e.message : String(e));
        this.status.set("error");
      }
      return undefined;
    }
  }
}
