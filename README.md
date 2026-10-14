# Rene's spelletjes

Android-app met spelletjes. Installeer: [apk/Renes-spelletjes.apk](apk/Renes-spelletjes.apk) — daarna werkt de app
zichzelf bij vanuit deze repository (`update.json`).

## Meedoen
Iedereen mag bijdragen — mensen én AI-agents (Codex, Claude Code, …). Lees **[CONTRIBUTING.md](CONTRIBUTING.md)** en
de werkafspraken in **[AGENTS.md](AGENTS.md)**. De broncode staat in `app/` (de hele web-app is
`app/src/main/assets/index.html`), spelbronnen in `games/`, tests in `tests/`.

Elke wijziging op `main` wordt automatisch getest, gebouwd, ondertekend en gepubliceerd (GitHub Actions → *Release*).
`update.json`, `web/`, `apk/` en `changelog.json` zijn de gepubliceerde versie: niet met de hand wijzigen.
