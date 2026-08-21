# Deploy / sync runbook

Two production targets:

- **Ingest box** — `AnziD-Ingest-2` (`192.168.4.20`), the live LAN server OBS points at.
  Repo lives under `~/Desktop/coverage hub/...`. Pulls the **`20260330---dsg+fly`** (dsg) branch.
- **Heroku** — deploys from **`deploy-heroku`**.

## Branches

| Branch | Role |
|---|---|
| `20260330---dsg+fly` (dsg) | active working branch — the **ingest box pulls this** |
| `master` | mainline |
| `deploy-heroku` | Heroku deploy branch |

Normally kept in sync via fast-forward (dsg → master → deploy-heroku).

## ⚠️ Gitignored assets DO NOT transfer via git

Large binaries are gitignored (`.gitignore`) and must be copied to the ingest box
**separately** — a plain `git pull` leaves them missing. Typical symptoms: blank
decklist **wallpaper video**, missing animated legend art, no metagame/standings motion.

| Path | ~Size | Breaks if missing |
|---|---|---|
| `public/assets/animations/riftbound/` | ~3.7 GB | decklist wallpaper video, animated legends, metagame/standings motion |
| `public/assets/images/vibes/cards/ETH/`, `.../LOL/` | — | Vibes card art |
| `public/js/restream-config.js` | 1 line | anu Restream chat overlay (blank without it) |

### Topdeck.gg import (`.env`)

The master-control FFA "Topdeck" row (load round → apply pod) needs
`TOPDECK_API_KEY=<key>` in the server's `.env` (gitignored). Free key from
https://topdeck.gg/developers. Without it the Load button reports the missing
key. Topdeck requires a visible "powered by TopDeck.gg" credit on projects
using the API.

### Restream chat config (`public/js/restream-config.js`)

Gitignored because it holds an embed token. The anu scoreboard's Restream chat
stays blank until this one-line file exists on the machine serving the scoreboard.
Create it on the ingest box (and Heroku, if used):

```js
window.RESTREAM_CHAT_URL = 'https://chat.restream.io/embed?token=YOUR_TOKEN';
```

Get the URL from https://chat.restream.io/settings/embed.

### Sync command (run from the dev Mac)

```bash
# whole animations tree (recommended — covers decklist, legend-art, metagame, standings)
rsync -avz --progress \
  "public/assets/animations/riftbound/" \
  "USER@192.168.4.20:PATH_TO_REPO/public/assets/animations/riftbound/"
```

Replace `USER` and `PATH_TO_REPO` with the ingest box's login + repo path. Re-run
whenever the animation assets change. (To sync just the decklist wallpaper, point both
sides at `.../animations/riftbound/decklist/` instead.)

## Ingest box update steps

1. `git pull` (on the `20260330---dsg+fly` branch)
2. **rsync the gitignored assets above** — only when they changed (see table)
3. `npm install` — only when `package.json` changed
4. Restart the server (`node server.js`, or via your process manager)

OBS WebSocket must be reachable at `ws://localhost:4455` — used by the OBS preset
system and the card-vision transform mapping.

## Heroku

Push `deploy-heroku`; if the app auto-deploys from GitHub it builds on push, otherwise
trigger the deploy from the dashboard. Heroku has no OBS and no local recognizer state,
so the `card-vision` feature just logs harmless failed-connection retries there.

---

# Setting up a NEW Mac (dev or show machine)

A `git pull` gets you the app. It does **not** get you a working OBS. Three
separate things have to arrive, and only the first is in git:

| Layer | In git? | Size | How it travels |
|---|---|---|---|
| App code | ✅ yes | — | `git pull` |
| Gitignored app assets (`animations/`, `.env`, `restream-config.js`) | ❌ no | ~3.7 GB | rsync / manual |
| **OBS scene collection** (`.json`) | ❌ no | ~3 MB | OBS export → import |
| **External media the collection points at** | ❌ no | ~6 GB | copy, at identical absolute paths |

## 1. Repo (Sourcetree)

1. **File → Clone / New → Clone from URL**
   - Source URL: `https://github.com/vikashramkumar001/anzid_mtg_scoreboard.git`
   - Destination: keep the same path shape as the dev Mac if you can.
2. In the sidebar under **REMOTES → origin**, double-click the branch you want
   (`master`, or `20260330---dsg+fly` for the active working branch). Sourcetree
   creates the local tracking branch.
3. Later updates: **Pull** button (or ⌘⇧L). Nothing else is needed for code.

Then, in Terminal at the repo root:

```bash
npm install     # Node 18.x — matches the dev Mac (node -v → v18.15.0)
```

## 2. Gitignored app assets

