#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CAST_FILE="${REPO_ROOT}/demo.cast"
GIF_FILE="${REPO_ROOT}/demo.gif"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    return 1
  fi
}

ensure_tooling() {
  if require_command asciinema && require_command agg; then
    return 0
  fi

  if require_command brew; then
    echo "Installing missing demo tooling with Homebrew..."
    brew install asciinema agg
  else
    echo "Missing required tools: asciinema and/or agg."
    echo "Install Homebrew, then run: brew install asciinema agg"
    echo "After that, rerun: bash scripts/record_demo_gif.sh"
    exit 1
  fi

  if ! require_command asciinema || ! require_command agg; then
    echo "asciinema and agg must be available on PATH after installation."
    exit 1
  fi
}

if ! require_command node; then
  echo "Node.js is required but was not found on PATH."
  exit 1
fi

if [[ ! -f "${REPO_ROOT}/bin/prism.js" ]]; then
  echo "Expected Prism CLI entrypoint at ${REPO_ROOT}/bin/prism.js"
  exit 1
fi

if [[ ! -f "${REPO_ROOT}/dist/cli/index.js" ]]; then
  echo "Expected built CLI at ${REPO_ROOT}/dist/cli/index.js"
  echo "Run npm install && npm run build, then rerun this script."
  exit 1
fi

ensure_tooling

work_dir="$(mktemp -d)"
runner_script="${work_dir}/demo_runner.sh"
asciinema_config_home="${work_dir}/asciinema-config"
mkdir -p "${asciinema_config_home}"

cleanup() {
  rm -rf "${work_dir}"
}
trap cleanup EXIT

cat > "${runner_script}" <<EOF
#!/usr/bin/env bash
set -euo pipefail

cd "${REPO_ROOT}"
export TERM="\${TERM:-xterm-256color}"
export FORCE_COLOR=1

type_command() {
  local text="\$1"
  local delay="\${2:-0.03}"
  local i

  for ((i = 0; i < \${#text}; i++)); do
    printf "%s" "\${text:i:1}"
    sleep "\${delay}"
  done
}

run_demo_command() {
  local command_text="\$1"

  printf "\$ "
  type_command "\${command_text}" 0.03
  printf "\\n"
  eval "\${command_text}"
}

sleep 0.8
run_demo_command 'node bin/prism.js test "what is the capital of India"'
sleep 1.8
run_demo_command 'node bin/prism.js test "fix this TypeError in my React component"'
sleep 1.8
run_demo_command 'node bin/prism.js test "should I use PostgreSQL or MongoDB"'
sleep 1.8
run_demo_command 'node bin/prism.js domains'
sleep 2.4
EOF

chmod 755 "${runner_script}"

echo "Recording terminal demo to ${CAST_FILE}..."
ASCIINEMA_CONFIG_HOME="${asciinema_config_home}" \
  asciinema rec --overwrite --quiet --cols 100 --rows 28 \
  --command "bash \"${runner_script}\"" \
  "${CAST_FILE}"

echo "Rendering GIF to ${GIF_FILE}..."
agg --theme dracula --font-size 18 --speed 1 \
  --font-family "SF Mono,Menlo,Monaco,Monospace" \
  "${CAST_FILE}" "${GIF_FILE}"

echo "Demo GIF ready: ${GIF_FILE}"
