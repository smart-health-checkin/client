# SMART Health Check-in for JavaScript

Add SMART Health Check-in to a page you own: a patient portal, a kiosk, a link you text before a visit. The patient's wallet fills in what the visit needs, and the patient never leaves your page.

<figure class="flow">
      <svg viewBox="0 0 640 168" role="img" aria-label="Your page asks; the patient's wallet answers; the response arrives in your own code, where you prefill forms, write FHIR, or ask follow-up questions.">
        <defs>
          <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" fill="currentColor"/>
          </marker>
        </defs>
        <g fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="4" y="20" width="150" height="38" rx="6"/>
          <rect x="245" y="20" width="150" height="38" rx="6"/>
          <line x1="154" y1="39" x2="239" y2="39" marker-end="url(#arr)"/>
          <line x1="395" y1="39" x2="470" y2="39" marker-end="url(#arr)"/>
          <path d="M470 39 H 560 V 78" marker-end="url(#arr)"/>
        </g>
        <g class="mono" fill="currentColor" font-size="12" text-anchor="middle">
          <text x="79" y="43">your page asks</text>
          <text x="320" y="43">wallet answers</text>
        </g>
        <g class="sans" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.65">
          <text x="79" y="72">a check-in request</text>
          <text x="320" y="72">patient consents per item</text>
        </g>
        <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3">
          <rect x="4" y="88" width="632" height="70" rx="8"/>
        </g>
        <g class="mono" fill="currentColor" font-size="12">
          <text x="20" y="110">result.response → the data, in your own code</text>
        </g>
        <g class="sans" fill="currentColor" font-size="10.5" opacity="0.75">
          <text x="20" y="132">prefill your forms · write FHIR · ask follow-up questions</text>
          <text x="20" y="148">The patient stays on your page the whole time.</text>
        </g>
      </svg>
      <figcaption>
        Your page asks, the patient's wallet answers, and the verified
        response lands in your own code. On a desktop the browser offers a QR
        code, so the phone answers and the data still arrives in the desktop page.
      </figcaption>
    </figure>

## Three ways in

| If you want to | Start with |
| --- | --- |
| Build a check-in page step by step | [The tutorial](tutorial.md): an intake form that fills itself in, in one HTML page |
| Drop a picker into a page you have | [The picker](wallets.md#the-picker), below |
| Call it from your own code | [`wallet.start`](#call-it-yourself), below, or [`runCheckin`](wallets.md#starting-inside-the-click) |

Or try it first: the [tutorial's finished page](demo/tutorial.html), the [clinic demo](demo/), the [picker](demo/picker.html), the [allergy form](demo/autofill.html), the [kiosk](demo/kiosk.html).

## Drop in the picker

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/0.3.0/ui.js"></script>

<smart-checkin-picker registry="/wallets.json"></smart-checkin-picker>

<script type="module">
  const picker = document.querySelector("smart-checkin-picker");
  picker.request = myRequest;
  picker.addEventListener("smart-checkin-response", (e) => prefillMyForm(e.detail.response));
</script>
```

## Call it yourself

```ts
import { wallets } from "@smart-health-checkin/client";

const [wallet] = await wallets({ registry: "/wallets.json" });
button.onclick = async () => {
  const result = await wallet.start(myRequest); // inside the click
  if (result.status === "completed") prefillMyForm(result.response);
  else showMyOrdinaryForm();
};
```

## Install

From the GitHub release (the library isn't on the npm registry):

```sh
npm install https://github.com/smart-health-checkin/client/releases/download/v0.3.0/smart-health-checkin-client-0.3.0.tgz
```

What you get:

- **JavaScript and types.** Every entry point (`@smart-health-checkin/client`, `/ui`, `/react`, `/picker`, `/wallet`, `/handoff`, `/fhir`, `/testing`, `/model`, `/wire`) ships as an ES module with `.d.ts` types, plus the TypeScript sources and source maps, so "go to definition" lands in real code. No runtime dependencies. React is an optional peer, needed only for `/react`.
- **TypeScript settings.** Use `"moduleResolution": "bundler"` (Vite, webpack, esbuild) or `"node16"`/`"nodenext"`. The types mention WebCrypto (`CryptoKey`), so a server-only project needs `"DOM"` in `lib` or `"skipLibCheck": true`.
- **ES modules only.** There's no CommonJS build. `require()` works on Node 20.19+ and 22.12+, which can load ES modules.
- **Frameworks.** React has [its own component](wallets.md#in-react). Angular, Vue, and anything else use the element; see [other frameworks](wallets.md#in-angular-vue-and-others).

Or with no build step, from a hosted file:

| File | What it gives you |
| --- | --- |
| `/client/lib/0.3.0/ui.js` | `<smart-checkin-picker>`, self-contained |
| `/client/lib/0.3.0/checkin.js` | `runCheckin`, `wallets`, `CheckinResponse`, and the rest of the root module |
| `/client/lib/0.3.0/handoff.js` | The kiosk hand-off |
| `/client/lib/0.3.0/wallet.js` | For building a web wallet |
| `/client/lib/0.3.0/testing.js` | The mock wallet |
| `/client/lib/0.3.0/fhir.js` | Turning a response into a FHIR transaction |

All at `https://smart-health-checkin.org`. Drop the version for the latest.

## The guides

| Guide | Covers |
| --- | --- |
| [Asking for data](requests.md) | Items and titles, records by profile, forms, formats |
| [Offering wallets](wallets.md) | The picker, kinds of wallet, registries, kiosks, custom transports |
| [Using the answer](responses.md) | Statuses, lookups, health-card trust, prefill, writing FHIR |
| [Going to production](production.md) | Key custody, trust, fallback, privacy, pinning, monitoring |
| [Building a wallet](build-a-wallet.md) | For health-app builders: native and web, matching, forms, cards |
| [Testing](testing.md) | The mock, the connectathon's testing tools, reading failures, the demos |

Reference: [API reference](api/index.md) · [Web wallet hand-off](web-wallet-handoff.md) · [Registry format](registry.md) · [Upgrading](upgrading.md)
