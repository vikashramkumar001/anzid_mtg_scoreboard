#!/usr/bin/env node
/**
 * serve-local.mjs — HTTPS static server for Twitch Extension Local Test.
 *
 * Twitch loads extension assets over HTTPS only, so local testing needs
 * a self-signed cert. This serves the twitch-extension directory at
 * https://localhost:8080/ with zero npm dependencies.
 *
 *   node twitch-extension/serve-local.mjs
 *
 * Expects localhost.key / localhost.crt beside this script; prints
 * generation instructions if they are missing.
 */

import { createServer } from 'node:https';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8080;

const keyPath = join(here, 'localhost.key');
const crtPath = join(here, 'localhost.crt');

if (!existsSync(keyPath) || !existsSync(crtPath)) {
  console.error(`
Missing TLS certificate. Generate a self-signed one with:

  cd "${here}"
  openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \\
    -keyout localhost.key -out localhost.crt \\
    -subj "/CN=localhost" \\
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

Then re-run this script. On first load, open https://localhost:${PORT}/video_overlay.html
in your browser and accept the certificate warning — Twitch's iframe
cannot show that warning for you, so accept it directly first.
`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

createServer(
  { key: readFileSync(keyPath), cert: readFileSync(crtPath) },
  (req, res) => {
    let path = decodeURIComponent((req.url || '/').split('?')[0]);
    if (path === '/') path = '/video_overlay.html';

    // Resolve inside the extension dir only.
    const file = join(here, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(here) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    createReadStream(file).pipe(res);
  }
).listen(PORT, () => {
  console.log(`Serving ${here}`);
  console.log(`  https://localhost:${PORT}/video_overlay.html`);
  console.log(`  https://localhost:${PORT}/config.html`);
  console.log('Set the Twitch "Testing Base URI" to https://localhost:8080/');
});
