# opencode-ditto-room

A pixel-art Ditto room for the OpenCode TUI session sidebar. Every active direct child session gets a pink Ditto. When companions are enabled (the default) and fewer than two agents are running, shiny blue companion Dittos keep the room populated. The room uses one of six flat scenes, chosen once per TUI startup.

![The Ditto room at 20 rows with one pink Ditto and one blue companion](preview.png)

Status: v1.1.0, tested with OpenCode 2.2.4. Three source files, no build step, no npm dependencies at runtime.

## What it does

- Draws a full-bleed, 38-cell-wide pixel-art room at the bottom of the session sidebar, directly above the built-in cwd and branch line.
- Draws one of six scenes: Living Room, Mountain Meadow, Japanese Garden, Office, Arcade or Football Stadium. The scene is chosen once at startup. Unset or `random` picks one; a stable ID pins it.
- Every scene has its own ambient animation: window and lamp glints, flowers, bamboo and water ripples, office screen and clock pixels, arcade screens and marquee bulbs, stadium floodlight and crowd flashes. `OC_DITTO_AMBIENT=0` stops all of them.
- Shows one pink Ditto per direct child session that is active right now. A Ditto pops in when its child starts and pops out when it ends.
- Keeps a minimum of two Dittos on screen when companions are enabled (the default): 0 active agents gives 2 blue companions, 1 gives 1 pink plus 1 blue, 2 or more gives pink only. With `OC_DITTO_COMPANIONS=0`, only real active agents appear.
- Draws at most 8 Dittos and queues the rest, shown as a `+N` badge.
- Animates solo behaviour (wander, visit, dance, jump, look around, emote, nap), chats between Dittos, speech bubbles, foot shadows and the selected scene's ambient pixels.
- Uses depth-aware overlap: Dittos at different floor depths may pass behind each other, while Dittos on the same plane keep their distance.
- Reads only local session state. It makes no network requests and writes no state files.

## Requirements

- OpenCode 2.2.4 is the tested version. The TUI plugin data and slot APIs are not stable across OpenCode releases, so another version may need code changes.
- A terminal at least 28 rows tall. The room is hidden below 28 rows. The default OpenCode layout also needs roughly 122 columns or more, because the session sidebar is 42 cells wide and the room is 38 cells wide.
- A terminal with 24-bit colour support is recommended. The art uses `#rrggbb` values directly and does not read the OpenCode theme.
- Node.js 22.18 or newer only for the test suite and local preview tools. OpenCode loads the TypeScript sources itself, so Node is not needed to use the plugin.

## Install

Find the OpenCode config directory (the one containing `cli.json`):

```bash
opencode debug paths
```

Clone the repository and copy all three plugin files into a new directory under `tui-plugins/`:

```bash
CONFIG="$(opencode debug paths | awk '$1 == "config" { print $2 }')"
git clone https://github.com/ch3ngo/opencode-ditto-room.git
mkdir -p "$CONFIG/tui-plugins/ditto-room"
cp opencode-ditto-room/tui.tsx opencode-ditto-room/art.ts \
  opencode-ditto-room/scenes.ts "$CONFIG/tui-plugins/ditto-room/"
```

