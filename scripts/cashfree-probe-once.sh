#!/usr/bin/env bash
# Opt-in, one-time GET-only Cashfree TEST verification. No production deployment.
# Runs from an owner-authenticated trusted remote terminal (e.g. Codespaces).
set -euo pipefail

if [[ "${MLOS_CONFIRM_ONE_CASHFREE_GET:-}" != "YES_TEST_ONLY" ]]; then
  echo 'Refusing to start. Set MLOS_CONFIRM_ONE_CASHFREE_GET=YES_TEST_ONLY.'
  exit 2
fi
if [[ ! -f wrangler.cashfree-sandbox.jsonc ]]; then
  echo 'Run this from the Medical_Learning_OS repository root.'
  exit 2
fi
if ! node --input-type=module -e "
import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync('wrangler.cashfree-sandbox.jsonc','utf8'));
if(c.name!=='mlos-cashfree-sandbox' ||
   c.main!=='cloudflare/cashfree-sandbox-worker.js' ||
   c.vars?.CASHFREE_SANDBOX_MODE!=='sandbox' ||
   c.vars?.CASHFREE_SANDBOX_ENABLED!=='false' ||
   c.vars?.CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED!=='false' ||
   c.vars?.CASHFREE_SANDBOX_RUN_MODE!=='disabled' ||
   c.workers_dev!==false || c.preview_urls!==false ||
   c.triggers?.crons?.length!==0 ||
   c.secrets_store_secrets?.length!==2) process.exit(1);
"; then
  echo 'Refusing non-isolated or non-disabled Wrangler configuration.'
  exit 2
fi
for cmd in node npx curl; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing: $cmd"; exit 2; }
done
# Only call the local loopback service, never a public tunnel or Worker route.
if curl --silent --max-time 1 http://127.0.0.1:8787/ >/dev/null 2>&1; then
  echo 'Port 8787 is occupied; stop the other process first.'
  exit 2
fi

umask 077
log_file="$(mktemp)"
response_file="$(mktemp)"
runner_pid=''
cleanup() {
  if [[ -n "$runner_pid" ]]; then
    kill "$runner_pid" 2>/dev/null || true
    wait "$runner_pid" 2>/dev/null || true
  fi
  rm -f "$log_file" "$response_file"
}
trap cleanup EXIT INT TERM

echo 'Starting an ephemeral Cloudflare remote-dev preview, NOT deploying the Worker.'
echo 'Cloudflare TEST secrets stay bound remotely; no key values are entered here.'
# Runtime overrides apply only to this dev session; checked-in defaults stay OFF.
npx --yes wrangler@^4.119.0 dev --remote --test-scheduled \
  -c wrangler.cashfree-sandbox.jsonc --ip 127.0.0.1 --port 8787 \
  --var CASHFREE_SANDBOX_ENABLED:true \
  --var CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED:true \
  --var CASHFREE_SANDBOX_RUN_MODE:auth_probe >"$log_file" 2>&1 &
runner_pid=$!

ready=false
for _ in $(seq 1 75); do
  if ! kill -0 "$runner_pid" 2>/dev/null; then
    echo 'Remote Wrangler session exited. No successful provider test established.'
    echo 'Check Cloudflare device authorization privately. Do not share raw logs.'
    exit 1
  fi
  status="$(curl --silent --max-time 3 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:8787/ || true)"
  if [[ "$status" == '404' ]]; then ready=true; break; fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  echo 'Remote session not ready. Provider authentication remains UNVERIFIED.'
  exit 1
fi

echo 'Requesting exactly one manual scheduled test through localhost.'
status="$(curl --silent --max-time 45 --output "$response_file" --write-out '%{http_code}' \
  'http://127.0.0.1:8787/cdn-cgi/local/scheduled' || true)"
sleep 2
# Only recognize fixed allowlisted status labels from the Cloudflare Worker.
result=''
if [[ "$status" =~ ^2[0-9][0-9]$ ]] && grep -Fq 'cashfree_sandbox_probe' "$log_file" && grep -Fq 'auth_probe_status' "$log_file"; then
  for item in unauthorized forbidden_or_product_restricted not_found_auth_inconclusive \
    bad_request_auth_inconclusive unexpected_plan_found_investigate rate_limited \
    provider_unavailable transport_failed invalid_response other_response_auth_inconclusive; do
    if grep -Fq "$item" "$log_file"; then result="$item"; break; fi
  done
fi
if [[ -n "$result" ]]; then
  printf 'Cashfree TEST response classification: %s\n' "$result"
  echo 'A 404 for a fake plan is INCONCLUSIVE, not accepted Subscriptions credentials.'
else
  printf 'No verified provider result captured. Local test trigger HTTP status: %s\n' "$status"
  echo 'Do NOT infer successful Cashfree authentication.'
fi
echo 'Closing temporary session and erasing its scratch logs. Deployed flags remain OFF.'
