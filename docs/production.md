# Production checklist

The demo is a demo: it accepts any health app, matches no patients, and keeps
nothing. This page lists what changes when real patients and real charts are
involved. Most of it is yours to decide, because it is deployment policy, not
protocol.

## Key custody

Each check-in encrypts the response to a key that your page creates for that
one request and throws away afterwards. The key lives in the page's memory
for the few seconds the exchange takes. That is the intended design, not a
shortcut, for two reasons.

First, the page is supposed to read the response. Prefilling a form, showing
the patient what came back, asking only for what is missing — none of that is
possible if the response is decrypted on a server the page cannot see into.

Second, it keeps the library to one implementation. Because the whole flow
runs in the browser, nobody has to write and maintain a server-side version
in Java, .NET, Python, or Ruby for each EHR backend. The browser is the one
platform every deployment has.

What the key protects is the hop from the health app to this page. The
response is encrypted to a key only this page holds and is tied to this
request and this page's origin, so it cannot be read in transit or replayed
at another site. The page was going to read the plaintext anyway, so keeping
the key in the page's memory does not widen what the page can see.

The library also supports a server-held key, through the `keys` option
— key custody being the part of the flow that holds the key and opens the
response. It is for the narrow case where a deployment does not want the page
to hold the response at all: a kiosk you do not control, or a policy that
allows PHI to be decrypted only on a server. The cost is real: no prefill in
the page, and a service to build and maintain in your own language. Most
deployments should not choose it. If yours does, [Server-held keys](server-authority.md)
specifies the contract.

Whichever you choose, the ordinary rules for a page that handles health data
still apply: serve it over HTTPS, keep third-party scripts you do not trust
off it, and treat cross-site scripting on it as the data breach it would be.

## Trust policy

The library verifies that a response is internally consistent: the
signatures check against the certificate the health app presented, the
digests match the data, and the response is bound to your page and your
request. It gives you the certificate chain. It does not decide which health
apps or which issuers you are willing to believe. The demo accepts any app,
including one that vouches for itself; that is fine for a demo and wrong for
a chart.

Decide this explicitly, and write it down: which certificate chains you
accept, and what you do with a response from an app that only vouches for
itself — reject it, or accept it and flag it for review.

## Patient identity

Nothing in the library matches a response to a patient record. The `context`
you pass to the FHIR module is written exactly as you gave it. Before you
rely on that, the page must be tied to an authenticated patient session.
Treat data from an unauthenticated check-in page as data with no known
patient attached.

## Where the data goes

Data the patient supplied is not the same as data a clinician entered, and
that difference should survive wherever the data is written: a staging
queue, a reconciliation worklist, a chart section marked for review. Make
sure a person can see where each item came from, and that someone is
responsible for reviewing it. The `Provenance` resource the
[FHIR module](fhir.md) writes records the origin; it does not create the
review step.

Decide retention as well: how long a raw response is kept in logs or queues,
and who can read it there.

## Configuration in the URL fragment

The demo keeps its configuration in the URL fragment (the part after `#`),
never in the query string. Fragments are not sent to servers, so patient
references and request payloads never appear in server logs or in referrer
headers. Keep that property in your own pages. Never accept credentials,
tokens, or FHIR authorization material through a URL at all.

## Availability and fallback

The Digital Credentials API is not in every browser yet (see
[Wallets and browser support](wallets.md)). The patient may decline. The
health app may return nothing useful. Each of those paths has to end at the
intake form you already have. A check-in saves the patient typing when it
works; if its being unavailable can block a visit, the integration is wrong.

## Pin your dependencies

Install from a specific commit rather than a branch, and if you use the
hosted module, use the versioned URL (`/client/lib/<version>/checkin.js`)
rather than the one that moves with each release. Then the code you validated
is the code you are running. Better still, build and host a copy yourself:
this is code that runs on a page where a patient is sharing health data.

## Before you go live

- [ ] Key custody decided on purpose: browser-local unless you have a
      specific reason, and you know what you give up otherwise
- [ ] A written trust policy for health-app certificates
- [ ] The page tied to an authenticated patient session
- [ ] Provenance preserved wherever the data is written, with a review step
- [ ] Fallback to your existing form on declined, unsupported, and error
- [ ] Dependency pinned, ideally self-hosted
- [ ] Retention decided for responses and logs
