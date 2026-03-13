#!/usr/bin/env bash
set -euo pipefail

# Bootstrap script for environments where npm isn't available.
# It will download a local npm CLI and run `npm install` using Node.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPM_DIR="$HOME/.local/npm"
NPM_VERSION="10.5.0"
NPM_TARBALL_URL="https://registry.npmjs.org/npm/-/npm-${NPM_VERSION}.tgz"

cd "$ROOT"

if command -v npm >/dev/null 2>&1; then
  echo "npm is available. Installing dependencies..."
  npm install
  exit 0
fi

# Ensure we have Node available
if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed or not on PATH." >&2
  echo "Install Node.js first: https://nodejs.org/" >&2
  exit 1
fi

mkdir -p "$NPM_DIR"
cd "$NPM_DIR"

TARBALL="$NPM_DIR/npm-${NPM_VERSION}.tgz"
if [ ! -f "$TARBALL" ]; then
  echo "Downloading npm ${NPM_VERSION}..."
  curl -fsSL -o "$TARBALL" "$NPM_TARBALL_URL"
fi

if [ ! -d "$NPM_DIR/package" ]; then
  echo "Extracting npm..."
  tar -xzf "$TARBALL" -C "$NPM_DIR"
fi

NODE_NPM="$NPM_DIR/package/bin/npm-cli.js"
if [ ! -f "$NODE_NPM" ]; then
  echo "Error: expected npm CLI at $NODE_NPM" >&2
  exit 1
fi

echo "Installing dependencies using local npm..."
node "$NODE_NPM" install

echo "✅ Dependencies installed. Run 'node bin/cli.js' to run the tool."