#!/usr/bin/env bash
# Manual GitHub-only entry point. The existing runner owns preview cleanup,
# the single scheduled dispatch, and fixed allowlisted provider output.
set +x
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" != true ||
      "${GITHUB_EVENT_NAME:-}" != workflow_dispatch ||
      "${GITHUB_REPOSITORY:-}" != mdmoazzam291/Medical_Learning_OS ||
      "${GITHUB_REF:-}" != refs/heads/main ||
      "${GITHUB_RUN_ATTEMPT:-}" != 1 ||
      "${MLOS_CONFIRM_ONE_CASHFREE_GET:-}" != YES_TEST_ONLY ]]; then
  echo 'Refusing: use a fresh manual run on main with YES_TEST_ONLY confirmation.'
  exit 2
fi

# Catch the previous mobile paste failure before Wrangler sees any credential.
# Never echo the rejected input, even if GitHub would mask a stored secret.
if [[ ! "${CLOUDFLARE_API_TOKEN:-}" =~ ^[A-Za-z0-9_-]+$ ||
      ${#CLOUDFLARE_API_TOKEN} -lt 20 ]]; then
  echo 'Refusing: temporary Cloudflare token is missing or has invalid formatting.'
  echo 'Store only its raw value in MLOS_CASHFREE_PROBE_CF_TOKEN; never a curl command.'
  exit 2
fi

bash "$(dirname "${BASH_SOURCE[0]}")/cashfree-probe-once.sh"
