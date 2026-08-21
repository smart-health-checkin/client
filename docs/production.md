# Production checklist

The demo is honest about being a demo. Here's what changes when real people
and real charts are involved — most of it is deliberately *yours*, because
these are deployment policy rather than protocol.

## Key custody

The default `browser-local` authority generates the ephemeral HPKE keypair in
page memory. It's genuinely fine for demos and low-stakes flows, and it's the
reason the demo needs no backend at all.

For production, move the key server-side: the browser gets public request
material and an opaque handle, your server opens the response, and you get a
natural place to log what happened.

```ts
await requestCheckin(myRequest, { authority: { server: "/checkin-api" } });
```

Implement two endpoints — `POST /credential-requests` returning
`{ handle, navigatorArgument }`, and `POST /credential-requests/:handle/complete`
returning the opened response — or supply your own `VerifierAuthority` object.

## Trust policy is yours

The kit verifies that a response is internally consistent: signatures check
out against the certificate the wallet presented, the digests match, and the
session binding is correct. It hands you the certificate chain. It does not
decide **which** wallets or issuers you're willing to believe — the demo
accepts self-attested wallets, which is right for a demo and wrong for a
chart.

Decide explicitly: which chains do you accept, what do you do with a
self-attested one (accept but flag for review?), and where is that policy
written down.

## Patient identity

Nothing here matches a share to a chart. `context` is stamped exactly as you
provide it, and the page must be bound to an authenticated patient session
before you trust that binding. Treat an unauthenticated check-in page as
producing unattributed data.

## Where the data lands

Patient-supplied data isn't clinician-entered data, and the difference should
survive the write. Whatever the destination — a staging queue, a reconciliation
worklist, a chart section for review — make sure a human can see the
provenance and that someone owns reviewing it. The `Provenance` the
[FHIR helper](fhir.md) writes is a starting point, not a substitute for a
review workflow.

Decide retention too: how long does a raw response live, in logs or a queue,
and who can read it there.

## The URL is part of the design

The demo carries its configuration in the URL **fragment**, never the query
string, so patient references and request payloads never reach a server log or
a referrer header. Keep that property. And never accept credentials, tokens,
or FHIR auth material through a URL.

## Availability and fallback

The Digital Credentials API isn't everywhere yet (see
[Wallets and browser support](wallets.md)), the patient may decline, and the
wallet may return nothing useful. Every one of those paths must land on the
form you already have. If check-in being unavailable blocks the visit, the
integration is wrong — it's an accelerator on top of your intake, not a
replacement for it.

## Pin your dependencies

Install from a commit rather than a branch, and use the versioned hosted
module (`/lib/<version>/checkin.js`) rather than the moving one, so a
deployment you validated stays the deployment you're running. Better still,
vendor a build you control — this is code running on a page where a patient is
sharing health data.

## Before you go live

- [ ] Server-owned key custody, with an audit trail
- [ ] A written trust policy for wallet certificates
- [ ] Authenticated patient session bound to the page
- [ ] Provenance preserved to the destination, with a review path
- [ ] Fallback to your existing form on declined / unsupported / error
- [ ] Pinned dependency, ideally vendored
- [ ] Retention decided for responses and logs

See also: [Security notes](security-notes.md)
