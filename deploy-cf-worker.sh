#!/usr/bin/env bash
# deploy-cf-worker.sh — Deploy CloudScale Uptime Worker to Cloudflare
# Reads CF credentials from ~/.cf-credentials and WP token from the Pi server.
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEO_TESTS_DIR="/Users/cp363412/Desktop/github/wordpress-seo-ai-optimizer/tests"
PI_KEY="/Users/cp363412/Desktop/github/pi-monitor/deploy/pi_key"
CONTAINER="pi_wordpress"
WP_PATH="/var/www/html"
WP_CLI="php ${WP_PATH}/wp-cli.phar --allow-root"
CTRL_SOCK="/tmp/cf-worker-$$"

# Load CF credentials
CF_CREDS="${HOME}/Desktop/github/.cf-credentials"
[[ -f "$CF_CREDS" ]] || { echo "ERROR: ${CF_CREDS} not found."; exit 1; }
source "$CF_CREDS"

# Load WP base URL
[[ -f "$SEO_TESTS_DIR/.env" ]] || { echo "ERROR: SEO .env not found."; exit 1; }
WP_BASE_URL=$(grep '^WP_BASE_URL=' "$SEO_TESTS_DIR/.env" | cut -d'=' -f2- | tr -d '\r')

# SSH helper
if nc -z -w2 andrew-pi-5.local 22 2>/dev/null; then
    PI_HOST="pi@andrew-pi-5.local"
    pi_ssh() { ssh -i "${PI_KEY}" -o StrictHostKeyChecking=no -o LogLevel=ERROR -o ControlMaster=auto -o ControlPath="${CTRL_SOCK}" -o ControlPersist=yes "${PI_HOST}" "$@"; }
    echo "Network: home — direct SSH"
else
    PI_HOST="pi@ssh.andrewbaker.ninja"
    pi_ssh() { ssh -i "${HOME}/.cloudflared/pi-service-key" -o "ProxyCommand=${HOME}/.cloudflared/cf-ssh-proxy.sh" -o StrictHostKeyChecking=no -o LogLevel=ERROR -o ControlMaster=auto -o ControlPath="${CTRL_SOCK}" -o ControlPersist=yes "${PI_HOST}" "$@"; }
    echo "Network: remote — Cloudflare tunnel"
fi

run_wp_php() { pi_ssh "docker exec -i ${CONTAINER} ${WP_CLI} eval-file - --path=${WP_PATH}"; }
close_ssh()  { ssh -i "${PI_KEY}" -o ControlPath="${CTRL_SOCK}" -o LogLevel=ERROR -O exit "${PI_HOST}" 2>/dev/null || true; }
trap close_ssh EXIT

echo "--- Connecting to Pi..."
pi_ssh "echo 'OK'"

