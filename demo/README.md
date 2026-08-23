# Check-in demo

The sample project for `@smart-health-checkin/client`: a fictional clinic's check-in page,
configured entirely by URL, running the real flow. It keeps the response in
the page unless you tell it where to post. Served at `/client/demo/`.

## URL grammar

All parameters live in the URL **fragment** (after `#`), not the query
string, so patient identifiers and request payloads never reach server logs.

```text
…/demo/#scenario=phq2-dayof&patient=Patient/123
…/demo/#request=<base64url(SmartCheckinRequest JSON)>&returnUrl=…
```

| Param | Meaning |
| --- | --- |
| `scenario` | Named request template from the scenario library. |
| `request` | base64url-encoded full `SmartCheckinRequest`, passed through verbatim. |
| `patient` | FHIR Patient reference on the target server (e.g. `Patient/123`). |
| `appointment` | FHIR Appointment reference; fetched for display context when present. |
| `fhir` | A FHIR base URL to post to. No default: without one, nothing is posted. |
| `post` | `none` (default — the response stays in the page), `transaction`, or `individual`. Posting uses the optional `fhir` helper, not the kit. |
| `returnUrl` | Where the patient lands after completion — the closed-loop return leg. |
| `wallet` | Which responder answers: the `id` of any wallet in the registry (`demo` — the page's default — or `evergreen`), `platform` for the device's own wallet, or `mock`. The older values `app` and `auto` still map to `demo` and `mock`. |
| `wallets` | URL of a wallet registry to offer, replacing `./wallets.json`. |

Precedence: `request=` beats `scenario=` beats the default scenario. Unknown
params are ignored.

Nothing is posted unless both `post=` and `fhir=` are set. The public HAPI
R4 test server is recognized; any other target shows a caution naming the
host and requires an explicit acknowledgment before the flow can start. Never
point this demo at a server holding real patient data.

## Example URLs

```text
…/demo/                                  the demo wallet, in a tab (the default)
…/demo/#wallet=platform                  the device's own wallet, via the DC API
…/demo/#wallet=mock                      instant fabricated answer, no consent screen
…/demo/#wallet=mock&post=transaction&fhir=<base>   …then post there (never by default)
…/demo/autofill.html                     prefill from the app, or type your own
…/demo/kiosk.html                        a screen with no wallet: QR, then the phone answers
…/demo/handoff.html#session=<id>         what the phone opens from that QR
…/demo/react.html                        same core, React bindings
…/demo/angular.html                      same core, Angular bindings
```

All of it is also editable in the page under **Demo controls**, which writes
your choices back into the URL.
