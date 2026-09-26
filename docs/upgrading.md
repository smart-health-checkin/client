# Upgrading

## 0.2 to 0.3

0.3 follows the rewritten spec. The main change: a response is judged part by part. A bad record, a missing status, or a failed signature no longer fails the whole check-in. Only a few problems still do (spec §6.4 [XV-1], [XV-2], and the steps spec §8 marks as failures).

### Running a check-in

- **Server-kept results have their own status.** When server key custody keeps the data, `runCheckin` returns `status: "kept-on-server"` with `serverReference`, instead of `"completed"` without a response. `"completed"` now always has `response`.

  ```js
  if (result.status === "completed") fill(result.response);
  else if (result.status === "kept-on-server") showReceipt(result.serverReference);
  ```

- **Transport problems are warnings.** A failed issuer or device signature, a digest mismatch, a missing `validityInfo`, an odd protocol name, padded base64url, and similar problems come back in `result.warnings` (`{ code, message, rule }`), and the check-in completes. It still fails when the response can't be decoded or decrypted, has no SMART document or response element, or answers a different request. Log the warnings; see [Testing](testing.md).
- **`error.check` is a spec requirement id**, such as `"VRS-3"` (didn't decrypt) or `"XV-2"` (answers another request), instead of `"open"` or `"cross"`.

### Reading the response

- **Records that fail a check are set aside, not fatal.** `response.artifacts(item)`, `resources(item)`, and the other lookups use only usable records. `response.disregarded()` lists the rest with their reasons.
- **An item can have no status.** When the status row for an item is missing, repeated, or has an unknown code, `response.status(item)` is `undefined`, and `response.items()` lists the problem under `problems`.
- **`new CheckinResponse(...)` takes a validation result.** Pass the result of `validateResponseAgainstRequest`. Most pages never construct one; `runCheckin` does.

### Validating JSON yourself

- `validateResponseAgainstRequest` fails (`ok: false`, with `rule`) only on [XV-1] and [XV-2]. On success it returns `artifacts` (each usable or not, with problems), `usableArtifacts`, and `items` (each with its status and problems). Code that treated `ok: true` as "every record is fine" should use `usableArtifacts`.
- `validateSmartCheckinRequest` fails only on [REQ-2] and [ITEM-2]. A selector a Wallet can't use (an unknown `kind`, a string where an array belongs, a form with no Questionnaire) is listed in `unsupportedItems` instead, and the rest of the request stands.
- The old `canonical` and `resource` selector members are ignored like any unknown member, rather than rejected. `profilesFrom` entries no longer have to start with `http`.
- New: `parseSmartCheckinRequest(text)` and `parseSmartCheckinResponse(text, request?)` parse JSON text and reject duplicate member names ([JSON-2]), which `JSON.parse` can't detect.

### Building a wallet

- **`parseWalletRequest` follows spec §8.4.** It throws `WalletRequestError` (with `rule`) only when the request can't be decoded, has no SMART DocRequest or request text, holds an invalid SMART request, or has no usable key. Other problems come back in `warnings`, and items to answer `unsupported` in `unsupportedItems`.
- **`serveWebWallet` checks a response before sealing it.** A response that doesn't match the request (a record in a media type the item doesn't accept, a missing status) becomes an error reply instead of being sent. The context passed to `onRequest` gains `unsupportedItems`.
- **Declining.** `{ declined: true }` now means the patient closed the wallet without reviewing. After reviewing and declining everything, answer `{ response: declineAll(request) }` ([HOLD-4]).
- New: `checkWalletResponse(request, response)` lists what a Verifier would object to; `sealWalletResponse` takes an optional `request` and runs it.
- `selects` and `selectEntries` match a `profilesFrom` family by URL prefix, as [SEL-5] says: any profile whose URL starts with the family URL and `/`.

### Removed

- The companion request element: `includeCompanionElement`, `buildSmartRequestCompanionElementIdentifier`, `decodeSmartRequestCompanionElementIdentifier`, `SMART_REQUEST_COMPANION_ELEMENT_PREFIX`, and `SmartRequestCarrierResolution`. The request travels only in `requestInfo`.
- The redirect pages for old docs URLs (`docs/picker.html`, `docs/kiosk.html`, `docs/fhir.html`, `docs/server-authority.html`, `docs/index.html`, `docs/getting-started.html`). Their content is in [Offering wallets](wallets.md), [Using the answer](responses.md), and [Going to production](production.md).

### The picker

- `smart-checkin-response`'s `detail.response` (and React's `onResponse`) is absent when the result is `"kept-on-server"`.
- TypeScript knows the element: `document.querySelector("smart-checkin-picker")` is typed, `addEventListener` gets typed `detail`s (`SmartCheckinPickerEventMap`), and importing `/react` types `<smart-checkin-picker>` for JSX.

### New lower-level pieces

`openWalletCredential` and `checkDeviceResponse` (in `/wire`) are the Verifier's receive steps, each returning `warnings`. `cborDecode` takes `{ onDuplicateKey }`. `parseJsonStrict` is the duplicate-rejecting JSON parser.

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
