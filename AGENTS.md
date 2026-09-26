# Agent notes: client

The JavaScript library (`src/`), its docs (`docs/`), and demos (`demo/`).
Deploys to smart-health-checkin.org/client/.
[MAINTAINING.md](https://github.com/smart-health-checkin/smart-health-checkin.github.io/blob/main/MAINTAINING.md) maps every repo, what triggers what, and how to release.

- Check: `bun install && bun run typecheck && bun test`. Tests fetch the
  spec's fixtures at the pinned tag (`scripts/fetch-fixtures.sh`) on first run.
- Conformance: `conformance/conformance.test.ts` runs the spec's conformance
  cases (pinned by `SPEC_CONFORMANCE_REF` in `scripts/fetch-conformance.sh`).
  `conformance/known-failures.json` lists what fails today; when a fix makes a
  listed case pass, the suite fails until you remove it from the list.
- Site: `scripts/build-pages.sh`. It builds the hosted bundles and runs them
  (`scripts/verify-lib.ts`), checks every link (`scripts/check-links.ts`), and
  serves every GitHub release's bundles at `/lib/<version>/`
  (`scripts/fetch-releases.sh`, needs `gh`).
- **Releasing:** set `version` in `package.json`, move the docs' pinned
  versions, push `main`, then push tag `vX.Y.Z`. `release.yml` does the rest.
  Then bump the tarball URL in connectathon, spec, and android-wallet.
  Releases are immutable; never re-tag.
- Hosted bundles are self-contained per entry point. State that must be
  shared across bundles (health-card trust) lives on a `globalThis` registry.
- Menus: `scripts/render-docs.ts` writes `/client/nav.json` (Developers) from `scripts/site-nav.ts`;
  `demo/nav.json` is the Demos menu.
- Docs are for developers using the library: keep install lines and pinned
  URLs on the current release.
