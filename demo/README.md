# Check-in demo

The sample project for `checkin-client`: a standalone check-in page,
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
| `post` | `none` (default — the response stays in the page), `transaction`, or `individual`. Posting uses the optional `fhir` helper, not the kit. |
| `returnUrl` | Where the patient lands after completion — the closed-loop return leg. |
| `wallet` | `platform` (default, the browser's DC API), `app` (demo wallet web app with a real consent screen), or `auto` (instant mock, no consent screen). Both demo responders run real CBOR/COSE/HPKE over fabricated records. |

Precedence: `request=` beats `scenario=` beats the default scenario. Unknown
params are ignored.

The default backend is the public HAPI R4 test server. Any other `fhir=`
target shows a caution naming the host and requires an explicit
acknowledgment before the flow can start; never point this demo at a server
holding real patient data.

## Example URLs

```text
…/demo/#wallet=app                       consent screen in a wallet tab
…/demo/#wallet=auto&post=transaction     instant mock, then post to the FHIR base
…/demo/#scenario=new-patient             real wallet via the DC API (Chrome/Android)
…/demo/autofill.html#wallet=app          form prefilled from the patient's app
…/demo/react.html                        same core, React bindings
```

All of it is also editable in the page under **Demo controls**, which writes
your choices back into the URL.
