# Riftbound Card Lens — Twitch Extension (Video Overlay)

Viewer-facing overlay for the overhead-camera Riftbound stream. The backend
(`features/card-vision.js`) recognizes physical cards on camera and pushes
their positions via Twitch Extension PubSub; this overlay draws hover
hotspots over the video, and hovering a card shows its details.

```
video_overlay.html   viewer overlay (loaded in an iframe over the player)
overlay.js / .css    hotspot + panel logic and styling
cards.json           compact card DB (generated — see below)
config.html / .js    broadcaster config page (stub, nothing to configure)
build-cards-json.mjs generates cards.json from data/riftbound/riftboundCardNames.json
serve-local.mjs      HTTPS static server for Twitch Local Test
```

Everything is vanilla JS with no build step. The only external script is
Twitch's own extension helper, which is the one URL their CSP allows.

---

## 1. Create the extension in the Twitch developer console

1. Go to <https://dev.twitch.tv/console/extensions> (log in with the channel's
   Twitch account) and click **Create Extension**.
2. Name: **Riftbound Card Lens** (suggestion — must be unique on Twitch).
3. Type: **Video Overlay**. (You can add Panel/Component later; only overlay
   is used.)
4. Category: something like *Games / Trivia* or *Streamer Tools*; author
   email as prompted.
5. After creation you land on the extension's console page with a
   **Version 0.0.1** in *Local Test*.

## 2. Wire the backend (.env)

The backend pushes PubSub via helix `POST /extensions/pubsub` and needs three
values from the extension console:

| .env variable            | Where to find it                                                            |
| ------------------------ | --------------------------------------------------------------------------- |
| `TWITCH_EXT_CLIENT_ID`   | Extension console → **Overview** → *Client ID*                              |
| `TWITCH_EXT_SECRET`      | Extension console → **Settings → Secret Keys** → *Generate/Reveal* (base64) |
| `TWITCH_BROADCASTER_ID`  | The channel's numeric user id (e.g. `https://api.twitch.tv/helix/users?login=<channel>` or any username→id lookup tool) |

Notes:

- The secret is **base64-encoded**; the backend must base64-decode it before
  HMAC-signing the JWT. Keep it out of git.
- The broadcaster id is the numeric id of the channel the overlay runs on,
  not the login name.

## 3. Local Test flow

1. **Build the card DB** (repo root):

   ```sh
   node twitch-extension/build-cards-json.mjs
   ```

   Re-run whenever `data/riftbound/riftboundCardNames.json` changes
   (new sets, etc.). `cards.json` is generated output — don't hand-edit.

2. **Generate a self-signed cert** (Twitch only loads HTTPS assets):

   ```sh
   cd twitch-extension
   openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \
     -keyout localhost.key -out localhost.crt \
     -subj "/CN=localhost" \
     -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
   ```

3. **Serve it**:

   ```sh
   node twitch-extension/serve-local.mjs
   ```

   Then open <https://localhost:8080/video_overlay.html> directly in your
   browser once and accept the certificate warning — the Twitch iframe can't
   surface that prompt itself.

4. **Point Twitch at it.** In the extension console, under the version's
   **Asset Hosting**:
   - *Testing Base URI*: `https://localhost:8080/`
   - *Video - Fullscreen Viewer Path*: `video_overlay.html`
   - *Config Path*: `config.html`

5. **Activate on your own channel.** Extension console → *Local Test* status →
   **View on Twitch and Install**, then on the channel's
   **Creator Dashboard → Extensions → My Extensions**: Install → Activate →
   **Set as Overlay 1**.

6. Go live (or use the channel while live), start the backend's card-vision
   feature, and hotspots should appear as cards are recognized. Only the
   broadcaster/whitelisted testers see the extension while in Local Test.

**Hosted Test later:** when local flow works, upload a zip of this directory
(`video_overlay.html`, `overlay.js`, `overlay.css`, `cards.json`,
`config.html`, `config.js` — not the certs or .mjs scripts) under
*Files → Upload*, move the version to **Hosted Test**, and re-verify. Twitch
then serves the assets from its own CDN.

## 4. Open decisions

Two things are intentionally unresolved in this scaffold:

1. **Public HTTPS host for card images.** `overlay.js` has
   `IMAGE_BASE = ''` at the top; empty means the hover panel is text-only.
   To show card art the images need a public HTTPS host (the repo's
   `public/assets/images/riftbound/cards/` PNGs are only served locally),
   and that domain must be added to the extension's **image domain
   allowlist** in the Twitch console — otherwise the extension CSP blocks
   the requests. Set `IMAGE_BASE` to that host's base URL
   (e.g. `https://cards.example.com/riftbound/`).

2. **EBS reachability.** Today the extension is pure PubSub (backend →
   Twitch → viewers) and needs no inbound connectivity. If the overlay ever
   needs to *pull* from the backend (e.g. full state on join, deck info),
   the backend must be reachable from viewers' browsers over public HTTPS,
   and that URL must go on the extension's **request URL allowlist**. The
   ingest box currently sits on a LAN — this would need a tunnel or hosted
   relay. PubSub alone avoids the problem, at the cost of the 5 KB / 1-msg-
   per-second-per-topic PubSub limits.

## 5. Submission checklist (before "Review" for public release)

- [ ] **Rights to display Riot card art.** Verify the card images and names
      comply with Riot Games' fan-content / Riftbound community-use policy,
      and that Twitch review won't flag third-party IP. If unclear, ship
      text-only panels (leave `IMAGE_BASE` empty).
- [ ] Assets uploaded and working in **Hosted Test** on a live stream.
- [ ] Extension icons (100x100 discovery + screenshots) uploaded.
- [ ] Description, summary, and category filled in; testing instructions for
      the reviewer include how they'll see hotspots (e.g. a VOD-safe test
      channel or a note that state is broadcast-driven).
- [ ] Image domain allowlist contains the card-art host (if used).
- [ ] No console errors in the overlay iframe; overlay never blocks player
      controls when no cards are on screen (pointer-events audit).
- [ ] Top-center reserved zone respected (hotspots there are suppressed).
- [ ] Privacy policy / support links if required by the form.
- [ ] Version bumped and moved through Local Test → Hosted Test → Review.
