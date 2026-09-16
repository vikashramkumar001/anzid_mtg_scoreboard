#!/usr/bin/env bash
# Update a production clone (the ingest box) in place, in one go:
#   1. fetch + fast-forward the deploy branch, keeping the box's own data files
#   2. npm install when the package files changed (or node_modules is missing)
#   3. load the committed deck-library manifest (optionally pruning first)
#   4. start the server if nothing is listening on the port
#
#   bash scripts/deploy/update-ingest.sh [--repo DIR] [--branch NAME] [--port N]
#        [--prune "Vex,Reksai,Lillia,Ornn,Azir,Jayce"] [--no-start] [--dry-run]
#
# Bootstrap from a clone that does not have this script yet:
#   git fetch origin 20260330---dsg+fly \
#     && git show origin/20260330---dsg+fly:scripts/deploy/update-ingest.sh > /tmp/update-ingest.sh \
#     && bash /tmp/update-ingest.sh --prune Vex,Reksai,Lillia,Ornn,Azir,Jayce
#
# Data files the running server writes (data/deckLibrary.json, OBS presets,
# metagame caches) are tracked in git, so a plain `git pull` on a box that has
# been running shows refuses to merge, or worse, loses the operator's edits.
# This script stashes local changes around the fast-forward and, on conflict,
# keeps the box's copy of anything under data/ and upstream's copy of code.
#
# --prune is a one-off: it deletes every library deck whose legend is not in
# the list BEFORE the manifest is loaded. Do not pass it on routine updates or
# it will delete the decks the manifest added last time.
#
# Runs on macOS bash 3.2 (no associative arrays, no mapfile). With --dry-run
# nothing is changed: it reports what would happen.
set -euo pipefail

REPO=""
BRANCH="20260330---dsg+fly"
PORT="1378"
PRUNE=""
START=1
DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --prune) PRUNE="$2"; shift 2 ;;
    --no-start) START=0; shift ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

say() { printf '\n== %s\n' "$*"; }
run() { if [ "$DRY" = 1 ]; then echo "  (dry) $*"; else "$@"; fi; }

# ---- locate the repo -------------------------------------------------------
if [ -z "$REPO" ]; then
  for candidate in "$PWD" "$HOME/Desktop/coverage hub" "$HOME/Desktop/coverage hub/anzid_mtg_scoreboard" "$HOME/Desktop/dev/coverage hub/anzid_mtg_scoreboard"; do
    if [ -f "$candidate/server.js" ] && [ -d "$candidate/.git" ]; then REPO="$candidate"; break; fi
  done
fi
if [ -z "$REPO" ] || [ ! -f "$REPO/server.js" ]; then
  echo "could not find the coverage-hub repo (pass --repo DIR)" >&2; exit 1
fi
cd "$REPO"
say "repo: $REPO"

# ---- node on PATH (ssh sessions do not load nvm) ---------------------------
if ! command -v node >/dev/null 2>&1; then
  set +u
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
  set -u
  export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/.volta/bin"
fi
command -v node >/dev/null 2>&1 || { echo "node is not on PATH" >&2; exit 1; }
echo "node $(node -v), npm $(npm -v)"
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "node 18+ is required (the server and the library scripts use the built-in fetch); found $(node -v)" >&2; exit 1
fi

listening() { lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; }

# ---- 1. fetch + fast-forward ------------------------------------------------
say "git: fetch origin/$BRANCH"
CUR="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CUR" != "$BRANCH" ]; then
  echo "checked out '$CUR' but the deploy branch is '$BRANCH' — refusing to switch branches for you" >&2; exit 1
fi
git fetch --quiet origin "$BRANCH"
OLD="$(git rev-parse HEAD)"
NEW="$(git rev-parse "origin/$BRANCH")"
if [ "$OLD" = "$NEW" ]; then
  echo "already at $(git log -1 --format='%h %s')"
