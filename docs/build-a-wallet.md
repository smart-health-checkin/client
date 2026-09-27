# Wallet guide

A wallet answers a clinic's check-in request with records and form answers the patient chose to share. [`@smart-health-checkin/client/wallet`](api/wallet.md) has the protocol and the matching rules; the consent screen is yours. [Install](install.md) the package, or load the hosted [`wallet.js`](install.md#hosted-files).

## What a wallet does

1. Receives a request, from the Digital Credentials API (native) or, for a [web wallet](web-wallets.md), from the EHR page that opened it.
2. Shows the patient who is asking and what for. Say only what the wallet knows: "A website is asking for your health information" with the EHR page's origin shown prominently, or, for a native app calling directly, "An app is asking for your health information". Never call the requester a practice, clinic, doctor, or provider: nothing in the request proves that.
3. Lets the patient choose, item by item.
4. Builds a SMART Health Check-in response: one status per item, plus artifacts.
5. Signs and encrypts the response for the EHR's origin, and sends it back.

The spec covers each step: [request handling](https://smart-health-checkin.org/spec/#8-4-wallet-request-handling-and-response-construction), [the response model](https://smart-health-checkin.org/spec/#6-clinical-response-model), and [encryption](https://smart-health-checkin.org/spec/#8-5-hpke-encryption-and-verifier-processing).

## Native wallets on Android

A native wallet registers with Android's Credential Manager and answers requests the browser passes through the Digital Credentials API.

- **Reference wallet:** [`android-wallet`](https://github.com/smart-health-checkin/android-wallet) repository.
- **Install it:** [smart-health-checkin-wallet.apk](https://github.com/smart-health-checkin/android-wallet/releases/latest/download/smart-health-checkin-wallet.apk).
- **Registration:** the app registers a credential entry and a small matcher (WebAssembly) that decides whether a request is a SMART Health Check-in request.
- **Parsing and sealing:** done in Kotlin in that app. This library is JavaScript, for web wallets and for tests.
- **The origin to bind:** for a browser, the origin Credential Manager reports for an allowlisted browser (`getOrigin`). For a native app calling directly, Android reports no origin, so use `android:apk-key-hash:` plus the base64url SHA-256 of the app's signing certificate ([TR-2](https://smart-health-checkin.org/spec/#TR-2)).

A wallet can't yet name a native app that calls it directly, so it says "An app is asking for your health information"; how wallets should identify native app callers is still open.

## Native wallets on iOS

On iOS 26, a wallet answers Safari through an Identity Document Provider extension. Apple has to approve the `org.smarthealthit.checkin.1` document type for the app's entitlement. The extension can read the SMART request (`requestInfo`) only once the patient interacts, inside `sendResponse`; it can hold that callback open while it shows its own item-by-item screens, then answer. The [Swift package](https://github.com/smart-health-checkin/swift) implements both sides, and [Platform notes](https://smart-health-checkin.org/spec/platform-notes.html#ios) has the details, including stripping the trailing slash from the origin Safari reports.

The rest of this page applies to both kinds: the matching rules, forms, statuses, and health cards are the same.

## Web wallets

A web wallet is a page the EHR opens in a tab. [`serveWebWallet`](api/wallet.md#servewebwallet) handles the hand-off:

- posts `ready` to the page that opened it;
- accepts one request, from that page only;
- takes the EHR's origin from the browser, never from the message;
- seals your answer to that origin and replies.

```ts
import { declineAll, serveWebWallet } from "@smart-health-checkin/client/wallet";

const served = serveWebWallet({
  async onRequest({ request, origin, unsupportedItems }) {
    const choice = await showConsentScreen(request, origin, unsupportedItems); // your UI
    if (choice.kind === "closed") return { declined: true };              // closed without reviewing
    if (choice.kind === "declined-all") return { response: declineAll(request) }; // reviewed, shared nothing
    if (choice.kind === "failed") return { error: "Couldn't read your records" };
    return { response: choice.response }; // checked against the request, then signed, encrypted, and sent
  },
  onInvalidRequest(message, origin) {
    showError(`${origin} sent a request this wallet can't read: ${message}`);
  },
});

if (!served.opened) showLandingPage(); // opened directly, not by an EHR
```

What happens under it ([Web wallets](web-wallets.md) has the details):

| Step | Message |
| --- | --- |
| The EHR opens your page in a tab | none |
| Your page says it's ready | `ready`, to the opener |
| The EHR sends the request | `request`, with the Digital Credentials API argument |
| You answer | `response`: approved with a credential, declined, or an error |

[`onRequest`](api/wallet.md#onrequest) returns one of [four answers](api/wallet.md#webwalletanswer):

| Answer | What the EHR gets |
| --- | --- |
| `{ response }` | Your SMART response, signed and encrypted for the EHR's origin. It's checked against the request first; a response a Verifier would set aside (a status missing, a record in a type the item doesn't accept) becomes an error reply instead. |
| `{ declined: true }` | The patient closed the wallet without reviewing. If they reviewed and declined everything, send `{ response: declineAll(request) }` instead ([HOLD-4](https://smart-health-checkin.org/spec/#HOLD-4)). |
| `{ error: "…" }` | An error with your message |
| `{ credential }` | A credential you sealed yourself, sent as is. For test wallets that inject faults. |

Options:

| Option | Default | What it does |
| --- | --- | --- |
| [`onRequest`](api/wallet.md#onrequest) | required | Show consent and return an answer |
| [`onInvalidRequest`](api/wallet.md#oninvalidrequest) | none | Called when a request can't be read. The EHR also gets an error reply. |
| [`closeAfterReply`](api/wallet.md#closeafterreply) | `true` | Close the tab after replying |

## Matching records to items

A `selection.fhir` item names records by profile or resource type ([§5.4.1](https://smart-health-checkin.org/spec/#5-4-1-selection-fhir)). [`selects`](api/wallet.md#selects) tests one resource; [`selectEntries`](api/wallet.md#selectentries) picks from a Bundle's entries.

```ts
import { selectEntries } from "@smart-health-checkin/client/wallet";

const entries = selectEntries(item.content, patientBundle.entry, { exclude: [patientFullUrl] });
```

The rules:

| Selector | Matches |
| --- | --- |
| `profiles` | Resources whose `meta.profile` has that canonical |
| `profiles` with `\|version` | Only that exact version |
| `profiles` without a version | Any version |
| `profilesFrom` | Any profile under that family's URL |
| `profiles` and `profilesFrom` together | Either one (they add up) |
| `resourceTypes` | Narrows the above; alone, selects by type |
| no selector | Everything |

`selectEntries` also returns the entries a match references, such as a prescriber or a payer, so references in your Bundle resolve. Pass the Patient's fullUrl in `exclude` when the Patient has its own item.

Version handling is in [§5.5](https://smart-health-checkin.org/spec/#5-5-canonical-version-handling).

## Forms

A `form.fhir` item asks for a QuestionnaireResponse ([§5.4.2](https://smart-health-checkin.org/spec/#5-4-2-form-fhir)).

- **Echo the canonical.** `QuestionnaireResponse.questionnaire` must equal the request's [`questionnaireCanonical`](api/checkin.md#smartcheckincontentselector) exactly, `|version` included.
- **Inline form:** use `content.questionnaire`.
- **Form by reference, unversioned:** fetch the canonical URL.
- **Form by reference, versioned:** fetch the base URL, and use it only if its `version` matches.
- **Can't get the form:** answer that item `unsupported`.

## Statuses

Every item gets exactly one status ([§6.2](https://smart-health-checkin.org/spec/#6-2-artifact-and-status-semantics)).

| Status | When |
| --- | --- |
| `fulfilled` | You returned what was asked |
| `partial` | You returned some of it |
| `unavailable` | The patient has nothing that matches |
| `declined` | The patient chose not to share it |
| `unsupported` | Your wallet can't answer this kind of item, including selector kinds it doesn't know ([§5.4.3](https://smart-health-checkin.org/spec/#5-4-3-extension-selectors)) |
| `error` | Something went wrong for this item |

One artifact can fulfill several items: list them all in its `fulfills` ([§6.3](https://smart-health-checkin.org/spec/#6-3-many-to-many-fulfillment)).

## SMART Health Cards

When an item lists `application/smart-health-card` first in `accept` and the patient has a card for it, return the card ([§5.6](https://smart-health-checkin.org/spec/#5-6-accepted-media-types)).

- The artifact's `mediaType` is `application/smart-health-card`.
- Its `value` is `{ verifiableCredential: [jws, …] }`.
- Send each card's JWS exactly as its issuer signed it. EHRs verify the signature against the issuer's published keys, so a card changed after issue fails.

## Lower-level pieces

For wallets that seal their own responses, or run somewhere `serveWebWallet` doesn't fit:

| Function | What it does |
| --- | --- |
| [`parseWalletRequest(navigatorArgument)`](api/wallet.md#parsewalletrequest) | The SMART request, the items to answer `unsupported`, `warnings` about the request's wire format, and the pieces needed to answer. Throws [`WalletRequestError`](api/wallet.md#walletrequesterror) only where spec [§8.4](https://smart-health-checkin.org/spec/#8-4-wallet-request-handling-and-response-construction) says not to respond. |
| [`checkWalletResponse(request, response)`](api/wallet.md#checkwalletresponse) | What a Verifier would object to in your response; empty when it's clean |
| [`declineAll(request)`](api/wallet.md#declineall) | The response for a patient who reviewed and declined everything |
| [`sealWalletResponse({ smartResponse, encryptionInfoBytes, verifierOrigin, request? })`](api/wallet.md#sealwalletresponse) | Sign and encrypt a response; returns the credential to send. With `request`, checks the response first. |
| [`buildSignedDeviceResponse({ smartResponseJson, sessionTranscript })`](api/wallet.md#buildsigneddeviceresponse) | The signed mdoc DeviceResponse, before encryption |
| [`recipientJwkFromEncryptionInfo(encryptionInfoBytes)`](api/wallet.md#recipientjwkfromencryptioninfo) | The EHR's public key |

## A reference to compare against

The [SMART Testing Wallet](https://smart-health-checkin.org/connectathon/testing-wallet/) implements all of this with [`serveWebWallet`](api/wallet.md#servewebwallet) and [`selectEntries`](api/wallet.md#selectentries), plus switches for sending deliberately broken responses. Its [features page](https://github.com/smart-health-checkin/connectathon/blob/main/testing-wallet/FEATURES.md) lists exactly what it does.

Test your wallet against the [Testing EHR](https://smart-health-checkin.org/connectathon/testing-ehr/): it sends every connectathon scenario and checks your answer against the spec. See [Testing](testing.md).

To check your bytes offline, the spec publishes conformance fixtures: real captured requests and responses, with every layer decoded. They're in the [spec repository](https://github.com/smart-health-checkin/spec/tree/v1.0.0-draft.2/fixtures) at tag `v1.0.0-draft.2`, along with small [conformance cases](https://github.com/smart-health-checkin/spec/tree/v1.0.0-draft.2/conformance) your implementation can run in CI, and the [capture inspector](https://smart-health-checkin.org/spec/inspector.html) walks them byte by byte.

## Getting listed

EHR pages offer web wallets from a registry, a `wallets.json` file. To appear in one:

- **The connectathon registry:** fill in the [registration form](https://smart-health-checkin.org/connectathon/register/). It opens a pull request with your entry; once merged, the registry rebuilds within minutes.
- **A clinic's registry:** send them your entry. [Registry format](registry.md) lists the fields.
- **Your icon:** a small square SVG or PNG, with no scripts or external references. Registries should inline it as a `data:` URL.
