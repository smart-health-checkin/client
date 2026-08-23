# Response model

A response has two parts: **artifacts** (the data) and **requestStatus** (what
happened to each thing you asked for). Read both — an empty artifact list with
a `declined` status is a perfectly normal, successful exchange.

```ts
const response = await requestCheckin(myRequest);

response.artifacts;      // [{ id, mediaType, fulfills: [...], value, fhirVersion? }]
response.requestStatus;  // [{ item: "allergies", status: "fulfilled" }]
```

## What the library has verified

Before your code sees a response, the kit has:

- HPKE-decrypted it using a key bound to **this** request and **your** page's
  origin, so a response captured elsewhere cannot be replayed at you;
- verified the issuer signature (COSE) and the device signature over the
  session transcript, and re-hashed every element against the signed digests;
- confirmed the response answers *this* request: matching request id, every
  `fulfills` pointing at a real item, every artifact's media type in that
  item's `accept` list, and exactly one status per item.

What it has **not** done is judge the clinical content. A conformant response
can still contain a medication list that's a year stale. Protocol validity is
not data quality — that judgment stays yours.

## Per-item status

| Status | Means |
| --- | --- |
| `fulfilled` | Shared as asked |
| `partial` | Some of it — e.g. two of five years of history |
| `unavailable` | The app doesn't have it |
| `declined` | The patient chose not to share this item |
| `unsupported` | The app can't handle this kind of ask |
| `error` | Something went wrong on the wallet side |

Per-item declines are ordinary. Show the patient what came through, and offer
your own form for the rest rather than treating a partial share as a failure.

```ts
const byItem = new Map(response.requestStatus.map((s) => [s.item, s.status]));
for (const item of myRequest.items) {
  const status = byItem.get(item.id);
  if (status !== "fulfilled") promptManuallyFor(item);
}
```

## Reading artifacts

Artifacts point back at the items they satisfy — one artifact can cover
several items, and one item can be covered by several artifacts.

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

SMART Health Card artifacts carry `value.verifiableCredential` — an array of
JWS strings. Keep the JWS if you store them: it's the only thing that carries
the issuer's signature. Unpacking it into plain FHIR throws that away.

## Prefill, then ask only for what's missing

The interesting move isn't dumping the response into a chart. It's using it to
*shorten what you ask the patient*.

US Core requires an allergy's substance and clinical status, but reaction and
criticality are optional — so real records routinely arrive as "Latex, and
nothing else." Your form knows what's missing and can ask only for that:

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

Then the patient confirms what's known and supplies only what isn't — and you
can mark which fields *they* contributed, which is exactly the information a
nurse wants when reconciling. The
[allergy example](https://smart-health-checkin.org/client/demo/autofill.html)
implements this end to end, including a manual-entry path that lands in the
same review.

Two things that follow from doing it this way:

- **Always offer the manual path too.** Prefill is an accelerant; typing it in
  must stay available and land in the same review flow.
- **Track provenance.** "Came from the app," "typed by the patient," and
  "typed and then confirmed by the app" are different facts, and they matter
  downstream.

## Storing the response

The kit stops here on purpose — see [Writing FHIR](fhir.md) for the optional
helper, or write it however your system wants. What matters is that patient-
supplied data is *labelled* as such wherever it lands, so a human can tell it
apart from what a clinician entered.

Next: [Wallets and browser support](wallets.md) · [Writing FHIR](fhir.md)