See the table further up this file. In short: `.env` (Topdeck key),
`public/js/restream-config.js` (Restream token), and
`public/assets/animations/` (~3.7 GB). Copy from the dev Mac.

## 3. OBS

### 3a. Install OBS + the plugins the collection depends on

OBS **31.1.2** on the dev Mac. The collection will load without these plugins,
but scenes will be visibly broken — **Move Transition alone drives 326 filters**,
i.e. essentially every animated element:

| Plugin | Used for | Count |
|---|---|---|
| **Move Transition** | all scene-item animation + the `Move` transition | 326 filters |
| **Source Clone** | duplicated cams/browsers | 3 sources |
| **DistroAV / obs-ndi** | NDI backup feeds | 2 sources |
| **obs-shaderfilter** | shader effects | 5 filters |
| **Source Record** | per-source recording | 1 filter |
| **Ashmanix Countdown** | writes `Text - Timer Long` / `Text - Timer Short`, which the merlion BTB countdown page mirrors | — |

Also on the dev Mac (not strictly required by the collection): Advanced Scene
Switcher, Vertical Canvas, obs-multi-rtmp, Aitum Multistream, Advanced Masks,
Stroke/Glow/Shadow, text-pthread, Transition Table, Waveform, Source Copy.

### 3b. Fonts

Install these system-wide or OBS text sources fall back to something wrong:
**Beaufort for LOL** (Heavy), **Beni** (Bold), **Gotham Narrow** (Bold),
**Tusker Grotesk 6500** (Medium). Web fonts used by the browser pages live in
`public/fonts/` and travel with git — no action needed for those.

### 3c. Move the scene collection

On the dev Mac: **Scene Collection → Export**. On the new Mac: **Scene
Collection → Import**, then select it. The current show collection is
`proto 3 - FULL LOCAL - riftbound` (140 scenes, 173 inputs).

The raw file, if you'd rather copy it directly:

```
~/Library/Application Support/obs-studio/basic/scenes/proto_3__FULL_LOCAL__riftbound.json
```

Quit OBS before copying — OBS only flushes the collection to disk on quit or
collection-switch, so a live copy can be stale.

### 3d. Enable OBS WebSocket

**Tools → WebSocket Server Settings** → enable, port **4455**, password
`RRWtUPVpGf6myRvx` (this is what the app's preset system and the browser pages
default to). Without it: no preset save/restore, and the merlion countdown page
can't mirror the Ashmanix timer.

### 3e. ⚠️ External media lives OUTSIDE the repo, at absolute paths

The collection references ~54 files by **absolute path**, ~6 GB, under:

- `~/Desktop/media assets/` — stingers, music beds, sponsor ad videos, animated
  legend `.mov` files, backgrounds
- `~/Desktop/mtg mobile coverage/coverage overlay/` — overlay art, masks, info
  slides, sponsor images
- `~/Movies/` — camera-ingest test recordings

Because the paths are absolute and start `/Users/anuraagdas/`, the new Mac needs
**the same short username** and the same folder layout, or every one of those
sources goes red. If the username differs, you must relink them by hand in OBS.

Only the folders actually referenced need to come across — not all 233 GB. The
biggest single items are the camera-ingest `.mkv` (2.8 GB), the flyquest sponsor
ads (932 MB), `elf rgb2.mov` (832 MB) and the 10s countdown comp (383 MB).

### 3f. Restore positions from a preset

Scene-item positions live in the repo, per game/vendor/player-count, in
`data/obs exports/`. Start the server, open master control, pick the
game/vendor/count and click **Apply Broadcast Settings**.

Restore **only repositions items that already exist** — it never creates or
deletes sources. So the scene collection (3c) must be imported first, otherwise
restore silently does nothing.

## 4. Verify the new Mac

```bash
node server.js        # then open http://localhost:1378
```

- OBS: no red "missing file" sources in the scene list
- OBS: the 11 `Stinger - *` transitions all point at `PG1_1.webm`
- Browser sources render (they hit `http://localhost:1378/...`, so the server
  must be running on the *same* machine as OBS, or the URLs need repointing)
- Apply a preset from master control and confirm items land correctly

## Known-stale references (safe to ignore)

12 files referenced by the collection no longer exist. All are past-event
assets in archived `*` scenes, plus two old test recordings — nothing a current
show touches:

- `20231208 eternal weekend na/profiles/legacy/*` — 3 player profile PNGs (hidden)
- `20250418 mxp santa clara/*`, `20250822 mxp phoenix/*`, `20251009 na ew/*`,
  `20251031 mxp tacoma/*` — 7 old event slides
- `~/Movies/2025-08-23 *.mkv`, `~/Movies/2025-10-16 *.mkv` — test recordings
