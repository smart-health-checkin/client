/**
 * What came back, laid out the way the protocol promises it:
 *
 *   request items → a status each → the artifacts that fulfil them
 *                                    → the resources inside each artifact
 *                                      → a preview in the resource's own terms
 *
 * One artifact can fulfil several items and one item can be met by several
 * artifacts; that mapping is shown, not flattened. SMART Health Cards are
 * decoded (the JWS payload is a raw-DEFLATEd FHIR bundle) so their contents
 * read like any other artifact. Every level can be opened down to its JSON.
 *
 * Demo code: it is the clinic's business how to present a response, and
 * this is one reasonable way. Both demo apps use it.
 */
import type { SmartArtifact, SmartCheckinRequest, SmartCheckinResponse } from "../../src/index.js";

// ----------------------------------------------------------------- previews

export type ResourcePreview = {
  type: string;
  /** What the resource calls itself: "Latex", "Demo Mutual", "Jordan Reyes". */
  title: string;
  /** Short facts in reading order: status, dates, identifiers, values. */
  facts: string[];
  json: unknown;
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : undefined);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

/** CodeableConcept → text, else first coding's display, else its code. */
function cc(v: unknown): string | undefined {
  const c = obj(v);
  if (!c) return undefined;
  const coding = obj(arr(c.coding)[0]);
  return str(c.text) ?? str(coding?.display) ?? str(coding?.code);
}
function ref(v: unknown): string | undefined {
  const r = obj(v);
  return str(r?.display) ?? str(r?.reference);
}
function quantity(v: unknown): string | undefined {
  const q = obj(v);
  if (!q || q.value === undefined) return undefined;
  return `${q.value}${str(q.unit) ? " " + q.unit : str(q.code) ? " " + q.code : ""}`;
}
function humanName(v: unknown): string | undefined {
  const n = obj(arr(v)[0]);
  if (!n) return undefined;
  return str(n.text) ?? ([arr(n.given).join(" "), str(n.family)].filter(Boolean).join(" ") || undefined);
}
function period(v: unknown): string | undefined {
  const p = obj(v);
  if (!p) return undefined;
  return [str(p.start) && `from ${p.start}`, str(p.end) && `to ${p.end}`].filter(Boolean).join(" ") || undefined;
}
function value(r: Obj): string | undefined {
  return (
    quantity(r.valueQuantity) ?? cc(r.valueCodeableConcept) ?? str(r.valueString) ??
    (typeof r.valueBoolean === "boolean" ? String(r.valueBoolean) : undefined) ??
    (typeof r.valueInteger === "number" ? String(r.valueInteger) : undefined) ??
    str(r.valueDate) ?? str(r.valueDateTime) ?? quantity(r.valueQuantity)
  );
}
const status = (r: Obj): string | undefined => cc(r.clinicalStatus) ?? str(r.status);

