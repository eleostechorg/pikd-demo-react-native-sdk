#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/demo-common.sh"
exec node "$PIKD_DEMO_ROOT/tools/run-demo.cjs" ios "$@"
