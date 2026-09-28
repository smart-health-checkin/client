# Native Verifier apps

A native app asks for a SMART Health Check-in by running the web flow. It opens a page on its own domain in
a browser surface, the page runs the client library like any web page, and the page hands the checked
result back to the app. This reaches every wallet a web page can: the phone's wallets and web wallets.
Wallets bind the response to the page's origin, and the app trusts the page because it's on the app
owner's own domain.

On Android this works end to end with no server: the page and the app talk over a Custom Tabs message
channel. The [example app](https://github.com/smart-health-checkin/android-wallet/tree/main/verifier-app)
and the [bridge page](https://smart-health-checkin.org/client/demo/native-bridge.html) below are the whole
pattern.

## Try the example app

Install the [example app's APK](https://github.com/smart-health-checkin/android-wallet/releases/latest/download/smart-health-checkin-verifier.apk)
on an Android phone or emulator (open the link on the phone, or `adb install -r` the download). It's
released with the [reference Android wallet](https://github.com/smart-health-checkin/android-wallet/releases/latest)
and signed with the key this site's `assetlinks.json` lists, so both buttons work as installed:

- **Check in through the browser** opens the [bridge page](#the-bridge-page) in a Custom Tab and reaches
  the phone's wallets and web wallets, such as the SMART Testing Wallet.
- **Check in with a wallet on this phone** [calls Credential Manager directly](#calling-the-phones-wallets-directly)
  and reaches only the phone's wallets, such as the reference Android wallet.

## How it works on Android

1. The app opens the [bridge page](#the-bridge-page) in a Custom Tab, in a new Custom Tabs session for each
   check-in.
2. The app asks Chrome for a message channel to the page. Chrome grants it only if the page's site lists
   the app in `/.well-known/assetlinks.json`, so the page knows its messages come from that app.
3. The app sends the SMART request. The page answers `started`, shows the picker, runs the check-in, and
   decrypts and validates the response with [`runCheckin`](api/checkin.md#runcheckin).
4. The page sends the response back in parts, so a response of any size gets through the channel. The app
   reassembles the parts and checks a SHA-256 hash.

## The bridge page

A static page on your domain that loads the client library ([Install](install.md)). The complete example is
[`demo/src/native-bridge.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/native-bridge.ts);
its core:

```ts
import "@smart-health-checkin/client/ui";

const picker = document.querySelector("smart-checkin-picker")!;

// Chrome delivers the app's first message on window, with the channel's port.
// Later messages arrive on the port, and replies go out on it. A new channel replaces the old one.
let port: MessagePort | undefined;
window.addEventListener("message", (event) => {
  if (!event.ports[0]) return;
  port?.close();
  port = event.ports[0];
  port.onmessage = (e) => start(e.data);
  start(event.data);
});

function start(data: string) {
  const { type, request, registry } = JSON.parse(data);
  if (type !== "checkin") return;
  port!.postMessage(JSON.stringify({ type: "started" }));
  if (registry) picker.setAttribute("registry", registry);
  picker.request = request;
}

picker.addEventListener("smart-checkin-response", async (e) => {
  const { response, wallet } = e.detail;
  if (!response) return;
  const text = JSON.stringify({ response: response.json, wallet: wallet.id });
  const PART = 200_000; // characters per message
  const total = Math.ceil(text.length / PART);
  port!.postMessage(JSON.stringify({ type: "result-begin", total, chars: text.length, sha256: await sha256Hex(text) }));
  for (let i = 0; i < total; i++) port!.postMessage(JSON.stringify({ type: "result-part", i, data: text.slice(i * PART, (i + 1) * PART) }));
  port!.postMessage(JSON.stringify({ type: "result-end" }));
});
```

The page also sends `{"type":"declined"}` when nothing was shared and
`{"type":"failed","code":…,"message":…}` when the check-in fails.

| Message | Direction | Fields |
| --- | --- | --- |
| `checkin` | app → page | `request` (the SMART request), `registry` (optional wallet registry URL) |
| `started` | page → app | none; the app fails the check-in if this doesn't arrive in time |
| `result-begin` | page → app | `total` parts, `chars`, `sha256` of the UTF-8 result text |
| `result-part` | page → app | `i`, `data` (a slice of the result text) |
| `result-end` | page → app | none |
| `declined`, `failed` | page → app | `code`, `message` for `failed` |

The result text is `{"response": <the checked SMART response>, "wallet": "<wallet id>"}`.

## The app

The example's [`BrowserCheckin`](https://github.com/smart-health-checkin/android-wallet/blob/main/verifier-app/src/main/java/org/smarthealthit/checkin/verifier/BrowserCheckin.kt)
class is the reusable part. It uses `androidx.browser` 1.8:

```kotlin
// Once, early: connect to the browser's Custom Tabs service and keep the client.
CustomTabsClient.bindCustomTabsService(activity, browserPackage, connection) // → client

// To start: a new session for each check-in (Chrome keeps one message channel per session),
// have Chrome verify the site, then open the page.
val session = client.newSession(callback)
session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, bridgeOrigin, null)
CustomTabsIntent.Builder(session).build().launchUrl(activity, bridgeUrl)

// In the CustomTabsCallback. Verification and page load can finish in either order;
// open the channel once both have.
override fun onRelationshipValidationResult(relation: Int, origin: Uri, result: Boolean, extras: Bundle?) { verified = result; openChannelWhenReady() }
override fun onNavigationEvent(event: Int, extras: Bundle?) { if (event == NAVIGATION_FINISHED) { loaded = true; openChannelWhenReady() } }
fun openChannelWhenReady() { if (verified && loaded && !session.requestPostMessageChannel(bridgeOrigin, bridgeOrigin, Bundle())) fail() }
override fun onMessageChannelReady(extras: Bundle?) { session.postMessage(checkinMessage, null) }
override fun onPostMessage(message: String, extras: Bundle?) { /* `started`, then collect parts; check the hash on result-end */ }
```

Reusing one session for a second check-in fails silently: Chrome reports the new channel ready and accepts
the message, but the new page never receives it. The example also fails the check-in if `started` hasn't
arrived 30 seconds after it opens the page, so the app never waits forever.

The manifest declares the channel's service, and lets the app find the browser on Android 11 and later:

```xml
<queries>
  <intent><action android:name="android.support.customtabs.action.CustomTabsService" /></intent>
</queries>
<service android:name="androidx.browser.customtabs.PostMessageService" android:exported="true" />
```

When the result arrives, the example brings its activity back to the front with
`FLAG_ACTIVITY_CLEAR_TOP | FLAG_ACTIVITY_SINGLE_TOP`, which closes the Custom Tab.

## assetlinks.json

The page's site lists the app, by package name and signing-certificate fingerprint:

```json
[{
  "relation": ["delegate_permission/common.use_as_origin"],
  "target": {
    "namespace": "android_app",
    "package_name": "org.smarthealthit.checkin.verifier",
    "sha256_cert_fingerprints": ["84:64:3E:B6:…:DD:A4"]
  }
}]
```

Chrome reads it through Google's Digital Asset Links service, which caches a site's file for up to an
hour, and Chrome caches the answer too. After you change the file, allow up to an hour, or clear Chrome's
cache while testing.

## Calling the phone's wallets directly

An Android app can also skip the browser and call `CredentialManager.getCredential` with a
`GetDigitalCredentialOption` holding the same `org-iso-mdoc` request. This reaches only the phone's
wallets, not web wallets, and the app decrypts and validates the response itself. Android reports no web
origin for an app, so the transcript's origin is `android:apk-key-hash:` followed by the base64url SHA-256
of the app's signing certificate ([spec TR-2](https://smart-health-checkin.org/spec/#TR-2)). The example
app's second button does this.

Wallets can't yet name a native app that calls them directly, so the reference wallet says "An app is
asking for your health information"; how wallets should identify native app callers is still open.

## Your own backend instead

If the app already has a backend, the page can post the result to it under the patient's existing
session, and the app fetches it there. This works the same on Android and iOS.

## iOS

This pattern hasn't been tested on iOS. iOS has no equivalent of the Custom Tabs message channel, so the
backend route above is the way back to the app. What's unknown is which in-app browser surface
(`SFSafariViewController` or `ASWebAuthenticationSession`) offers the Digital Credentials API; Safari
itself does.

## How it's tested

An automated test in the android-wallet repository,
[`tools/verifier-app-e2e/run.ts`](https://github.com/smart-health-checkin/android-wallet/blob/main/tools/verifier-app-e2e/run.ts),
runs both paths on an Android emulator with Chrome. On the browser path the SMART Testing Wallet answers
from inside the Custom Tab: a web wallet opened there keeps `window.opener`, so the
[web wallet protocol](web-wallets.md) works unchanged. On the direct path the reference Android wallet
answers, binding the transcript to the app's `android:apk-key-hash:` origin, and the app decrypts the
response with its own key.
