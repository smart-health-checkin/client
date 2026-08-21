#!/usr/bin/env bash
# Builds the static site: landing at _site/, demo at _site/demo/.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf _site
mkdir -p _site/demo

cp site/index.html _site/index.html
cp demo/index.html _site/demo/index.html
bun build demo/src/main.ts --outdir _site/demo --format esm --minify
touch _site/.nojekyll

echo "Built _site/:"
find _site -type f | sort
