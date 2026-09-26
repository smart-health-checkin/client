# Going to production

The demos accept any wallet, match no patients, and keep nothing. This page lists what changes with real patients and real charts. Most of it is deployment policy, so it's yours to decide.

## Before you go live

- [ ] Key custody chosen on purpose: in the page, unless you have a specific reason
- [ ] Health-card trust configured, not left at a testing setting
- [ ] Your own registry of web wallets you recognize
- [ ] The page tied to a signed-in patient
- [ ] Fallback to your existing form on every path
- [ ] A review step wherever patient-supplied data lands, with provenance kept
- [ ] Retention decided for responses and logs
- [ ] The library pinned to a version, ideally self-hosted
- [ ] Failure codes logged and watched

## Key custody

Each check-in encrypts the response to a key your page makes for that one request and then throws away.

| `keys` | Where the key lives | Use it when |
| --- | --- | --- |
| `"browser"` (default) | The page's memory, for the few seconds of the exchange | Almost always. The page is going to read the response anyway, to prefill a form. |
| `{ server: "/checkin-api" }` | Your server, behind two HTTP calls | Policy says health data may only be decrypted on a server, or you need an audit point outside the browser |
| Your own `KeyCustody` | Wherever you implement it | Your server needs a header instead of a cookie, or a different API |

Keeping the key in the page is the design, not a shortcut:

- The response is bound to your page's origin and this one request. It can't be read in transit or replayed elsewhere.
- The page was going to read the data anyway. The key in memory doesn't widen what it can see.
- One implementation, in the browser. No server SDK per EHR backend.

Server-held keys cost you prefill in the page and a service to build. Most deployments shouldn't choose them.

### Server-held keys

The page and your server make two JSON calls. Nothing between the page and the wallet changes.

```ts
const result = await runCheckin(myRequest, { wallet, keys: { server: "/checkin-api" } });

if (result.status === "completed") prefillMyForm(result.response);          // the server returned the data
else if (result.status === "kept-on-server") showMyReceipt(result.serverReference); // the server kept it
```

**Call 1, prepare:** `POST /credential-requests` with `{ request }`. The server:

- decides what to ask for (it may ignore the page's request and build its own, which a compromised page can't widen);
- builds the wire request with a fresh key (`buildOrgIsoMdocRequest(request, { origin })` from `/wire` in this language);
- stores the key, the request, the origin, the session, and an expiry under an unguessable handle;
- returns `{ handle, navigatorArgument }`.

**Call 2, complete:** `POST /credential-requests/{handle}/complete` with `{ credential }`. The server:

- rejects an unknown, expired, reused, or other-session handle;
- decrypts and checks it (`openWalletCredential`, then `checkDeviceResponse`, both from `/wire`), keeping their `warnings`;
- checks the data against the stored request (`validateResponseAgainstRequest` from `/model`), never against anything the page sent;
- deletes the key;
- returns `{ smartResponse, presentation, warnings }`, or `{ handledByServer: true, reference }` to keep the data from the page.

Rules for the server:

- **Handles are secrets:** at least 128 random bits, single use, a few minutes long, tied to the session.
- **The origin comes from configuration,** never from the request body.
- **Rate-limit prepare.** Each call makes a key and a record.
- **Log that a check-in happened** and each item's status. Logging the data itself is rarely needed.

The built-in client sends your session cookie (`credentials: "include"`). For a bearer token or CSRF header, pass your own `KeyCustody` object as `keys`. For a server in another language, build against the [conformance fixtures](https://github.com/smart-health-checkin/spec/tree/main/fixtures): they include a real capture with a published test key.

## Trust settings

The library checks that a response is internally sound. Which wallets and issuers you believe is policy. Write it down.

- **Health cards:** trust a directory or named issuers, and leave `accept` at `"trusted"`. See [SMART Health Cards](responses.md#smart-health-cards).
- **Web wallets:** offer only wallets you recognize, in your own `wallets.json`. See [Registries](wallets.md#registries-and-icons).
- **Self-vouching apps:** decide whether to reject them, or accept and flag for review.

## Fallback

The Digital Credentials API isn't in every browser. The patient may decline. The app may have nothing useful.

- Every path ends at the form you already have.
- A missing wallet must never block a visit.
- Items that come back `declined`, `unavailable`, or `partial` go to the form, not to an error.

## Identity and review

- **Tie the page to a signed-in patient.** Nothing in the library matches a response to a chart. Treat data from an anonymous page as having no known patient.
- **Keep provenance.** Patient-supplied data isn't clinician-entered data. The FHIR module's `Provenance` records where it came from.
- **Add a review step:** a worklist, a staging area, a chart section marked for review. Someone is responsible for it.

## Privacy

- **Configuration in the URL fragment,** never the query string. Fragments aren't sent to servers, so patient references stay out of logs.
- **No credentials in URLs** at all.
- **Icons as `data:` URLs** in your registry, so loading the picker contacts no wallet's server.
- **Retention:** decide how long raw responses stay in logs and queues, and who can read them.
- **The page handles health data:** HTTPS, no untrusted third-party scripts, and cross-site scripting treated as a breach.

## Pinning versions

- Install a release by its URL, which never changes: `npm install https://github.com/smart-health-checkin/client/releases/download/v0.3.0/smart-health-checkin-client-0.3.0.tgz`. Each [release](https://github.com/smart-health-checkin/client/releases) lists its own.
- Use versioned hosted files: `/client/lib/0.3.0/ui.js`, not `/client/lib/ui.js`.
- Better still, build and host your own copy.

The [upgrade guide](upgrading.md) lists what changed in each version.

## Monitoring

Log each failed result's `error.code`, and watch the counts.

| Code | A rise usually means |
| --- | --- |
| `blocked` | A code change put an `await` before `wallet.start` |
| `timeout` | A web wallet is down or not replying |
| `wallet-error` | A wallet is failing; its message says why |
| `invalid-response` | A wallet or network problem worth investigating; `error.check` is the spec requirement that failed |
| `server` | Your key server |

Log `result.warnings` from completed check-ins too: a steady stream from one wallet usually means a bug there. `unsupported` and `declined` are normal and don't need alerts. [Testing](testing.md#reading-a-failed-result) explains each code.

Next: [Building a wallet](build-a-wallet.md)
