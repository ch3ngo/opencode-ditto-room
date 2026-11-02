# Scenes

Status: integrated in v1.1.0, 02/11/2026. The runtime selects one of six scenes at startup. The Living Room is the default fallback, and the other five are full runtime scenes, not preview-only artwork.

## Scene list and stable IDs

| ID | Scene | Direction |
|---|---|---|
| `living-room` | Living Room | Cream wall, tan floor, window, bookcase, floor lamp, dog bed and large teal rug. Reuses the existing `art.ts` scene exports. |
| `mountain-meadow` | Mountain Meadow | Pale sky, two flat mountain silhouettes, fir trees at the corners, open grass, sparse flower ambient pixels. |
| `japanese-garden` | Japanese Garden | Cream wall with timber trim, bamboo at both sides, small stone lantern, open sand with rake lines, corner moss, a small rear-edge pond with ripple pixels, leaf, lantern and water ambient pixels. |
| `office` | Office | Desk and monitor at the rear, office chair, filing cabinet and wall clock at the edges, open carpet, screen, LED and clock ambient pixels. |
| `arcade` | Arcade | Three colourful cabinets at the rear and corners, a lit marquee sign, open floor, screen and sign ambient pixels. |
| `football-stadium` | Football Stadium | Generic tiered stands with crowd dots, goal and net, corner flags, green pitch with halfway line and centre circle, floodlight and crowd ambient pixels. No team logos. |

## Selection

- `OC_DITTO_SCENE=<id>` pins a valid scene for the whole TUI lifetime.
- Unset or `OC_DITTO_SCENE=random` picks one scene once, when the plugin module loads.
- An invalid value falls back to `living-room` and logs `scene: living-room (fallback)`. The invalid value is not logged.
- Resizes, tabs and child sessions keep the same scene. The choice is startup-only; restart to change it.
- There is no live scene-switch UI and no persistence of the random choice.

## Ambient animation

Every scene has at least one changing entry in its `anim` list. The shared 600 ms ambient clock paints the selected scene's entries. `OC_DITTO_AMBIENT=0` stops all of them, including the Japanese Garden water ripples. The Dittos still move when ambient is off.

Each ambient entry's first frame equals the pixel already drawn underneath, so step 0 is the plain room. The preview tools show animation step 1 so the candidate pixels are visible.

## Japanese Garden pond

The pond is a flat rear-edge prop at `x=19..32`, in the first four floor rows below the wall. It leaves the central and front walking floor open. The engine has no terrain collision, so a Ditto that walks onto the rear edge can overlap the pond, but it does not block movement and adds no new mechanics. It is decoration, not a walkable water surface.

Two water ripple entries are ambient candidates:

- `x=22`, `dy=1`, frames `v/x/v`, every 6.
- `x=28`, `dy=1`, frames `v/x/v`, every 8.

They run through the shared ambient clock in the integrated runtime.

## Architecture

- `art.ts` holds the shared Ditto sprite sets, emote, bubble and badge art, plus the Living Room scene exports. It has no imports.
- `scenes.ts` holds the six `Scene` definitions, stable IDs and `chooseScene`. The Living Room entry references the `art.ts` exports, so the default cannot drift.
- `tui.tsx` chooses the scene once, then paints the selected scene's wall, baseboard, floor, seams, objects, points of interest and ambient entries through the same compositor used for the Living Room.
- `tools/render-scenes.mjs` renders the six scenes to PNGs for local preview. It uses the same scene data and shared Ditto sprites as the runtime.
- `tools/make-sheets.py` lays out the local contact sheets and updates the two public tall sheets in `docs/`.

## Public and local previews

Tracked public previews:

- `docs/scenes-contact-sheet.png`
- `docs/dittos-contact-sheet.png`

The full local set is written to the gitignored `previews/` directory, including compact and tall scene images and Ditto scale images. Those are review artifacts, not release assets.

## Reproduce

```bash
node --test tests/*.test.mjs
node tools/render-scenes.mjs
python3 tools/make-sheets.py
```

The scene tests validate palette keys, object bounds, point-of-interest spots, ambient bounds, first-frame equality, every scene having a changing ambient entry, and the Living Room equality at compact 15 text rows with a 16 px floor and tall 20 text rows with a 22 px floor.
