#!/usr/bin/env bash
# Put the spec's conformance cases, at a pinned ref, into ./spec-conformance/.
# They live in github.com/smart-health-checkin/spec under conformance/. The ref
# is a tag or a commit; bump SPEC_CONFORMANCE_REF to take a new set. It is
# fetched once into .cache/ and copied into spec-conformance/ (both gitignored).
#   scripts/fetch-conformance.sh
#   SPEC_CONFORMANCE_DIR=../spec/conformance scripts/fetch-conformance.sh   # use a local spec checkout instead
set -euo pipefail
SPEC_CONFORMANCE_REF="${SPEC_CONFORMANCE_REF:-809a6f6c66112cd635c9ba2c2bd20e84f37f6aa9}"
cd "$(dirname "$0")/.."

if [ -n "${SPEC_CONFORMANCE_DIR:-}" ]; then
  SRC="$SPEC_CONFORMANCE_DIR"
  STAMP="local:$SPEC_CONFORMANCE_DIR"
else
  SRC=".cache/spec-conformance/$SPEC_CONFORMANCE_REF"
  STAMP="$SPEC_CONFORMANCE_REF"
  if [ ! -d "$SRC" ]; then
    TMP="$(mktemp -d)"
    git -C "$TMP" init -q
    git -C "$TMP" remote add origin https://github.com/smart-health-checkin/spec
    git -C "$TMP" sparse-checkout set conformance
    git -C "$TMP" fetch -q --depth 1 --filter=blob:none origin "$SPEC_CONFORMANCE_REF"
    git -C "$TMP" -c advice.detachedHead=false checkout -q FETCH_HEAD
    mkdir -p "$(dirname "$SRC")"
    mv "$TMP/conformance" "$SRC"
    rm -rf "$TMP"
  fi
fi

if [ -n "${SPEC_CONFORMANCE_DIR:-}" ] || [ "$(cat spec-conformance/.ref 2>/dev/null || true)" != "$STAMP" ]; then
  rm -rf spec-conformance
  cp -R "$SRC" spec-conformance
  echo "$STAMP" > spec-conformance/.ref
  echo "spec-conformance/ is spec $STAMP"
fi
