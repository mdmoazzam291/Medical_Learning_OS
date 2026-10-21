#!/usr/bin/env bash
set -euo pipefail
# Official age 1.3.2 linux/amd64 release; digest from its GitHub release asset.
: "${RUNNER_TEMP:?}" "${GITHUB_ENV:?}" "${GITHUB_PATH:?}"
target="$RUNNER_TEMP/mlos-age"
mkdir -p "$target"
curl --fail --silent --show-error --location --max-time 120 \
  https://github.com/FiloSottile/age/releases/download/v1.3.2/age-v1.3.2-linux-amd64.tar.gz \
  --output "$target/release.tar.gz"
echo "cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10  $target/release.tar.gz" | sha256sum --check --status
tar -xzf "$target/release.tar.gz" -C "$target" --strip-components=1 age/age age/age-keygen
rm "$target/release.tar.gz"
echo "$target" >> "$GITHUB_PATH"
echo "AGE_BIN=$target/age" >> "$GITHUB_ENV"
"$target/age" --version
