#!/usr/bin/env bash
# Freeze the hosted bundles for the version in package.json into
# releases/<version>/. Those files are what /client/lib/<version>/ serves from
# then on, byte for byte, so run this once per release and commit the result.
#   scripts/freeze-release.sh            # a new version
#   scripts/freeze-release.sh --replace  # re-freeze a released version (a fix to pinned files)
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(bun -e 'console.log(require("./package.json").version)')
DEST="releases/$VERSION"
if [ -d "$DEST" ] && [ "${1:-}" != "--replace" ]; then
  echo "error: $DEST already exists. Pinned files must not change: bump the version, or pass --replace if you mean to." >&2
  exit 1
fi
rm -rf "$DEST"
scripts/build-lib.sh "$DEST" >/dev/null
echo "Froze $DEST:"
ls -l "$DEST"
echo "Commit it, then tag v$VERSION."
