# Check-in demo

The sample project for `@smart-health-checkin/client`: a fictional clinic's
check-in page that runs the real flow. Everything about it is configured in
the URL. It keeps the response in the page unless you tell it where to post.
It is served at `/client/demo/`.

## URL grammar

Every parameter goes in the URL fragment — the part after `#` — and never in
the query string. Fragments are not sent to servers, so patient identifiers
and request payloads never reach a server log.

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
| `post` | `none` (default — the response stays in the page), `transaction`, or `individual`. Posting uses the optional `fhir` helper, not the library. |
| `returnUrl` | Where the patient lands after completion — the closed-loop return leg. |
| `wallet` | Which responder answers: the `id` of any wallet in the registry (`demo` — the page's default — or `evergreen`), `platform` for the device's own wallet, or `mock`. The older values `app` and `auto` still map to `demo` and `mock`. |
| `wallets` | URL of a wallet registry to offer, replacing `./wallets.json`. |

If both `request=` and `scenario=` are present, `request=` wins; if neither
is present, the page uses its default scenario. Unknown parameters are
ignored.

Nothing is posted anywhere unless both `post=` and `fhir=` are set. The
public HAPI R4 test server is recognized; for any other target the page shows
a warning naming the host and requires you to acknowledge it before the
check-in can start. Never point this demo at a server that holds real patient
data.

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

Everything in the URL can also be changed on the page under **Demo
controls**, which writes your choices back into the URL so the result is a
link you can share.
