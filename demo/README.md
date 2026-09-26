# Demo options

The sample pages for `@smart-health-checkin/client`, served at `/client/demo/`. Each page shows one way to use the library, running the real flow. Responses stay in the page unless you say where to post them.

What each page shows is in [Testing: the demos](../docs/testing.md#the-demos). The requests the demos send are plain objects in `src/requests.ts`.

## URL options for the reference EHR

Every option goes in the URL fragment, after `#`. Fragments aren't sent to servers, so patient identifiers and requests never reach a server log.

```text
…/demo/#scenario=allergy-review&patient=Patient/123
…/demo/#request=<base64url(SmartCheckinRequest JSON)>&returnUrl=…
```

| Option | Meaning |
| --- | --- |
| `scenario` | One of the demo requests: `visit-prep` (the default), `insurance-only`, `new-patient`, `allergy-review`, `medlist-refresh`. |
| `request` | A full `SmartCheckinRequest`, base64url-encoded, sent as is. Wins over `scenario`. |
| `wallet` | Which wallet answers: a registry id (`demo`, the default, or `evergreen`), `platform` for the device's own wallet, or `mock`. `app` and `auto` still mean `demo` and `mock`. |
| `wallets` | A wallet registry URL to use instead of `./wallets.json`. |
| `patient` | A FHIR Patient reference on the target server, such as `Patient/123`. |
| `appointment` | A FHIR Appointment reference. |
| `fhir` | A FHIR base URL to post to. No default. |
| `post` | `none` (the default), `transaction`, or `individual`. |
| `returnUrl` | Where the patient goes after a completed check-in. |

Unknown options are ignored.

Nothing is posted unless both `post` and `fhir` are set. The public HAPI R4 test server is recognized. For any other server, the page names the host and asks you to confirm first. Never point this demo at a server with real patient data.

## Example URLs

```text
…/demo/                                   the demo wallet, in a tab (the default)
…/demo/#wallet=platform                   the device's own wallet
…/demo/#wallet=mock                       an instant made-up answer, no consent screen
…/demo/#wallet=mock&post=transaction&fhir=<base>   then post it there
…/demo/tutorial.html                      the tutorial's finished page
…/demo/picker.html                        the picker element
…/demo/autofill.html                      prefill a form from the app
…/demo/kiosk.html                         a kiosk: QR code, then the phone answers
…/demo/handoff.html#session=<id>          what the phone opens from that QR code
…/demo/react.html                         React
…/demo/angular.html                       Angular
```

Everything in the URL can also be changed on the page under **Demo controls**. Your choices are written back into the URL, so the result is a link you can share.
