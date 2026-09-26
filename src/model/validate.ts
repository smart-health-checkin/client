/**
 * Validation of untrusted SMART Health Check-in JSON (spec §§5–6).
 *
 * Only a few problems reject a whole message: for a request, [REQ-2] and
 * [ITEM-2]; for a response, [XV-1] and [XV-2]. Everything else affects one
 * item or one Artifact, and is reported alongside the message instead:
 *
 * - a request item whose selector a Wallet can't use is "unsupported" ([SEL-8],
 *   [SEL-9], [SEL-10], [FORM-1]); the rest of the request stands;
 * - a response Artifact that fails a check is disregarded ([XV-4]..[XV-10]);
 * - an item with a missing, repeated, or unknown status has no valid status
 *   ([XV-3]).
 */

import { JsonSyntaxError, parseJsonStrict } from "../wire/json.js";
import type {
  SmartArtifact,
  SmartCheckinItemStatus,
  SmartCheckinRequest,
  SmartCheckinResponse,
  ValidationResult,
} from "./types.js";

/** One problem found, with the spec requirement it comes from. */
export type ValidationIssue = { rule: string; message: string };

/** A request item this library's validation says a Wallet can't process. */
export type UnsupportedItem = { id: string } & ValidationIssue;

export type RequestValidation =
  | { ok: true; value: SmartCheckinRequest; unsupportedItems: UnsupportedItem[] }
  | { ok: false; error: string; rule: string };

/** One Artifact's result: usable, or disregarded with the reasons. */
export type ArtifactCheck = {
  /** Position in `artifacts[]`. */
  index: number;
  id?: string;
  usable: boolean;
  problems: ValidationIssue[];
};

/** One request item's outcome in a response. */
export type ItemOutcome = {
  id: string;
  /** The item's status, or undefined when it has no valid status ([XV-3]). */
  status?: SmartCheckinItemStatus["status"];
  message?: string;
  /** Usable Artifacts listing this item. */
  artifacts: SmartArtifact[];
  problems: ValidationIssue[];
};

export type ResponseValidation =
  | {
      ok: true;
      /** The response exactly as received. */
      value: SmartCheckinResponse;
      artifacts: ArtifactCheck[];
      /** The Artifacts that passed every check, in response order. */
      usableArtifacts: SmartArtifact[];
      /** One entry per status row's item id (without a request) or per request item (with one). */
      items: ItemOutcome[];
    }
  | { ok: false; error: string; rule: string };

export const STATUS_CODES = ["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"] as const;
const CORE_MEDIA_TYPES = ["application/fhir+json", "application/smart-health-card"];

// ---------------------------------------------------------------- request

/** Parse and validate SMART request JSON text, rejecting duplicate member names ([JSON-2]). */
export function parseSmartCheckinRequest(text: string): RequestValidation {
  const parsed = parseText(text);
  return parsed.ok ? validateSmartCheckinRequest(parsed.value) : parsed;
}

export function validateSmartCheckinRequest(v: unknown): RequestValidation {
  const fail = (error: string, rule = "REQ-2"): RequestValidation => ({ ok: false, error, rule });
  if (!isRecord(v)) return fail("the request is not a JSON object", "JSON-2");
  if (v.type !== "smart-health-checkin-request") return fail('type is not "smart-health-checkin-request"');
  if (v.version !== "1") return fail('version is not the string "1"');
  if (!nonEmptyString(v.id)) return fail("id is missing or not a non-empty string");
  if (v.purpose !== undefined && typeof v.purpose !== "string") return fail("purpose is not a string");
  if (v.fhirVersions !== undefined && !(Array.isArray(v.fhirVersions) && v.fhirVersions.every(nonEmptyString))) {
    return fail("fhirVersions is not an array of non-empty strings");
  }
  if (!Array.isArray(v.items)) return fail("items is not an array");

  const ids = new Set<string>();
  const unsupportedItems: UnsupportedItem[] = [];
  for (let i = 0; i < v.items.length; i++) {
    const item = v.items[i];
    const at = `items[${i}]`;
    if (!isRecord(item)) return fail(`${at} is not an object`);
    if (!nonEmptyString(item.id)) return fail(`${at}.id is missing or empty`, "ITEM-2");
    if (ids.has(item.id)) return fail(`${at}.id ${JSON.stringify(item.id)} repeats an earlier item`, "ITEM-2");
    ids.add(item.id);
    if (!nonEmptyString(item.title)) return fail(`${at}.title is missing or empty`);
    if (item.summary !== undefined && typeof item.summary !== "string") return fail(`${at}.summary is not a string`);
    if (item.required !== undefined && typeof item.required !== "boolean") return fail(`${at}.required is not a boolean`);
    if (!Array.isArray(item.accept) || item.accept.length === 0 || !item.accept.every(nonEmptyString)) {
      return fail(`${at}.accept is not a non-empty array of media types`);
    }
    if (!isRecord(item.content) || typeof item.content.kind !== "string") {
      return fail(`${at}.content is not an object with a string kind`);
    }
    const problem = selectorProblem(item.content);
    if (problem) unsupportedItems.push({ id: item.id, ...problem });
  }
  return { ok: true, value: v as unknown as SmartCheckinRequest, unsupportedItems };
}

