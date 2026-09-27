# SMART Health Check-in for JavaScript

`@smart-health-checkin/client` is the JavaScript library for both sides of SMART Health Check-in. A clinic's page, the Verifier, asks for what a visit needs. The patient's health app, the Wallet, shows the patient the request and answers with the records and form answers they chose to share. The library carries the request and response between the two and does the encryption and the checks the spec requires, so your code works only with the request and response as JSON. [Request and response](https://smart-health-checkin.org/spec/request-response.html#overview) explains both with one running example.

This page is for developers building either side. [Install](install.md) covers adding the library to a project, or loading it in a page with no build step.

## Building a check-in page

A check-in page is a Verifier: a patient portal, a kiosk, or a page you text to a patient before a visit. It sends a request, and the library hands your code a response it has already decrypted and checked against that request. Your code decides what to do with the data, such as prefilling the form the page already has. That form stays as the fallback for a patient who has no wallet or shares nothing.

```ts
import { runCheckin } from "@smart-health-checkin/client";

button.onclick = async () => {
  const result = await runCheckin(myRequest); // the phone's own wallet, started inside the click
  if (result.status === "completed") prefillMyForm(result.response);
};
```

1. The [Tutorial](tutorial.md) builds a whole check-in page in one HTML file: an intake form that fills itself in. Start there if this is your first one.
2. The [Wallet picker](wallets.md#the-picker) is an element that lists the wallets this browser can use and runs the check-in with the one the patient picks. To draw your own buttons instead, see [Without the picker](wallets.md#without-the-picker).
3. [Requests](requests.md) explains what a page can ask for: records by FHIR profile or type, forms, and SMART Health Cards.
4. [Responses](responses.md) explains how to read what comes back, prefill a form and ask only for what's missing, and write FHIR.

A native app can ask the wallets on its phone directly, or run this same web flow through a page on your own domain to reach web wallets too; [Native Verifier apps](native-apps.md) covers both. Before real patients use your page, [Testing](testing.md) covers the mock wallet and the connectathon's testing tools, and [Going to production](production.md) covers keys, trust settings, fallback, and privacy.

## Building a wallet

A wallet receives a request, shows the patient who is asking and what for, lets them choose item by item, and sends back a response signed and encrypted for the page that asked. This library builds web wallets, which a check-in page opens in a browser tab; [`serveWebWallet`](api/wallet.md#servewebwallet) handles the exchange with that page, and your code shows the consent screen. Native wallets on Android and iOS are written in Kotlin or Swift instead, and follow the same rules for matching records, forms, and statuses.

```ts
import { serveWebWallet } from "@smart-health-checkin/client/wallet";

serveWebWallet({
  async onRequest({ request, origin }) {
    const response = await showConsentScreen(request, origin); // your UI
    return { response }; // checked, signed, and encrypted for origin
  },
});
```

- The [Wallet guide](build-a-wallet.md) covers what a wallet does, [native wallets](build-a-wallet.md#native-wallets-on-android), [matching records to items](build-a-wallet.md#matching-records-to-items), forms, statuses, health cards, and [getting listed](build-a-wallet.md#getting-listed) in a clinic's registry.
- [Web wallets](web-wallets.md) describes the messages between a check-in page and a web wallet, for implementing that exchange yourself or debugging it.

## Demos

The [Demos](demo/) run the real protocol with a made-up patient at a pretend clinic. [The demos](testing.md#the-demos) in the Testing guide lists what each one shows and where its source is.
