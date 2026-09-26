# Native apps

A native app asks for a SMART Health Check-in by running the web flow. It opens a page on its own domain in
a browser surface, the page runs the client library like any web page, and the page hands the checked
result back to the app. This reaches every wallet a web page can: the phone's wallets and web wallets.
Wallets bind the response to the page's origin, and the app trusts the page because it's on the app
owner's own domain.

On Android this works end to end with no server: the page and the app talk over a Custom Tabs message
channel. The [example app](https://github.com/smart-health-checkin/android-wallet/tree/main/verifier-app)
and the [bridge page](https://smart-health-checkin.org/client/demo/native-bridge.html) below are the whole
pattern.

## How it works on Android

1. The app opens the bridge page in a Custom Tab.
2. The app asks Chrome for a message channel to the page. Chrome grants it only if the page's site lists
   the app in `/.well-known/assetlinks.json`, so the page knows its messages come from that app.
3. The app sends the SMART request. The page shows the picker, runs the check-in, and decrypts and
   validates the response with `runCheckin`.
4. The page sends the response back in parts, because each message crosses Android's inter-process
   channel, which caps one message at about 1 MB. The app reassembles the parts and checks a SHA-256 hash.
   There's no limit on the total size.

## The bridge page

A static page on your domain that loads the client library. The complete example is
[`demo/src/native-bridge.ts`](https://github.com/smart-health-checkin/client/blob/main/demo/src/native-bridge.ts);
its core:

```ts
import "@smart-health-checkin/client/ui";

// Chrome delivers the app's first message on window, with the channel's port.
// Later messages arrive on the port, and replies go out on it.
let port: MessagePort | undefined;
window.addEventListener("message", (event) => {
  if (port || !event.ports[0]) return;
  port = event.ports[0];
  port.onmessage = (e) => start(e.data);
  start(event.data);
});

function start(data: string) {
  const { request, registry } = JSON.parse(data);
  picker.setAttribute("registry", registry);
  picker.request = request;
}

picker.addEventListener("smart-checkin-response", async (e) => {
  const text = JSON.stringify({ response: e.detail.response.json, wallet: e.detail.wallet.id });
  const PART = 200_000; // characters; keeps each message well under 1 MB
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
| `result-begin` | page → app | `total` parts, `chars`, `sha256` of the UTF-8 result text |
| `result-part` | page → app | `i`, `data` (a slice of the result text) |
| `result-end` | page → app | none |
| `declined`, `failed` | page → app | `code`, `message` for `failed` |

The result text is `{"response": <the checked SMART response>, "wallet": "<wallet id>"}`.

## The app

The example's [`BrowserCheckin`](https://github.com/smart-health-checkin/android-wallet/blob/main/verifier-app/src/main/java/org/smarthealthit/checkin/verifier/BrowserCheckin.kt)
class is the reusable part. It uses `androidx.browser` 1.8:

```kotlin
// Once, early: connect to the browser's Custom Tabs service.
CustomTabsClient.bindCustomTabsService(activity, browserPackage, connection) // → session = client.newSession(callback)

// To start: have Chrome verify the site, then open the page.
session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, bridgeOrigin, null)
CustomTabsIntent.Builder(session).build().launchUrl(activity, bridgeUrl)

// In the CustomTabsCallback. Verification and page load can finish in either order;
// open the channel once both have.
override fun onRelationshipValidationResult(relation: Int, origin: Uri, result: Boolean, extras: Bundle?) { verified = result; openChannelWhenReady() }
override fun onNavigationEvent(event: Int, extras: Bundle?) { if (event == NAVIGATION_FINISHED) { loaded = true; openChannelWhenReady() } }
fun openChannelWhenReady() { if (verified && loaded) session.requestPostMessageChannel(bridgeOrigin, bridgeOrigin, Bundle()) }
override fun onMessageChannelReady(extras: Bundle?) { session.postMessage(checkinMessage, null) }
override fun onPostMessage(message: String, extras: Bundle?) { /* collect parts; check the hash on result-end */ }
```

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

## Your own backend instead

If the app already has a backend, the page can post the result to it under the patient's existing
session, and the app fetches it there. This works the same on Android and iOS.

## iOS

This pattern hasn't been tested on iOS. iOS has no equivalent of the Custom Tabs message channel, so the
backend route above is the way back to the app. What's unknown is which in-app browser surface
(`SFSafariViewController` or `ASWebAuthenticationSession`) offers the Digital Credentials API; Safari
itself does.

## What was tested

The browser path, automated on an Android 17 (API 37) emulator with Chrome 145, with the SMART Testing
Wallet (a web wallet) answering, twice in a row:

| Response | Parts | Share to app |
| --- | --- | --- |
| 4,382 characters | 1 | 0.6 s |
| 1,927,289 characters (a large patient record) | 10 | 0.6–2.8 s |

The direct path, on the same emulator, with the reference Android wallet v0.4.0 answering: the wallet
binds the transcript to the app's `android:apk-key-hash:` origin, and the app decrypts a 4,595-character
response with it. About 11 seconds from tap to result, including the platform's sheet and the wallet's
consent screen.

A web wallet opened from the bridge page inside the Custom Tab keeps `window.opener`, so the
[web wallet protocol](web-wallet-handoff.md) works unchanged. The test is
[`tools/verifier-app-e2e/run.ts`](https://github.com/smart-health-checkin/android-wallet/blob/main/tools/verifier-app-e2e/run.ts)
in the android-wallet repository.

Chrome keeps a copy of the site's Digital Asset Links statements in its HTTP cache. If you change
`assetlinks.json` while testing, clear Chrome's cache (or wait up to an hour) before verification sees
the change.