/** One reasonable preview per resource type; anything unknown gets the generic one. */
export function previewResource(json: unknown): ResourcePreview {
  const r = obj(json) ?? {};
  const type = str(r.resourceType) ?? "resource";
  const f = (...xs: Array<string | undefined | false>) => xs.filter((x): x is string => !!x);

  switch (type) {
    case "AllergyIntolerance": {
      const reactions = arr(r.reaction).flatMap((x) => arr(obj(x)?.manifestation).map(cc)).filter(Boolean);
      return { type, title: cc(r.code) ?? "allergy", json, facts: f(
        status(r), str(r.criticality) && `criticality ${r.criticality}`,
        reactions.length ? `reactions: ${reactions.join(", ")}` : "no reaction recorded",
        str(r.onsetDateTime) && `onset ${r.onsetDateTime}`, str(r.recordedDate) && `recorded ${r.recordedDate}`,
      ) };
    }
    case "Condition":
      return { type, title: cc(r.code) ?? "condition", json, facts: f(status(r), cc(r.verificationStatus), str(r.onsetDateTime) && `onset ${r.onsetDateTime}`, str(r.recordedDate) && `recorded ${r.recordedDate}`) };
    case "MedicationRequest":
    case "MedicationStatement": {
      const dosage = str(obj(arr(r.dosageInstruction ?? r.dosage)[0])?.text);
      return { type, title: cc(r.medicationCodeableConcept) ?? ref(r.medicationReference) ?? "medication", json,
        facts: f(str(r.status), dosage, str(r.authoredOn) && `written ${r.authoredOn}`, str(r.effectiveDateTime) && `taken ${r.effectiveDateTime}`) };
    }
    case "Immunization":
      return { type, title: cc(r.vaccineCode) ?? "immunization", json, facts: f(str(r.status), str(r.occurrenceDateTime) && `given ${r.occurrenceDateTime}`, str(r.lotNumber) && `lot ${r.lotNumber}`, ref(obj(arr(r.performer)[0])?.actor)) };
    case "Coverage": {
      const cls = arr(r.class).map((c) => [cc(obj(c)?.type), str(obj(c)?.value) ?? str(obj(c)?.name)].filter(Boolean).join(" ")).filter(Boolean);
      return { type, title: ref(arr(r.payor)[0]) ?? cc(r.type) ?? "coverage", json,
        facts: f(str(r.status), cc(r.type), str(r.subscriberId) && `member ${r.subscriberId}`, ...cls, period(r.period)) };
    }
    case "Patient":
      return { type, title: humanName(r.name) ?? "patient", json, facts: f(str(r.birthDate) && `born ${r.birthDate}`, str(r.gender), ...arr(r.identifier).map((i) => str(obj(i)?.value)).filter((x): x is string => !!x).slice(0, 1).map((v) => `id ${v}`)) };
    case "Observation":
      return { type, title: cc(r.code) ?? "observation", json, facts: f(value(r), cc(arr(r.interpretation)[0]), str(r.effectiveDateTime) && `on ${r.effectiveDateTime}`, str(r.status)) };
    case "QuestionnaireResponse": {
      const answers = arr(r.item).map((it) => {
        const i = obj(it); if (!i) return undefined;
        const a = obj(arr(i.answer)[0]);
        const v = a ? value(a) ?? cc(a.valueCoding) ?? str(a.valueString) : undefined;
        return [str(i.text) ?? str(i.linkId), v].filter(Boolean).join(": ");
      }).filter((x): x is string => !!x);
      return { type, title: str(r.questionnaire) ? `Answers to ${String(r.questionnaire).split("/").pop()}` : "questionnaire answers", json,
        facts: f(str(r.status), str(r.authored) && `answered ${r.authored}`, ...answers.slice(0, 6), answers.length > 6 && `… ${answers.length - 6} more`) };
    }
    case "Procedure":
      return { type, title: cc(r.code) ?? "procedure", json, facts: f(str(r.status), str(r.performedDateTime) && `performed ${r.performedDateTime}`, period(r.performedPeriod)) };
    case "Encounter":
      return { type, title: cc(arr(r.type)[0]) ?? cc(r.class) ?? "encounter", json, facts: f(str(r.status), period(r.period), ref(r.serviceProvider)) };
    case "DocumentReference":
      return { type, title: cc(r.type) ?? str(r.description) ?? "document", json, facts: f(str(r.status), str(r.date), ...arr(r.content).map((c) => str(obj(obj(c)?.attachment)?.contentType)).filter((x): x is string => !!x)) };
    case "Organization":
    case "Practitioner":
    case "Location":
      return { type, title: str(r.name) ?? humanName(r.name) ?? type, json, facts: f(typeof r.active === "boolean" ? (r.active ? "active" : "inactive") : undefined) };
    default:
      return { type, title: cc(r.code) ?? str(r.title) ?? str(r.description) ?? str(r.name) ?? str(r.id) ?? type, json,
        facts: f(status(r), str(r.date) ?? str(r.effectiveDateTime) ?? str(r.authoredOn)) };
  }
}

/** The resources in a FHIR artifact: Bundle entries, or the one resource. */
export function resourcesIn(value: unknown): unknown[] {
  const v = obj(value);
  if (!v) return [];
  if (v.resourceType === "Bundle") return arr(v.entry).map((e) => obj(e)?.resource).filter(Boolean);
  return v.resourceType ? [v] : [];
}

