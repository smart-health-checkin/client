/**
 * A validated response, with lookups by request item id.
 *
 * `json` is the contract: the SMART Health Check-in response exactly as
 * received, plain JSON, safe to store or forward. Everything else here is a
 * view over it (plus the health-card checks done before the page got it).
 */

import type { SmartArtifact, SmartCheckinItemStatus, SmartCheckinRequest, SmartCheckinResponse } from "../model/index.js";
import type { HealthCard } from "./health-cards.js";

export type FhirResource = { resourceType: string; [key: string]: unknown };

export type ItemStatus = SmartCheckinItemStatus["status"];

export type ResourceEntry = {
  resource: FhirResource;
  source: "bundle" | "health-card";
  /** The artifact this came from. */
  artifactId: string;
  /** For resources from a health card: the card, with its trust result. */
  card?: HealthCard;
  /** The resource's fullUrl in its Bundle, for resolving references. */
  fullUrl?: string;
};

export class CheckinResponse {
  /** The response as received. */
  readonly json: SmartCheckinResponse;
  /** The request it answers. */
  readonly request: SmartCheckinRequest;
  private readonly cards: ReadonlyArray<HealthCard>;

  constructor(json: SmartCheckinResponse, request: SmartCheckinRequest, cards: ReadonlyArray<HealthCard> = []) {
    this.json = json;
    this.request = request;
    this.cards = cards;
  }

  /** The item's status: "fulfilled", "partial", "declined", "unavailable", "unsupported", or "error". */
  status(itemId: string): ItemStatus | undefined {
    return this.json.requestStatus.find((s) => s.item === itemId)?.status;
  }

  /** Every requested item with its status and artifacts, in request order. */
  items(): Array<{ id: string; title: string; status?: ItemStatus; message?: string; artifacts: SmartArtifact[] }> {
    return this.request.items.map((item) => {
      const s = this.json.requestStatus.find((x) => x.item === item.id);
      return {
        id: item.id,
        title: item.title,
        ...(s ? { status: s.status } : {}),
        ...(s?.message ? { message: s.message } : {}),
        artifacts: this.artifacts(item.id),
      };
    });
  }

  /** The raw artifacts that fulfill the item. An artifact fulfilling several items is returned for each. */
  artifacts(itemId: string): SmartArtifact[] {
    return this.json.artifacts.filter((a) => a.fulfills.includes(itemId));
  }

  /** Every SMART Health Card for the item, with its trust result, accepted or not. */
  healthCards(itemId: string): HealthCard[] {
    return this.cards.filter((c) => c.fulfills.includes(itemId));
  }

  /** The item's resources with where each came from. Lists every health card's resources, accepted or not. */
  entries(itemId: string): ResourceEntry[] {
    return this.allEntries().filter((e) => (e.card ? e.card.fulfills : this.fulfillsOf(e.artifactId)).includes(itemId));
  }

  private fulfillsOf(artifactId: string): ReadonlyArray<string> {
    return this.json.artifacts.find((a) => a.id === artifactId)?.fulfills ?? [];
  }

  private allEntries(): ResourceEntry[] {
    const out: ResourceEntry[] = [];
    for (const a of this.json.artifacts) {
      if (a.mediaType !== "application/fhir+json") continue;
      for (const { resource, fullUrl } of unwrap(a.value)) {
        out.push({ resource, source: "bundle", artifactId: a.id, ...(fullUrl ? { fullUrl } : {}) });
      }
    }
    for (const card of this.cards) {
      const artifactId =
        this.json.artifacts.find((a) => a.mediaType === "application/smart-health-card" && a.value.verifiableCredential.includes(card.jws))?.id ?? "";
      for (const { resource, fullUrl } of unwrap(card.bundle)) {
        out.push({ resource, source: "health-card", artifactId, card, ...(fullUrl ? { fullUrl } : {}) });
      }
    }
    return out;
  }

  /**
   * FHIR resources for the item, from Bundles and from health cards the
   * trust configuration accepts, optionally only one resource type.
   */
  resources(itemId: string, options: { type?: string } = {}): FhirResource[] {
    return this.entries(itemId)
      .filter((e) => e.source === "bundle" || e.card?.accepted)
      .map((e) => e.resource)
      .filter((r) => !options.type || r.resourceType === options.type);
  }

  /** The QuestionnaireResponse for a form item. */
  form(itemId: string): FhirResource | undefined {
    return this.resources(itemId, { type: "QuestionnaireResponse" })[0];
  }

  /**
   * Follow a reference from an entry within its own Bundle or card:
   * `urn:uuid:…` and other fullUrls, `resource:N` in a card, or `Type/id`.
   */
  resolve(entry: ResourceEntry, reference: string): FhirResource | undefined {
    const siblings = this.allEntries().filter((e) => e.artifactId === entry.artifactId && e.card?.jws === entry.card?.jws);
    const byUrl = siblings.find((e) => e.fullUrl === reference);
    if (byUrl) return byUrl.resource;
    const [type, id] = reference.split("/");
    return siblings.find((e) => e.resource.resourceType === type && e.resource.id === id)?.resource;
  }

  /** The same plain JSON as `json`, so `JSON.stringify(response)` gives the response as received. */
  toJSON(): SmartCheckinResponse {
    return this.json;
  }
}

function unwrap(value: unknown): Array<{ resource: FhirResource; fullUrl?: string }> {
  if (!value || typeof value !== "object") return [];
  const v = value as { resourceType?: string; entry?: Array<{ fullUrl?: string; resource?: FhirResource }> };
  if (v.resourceType === "Bundle") {
    return (v.entry ?? [])
      .filter((e): e is { fullUrl?: string; resource: FhirResource } => !!e.resource)
      .map((e) => ({ resource: e.resource, ...(e.fullUrl ? { fullUrl: e.fullUrl } : {}) }));
  }
  return typeof v.resourceType === "string" ? [{ resource: value as FhirResource }] : [];
}