Add the plugin to the `plugins` array in `cli.json` inside that config directory. If the file already lists other plugins, add this one string to the existing array and leave the other entries alone:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "./tui-plugins/ditto-room"
  ]
}
```

Restart the OpenCode TUI. The room appears at the bottom of the session sidebar.

To confirm that it loaded:

```bash
opencode plugin list
cat /tmp/opencode-ditto-room.log
```

`plugin list` should show the directory as a local plugin. The log should contain `slot placement:`, `art loaded v10` and a line like `scene: office (explicit)` or `scene: japanese-garden (random)`.

### Update

Copy all three files together. The engine, shared art and scene data are one set:

```bash
cd opencode-ditto-room
git pull
CONFIG="$(opencode debug paths | awk '$1 == "config" { print $2 }')"
cp tui.tsx art.ts scenes.ts "$CONFIG/tui-plugins/ditto-room/"
```

Restart the TUI. Do not mix a `tui.tsx` from one version with an `art.ts` or `scenes.ts` from another. If `scenes.ts` is missing, the plugin cannot load.

### Uninstall

Remove `"./tui-plugins/ditto-room"` from the `plugins` array in `cli.json`, delete the directory, and restart:

```bash
CONFIG="$(opencode debug paths | awk '$1 == "config" { print $2 }')"
rm -r "$CONFIG/tui-plugins/ditto-room"
rm -f /tmp/opencode-ditto-room.log
```

## Configuration

Set these environment variables before starting the TUI:

| Variable | Default | Effect |
|---|---|---|
| `OC_DITTO_SCENE` | `random` | Stable scene ID from the table below pins the scene. Unset or `random` picks one scene once per TUI start. An invalid value falls back to Living Room and logs `scene: living-room (fallback)`. Read at startup; restart to change. |
| `OC_DITTO_DEMO` | off | Integer 1 to 12. Ignores real session data and animates N fake agent Dittos through the normal spawn and queue logic, plus the companions the minimum rule requires when companions are enabled. Useful for previewing behaviour without starting subagents. |
| `OC_DITTO_COMPANIONS` | on | `0` disables the blue filler companions. Any other value, or leaving it unset, keeps them on. Only real active agent Dittos remain; with 0 agents the room can be empty. |
| `OC_DITTO_MIN_HEIGHT` | `28` | Hides the room when `process.stdout.rows` is below this value. Must be an integer from 0 to 1000. Values below 28 have no practical effect because the room cannot render below 28 terminal rows. |
| `OC_DITTO_AMBIENT` | on | `0` stops the ambient pixel animation for the selected scene. Any other value, or leaving it unset, keeps it on. |
| `OC_DITTO_ALWAYS` | on | Empty-room visibility flag, kept for compatibility. With companions enabled (the default) the room is never empty, so it has no practical effect. With `OC_DITTO_COMPANIONS=0` and 0 active agents, `0` hides the empty room; any other value or unset keeps it visible. |

Examples:

```bash
OC_DITTO_SCENE=japanese-garden opencode
OC_DITTO_SCENE=random opencode
OC_DITTO_SCENE=office OC_DITTO_COMPANIONS=0 opencode
OC_DITTO_AMBIENT=0 opencode
OC_DITTO_DEMO=2 opencode
```

There is no `OC_DITTO_ROOM_ROWS`. The room height is derived from the terminal on every resize.

## Scenes

| ID | Scene | Direction |
|---|---|---|
| `living-room` | Living Room | Cream wall, tan floor, window, bookcase, floor lamp, dog bed and large teal rug. Current reference scene. |
| `mountain-meadow` | Mountain Meadow | Pale sky, two flat mountain silhouettes, small fir trees at the corners, open grass, sparse flower ambient pixels. |
| `japanese-garden` | Japanese Garden | Cream wall with timber trim, bamboo at both sides, small stone lantern, open sand with rake lines, corner moss, a small rear-edge pond with ripple pixels, leaf, lantern and water ambient pixels. |
| `office` | Office | Desk and monitor at the rear, office chair, filing cabinet and wall clock at the edges, open carpet, screen, LED and clock ambient pixels. |
| `arcade` | Arcade | Three colourful cabinets at the rear and corners, a lit marquee sign, open floor, screen and sign ambient pixels. No dark shading obscures the geometry. |
| `football-stadium` | Football Stadium | Generic tiered stands with crowd dots, goal and net, corner flags, green pitch with halfway line and centre circle, floodlight and crowd ambient pixels. No team logos. |

How selection works:

- A valid `OC_DITTO_SCENE` ID pins that scene for the whole TUI lifetime.
- Unset or `OC_DITTO_SCENE=random` picks one scene once, when the plugin module loads. Resizes, tabs and child sessions do not change it.
- An invalid value falls back to Living Room and logs a fallback line. The invalid value itself is not logged.
- Scene choice is startup-only. There is no live scene-switch UI and no persistence of the random choice. Restart the TUI to change it.
- `OC_DITTO_AMBIENT=0` stops every scene's ambient pixels, including the Japanese Garden water ripples.

The Japanese Garden pond is a flat rear-edge prop at `x=19..32`, in the first four floor rows below the wall. There is no terrain collision in the current engine, so a Ditto that walks onto the rear edge can overlap the pond, but it does not block movement and adds no new mechanics. The central and front walking floor stay open.

![Six Ditto room scenes](docs/scenes-contact-sheet.png)

![Ditto scale, foot shadows and depth](docs/dittos-contact-sheet.png)

The public sheets show the tall geometry. The local preview tools can regenerate compact and tall sheets; see `docs/scenes.md`.

## Customization

The visual art is split across three files:

- `art.ts`: shared Ditto sprite sets, emote, bubble and badge art, plus the Living Room scene exports. It has no imports.
- `scenes.ts`: the six scene definitions, stable IDs and `chooseScene`. The Living Room entry reuses the `art.ts` exports, so the default cannot drift.
- `tui.tsx`: scene selection, compositor, Ditto movement, population and session tracking.

There is no build step. Edit the relevant file and restart the TUI. Keep all three files in the same directory.

### Scene data

Each `Scene` in `scenes.ts` has:

| Field | Meaning |
|---|---|
| `id`, `name` | Stable startup ID and display name. |
| `palette` | Character to `#rrggbb` map for this scene. `.` is transparent. |
| `wall`, `floor`, `floorSeam` | Palette keys for the wall, floor and floor seams. |
| `baseboard` | Rows drawn at the bottom of the wall, top row first. Outdoor scenes use an empty array. |
| `floorSeams`, `floorSeamFrom` | Seam columns and how many rows below the floor top the seams start. |
| `objects` | Floor-anchored furniture, painted back to front. Each entry has `{ name, x, bottom, from?, rows }`. `bottom` is the offset of the object's last row from the floor top, or from the deepest usable floor row when `from` is `"bottom"`. Rows are bottom aligned and `.` is transparent. |
| `pois` | Visit points `{ name, cx, at, offset, emote }`. `at` is `"back"` or `"front"`; `emote` must be in `EMOTE_NAMES`. |
| `anim` | Ambient pixels `{ x, dy, frames, every }`. `dy` is relative to the floor top, `frames` are palette keys, and the first frame must equal the pixel already drawn underneath. |

