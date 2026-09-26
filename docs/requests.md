# Request model

A request is a list of items. Each item tells the patient what you are asking
for, tells their health app which data that means, and tells both which
formats you can accept.

```ts
{
  id: "coverage",                         // your id for this item
  title: "Insurance coverage",            // shown to the patient
  summary: "So we can verify benefits before your visit.",
  required: true,                         // advisory — the patient still chooses
  content: { kind: "selection.fhir", profilesFrom: ["http://hl7.org/fhir/us/carin-bb"] },
  accept: ["application/smart-health-card", "application/fhir+json"],
}
```

The fields:

- `id` is how you refer to this item. Statuses and artifacts in the response
  point back to it.
- `title` and `summary` are shown to the patient.
- `required` tells the app how much the item matters to you. It is advice
  only: the protocol cannot force a share, and any item can come back
  `declined`.
- `content` describes the data. There are two kinds, covered below.
- `accept` lists the formats you can process, most preferred first.

## Existing records: `selection.fhir`

Use `selection.fhir` when the data probably already exists in the patient's
app: allergies, medications, an insurance card. Three optional selectors
narrow it, and they can be combined:

| Selector | Means | Example |
| --- | --- | --- |
| `profiles` | These exact profiles (StructureDefinition canonical URLs) | `.../us-core-allergyintolerance` |
| `profilesFrom` | Anything from this implementation guide | `http://hl7.org/fhir/us/core` |
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

If you give no selector at all, you are asking for any patient data the app
is willing to share. That is occasionally what you want and usually too broad.

Selectors describe what you are asking for; they do not limit what the app
may send. An app can return more, less, or related data. Validate what
arrives against what you can use. The library checks that the response
follows the protocol; it does not check that the clinical content is correct
or complete.

## Questionnaires: `form.fhir`

Use `form.fhir` when the answer does not exist yet and the patient has to
provide it: a PHQ-2, a symptom check, a consent question. Give the app a FHIR
Questionnaire, either by its canonical URL or by including the whole resource
in the request:

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

Including the resource is the safer choice for anything you wrote yourself,
because the app does not have to fetch a URL it may not be able to reach. A
canonical URL works well for standard instruments that apps already know.

Timing is up to your page. If you want a PHQ-2 answered close to the visit,
send that request the morning of the visit rather than at scheduling. The
protocol has no opinion about when a request is sent.

## Formats: `accept`

`accept` is an ordered list of the formats you can process. The protocol
defines two:

- `application/fhir+json` is a FHIR resource or Bundle. The artifact also
  carries a `fhirVersion`.
- `application/smart-health-card` is a SMART Health Card: FHIR data signed by
  whoever issued it. The signature tells you who issued the record, which
  plain FHIR cannot.

```ts
accept: ["application/smart-health-card", "application/fhir+json"]
```

Order expresses preference. The list above means "a signed card if you have
one, otherwise plain FHIR". List only formats you can actually process: if an
app returns a format that is not in the item's `accept` list, the library
rejects the response.

## Two ways to pass a request

`runCheckin`, `wallet.start`, and the picker's `request` property take either form:

| Form | When |
| --- | --- |
| `{ purpose, items }` | The usual one. The library fills in the protocol fields and a unique id. |
| A complete `SmartCheckinRequest` | When you built or stored the whole object yourself. |

`checkinRequest({ purpose, items })` returns the completed, validated request, for when you want to inspect it, cache it, or send it somewhere. A malformed request throws.

## What must not go in a request

Do not put anything in a request that identifies you, authenticates you, or
tells the app where to send the answer: no credentials, no callback URLs, no
claims about who you are. `purpose` and `title` are text for the patient to
read, and a health app must not treat them as evidence of anything. Your
identity is established by the browser, which tells the app which web origin
is asking. 

Next: [Response model](responses.md)