/** Why a Wallet can't process this selector, or undefined if it can. */
function selectorProblem(content: Record<string, unknown>): ValidationIssue | undefined {
  const arrayMember = (name: string) =>
    content[name] !== undefined && !(Array.isArray(content[name]) && (content[name] as unknown[]).length > 0 && (content[name] as unknown[]).every(nonEmptyString));
  const has = (name: string) => content[name] !== undefined;
  if (content.kind === "selection.fhir") {
    for (const name of ["profiles", "profilesFrom", "resourceTypes"]) {
      if (arrayMember(name)) return { rule: "SEL-10", message: `${name} is not a non-empty array of non-empty strings` };
    }
    if (has("questionnaireCanonical") || has("questionnaire")) {
      return { rule: "SEL-8", message: "a selection.fhir item also has form members" };
    }
    return undefined;
  }
  if (content.kind === "form.fhir") {
    if (!has("questionnaireCanonical") && !has("questionnaire")) {
      return { rule: "FORM-1", message: "neither questionnaireCanonical nor questionnaire is present" };
    }
    if (has("questionnaireCanonical") && !nonEmptyString(content.questionnaireCanonical)) {
      return { rule: "SEL-10", message: "questionnaireCanonical is not a non-empty string" };
    }
    if (has("questionnaire") && !(isRecord(content.questionnaire) && content.questionnaire.resourceType === "Questionnaire")) {
      return { rule: "FORM-1", message: "questionnaire is not a Questionnaire" };
    }
    if (has("profiles") || has("profilesFrom") || has("resourceTypes")) {
      return { rule: "FORM-1", message: "a form.fhir item also has selection members" };
    }
    return undefined;
  }
  return { rule: "SEL-9", message: `content.kind ${JSON.stringify(content.kind)} is not supported` };
}

// ---------------------------------------------------------------- response

/** Parse and validate SMART response JSON text, rejecting duplicate member names ([JSON-2]). */
export function parseSmartCheckinResponse(text: string, request?: unknown): ResponseValidation {
  const parsed = parseText(text);
  if (!parsed.ok) return parsed;
  return request === undefined ? validateSmartCheckinResponse(parsed.value) : validateResponseAgainstRequest(request, parsed.value);
}

/** Validate a response on its own: the checks that don't need the request. */
export function validateSmartCheckinResponse(v: unknown): ResponseValidation {
  const shape = responseShape(v);
  if (!shape.ok) return shape;
  const artifacts = shape.artifacts;
  const statuses = statusRows(shape.value);
  const items: ItemOutcome[] = [...statuses.keys()].map((id) => outcome(id, statuses, artifacts, shape.value));
  return { ok: true, value: shape.value, artifacts, usableArtifacts: usable(artifacts, shape.value), items };
}

/**
 * Check a response against the request it answers ([XV-1]..[XV-12]). Fails
 * only when the request is invalid or on [XV-1] and [XV-2].
 */
