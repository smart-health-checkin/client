#!/usr/bin/env bash
# Put the spec's conformance fixtures, at a pinned tag, into ./fixtures/.
# They live in github.com/smart-health-checkin/spec under fixtures/, tagged
# fixtures-vN. Tags never move, so bump SPEC_FIXTURES_REF to take a new set.
# The tag is cloned once into .cache/ and copied into fixtures/ (both gitignored).
#   scripts/fetch-fixtures.sh
#   SPEC_FIXTURES_DIR=../spec/fixtures scripts/fetch-fixtures.sh   # use a local spec checkout instead
set -euo pipefail
SPEC_FIXTURES_REF="${SPEC_FIXTURES_REF:-fixtures-v1}"
cd "$(dirname "$0")/.."

if [ -n "${SPEC_FIXTURES_DIR:-}" ]; then
  SRC="$SPEC_FIXTURES_DIR"
  STAMP="local:$SPEC_FIXTURES_DIR"
else
  SRC=".cache/spec-fixtures/$SPEC_FIXTURES_REF"
  STAMP="$SPEC_FIXTURES_REF"
  if [ ! -d "$SRC" ]; then
    TMP="$(mktemp -d)"
    git -c advice.detachedHead=false clone -q --depth 1 --branch "$SPEC_FIXTURES_REF" --filter=blob:none --sparse \
      https://github.com/smart-health-checkin/spec "$TMP"
    git -C "$TMP" sparse-checkout set fixtures
    mkdir -p "$(dirname "$SRC")"
    mv "$TMP/fixtures" "$SRC"
    rm -rf "$TMP"
  fi
fi

if [ "$(cat fixtures/.ref 2>/dev/null || true)" != "$STAMP" ]; then
  rm -rf fixtures
  cp -R "$SRC" fixtures
  echo "$STAMP" > fixtures/.ref
  echo "fixtures/ is spec $STAMP"
fi
