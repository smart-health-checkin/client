#!/usr/bin/env bash
# Builds the static site: landing at _site/, demo at _site/demo/.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf _site
mkdir -p _site/demo

cp site/index.html _site/index.html
cp demo/index.html _site/demo/index.html
cp demo/wallet.html _site/demo/wallet.html
cp demo/autofill.html _site/demo/autofill.html
cp demo/react.html _site/demo/react.html
bun build demo/src/main.ts demo/src/autofill.ts demo/src/wallet.ts --outdir _site/demo --format esm --minify
bun build demo/src/frameworks/react.tsx --outdir _site/demo --format esm --minify
bun build src/index.ts --outdir _site --format esm --minify
mv _site/index.js _site/kit.js
bun build src/fhir/index.ts --outdir _site --format esm --minify
mv _site/index.js _site/fhir.js
touch _site/.nojekyll

echo "Built _site/:"
find _site -type f | sort
