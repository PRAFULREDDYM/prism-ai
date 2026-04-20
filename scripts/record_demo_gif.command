#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "${SCRIPT_DIR}/.."
bash "${SCRIPT_DIR}/record_demo_gif.sh"

echo
read -r -p "Press Return to close this window..." _