The Living Room's scene fields are the `art.ts` exports (`PALETTE`, `WALL_COLOR`, `BASEBOARD`, `FLOOR_COLOR`, `FLOOR_SEAM_COLOR`, `FLOOR_SEAMS`, `FLOOR_SEAM_FROM`, `OBJECTS`, `POIS`, `ANIM`). The other five scenes define their own fields.

Keep every object inside `ROOM_W`. The smallest supported room has a 14-pixel wall, so wall props taller than that will clip. The scene tests reject an object that does not fit the compact or tall geometry.

### Colours

Each scene palette maps one character to one `#rrggbb` colour. Change a value to recolour every pixel that uses that key. `.` is not a palette key and means transparent.

Ditto body colours use the shared `art.ts` frames. `DITTO_COLORS.agent` is empty, so pink Dittos use `PALETTE`. `DITTO_COLORS.companion` overrides the body keys with blue for companions. Missing keys fall back to `PALETTE`, which is why the eyes and tongue are shared.

### Ditto frames and sizes

`DITTO_SETS` is a list ordered from the back of the floor to the front. Each set has `w`, `h` and nine frames: `idle`, `squash`, `blink`, `happy`, `sad`, `laugh`, `wobbleL`, `wobbleR`, `stretch`. Every frame in a set must have the same width and height, with `h` rows of `w` characters, bottom aligned.

The current art ships one 14 x 11 set. The engine reads `w` and `h` from the set, so adding another set is supported by the renderer and the depth band logic, but it is an advanced change: positions, collision boxes, chat spacing and bubbles all use the set dimensions. There is no supported setting for per-session sprite size.

### Points of interest and ambient pixels

- Each scene's `pois` list gives the places a lone Ditto may visit. `cx` is the horizontal centre, `at` is `"back"` (floor top plus offset) or `"front"` (last usable feet row minus offset), and `emote` must be one of `EMOTE_NAMES`. Every point must be a legal standing spot at every supported height.
- Each scene's `anim` list defines ambient pixels as `{ x, dy, frames, every }`. `every` is the number of 600 ms ambient ticks per step. The first frame must match the pixel already drawn by the object underneath, so step 0 is the plain room. Every scene ships at least one entry with more than one frame colour.

### Blue companions

Companions are enabled by default. Disable them with:

```bash
OC_DITTO_COMPANIONS=0 opencode
```

With companions disabled, no synthetic filler Dittos are created. Only real active agents appear:

| Active agents | Companions enabled (default) | `OC_DITTO_COMPANIONS=0` |
|---|---|---|
| 0 | 2 blue companions | none, empty room |
| 1 | 1 pink plus 1 blue | 1 pink |
| 2 or more | one pink per active agent | one pink per active agent |

