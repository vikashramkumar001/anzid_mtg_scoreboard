#!/bin/bash
#
# Bootstrap a second Mac to run the broadcast stack. RUN THIS ON THE NEW MAC.
#
# Prereqs on this machine:
#   - the repo cloned and `npm install` run
#   - OBS installed, with the plugins listed in DEPLOY.md, and QUIT
#   - Dev-1's home folder mounted (Finder -> Go -> Connect to Server ->
#     smb://192.168.4.101 -> share "anuraagdas"), which puts it at
#     /Volumes/anuraagdas
#
# Usage:
#   ./scripts/obs/bootstrap-second-mac.sh /Volumes/anuraagdas
#   ./scripts/obs/bootstrap-second-mac.sh /Volumes/MyDrive/dev2   # from a drive
#   ./scripts/obs/bootstrap-second-mac.sh <src> --dry-run
#
# Env:
#   ASSUME_YES=1  move the repo into place without prompting
#   FORCE=1       run even if the repo is in the wrong place (assets land wrong)
#
set -uo pipefail

SRC="${1:-}"
DRY=""
[[ "${2:-}" == "--dry-run" ]] && DRY="--dry-run"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAGE="$SRC/Desktop/dev2-transfer"
OBS_SCENES="$HOME/Library/Application Support/obs-studio/basic/scenes"
SRC_USER="anuraagdas"          # the username baked into every absolute path

bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
ok()    { printf "  \033[32m✓\033[0m %s\n" "$*"; }
warn()  { printf "  \033[33m!\033[0m %s\n" "$*"; }
die()   { printf "  \033[31m✗\033[0m %s\n" "$*"; exit 1; }

[[ -n "$SRC" ]] || die "usage: $0 <source> [--dry-run]
       <source> = Dev-1's mounted home (/Volumes/$SRC_USER) or a drive holding dev2-transfer/"

bold "Bootstrapping $(scutil --get LocalHostName 2>/dev/null || hostname) as a second rig"
[[ -n "$DRY" ]] && warn "DRY RUN — nothing will be written"
echo

# ── 0. preflight ───────────────────────────────────────────────────────────
bold "0. Preflight"
[[ -d "$SRC" ]]   || die "source not found: $SRC   (is Dev-1's share mounted?)"
[[ -d "$STAGE" ]] || die "no dev2-transfer/ under $SRC
       Run 'node scripts/obs/stage-transfer.mjs' on Dev-1 first."
[[ -f "$STAGE/media-files.txt" ]] || die "missing $STAGE/media-files.txt"
ok "source: $SRC"

COLLECTION="$(ls "$STAGE"/*.json 2>/dev/null | head -1)"
[[ -n "$COLLECTION" ]] || die "no collection .json in $STAGE"
ok "collection: $(basename "$COLLECTION")"

if pgrep -x OBS >/dev/null; then
  die "OBS is running — quit it first, or it will overwrite the imported collection on exit."
fi
ok "OBS not running"

command -v node >/dev/null || die "node not found"
ok "node $(node -v)"

FILE_COUNT=$(wc -l < "$STAGE/media-files.txt" | tr -d ' ')
ok "$FILE_COUNT entries to copy"

# The staged list is relative to the SOURCE home, so the repo's gitignored
# assets are addressed as "Desktop/dev/coverage hub/anzid_mtg_scoreboard/...".
# If this repo lives somewhere else, those files rsync into a phantom
# directory and the real repo never gets them — so check BEFORE copying.
EXPECTED="$HOME/Desktop/dev/coverage hub/anzid_mtg_scoreboard"
if [[ "$REPO" == "$EXPECTED" ]]; then
  ok "repo is where the collection expects it"
elif [[ "${FORCE:-}" == "1" ]]; then
  warn "repo is at $REPO, not $EXPECTED — continuing because FORCE=1"
  warn "gitignored assets will land in $EXPECTED, not in this repo"
