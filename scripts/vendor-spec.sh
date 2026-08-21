#!/usr/bin/env bash
# Vendors the rendered SMART Health Check-in spec into site/spec/ so it is
# served at https://smart-health-checkin.org/spec/ alongside the kit.
#
# Source of truth: https://github.com/smart-health-checkin/spec
# Re-run this when the spec changes, then commit the result.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:-https://joshuamandel.com/smart-health-checkin-mdoc}"
OUT=site/spec
mkdir -p "$OUT"

curl -fsSL "$SRC/spec.html" -o "$OUT/index.html"
curl -fsSL "$SRC/spec.md" -o "$OUT/spec.md"
curl -fsSL "$SRC/smart-design.css" -o "$OUT/smart-design.css"
curl -fsSL "$SRC/smart-chrome.js" -o "$OUT/smart-chrome.js"

# Point source links at the org copy rather than the personal repo.
sed -i 's|https://github.com/jmandel/smart-health-checkin-mdoc|https://github.com/smart-health-checkin/spec|g' "$OUT/index.html"

cat > "$OUT/VENDORED.md" <<'EOF'
# Vendored spec

`index.html`, `spec.md`, and the two asset files here are a rendered copy of
the SMART Health Check-in draft spec, refreshed by `scripts/vendor-spec.sh`
so the spec is served from this site at `/spec/`.

Source of truth: <https://github.com/smart-health-checkin/spec>.
Do not edit these files here — edit the spec repo and re-run the script.
EOF

echo "Vendored spec from $SRC:"
ls -la "$OUT"
