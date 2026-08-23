# Kiosk and front-desk check-in

A kiosk, a front-desk screen, or a provider's own app has no health app on
it. The patient's phone does. This guide shows how the screen hands its
request to the phone and gets the answer back, while the screen remains the
only thing that can read that answer.

## How it works

The screen builds the request exactly as any page would, and keeps the key
the response will be encrypted to. Instead of asking a health app on the same
device, it shows a QR code. The patient scans it, which opens a small page on
their phone. That page fetches the request, asks the health app on the phone,
and sends the sealed answer back. The screen decrypts and checks it.

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

The page on the phone never decrypts anything: it has no key. The mailbox in
the middle only ever holds the request (which is public) and the sealed
answer (which is ciphertext). If the patient declines on the phone, the
screen is told so; it does not sit waiting.

## The kiosk

```ts
import { runCheckin, createHandoff } from "@smart-health-checkin/client";

const outcome = await runCheckin(myRequest, createHandoff({
  mailbox: myMailbox,                         // yours — see "The mailbox" below
  handoffUrl: "/checkin/handoff.html",        // the page the phone opens
  onWaiting: ({ url }) => drawMyQrCode(url),  // the session id rides in the fragment
}));
```

`createHandoff` returns the two options `runCheckin` needs. The first is the
*authority* — the part of the flow that holds the key and opens the response.
`createHandoff` sets it up for the web origin of the hand-off page, because a
health app binds its answer to the page that asked, and that page is the one
on the phone. The second is a credential getter that puts the request in the
mailbox, calls `onWaiting` with the URL to show as a QR code, and waits for
the answer. The key never leaves the screen. The outcome is the usual one —
`completed`, `declined`, or an error — and the response has passed the same
checks as any other.

## The phone page

```ts
import { fetchHandoff, answerHandoff, sessionIdFromHash } from "@smart-health-checkin/client";

const sessionId = sessionIdFromHash(location.hash)!;
const { envelope, request } = await fetchHandoff(myMailbox, sessionId);
showMyConsentScreen(request);                         // purpose and item titles

myShareButton.onclick = () => answerHandoff(myMailbox, sessionId, envelope);
```

`fetchHandoff` reads the request from the mailbox and decodes it, so the page
can show the patient what is being asked for. `answerHandoff` calls
`navigator.credentials.get` with exactly what the screen prepared and puts
whatever the health app returned back in the mailbox. It accepts an optional
credential getter, so the same choices as on any page — a web wallet, or the
mock — work on the phone too. The demo's hand-off page shows the usual list
of responders, with the platform wallet first.

## The mailbox

The mailbox is something both devices can reach. You provide it, by
implementing four functions:

```ts
type HandoffMailbox = {
  post(sessionId, envelope): Promise<void>;                       // kiosk → phone
  fetch(sessionId): Promise<HandoffEnvelope>;                     // phone ← kiosk
  answer(sessionId, answer): Promise<void>;                       // phone → kiosk
  waitForAnswer(sessionId, { signal }?): Promise<HandoffAnswer>;  // kiosk ← phone
};
```

It can be a realtime database, a WebSocket relay, or two endpoints on your
own API. Whatever it is, it has to get four things right:

- **Session ids are secrets.** Whoever has one can read the request and post
  one answer. The library generates 192 random bits; do not shorten them.
- **An answer is written once.** The first answer wins, and the screen stops
  listening after it.
- **Sessions expire.** The request carries an `expiresAt` time, and
  `fetchHandoff` refuses a stale one, but the mailbox should delete old
  sessions too. Ten minutes is plenty.
- **Nothing in it is secret**, so it needs no keys. It does need to be yours:
  the hand-off page is where the health app is asked, and the answer is bound
  to that page's origin, so serve the page from an origin you control.

The demo's mailbox is InstantDB. The implementation is
[`demo/src/mailbox-instant.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/mailbox-instant.ts);
its schema and access rules are
[`instant.schema.ts`](https://github.com/smart-health-checkin/client/blob/main/instant.schema.ts)
and [`instant.perms.ts`](https://github.com/smart-health-checkin/client/blob/main/instant.perms.ts).
One row per session holds timestamps and two pointers into file storage; the
request and the answer are stored as files, because a response can be large.
The rules let anyone with the session id read and post, and let the answer be
written exactly once.

## What differs from a same-device check-in

Only the web origin. A health app binds its response to the page that asked
it. On a kiosk that page is the hand-off page on the phone, not the screen,
so the screen has to open the response expecting that origin. `createHandoff`
arranges that. Everything after the answer arrives is the same as on any
page, and the [production checklist](production.md) applies unchanged. A
kiosk in a public place should also clear its screen after a timeout, and
treat the hand-off page as part of what it trusts.

Try it: [the kiosk demo](https://smart-health-checkin.org/client/demo/kiosk.html).
If you have no phone at hand, the page offers to open the hand-off page in a
new tab, where the demo web wallet or the mock can answer.

Next: [Writing FHIR](fhir.md) · [Production checklist](production.md)