else
  echo
  warn "This repo is not where the scene collection expects it."
  echo "       this repo:  $REPO"
  echo "       expected:   $EXPECTED"
  echo
  echo "   Left as-is, two things break:"
  echo "     1. The gitignored assets (.env, restream-config.js, ~3.7 GB of"
  echo "        animations) would land in the expected path, not in this repo."
  echo "     2. Two OBS sources point inside the repo by absolute path and"
  echo "        would stay broken."
  echo

  if [[ -e "$EXPECTED" ]]; then
    die "Something already exists at $EXPECTED — move or remove it, then re-run."
  fi

  MOVE=""
  if [[ -n "$DRY" ]]; then
    ok "would offer to move the repo to $EXPECTED"
  elif [[ "${ASSUME_YES:-}" == "1" ]]; then
    ok "ASSUME_YES=1 — moving without asking"
    MOVE=1
  elif [[ -t 0 ]]; then
    read -r -p "   Move the repo there now? [y/N] " ans
    [[ "$ans" =~ ^[Yy]$ ]] && MOVE=1
  else
    die "Not an interactive terminal, so I can't ask. Move it yourself:
         mkdir -p ~/Desktop/dev/\"coverage hub\"
         mv \"$REPO\" ~/Desktop/dev/\"coverage hub\"/
       then re-run from there. Or set FORCE=1 to proceed anyway."
  fi

  if [[ -n "$MOVE" ]]; then
    mkdir -p "$(dirname "$EXPECTED")" || die "could not create $(dirname "$EXPECTED")"
    mv "$REPO" "$EXPECTED" || die "move failed"
    ok "moved to $EXPECTED"
    echo
    echo "   Re-running from the new location..."
    echo
    cd "$EXPECTED" || die "could not enter $EXPECTED"
    exec "$EXPECTED/scripts/obs/bootstrap-second-mac.sh" "$@"
  elif [[ -z "$DRY" ]]; then
    die "Nothing moved, nothing copied. Re-run once the repo is at:
         $EXPECTED
       Or set FORCE=1 to proceed anyway and fix the assets by hand."
  fi
fi
echo

# ── 1. media + gitignored assets ───────────────────────────────────────────
bold "1. Copying media and gitignored assets"
echo "   $SRC  ->  $HOME"
rsync -avh $DRY --files-from="$STAGE/media-files.txt" "$SRC/" "$HOME/" \
  || die "rsync failed"
ok "copy complete"
echo

# ── 2. OBS scene collection ────────────────────────────────────────────────
bold "2. Installing the OBS scene collection"
if [[ -z "$DRY" ]]; then
  mkdir -p "$OBS_SCENES"
  DEST="$OBS_SCENES/$(basename "$COLLECTION")"
  if [[ -f "$DEST" ]]; then
    BK="$DEST.pre-bootstrap-$(date +%Y%m%d-%H%M%S).bak"
    cp "$DEST" "$BK"
    warn "existing collection backed up to $(basename "$BK")"
  fi
  cp "$COLLECTION" "$DEST"
  ok "installed to $OBS_SCENES/"
else
  ok "would install $(basename "$COLLECTION") to $OBS_SCENES/"
fi
echo "   It appears under OBS -> Scene Collection once you launch OBS."
echo

# ── 3. username symlink ────────────────────────────────────────────────────
bold "3. Making /Users/$SRC_USER resolve to this machine's home"
if [[ "$(whoami)" == "$SRC_USER" ]]; then
  ok "usernames already match — no symlink needed"
elif [[ -e "/Users/$SRC_USER" ]]; then
  if [[ -L "/Users/$SRC_USER" ]]; then
    ok "symlink already present -> $(readlink "/Users/$SRC_USER")"
  else
    warn "/Users/$SRC_USER exists and is NOT a symlink — leaving it alone."
    warn "Check it by hand; the media paths may not resolve."
  fi
elif [[ -n "$DRY" ]]; then
  ok "would run: sudo ln -s $HOME /Users/$SRC_USER"
else
  echo "   Every media path is absolute under /Users/$SRC_USER/."
  echo "   This needs admin rights — macOS will ask for your password."
  if sudo ln -s "$HOME" "/Users/$SRC_USER"; then
    ok "symlink created: /Users/$SRC_USER -> $HOME"
  else
    warn "symlink not created. Media paths will NOT resolve until it exists."
    warn "Run manually:  sudo ln -s $HOME /Users/$SRC_USER"
  fi
fi
echo

# ── 5. verify ──────────────────────────────────────────────────────────────
bold "4. Verifying"
if [[ -n "$DRY" ]]; then
  ok "would run: node scripts/obs/verify-machine.mjs"
else
  node "$REPO/scripts/obs/verify-machine.mjs" || true
fi

echo
bold "Remaining, by hand:"
echo "  - Launch OBS and pick the collection under Scene Collection"
echo "  - Enable Tools -> WebSocket Server Settings (port 4455) if not already"
echo "  - Install any plugins verify-machine.mjs reported missing, then re-run it"
echo "  - Start the server (node server.js) before checking browser sources"
