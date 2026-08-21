#!/usr/bin/env bash
# Builds the static site: landing at _site/, demo at _site/demo/.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf _site
mkdir -p _site/demo

cp site/index.html _site/index.html
# vendored spec (see scripts/vendor-spec.sh) served at /spec/
[ -d site/spec ] && mkdir -p _site/spec && cp site/spec/index.html site/spec/spec.md site/spec/smart-design.css site/spec/smart-chrome.js _site/spec/
# vendored KTC materials (see scripts/vendor-ktc.sh) served at /ktc/
[ -d site/ktc ] && mkdir -p _site/ktc && cp -r site/ktc/closing-the-loop _site/ktc/
cp demo/index.html _site/demo/index.html
cp demo/wallet.html _site/demo/wallet.html
cp demo/autofill.html _site/demo/autofill.html
cp demo/react.html _site/demo/react.html
bun build demo/src/main.ts demo/src/autofill.ts demo/src/wallet.ts --outdir _site/demo --format esm --minify
bun build demo/src/frameworks/react.tsx --outdir _site/demo --format esm --minify
# hosted builds under /lib/ so the URL space stays organized
mkdir -p _site/lib
bun build src/index.ts --outdir _site/lib --format esm --minify
mv _site/lib/index.js _site/lib/checkin.js
bun build src/fhir/index.ts --outdir _site/lib --format esm --minify
mv _site/lib/index.js _site/lib/fhir.js
touch _site/.nojekyll
# Custom domain: create site/CNAME (one line: the domain) once DNS points at
# GitHub Pages. Until then the site stays on the *.github.io URL.
[ -f site/CNAME ] && cp site/CNAME _site/CNAME

echo "Built _site/:"
find _site -type f | sort