Agents keep their real session ids, active detection, overflow queue and cap. There are no phantom children and no synthetic ids in the log. Any existing companions are removed through the normal pop-out path.

The empty room at 0 agents follows the existing visibility rules: it stays visible while `OC_DITTO_ALWAYS` is unset or not `0` (the default), and `OC_DITTO_ALWAYS=0` hides it. `OC_DITTO_MIN_HEIGHT` and the terminal height gate apply exactly as before. With the room visible, ambient pixels keep moving unless `OC_DITTO_AMBIENT=0`; with the room hidden, nothing is drawn.

The exported `companionTarget` function is the policy point if you maintain a fork, but changing the built-in default is not needed for the supported toggle. The environment variable is read when the TUI starts, so restart after changing it.

### Behaviour knobs

These constants in `tui.tsx` control the runtime:

| Constant | Current value | Effect |
|---|---|---|
| `MAX_DITTOS` | 8 | Maximum number drawn at once. Extra Dittos wait in the queue and appear in the `+N` badge. |
| `TICK_MS` | 200 | Ditto animation tick. |
| `AMBIENT_MS` | 600 | Ambient pixel tick. |
| `SAME_DEPTH_PX` | 4 | Feet rows within this distance are treated as the same plane and may not overlap. |
| `CHAT_PAD`, `CHAT_DY`, `CHAT_GAP` | 6, 8, 2 | Chat reach and spacing. |
| `pickAction` weights | wander 35, visit 20, lookaround 15, dance 10, jump 10, emote 5, nap 5 | Solo behaviour probabilities. The nap weight is only added after 3 actions and with fewer than 3 Dittos drawn. |

## Roadmap

Scenes are selected at startup. Live scene switching without a restart is not implemented, and the random choice is not persisted. Further scene art revisions and additional scene data are possible without changing the compositor.

## Compatibility and limitations

- Tested with OpenCode 2.2.4. The plugin depends on the TUI `Plugin.define`, `context.data`, `context.ui.slot` and session family/status APIs. A future OpenCode release may rename or change them. The plugin catches read failures and renders nothing rather than breaking the sidebar, but it cannot paper over a removed API.
- Install `tui.tsx`, `art.ts` and `scenes.ts` together. A missing `scenes.ts` means the plugin cannot load, and an old `tui.tsx` with a new `scenes.ts` (or the reverse) is not supported.
- The hard minimum is 28 terminal rows. `OC_DITTO_MIN_HEIGHT` can hide the room earlier, but it cannot make it render below 28 rows.
- The room is designed for the default 42-cell sidebar. Terminals narrower than roughly 122 columns can clip the sidebar or the room.
- Six scenes, one sprite size, at most 8 Dittos drawn. Everything beyond the cap is queued, not dropped.
- Scene choice is read at startup. Resize, tab and child-session changes keep the same scene. A restart is needed to change an explicit scene or draw a new random one.
- `OC_DITTO_AMBIENT=0` stops all ambient pixels. The Dittos still move; it does not freeze the rest of the room.
- The Japanese Garden pond has no terrain collision. It is a rear-edge decoration and a Ditto can overlap it if it walks onto that edge.
- Spawn and despawn depend on real active direct child sessions. Real lifecycle testing needs a model call and is not covered by the offline test suite.
- In headless testing, a session with no live assistant activity still showed OpenCode's large empty-state sidebar graphic over the sidebar plugin area, hiding the room. The plugin loaded and composed its frames during that time. If the room is not visible right after install, open or continue a session with conversation content and restart the TUI. Normal active sessions are the intended case.
- The rendering was verified from tmux captures. Native terminal colours, light terminal themes and very long sessions with many agents have not been exhaustively tested.
- The log at `/tmp/opencode-ditto-room.log` is appended to and is not rotated. It records load and unload, slot placement, art version, scene ID and source, room height changes, population counts and error messages. It never records session ids, prompts or task text.

## Verification

Run the dependency-free checks:

```bash
node --test tests/*.test.mjs
```

The tests validate the art contract: palette keys, row widths, frame names and sizes, object bounds, emote, bubble and glyph sizes, point-of-interest bounds, ambient frames, the relative imports in `tui.tsx`, the companion policy and its environment wiring, the six scene data and selection helper, and the absence of private paths and attribution trailers in shipped text files. They also confirm the MIT license and the PNG previews.

