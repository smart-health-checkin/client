# Check-in demo

The sample pages for `@smart-health-checkin/client`, served at `/client/demo/`. Each page shows one way to use the library, running the real flow. Responses stay in the page unless you say where to post them.

## The pages

| Page | What it is | What it shows |
| --- | --- | --- |
| `index.html` (`src/main.ts`) | A fictional clinic's check-in page: the reference EHR | `wallets()` for the menu, `wallet.start(request)` in the click, `result.response.json` for the raw response, and the optional `/fhir` helper for posting |
| `picker.html` (`src/picker.ts`) | The `<smart-checkin-picker>` element, in canned situations and skins | The element's attributes, pick mode with `setOutcome`, and reskinning with `--smart-checkin-*` variables |
| `react.html` (`src/frameworks/react.tsx`) | A medication review in React | `<CheckinPicker>` from `/react`, and `response.resources("meds", { type: "MedicationRequest" })` |
| `angular.html` (`src/frameworks/angular.ts`) | The same review in Angular | A small service over `wallets()` and `wallet.start(request)` |
| `autofill.html` (`src/autofill.ts`) | An allergy form, prefilled from the patient's app | `response.resources("allergies", { type: "AllergyIntolerance" })`, then asking only for what the record lacks |
| `kiosk.html` (`src/kiosk.ts`) | A screen with no wallet: shows a QR code and waits | `handoffWallet()` from `/handoff`, started like any wallet |
| `handoff.html` (`src/handoff.ts`) | What the phone opens from the kiosk's QR code | `fetchHandoff`, then `answerHandoff` with the wallet the patient picks |
| `wallet.html` (`src/wallet.ts`) | The Demo Health Wallet, a web wallet with made-up records | `serveWebWallet()` from `/wallet`; the page itself is only the consent screen |

The requests the demos send are plain objects in `src/requests.ts`.

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
…/demo/picker.html                        the picker element
…/demo/autofill.html                      prefill a form from the app
…/demo/kiosk.html                         a kiosk: QR code, then the phone answers
…/demo/handoff.html#session=<id>          what the phone opens from that QR code
…/demo/react.html                         React
…/demo/angular.html                       Angular
```

Everything in the URL can also be changed on the page under **Demo controls**. Your choices are written back into the URL, so the result is a link you can share.
