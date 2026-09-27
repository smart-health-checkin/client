# Install

The library is one package, `@smart-health-checkin/client`, with a separate entry point for each job: check-in pages, the picker, wallets, kiosks, FHIR, and testing. A project with a build step installs the package from a GitHub release. A page without one loads a hosted file instead, which works the same way.

## From a release

The library isn't on the npm registry. Each [GitHub release](https://github.com/smart-health-checkin/client/releases) has a built package, and you install it by its URL. npm, pnpm, yarn, and Bun all accept a URL:

```sh
npm install https://github.com/smart-health-checkin/client/releases/download/v0.4.4/smart-health-checkin-client-0.4.4.tgz
```

A release's URL always serves the same package, so the line pins one version. Each release's notes start with its own install line; watch the repository's releases to hear about new ones. Installing straight from git (`npm install github:smart-health-checkin/client#v0.4.4`) also works, but builds the package on your machine.

The package has no runtime dependencies. React is an optional peer dependency, needed only for `/react`. Every entry point ships as an ES module with `.d.ts` types, plus the TypeScript sources and source maps, so "go to definition" in your editor lands in the library's real code.

## Hosted files

For a page with no build step, this site hosts each entry point that runs in a browser as one self-contained ES module. Load only the ones the page uses:

```html
<script type="module" src="https://smart-health-checkin.org/client/lib/0.4.4/ui.js"></script>

<script type="module">
  import { runCheckin } from "https://smart-health-checkin.org/client/lib/0.4.4/checkin.js";
</script>
```

The files are at `https://smart-health-checkin.org/client/lib/<version>/<file>`, and each release's files never change once published. Without a version, `/client/lib/<file>` serves the latest release, so a page that uses it changes when a release comes out. [Pinning versions](production.md#pinning-versions) says what to use in production.

## Entry points

Import each one from the package, or load its hosted file where it has one.

| Entry point | Hosted file | What it gives you | Guide |
| --- | --- | --- | --- |
| [`@smart-health-checkin/client`](api/checkin.md) | `checkin.js` | For check-in pages: `runCheckin`, `wallets`, `CheckinResponse` | [Without the picker](wallets.md#without-the-picker), [Responses](responses.md) |
| [`/ui`](api/ui.md) | `ui.js` | The `<smart-checkin-picker>` element | [The picker](wallets.md#the-picker) |
| [`/react`](api/react.md) | package only | `<CheckinPicker>` and `useCheckin` | [In React](wallets.md#in-react) |
| [`/picker`](api/picker.md) | package only | The picker's logic, for your own wallet list | [A button for each wallet](wallets.md#a-button-for-each-wallet) |
| [`/wallet`](api/wallet.md) | `wallet.js` | For web wallets: `serveWebWallet`, matching, sealing | [Wallet guide](build-a-wallet.md#web-wallets) |
| [`/handoff`](api/handoff.md) | `handoff.js` | For kiosks: `handoffWallet` and the phone page's `answerHandoff` | [Kiosk hand-off](wallets.md#kiosk-hand-off) |
| [`/fhir`](api/fhir.md) | `fhir.js` | Optional: a response as a FHIR transaction | [Writing FHIR](responses.md#writing-fhir) |
| [`/testing`](api/testing.md) | `testing.js` | `mockWallet`, for demos and tests | [The mock wallet](testing.md#the-mock-wallet) |
| [`/model`](api/model.md), [`/wire`](api/wire.md) | package only | The request and response types and validators, and the protocol bytes | [API reference](api/index.md) |

## TypeScript settings

Use `"moduleResolution": "bundler"` (for Vite, webpack, or esbuild) or `"node16"`/`"nodenext"`, which read the package's `exports` map. Older settings can't find the entry points. The types mention WebCrypto's `CryptoKey`, so a project that runs only on a server needs `"DOM"` in `lib`, or `"skipLibCheck": true`.

## ES modules

The package has no CommonJS build, so load it with `import`. `require()` also works on Node 20.19 and later and 22.12 and later, which can load ES modules.

## Frameworks

React has its own component, [`<CheckinPicker>`](wallets.md#in-react). Angular, Vue, and other frameworks use the `<smart-checkin-picker>` element; [In Angular, Vue, and others](wallets.md#in-angular-vue-and-others) shows how to allow it and pass it a request, and [TypeScript and the element](wallets.md#typescript-and-the-element) shows how to type it.
