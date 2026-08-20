// BTB sticker-treatment countdown, mirroring the Ashmanix OBS countdown
// plugin's text source over obs-websocket v5. Ported from the kit's
// btb-countdown-mirror.html (source of truth for the treatment — see
// /Users/…/btb-countdown/README-countdown.md for the plugin setup).
//
// The plugin stays the brain (start/pause/reset/end-message in its dock);
// this component just renders whatever the plugin writes into its (hidden)
// Text source, in the three-stroke sticker style with pinned digit widths.
//
// window.initBtbCountdown(opts) → { destroy() }
//   opts.container  DOM node to render into (positioned by the caller)
//   opts.size       clock font-size px (default 185)
//   opts.label      optional line above the clock ('' = none, default '')
//   opts.src        OBS text source name  (default 'Countdown Timer')
//   opts.ws         obs-websocket url     (default ws://127.0.0.1:4455)
//   opts.pw         obs-websocket password ('' = no auth)
//   opts.poll       read interval ms      (default 250)
//   opts.hideblank  hide all when source text empty (default true)
//   opts.rough      hand-inked edge       (default true)
(function () {
    'use strict';

    /* tiny SHA-256 — OBS browser sources on plain http (non-localhost) have
       no crypto.subtle, so the websocket auth hash is done by hand */
    function sha256bytes(bytes) {
        var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
        var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        var l = bytes.length, bl = l * 8, msg = bytes.slice();
        msg.push(0x80); while (msg.length % 64 !== 56) msg.push(0);
        var hi = Math.floor(bl / 4294967296), lo = bl >>> 0;
        msg.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255,
            (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
        var w = new Array(64);
        function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
        for (var i = 0; i < msg.length; i += 64) {
            for (var t = 0; t < 16; t++) w[t] = (msg[i + 4 * t] << 24) | (msg[i + 4 * t + 1] << 16) | (msg[i + 4 * t + 2] << 8) | msg[i + 4 * t + 3];
            for (t = 16; t < 64; t++) {
                var s0 = rr(w[t - 15], 7) ^ rr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
                var s1 = rr(w[t - 2], 17) ^ rr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
                w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
            }
            var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
            for (t = 0; t < 64; t++) {
                var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g);
                var t1 = (h + S1 + ch + K[t] + w[t]) | 0;
                var S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
                var t2 = (S0 + mj) | 0;
                h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
            H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
        }
        var out = [];
        for (i = 0; i < 8; i++) out.push((H[i] >>> 24) & 255, (H[i] >>> 16) & 255, (H[i] >>> 8) & 255, H[i] & 255);
        return out;
    }
    function utf8bytes(s) { var e = unescape(encodeURIComponent(s)), a = []; for (var i = 0; i < e.length; i++) a.push(e.charCodeAt(i)); return a; }
    function b64enc(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
    function sha256b64(str) { return b64enc(sha256bytes(utf8bytes(str))); }

    // Rough-edge displacement is absolute, not relative to font size — the
    // kit's spec says scale it as 7 × size/185. One filter per distinct scale.
    function ensureDefs(scale) {
        var id = 'btb-rough-' + String(scale).replace('.', '_');
        if (document.getElementById(id)) return id;
        var holder = document.createElement('div');
        holder.innerHTML = '<svg class="btb-countdown-defs"><filter id="' + id + '" x="-10%" y="-10%" width="120%" height="120%">'
            + '<feTurbulence type="fractalNoise" baseFrequency="0.014 0.021" numOctaves="3" seed="17" result="n"/>'
            + '<feDisplacementMap in="SourceGraphic" in2="n" scale="' + scale + '" xChannelSelector="R" yChannelSelector="G"/>'
            + '</filter></svg>';
        document.body.appendChild(holder.firstChild);
        return id;
    }

    window.initBtbCountdown = function (opts) {
        opts = opts || {};
        var container = opts.container;
        if (!container) return null;
        var SIZE = opts.size || 185;
        var LABEL = (opts.label || '').toUpperCase();
        var LSIZE = opts.labelsize || SIZE * 0.60;
        var GAP = opts.gap != null ? opts.gap : SIZE * 0.26;
        var SRC = opts.src || 'Countdown Timer';
        var WS = opts.ws || 'ws://127.0.0.1:4455';
        var PW = opts.pw || '';
        var POLL = opts.poll || 250;
        var HIDEBLANK = opts.hideblank !== false;
        var ROUGH = opts.rough !== false;

        container.classList.add('btb-countdown');
        container.innerHTML = '<div class="stk btb-label"></div><div class="stk btb-clock"></div>';
        if (ROUGH) {
            var filterId = ensureDefs(Math.round(7 * SIZE / 185 * 10) / 10);
            container.style.filter = 'url(#' + filterId + ')';
        }

        function build(el, fs) {
            el.style.fontSize = fs + 'px';
            el.innerHTML = '<span class="l s1"></span><span class="l s2"></span>'
                + '<span class="l s3"></span><span class="top"></span>';
            el.querySelector('.s1').style.webkitTextStrokeWidth = Math.round(fs * 0.289) + 'px';
            el.querySelector('.s2').style.webkitTextStrokeWidth = Math.round(fs * 0.183) + 'px';
            el.querySelector('.s3').style.webkitTextStrokeWidth = Math.round(fs * 0.089) + 'px';
        }
        var labelEl = container.querySelector('.btb-label');
        var clockEl = container.querySelector('.btb-clock');
        build(labelEl, LSIZE); build(clockEl, SIZE);
        clockEl.style.marginTop = GAP + 'px';
        if (!LABEL) labelEl.style.display = 'none';

        var DW = 0;
        function measureDigits() {
            var c = document.createElement('canvas').getContext('2d');
            c.font = '400 ' + SIZE + "px 'Anton BTB'";
            for (var i = 0; i < 10; i++) DW = Math.max(DW, c.measureText(String(i)).width);
            DW = Math.ceil(DW) + Math.round(SIZE * 0.22);
        }
        function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
        function markup(txt, fixed) {
            if (!fixed) return esc(txt);
            var out = '';
            for (var i = 0; i < txt.length; i++) {
                var ch = txt[i];
                out += (ch >= '0' && ch <= '9')
                    ? '<span class="d" style="width:' + DW + 'px">' + ch + '</span>'
                    : '<span class="d">' + esc(ch) + '</span>';
            }
            return out;
        }
        function paint(el, txt, fixed) {
            var h = markup(txt, fixed), n = el.children;
            for (var i = 0; i < n.length; i++) n[i].innerHTML = h;
        }

        var last = null;
        function render(text) {
            text = (text == null ? '' : String(text)).replace(/\r/g, '');
            text = text.split('\n')[0].trim();
            if (text === last) return;
            last = text;
            if (!text && HIDEBLANK) { container.style.visibility = 'hidden'; return; }
            container.style.visibility = 'visible';
            var isClock = /^[0-9:. ]+$/.test(text);
            paint(clockEl, isClock ? text : text.toUpperCase(), isClock);
        }

        /* obs-websocket v5 mirror */
        var ws = null, rid = 0, pollTimer = null, backoff = 1000, dead = false;
        function send(o) { try { ws.send(JSON.stringify(o)); } catch (e) { } }
        function connect() {
            if (dead) return;
            try { ws = new WebSocket(WS); } catch (e) { console.warn('[btb] bad ws url'); return; }
            ws.onmessage = function (ev) {
                var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
                if (m.op === 0) {
                    var d = { rpcVersion: 1, eventSubscriptions: 0 };
                    if (m.d.authentication) {
                        var secret = sha256b64(PW + m.d.authentication.salt);
                        d.authentication = sha256b64(secret + m.d.authentication.challenge);
                    }
                    send({ op: 1, d: d });
                } else if (m.op === 2) {
                    backoff = 1000;
                    clearInterval(pollTimer);
                    poll(); pollTimer = setInterval(poll, POLL);
                } else if (m.op === 7) {
                    if (m.d.requestType === 'GetInputSettings') {
                        if (m.d.requestStatus && m.d.requestStatus.result) {
                            render((m.d.responseData.inputSettings || {}).text);
                        }
                    }
                }
            };
            ws.onclose = function () {
                clearInterval(pollTimer);
                if (dead) return;
                setTimeout(connect, backoff);
                backoff = Math.min(backoff * 1.6, 10000);
            };
        }
        function poll() {
            if (!ws || ws.readyState !== 1) return;
            send({ op: 6, d: { requestType: 'GetInputSettings', requestId: 'r' + (++rid), requestData: { inputName: SRC } } });
        }

        function start() {
            measureDigits();
            if (LABEL) paint(labelEl, LABEL, false);
            container.style.visibility = HIDEBLANK ? 'hidden' : 'visible';
            connect();
        }
        if (document.fonts && document.fonts.load) {
            document.fonts.load("400 " + SIZE + "px 'Anton BTB'").then(start).catch(start);
        } else setTimeout(start, 300);

        return {
            destroy: function () {
                dead = true;
                clearInterval(pollTimer);
                try { ws && ws.close(); } catch (e) { }
                container.innerHTML = '';
                container.classList.remove('btb-countdown');
                container.style.filter = '';
            }
        };
    };
})();
