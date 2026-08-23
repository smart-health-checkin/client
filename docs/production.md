# Production checklist

The demo is honest about being a demo. Here's what changes when real people
and real charts are involved — most of it is deliberately *yours*, because
these are deployment policy rather than protocol.

## Key custody

The verifier's HPKE keypair is generated in the page, used for exactly one
exchange, and discarded. That is the intended arrangement, not a stepping
stone to something server-side.

It has to be, for two reasons:

- **The page is supposed to see the data.** Prefilling a form, showing the
  patient what came back, asking only for what's missing — none of that
  works if the response is opened on a server the page can't see into. The
  autofill pattern *is* the product.
- **One implementation, every stack.** A browser-only client means there is
  no per-language server SDK to write and maintain — no Java, .NET, Python,
  Ruby ports of CBOR/COSE/HPKE for each EHR's backend. The web platform is
  the common denominator, and that's what makes this cheap to adopt.

What the key protects is the hop from the wallet to *this page*: the response
is encrypted to a key only this page holds, bound to this request and this
origin, so it can't be read in transit or replayed at another site. Keeping
that key in page memory is appropriate — it is ephemeral, single-use, and
guards a payload the page is entitled to read anyway.

A `{ server }` authority exists for the narrow case where a deployment
specifically does *not* want the page to hold the response — a kiosk you
don't control, or a policy that says PHI may only be decrypted server-side.
Understand the trade: you lose in-page prefill, and you take on a service to
build and maintain in your own language. Most deployments should not. If you
do, [Server-held keys](server-authority.md) specifies the seam.

Whichever you choose, the ordinary browser rules still apply: serve over
HTTPS, keep the page free of third-party scripts you don't trust, and treat
XSS on a check-in page as what it is — a data breach.

## Trust policy

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

## Where the data goes

Patient-supplied data isn't clinician-entered data, and the difference should
survive the write. Whatever the destination — a staging queue, a reconciliation
worklist, a chart section for review — make sure a human can see the
provenance and that someone owns reviewing it. The `Provenance` the
[FHIR helper](fhir.md) writes is a starting point, not a substitute for a
review workflow.

Decide retention too: how long does a raw response live, in logs or a queue,
and who can read it there.

## Configuration in the URL fragment

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
module (`/client/lib/<version>/checkin.js`) rather than the moving one, so a
deployment you validated stays the deployment you're running. Better still,
vendor a build you control — this is code running on a page where a patient is
sharing health data.

## Before you go live

- [ ] Decided key custody deliberately (browser-local unless you have a
      specific reason, and know what you give up if not)
- [ ] A written trust policy for wallet certificates
- [ ] Authenticated patient session bound to the page
- [ ] Provenance preserved to the destination, with a review path
- [ ] Fallback to your existing form on declined / unsupported / error
- [ ] Pinned dependency, ideally vendored
- [ ] Retention decided for responses and logs