// ------------------------------------------------------------ health cards

export type DecodedCard = {
  jws: string;
  issuer?: string;
  notBefore?: string;
  types: string[];
  bundle?: unknown;
  payload?: unknown;
  error?: string;
};

/** A SMART Health Card's payload is a raw-DEFLATEd JSON object inside the JWS. */
export async function decodeHealthCard(jws: string): Promise<DecodedCard> {
  try {
    const part = jws.split(".")[1] ?? "";
    const bytes = Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const payload = JSON.parse(await new Response(stream).text()) as Obj;
    const vc = obj(payload.vc);
    return {
      jws, payload,
      issuer: str(payload.iss),
      notBefore: typeof payload.nbf === "number" ? new Date(payload.nbf * 1000).toISOString().slice(0, 10) : undefined,
      types: arr(vc?.type).map(String).map((t) => t.replace("https://smarthealth.cards#", "")),
      bundle: obj(vc?.credentialSubject)?.fhirBundle,
    };
  } catch (e) {
    return { jws, types: [], error: (e as Error).message || "not decodable" };
  }
}

// ------------------------------------------------------------------ explain

export type ArtifactView = {
  artifact: SmartArtifact;
  kind: "fhir" | "card";
  /** Titles of the items this artifact fulfils. */
  fulfills: string[];
  cards: DecodedCard[];
  resources: ResourcePreview[];
};

export type ItemView = {
  id: string;
  title: string;
  status: string;
  message?: string;
  artifacts: ArtifactView[];
};

export type ResponseView = { items: ItemView[]; artifacts: ArtifactView[] };

export async function explainResponse(request: SmartCheckinRequest, response: SmartCheckinResponse): Promise<ResponseView> {
  const titleOf = new Map(request.items.map((i) => [i.id, i.title]));
  const artifacts: ArtifactView[] = [];
  for (const artifact of response.artifacts) {
    const fulfills = artifact.fulfills.map((id) => titleOf.get(id) ?? id);
    if (artifact.mediaType === "application/smart-health-card") {
      const cards = await Promise.all(artifact.value.verifiableCredential.map(decodeHealthCard));
      artifacts.push({ artifact, kind: "card", fulfills, cards, resources: cards.flatMap((c) => resourcesIn(c.bundle).map(previewResource)) });
    } else {
      artifacts.push({ artifact, kind: "fhir", fulfills, cards: [], resources: resourcesIn(artifact.value).map(previewResource) });
    }
  }
  const byItem = new Map(response.requestStatus.map((s) => [s.item, s]));
  const items = request.items.map((item) => ({
    id: item.id,
    title: item.title,
    status: byItem.get(item.id)?.status ?? "—",
    ...(byItem.get(item.id)?.message ? { message: byItem.get(item.id)!.message } : {}),
    artifacts: artifacts.filter((a) => a.artifact.fulfills.includes(item.id)),
  }));
  return { items, artifacts };
}

/** One line for a table cell: "a1 · FHIR, 3 resources". */
export function artifactLabel(view: ArtifactView): string {
  const n = view.resources.length;
  const what = view.kind === "card" ? `health card${view.cards.length > 1 ? "s" : ""}` : "FHIR";
  return `${view.artifact.id} · ${what}, ${n} resource${n === 1 ? "" : "s"}`;
}

// ------------------------------------------------------------------- render

