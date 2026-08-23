# Server-held keys

Most deployments should keep the key that opens the response in the page;
the [Production checklist](production.md) explains why. This page is for the
narrower case where your server must hold it: you need an audit point
outside the browser, or policy says PHI may only be decrypted on a server.

The contract between your page and your server is small: two JSON calls, and
one short-lived record on the server. Nothing on the wire between the page
and the health app changes. You can implement the server side in any
language. The names used below for wire-level things — DeviceRequest,
SessionTranscript, MSO — are the spec's; section 8 of the
[draft](https://smart-health-checkin.org/spec/) defines them.

## The two calls

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

The page never holds the private key. It does hold the encrypted response
for the moment between the health app returning it and the page posting it
to the server. That is unavoidable in a browser flow, and it is ciphertext
the page cannot open.

## Call 1 — prepare

The page asks the server to prepare a request:

```http
POST /credential-requests
Content-Type: application/json

{ "request": { "type": "smart-health-checkin-request", "version": "1", ... } }
```

The server answers with a handle and the argument the page will pass to the
browser:

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

On this call the server does four things.

1. It decides what to ask for. It can take the page's `request` as a
   suggestion, or ignore it and build the request itself from what it knows
   about the appointment. Building it on the server is stronger: a
   compromised page then cannot widen what is asked.
2. It builds the wire material: the DeviceRequest and the encryption
   information, including a fresh keypair. In this library that is
   `buildOrgIsoMdocRequest(request, { origin })`; in another language it is
   the equivalent.
3. It stores, under an unguessable handle: the private key, the request as
   sent, the origin it used, the authenticated user or session, and an expiry
   a few minutes out.
4. It returns the handle and the navigator argument. Both are safe to give to
   the page.

The `origin` must be your page's origin, taken from the server's own
configuration, never from the request body. It becomes part of the
SessionTranscript, and the health app and the server have to compute the
same one or the response will not decrypt.

## Call 2 — complete

After the browser returns the health app's response, the page posts it back:

```http
POST /credential-requests/8f2c…/complete
Content-Type: application/json

{ "credential": { "protocol": "org-iso-mdoc", "data": { "response": "<base64url>" } } }
```

On this call the server does five things.

1. It looks up the handle, and rejects the call if the handle is unknown,
   expired, already used, or belongs to a different session than the caller.
2. It decrypts the response with the stored key, using the SessionTranscript
   recomputed from the stored origin and encryption information.
3. It verifies the response: the issuer's signature, the device's signature,
   and the digests. In this library that is `openWalletResponse` followed by
   `verifyDeviceResponseSignatures`.
4. It checks the decrypted data against the request it stored — with
   `validateResponseAgainstRequest` — and never against anything the page
   sent in this call.
5. It deletes the stored key. A handle is used once.

Then it answers in one of two ways.

If the page is allowed to see the data, the server returns it, and the page
can prefill as usual:

```json
{
  "smartResponse": { "type": "smart-health-checkin-response", ... },
  "presentation": { "origin": "https://portal.example.org" }
}
```

If the page must not hold PHI, the server keeps the data and returns only a
reference:

```json
{ "handledByServer": true, "reference": "encounter-8821/checkin-3" }
```

In the second case `runCheckin` resolves with `status: "completed"`, no
`response`, and your reference in `outcome.serverReference`. `requestCheckin`
throws, because its purpose is to hand you the response. Prefilling the page
is impossible in this mode by design; that is the trade you are making.

## Using it from the page

```ts
import { runCheckin } from "@smart-health-checkin/client";

const outcome = await runCheckin(myRequest, {
  authority: { server: "/checkin-api" },
});

if (outcome.status === "completed") {
  if (outcome.response) prefillMyForm(outcome.response); // server returned data
  else showMyReceipt(outcome.serverReference);            // server kept it
}
```

The built-in client posts with `credentials: "include"`, so the browser sends
your session cookie and the server can tie the check-in to the signed-in
patient. If your server wants a header instead — a bearer token, a CSRF
token — pass an object of your own that implements `VerifierAuthority`. It
has two methods, one per call.

## Security requirements

- Treat handles as secrets. Make them unguessable (at least 128 bits of
  randomness), single-use, short-lived, and tied to the session that created
  them.
- Never take the origin from the client. It comes from configuration.
- Never validate against a request the client supplied. The stored request
  is the truth; holding it is the reason the server has state at all.
- Rate-limit the prepare call. Each one creates a keypair and a stored
  record.
- Decide what you log. The decrypted response is PHI. Recording that a
  check-in happened, with the request id and each item's status, is usually
  enough; recording the data itself rarely is.
- Everything in the [Production checklist](production.md) still applies, and
  trust policy in particular stays yours whichever side opens the response.

## Reference implementation

There is no reference server yet. The contract above is the specification;
each stack will want its own storage and session handling. The functions a server in this language needs are exported:
`buildOrgIsoMdocRequest`, `buildDcapiSessionTranscript`, `openWalletResponse`,
`verifyDeviceResponseSignatures`, and `validateResponseAgainstRequest`. For a
server in another language, the
[conformance fixtures](https://github.com/smart-health-checkin/spec/tree/main/fixtures)
are what to build against: they include a real capture from Chrome on
Android with a published test key, so you can confirm your decryption and
signature checks byte for byte before you trust them.

See also: [Wallets and browser support](wallets.md) ·
[Production checklist](production.md)
