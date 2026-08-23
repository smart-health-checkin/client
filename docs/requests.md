# Request model

A check-in request is a short list of things you're asking for. Each item
says three things: what it is *to the patient*, what it is *to their app*,
and what formats you'll take.

```ts
{
  id: "coverage",                         // your handle for this item
  title: "Insurance coverage",            // shown to the patient
  summary: "So we can verify benefits before your visit.",
  required: true,                         // advisory — the patient still chooses
  content: { kind: "selection.fhir", profilesFrom: ["http://hl7.org/fhir/us/carin-bb"] },
  accept: ["application/smart-health-card", "application/fhir+json"],
}
```

`required` is a hint about how much the item matters to you, not a
constraint. Nothing in this protocol can compel a share, and any item can
come back `declined`.

## Existing records: `selection.fhir`

Use this when the patient's app is likely to *have* the data already. Three
selectors, all optional and additive:

| Selector | Means | Example |
| --- | --- | --- |
| `profiles` | These exact StructureDefinitions | `.../us-core-allergyintolerance` |
| `profilesFrom` | Anything from this profile family / IG | `http://hl7.org/fhir/us/core` |
| `resourceTypes` | Plain FHIR resource types | `["Immunization"]` |

```ts
// "Your allergy list"
content: {
  kind: "selection.fhir",
  profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
}

// "Whatever US Core clinical data you have, with these especially"
content: {
  kind: "selection.fhir",
  profilesFrom: ["http://hl7.org/fhir/us/core"],
  profiles: [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
  ],
}
```

Omit every selector and you're saying "any patient-specific FHIR you care to
share" — occasionally what you want, usually too broad to be polite.

**Selectors are a request, not a filter.** A wallet may return more, less, or
adjacent data. Always validate what arrives against what you can actually
use; the kit checks protocol conformance, not clinical fitness.

## Questionnaires: `form.fhir`

Use this when the answer doesn't exist yet — a PHQ-2, a symptom check, a
consent question. Point at a Questionnaire canonical, or inline the whole
resource:

```ts
content: {
  kind: "form.fhir",
  questionnaireCanonical: "https://fhir.loinc.org/Questionnaire/55757-9",
}
```

```ts
content: {
  kind: "form.fhir",
  questionnaire: { resourceType: "Questionnaire", status: "active", item: [ /* … */ ] },
}
```

Inline is the pragmatic choice for anything bespoke: the wallet doesn't have
to resolve a URL it may not be able to reach. Canonicals are better for
standard instruments the ecosystem already knows.

This is the mechanism behind timed asks — a PHQ-2 you only want *fresh*
belongs in a request you send the morning of the visit, not one you send at
scheduling. The protocol has no scheduling opinion; your page decides when to
ask.

## Formats: `accept`

An ordered preference list. Two are defined:

- `application/fhir+json` — a FHIR resource or Bundle, with `fhirVersion`.
- `application/smart-health-card` — a signed SMART Health Card (JWS), which
  carries issuer provenance the raw FHIR does not.

```ts
accept: ["application/smart-health-card", "application/fhir+json"]
```

Order signals preference: "a signed card if you have one, otherwise plain
FHIR." Only list what you can actually process — the kit rejects a response
whose artifact type isn't in your `accept` list.

## Three ways to pass a request

Three shapes, all accepted by `requestCheckin` and `runCheckin`:

```ts
await requestCheckin({ purpose, items });          // inline (boilerplate filled in)
await requestCheckin(myFullSmartCheckinRequest);   // a complete request object
await requestCheckin({ scenario: "visit-prep" });  // a name you registered
```

`buildRequest(init)` returns the completed object if you want to inspect,
cache, or serialize it. `registerScenario(name, init)` names one so
declarative surfaces (or a demo page's URL) can refer to it:

```ts
import { registerScenario } from "@smart-health-checkin/client";

registerScenario("visit-prep", {
  purpose: "Before your visit",
  items: [ /* … */ ],
});
```

The library ships a few demo scenarios (`visit-prep`, `insurance-only`,
`new-patient`, `phq2-dayof`, `allergy-review`, `medlist-refresh`) — they exist for the demo
pages and for reading, not as a blessed vocabulary. Write your own.

## What must not go in a request

No requester identity, no credentials, no callback URLs, no trust claims.
`purpose` and `title` are display strings — a wallet must never treat them as
proof of who is asking. Who you are is established by the browser-asserted
origin (and, optionally, reader authentication), not by anything you type
into the request body.

Next: [Response model](responses.md)
