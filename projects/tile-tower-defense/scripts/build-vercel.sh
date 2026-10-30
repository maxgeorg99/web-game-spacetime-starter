#!/usr/bin/env bash
set -euo pipefail
# Install the pinned compiler at build time only; functions publish the resulting JS over HTTP.
curl --fail --silent --show-error --location https://install.spacetimedb.com -o /tmp/install-spacetime.sh
sh /tmp/install-spacetime.sh --yes
export PATH="$HOME/.local/bin:$PATH"
spacetime version install 2.14.0
spacetime version use 2.14.0
(cd spacetimedb && bun install)
spacetime build --module-path spacetimedb
VITE_PROVISIONER_URL=/api/provision bun run build:itch
