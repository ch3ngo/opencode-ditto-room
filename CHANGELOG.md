# Changelog

All notable changes to this project are recorded here. Dates use DD/MM/YYYY.

## 1.0.0 (02/11/2026)

First standalone public release, tested with OpenCode 2.2.4.

- Engine v10 and art v10 in two files, `tui.tsx` and `art.ts`, with no build step.
- Full-bleed 38-cell pixel-art room in the session sidebar footer, 15 to 20 text rows tall depending on the terminal.
- One pink Ditto per active direct child session, with pop-in and pop-out.
- Shiny blue companion Dittos: 0 active agents gives 2 blue, 1 gives 1 pink plus 1 blue, 2 or more gives pink only.
- At most 8 Dittos drawn at once, with a `+N` queue badge.
- Solo behaviour, chats, speech bubbles, soft foot shadows and ambient object pixels.
- Depth-aware overlap with a same-plane no-overlap rule.
- Responsive room height from 28 to 44 terminal rows, hidden below 28.
- Environment settings: `OC_DITTO_DEMO`, `OC_DITTO_MIN_HEIGHT`, `OC_DITTO_AMBIENT` and the compatibility flag `OC_DITTO_ALWAYS`.
- Static art contract tests and repository hygiene checks.
