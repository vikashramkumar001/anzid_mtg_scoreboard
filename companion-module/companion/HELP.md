## AnziD Coverage Hub

Controls the scoreboard server that drives the broadcast overlays.

### Setup

1. Start the scoreboard server (`npm start`) — it listens on **1378** by default.
2. Add this connection and set **Host** to the machine running it (`127.0.0.1` if
   Companion is on the same box) and **Port** to `1378`.
3. The status goes green once connected. Buttons using feedbacks light up
   immediately — the server pushes state, nothing is polled.

### What it talks to

This connects over Socket.IO exactly as the master-control page does, so it
needs **no changes to the server** and adds no new network surface. It joins the
`master-control` and `riftbound-card-view` rooms on connect, because most
broadcasts are room-scoped rather than global — without that, timer and card
state never arrive.

The one exception is the chat bridge, whose kill switch is a REST endpoint. That
is polled every 5s and shows `unreachable` when the bridge is disabled.

### Actions

| Action | Notes |
|---|---|
| Commentator L3: toggle | Shows/hides the lower thirds |
| Commentator L3: remote mode | In-person row vs one L3 per cam segment |
| Timer | start / pause / reset / ±1 min, addressed by round + match |
| Set game / vendor / player count | Same selectors as master control |
| Card viewer: show / clear | Slot 1 = left, 2 and 3 both render right |
| OBS: restore scene preset | Repositions existing sources; cannot add or remove them |
| Chat bridge: live / paused | The mid-show kill switch |

### Feedbacks

Game / vendor / player count selected, commentator L3 in remote mode, timer
running for a given round+match, and chat bridge live.

### Gotchas

- **Timer round is a text field** so it can follow a custom variable — set one to
  the live round and every timer button follows it.
- **Card slot 3 shares the right-hand viewer with chat.** The operator wins:
  chat yields while a slot 1/2 card is up.
- **Card names must be exact.** These actions do not run the chat resolver's
  fuzzy matching.
