# Agent notes: client

The JavaScript library (`src/`), its docs (`docs/`), and demos (`demo/`).
Deploys to smart-health-checkin.org/client/.
[MAINTAINING.md](https://github.com/smart-health-checkin/smart-health-checkin.github.io/blob/main/MAINTAINING.md) maps every repo, what triggers what, and how to release.

- Check: `bun install && bun run typecheck && bun test`. Tests fetch the
  spec's fixtures and conformance cases at the pinned tag (`SPEC_REF` in
  `scripts/fetch-spec.sh`; `SPEC_DIR=../spec` uses a local checkout).
- Conformance: `conformance/conformance.test.ts` runs the spec's conformance
  cases.
  `conformance/known-failures.json` lists what fails today; when a fix makes a
  listed case pass, the suite fails until you remove it from the list.
- Site: `scripts/build-pages.sh`. It builds the hosted bundles and runs them
  (`scripts/verify-lib.ts`), checks every link (`scripts/check-links.ts`), and
  serves every GitHub release's bundles at `/lib/<version>/`
  (`scripts/fetch-releases.sh`, needs `gh`).
- **Releasing:** set `version` in `package.json`, move the docs' pinned
  versions, push `main`, then push tag `vX.Y.Z`. `release.yml` does the rest.
  Then bump the tarball URL in connectathon, spec, android-wallet (`package.json`), and swift (`.github/workflows/test.yml`).
  Releases are immutable; never re-tag.
- Hosted bundles are self-contained per entry point. State that must be
  shared across bundles (health-card trust) lives on a `globalThis` registry.
- Menus: `scripts/render-docs.ts` writes `/client/nav.json` (Developers) from `scripts/site-nav.ts`
  (`MENU_GROUPS`, each guide's `menuGroup`); the docs rail is built from the same list, so a
  page's place in the rail is its place in the menu. `demo/nav.json` is the Demos menu.
- Page chrome follows "The shared site" in MAINTAINING.md: bar, breadcrumb, `<main id="main">`,
  one `<h1>` worded as the menu entry, footer. Docs pages get it from `render-docs.ts`; demo pages
  carry it in their HTML (`scripts/apply-chrome.ts` checks them and wraps the generated tutorial
  page). The demo wallet, the kiosk hand-off, and the tutorial's finished page use the tool bar;
  `native-bridge.html` has no chrome on purpose. `demo/demo.css` holds the demos' shared layout.
- `scripts/check-links.ts` also fails the build on a `{{` left in a page outside code.
- `scripts/llms.ts` writes `llms.txt` at the end of the build, for the Developers and Demos menus
  together: the apex's shared background (fetched from
  `https://smart-health-checkin.org/llms-background.md`;
  `LLMS_BACKGROUND=../smart-health-checkin.github.io/llms-background.md` builds offline), then
  every page in both `nav.json` files' order as Markdown, then each API module's Markdown
  (`docs/api/<module>.md`) in place of its generated HTML page. A new page must be in a menu or
  the script's `PAGES` or `SKIP`, or the build fails. See
  [llms.txt](https://github.com/smart-health-checkin/smart-health-checkin.github.io/blob/main/MAINTAINING.md#llmstxt)
  in MAINTAINING.md.
- Docs are for developers using the library: keep install lines and pinned
  URLs on the current release.
- Receivers are permissive, producers strict (spec §2, RCV-0..2): the verifier
  side returns transport and crypto findings as `warnings` and fails only where
  spec §8.5 says **fail**; the wallet side (`/wallet`) builds exactly what §8
  describes. Names follow the spec: Verifier, Wallet, Holder.
- Native apps: `demo/native-bridge.html` is the bridge page a native Android app
  opens in a Custom Tab (guide: `docs/native-apps.md`). It depends on the apex's
  `/.well-known/assetlinks.json` and android-wallet's `verifier-app`; see
  MAINTAINING.md, "Native apps", before changing its message format.
- The demos link to the connectathon share page after an outcome ("Tell us how
  it went"); keep that link if a demo is reworked.
