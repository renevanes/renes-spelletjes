# AGENTS.md — working on "Games"

Guide for every coding agent (OpenAI Codex, Claude Code, …) and for humans. Several agents may work on this
repository **at the same time**; the rules below keep that safe. The owner is Rene (Dutch); he talks Dutch.

## What this is
An Android games app: a WebView (`app/src/main/assets/index.html`, one large single-file web app built from
IIFE modules, ~25k lines) inside a small Java shell (`app/src/main/java/nl/rene/spelletjes/`). Installed apps update
themselves from this repository: they read `update.json` on `main` and download the signed web bundle (`web/`) or,
for native changes, the APK (`apk/`).

## Repository layout
| Path | What | Who edits |
|---|---|---|
| `app/src/main/assets/index.html` | the whole web app (all games, menu, settings, sound engine) | agents |
| `app/src/main/java/`, `res/`, `AndroidManifest.xml` | native shell (WebView, updater, bridge) | agents, rarely |
| `games/` | per-game package sources, builders (`*build.py`), generators and tests; `addgame.py` installs a package into `index.html` | agents |
| `tests/` | app-wide Playwright tests (`tiles.mjs`, `smoke.mjs` run in CI; the others are regression tests) | agents |
| `tools/` | `build_web.py` (web bundle), `build_apk.sh` (APK), `release.py` (release pipeline) | rarely |
| `changes/` | release-note fragments, one file per change (see below) | agents |
| `update.json`, `web/`, `apk/`, `changelog.json` | **published release** — written only by the release workflow | **nobody by hand** |
| `secrets/`, `keys/` | signing material (encrypted / never committed) | **never** |
| `feedback-worker/` | Cloudflare worker for in-app feedback | rarely |

## How to work (parallel-safe)
1. `git pull --rebase origin main` before you start and again right before you push.
2. Make focused changes. Prefer touching only the module of the game you work on; keep edits to shared code
   (Shell, `Sfx`/`Music`, settings, `GAMES`, `LEAVE`, `MODAL_GAME`) minimal — those are where parallel work collides.
3. Add a release-note fragment for every user-visible change: `changes/<short-slug>.md` containing 1–3 sentences in
   **Dutch**, written for players (e.g. `changes/klaverjas-scorebord.md`). Use a unique file name; never edit other
   agents' fragments. No fragment needed for invisible refactors/tests.
4. **Do not** change version numbers, `NATIVE_LEVEL`, `update.json`, `web/`, `apk/` or `changelog.json`.
   The release pipeline sets the version (code +1, name `1.<code-1>`), raises the native level automatically when Java,
   resources or the manifest changed, and publishes.
5. Build and test locally (needs Node 22 + Python 3; no Android SDK needed):
   ```sh
   npm ci && npx playwright install chromium
   npm run build          # -> build/web/index.html (minified; `npm run build:debug` for readable output)
   npm test               # tiles.mjs (opens every game, portrait+landscape) + smoke.mjs
   node tests/<x>.mjs     # extra regression tests; per-game tests live in games/ (e.g. node games/bh1.mjs)
   ```
   All tests default to `build/web/index.html`; set `APP_HTML=/path/to/index.html` to test another file.
6. Commit with a clear message and push to `main` (or open a PR — the `Checks` workflow tests branches and PRs).
   If the push is rejected: `git pull --rebase origin main`, re-run the build + tests, push again.
7. The `Release` workflow then tests, builds, signs and publishes the new version (usually within ~10 minutes).
   Releases run one at a time; a run always releases the newest `main`, including everything pushed meanwhile.

## Product rules (from Rene)
- All in-app text is **Dutch**. Communicate with Rene in Dutch.
- Every game is an **original** version with its own name and art — no trademarked names, characters, logos, levels or
  music from commercial games (e.g. "Springvos" instead of Mario, "Woordbord" instead of Wordfeud, "Vuistduel" instead of
  Street Fighter). Family friendly (the app has child profiles and a daily play-time limit).
- Every game has separate options **Geluidseffecten** (`opt.sound`) and **Achtergrondmuziek** (`opt.music`, gated with
  `Sfx.gate('<id>', () => opt.music !== false)`), save/resume with a tile badge, stats, trophies, back-button handling
  via `LEAVE`, portrait + landscape, and the big-text mode.
- **Sound** is procedural (the `G` table in `Sfx`). Rene dislikes crackly/tinny sound: only smooth sounds — sine /
  polyBLEP tones and filtered pink noise, attacks ≥ 1–2 ms, no white-noise click bursts, no `tanh` overdrive, no random
  impulses. The master chain already limits loudness.
- Performance target: smooth on a mid-range Android phone (test with Playwright CPU throttling 6×, ≥ 50 fps, after ~30 s
  warm-up because the app pre-renders its sound bank after the first tap). Stop render loops when nothing moves.
- Robustness: after undo/restart/resume rebuild the view from the logic state; animation timers must stay finite and
  can never block input (a past NaN-timer bug froze Bushalte after "Terug"). New games ship with a fuzz test.

## Adding a game
Games are installed into `index.html` as JSON packages: see `games/addgame.py` and a recent example (`games/ls*`,
`games/bs*`, `games/wq*`, `games/vd*`: `<id>build.py` builds `<id>.json` from `<id>src/`, `<id>1.mjs` is its test).
`INDEX=path/to/copy.html python3 games/addgame.py games/<id>.json` installs into a copy; without `INDEX` it edits
`app/src/main/assets/index.html`. Pick an unused 2-letter id (see `MODAL_GAME` in `index.html`).

## Never
- Commit keys, passwords or tokens (signing keys live only encrypted in `secrets/` and as a GitHub secret).
- Hand-edit the published files or force-push `main`.
- Remove other agents' work while resolving conflicts — merge both sides, then re-test.
