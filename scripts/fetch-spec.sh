#!/usr/bin/env bash
# Put the spec's fixtures and conformance cases where this repo's tests read them.
# They come from github.com/smart-health-checkin/spec at SPEC_REF, a vX.Y.Z tag.
# Tags never move, so bump SPEC_REF to take a new set. The tag is fetched once
# into .cache/spec/<ref> and copied into place (all gitignored).
#   scripts/fetch-spec.sh
#   SPEC_DIR=../spec scripts/fetch-spec.sh   # use a local spec checkout instead
set -euo pipefail
SPEC_REF="${SPEC_REF:-v1.0.0-draft.1}"
cd "$(dirname "$0")/.."

if [ -n "${SPEC_DIR:-}" ]; then
  SRC="$SPEC_DIR"
  STAMP="local:$SPEC_DIR"
else
  SRC=".cache/spec/$SPEC_REF"
  STAMP="$SPEC_REF"
  if [ ! -d "$SRC/conformance" ]; then
    TMP="$(mktemp -d)"
    git -C "$TMP" init -q
    git -C "$TMP" remote add origin https://github.com/smart-health-checkin/spec
    git -C "$TMP" sparse-checkout set fixtures conformance
    if [[ "$SPEC_REF" =~ ^[0-9a-f]{40}$ ]]; then
      git -C "$TMP" fetch -q --depth 1 --filter=blob:none origin "$SPEC_REF"
      git -C "$TMP" -c advice.detachedHead=false checkout -q FETCH_HEAD
    else
      git -C "$TMP" fetch -q --depth 1 --filter=blob:none origin "refs/tags/$SPEC_REF:refs/tags/$SPEC_REF"
      git -C "$TMP" -c advice.detachedHead=false checkout -q "$SPEC_REF"
    fi
    rm -rf "$SRC"
    mkdir -p "$SRC"
    mv "$TMP/fixtures" "$TMP/conformance" "$SRC/"
    rm -rf "$TMP"
  fi
fi

# place <folder in the spec> <destination here>
place() {
  if [ -n "${SPEC_DIR:-}" ] || [ "$(cat "$2/.ref" 2>/dev/null || true)" != "$STAMP" ]; then
    rm -rf "$2"
    mkdir -p "$(dirname "$2")"
    cp -R "$SRC/$1" "$2"
    echo "$STAMP" > "$2/.ref"
    echo "$2/ is spec $STAMP $1/"
  fi
}

place fixtures fixtures
place conformance spec-conformance
