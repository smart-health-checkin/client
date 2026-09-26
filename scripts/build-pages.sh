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
# The tutorial's finished page, cut from docs/tutorial.md.
bun scripts/tutorial-page.ts $OUT/demo/tutorial.html
bun build demo/src/main.ts demo/src/autofill.ts demo/src/wallet.ts demo/src/kiosk.ts demo/src/handoff.ts demo/src/picker.ts --outdir $OUT/demo --format esm --minify
bun build demo/src/frameworks/react.tsx --outdir $OUT/demo --format esm --minify
bun build demo/src/frameworks/angular.ts --outdir $OUT/demo --format esm --minify
# hosted builds under /lib/ so the URL space stays organized
mkdir -p $OUT/lib
bun build src/index.ts --outdir $OUT/lib --format esm --minify
mv $OUT/lib/index.js $OUT/lib/checkin.js
bun build src/fhir/index.ts --outdir $OUT/lib --format esm --minify
mv $OUT/lib/index.js $OUT/lib/fhir.js
# Each entry point as one self-contained file: <smart-checkin-picker> in ui.js,
# wallet builders' wallet.js, kiosks' handoff.js, and testing.js for demos.
for entry in ui wallet handoff testing; do
  bun build src/$entry/index.ts --outdir $OUT/lib --format esm --minify
  mv $OUT/lib/index.js $OUT/lib/$entry.js
done
# docs: narrative guides + generated API reference, all from repo markdown
bun run docs >/dev/null
bun scripts/render-docs.ts
bun scripts/apply-chrome.ts

# pinned copies of the hosted modules, so links can outlive a rebuild
VERSION=$(bun -e 'console.log(require("./package.json").version)')
mkdir -p "$OUT/lib/$VERSION"
cp $OUT/lib/checkin.js "$OUT/lib/$VERSION/checkin.js"
cp $OUT/lib/fhir.js "$OUT/lib/$VERSION/fhir.js"
for entry in ui wallet handoff testing; do cp $OUT/lib/$entry.js "$OUT/lib/$VERSION/$entry.js"; done
printf '{"version":"%s"}\n' "$VERSION" > $OUT/lib/version.json

touch $OUT/.nojekyll

# A hosted bundle that does not run is a broken deploy, not a smaller one.
bun scripts/verify-lib.ts
# Every link inside the site reaches a page, and an anchor on it.
bun scripts/check-links.ts "$OUT" "${SITE_BASE:-}"

echo "Built $OUT:"
find "$OUT" -type f | sort
