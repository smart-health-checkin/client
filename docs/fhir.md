# Writing FHIR (optional)

The check-in client has no idea a FHIR server exists. That's deliberate: where
patient-supplied data lands, under whose authorization, and who reviews it are
deployment decisions, and a protocol library that made them would be one more
thing you'd have to audit before adopting it.

If you want the mapping done for you anyway, there's a separate module:

```ts
import { buildCheckinBundle, postCheckinBundle } from "@smart-health-checkin/client/fhir";
```

It's a different import path on purpose — nothing in the check-in path pulls
it in, and you can ignore it entirely and use your own client.

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

`buildCheckinBundle` is pure: no network, no globals, deterministic apart from
generated UUIDs. That matters — you can diff it in a test, show it to a
reviewer, or hand it to your own authenticated client instead of calling
`postCheckinBundle` at all.

## What the mapping does

- **`application/fhir+json` artifacts** → each resource (or each Bundle entry)
  becomes a `POST` entry in one transaction Bundle.
- **`application/smart-health-card` artifacts** → a `DocumentReference`
  holding the JWS, so the issuer's signature survives. Unpacking it into loose
  FHIR would discard the one thing that made it verifiable.
- **A `Provenance`** accompanies the writes: patient-supplied, timestamped,
  pointing at everything created, carrying the check-in request id and your
  configured patient/appointment as identifier entities.

The appointment rides as an *identifier entity*, not a `Provenance.target`
reference, because a target reference must resolve on the destination server
and a demo appointment id won't. Identifiers travel; references don't.

**No patient matching happens, ever.** Whatever you pass as `context` is what
gets stamped. Matching a share to a chart is your system's job, with your
identity rules.

## Modes

```ts
await postCheckinBundle(plan, { fhirBase, mode: "transaction" });  // default
await postCheckinBundle(plan, { fhirBase, mode: "individual" });   // one POST per resource
await postCheckinBundle(plan, { fhirBase, fetchImpl: myAuthedFetch });
```

`individual` exists for servers with weak transaction support; it posts each
resource, then rewrites the Provenance's `urn:uuid` references to the
server-assigned locations before sending it. There's no "dry run" mode,
because not sending is just not calling this function.

Pass `fetchImpl` to attach your session credentials, retries, tracing, or
whatever your stack does.

## Writing FHIR yourself

The response is ordinary data. Writing it into your own model is often the
better answer — and the check-in page is ordinary application code, so nothing
about the protocol constrains that choice. The
[allergy example](https://smart-health-checkin.org/client/demo/autofill.html)
shows the same reviewed data rendered both as standard FHIR and as an
EHR-native packet with routing flags, precisely to make the point that this is
your decision.

Next: [Production checklist](production.md)
