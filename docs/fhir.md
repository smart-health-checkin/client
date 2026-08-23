# Writing FHIR (optional)

The check-in library does not write anything to a FHIR server. Where
patient-supplied data should go, who is allowed to put it there, and who
reviews it before it reaches a chart are decisions for each deployment, and a
library that made them for you would be one more thing to audit before you
could use it.

If you do want a FHIR transaction built from the response, the library
includes a separate module for it:

```ts
import { buildCheckinBundle, postCheckinBundle } from "@smart-health-checkin/client/fhir";
```

It has its own import path so that nothing in the check-in flow depends on
it. If you use your own FHIR client, you never load it.

## Build, inspect, then send

```ts
const response = await requestCheckin(myRequest);

const plan = buildCheckinBundle({
  request: myRequest,
  response,
  context: { patient: "Patient/123", appointment: "Appointment/456" },
});

plan.bundle;   // a plain transaction Bundle — inspect or edit it freely
plan.entries;  // the same entries, with the artifact each came from

await postCheckinBundle(plan, { fhirBase: "https://fhir.example.org/r4" });
```

`buildCheckinBundle` makes no network calls and reads no global state. Given
the same input it produces the same output, apart from the UUIDs it
generates. That means you can compare its output in a test, show it to a
reviewer, or hand it to your own authenticated client instead of calling
`postCheckinBundle`.

## What the mapping does

- Each `application/fhir+json` artifact becomes one `POST` entry per resource
  (or per Bundle entry) in a single transaction Bundle.
- Each `application/smart-health-card` artifact becomes a `DocumentReference`
  that holds the signed token. The token is kept whole because it carries the
  issuer's signature; splitting it into loose FHIR resources would lose that.
- A `Provenance` resource is added. It records that the data was supplied by
  the patient, when, and through which check-in request, and it points at
  every resource the transaction creates. The patient and appointment you pass
  in `context` are recorded on it as identifiers.

The appointment is recorded as an identifier rather than as a reference to an
Appointment resource. A reference has to resolve on the server that receives
it, and the appointment may not exist there; an identifier can be recorded
regardless.

The module never matches the patient. Whatever you pass as `context` is what
it writes. Deciding which chart a share belongs to is your system's job,
under your rules.

## Modes

```ts
await postCheckinBundle(plan, { fhirBase, mode: "transaction" });  // default
await postCheckinBundle(plan, { fhirBase, mode: "individual" });   // one POST per resource
await postCheckinBundle(plan, { fhirBase, fetchImpl: myAuthedFetch });
```

The default mode sends one transaction Bundle. The `individual` mode exists
for servers that do not handle transactions well: it posts each resource on
its own, then rewrites the Provenance so that its references point at the
locations the server assigned, and posts that last. There is no dry-run mode,
because not sending is simply not calling `postCheckinBundle`.

`fetchImpl` lets you supply your own `fetch`, so the request can carry your
session credentials, go through your retry logic, or be traced the way the
rest of your application is.

## Writing FHIR yourself

The response is ordinary data, and writing it into your own data model is
often the better choice. Nothing in the protocol constrains what you do after
the response arrives. The
[allergy example](https://smart-health-checkin.org/client/demo/autofill.html)
shows the same reviewed data rendered two ways — as standard FHIR, and as a
packet shaped for one EHR with routing flags — to make the point that this
choice is yours.

Next: [Production checklist](production.md)
