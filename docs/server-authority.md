# Server-held keys: the seam

Most deployments should keep the verifier key in the page — see
[Production checklist](production.md) for why that's the design rather than a
shortcut. This page is for the narrower case where you want your server to
hold it: you need an audit point outside the browser, or policy says PHI is
only decrypted server-side.

The seam is deliberately small: **two JSON calls**, and the server owns one
short-lived piece of state. Nothing here is protocol — the wire format
between page and wallet is unchanged. This is a contract between *your* page
and *your* server, and you can implement it in any language.

## What flows

```
  browser                              your server                wallet
     │  POST /credential-requests           │                        │
     │  { request }                         │                        │
     │─────────────────────────────────────►│  generate HPKE keypair
     │                                      │  build DeviceRequest
     │  { handle, navigatorArgument }       │  store {key, request, handle}
     │◄─────────────────────────────────────│
     │                                                               │
     │  navigator.credentials.get(navigatorArgument)                 │
     │──────────────────────────────────────────────────────────────►│
     │  sealed response                                              │
     │◄──────────────────────────────────────────────────────────────│
     │                                      │                        │
     │  POST /credential-requests/{handle}/complete                  │
     │  { credential }                      │                        │
     │─────────────────────────────────────►│  HPKE-open, verify COSE,
     │                                      │  cross-check vs request,
     │  { smartResponse, presentation }     │  discard the key
     │◄─────────────────────────────────────│
     │        …or { handledByServer: true } │
```

The page never sees the private key. It does still hold the *sealed*
response for the moment between the wallet returning it and the POST — that's
unavoidable in a browser flow, and it's ciphertext the page cannot open.

## Call 1 — prepare

```http
POST /credential-requests
Content-Type: application/json

{ "request": { "type": "smart-health-checkin-request", "version": "1", ... } }
```

```json
{
  "handle": "8f2c…",
  "navigatorArgument": {
    "mediation": "required",
    "digital": { "requests": [ { "protocol": "org-iso-mdoc", "data": {
      "deviceRequest": "<base64url>", "encryptionInfo": "<base64url>" } } ] }
  }
}
```

The server:

1. **Decides what to ask for.** Take the page's `request` as a suggestion, or
   ignore it and build the request server-side from the appointment. The
   latter is stronger: a compromised page then can't widen the ask.
2. Builds the wire material — `buildOrgIsoMdocRequest(request, { origin })`
   in this library, or the equivalent in your language.
3. Stores, keyed by an unguessable `handle`: the HPKE private key, the
   request as sent, the origin used, the authenticated user/session, and a
   short expiry (a few minutes).
4. Returns the handle and the navigator argument. Both are public material.

The `origin` must be **your** page's origin, taken from configuration — not
from the request body. It goes into the SessionTranscript, and both sides
must compute the same one or the response won't open.

## Call 2 — complete

```http
POST /credential-requests/8f2c…/complete
Content-Type: application/json

{ "credential": { "protocol": "org-iso-mdoc", "data": { "response": "<base64url>" } } }
```

The server:

1. Looks up the handle; rejects if unknown, expired, already used, or
   belonging to a different session than the caller's.
2. HPKE-opens the response with the stored key and the SessionTranscript
   recomputed from the stored origin and encryptionInfo.
3. Verifies the mdoc: issuer signature, device signature, MSO digests.
4. Cross-checks the payload against the **stored** request —
   `validateResponseAgainstRequest` — never against anything the page sent
   with this call.
5. Deletes the stored key. A handle is single-use.

Then it answers in one of two ways.

**Return the data** — key custody and an audit trail, page still prefills:

```json
{
  "smartResponse": { "type": "smart-health-checkin-response", ... },
  "presentation": { "origin": "https://portal.example.org" }
}
```

**Keep the data** — for deployments where the page must not hold PHI:

```json
{ "handledByServer": true, "reference": "encounter-8821/checkin-3" }
```

In this mode `runCheckin` resolves with `status: "completed"`, no `response`,
and your `reference` in `outcome.serverReference`. `requestCheckin` throws,
since it exists to hand you the response. **In-page prefill is impossible
here by construction** — that's the trade you're making, not a limitation to
work around.

## Using it from the page

```ts
import { runCheckin } from "@smart-health-checkin/checkin-client";

const outcome = await runCheckin(myRequest, {
  authority: { server: "/checkin-api" },
});

if (outcome.status === "completed") {
  if (outcome.response) prefillForm(outcome.response);   // server returned data
  else showReceipt(outcome.serverReference);              // server kept it
}
```

The built-in client posts with `credentials: "include"`, so your session
cookie rides along and the server can bind a check-in to the signed-in
patient. If you need headers instead — a bearer token, a CSRF token — pass
your own object implementing `VerifierAuthority` rather than
`{ server }`; it's two methods.

## Security requirements

- **Handles are capability tokens.** Unguessable (≥128 bits of entropy),
  single-use, short-lived, and bound to the session that created them.
- **Never take the origin from the client.** Configuration only.
- **Never re-validate against a client-supplied request.** The stored one is
  the truth; that's the whole reason to hold state.
- **Rate-limit prepare.** Each call mints a keypair and a stored record.
- **Decide what you log.** The opened response is PHI. An audit trail that
  records *that* a check-in happened, with the request id and the item
  statuses, is usually enough; logging artifact bodies rarely is.
- Everything in [Production checklist](production.md) still applies —
  especially trust policy, which stays yours whichever side opens the
  response.

## Reference implementation

There isn't a blessed one yet — the seam is small enough that the contract
above is the specification, and each stack will want its own storage and
session handling. If you build one, the pieces you need from this library
are exported: `buildOrgIsoMdocRequest`, `buildDcapiSessionTranscript`,
`openWalletResponse`, `verifyDeviceResponseSignatures`, and
`validateResponseAgainstRequest`. In a non-JavaScript stack, the
[conformance fixtures](https://github.com/smart-health-checkin/spec/tree/main/fixtures)
are the oracle to build against — they include a real Chrome/Android capture
with a published test key, so you can verify your HPKE-open and signature
checks byte for byte before you trust them.

See also: [Wallets and browser support](wallets.md) ·
[Production checklist](production.md)
