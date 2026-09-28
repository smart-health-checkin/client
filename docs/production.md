# Going to production

This page is for a developer about to put a check-in page in front of real patients. The library takes care of the protocol: it builds the request, opens the wallet, decrypts and checks the response, and gives your code data that answers the request you sent. What it can't decide for you is how the check-in fits into your clinic's work. Before launch you need to decide what happens when a check-in doesn't work, which patient the data belongs to and who reviews it, which wallets and health-card issuers you trust, how long you keep what arrives, which version of the library you run, and how you'll notice when something breaks. Each section below covers one of those decisions.

A page built while following the [Tutorial](tutorial.md) or [Testing](testing.md) usually still has testing settings in it: the `mock` attribute, the connectathon's wallet registry, and health-card trust loosened to `any-valid`. Take all three out; [Trust settings](#trust-settings) says what replaces the last two.

## Fallback

Many patients won't complete a check-in. Their browser may not have the Digital Credentials API, they may have no health app, they may close the wallet, or the wallet may have nothing that matches. The form your clinic already uses is how those patients check in, so the check-in has to be an optional way to fill it in, never a required step before it.

The library makes each of these cases visible. The picker hides the phone's own wallet when the browser can't reach it, and tells the patient to fill in the form when no wallet can connect. A check-in that doesn't complete ends as `declined` or `failed` rather than throwing, and your page should respond to both by leaving the patient at the form with a short note. A completed check-in can still leave gaps: an item that comes back `declined`, `unavailable`, or `partial` means the matching part of the form stays for the patient to fill in, as [Prefill, then ask only for what's missing](responses.md#prefill-then-ask-only-for-whats-missing) shows. Test each path before launch, including a browser with no wallet at all.

## Matching the check-in to a patient

The library never matches a response to a chart. A wallet sends whatever records its patient chose to share, and nothing in the protocol says which of your patients that is. Your page has to know already.

Run the check-in where the patient is identified before it starts: a portal page they've signed in to, or a link you sent for one appointment. Your page or server then files the result under that patient and appointment. A page that doesn't know the patient, such as a kiosk before registration, produces data that belongs to no one yet. Send it to a queue where staff match it to a chart by hand, and don't match it automatically on the name or birth date in the shared records, which can belong to someone else or differ from what your chart holds.

## Reviewing the data

Everything a wallet sends is supplied by the patient. A health card is signed by its issuer, but the rest is only as reliable as the app the patient used, and even accurate records can be out of date. Keep that distinction wherever the data lands. If the page prefills a form, the patient submits it as their own answers. If you store the response or write it to your EHR, mark it as patient-supplied; the FHIR module's [`Provenance`](responses.md#writing-fhir) records this for you.

Then decide who reviews it before it reaches the chart. That can be a worklist, a staging area, or a chart section marked for review, but someone must be responsible for it, and the review should see which values came from the app and which the patient typed.

## Trust settings

The library checks that a response is sound: that it decrypts with your key, answers your request, and carries valid signatures. Which sources you believe is a policy decision, and it has three parts.

**Health-card issuers.** A SMART Health Card is signed by whoever issued it, such as an insurer or a lab, so it is the one kind of data whose origin you can verify. By default `resources()` includes only cards from issuers you trust, and until you configure trust there are none, so every card is left out. Call [`configureHealthCardTrust`](api/checkin.md#configurehealthcardtrust) once on the page with the VCI directory (`{ directory: "vci" }`) or the issuers you work with, and leave [`accept`](api/checkin.md#accept) at its default, `"trusted"`. That setting also means the library never contacts an issuer you don't trust to fetch its keys. [SMART Health Cards](responses.md#smart-health-cards) explains how cards are checked.

**Web wallets.** Your registry is the list of websites your page will send patients to, so it should contain only wallets you have looked at and are willing to recommend. Serve your own `wallets.json` rather than the connectathon's, which lists test wallets. [Registries and icons](wallets.md#registries-and-icons) explains the file.

**What a wallet's signature proves.** The phone's own wallet is chosen by the operating system, not by you, and every wallet signs its own response. A valid signature shows that the response wasn't altered on the way to your page; it doesn't tell you which app sent it or where its records came from. Treat everything except a trusted health card as the patient's own account. [What the signatures prove](https://smart-health-checkin.org/spec/trust-and-limits.html#signatures) in the spec explains why.

## Privacy and retention

A check-in page holds health data, so treat it like any other page in your portal that does. Serve it over HTTPS and keep untrusted third-party scripts off it: analytics, tag managers, and session-replay tools can read a prefilled form as easily as your own code can. A cross-site scripting bug on this page exposes patient records, so treat one as a breach.

Decide how long raw responses are kept and who can read them. The full response ([`response.json`](api/checkin.md#json)) tends to end up in more places than the chart: server logs, message queues, error reports. Log that a check-in happened and each item's status, which is what [Monitoring](#monitoring) needs, and keep the records themselves only where your review process uses them.

If you text patients a link to the check-in page, the link often works as a credential. Make it specific to one appointment and short-lived, and keep patient identifiers out of it.

## Pinning versions

Run a fixed version of the library, so a new release can't change your page without your testing it. Install the package from a release URL, which always serves the same file ([From a release](install.md#from-a-release)):

```sh
npm install https://github.com/smart-health-checkin/client/releases/download/v0.4.4/smart-health-checkin-client-0.4.4.tgz
```

A page that loads the hosted files should use the versioned path, such as `/client/lib/0.4.4/ui.js`, because `/client/lib/ui.js` always serves the latest release. Building the library into your own bundle, or copying the hosted files to your own server, also removes this site from your page's list of dependencies.

## Monitoring

Every failed check-in carries an [`error.code`](api/checkin.md#checkinerrorcode). Log the code for each failure and watch the counts over time, since a change in one of them usually points to a specific cause:

| Code | A rise usually means |
| --- | --- |
| `blocked` | A code change put an `await` before [`wallet.start`](api/checkin.md#start), so the browser no longer sees the tab opening as part of the click |
| `timeout` | A web wallet is down or not replying |
| `wallet-error` | A wallet is failing; its message says why |
| `invalid-response` | A wallet or network problem worth investigating; [`error.check`](api/checkin.md#checkinresult) names the spec requirement that failed |
| `server` | Your key server, if you [keep the key on a server](#keeping-the-key-on-a-server) |

Log [`result.warnings`](api/checkin.md#checkinresult) from completed check-ins too. A steady stream of warnings from one wallet usually means a bug there that its developer should hear about. `unsupported` failures and declined check-ins are normal and don't need alerts. [Reading a failed result](testing.md#reading-a-failed-result) explains each code.

## Keeping the key on a server

This section applies only if a policy requires it; most deployments should skip it.

Each check-in encrypts the response to a key made for that one request. By default the key lives in the page's memory for the few seconds of the exchange, and that is safe: the response is bound to your page's origin and to this request, so it can't be read in transit or replayed elsewhere, and the page was going to read the data anyway to prefill the form.

Some organizations require that health data be decrypted only on a server, or want a server to be the one place every check-in passes through. For them, [`keys: { server: "/checkin-api" }`](api/checkin.md#keys) moves the key to your server. The page calls your server twice, once to prepare the request and once to open the response; nothing between the page and the wallet changes. Your server then either returns the opened response, so the page can still prefill, or keeps it and returns only a reference:

```ts
const result = await runCheckin(myRequest, { wallet, keys: { server: "/checkin-api" } });

if (result.status === "completed") prefillMyForm(result.response);
else if (result.status === "kept-on-server") showMyReceipt(result.serverReference);
```

The cost is a service you build and run, in your server's language, and, if the server keeps the data, no prefill in the page. The server decides what to ask for, so a compromised page can't widen the request, takes the page's origin from its own configuration, and ties each check-in to the session that started it. The [`KeyCustody`](api/checkin.md#keycustody) reference describes both calls and everything the server stores and checks. The built-in client sends the page's cookies; if your server needs a bearer token or another API, pass your own `KeyCustody` object as `keys` instead.
