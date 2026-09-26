#!/usr/bin/env bash
# Publish every GitHub release's hosted bundles under <lib>/<version>/, so
# /client/lib/<version>/ serves exactly what that release shipped, forever.
# The release workflow (.github/workflows/release.yml) attaches them. Needs gh
# (authenticated locally; GH_TOKEN in CI).
set -euo pipefail
LIB="$1"
REPO="${RELEASES_REPO:-smart-health-checkin/client}"
for tag in $(gh release list -R "$REPO" --limit 500 --json tagName,isDraft -q '.[] | select(.isDraft | not) | .tagName'); do
  case "$tag" in v[0-9]*) ;; *) continue ;; esac
  v="${tag#v}"
  mkdir -p "$LIB/$v"
  if ! gh release download "$tag" -R "$REPO" -p '*.js' -D "$LIB/$v" --clobber 2>/dev/null; then
    rmdir "$LIB/$v" 2>/dev/null || true
    echo "note: release $tag has no hosted bundles" >&2
  fi
done
