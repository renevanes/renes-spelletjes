# Development and release

The editable app is in `src/`. `src/legacy.js` preserves the existing games and integrates the new storage, menu and Risk modules. `src/shell.html` contains the existing app markup and styles. Risk's rules live in `risk-engine.js`; its map and interface are separate. All new UI text is Dutch.

The build uses Node.js 22 or newer and requires no npm dependencies:

```sh
npm test
npm run build
npm run preview
```

Open the printed localhost URL. `dist/index.html` is a complete offline bundle with inline code, artwork and styles; the existing restrictive Content Security Policy is retained. It also works when opened directly in a browser that allows file-origin storage.

Optional browser regression checks require Python Playwright and Chromium. With the preview server running:

```sh
python tests/browser.py
```

## Changes in the next release

- Backup imports validate the file, format, version, profile data and each saved game's shape before confirmation. They replace only app-owned storage, with rollback and a clear failure message if a write fails. Existing 1.53 saves remain compatible. Save failures show a persistent warning.
- Browser zoom is enabled. Dialogs have accessible names, focus management, keyboard trapping and Escape behavior that uses the app's existing back/cancel handling. Toasts announce status. Motion follows the device preference by default and can be overridden in settings. Shared colorblind settings update all player profiles' three existing color puzzles.
- Search and categories filter the game collection. Favorites use the existing pin preference. Today links to the existing Mahjong, Bushalte and Kleurbuisjes daily puzzles and preserves their unlock requirements.
- Risk has the classic 42-country adjacency graph and continent bonuses, 2–6 players, human/AI mixtures, three computer levels, reinforcement, cards, dice combat, occupation, connected fortification, elimination, victory, a zoomable original map, a keyboard-friendly country list, local handoff, pause and profile-scoped saved games. Initial countries and armies are distributed automatically. Two-player games use no neutral armies. The defender always uses the maximum allowed dice. Save data includes random-generator state so reloading does not reroll a battle.

## Signed Android release

`web/index.html`, `update.json` and `apk/Renes-spelletjes.apk` are the existing released, signed artifacts. This development branch deliberately leaves those files intact. Do not overwrite the live web bundle without a matching valid signature: the app checks `webSha256` and `webSig`.

To release, use the project's original Android source and private signing setup to package `dist/index.html`, generate the web SHA-256 and signature, increment the update version metadata, and build/sign the APK if needed. None of those private keys or the Android build project are present in this repository. Browser and rule tests do not establish Android WebView, native zoom, update or APK behavior; verify those on a device before release.
