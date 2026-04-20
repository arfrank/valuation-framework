#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
cd react-app

# Conductor assigns a unique port per workspace via $CONDUCTOR_PORT so multiple
# workspaces can run side-by-side without fighting over Vite's default 5173.
# Fall back to Vite's default when run outside Conductor.
PORT="${CONDUCTOR_PORT:-5173}"

exec npm run dev -- --port "$PORT" --strictPort --host