const STYLE = `
.xp { display:flex; flex-direction:column; gap:8px; font-size:var(--fs-sm); }
.xp-matrix-wrap { overflow-x:auto; margin:0 0 4px; }
.xp-matrix { width:auto; min-width:100%; border-collapse:collapse; }
.xp-matrix th, .xp-matrix td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; white-space:nowrap; }
.xp-matrix th:first-child, .xp-matrix td:first-child { white-space:normal; max-width:12rem; padding-right:12px; line-height:1.3; }
.xp-matrix th { font-weight:600; color:var(--fg-1); vertical-align:bottom; }
.xp-matrix th.art { text-align:center; font-family:var(--font-mono); font-size:11px; line-height:1.25; white-space:normal; overflow-wrap:anywhere; max-width:7rem; }
.xp-matrix th.art small { display:block; font-family:var(--font-sans); font-weight:400; font-size:11px; color:var(--fg-3); white-space:nowrap; margin-top:2px; }
.xp-status { display:inline-flex; align-items:center; gap:6px; font-size:var(--fs-sm); color:var(--fg-2); }
.xp-status::before { content:""; width:8px; height:8px; border-radius:50%; background:var(--gray-400); flex:none; }
.xp-status.success::before { background:var(--success); }
.xp-status.info::before { background:var(--info); }
.xp-status.warning::before { background:var(--warning); }
.xp-status.danger::before { background:var(--danger); }
.xp-matrix td.cell { text-align:center; color:var(--border-strong); width:1%; padding:2px 8px; }
.xp-open { font:inherit; background:none; border:0; padding:0; color:inherit; cursor:pointer; border-radius:var(--radius-sm); }
.xp-open:hover, .xp-open:focus-visible { color:var(--brand); outline:none; text-decoration:underline; }
.xp-dot { width:28px; height:28px; border-radius:50%; border:0; background:none; cursor:pointer; color:var(--brand); font-size:16px; line-height:1; display:inline-flex; align-items:center; justify-content:center; }
.xp-dot:hover, .xp-dot:focus-visible { background:var(--brand); color:#fff; outline:none; }
.xp-matrix td.on.xp-hl .xp-dot { background:var(--brand); color:#fff; }
.xp-art.xp-hl > summary { background:var(--brand-wash); }
.xp-art.xp-flash { box-shadow:0 0 0 3px var(--brand-wash); }
.xp-art { transition: box-shadow .3s ease; }
.xp-art { border:1px solid var(--border); border-radius:var(--radius-md); background:var(--surface); overflow:hidden; }
.xp-art > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:12px; padding:6px 12px; background:var(--gray-50); border-bottom:1px solid transparent; }
.xp-art[open] > summary { border-bottom-color:var(--border); }
.xp-art > summary::-webkit-details-marker { display:none; }
.xp-art > summary::before { content:"\\25B8"; color:var(--fg-3); font-size:var(--fs-xs); flex:none; }
.xp-art[open] > summary::before { content:"\\25BE"; }
.xp-id { font-family:var(--font-mono); font-weight:600; color:var(--fg-1); white-space:nowrap; }
.xp-mt { font-family:var(--font-mono); font-size:var(--fs-xs); color:var(--fg-3); flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.xp-json-btn { flex:none; margin-left:auto; }
.xp-card .xp-json-btn { margin-left:auto; }
.xp-card { padding:8px 12px; color:var(--fg-2); border-bottom:1px solid var(--border-subtle); display:flex; flex-wrap:wrap; gap:4px 12px; }
.xp-card .xp-id { color:var(--fg-2); font-weight:500; }
.xp-res { border-bottom:1px solid var(--border-subtle); }
.xp-res:last-child { border-bottom:0; }
.xp-res > summary { list-style:none; cursor:pointer; display:grid; grid-template-columns:10rem minmax(0,1fr); gap:12px; padding:7px 12px; }
.xp-res > summary::-webkit-details-marker { display:none; }
.xp-res > summary:hover { background:var(--gray-50); }
.xp-type { font-weight:600; color:var(--fg-1); }
.xp-title { color:var(--fg-1); }
.xp-facts { color:var(--fg-3); }
.xp-facts span + span::before { content:" · "; }
.xp-empty { padding:8px 12px; color:var(--fg-3); }
.xp pre { margin:0; padding:10px 12px; background:var(--gray-50); border-top:1px solid var(--border); border-bottom:1px solid var(--border); overflow:auto; max-height:22rem; font-family:var(--font-mono); font-size:var(--fs-xs); line-height:1.6; color:var(--fg-1); }
.xp-res > pre { border-bottom:0; }
@media (max-width: 40rem) { .xp-res > summary { grid-template-columns:minmax(0,1fr); gap:2px; } }
`;

