# Scene previews, local and unapproved

Status: preview-only, 02/11/2026. Nothing here is committed or published. The
runtime still imports the Living Room fields from `art.ts` and has no scene
selector. The supported `OC_DITTO_COMPANIONS=0` toggle is unchanged.

## What is ready now

- Living Room is the current runtime default and uses the exact existing
  `art.ts` scene exports. `scenes.ts` references the same palette, objects,
  points of interest and ambient entries for this scene, so the preview data
  cannot drift from the plugin.
- The companion toggle works as documented in the README.
- The existing plugin runtime, tests and default scene are untouched by the
  preview tooling.

## Preview-only candidates

Six scenes are defined in `scenes.ts`:

| Scene | Direction |
|---|---|
| Living Room | Existing reference. Cream wall, tan floor, window, bookcase, lamp, dog bed, large teal rug. |
| Mountain Meadow | Pale sky, two simple mountain silhouettes, fir trees at the corners, open grass, sparse flower ambient pixels. |
| Japanese Garden | Cream wall with timber trim, bamboo at both sides, a small stone lantern, open sand with rake lines, corner moss, leaf and lantern ambient pixels. |
| Office | Pale grey wall, desk and monitor at the rear, office chair, filing cabinet and wall clock at the edges, open carpet. |
| Arcade | Medium indigo wall, three colourful cabinets at the rear and corners, a lit marquee sign, open purple floor, screen and sign ambient pixels. |
| Football Stadium | Pale sky, generic tiered stands with crowd dots, goal and net, corner flags, green pitch with halfway line and centre circle, floodlight and crowd ambient pixels. No team logos. |

All six follow the existing art rules: flat fills, no gradients, vignette,
dithering or contact shading; 38 pixels wide; compact and tall geometry; 14 x 11
Ditto; foot shadows; objects at the rear and corners with the walking floor open.
Outdoor scenes use an empty baseboard so the wall meets the ground directly.

## Architecture

- `art.ts` remains the runtime source of truth for the current default scene and
  the shared Ditto, emote, bubble and badge art.
- `scenes.ts` is a preview-only `Scene[]`. The Living Room entry imports the
  `art.ts` exports; the other five are new flat scene data. It uses a `.ts`
  extension on that import so the Node preview tests can load it without a
  bundler. The runtime does not import `scenes.ts` yet.
- `tools/render-scenes.mjs` is the shared preview generator. It uses the same
  floor/wall split, object anchoring, foot shadows, depth sort and Ditto sprite
  data as the plugin, writes PNGs with Node built-ins, and throws if any object
  or ambient pixel leaves the room. Previews show ambient entries at animation
  step 1 so the candidate pixels are visible; the runtime still starts from the
  plain first frame.
- `tools/make-sheets.py` only lays out the PNGs and draws labels outside the
  pixel art. Pillow is local preview tooling, not a runtime dependency.
- `previews/` is ignored by git. It holds generated local review images, not
  release assets.

## Approval status

Awaiting visual review of these local sheets:

- `previews/contact-sheet-scenes-tall.png`
- `previews/contact-sheet-scenes-compact.png`
- `previews/contact-sheet-dittos-tall.png`
- `previews/contact-sheet-dittos-compact.png`

Individual scene and Ditto PNGs are in the same directory. No selector, random
startup, scene persistence or runtime ambient integration has been added.

## Future, after approval

- Select a scene at startup, with Living Room as the default.
- Add optional random scene selection per OpenCode session start.
- Feed the selected `Scene` fields into the existing compositor. The per-scene
  `anim` candidates are already in the data and would use the existing ambient
  clock, so `OC_DITTO_AMBIENT=0` would still turn them off.
- Keep the current companion toggle and the existing default behavior.

None of the future items are implemented in the runtime.

## Reproduce

```bash
node --test tests/*.test.mjs
node tools/render-scenes.mjs
python3 tools/make-sheets.py
```

The scene tests validate palette keys, object bounds, point-of-interest standing
spots, ambient bounds and the Living Room equality at both preview geometries:
compact 15 text rows with a 16 px floor, and tall 20 text rows with a 22 px floor.
