#!/usr/bin/env bash
# card-vision/deploy/install.sh
# Idempotent setup for the card-vision recognizer on the ingest box.
# Run from the card-vision directory:
#   cd "$REPO/card-vision" && bash deploy/install.sh
# Safe to re-run at any time; each step is skipped if already done.
set -euo pipefail

# Always operate from the card-vision directory (parent of this script),
# so the script also works if invoked from elsewhere.
cd "$(cd "$(dirname "$0")/.." && pwd)"

echo "==> card-vision install starting in: $(pwd)"

# 1. Python virtualenv
if [ ! -d .venv ]; then
    echo "==> Creating virtualenv at .venv ..."
    python3 -m venv .venv
else
    echo "==> Virtualenv .venv already exists, skipping creation."
fi

# 2. Python dependencies (idempotent: pip no-ops if already satisfied)
echo "==> Installing Python dependencies (requirements.txt + obsws-python) ..."
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install -r requirements.txt obsws-python

# 3. One-time card index build
if [ ! -f .cache/index.pkl ]; then
    echo "==> No index found (.cache/index.pkl missing) — building card index (this can take a while) ..."
    .venv/bin/python3 build_index.py
    echo "==> Index build complete."
else
    echo "==> Card index already built (.cache/index.pkl exists), skipping."
fi

# 4. Runtime directories
echo "==> Ensuring samples/ and logs/ directories exist ..."
mkdir -p samples logs

echo "==> Done. Next: install the LaunchAgent (see deploy/DEPLOY.md), or run manually with:"
echo "    .venv/bin/python3 live_loop.py --sweep --obs ws://localhost:4455"
