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
| `public/assets/animations/mtg/` | ~130 MB | merlion BRB break-ad videos (ads/merlion-ffa/) |
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
