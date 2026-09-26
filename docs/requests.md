# Asking for data

A request is a list of items. Each item tells the patient what you're asking for, tells their wallet which data that means, and says which formats you can accept.

```ts
const request = {
  purpose: "Before your visit with Dr. Reyes",
  items: [
    {
      id: "coverage",
      title: "Insurance card",
      summary: "So we can check your coverage before you arrive.",
      content: { kind: "selection.fhir", resourceTypes: ["Coverage"] },
      accept: ["application/smart-health-card", "application/fhir+json"],
    },
  ],
};
```

Pass it to the picker (`picker.request = request`), to `wallet.start(request)`, or to `runCheckin(request)`.

## Items and titles

| Field | What it's for |
| --- | --- |
| `id` | Your name for the item. You look the answer up by it: `response.resources("coverage")`. |
| `title` | What the patient sees. Write it the way you'd say it: "Insurance card", not "Coverage resource". |
| `summary` | One line on why you need it. Optional. |
| `required` | How much the item matters to you. Advice only: the patient can always decline. |
| `content` | What data you mean: records (`selection.fhir`) or a form (`form.fhir`). |
| `accept` | The formats you can process, most preferred first. |

The request's `purpose` is one line the patient sees at the top. The library fills in the protocol fields (`type`, `version`, a unique `id`, `fhirVersions`).

## Records: by profile, family, or type

Use `selection.fhir` for data that already exists in the patient's app: allergies, medications, an insurance card.

| Selector | Asks for | Example |
| --- | --- | --- |
| `profiles` | Records with these exact profiles | `".../us-core-allergyintolerance"` |
| `profiles` with `\|version` | Only that version of the profile | `".../us-core-allergyintolerance\|7.0.0"` |
| `profilesFrom` | Records with any profile from this guide | `"http://hl7.org/fhir/us/core"` |
| `resourceTypes` | Records of these types; also narrows the two above | `["Immunization"]` |
| none | Anything the app will share | Occasionally useful, usually too broad |

`profiles` and `profilesFrom` add up; `resourceTypes` narrows them.

```ts
// Your allergy list
{ kind: "selection.fhir", profiles: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"] }

// Your US Core lab results
{ kind: "selection.fhir", profilesFrom: ["http://hl7.org/fhir/us/core"], resourceTypes: ["Observation"] }
```

Selectors describe what you want; they don't limit what the app sends. It may send more, less, or related records, such as the prescriber on a medication. Use what you can.

[§5.4.1 of the spec](https://smart-health-checkin.org/spec/#5-4-1-selection-fhir) defines the rules.

## Forms: inline or by URL

Use `form.fhir` when the answer doesn't exist yet: a PHQ-2, a symptom check, a consent question. You send a FHIR Questionnaire; the patient fills it in; you get a QuestionnaireResponse.

| Way | `content` | When |
| --- | --- | --- |
| Inline | `{ kind: "form.fhir", questionnaire: { … }, questionnaireCanonical: "url\|version" }` | Anything you wrote yourself. The app doesn't have to fetch anything. |
| By URL | `{ kind: "form.fhir", questionnaireCanonical: "https://…" }` | Standard instruments published at a stable URL. |

- The QuestionnaireResponse's `questionnaire` echoes your `questionnaireCanonical` exactly, `|version` included. The library checks that.
- A versioned canonical (`url|1`) asks for that exact version.
- Timing is yours: send a PHQ-2 the morning of the visit, not at scheduling.

The [tutorial](tutorial.md#step-3-ask-for-what-the-visit-needs) has a complete inline PHQ-2. [§5.4.2](https://smart-health-checkin.org/spec/#5-4-2-form-fhir) defines forms.

## Formats: FHIR and SMART Health Cards

`accept` lists the formats you can process, most preferred first.

| Format | What arrives |
| --- | --- |
| `application/fhir+json` | A FHIR resource or Bundle |
| `application/smart-health-card` | A SMART Health Card: FHIR data signed by whoever issued it, such as an insurer or a lab |

```ts
accept: ["application/smart-health-card", "application/fhir+json"] // a signed card if you have one, else FHIR
```

- List only formats you can process. A response in a format the item didn't accept fails validation.
- A card's signature tells you who issued the record, which plain FHIR can't. [Using the answer](responses.md#smart-health-cards) covers how cards are checked.

## Building a request

You can pass `{ purpose, items }` anywhere a request is accepted. To get the complete, validated request object, for example to store it or send it to your server:

```ts
import { checkinRequest } from "@smart-health-checkin/client";

const full = checkinRequest({ purpose, items }); // throws if it's malformed
```

## What not to put in a request

- **Nothing that identifies or authenticates you:** no credentials, tokens, or claims about who you are. The browser tells the app which website is asking.
- **No callback URLs.** The answer comes back to the page that asked.
- **No patient identifiers.** The app knows its patient; your page ties the answer to a chart.

`purpose`, `title`, and `summary` are text for the patient. A wallet must not treat them as evidence of anything.

Next: [Offering wallets](wallets.md)
