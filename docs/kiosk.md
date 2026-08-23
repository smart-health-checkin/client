# Kiosk and front-desk check-in

A kiosk, a front-desk screen, or a provider app has no wallet. The patient's
phone does. This guide hands the request across and brings the sealed answer
back — the screen stays the verifier, and only the screen can read the result.

## How it works

```
  kiosk (this page)             mailbox            phone (hand-off page)         wallet
  ─────────────────             ───────            ─────────────────────         ──────
  1  mint the request;          envelope ────────► 2  fetchHandoff:
     hold the key; show a QR    navigatorArgument,    show purpose, items,
     (the URL below)            handoffOrigin,        who is asking
                                expiresAt
                                                   3  answerHandoff ──────────► consent, item by item;
                                                      navigator.credentials.get  seal to the kiosk's key,
                                                      or a web wallet, or the    bound to the phone
                                                      mock                       page's origin
  5  open, verify, cross-check  answer ◄────────── 4  { credential }
     — as for any check-in                            or { declined }
```

The phone page never opens the response: it holds no key. The mailbox sees
the navigator argument (public) and the sealed credential (ciphertext). A
decline on the phone arrives at the kiosk as a decline, not as silence.

## The kiosk

```ts
import { runCheckin, createHandoff } from "@smart-health-checkin/client";

const outcome = await runCheckin(request, createHandoff({
  mailbox,                                  // yours — below
  handoffUrl: "/checkin/handoff.html",      // the page the phone opens
  onWaiting: ({ url }) => drawQrCode(url),  // the session id rides in the fragment
}));
```

`createHandoff` returns two things: an authority that computes the session
transcript for the hand-off page's origin — because that is where the wallet
will be asked — and a `getCredential` that posts the envelope, calls
`onWaiting`, and waits. The key stays in this page, as always. The outcome is
the ordinary one: `completed`, `declined`, or an error, and the response has
been through the same checks as a same-device check-in.

## The phone page

```ts
import { fetchHandoff, answerHandoff, sessionIdFromHash } from "@smart-health-checkin/client";

const sessionId = sessionIdFromHash(location.hash)!;
const { envelope, request } = await fetchHandoff(mailbox, sessionId);
showWhatIsAskedFor(request);                          // purpose and item titles

button.onclick = () => answerHandoff(mailbox, sessionId, envelope);
```

`answerHandoff` calls `navigator.credentials.get` with the kiosk's argument
and posts back what the wallet returned. It takes an optional `getCredential`
— the same credential getters as everywhere, so `credentialGetterFor(responder)` lets
the demo wallet or the mock answer on the phone too. The demo's hand-off page
offers the usual [responder list](wallets.md) with the platform wallet leading.

## The mailbox

```ts
type HandoffMailbox = {
  post(sessionId, envelope): Promise<void>;                       // kiosk → phone
  fetch(sessionId): Promise<HandoffEnvelope>;                     // phone ← kiosk
  answer(sessionId, answer): Promise<void>;                       // phone → kiosk
  waitForAnswer(sessionId, { signal }?): Promise<HandoffAnswer>;  // kiosk ← phone
};
```

Anything both devices can reach: a realtime database, a WebSocket relay, two
endpoints on your own API. What it has to get right:

- **Session ids are capabilities.** The library's are 192 random bits; don't
  shorten them. Whoever has the id can read the envelope and post one answer.
- **Answers are write-once.** The first one wins; the kiosk stops listening.
- **Sessions expire.** The envelope carries `expiresAt` and `fetchHandoff`
  refuses a stale one, but the mailbox should drop them too — ten minutes is
  plenty.
- **Nothing in it is secret**, so it needs no keys. It does need to be yours:
  the hand-off page is where the wallet is asked, and the answer is bound to
  that page's origin, so serve it from an origin you control.

The demo's mailbox is InstantDB —
[`demo/src/mailbox-instant.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/mailbox-instant.ts),
with its schema and rules in
[`instant.schema.ts`](https://github.com/smart-health-checkin/client/blob/main/instant.schema.ts)
and [`instant.perms.ts`](https://github.com/smart-health-checkin/client/blob/main/instant.perms.ts).
One `handoffs` row per session carries timestamps and two storage pointers;
the envelope and the answer are files, because neither is size-bounded. The
rules make the session id the capability: read and post with it, answer once.

## What differs from a same-device check-in

Only the origin. The wallet binds its response to the page that asked — the
phone's hand-off page — so the kiosk's authority is built for that origin, and
`createHandoff` does that for you. Everything after the credential arrives is
identical. The [production checklist](production.md) applies unchanged; a
kiosk in a public place should additionally clear its screen on a timer, and
treat the hand-off page as part of its trust boundary.

Try it: [the kiosk demo](https://smart-health-checkin.org/client/demo/kiosk.html)
— with no phone handy, the page offers to open the hand-off in a new tab, where
the demo wallet or the mock can answer.

Next: [Writing FHIR](fhir.md) · [Production checklist](production.md)
