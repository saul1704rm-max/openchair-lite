# OpenChair Lite

OpenChair Lite is an offline-first workspace for Model United Nations chairs. It manages speakers, timers, moderated caucuses, motions, votes and a chronological session record without an account, backend or external service.

> OpenChair Lite is an independent open-source project and is not affiliated with the United Nations.

## Features

- Local multi-session storage with versioned JSON import/export and CSV log export.
- Speaker queue, resilient browser-based timer, keyboard shortcuts and optional sound preference.
- Moderated caucus, motion record, configurable majority calculations and bilingual interface.
- Installable web app metadata and an offline cache for the app shell.

## Install and run

```bash
pnpm install --ignore-scripts
pnpm dev
```

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before publishing. Use `pnpm test:e2e` for the primary browser flow.

## Usage

Create a session, paste delegations one per line, then add them to the speakers list. Space starts or pauses the timer, Right Arrow advances the speaker, `A` focuses speaker entry, and `R` resets the timer. Export a JSON backup from the workspace header.

## Architecture

The App Router UI lives in `app/`. Session types, voting calculations, translations, and safe browser storage are in `lib/`. Data is stored in `localStorage` under `openchair-lite:sessions`; nothing is transmitted to a server. Exported files carry `version: 1` so future releases can migrate earlier sessions.

## Privacy

OpenChair Lite stores session data only in the browser on the device being used. Clearing browser storage can remove local sessions, so export an important session as JSON.

## Contributing and roadmap

Read [CONTRIBUTING.md](CONTRIBUTING.md). Planned improvements include deeper print layouts, optional timer sounds, and expanded parliamentary templates. This project uses the MIT license.
