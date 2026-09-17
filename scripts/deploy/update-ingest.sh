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
# This script stashes local changes around the fast-forward and afterwards
# puts the box's copy of every stashed data/ file back, whatever the merge
# did; code files take upstream on conflict. If the stash cannot be re-applied
# it is LEFT IN PLACE and the script stops, so nothing is ever dropped silently.
#
# --prune is a one-off: it deletes every library deck whose legend is not in
# the list BEFORE the manifest is loaded. Do not pass it on routine updates or
# it will delete the decks the manifest added last time. A copy of the library
# is taken before it runs (logs/deploy-backups/<stamp>/deckLibrary.json).
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
    -h|--help) sed -n '2,34p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
DRYFLAG=""
if [ "$DRY" = 1 ]; then DRYFLAG="--dry-run"; fi

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

STAMP="$(date +%Y%m%d-%H%M%S)"
BK="logs/deploy-backups/$STAMP"
TMP="/tmp/update-ingest.$$"
mkdir -p "$TMP"
cleanup_tmp() { rm -rf "$TMP"; }

# ---- node on PATH (ssh sessions do not load nvm) ---------------------------
if ! command -v node >/dev/null 2>&1; then
  set +u
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
  set -u
  export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/.volta/bin"
fi
command -v node >/dev/null 2>&1 || { echo "node is not on PATH" >&2; cleanup_tmp; exit 1; }
echo "node $(node -v), npm $(npm -v)"
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "node 18+ is required (the server and the library scripts use the built-in fetch); found $(node -v)" >&2; cleanup_tmp; exit 1
fi

listening() { lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; }

# ---- 1. fetch + fast-forward ------------------------------------------------
say "git: fetch origin/$BRANCH"
CUR="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CUR" != "$BRANCH" ]; then
  echo "checked out '$CUR' but the deploy branch is '$BRANCH' — refusing to switch branches for you" >&2; cleanup_tmp; exit 1
fi
# A stash left by an earlier run that stopped part-way holds the box's data
# edits. Refuse to pile another on top; the operator decides what to do.
OLDSTASH="$(git stash list || true)"
case "$OLDSTASH" in
  *update-ingest*)
    echo "a stash from an earlier run is still present — inspect it before updating again:" >&2
    printf '%s\n' "$OLDSTASH" | sed 's/^/    /' >&2
    echo "  git stash pop        # put those changes back, or" >&2
    echo "  git stash drop       # discard them" >&2
    cleanup_tmp; exit 1 ;;
esac
git fetch --quiet origin "$BRANCH"
OLD="$(git rev-parse HEAD)"
NEW="$(git rev-parse "origin/$BRANCH")"

STASHED=0
STASH_DONE=0
KEEP_STASH=0
# Runs on any exit while the box's changes are still in the stash: put them
# back if the tree is clean (the merge did not happen), otherwise say where
# they are. Never drops anything.
on_exit() {
  status=$?
  if [ "$STASHED" = 1 ] && [ "$STASH_DONE" = 0 ]; then
    if [ "$KEEP_STASH" = 0 ] && [ -z "$(git status --porcelain --untracked-files=no || true)" ] && git stash pop --quiet 2>/dev/null; then
      echo "  update stopped early — the box's local changes were put back" >&2
    else
      echo "  update stopped early — the box's local changes are kept in: $(git stash list | sed -n '1p')" >&2
      echo "  restore them with: git stash pop" >&2
    fi
  fi
  cleanup_tmp
  exit "$status"
}
trap on_exit EXIT

if [ "$OLD" = "$NEW" ]; then
  echo "already at $(git log -1 --format='%h %s')"