export function validateResponseAgainstRequest(request: unknown, response: unknown): ResponseValidation {
  const req = validateSmartCheckinRequest(request);
  if (!req.ok) return { ok: false, error: `the request is invalid: ${req.error}`, rule: req.rule };
  const shape = responseShape(response);
  if (!shape.ok) return shape;
  const resp = shape.value;
  if (resp.requestId !== req.value.id) {
    return { ok: false, error: `requestId ${JSON.stringify(resp.requestId)} is not the request's id ${JSON.stringify(req.value.id)}`, rule: "XV-2" };
  }

  const itemsById = new Map(req.value.items.map((item) => [item.id, item]));
  const fhirVersions = req.value.fhirVersions;
  const artifacts = shape.artifacts;
  for (const check of artifacts) {
    if (!check.usable) continue;
    const a = resp.artifacts[check.index] as unknown as Record<string, unknown>;
    const fulfills = a.fulfills as string[];
    const unknown = fulfills.filter((id) => !itemsById.has(id));
    if (unknown.length) check.problems.push({ rule: "XV-5", message: `fulfills names ${unknown.join(", ")}, not items in the request` });
    for (const id of fulfills) {
      const item = itemsById.get(id);
      if (item && !item.accept.includes(a.mediaType as string)) {
        check.problems.push({ rule: "XV-7", message: `mediaType ${a.mediaType} is not in item ${id}'s accept list` });
      }
    }
    if (a.mediaType === "application/fhir+json" && fhirVersions?.length && !fhirVersions.includes(a.fhirVersion as string)) {
      check.problems.push({ rule: "XV-8", message: `fhirVersion ${JSON.stringify(a.fhirVersion)} is not in the request's fhirVersions` });
    }
    const value = a.value as { resourceType?: unknown; questionnaire?: unknown };
    if (a.mediaType === "application/fhir+json" && value.resourceType === "QuestionnaireResponse") {
      for (const id of fulfills) {
        const content = itemsById.get(id)?.content as { kind?: string; questionnaireCanonical?: string } | undefined;
        if (content?.kind === "form.fhir" && content.questionnaireCanonical !== undefined && value.questionnaire !== content.questionnaireCanonical) {
          check.problems.push({
            rule: "XV-10",
            message: `QuestionnaireResponse.questionnaire ${JSON.stringify(value.questionnaire)} is not item ${id}'s questionnaireCanonical ${JSON.stringify(content.questionnaireCanonical)}`,
          });
        }
      }
    }
    check.usable = check.problems.length === 0;
  }

  const statuses = statusRows(resp);
  const items = req.value.items.map((item) => {
    const out = outcome(item.id, statuses, artifacts, resp);
    if ((out.status === "fulfilled" || out.status === "partial") && out.artifacts.length === 0) {
      out.problems.push({ rule: "XV-12", message: `status is ${out.status}, but no usable Artifact lists this item` });
    }
    const content = item.content as { kind?: string; profiles?: string[] };
    const versioned = content.kind === "selection.fhir" ? (content.profiles ?? []).filter((p) => p.includes("|")) : [];
    if (out.status === "fulfilled" && versioned.length && !versioned.some((p) => claimsProfile(out.artifacts, p))) {
      out.problems.push({ rule: "XV-11", message: `no returned resource claims the versioned profile ${versioned.join(" or ")}` });
    }
    return out;
  });
  return { ok: true, value: resp, artifacts, usableArtifacts: usable(artifacts, resp), items };
}

/** [XV-1] and [XV-2] (as far as the response alone allows), then the per-Artifact checks. */
function responseShape(v: unknown): { ok: true; value: SmartCheckinResponse; artifacts: ArtifactCheck[] } | { ok: false; error: string; rule: string } {
  const fail = (error: string, rule = "XV-1") => ({ ok: false as const, error, rule });
  if (!isRecord(v)) return fail("the response is not a JSON object");
  if (v.type !== "smart-health-checkin-response") return fail('type is not "smart-health-checkin-response"');
  if (v.version !== "1") return fail('version is not the string "1"');
  if (!Array.isArray(v.artifacts)) return fail("artifacts is not an array");
  if (!Array.isArray(v.requestStatus)) return fail("requestStatus is not an array");
  if (!nonEmptyString(v.requestId)) return fail("requestId is missing or empty", "XV-2");

  const artifacts: ArtifactCheck[] = v.artifacts.map((a, index) => {
    const problems: ValidationIssue[] = [];
    const check: ArtifactCheck = { index, usable: false, problems };
    if (!isRecord(a)) {
      problems.push({ rule: "XV-5", message: "the Artifact is not an object" });
      return check;
    }
    if (nonEmptyString(a.id)) check.id = a.id;
    else problems.push({ rule: "XV-5", message: "id is missing or empty" });
    if (!nonEmptyString(a.mediaType)) problems.push({ rule: "XV-5", message: "mediaType is missing" });
    if (!(Array.isArray(a.fulfills) && a.fulfills.length > 0 && a.fulfills.every(nonEmptyString))) {
      problems.push({ rule: "XV-5", message: "fulfills is not a non-empty array of item ids" });
    }
    if (nonEmptyString(a.mediaType) && !CORE_MEDIA_TYPES.includes(a.mediaType)) {
      problems.push({ rule: "XV-6", message: `mediaType ${a.mediaType} is not a supported type` });
    }
    if (a.mediaType === "application/fhir+json") {
      if (!nonEmptyString(a.fhirVersion)) problems.push({ rule: "XV-8", message: "fhirVersion is missing or empty" });
      if (!(isRecord(a.value) && typeof a.value.resourceType === "string")) {
        problems.push({ rule: "XV-8", message: "value is not an object with a string resourceType" });
      }
    }
    if (a.mediaType === "application/smart-health-card") {
      if (a.fhirVersion !== undefined) problems.push({ rule: "XV-9", message: "a SMART Health Card Artifact has fhirVersion" });
      const vc = isRecord(a.value) ? a.value.verifiableCredential : undefined;
      if (!(Array.isArray(vc) && vc.length > 0 && vc.every((x) => typeof x === "string"))) {
        problems.push({ rule: "XV-9", message: "value.verifiableCredential is not a non-empty array of strings" });
      }
    }
    return check;
  });
  // Two Artifacts sharing an id are both disregarded ([XV-5]).
  const counts = new Map<string, number>();
  for (const c of artifacts) if (c.id) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  for (const c of artifacts) {
    if (c.id && counts.get(c.id)! > 1) c.problems.push({ rule: "XV-5", message: `another Artifact has the id ${c.id}` });
    c.usable = c.problems.length === 0;
  }
  return { ok: true, value: v as unknown as SmartCheckinResponse, artifacts };
}

