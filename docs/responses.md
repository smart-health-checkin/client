# Response model

A completed check-in gives you a `CheckinResponse`: the full response as received, plus lookups by the item ids in your request.

```ts
const result = await wallet.start(myRequest);
if (result.status === "completed") {
  const response = result.response;
  response.status("allergies");    // "fulfilled"
  response.resources("allergies"); // FHIR resources for that item
  response.json;                   // everything, as received
}
```

## What's already been checked

By the time you have a `CheckinResponse`, the library has:

- **Decrypted it** with a key your page made for this one request, bound to your page's origin. A response captured elsewhere or replayed won't decrypt.
- **Checked the signatures** on the response and on the data it carries.
- **Matched it to your request:** the same request id, one status per item, every artifact pointing at a real item, and only formats that item accepts.
- **Checked every SMART Health Card** against the trust you configured (see [below](#smart-health-cards)).

It hasn't judged the content. A response can pass every check and carry a medication list that's a year old. Whether the data is right is for you and the clinician.

## Lookups

| Method | Returns |
| --- | --- |
| `json` | The full response as received: `requestStatus`, and every artifact with its `fulfills` item ids and value. Plain JSON, safe to store or send to your server. |
| `status(itemId)` | That item's status (table below) |
| `resources(itemId, { type? })` | The item's FHIR resources, from Bundles and accepted health cards, optionally one resource type |
| `form(itemId)` | A form item's QuestionnaireResponse |
| `entries(itemId)` | The item's resources with where each came from: a Bundle or a card, and the card's trust result |
| `healthCards(itemId)` | Every health card for the item, accepted or not |
| `artifacts(itemId)` | The raw artifacts that fulfill the item |
| `items()` | Every item in your request, with its status and artifacts |
| `resolve(entry, reference)` | Follow a reference within the entry's own Bundle or card |

`JSON.stringify(response)` gives the same JSON as `response.json`.

How the lookups handle the awkward cases:

- **One artifact, several items.** An artifact that fulfills "problems" and "allergies" shows up under both.
- **Bundles and single resources** are both unwrapped into resources.
- **References are left as sent.** Bundles use `urn:uuid:` references, health cards use `resource:0`; `resolve` follows either.

## Per-item status

| Status | Means |
| --- | --- |
| `fulfilled` | Shared as asked |
| `partial` | Some of it, for example two of five years of history |
| `unavailable` | The health app doesn't have it |
| `declined` | The patient chose not to share this item |
| `unsupported` | The health app can't handle this kind of ask |
| `error` | Something went wrong in the health app |

Declined and partial items are normal. Show what came through, and offer your own form for the rest.

```ts
for (const item of response.items()) {
  if (item.status !== "fulfilled") askMyFormAbout(item.id);
}
```

## SMART Health Cards

A health card is signed by its issuer: a lab, a pharmacy, a state registry. The library checks each card before you see the response, against trust you set once:

```ts
import { configureHealthCardTrust } from "@smart-health-checkin/client";

configureHealthCardTrust({ directory: "vci" });                       // issuers in the VCI directory
configureHealthCardTrust({ issuers: ["https://issuer.example"] });    // named issuers
configureHealthCardTrust({ keys: { "https://issuer.example": jwks } }); // keys you ship, no fetch
```

`accept` decides which cards `resources()` includes:

| `accept` | Trusted issuer, valid signature | Other issuer, valid signature | Invalid signature |
| --- | --- | --- | --- |
| `"trusted"` (default) | Included | Left out | Left out |
| `"any-valid"` (connectathon) | Included | Included | Left out |
| `"everything"` (debugging) | Included | Included | Included |

- Every card appears in `healthCards()` and `entries()`, whatever `accept` says, with `valid`, `trusted`, `accepted`, and a `reason` when it isn't.
- Pass trust for one check-in with `runCheckin(request, { healthCards: { accept: "any-valid" } })`, or `checkinOptions` on the picker.
- If you store health cards, store the JWS as received (`card.jws`). The issuer's signature is in the token; unpacked FHIR loses it.

## Prefill, then ask only for what's missing

Records often arrive incomplete. US Core requires an allergy's substance and status, but not the reaction or severity, so many records say only "Latex". Ask only for what's missing:

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

The [allergy example](https://smart-health-checkin.org/client/demo/autofill.html) does this end to end. Two rules:

- **Keep the manual path.** The patient can always type it in, and it lands in the same review as prefilled data.
- **Keep the provenance.** "From the app", "typed by the patient", and "from the app, confirmed" are different facts.

## Storing the response

The library doesn't store anything. Send `response.json` to your server, or map it to FHIR with the optional [FHIR module](fhir.md). Wherever it lands, mark it as supplied by the patient.

Next: [Offering wallets](wallets.md) · [Writing FHIR](fhir.md)