function ensureStyle(): void {
  if (document.getElementById("xp-style")) return;
  const style = document.createElement("style");
  style.id = "xp-style";
  style.textContent = STYLE;
  document.head.append(style);
}

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

/**
 * A button that shows `json` as a block right after `anchor`.
 *
 * Showing JSON is a sub-state of its box being open: the button opens the
 * box first if it is collapsed, and when the box collapses the block is
 * removed and the button reads "JSON" again — a closed box never carries a
 * "hide JSON" button for something you can't see. `resets` collects the
 * function the box calls to do that.
 */
function jsonToggle(
  json: unknown,
  anchor: HTMLElement,
  box: { reveal?: HTMLDetailsElement; resets: Array<() => void> },
  label = "JSON",
): HTMLButtonElement {
  const button = h("button", "smart-btn sm mono xp-json-btn", label);
  button.type = "button";
  let pre: HTMLPreElement | null = null;
  const hide = (): void => {
    pre?.remove();
    pre = null;
    button.textContent = label;
  };
  box.resets.push(hide);
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (pre) { hide(); return; }
    if (box.reveal) box.reveal.open = true;
    pre = h("pre", "xp-json", JSON.stringify(json, null, 2));
    anchor.insertAdjacentElement("afterend", pre);
    button.textContent = `hide ${label}`;
  };
  return button;
}

/** The card as JSON, with its FHIR bundle replaced by a pointer to the rows below. */
function cardEnvelope(card: DecodedCard): unknown {
  const payload = obj(card.payload);
  if (!payload) return { jws: card.jws };
  const vc = obj(payload.vc);
  const subject = obj(vc?.credentialSubject);
  const n = resourcesIn(subject?.fhirBundle).length;
  return {
    ...payload,
    vc: { ...vc, credentialSubject: { ...subject, fhirBundle: `(${n} resource${n === 1 ? "" : "s"} — listed below)` } },
    jws: `${card.jws.slice(0, 24)}… (${card.jws.length} chars)`,
  };
}

const STATUS_TONE: Record<string, string> = { fulfilled: "success", partial: "info", declined: "warning", error: "danger" };

/** Items down, artifacts across; a dot where an artifact fulfils an item. */
function renderMatrix(view: ResponseView): HTMLTableElement {
  const table = h("table", "xp-matrix");
  const head = h("tr");
  head.append(h("th", undefined, "Requested"), h("th", undefined, "Status"));
  view.artifacts.forEach((a, i) => {
    const th = h("th", "art");
    th.dataset.art = String(i);
    const open = h("button", "xp-open", a.artifact.id);
    open.type = "button";
    open.dataset.art = String(i);
    open.title = `Open ${a.artifact.id} below`;
    const n = a.resources.length;
    th.append(open, h("small", undefined, `${a.kind === "card" ? "card" : "FHIR"}, ${n} resource${n === 1 ? "" : "s"}`));
    head.append(th);
  });
  if (!view.artifacts.length) head.append(h("th", "art", "—"));
  const thead = h("thead");
  thead.append(head);
  table.append(thead);
  const body = h("tbody");
  for (const item of view.items) {
    const tr = h("tr");
    tr.append(h("td", undefined, item.title));
    const status = h("td");
    const mark = h("span", `xp-status ${STATUS_TONE[item.status] ?? "plain"}`, item.status);
    if (item.message) mark.title = item.message;
    status.append(mark);
    tr.append(status);
    view.artifacts.forEach((a, i) => {
      const on = a.artifact.fulfills.includes(item.id);
      const td = h("td", on ? "cell on" : "cell");
      td.dataset.art = String(i);
      if (on) {
        const dot = h("button", "xp-dot", "●");
        dot.type = "button";
        dot.dataset.art = String(i);
        dot.setAttribute("aria-label", `${a.artifact.id} fulfils ${item.title} — open it`);
        td.append(dot);
      } else {
        td.textContent = "·";
      }
      tr.append(td);
    });
    if (!view.artifacts.length) tr.append(h("td", "cell", "·"));
    body.append(tr);
  }
  table.append(body);
  return table;
}

