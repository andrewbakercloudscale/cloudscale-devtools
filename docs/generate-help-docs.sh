#!/usr/bin/env bash
set -euo pipefail

PLUGIN_REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_LABEL="CloudScale Cyber and Devtools"

source /Users/cp363412/Desktop/github/shared-help-docs/help-runner.sh

echo "--- Disabling CS Monitor for screenshots..."
run_wp "option update csdt_devtools_perf_monitor_enabled 0 --path=${WP_PATH}"

echo "--- Masking sensitive settings for screenshots..."
# Capture only the last non-empty, non-PERF line as the slug value
_orig_slug="$(run_wp "option get csdt_devtools_login_slug --path=${WP_PATH}" 2>/dev/null \
  | grep -v '^\[' | grep -v '^$' | tail -1 || true)"
run_wp "option update csdt_devtools_login_slug my-secret-login --path=${WP_PATH}" 2>/dev/null || true

# Use a cleanup function so variables expand correctly at execution time
_cleanup() {
  echo "--- Re-enabling CS Monitor..."
  run_wp "option update csdt_devtools_perf_monitor_enabled 1 --path=${WP_PATH}" 2>/dev/null || true
  echo "--- Restoring login slug (${_orig_slug})..."
  if [ -n "${_orig_slug}" ]; then
    run_wp "option update csdt_devtools_login_slug ${_orig_slug} --path=${WP_PATH}" 2>/dev/null || true
    echo "    Done — login slug restored to: ${_orig_slug}"
  fi
}
trap _cleanup EXIT

run_help_docs "${PLUGIN_REPO_DIR}/docs/generate-help-docs.js"
