# Changelog

All notable changes to this project are recorded here. Dates use DD/MM/YYYY.

## 1.2.0 (18/11/2026)

- Add a show/hide switch one blank line below the room: `Ditto ━━━━● on` when shown, `Ditto ●━━━━ off` when hidden, success track with a round thumb when on and a muted one when off. The whole row is clickable.
- Add the palette command `ditto-room.toggle`, listed as `Hide Ditto room` or `Show Ditto room`. No default keybind.
- Persist the choice across restarts in `$XDG_STATE_HOME/opencode-ditto-room/state.json` (`~/.local/state/opencode-ditto-room/state.json` when unset), one boolean, file 0600 inside a 0700 directory.
- Add `OC_DITTO_HIDDEN=1/0` to force the room hidden or shown at startup; it wins over the state file.
- While hidden, two lines take the room's place: the current session's plan progress with its in-progress item cut at 30 characters, then the running, done and failed counts of the current session tree. The room is unmounted, so its ticker and ambient clock stop.
- Add toggle tests for the env parsing, the precedence rule, the state file round-trip and modes, the summary lines and the switch glyphs.

## 1.1.0 (02/11/2026)

- Add the `OC_DITTO_COMPANIONS=0` toggle. Companions stay on by default, so the minimum-two behaviour is unchanged; disabled, only real active agents appear, with no synthetic ids or phantom children.
- The empty room keeps its visibility semantics: `OC_DITTO_ALWAYS` and `OC_DITTO_MIN_HEIGHT` behave as before.
- Add six integrated scenes: Living Room, Mountain Meadow, Japanese Garden, Office, Arcade and Football Stadium, with stable IDs via `OC_DITTO_SCENE` (unset or `random` chooses once per startup, invalid falls back to Living Room).
- Every scene has ambient animation; `OC_DITTO_AMBIENT=0` stops all of it, including the new Japanese Garden pond ripples, which add no terrain collision.
- Ship `tui.tsx`, `art.ts` and `scenes.ts` as one three-file installation.
- Add public preview sheets, scene selection, geometry and ambient tests, and companion policy tests.

## 1.0.0 (02/11/2026)

First standalone public release, tested with OpenCode 2.2.4.

- Engine v10 and art v10 in two files, `tui.tsx` and `art.ts`, with no build step.
- Full-bleed 38-cell room in the session sidebar footer, 15 to 20 rows tall depending on the terminal, hidden below 28.
- One pink Ditto per active direct child session with pop-in and pop-out, plus blue companions (0 agents: 2 blue, 1: 1 pink plus 1 blue, 2 or more: pink only).
- At most 8 Dittos drawn with a `+N` queue badge, plus solo behaviour, chats, bubbles, foot shadows and ambient pixels.
- Depth-aware overlap with a same-plane no-overlap rule.
- Settings `OC_DITTO_DEMO`, `OC_DITTO_MIN_HEIGHT`, `OC_DITTO_AMBIENT` and `OC_DITTO_ALWAYS`, with art contract and repository hygiene tests.
