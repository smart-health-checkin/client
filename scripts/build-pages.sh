#!/usr/bin/env bash
# Builds the static site: landing at _site/, demo at _site/demo/.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf _site
mkdir -p _site/demo

cp site/index.html _site/index.html
cp demo/index.html _site/demo/index.html
cp demo/embed.html _site/demo/embed.html
cp demo/autofill.html _site/demo/autofill.html
bun build demo/src/main.ts demo/src/embed.ts demo/src/autofill.ts --outdir _site/demo --format esm --minify
bun build src/element-register.ts --outdir _site --format esm --minify
mv _site/element-register.js _site/element.js
bun build src/index.ts --outdir _site --format esm --minify
mv _site/index.js _site/kit.js
touch _site/.nojekyll

echo "Built _site/:"
find _site -type f | sort
