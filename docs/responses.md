# Response model

A response has two parts. `artifacts` is the data the patient shared.
`requestStatus` has one entry per item in your request and says what happened
to that item. Read both: a response with no artifacts and a `declined` status
is a normal, successful exchange — the patient was asked, and said no.

```ts
const response = await requestCheckin(myRequest);

response.artifacts;      // [{ id, mediaType, fulfills: [...], value, fhirVersion? }]
response.requestStatus;  // [{ item: "allergies", status: "fulfilled" }]
```

## What the library has verified

By the time `requestCheckin` returns, the library has done three things to
the response.

It has decrypted it. The response was encrypted to a key your page created
for this one request, and the encryption is tied to your page's web origin. A
response captured from another page, or replayed later, will not decrypt.

It has checked the signatures. The health app signs the response, and the
data it carries is signed by whoever issued it. The library verifies both and
checks every piece of data against the signed digests.

It has matched the response to the request. The response names the request it
answers; every artifact points at a real item; every artifact's format is one
that item accepted; and there is exactly one status per item.

What the library has not done is judge the content. A response can pass every
check and still carry a medication list that is a year out of date. Whether
the data is correct and current is for you and the clinician to decide.

## Per-item status

| Status | Means |
| --- | --- |
| `fulfilled` | Shared as asked |
| `partial` | Some of it — e.g. two of five years of history |
| `unavailable` | The app doesn't have it |
| `declined` | The patient chose not to share this item |
| `unsupported` | The app can't handle this kind of ask |
| `error` | Something went wrong on the wallet side |

Declined and partial items are normal. Show the patient what did come through,
and offer your own form for the rest. Do not treat a partial share as a
failure of the whole check-in.

```ts
const byItem = new Map(response.requestStatus.map((s) => [s.item, s.status]));
for (const item of myRequest.items) {
  const status = byItem.get(item.id);
  if (status !== "fulfilled") askMyFormAbout(item);
}
```

## Reading artifacts

Each artifact lists the items it satisfies in `fulfills`. One artifact can
satisfy several items — a clinical summary can cover both "problems" and
"allergies" — and one item can be satisfied by several artifacts.

For a FHIR artifact, `value` is a single resource or a Bundle. This helper
returns the resources for one item:

```ts
function resourcesFor(response, itemId) {
  return response.artifacts
    .filter((a) => a.fulfills.includes(itemId) && a.mediaType === "application/fhir+json")
    .flatMap((a) => {
      const v = a.value;
      return v?.resourceType === "Bundle"
        ? (v.entry ?? []).map((e) => e.resource).filter(Boolean)
        : [v];
    });
}

const allergies = resourcesFor(response, "allergies")
  .filter((r) => r.resourceType === "AllergyIntolerance");
```

A SMART Health Card artifact carries `value.verifiableCredential`, an array of
signed tokens (JWS strings). If you store health cards, store the tokens as
they are. The token is what carries the issuer's signature; unpack it into
plain FHIR and the signature is gone.

## Prefill, then ask only for what's missing

The most useful thing to do with a response is to shorten what you ask the
patient.

Records often arrive incomplete. US Core requires an allergy record to name
the substance and the clinical status, but not the reaction or how serious it
is, so many records say only "Latex". Your form can look at what arrived and
ask only for the missing parts:

```ts
const rows = allergies.map((a) => ({
  name: a.code?.text,
  reactions: (a.reaction ?? []).flatMap((r) => r.manifestation ?? []).map((m) => m.text),
  criticality: a.criticality,
}));

const needsDetail = rows.filter(
  (row) => row.reactions.length === 0 || !row.criticality || row.criticality === "unable-to-assess",
);
```

The patient then confirms what the record already said and adds what it did
not. Record which fields the patient typed and which came from the app; a
nurse reconciling the list later will want to know. The
[allergy example](https://smart-health-checkin.org/client/demo/autofill.html)
does this end to end, including a path for patients who type everything in.

Two rules follow:

- Keep the manual path. The patient must always be able to type the
  information in, and it must land in the same review as the prefilled data.
- Keep the provenance. "From the app", "typed by the patient", and "from the
  app, confirmed by the patient" are different facts, and they matter later.

## Storing the response

The library does not store the response or write it anywhere; that part is
yours. If you want to write it to a FHIR server, [Writing FHIR](fhir.md)
describes an optional module that does. Whatever you do with it, mark the
data as supplied by the patient wherever it ends up, so that anyone reading it
later can tell it apart from what a clinician entered.

Next: [Wallets and browser support](wallets.md) · [Writing FHIR](fhir.md)