/** Status rows by item id: the status when there is exactly one valid row, otherwise why not ([XV-3]). */
function statusRows(resp: SmartCheckinResponse): Map<string, { status?: SmartCheckinItemStatus["status"]; message?: string; problem?: string }> {
  const rows = new Map<string, Array<Record<string, unknown>>>();
  for (const row of resp.requestStatus as unknown[]) {
    if (!isRecord(row) || !nonEmptyString(row.item)) continue;
    rows.set(row.item, [...(rows.get(row.item) ?? []), row]);
  }
  const out = new Map<string, { status?: SmartCheckinItemStatus["status"]; message?: string; problem?: string }>();
  for (const [id, list] of rows) {
    const row = list[0]!;
    if (list.length > 1) out.set(id, { problem: `${list.length} status rows` });
    else if (!(STATUS_CODES as readonly unknown[]).includes(row.status)) out.set(id, { problem: `status ${JSON.stringify(row.status)} is not one of the six codes` });
    else out.set(id, { status: row.status as SmartCheckinItemStatus["status"], ...(typeof row.message === "string" ? { message: row.message } : {}) });
  }
  return out;
}

function outcome(
  id: string,
  statuses: ReturnType<typeof statusRows>,
  artifacts: ArtifactCheck[],
  resp: SmartCheckinResponse,
): ItemOutcome {
  const row = statuses.get(id);
  const problems: ValidationIssue[] = [];
  if (!row) problems.push({ rule: "XV-3", message: "no status row" });
  else if (row.problem) problems.push({ rule: "XV-3", message: row.problem });
  return {
    id,
    ...(row?.status ? { status: row.status } : {}),
    ...(row?.message ? { message: row.message } : {}),
    artifacts: usable(artifacts, resp).filter((a) => a.fulfills.includes(id)),
    problems,
  };
}

function usable(artifacts: ArtifactCheck[], resp: SmartCheckinResponse): SmartArtifact[] {
  return artifacts.filter((c) => c.usable).map((c) => resp.artifacts[c.index]!);
}

function claimsProfile(artifacts: SmartArtifact[], canonical: string): boolean {
  const resources = (value: unknown): Array<{ meta?: { profile?: unknown } }> => {
    const v = value as { resourceType?: string; entry?: Array<{ resource?: unknown }> };
    if (v?.resourceType === "Bundle") return (v.entry ?? []).map((e) => e.resource as { meta?: { profile?: unknown } }).filter(Boolean);
    return v ? [v as { meta?: { profile?: unknown } }] : [];
  };
  return artifacts.some(
    (a) => a.mediaType === "application/fhir+json" && resources(a.value).some((r) => Array.isArray(r.meta?.profile) && r.meta!.profile.includes(canonical)),
  );
}

// ---------------------------------------------------------------- helpers

function parseText(text: string): { ok: true; value: unknown } | { ok: false; error: string; rule: string } {
  try {
    return { ok: true, value: parseJsonStrict(text) };
  } catch (e) {
    if (e instanceof JsonSyntaxError) return { ok: false, error: `not valid JSON: ${e.message}`, rule: "JSON-2" };
    throw e;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Kept for callers that only need ok/value/error. */
export type { ValidationResult };
