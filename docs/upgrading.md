# Upgrading

## 0.2.1 to 0.2.2

No API changes. Two fixes on the wire:

- `verifyDeviceResponseSignatures` no longer trusts a device signature's attached payload. ISO 18013-5 detaches that payload; an attached one now verifies only if it is exactly this session's DeviceAuthentication. Before, a signature made for another session passed.
- The mdoc built by the wallet-side code (`buildSignedDeviceResponse`, and so `serveWebWallet` and the mock wallet) now includes the MSO `validityInfo` that ISO 18013-5 requires. Strict verifiers, such as the Swift package's, rejected it without.

Move hosted URLs from `/client/lib/0.2.1/` to `/client/lib/0.2.2/`, or install the [0.2.2 release](https://github.com/smart-health-checkin/client/releases/tag/v0.2.2).

## 0.2.0 to 0.2.1

No API changes. Two fixes:

- Health-card trust set with `configureHealthCardTrust` in `checkin.js` now applies to the picker in `ui.js` too. Before, each hosted bundle kept its own setting.
- Properties set on `<smart-checkin-picker>` before its script loads (`request`, `checkinOptions`, `wallets`, `strings`) are no longer lost.

Install 0.2.1 from its [release](https://github.com/smart-health-checkin/client/releases/tag/v0.2.1), or move hosted URLs from `/client/lib/0.2.0/` to `/client/lib/0.2.1/`. The 0.2.0 URLs keep working.

## 0.1 to 0.2

0.2 splits the library by audience and replaces the old responder model with `Wallet` objects. There are no compatibility aliases: every 0.1 name either moved, was renamed, or is gone.

The biggest changes:

- **One call.** `requestCheckin` is gone. `runCheckin` returns a `CheckinResult` with status `completed`, `declined`, or `failed`, and never throws for those.
- **Wallets.** `resolveResponders` and `credentialGetterFor` became `wallets()` and `wallet.start(request)`.
- **Error codes.** Failures carry `error.code` instead of a stage and a message to match.
- **Responses.** `result.response` is a `CheckinResponse` with lookups by item. The raw JSON is `result.response.json`.
- **No named scenarios.** Requests are plain objects.
- **Entry points.** Wallet-side, testing, kiosk, and wire code moved out of the root module.

### Where each name went

Imports are from `@smart-health-checkin/client` unless the table names a subpath.

#### Running a check-in

| 0.1 | 0.2 |
| --- | --- |
| `requestCheckin` | `runCheckin`, then check `result.status` |
| `runCheckin` | `runCheckin`, with new options and result (below) |
| `CheckinOutcome` | `CheckinResult`. Status `error` and `unsupported` became `failed` with a code. |
| `CheckinFlowError` | Removed. Branch on `result.status`; failures have `result.error.code`. |
| `CheckinOptions.getCredential` | `CheckinOptions.wallet` |
| `CheckinOptions.authority` | `CheckinOptions.keys` |
| `CheckinOptions.detectSupport` | Removed. `wallet.available` says whether a wallet can be used. |
| `outcome.response` | `result.response.json` for the raw response; `result.response` for lookups |
| `outcome.serverReference` | `result.serverReference` |

#### Building requests

| 0.1 | 0.2 |
| --- | --- |
| `buildRequest` | `checkinRequest` |
| `resolveRequest` | Removed. `runCheckin` accepts a full request or `{ purpose, items }`. |
| `CheckinRequestInit` | Unchanged |
| `CheckinRequestInput` | No longer accepts `{ scenario }` |
| `registerScenario`, `resolveScenario`, `SCENARIOS`, `Scenario` | Removed. Keep your requests as plain objects. |

#### Choosing a wallet

| 0.1 | 0.2 |
| --- | --- |
| `resolveResponders` | `wallets()` |
| `ResponderPolicy` | `WalletsOptions`. `webWallets` became `registry`; `mock` became `extra: [mockWallet()]`; `default` is gone. |
| `Responder` | `Wallet`. `reason` became `unavailableReason`; `isDefault` is gone. |
| `credentialGetterFor(responder)` | `wallet.start(request)`, or `wallet.open()` for a session |
| `createWebWalletCredentialGetter`, `WebWalletOptions` | `webWallet(entry)` |
| `openWebWallet` | Removed. `webWallet(entry).open()` opens the tab. |
| `detectDcApiSupport`, `DcApiSupport` | Unchanged |
| `WalletRegistry`, `WebWalletEntry` | Unchanged; also in `/model` |
| `loadWalletRegistry`, `validateWalletRegistry`, `findWallet` | `/model`. `loadWalletRegistry` needs a source; there is no demo default. |
| `DEMO_WALLET_REGISTRY` | `/testing` |
| `WalletDeclinedError` | Unchanged name. Its `name` is now `"WalletDeclinedError"`, not `"NotAllowedError"`. |

#### Key custody

| 0.1 | 0.2 |
| --- | --- |
| `createBrowserLocalAuthority()` | `keys: "browser"`, the default |
| `createServerAuthority(url)` | `keys: { server: url }` |
| `VerifierAuthority` | `KeyCustody` |
| `PreparedCredentialRequest`, `CredentialCompletion` | Unchanged |
| `extractDcapiResponse` | `/wire`. `runCheckin` reads the credential for you, so most pages never need it. |

#### Testing

| 0.1 | 0.2 |
| --- | --- |
| `createMockWalletCredentialGetter` | `mockWallet()` from `/testing` |
| `buildMockResponse`, `fabricateResponse`, `DEMO_HEALTH_CARD_JWS` | `/testing` |
| `MockItemSpec`, `MockItemSpecs`, `MockWalletOptions` | `/testing`. `origin` is now optional. |

#### Building a wallet

| 0.1 | 0.2 |
| --- | --- |
| `parseWalletRequest`, `sealWalletResponse`, `ParsedWalletRequest` | `/wallet` |
| `buildSignedDeviceResponse`, `recipientJwkFromEncryptionInfo` | `/wallet` |
| `WEB_WALLET_READY_MESSAGE_TYPE`, `WEB_WALLET_REQUEST_MESSAGE_TYPE`, `WEB_WALLET_RESPONSE_MESSAGE_TYPE` | `/wallet` |
| `WebWalletResponseMessage`, `WebWalletCredential` | `/wallet` |
| Handling the hand-off messages yourself | `serveWebWallet()` from `/wallet` |

#### Kiosk hand-off

| 0.1 | 0.2 |
| --- | --- |
| `createHandoff`, `createHandoffCredentialGetter` | `handoffWallet(options)` from `/handoff`. Start it like any wallet. |
| `answerHandoff(mailbox, id, envelope, getCredential)` | `answerHandoff(mailbox, id, envelope, wallet)` from `/handoff` |
| `fetchHandoff`, `handoffUrlFor`, `sessionIdFromHash` | `/handoff` |
| `HandoffMailbox`, `HandoffEnvelope`, `HandoffAnswer`, `HandoffOptions` | `/handoff` |

#### Model and wire

| 0.1 | 0.2 |
| --- | --- |
| `validateSmartCheckinRequest`, `validateSmartCheckinResponse`, `validateResponseAgainstRequest` | `/model` |
| `SmartCheckinRequest`, `SmartCheckinResponse`, and the other protocol types | Unchanged; also in `/model` |
| `ValidationResult`, `FhirCanonical`, `FhirVersion`, and other model helper types | `/model` |
| `PROTOCOL_ID`, `MDOC_DOC_TYPE`, `MDOC_NAMESPACE`, `SMART_REQUEST_INFO_KEY`, `SMART_RESPONSE_ELEMENT_ID` | `/wire` |
| `OrgIsoMdocNavigatorArgument`, `DcapiMdocResponse` | `/wire` |
| `buildOrgIsoMdocRequest`, `buildDcapiSessionTranscript`, `openWalletResponse`, `verifyDeviceResponseSignatures` | `/wire` |
| `FetchLike` | `/fhir` |

#### The picker element and React

| 0.1 | 0.2 |
| --- | --- |
| `<smart-checkin-picker wallets="…">` | `registry="…"` |
| `picker.responders` | `picker.wallets` |
| Event `detail.responder` | `detail.wallet` |
| Pick mode `detail.getCredential`, `detail.cancel` | `detail.session.getCredential`, `detail.session.cancel` |
| `setOutcome({ status: "error", message })` | `setOutcome({ status: "failed", message, code? })` |
| `smart-checkin-response` `detail.response` (raw JSON) | A `CheckinResponse`; raw JSON is `detail.response.json` |
| `<CheckinPicker wallets="…">` | `registry="…"` |
| `<CheckinPicker responders={…}>` | `wallets={…}` |
| `useCheckin` returning `responders`, `start(responder)` | `wallets`, `start(wallet)`, `status`, `result`, `response` |

### Before and after

#### Run a check-in and branch

Before:

```ts
try {
  const response = await requestCheckin(request);
  show(response);
} catch (e) {
  if (e instanceof CheckinFlowError && e.outcome.status === "declined") offerForm();
  else showError(String(e));
}
```

After:

```ts
const result = await runCheckin(request);
if (result.status === "completed" && result.response) show(result.response);
else if (result.status === "declined") offerForm();
else if (result.status === "failed") showError(`${result.error.code}: ${result.error.message}`);
```

#### Offer web wallets

Before:

```ts
const responders = await resolveResponders({ platform: true, webWallets: "/wallets.json" });
button.onclick = async () => {
  const response = await requestCheckin(request, { getCredential: credentialGetterFor(responders[1]) });
};
```

After:

```ts
const options = await wallets({ registry: "/wallets.json" });
button.onclick = () => void options[0]?.start(request).then(handle);
```

Or skip the buttons and use `<smart-checkin-picker registry="/wallets.json">`.

#### Read what came back

Before:

```ts
const meds = response.artifacts
  .filter((a) => a.mediaType === "application/fhir+json" && a.fulfills.includes("meds"))
  .flatMap((a) => (a.value.resourceType === "Bundle" ? a.value.entry.map((e) => e.resource) : [a.value]));
```

After:

```ts
if (result.status === "completed" && result.response) {
  const meds = result.response.resources("meds", { type: "MedicationRequest" });
}
```

#### Mock in tests

Before:

```ts
const response = await requestCheckin(request, {
  getCredential: createMockWalletCredentialGetter({ origin: location.origin, items: { coverage: { status: "declined" } } }),
});
```

After:

```ts
import { mockWallet } from "@smart-health-checkin/client/testing";

const result = await mockWallet({ items: { coverage: { status: "declined" } } }).start(request);
```
