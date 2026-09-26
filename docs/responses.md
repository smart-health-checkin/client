# Using the answer

A completed check-in gives you a `CheckinResponse`: the full response as received, plus lookups by the item ids in your request.

```ts
const result = await wallet.start(myRequest);
if (result.status === "completed" && result.response) {
  const response = result.response;
  response.status("allergies");     // "fulfilled"
  response.resources("allergies");  // that item's FHIR resources
  response.json;                    // everything, as received
}
```

From the picker, it's `event.detail.response`.

Before you get it, the library has:

- **decrypted it** with a key your page made for this one request, bound to your page's origin;
- **checked the signatures** on the response and the data it carries;
- **matched it to your request:** the same request id, one status per item, only formats each item accepts;
- **checked every SMART Health Card** against the trust you configured.

It hasn't judged the content. A medication list can pass every check and be a year old.

## Statuses

Every item in your request comes back with exactly one status.

| Status | Means |
| --- | --- |
| `fulfilled` | Shared as asked |
| `partial` | Some of it, for example two of five years of history |
| `unavailable` | The health app doesn't have it |
| `declined` | The patient chose not to share this item |
| `unsupported` | The health app can't handle this kind of item |
| `error` | Something went wrong in the health app |

Declined and partial items are normal. Show what came through, and ask for the rest.

```ts
for (const item of response.items()) {
  if (item.status !== "fulfilled") askMyFormAbout(item.id);
}
```

## Lookups

| Method | Returns |
| --- | --- |
| `status(itemId)` | That item's status |
| `resources(itemId, { type? })` | The item's FHIR resources, from Bundles and accepted health cards, optionally one type |
| `form(itemId)` | A form item's QuestionnaireResponse |
| `items()` | Every item in your request, with its status and artifacts |
| `entries(itemId)` | The item's resources with where each came from: a Bundle or a card, and the card's trust result |
| `healthCards(itemId)` | Every health card for the item, accepted or not |
| `artifacts(itemId)` | The raw artifacts that fulfill the item |
| `resolve(entry, reference)` | Follow a reference within the entry's own Bundle or card |
| `json` | The full response as received. Plain JSON, safe to store or send. |

How they handle the awkward cases:

- **One artifact, several items.** An artifact that fulfills "problems" and "allergies" shows up under both.
- **Bundles and single resources** are both unwrapped into resources.
- **References are left as sent.** Bundles use `urn:uuid:` references and health cards use `resource:0`; `resolve` follows either.

`JSON.stringify(response)` gives the same JSON as `response.json`.

## SMART Health Cards

A health card is signed by its issuer: an insurer, a lab, a state registry. Every card is checked before you see the response, against trust you set once.

```ts
import { configureHealthCardTrust } from "@smart-health-checkin/client";

configureHealthCardTrust({ directory: "vci" });                         // issuers in the VCI directory
configureHealthCardTrust({ issuers: ["https://issuer.example"] });      // named issuers
configureHealthCardTrust({ keys: { "https://issuer.example": jwks } }); // keys you ship, no fetch
```

`accept` decides which cards `resources()` includes:

| `accept` | Trusted issuer, valid signature | Other issuer, valid signature | Invalid signature |
| --- | --- | --- | --- |
| `"trusted"` (default) | Included | Left out | Left out |
| `"any-valid"` (testing, connectathon) | Included | Included | Left out |
| `"everything"` (debugging) | Included | Included | Included |

- Every card appears in `healthCards()` and `entries()`, whatever `accept` says, with `valid`, `trusted`, `accepted`, and a `reason` when it isn't.
- Set trust for one check-in with `runCheckin(request, { healthCards: { accept: "any-valid" } })`, or the picker's `checkinOptions`.
- `configureHealthCardTrust` applies to every copy of the library on the page. Trust set through the hosted `checkin.js` also reaches the picker in `ui.js`.
- If you store a card, store the JWS as received (`card.jws`). The signature is in the token; unpacked FHIR loses it.

## Prefill, then ask only for what's missing

Records often arrive incomplete. US Core requires an allergy's substance and status, but not the reaction or severity, so many say only "Latex". Ask only for the missing parts:

```ts
const rows = response.resources("allergies", { type: "AllergyIntolerance" }).map((a) => ({
  name: a.code?.text,
  reactions: (a.reaction ?? []).flatMap((r) => r.manifestation ?? []).map((m) => m.text),
  criticality: a.criticality,
}));

const needsDetail = rows.filter(
  (row) => row.reactions.length === 0 || !row.criticality || row.criticality === "unable-to-assess",
);
```

- **Keep the manual path.** The patient can always type it in, and it lands in the same review as prefilled data.
- **Keep the provenance.** "From the app", "typed by the patient", and "from the app, confirmed" are different facts.

The [allergy example](../demo/autofill.html) does this end to end.

## Storing it

The library doesn't store anything. Send `response.json` to your server, map it into your own data model, or write FHIR with the optional module below. Wherever it lands, mark it as supplied by the patient, and make sure someone reviews it before it reaches a chart.

## Writing FHIR

`@smart-health-checkin/client/fhir` builds a FHIR transaction from a response. It's a separate import, so nothing in the check-in depends on it.

```ts
import { buildCheckinBundle, postCheckinBundle } from "@smart-health-checkin/client/fhir";

const plan = buildCheckinBundle({
  request: result.request,
  response: result.response.json,
  context: { patient: "Patient/123", appointment: "Appointment/456" },
});

plan.bundle;   // a transaction Bundle: inspect or edit it
plan.entries;  // the same entries, with the artifact each came from

await postCheckinBundle(plan, { fhirBase: "https://fhir.example.org/r4" });
```

What the mapping does:

| Input | Output |
| --- | --- |
| Each FHIR artifact | One `POST` per resource, in one transaction |
| Each SMART Health Card | A `DocumentReference` holding the signed token, whole |
| The check-in itself | A `Provenance`: supplied by the patient, when, through which request, pointing at every created resource |
| `context` | Patient and appointment, recorded as identifiers on the Provenance |

- `buildCheckinBundle` makes no network calls. Test it, show it to a reviewer, or send it with your own client.
- It never matches the patient. What you pass as `context` is what it writes.

`postCheckinBundle` options:

| Option | What it does |
| --- | --- |
| `mode: "transaction"` (default) | One transaction Bundle |
| `mode: "individual"` | One `POST` per resource, then the Provenance with the server's locations, for servers that handle transactions poorly |
| `fetchImpl` | Your own `fetch`, with your credentials, retries, and tracing |

Writing into your own data model is often the better choice. The [allergy example](../demo/autofill.html) shows the same data both ways.

Next: [Going to production](production.md)