# Read WP options: token, readiness slug, ntfy URL
echo "--- Reading WordPress options..."
WP_CONFIG=$(printf '<?php
$token     = get_option("csdt_uptime_token", "");
$slug      = get_option("csdt_readiness_slug", "");
$ntfy      = get_option("csdt_uptime_ntfy_url", get_option("csdt_scan_schedule_ntfy_url", ""));
if ($token === "") {
    $token = bin2hex(random_bytes(24));
    update_option("csdt_uptime_token", $token, false);
    echo "NEW_TOKEN\n";
}
$ready = rest_url("csdt/v1/ready" . ($slug ? "/" . $slug : ""));
echo json_encode(compact("token", "slug", "ntfy", "ready"));
' | run_wp_php)

# Extract last JSON line (WP-CLI may output perf logs first)
JSON_LINE=$(echo "$WP_CONFIG" | grep '^{' | tail -1)
if [[ -z "$JSON_LINE" ]]; then
    echo "ERROR: Could not read WP options."
    echo "Raw output: $WP_CONFIG"
    exit 1
fi

PING_TOKEN=$(echo "$JSON_LINE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['token'])")
READY_URL=$(echo "$JSON_LINE"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['ready'])")
NTFY_URL=$(echo "$JSON_LINE"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['ntfy'])")
SITE_URL="${WP_BASE_URL}"
PING_URL="${WP_BASE_URL}/wp-admin/admin-ajax.php"

echo "  Site URL  : ${SITE_URL}"
echo "  Ping URL  : ${PING_URL}"
echo "  Ready URL : ${READY_URL}"
echo "  Ntfy URL  : ${NTFY_URL:-<none>}"
echo "  Token     : ${PING_TOKEN:0:8}…"

# Resolve CF account ID from zone
echo ""
echo "--- Resolving Cloudflare account ID from zone ${CF_ZONE_ID}..."
ZONE_RESP=$(curl -s \
    -H "X-Auth-Email: ${CF_EMAIL}" \
    -H "X-Auth-Key: ${CF_KEY}" \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}")
CF_ACCOUNT_ID=$(echo "$ZONE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['account']['id'])" 2>/dev/null || echo "")
if [[ -z "$CF_ACCOUNT_ID" ]]; then
    echo "ERROR: Could not resolve account ID."
    echo "$ZONE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('errors',''))" 2>/dev/null
    exit 1
fi
echo "  Account ID: ${CF_ACCOUNT_ID}"

# Build multipart payload to deploy worker
WORKER_JS="${PLUGIN_DIR}/worker.js"
[[ -f "$WORKER_JS" ]] || { echo "ERROR: worker.js not found at ${WORKER_JS}"; exit 1; }

BOUNDARY="CSDTBnd$(openssl rand -hex 6)"
METADATA=$(python3 -c "
import json
print(json.dumps({
    'main_module': 'worker.js',
    'compatibility_date': '2024-11-01',
    'bindings': [
        {'type': 'plain_text', 'name': 'SITE_URL',   'text': '${SITE_URL}'},
        {'type': 'plain_text', 'name': 'PING_URL',   'text': '${PING_URL}'},
        {'type': 'plain_text', 'name': 'READY_URL',  'text': '${READY_URL}'},
        {'type': 'plain_text', 'name': 'PING_TOKEN', 'text': '${PING_TOKEN}'},
        {'type': 'plain_text', 'name': 'NTFY_URL',   'text': '${NTFY_URL}'},
    ]
}))
")

echo ""
echo "--- Deploying Worker (cloudscale-uptime) to Cloudflare account ${CF_ACCOUNT_ID}..."
DEPLOY_RESP=$(curl -s -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/cloudscale-uptime" \
    -H "X-Auth-Email: ${CF_EMAIL}" \
    -H "X-Auth-Key: ${CF_KEY}" \
    -F "metadata=${METADATA};type=application/json" \
    -F "worker.js=@${WORKER_JS};type=application/javascript+module")

SUCCESS=$(echo "$DEPLOY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)
if [[ "$SUCCESS" != "True" ]]; then
    echo "ERROR: Worker deploy failed."
    echo "$DEPLOY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('errors',''))" 2>/dev/null
    exit 1
fi
echo "  Worker deployed successfully."

# Set cron trigger (* * * * *)
echo ""
echo "--- Setting cron trigger (* * * * *)..."
CRON_RESP=$(curl -s -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/cloudscale-uptime/schedules" \
    -H "X-Auth-Email: ${CF_EMAIL}" \
    -H "X-Auth-Key: ${CF_KEY}" \
    -H "Content-Type: application/json" \
    -d '[{"cron": "* * * * *"}]')

CRON_OK=$(echo "$CRON_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)
if [[ "$CRON_OK" == "True" ]]; then
    echo "  Cron trigger set: * * * * *"
else
    echo "  WARNING: Cron trigger may not have been set — check CF dashboard."
    echo "$CRON_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('errors',''))" 2>/dev/null
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo " CloudScale Uptime Worker deployed."
echo " Worker URL: https://cloudscale-uptime.${CF_ACCOUNT_ID:0:8}...workers.dev"
echo " Probing:    ${READY_URL}"
echo " Alerting:   ${NTFY_URL:-<none>}"
echo "════════════════════════════════════════════════════════"
