/**
 * Which of a patient's records answer a `selection.fhir` item (spec §5.4.1, §5.5).
 *
 * - `profiles`: a resource matches when its `meta.profile` has the requested
 *   canonical. Unversioned requests match any version; versioned ones need
 *   that exact version.
 * - `profilesFrom`: matches any profile whose URL starts with the family's URL and "/" ([SEL-5]).
 * - `profiles` and `profilesFrom` together are additive; `resourceTypes`
 *   narrows either, or selects by type on its own.
 * - No selector at all: everything.
 *
 * `selectEntries` also brings along the resources a match references (a
 * prescriber, a payer), so references in the returned Bundle resolve.
 */

export type MatchableResource = { resourceType: string; meta?: { profile?: ReadonlyArray<string> }; [key: string]: unknown };
export type MatchableEntry = { fullUrl: string; resource: MatchableResource };

export type SelectionContent = {
  kind: "selection.fhir";
  profiles?: ReadonlyArray<string>;
  profilesFrom?: ReadonlyArray<string>;
  resourceTypes?: ReadonlyArray<string>;
};

const splitCanonical = (c: string) => {
  const bar = c.indexOf("|");
  return bar < 0 ? { url: c, version: undefined } : { url: c.slice(0, bar), version: c.slice(bar + 1) };
};

function profileMatches(declared: string, requested: string): boolean {
  const want = splitCanonical(requested);
  const have = splitCanonical(declared);
  if (want.url !== have.url) return false;
  return want.version === undefined || want.version === have.version;
}

/** [SEL-5]: a profile is in a family when its URL, without |version, starts with the family URL and "/". */
function inFamily(declared: string, family: string): boolean {
  const base = splitCanonical(family).url.replace(/\/+$/, "");
  return splitCanonical(declared).url.startsWith(base + "/");
}

/** Does this resource answer the selector? */
export function selects(content: SelectionContent, resource: MatchableResource): boolean {
  const profiles = resource.meta?.profile ?? [];
  const hasProfileSelector = !!(content.profiles?.length || content.profilesFrom?.length);
  const typeOk = !content.resourceTypes?.length || content.resourceTypes.includes(resource.resourceType);
  if (!hasProfileSelector) return typeOk;
  const byProfile =
    (content.profiles ?? []).some((p) => profiles.some((d) => profileMatches(d, p))) ||
    (content.profilesFrom ?? []).some((f) => profiles.some((d) => inFamily(d, f)));
  return byProfile && typeOk;
}

/**
 * The entries that answer the selector, plus the entries they reference.
 * `exclude` names fullUrls never to pull in by reference (usually the
 * Patient, which has its own item).
 */
export function selectEntries(
  content: SelectionContent,
  entries: ReadonlyArray<MatchableEntry>,
  options: { exclude?: ReadonlyArray<string> } = {},
): MatchableEntry[] {
  const noSelector = !content.profiles?.length && !content.profilesFrom?.length && !content.resourceTypes?.length;
  const primary = noSelector ? [...entries] : entries.filter((e) => selects(content, e.resource));
  const exclude = new Set(options.exclude ?? []);
  const byUrl = new Map(entries.map((e) => [e.fullUrl, e]));
  const out = new Map(primary.map((e) => [e.fullUrl, e]));
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        if (k === "reference" && typeof v === "string" && !exclude.has(v) && byUrl.has(v) && !out.has(v)) {
          out.set(v, byUrl.get(v)!);
          visit(byUrl.get(v)!.resource);
        } else visit(v);
      }
    }
  };
  primary.forEach((e) => visit(e.resource));
  return [...out.values()];
}
