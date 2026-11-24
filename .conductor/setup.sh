#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

cd react-app
# `npm ci` installs exactly what the lockfile says and never rewrites it, so
# workspaces don't pick up lockfile churn that then leaks into pull requests.
npm ci