/** The matrix, then the artifacts: resources inside each, JSON at every level. */
export function renderExplorer(container: HTMLElement, view: ResponseView): void {
  ensureStyle();
  container.innerHTML = "";
  container.classList.add("xp");
  const table = renderMatrix(view);
  const scroller = h("div", "xp-matrix-wrap");
  scroller.append(table);
  container.append(scroller);
  const boxes: HTMLDetailsElement[] = [];
  view.artifacts.forEach((a, i) => {
    const details = h("details", "xp-art");
    details.dataset.art = String(i);
    boxes.push(details);
    details.open = view.artifacts.length === 1;
    const resets: Array<() => void> = [];
    details.addEventListener("toggle", () => { if (!details.open) for (const reset of resets) reset(); });
    const summary = h("summary");
    summary.append(
      h("span", "xp-id", a.artifact.id),
      h("span", "xp-mt", a.artifact.mediaType + ("fhirVersion" in a.artifact ? ` · FHIR ${a.artifact.fhirVersion}` : "")),
    );
    details.append(summary);

    for (const card of a.cards) {
      const line = h("div", "xp-card");
      line.append(h("span", "xp-id", "SMART Health Card"));
      if (card.error) line.append(h("span", undefined, `not decodable: ${card.error}`));
      else line.append(
        h("span", undefined, card.issuer ? `issued by ${card.issuer}` : "no issuer"),
        h("span", undefined, card.notBefore ? `from ${card.notBefore}` : ""),
        h("span", "xp-mt", card.types.join(", ")),
      );
      line.append(jsonToggle(cardEnvelope(card), line, { resets }, "card"));
      details.append(line);
    }

    if (!a.resources.length) details.append(h("div", "xp-empty", a.kind === "card" ? "The card carries no FHIR bundle." : "No FHIR resources in this artifact."));
    for (const r of a.resources) {
      const res = h("details", "xp-res");
      const sum = h("summary");
      sum.append(h("span", "xp-type", r.type));
      const right = h("span");
      right.append(h("span", "xp-title", r.title), " ");
      const facts = h("span", "xp-facts");
      for (const fact of r.facts) facts.append(h("span", undefined, fact));
      right.append(facts);
      sum.append(right);
      res.append(sum, h("pre", undefined, JSON.stringify(r.json, null, 2)));
      details.append(res);
    }
    container.append(details);
  });

  // Quiet cross-highlighting: a dot points at its artifact box, and a box
  // points back at its dots. Nothing else in the table reacts, so moving
  // across the matrix doesn't make rows and columns flash. Clicking a dot or
  // a header opens the box and brings it into view.
  const highlight = (index: number | null, from: "table" | "box"): void => {
    for (const e of container.querySelectorAll(".xp-hl")) e.classList.remove("xp-hl");
    if (index === null) return;
    if (from === "table") boxes[index]?.classList.add("xp-hl");
    else for (const e of table.querySelectorAll(`td.on[data-art="${index}"]`)) e.classList.add("xp-hl");
  };
  const indexOf = (target: EventTarget | null): number | null => {
    const hit = (target as HTMLElement | null)?.closest?.("button[data-art]") as HTMLElement | null;
    return hit ? Number(hit.dataset.art) : null;
  };
  table.addEventListener("mouseover", (e) => highlight(indexOf(e.target), "table"));
  table.addEventListener("mouseleave", () => highlight(null, "table"));
  table.addEventListener("focusin", (e) => highlight(indexOf(e.target), "table"));
  table.addEventListener("focusout", () => highlight(null, "table"));
  table.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest("button[data-art]") as HTMLElement | null;
    if (!button) return;
    const box = boxes[Number(button.dataset.art)];
    if (!box) return;
    box.open = true;
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    box.classList.add("xp-flash");
    setTimeout(() => box.classList.remove("xp-flash"), 1200);
  });
  boxes.forEach((box, i) => {
    box.addEventListener("mouseenter", () => highlight(i, "box"));
    box.addEventListener("mouseleave", () => highlight(null, "box"));
  });
}
