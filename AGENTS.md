# AGENTS.md — IRL Stream Master

Two independent npm projects, no workspaces. Root `package.json` only orchestrates.

- `server/` — Express 5 + Socket.IO backend, **CommonJS**. Entrypoint `server/src/index.js` (exports `app` for tests; skips `listen` when `NODE_ENV=test`).
- `client/` — Vite + React 19 + Tailwind 4 frontend, **ESM**. Entrypoints `client/src/main.jsx` → `App.jsx` → `pages/Dashboard.jsx` | `pages/MobileCam.jsx`.

## Commands (run from repo root)

```bash
npm start            # prod: node server/src/index.js, serves client/dist on :5000
npm run server:dev   # backend only (port 5000)
npm run client:dev   # Vite only (port 3000, proxies /api + /socket.io → :5000)
npm run build:client # cd client && vite build → client/dist (required before npm start shows UI)
npm test             # cd server && npx vitest run
```

- Lint: `cd client && npm run lint` (oxlint). No server lint/typecheck.
- `server/package.json` `test` script is stale (`echo "Error..."`) — always use root `npm test` or `npx vitest run` from `server/`.
- No vitest config file; `server/__tests__/*.test.js` use vitest + supertest with `createRequire` to load CJS `src/index.js`.

## Dev / prod serving

- Dev: backend `:5000` + Vite `:3000`. Phone cam dev URL is `http://<LAN-IP>:3000/cam`.
- Prod: single port `5000` serves `client/dist` statically; SPA fallback sends `index.html` for any non-`/api`, non-`/socket.io` path. If UI shows the "Launch Vite dev server" text, `client/dist` is missing — run `npm run build:client`.
- Backend binds `0.0.0.0`; QR pairing / `/api/network-info` assumes phone + laptop on same Wi-Fi/hotspot.

## Conventions that differ from defaults

- No react-router. `App.jsx` routes manually via `window.location.pathname + hash`: `/cam` (or `#/cam`) → `MobileCam`, everything else → `Dashboard`. Preserve this when adding pages.
- Backend URL resolution (`client/src/utils/api.js`): `localStorage.serverUrl` override → `window.location.origin`, except Capacitor WebView falls back to hardcoded `DEFAULT_SERVER_URL = 'http://192.168.100.11:5000'`. Update that constant when the LAN changes; don't "fix" it to localhost.
- Capacitor (`client/capacitor.config.json`, `webDir: dist`) needs `cleartext: true` + `allowMixedContent` for HTTP LAN streaming — keep them.
- Socket.IO is both data bus and WebRTC signaling: rooms via `join-room`, relay via `signal`, cam status via `cam-status-update`, remote control via `cam-command`. Media chunks arrive as `stream-chunk` (Buffer/ArrayBuffer) and are piped to FFmpeg stdin.
- Streaming requires an `ffmpeg` binary on PATH (`spawn('ffmpeg', ...)`). Empty/`"test"` streamKey = mock mode (`-f null -`), used for offline testing. Real mode pushes WebM pipe → libx264/aac → YouTube RTMP.
- Config lives in `server/data/config.json`, auto-created from `DEFAULT_CONFIG` in `server/src/configManager.js`. `GET /api/config` returns full config incl. raw `streamKey` plus masked `streamKeyMasked` — don't log or expose it further.

## Tests

- `server/__tests__/api.test.js` asserts `GET /api/stream/status → isStreaming: false` initially; don't start a stream in test setup without stopping it.
- FFmpeg is not mocked — tests avoid `/api/stream/start`. Keep it that way; test status/config/simulation endpoints only unless adding a spawn mock.

## CI / APK

- `.github/workflows/build-apk.yml` (push/PR to `main`/`master`, Node 22 + Java 21 Temurin): `cd client && npm install && npm run build && npx cap sync android`, then `gradlew assembleDebug`, uploads `app-debug.apk`. Always run `cap sync` after a web build before Gradle; never commit `client/android/app/build/` or `*.apk` (gitignored, `release-apk/` holds local copies).