Manual TUI verification for v1.0.0 was done on 02/11/2026 with OpenCode 2.2.4 in tmux at terminal sizes from 140x28 to 140x44 and 122x34, using `OC_DITTO_DEMO` 1, 2 and 8, a childless session for 0 agents, and ambient on and off. The checked points were:

- 15 to 20 room rows across 28 to 44 terminal rows, with the floor depth preserved per tier.
- 0 unexplained pixels and no prop clipping at every height.
- Population 0 gives 2 blue, 1 gives 1 pink plus 1 blue, 2 gives pink only.
- Demo 8 draws 6 plus 2 queued at 34 rows and 8 at 40 rows.
- A 40 to 34 to 44 to 36 to 35 to 28 to 40 resize run with no `overlap fixed` entries.

Manual TUI verification for v1.1.0 was done on 02/11/2026 with a throwaway `OPENCODE_CONFIG_DIR` and `OC_DITTO_DEMO` 0, 1, 2 and 8, with `OC_DITTO_COMPANIONS` unset and `0`. The plugin log showed `companions: 2` at 0 agents, `1` at 1 agent and `0` at 2 or more with the default, and `0` for all four populations when companions were disabled, with no phantom companion ids. A color capture of the visible room showed zero blue companion body pixels when disabled at 0, 1 and 2 agents, and blue plus pink with the default at 1 agent. Visibility was checked through a temporary prompt-footer mount, because the headless empty-session sidebar covers sidebar plugin slots. With 0 agents, companions disabled and `OC_DITTO_ALWAYS` at its default, the empty room stayed visible; `OC_DITTO_ALWAYS=0` hid it; with 2 agents, `OC_DITTO_ALWAYS=0` did not hide it; with companions enabled, `OC_DITTO_ALWAYS=0` also did not hide it because the two companions keep the room non-empty; `OC_DITTO_MIN_HEIGHT=40` at 34 rows hid it. Room heights were rechecked from 28 to 44 terminal rows and the hidden case at 27.

Scene integration verification for v1.1.0 used the same throwaway TUI setup with the visible-slot test copy. All six scenes were checked at tall 44-row, compact 34-row and intermediate 38-row terminals. Every scene changed between two ambient samples with `OC_DITTO_AMBIENT` on, and every tall scene stayed byte-identical between two samples with `OC_DITTO_AMBIENT=0`. Explicit scene IDs, random selection, invalid fallback, resize stability, 0/1/2/8 populations and companion on/off were also checked. The scene data tests cover every object, point of interest and ambient entry at compact and tall geometry.

Not verified: real spawn and despawn on a live subagent, native terminal colours outside tmux, and the 4-pixel depth threshold over a long real session.

## Project layout

```
art.ts                     shared Ditto/emote/bubble/badge art and Living Room scene
scenes.ts                  six scene definitions, stable IDs and chooseScene
tui.tsx                    plugin, scene selection, compositor, movement and sessions
tests/art.test.mjs         art contract checks
tests/companions.test.mjs  companion policy and env wiring checks
tests/scenes.test.mjs      scene data, selection, geometry and ambient checks
tests/repo.test.mjs        license, privacy and preview checks
tools/render-scenes.mjs    local PNG scene renderer
tools/make-sheets.py       local contact sheets and public tall previews
docs/scenes.md             scene reference and selection details
docs/scenes-contact-sheet.png  public six-scene preview
docs/dittos-contact-sheet.png  public Ditto scale and depth preview
preview.png                Living Room preview
LICENSE                    MIT license for the code
CHANGELOG.md               release history
```

`previews/` is a local ignored directory for the full set of generated review images. The two tall sheets in `docs/` are the sanitized public previews referenced above.

## Ditto and Pokémon

Ditto is a Pokémon character. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc. Ditto and all related character rights belong to their respective owners.

This is an unofficial, unaffiliated, noncommercial fan project. The author does not sell it and earns nothing from it. The MIT license covers the original plugin code only. It does not grant any rights to Ditto, Pokémon, any other character, or any trademark. The noncommercial intent stated here is not a permission from the rights holders and does not relicense any third-party material.

## License

The original code in this repository is released under the MIT License. See [LICENSE](LICENSE). The Ditto and Pokémon notice above applies to the character and trademark material.
