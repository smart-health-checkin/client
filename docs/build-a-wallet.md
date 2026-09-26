# Building a wallet

A wallet answers a clinic's check-in request with records and form answers the patient chose to share. `@smart-health-checkin/client/wallet` has the protocol and the matching rules; the consent screen is yours.

## What a wallet does

1. Receives a request, from the Digital Credentials API (native) or the [web-wallet hand-off](web-wallet-handoff.md) (web).
2. Shows the patient who is asking (the EHR page's origin) and what for.
3. Lets the patient choose, item by item.
4. Builds a SMART Health Check-in response: one status per item, plus artifacts.
5. Signs and encrypts the response for the EHR's origin, and sends it back.

The spec covers each step: [request handling](https://smart-health-checkin.org/spec/#8-4-wallet-request-handling-and-response-construction), [the response model](https://smart-health-checkin.org/spec/#6-clinical-response-model), and [encryption](https://smart-health-checkin.org/spec/#8-5-hpke-encryption-and-verifier-processing).

## Native wallets on Android

A native wallet registers with Android's Credential Manager and answers requests the browser passes through the Digital Credentials API.

- **Reference wallet:** [`android-wallet`](https://github.com/smart-health-checkin/android-wallet) repository.
- **Install it:** [smart-health-checkin-wallet-debug.apk](https://github.com/smart-health-checkin/android-wallet/releases/latest/download/smart-health-checkin-wallet-debug.apk).
- **Registration:** the app registers a credential entry and a small matcher (WebAssembly) that decides whether a request is a SMART Health Check-in request.
- **Parsing and sealing:** done in Kotlin in that app. This library is JavaScript, for web wallets and for tests.

The rest of this page applies to both kinds: the matching rules, forms, statuses, and health cards are the same.

## Web wallets

A web wallet is a page the EHR opens in a tab. `serveWebWallet` handles the hand-off:

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

What happens under it, the [web wallet hand-off](web-wallet-handoff.md):

| Step | Message |
| --- | --- |
| The EHR opens your page in a tab | none |
| Your page says it's ready | `ready`, to the opener |
| The EHR sends the request | `request`, with the Digital Credentials API argument |
| You answer | `response`: approved with a credential, declined, or an error |

`onRequest` returns one of four answers:

| Answer | What the EHR gets |
| --- | --- |
| `{ response }` | Your SMART response, signed and encrypted for the EHR's origin. It's checked against the request first; a response a Verifier would set aside (a status missing, a record in a type the item doesn't accept) becomes an error reply instead. |
| `{ declined: true }` | The patient closed the wallet without reviewing. If they reviewed and declined everything, send `{ response: declineAll(request) }` instead ([HOLD-4]). |
| `{ error: "…" }` | An error with your message |
| `{ credential }` | A credential you sealed yourself, sent as is. For test wallets that inject faults. |

Options:

| Option | Default | What it does |
| --- | --- | --- |
| `onRequest` | required | Show consent and return an answer |
| `onInvalidRequest` | none | Called when a request can't be read. The EHR also gets an error reply. |
| `closeAfterReply` | `true` | Close the tab after replying |

## Matching records to items

A `selection.fhir` item names records by profile or resource type ([§5.4.1](https://smart-health-checkin.org/spec/#5-4-1-selection-fhir)). `selects` tests one resource; `selectEntries` picks from a Bundle's entries.

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

- **Echo the canonical.** `QuestionnaireResponse.questionnaire` must equal the request's `questionnaireCanonical` exactly, `|version` included.
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

Return a SMART Health Card when an item lists `application/smart-health-card` first in `accept` ([§5.6](https://smart-health-checkin.org/spec/#5-6-accepted-media-types)).

- The artifact's `mediaType` is `application/smart-health-card`.
- Its `value` is `{ verifiableCredential: [jws, …] }`.
- EHRs verify the card's signature against its issuer's published keys, so sign with a key your issuer publishes.

## Lower-level pieces

For wallets that seal their own responses, or run somewhere `serveWebWallet` doesn't fit:

| Function | What it does |
| --- | --- |
| `parseWalletRequest(navigatorArgument)` | The SMART request, the items to answer `unsupported`, `warnings` about the request's wire format, and the pieces needed to answer. Throws `WalletRequestError` only where spec §8.4 says not to respond. |
| `checkWalletResponse(request, response)` | What a Verifier would object to in your response; empty when it's clean |
| `declineAll(request)` | The response for a patient who reviewed and declined everything |
| `sealWalletResponse({ smartResponse, encryptionInfoBytes, verifierOrigin, request? })` | Sign and encrypt a response; returns the credential to send. With `request`, checks the response first. |
| `buildSignedDeviceResponse({ smartResponseJson, sessionTranscript })` | The signed mdoc DeviceResponse, before encryption |
| `recipientJwkFromEncryptionInfo(encryptionInfoBytes)` | The EHR's public key |

## A reference to compare against

The [SMART Testing Wallet](https://smart-health-checkin.org/connectathon/testing-wallet/) implements all of this with `serveWebWallet` and `selectEntries`, plus switches for sending deliberately broken responses. Its [features page](https://github.com/smart-health-checkin/connectathon/blob/main/testing-wallet/FEATURES.md) lists exactly what it does.

Test your wallet against the [Testing EHR](https://smart-health-checkin.org/connectathon/testing-ehr/): it sends every connectathon scenario and checks your answer against the spec. See [Testing](testing.md).

To check your bytes offline, the spec publishes conformance fixtures: real captured requests and responses, with every layer decoded. They're in the [spec repository](https://github.com/smart-health-checkin/spec/tree/v1.0.0-draft.1/fixtures) at tag `v1.0.0-draft.1`, along with small [conformance cases](https://github.com/smart-health-checkin/spec/tree/v1.0.0-draft.1/conformance) your implementation can run in CI, and the [capture inspector](https://smart-health-checkin.org/spec/wire-protocol-inspector.html) walks them byte by byte.

## Getting listed

EHR pages offer web wallets from a registry, a `wallets.json` file. To appear in one:

- **The connectathon registry:** fill in the [registration form](https://smart-health-checkin.org/connectathon/register/). It opens a pull request with your entry; once merged, the registry rebuilds within minutes.
- **A clinic's registry:** send them your entry. [Registry format](registry.md) lists the fields.
- **Your icon:** a small square SVG or PNG, with no scripts or external references. Registries should inline it as a `data:` URL.

Next: [Testing](testing.md)
