#!/usr/bin/env bash
# Shared runner setup. Only the ignored local file may contain machine defaults.
PIKD_DEMO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$PIKD_DEMO_ROOT/scripts/local-env.sh" ]; then
  source "$PIKD_DEMO_ROOT/scripts/local-env.sh"
fi
export PIKD_DIAGNOSTICS="${PIKD_DIAGNOSTICS:-}"
export PIKD_DEMO_COLLECT_RADIUS_M="${PIKD_DEMO_COLLECT_RADIUS_M:-}"
export PIKD_DEMO_CONFIG="${PIKD_DEMO_CONFIG:-${PIKD_CONFIG_FILE:-$PIKD_DEMO_ROOT/config/pikd.local.json}}"
