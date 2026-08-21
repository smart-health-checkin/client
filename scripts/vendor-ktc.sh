#!/usr/bin/env bash
# Vendors Kill the Clipboard workstream materials into site/ktc/ so they are
# served at https://smart-health-checkin.org/ktc/.
#
# Source of truth: https://github.com/smart-health-checkin/ktc
# Re-run after editing there, then commit the result.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:-https://raw.githubusercontent.com/smart-health-checkin/ktc/main}"
mkdir -p site/ktc/closing-the-loop
curl -fsSL "$SRC/closing-the-loop.html" -o site/ktc/closing-the-loop/index.html

cat > site/ktc/VENDORED.md <<'EOF'
# Vendored KTC materials

Rendered copies from <https://github.com/smart-health-checkin/ktc>, refreshed
by `scripts/vendor-ktc.sh`. Edit them in that repo, not here.
EOF

echo "Vendored KTC materials from $SRC:"
find site/ktc -type f | sort
