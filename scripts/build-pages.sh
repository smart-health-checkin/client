#!/usr/bin/env bash
# Builds the static site: landing at $OUT/, demo at $OUT/demo/.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${OUT_DIR:-_site}"
rm -rf "$OUT"
mkdir -p "$OUT/demo"

# The design system and chrome are served from the apex by the site build
# (smart-health-checkin/smart-health-checkin.github.io), which is what deploys smart-health-checkin.org.
# Standalone, copy them from a sibling checkout so a local build is styled.
if [ -z "${SITE_BASE:-}" ]; then
  ASSETS="${SITE_ASSETS:-../smart-health-checkin.github.io/assets}"
  if [ -d "$ASSETS" ]; then cp -r "$ASSETS" "$OUT/assets"
  else echo "warning: $ASSETS not found; pages will request /assets/ from the apex" >&2; fi
fi
cp demo/index.html $OUT/demo/index.html
cp demo/wallet.html $OUT/demo/wallet.html
cp demo/wallets.json $OUT/demo/wallets.json
cp demo/autofill.html $OUT/demo/autofill.html
cp demo/react.html $OUT/demo/react.html
cp demo/angular.html $OUT/demo/angular.html
cp demo/kiosk.html $OUT/demo/kiosk.html
cp demo/handoff.html $OUT/demo/handoff.html
cp demo/picker.html $OUT/demo/picker.html
# The bridge page native apps open in a Custom Tab (docs/native-apps.md).
cp demo/native-bridge.html $OUT/demo/native-bridge.html
# The Demos menu, read by the site chrome.
cp demo/nav.json $OUT/demo/nav.json
# The tutorial's finished page, cut from docs/tutorial.md.
bun scripts/tutorial-page.ts $OUT/demo/tutorial.html
bun build demo/src/main.ts demo/src/autofill.ts demo/src/wallet.ts demo/src/kiosk.ts demo/src/handoff.ts demo/src/picker.ts demo/src/native-bridge.ts --outdir $OUT/demo --format esm --minify
bun build demo/src/frameworks/react.tsx --outdir $OUT/demo --format esm --minify
bun build demo/src/frameworks/angular.ts --outdir $OUT/demo --format esm --minify
# hosted builds under /lib/ so the URL space stays organized
scripts/build-lib.sh "$OUT/lib"
# docs: narrative guides + generated API reference, all from repo markdown
bun run docs >/dev/null
bun scripts/render-docs.ts
bun scripts/apply-chrome.ts

# Pinned copies: /lib/<version>/ serves each GitHub release's bundles, byte
# for byte (scripts/fetch-releases.sh). Rebuilding old versions isn't an
# option: minifier output changes across Bun versions.
VERSION=$(bun -e 'console.log(require("./package.json").version)')
scripts/fetch-releases.sh "$OUT/lib"
if [ ! -d "$OUT/lib/$VERSION" ]; then
  # Not released yet: publish today's build under its number as a preview.
  echo "warning: v$VERSION has no release yet; publishing /lib/$VERSION/ from source" >&2
  mkdir -p "$OUT/lib/$VERSION"
  for entry in checkin fhir ui wallet handoff testing; do cp "$OUT/lib/$entry.js" "$OUT/lib/$VERSION/$entry.js"; done
fi
printf '{"version":"%s"}\n' "$VERSION" > $OUT/lib/version.json

# Every pinned URL the docs and demos mention has to exist in this build.
missing=0
for v in $(grep -rhoE '/lib/[0-9]+\.[0-9]+\.[0-9]+/' docs demo README.md | sort -u | cut -d/ -f3); do
  if [ ! -d "$OUT/lib/$v" ]; then echo "error: docs pin /lib/$v/ but there is no v$v release" >&2; missing=1; fi
done
[ "$missing" = 0 ] || exit 1

touch $OUT/.nojekyll

# A hosted bundle that does not run is a broken deploy, not a smaller one.
bun scripts/verify-lib.ts
# Every link inside the site reaches a page, and an anchor on it.
bun scripts/check-links.ts "$OUT" "${SITE_BASE:-}"

echo "Built $OUT:"
find "$OUT" -type f | sort