else
  echo "$(git rev-list --count "$OLD".."$NEW") new commit(s):"
  git log --max-count=40 --format='  %h %ad %s' --date=short "$OLD".."$NEW"
  if ! git merge-base --is-ancestor "$OLD" "$NEW"; then
    echo "local branch has commits that are not on origin/$BRANCH — cannot fast-forward; resolve by hand" >&2; exit 1
  fi

  run mkdir -p "$BK"

  # Untracked files that upstream now adds (or renames/copies onto) would
  # abort the merge: move them aside. The deck library gets restored below;
  # anything else stays in the backup folder.
  git diff --name-status --diff-filter=ARC "$OLD" "$NEW" | awk -F'\t' '{print $NF}' > "$TMP/added"
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    if [ -e "$p" ] && ! git ls-files --error-unmatch -- "$p" >/dev/null 2>&1; then
      echo "  untracked here, added upstream — moving aside: $p"
      run mkdir -p "$BK/$(dirname "$p")"
      run mv "$p" "$BK/$p"
    fi
  done < "$TMP/added"

  ST="$(git status --porcelain --untracked-files=no || true)"
  if [ -n "$ST" ]; then
    echo "  local changes to tracked files (carried across the update):"
    printf '%s\n' "$ST" | sed -n '1,30p' | sed 's/^/    /'
    if [ "$DRY" = 0 ]; then
      git stash push --quiet -m "update-ingest $STAMP"
      STASHED=1
      git stash show --name-only "stash@{0}" > "$TMP/stashed" || true
    fi
  fi

  if [ "$DRY" = 1 ]; then
    echo "  (dry) git merge --ff-only origin/$BRANCH"
  else
    git merge --ff-only --quiet "origin/$BRANCH"
    echo "  now at $(git log -1 --format='%h %s')"
    # Test hook: lets a harness dirty the tree between the merge and the
    # re-apply, the window a running server's writes can land in.
    if [ -n "${UPDATE_INGEST_HOOK_AFTER_MERGE:-}" ]; then eval "$UPDATE_INGEST_HOOK_AFTER_MERGE"; fi

    if [ "$STASHED" = 1 ]; then
      if git stash apply --quiet "stash@{0}" 2>"$TMP/apply.err"; then
        echo "  local changes re-applied"
      else
        git diff --name-only --diff-filter=U > "$TMP/unmerged" || true
        if [ ! -s "$TMP/unmerged" ]; then
          # Not a conflict: git refused to touch the tree (typically a file
          # written by a running server since the stash). Leave the stash.
          KEEP_STASH=1
          echo "  could not re-apply the box's local changes:" >&2
          sed 's/^/    /' "$TMP/apply.err" >&2
          exit 1
        fi
        echo "  local changes conflict with the update — resolving:"
        while IFS= read -r p; do
          [ -n "$p" ] || continue
          case "$p" in
            data/*) git checkout --theirs -- "$p" 2>/dev/null || true; echo "    $p -> kept the box's copy" ;;
            *)      git checkout --ours -- "$p" 2>/dev/null || true;   echo "    $p -> took upstream" ;;
          esac
        done < "$TMP/unmerged"
        git reset --quiet
      fi
      # The box's copy wins for every stashed data/ file, whatever the merge
      # made of it (a clean 3-way merge can otherwise splice upstream hunks
      # into a file the server owns).
      while IFS= read -r p; do
        [ -n "$p" ] || continue
        case "$p" in
          data/*) git checkout "stash@{0}" -- "$p" 2>/dev/null && git reset --quiet -- "$p" 2>/dev/null || true ;;
        esac
      done < "$TMP/stashed"
      git stash drop --quiet
      STASH_DONE=1
    fi
    # A library that was untracked here but is tracked upstream: the box's
    # copy is the real one (upstream ships it empty).
    if [ -f "$BK/data/deckLibrary.json" ]; then
      cp "$BK/data/deckLibrary.json" data/deckLibrary.json
      echo "  restored the box's data/deckLibrary.json over the pulled copy"
    fi
  fi
fi

# ---- 2. npm install ---------------------------------------------------------
say "npm"
NEED_INSTALL=0
[ -d node_modules ] || NEED_INSTALL=1
if [ "$OLD" != "$NEW" ] && ! git diff --quiet "$OLD" "$NEW" -- package.json package-lock.json; then NEED_INSTALL=1; fi
if [ "$NEED_INSTALL" = 0 ] && ! npm ls --depth=0 >/dev/null 2>&1; then NEED_INSTALL=1; echo "  npm ls reports missing packages"; fi
if [ "$NEED_INSTALL" = 1 ]; then run npm install --no-audit --no-fund; else echo "  dependencies unchanged — skipping"; fi

# ---- 3. deck library ---------------------------------------------------------
say "deck library"
MANIFEST="data/riftbound/deck-library-imports/manifest.json"
HELPERS_OK=1
for s in scripts/riftbound/deck-library-file.mjs scripts/riftbound/add-deck-to-library.mjs scripts/riftbound/prune-deck-library.mjs; do
  [ -f "$s" ] || HELPERS_OK=0
done
# Copy the library before anything touches it, whether or not the merge ran.
if [ -f data/deckLibrary.json ] && [ "$DRY" = 0 ]; then
  mkdir -p "$BK"
  cp data/deckLibrary.json "$BK/deckLibrary.json"
  echo "  library backed up to $BK/deckLibrary.json"
fi
if [ "$HELPERS_OK" = 0 ]; then
  if [ "$DRY" = 1 ]; then echo "  (dry) the library scripts arrive with this update — the manifest would load after the merge"
  else echo "  library scripts are missing after the update — not touching the library" >&2; exit 1; fi
elif listening; then
  echo "  server is listening on :$PORT — using its socket API (no restart)"
  # prune's own --dry-run only reads, so it is safe to run for real in dry mode
  if [ -n "$PRUNE" ]; then node scripts/riftbound/prune-deck-library.mjs --host "http://127.0.0.1:$PORT" --keep "$PRUNE" $DRYFLAG; fi
  if [ -f "$MANIFEST" ]; then
    if [ "$DRY" = 1 ]; then echo "  (dry) node scripts/riftbound/add-deck-to-library.mjs --manifest $MANIFEST"; else node scripts/riftbound/add-deck-to-library.mjs --host "http://127.0.0.1:$PORT" --manifest "$MANIFEST"; fi
  else echo "  no manifest at $MANIFEST"; fi
else
  echo "  no server on :$PORT — editing data/deckLibrary.json directly"
  if [ -f "$MANIFEST" ] || [ -n "$PRUNE" ]; then
    node scripts/riftbound/deck-library-file.mjs ${PRUNE:+--keep "$PRUNE"} ${MANIFEST:+--manifest "$MANIFEST"} $DRYFLAG
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
    # Job control on, so the server gets its own process group and the
    # hang-up that ends this ssh session cannot reach it.
    set -m
    nohup node server.js >> logs/server.log 2>&1 < /dev/null &
    disown || true
    set +m
    for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
      if listening; then break; fi
      sleep 1
    done
    if listening; then
      echo "  server is up on :$PORT (pid $(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t | sed -n '1p')); logs: $REPO/logs/server.log"
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
if [ -d "$BK" ]; then echo "  backups: $REPO/$BK"; fi
if [ -f data/deckLibrary.json ]; then
  node -e '
    const lib = JSON.parse(require("fs").readFileSync("data/deckLibrary.json", "utf8"));
    const decks = Array.isArray(lib.decks) ? lib.decks : [];
    console.log(`  deck library: ${decks.length} entries`);
    for (const d of decks) console.log(`    ${d.legend}  —  ${d.label || d.link || ""}`);
  '
fi
