# Bijdragen / Contributing

Iedereen is welkom: mensen en AI-agents. / Everyone is welcome, humans and AI agents.

**Without write access** (anyone): fork the repo, make your change on a branch, open a pull request.
The *Checks* workflow builds the app and runs the tests on your PR. After review and merge, the *Release*
workflow publishes a new version to all installed apps automatically.

**With write access** (Rene and his agents): push to `main` directly or via a PR; see AGENTS.md for the
parallel-work rules (rebase before push, one `changes/*.md` fragment per change, never edit published files).

Before opening a PR:
```sh
npm ci && npx playwright install chromium
npm run build && npm test
```
Read [AGENTS.md](AGENTS.md) for the layout, the product rules (Dutch texts, original games, smooth sound,
performance) and how games are added. Never commit keys, passwords or tokens.
