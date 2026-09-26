#!/usr/bin/env bash
# Build the hosted bundles into $1: checkin.js and fhir.js, plus each entry
# point as one self-contained file: <smart-checkin-picker> in ui.js, wallet
# builders' wallet.js, kiosks' handoff.js, and testing.js for demos.
set -euo pipefail
cd "$(dirname "$0")/.."
LIB="$1"
mkdir -p "$LIB"
bun build src/index.ts --outdir "$LIB" --format esm --minify
mv "$LIB/index.js" "$LIB/checkin.js"
for entry in fhir ui wallet handoff testing; do
  bun build src/$entry/index.ts --outdir "$LIB" --format esm --minify
  mv "$LIB/index.js" "$LIB/$entry.js"
done