else
  echo "$(git rev-list --count "$OLD".."$NEW") new commit(s):"
  git log --format='  %h %ad %s' --date=short "$OLD".."$NEW" | head -40
  if ! git merge-base --is-ancestor "$OLD" "$NEW"; then
    echo "local branch has commits that are not on origin/$BRANCH — cannot fast-forward; resolve by hand" >&2; exit 1
  fi

  STAMP="$(date +%Y%m%d-%H%M%S)"
  BK="logs/deploy-backups/$STAMP"
  run mkdir -p "$BK"
  # The library is the file most likely to hold box-only state; keep a copy
  # regardless of how the merge goes.
  if [ -f data/deckLibrary.json ]; then run cp data/deckLibrary.json "$BK/deckLibrary.json"; fi

  # Untracked files that upstream now adds would abort the merge: move them
  # aside (they are restored below where that is the right thing).
  git diff --name-only --diff-filter=A "$OLD" "$NEW" > "/tmp/update-ingest-added.$$"
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    if [ -e "$p" ] && ! git ls-files --error-unmatch -- "$p" >/dev/null 2>&1; then
      echo "  untracked here, added upstream — moving aside: $p"
      run mkdir -p "$BK/$(dirname "$p")"
      run mv "$p" "$BK/$p"
    fi
  done < "/tmp/update-ingest-added.$$"
  rm -f "/tmp/update-ingest-added.$$"

  STASHED=0
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "  local changes to tracked files (stashing around the update):"
    git status --porcelain --untracked-files=no | sed 's/^/    /' | head -30
    if [ "$DRY" = 0 ]; then git stash push --quiet -m "update-ingest $STAMP"; STASHED=1; fi
  fi

  if [ "$DRY" = 1 ]; then
    echo "  (dry) git merge --ff-only origin/$BRANCH"
  else
    git merge --ff-only --quiet "origin/$BRANCH"
    echo "  now at $(git log -1 --format='%h %s')"
    if [ "$STASHED" = 1 ]; then
      if git stash pop --quiet 2>/dev/null; then
        echo "  local changes re-applied cleanly"
      else
        echo "  local changes conflict with the update — resolving:"
        git diff --name-only --diff-filter=U > "/tmp/update-ingest-conflicts.$$"
        while IFS= read -r p; do
          [ -n "$p" ] || continue
          case "$p" in
            data/*) git checkout --theirs -- "$p" 2>/dev/null || true; echo "    $p -> kept the box's copy" ;;
            *)      git checkout --ours -- "$p" 2>/dev/null || true;   echo "    $p -> took upstream" ;;
          esac
        done < "/tmp/update-ingest-conflicts.$$"
        rm -f "/tmp/update-ingest-conflicts.$$"
        git reset --quiet
        git stash drop --quiet
      fi
    fi
    # A library that was untracked here but is tracked upstream: the box's
    # copy is the real one (upstream ships it empty).
    if [ -f "$BK/data/deckLibrary.json" ] && [ -f "$BK/deckLibrary.json" ]; then
      cp "$BK/deckLibrary.json" data/deckLibrary.json
      echo "  restored the box's data/deckLibrary.json over the pulled copy"
    fi
  fi
fi

# ---- 2. npm install ---------------------------------------------------------
say "npm"
NEED_INSTALL=0
[ -d node_modules ] || NEED_INSTALL=1
if [ "$OLD" != "$NEW" ] && git diff --name-only "$OLD" "$NEW" | grep -q '^package'; then NEED_INSTALL=1; fi
if [ "$NEED_INSTALL" = 0 ] && ! npm ls --depth=0 >/dev/null 2>&1; then NEED_INSTALL=1; echo "  npm ls reports missing packages"; fi
if [ "$NEED_INSTALL" = 1 ]; then run npm install --no-audit --no-fund; else echo "  dependencies unchanged — skipping"; fi

# ---- 3. deck library ---------------------------------------------------------
say "deck library"
MANIFEST="data/riftbound/deck-library-imports/manifest.json"
if listening; then
  echo "  server is listening on :$PORT — using its socket API (no restart)"
  # prune's own --dry-run only reads, so it is safe to run for real in dry mode
  if [ -n "$PRUNE" ]; then node scripts/riftbound/prune-deck-library.mjs --host "http://127.0.0.1:$PORT" --keep "$PRUNE" $([ "$DRY" = 1 ] && echo --dry-run); fi
  if [ -f "$MANIFEST" ]; then
    if [ "$DRY" = 1 ]; then echo "  (dry) node scripts/riftbound/add-deck-to-library.mjs --manifest $MANIFEST"; else node scripts/riftbound/add-deck-to-library.mjs --host "http://127.0.0.1:$PORT" --manifest "$MANIFEST"; fi
  else echo "  no manifest at $MANIFEST"; fi
else
  echo "  no server on :$PORT — editing data/deckLibrary.json directly"
  if [ -f "$MANIFEST" ] || [ -n "$PRUNE" ]; then
    node scripts/riftbound/deck-library-file.mjs ${PRUNE:+--keep "$PRUNE"} ${MANIFEST:+--manifest "$MANIFEST"} $([ "$DRY" = 1 ] && echo --dry-run)
  fi
fi

# ---- 4. server ----------------------------------------------------------------
say "server"
if listening; then
  echo "  a server is already listening on :$PORT — NOT restarted. Code changes need a restart when you are off air."
elif [ "$START" = 1 ]; then
  if [ "$DRY" = 1 ]; then
    echo "  (dry) would start: nohup node server.js >> logs/server.log"
  else
    mkdir -p logs
    nohup node server.js >> logs/server.log 2>&1 < /dev/null &
    disown || true
    for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
      if listening; then break; fi
      sleep 1
    done
    if listening; then
      echo "  server is up on :$PORT (pid $(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t | head -1)); logs: $REPO/logs/server.log"
      echo "  stop it with: kill \$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t)"
    else
      echo "  server did NOT come up — last log lines:"; tail -20 logs/server.log
      exit 1
    fi
  fi
else
  echo "  --no-start given; start with: npm start"
fi

# ---- summary -----------------------------------------------------------------
say "summary"
echo "  HEAD: $(git log -1 --format='%h %ad %s' --date=short)"
if [ -f .env ]; then
  grep -q '^PILTOVER_API_KEY=' .env && echo "  .env: PILTOVER_API_KEY present" || echo "  .env: PILTOVER_API_KEY missing (Piltover link import will not work here)"
else
  echo "  .env: MISSING"
fi
if [ -f data/deckLibrary.json ]; then
  node -e '
    const lib = JSON.parse(require("fs").readFileSync("data/deckLibrary.json", "utf8"));
    const decks = Array.isArray(lib.decks) ? lib.decks : [];
    console.log(`  deck library: ${decks.length} entries`);
    for (const d of decks) console.log(`    ${d.legend}  —  ${d.label || d.link || ""}`);
  '
fi
