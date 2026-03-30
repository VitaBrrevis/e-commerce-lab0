#!/usr/bin/env bash
set -euo pipefail

echo "--- Starting Lab 2 Grading (GHCR) ---"

: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${GITHUB_REPOSITORY_OWNER:?GITHUB_REPOSITORY_OWNER is required}"

OWNER_LC=$(echo "$GITHUB_REPOSITORY_OWNER" | tr '[:upper:]' '[:lower:]')
PACKAGE_NAME="ecommerce-app"
API_ROOT="https://api.github.com"
HDR_AUTH=(-H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")

PKG_USERS="${API_ROOT}/users/${OWNER_LC}/packages/container/${PACKAGE_NAME}"
PKG_ORGS="${API_ROOT}/orgs/${OWNER_LC}/packages/container/${PACKAGE_NAME}"

echo "Step 1: Checking package metadata..."
HTTP_PKG=$(curl -sS -o /tmp/lab2_pkg.json -w "%{http_code}" "${HDR_AUTH[@]}" "$PKG_USERS")
PKG_BASE="$PKG_USERS"
if [[ "$HTTP_PKG" == "404" ]]; then
  HTTP_PKG=$(curl -sS -o /tmp/lab2_pkg.json -w "%{http_code}" "${HDR_AUTH[@]}" "$PKG_ORGS")
  PKG_BASE="$PKG_ORGS"
fi

if [[ "$HTTP_PKG" != "200" ]]; then
  echo "❌ Error: Expected HTTP 200 for package metadata, got ${HTTP_PKG}"
  cat /tmp/lab2_pkg.json 2>/dev/null || true
  exit 1
fi

echo "Step 2: Checking tags (latest + sha-*)..."
HTTP_VER=$(curl -sS -o /tmp/lab2_versions.json -w "%{http_code}" "${HDR_AUTH[@]}" \
  "${PKG_BASE}/versions?per_page=100")

if [[ "$HTTP_VER" != "200" ]]; then
  echo "❌ Error: Expected HTTP 200 for package versions, got ${HTTP_VER}"
  cat /tmp/lab2_versions.json 2>/dev/null || true
  exit 1
fi

if ! jq -e . /tmp/lab2_versions.json >/dev/null 2>&1; then
  echo "❌ Error: Versions response is not valid JSON."
  exit 1
fi

HAS_LATEST=$(jq -r '[.[].metadata.container.tags[]?] | unique | any(. == "latest")' /tmp/lab2_versions.json)
HAS_SHA=$(jq -r '[.[].metadata.container.tags[]?] | unique | any(test("^sha-"))' /tmp/lab2_versions.json)

if [[ "$HAS_LATEST" != "true" ]]; then
  echo "❌ Error: Tag 'latest' not found on any package version."
  jq -r '.[].metadata.container.tags[]?' /tmp/lab2_versions.json 2>/dev/null | sort -u || true
  exit 1
fi

if [[ "$HAS_SHA" != "true" ]]; then
  echo "❌ Error: No tag starting with 'sha-' found."
  jq -r '.[].metadata.container.tags[]?' /tmp/lab2_versions.json 2>/dev/null | sort -u || true
  exit 1
fi

echo "✅ SUCCESS: Lab 2 is passed!"
