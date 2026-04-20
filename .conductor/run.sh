#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

cd react-app
exec npm run dev
