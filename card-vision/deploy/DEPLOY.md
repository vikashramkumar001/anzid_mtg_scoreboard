# Card-Vision Deployment (AnziD-Ingest-2)

Deploys the live card-recognition loop (`card-vision/live_loop.py`) on the ingest
box. The Node server (`server.js`, port 1378) already includes
`features/card-vision.js`, which watches `card-vision/state.json` — so once the
Python loop is running and writing state, the server picks it up automatically.

On the ingest box OBS runs locally, so the loop connects to `ws://localhost:4455`
(dev used `ws://192.168.4.20:4455`). The OBS websocket password is already the
hardcoded `--password` default in `live_loop.py` — nothing to configure.

Throughout, `$REPO` is the repo root on this machine (the directory containing
`server.js` and `card-vision/`). On the ingest box that is normally:

```bash
REPO="$HOME/Desktop/coverage hub"
```

Adjust if the repo lives elsewhere (the dev path differs, so don't copy paths
from a dev machine blindly).

## 1. Update the code

```bash
cd "$REPO"
git pull
npm install        # server deps are unchanged by this feature, but keep the habit
```

Restart the Node server the way you normally do (so it loads
`features/card-vision.js`).

## 2. Set up the Python side

```bash
cd "$REPO/card-vision"
bash deploy/install.sh
```

This is idempotent — safe to re-run after every `git pull`. It:

- creates `.venv` if missing
- installs `requirements.txt` (opencv-python-headless, numpy) plus `obsws-python`
- builds the card index (`build_index.py`) if `.cache/index.pkl` is missing
- creates `samples/` and `logs/`

The first run takes a while (pip downloads + index build); later runs are quick.

## 3. Install the LaunchAgent

```bash
cd "$REPO/card-vision"
cp deploy/com.anzid.cardvision.plist ~/Library/LaunchAgents/
sed -i '' "s|REPLACE_ME_REPO_PATH|$REPO|g" ~/Library/LaunchAgents/com.anzid.cardvision.plist
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.anzid.cardvision.plist
```

(On older macOS where `bootstrap` isn't available:
`launchctl load ~/Library/LaunchAgents/com.anzid.cardvision.plist`)

The agent starts the loop immediately (`RunAtLoad`) and restarts it if it ever
exits (`KeepAlive`), including after a reboot/login.

## 4. Check it's running

```bash
launchctl list | grep cardvision            # should show com.anzid.cardvision
tail -f "$REPO/card-vision/logs/loop.log"   # live loop output
curl localhost:1378/api/card-vision/state   # server's view of state.json
```

You should also see `card-vision/state.json` updating and fresh frames landing
in `card-vision/samples/latest.jpg`.

## 5. Stop / restart

```bash
# Stop (also disables auto-restart until loaded again)
launchctl bootout gui/$UID/com.anzid.cardvision
# older macOS:
launchctl unload ~/Library/LaunchAgents/com.anzid.cardvision.plist

# Start again
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.anzid.cardvision.plist

# Quick restart in place (kill + relaunch, agent stays loaded)
launchctl kickstart -k gui/$UID/com.anzid.cardvision
```

To run the loop by hand (e.g. for debugging, with the agent stopped):

```bash
cd "$REPO/card-vision"
.venv/bin/python3 live_loop.py --sweep --obs ws://localhost:4455
```

## Troubleshooting

- **Log full of "black frame" / "too dark" / frozen-frame messages** — normal
  whenever the camera is off or the scene is dark. The loop idles and resumes
  on its own once there's a real picture; nothing to fix.
- **Sweep seems stuck** — a full-table sweep takes minutes. Watch
  `logs/loop.log`; as long as it's printing progress, let it run.
- **`state.json` missing (or `/api/card-vision/state` errors)** — the loop
  isn't running. Check `launchctl list | grep cardvision` and the tail of
  `logs/loop.log` for the crash reason, then `launchctl kickstart -k
  gui/$UID/com.anzid.cardvision`.
- **Loop exits immediately / connection errors in the log** — OBS isn't running
  or its websocket server is off. Open OBS → Tools → WebSocket Server Settings
  and confirm it's enabled on port 4455. `KeepAlive` will keep retrying every
  ~10s, so it recovers by itself once OBS is up.
- **`ModuleNotFoundError` in the log** — the venv is stale or missing. Re-run
  `bash deploy/install.sh`.
- **Agent won't load / "path had bad ownership" style errors** — confirm the
  `sed` step actually replaced `REPLACE_ME_REPO_PATH` in
  `~/Library/LaunchAgents/com.anzid.cardvision.plist` and that the paths in it
  exist.
