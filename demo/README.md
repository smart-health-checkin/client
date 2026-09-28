# Clinic check-in demo options

The clinic check-in demo, at `/client/demo/`, is a clinic website's check-in page running the real flow with a made-up patient. This page lists the options it takes in its URL. Responses stay in the page unless you tell it where to post them. [The demos](../docs/testing.md#the-demos) in the Testing guide lists the other demo pages, and the requests the demos send are plain objects in `src/requests.ts`.

## URL options for the clinic check-in demo

Every option goes in the URL fragment, after `#`. Fragments aren't sent to servers, so patient identifiers and requests never reach a server log.

```text
…/demo/#scenario=allergy-review&patient=Patient/123
…/demo/#request=<base64url(SmartCheckinRequest JSON)>&returnUrl=…
```

| Option | Meaning |
| --- | --- |
| `scenario` | One of the demo requests: `visit-prep` (the default), `insurance-only`, `new-patient`, `allergy-review`, `medlist-refresh`. |
| `request` | A full `SmartCheckinRequest`, base64url-encoded, sent as is. Wins over `scenario`. |
| `wallet` | Offer only this wallet: a registry id (`demo` or `evergreen`), `platform` for the device's own wallet, or `mock` for the simulated response. Without it, the page offers all of them. |
| `wallets` | A wallet registry URL to use instead of `./wallets.json`. |
| `patient` | A FHIR Patient reference on the target server, such as `Patient/123`. Defaults to `Patient/example`. |
| `appointment` | A FHIR Appointment reference. Defaults to `Appointment/demo-visit`. |
| `fhir` | A FHIR base URL to post to. No default. |
| `post` | `none` (the default), `transaction`, or `individual`. |
| `returnUrl` | Where the patient goes after a completed check-in. |

Unknown options are ignored. The [form autofill demo](../demo/autofill.html) and the [kiosk's phone page](../demo/handoff.html) take `wallet` and `wallets` too.

The patient chooses a wallet in [`<smart-checkin-picker>`](../docs/wallets.md#the-picker). It lists the device's own wallet when this browser can reach it, the registry's web wallets, and the simulated response.

Nothing is posted unless both `post` and `fhir` are set. The public HAPI R4 test server is recognized. For any other server, the page names the host and asks you to confirm first. Never point this demo at a server with real patient data.

## Example URLs

```text
…/demo/                                   every wallet, for the patient to choose
…/demo/#wallet=demo                       only the demo wallet, in a tab
…/demo/#wallet=platform                   only the device's own wallet
…/demo/#wallet=mock                       only the simulated response: an instant made-up answer, no consent screen
…/demo/#wallet=mock&post=transaction&fhir=<base>   then post it there
```

Everything in the URL can also be changed on the page under **Demo controls**. Your choices are written back into the URL, so the result is a link you can share.
