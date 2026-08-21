# Check-in demo

The sample project for `checkin-provider-kit`: a standalone check-in page,
configured entirely by URL, that runs the flow and submits results to a
FHIR backend. Deploys to `/demo/` on the landing site.

## URL grammar

All parameters live in the URL **fragment** (after `#`), not the query
string, so patient identifiers and request payloads never reach server logs.

```text
…/demo/#scenario=phq2-dayof&patient=Patient/123&fhir=https://fhir.example.org/r4&submit=dry-run
…/demo/#request=<base64url(SmartCheckinRequest JSON)>&fhir=…&returnUrl=…
```

| Param | Meaning |
| --- | --- |
| `scenario` | Named request template from the scenario library. |
| `request` | base64url-encoded full `SmartCheckinRequest`, passed through verbatim. |
| `patient` | FHIR Patient reference on the target server (e.g. `Patient/123`). |
| `appointment` | FHIR Appointment reference; fetched for display context when present. |
| `fhir` | Target FHIR base URL. Defaults to the preconfigured demo backend. |
| `submit` | `transaction` (default), `individual`, or `dry-run` (show the Bundle, post nothing). |
| `returnUrl` | Where the patient lands after completion — the closed-loop return leg. |
| `mock` | `1` answers the request with the kit's built-in mock wallet — real CBOR/COSE/HPKE over fabricated demo data — so the full flow (including FHIR submission) runs with no phone or platform wallet present. |

Precedence: `request=` beats `scenario=` beats the default scenario. Unknown
params are ignored.

The default backend is the public HAPI R4 test server. Any other `fhir=`
target shows a caution naming the host and requires an explicit
acknowledgment before the flow can start; never point this demo at a server
holding real patient data.

## Example URLs

```text
…/demo/#mock=1&submit=dry-run                         inspect the write plan, no network
…/demo/#mock=1&scenario=phq2-dayof&patient=Patient/example
…/demo/#scenario=new-patient                          real wallet via the DC API (Chrome/Android)
```
