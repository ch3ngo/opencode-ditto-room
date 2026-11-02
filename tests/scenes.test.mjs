import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  PALETTE,
  ROOM_W,
  BASEBOARD,
  WALL_COLOR,
  FLOOR_COLOR,
  FLOOR_SEAM_COLOR,
  FLOOR_SEAMS,
  FLOOR_SEAM_FROM,
  OBJECTS,
  POIS,
  ANIM,
  EMOTE_NAMES,
  DITTO_SETS,
} from "../art.ts"
import { SCENES, SCENE_IDS, chooseScene } from "../scenes.ts"

const HEX = /^#[0-9a-f]{6}$/i
const EXPECTED_IDS = [
  "living-room",
  "mountain-meadow",
  "japanese-garden",
  "office",
  "arcade",
  "football-stadium",
]

// The two preview geometries: compact 15 text rows (30 px, 16 px floor) and tall
// 20 text rows (40 px, 22 px floor). These match the runtime tiers.
const GEOMETRIES = [
  { label: "compact", rows: 15, floorRows: 16 },
  { label: "tall", rows: 20, floorRows: 22 },
]

const geometry = ({ rows, floorRows }) => {
  const h = rows * 2
  const floorTop = h - floorRows
  return { h, floorTop, floorMin: floorTop, floorMax: h - 2, floorRows }
}

const objectTopAndBottom = (object, g) => {
  const fromBottom = object.from === "bottom"
  const anchor = fromBottom ? g.floorMax : g.floorTop
  const last = fromBottom ? anchor - object.bottom : anchor + object.bottom
  return { top: last - (object.rows.length - 1), last }
}

const checkRows = (rows, palette, label) => {
  for (const [y, row] of rows.entries()) {
    for (const [x, ch] of [...row].entries()) {
      if (ch === ".") continue
      assert.ok(palette[ch], `${label}: (${x},${y}) uses '${ch}', which is not in the scene palette`)
    }
  }
}

// Background keys before ambient pixels, matching the renderer's order. Used to
// prove that each ambient entry's first frame is the pixel already drawn there.
const backgroundKeys = (scene, geo) => {
  const buf = Array.from({ length: geo.h }, () => Array(ROOM_W).fill(scene.wall))
  const baseTop = geo.floorTop - scene.baseboard.length
  for (const [i, row] of scene.baseboard.entries()) {
    for (const [x, ch] of [...row].entries()) if (ch !== ".") buf[baseTop + i][x] = ch
  }
  for (let y = geo.floorTop; y < geo.h; y++) {
    for (let x = 0; x < ROOM_W; x++) buf[y][x] = scene.floor
  }
  for (const x of scene.floorSeams) {
    for (let y = geo.floorTop + scene.floorSeamFrom; y < geo.h; y++) buf[y][x] = scene.floorSeam
  }
  for (const object of scene.objects) {
    const fromBottom = object.from === "bottom"
    const anchor = fromBottom ? geo.floorMax : geo.floorTop
    const last = fromBottom ? anchor - object.bottom : anchor + object.bottom
    const top = last - (object.rows.length - 1)
    for (const [py, row] of object.rows.entries()) {
      for (const [px, ch] of [...row].entries()) if (ch !== ".") buf[top + py][object.x + px] = ch
    }
  }
  return buf
}

test("six scenes with unique ids and names", () => {
  assert.equal(SCENES.length, 6)
  assert.deepEqual(SCENES.map((s) => s.id), EXPECTED_IDS)
  assert.deepEqual(SCENE_IDS, EXPECTED_IDS)
  assert.equal(new Set(SCENES.map((s) => s.name)).size, 6)
})

test("every scene has a real changing ambient candidate", () => {
  for (const scene of SCENES) {
    assert.ok(scene.anim.length > 0, `${scene.id}: no ambient entries`)
    assert.ok(
      scene.anim.some((a) => new Set(a.frames).size > 1),
      `${scene.id}: every ambient frame set is static`,
    )
  }
})

test("chooseScene pins valid ids, randomizes on unset or random, and falls back safely", () => {
  for (const id of SCENE_IDS) {
    const choice = chooseScene(id, () => 0.5)
    assert.equal(choice.scene.id, id)
    assert.equal(choice.source, "explicit")
  }
  assert.equal(chooseScene("office", () => 0.99).scene.id, "office")
  assert.equal(chooseScene(" Office ", () => 0.99).source, "explicit")
  assert.equal(chooseScene("random", () => 0).scene.id, "living-room")
  assert.equal(chooseScene("random", () => 0.999).scene.id, "football-stadium")
  assert.equal(chooseScene(undefined, () => 0).scene.id, "living-room")
  assert.equal(chooseScene(undefined, () => 0.999).scene.id, "football-stadium")
  assert.equal(chooseScene("not-a-scene", () => 0.5).scene.id, "living-room")
  assert.equal(chooseScene("not-a-scene", () => 0.5).source, "fallback")
  assert.equal(chooseScene("japanese-garden", () => 0).source, "explicit")
  assert.equal(chooseScene("japanese-garden", () => 0).scene.id, "japanese-garden")
})

test("living room preview entry is the runtime art", () => {
  const living = SCENES[0]
  assert.equal(living.palette, PALETTE)
  assert.equal(living.wall, WALL_COLOR)
  assert.equal(living.floor, FLOOR_COLOR)
  assert.equal(living.floorSeam, FLOOR_SEAM_COLOR)
  assert.equal(living.floorSeamFrom, FLOOR_SEAM_FROM)
  assert.equal(living.baseboard, BASEBOARD)
  assert.equal(living.objects, OBJECTS)
  assert.equal(living.pois, POIS)
  assert.equal(living.anim, ANIM)
  assert.deepEqual(living.floorSeams, FLOOR_SEAMS)
})

test("every scene palette is flat six-digit hex with one-character keys", () => {
  for (const scene of SCENES) {
    for (const [key, value] of Object.entries(scene.palette)) {
      assert.equal(key.length, 1, `${scene.id}: palette key ${key} must be one character`)
      assert.notEqual(key, ".", `${scene.id}: '.' is transparent and must not be a palette key`)
      assert.match(value, HEX, `${scene.id}: palette key ${key}`)
    }
    assert.ok(scene.palette[scene.wall], `${scene.id}: wall key missing`)
    assert.ok(scene.palette[scene.floor], `${scene.id}: floor key missing`)
    assert.ok(scene.palette[scene.floorSeam], `${scene.id}: floor seam key missing`)
  }
})

test("every scene background and object uses its palette and fits ROOM_W", () => {
  for (const scene of SCENES) {
    for (const [i, row] of scene.baseboard.entries()) {
      assert.equal(row.length, ROOM_W, `${scene.id}: baseboard row ${i} width`)
      checkRows([row], scene.palette, `${scene.id} baseboard ${i}`)
    }
    for (const object of scene.objects) {
      assert.ok(Number.isInteger(object.x) && object.x >= 0, `${scene.id}/${object.name}: x`)
      assert.ok(Array.isArray(object.rows) && object.rows.length > 0, `${scene.id}/${object.name}: rows`)
      const widest = Math.max(...object.rows.map((r) => r.length))
      assert.ok(object.x + widest <= ROOM_W, `${scene.id}/${object.name}: width exceeds ROOM_W`)
      checkRows(object.rows, scene.palette, `${scene.id}/${object.name}`)
    }
  }
})

test("every object fits the compact and tall room geometry", () => {
  for (const scene of SCENES) {
    for (const g of GEOMETRIES) {
      const geo = geometry(g)
      assert.ok(scene.baseboard.length <= geo.floorTop, `${scene.id}/${g.label}: baseboard is taller than the wall`)
      for (const object of scene.objects) {
        const { top, last } = objectTopAndBottom(object, geo)
        assert.ok(top >= 0, `${scene.id}/${object.name}/${g.label}: top ${top} is above the room`)
        assert.ok(last < geo.h, `${scene.id}/${object.name}/${g.label}: bottom ${last} is below the room`)
      }
    }
  }
})

test("points of interest are legal standing spots at both geometries", () => {
  const sprite = DITTO_SETS[0]
  const half = Math.floor(sprite.w / 2)
  for (const scene of SCENES) {
    for (const poi of scene.pois) {
      assert.ok(EMOTE_NAMES.includes(poi.emote), `${scene.id}/${poi.name}: unknown emote ${poi.emote}`)
      assert.ok(poi.cx - half >= 0, `${scene.id}/${poi.name}: cx ${poi.cx} clips the left edge`)
      assert.ok(poi.cx - half + sprite.w <= ROOM_W, `${scene.id}/${poi.name}: cx ${poi.cx} clips the right edge`)
      for (const g of GEOMETRIES) {
        const geo = geometry(g)
        const feet = poi.at === "back" ? geo.floorTop + poi.offset : geo.floorMax - poi.offset
        assert.ok(feet >= geo.floorMin && feet <= geo.floorMax, `${scene.id}/${poi.name}/${g.label}: feet ${feet}`)
        assert.ok(feet - sprite.h + 1 >= 0, `${scene.id}/${poi.name}/${g.label}: sprite top clips`)
        assert.ok(feet < geo.h, `${scene.id}/${poi.name}/${g.label}: sprite bottom clips`)
      }
    }
  }
})

test("ambient first frames match the pixel already drawn", () => {
  for (const scene of SCENES) {
    for (const g of GEOMETRIES) {
      const geo = geometry(g)
      const buf = backgroundKeys(scene, geo)
      for (const anim of scene.anim) {
        const y = geo.floorTop + anim.dy
        assert.equal(
          buf[y][anim.x],
          anim.frames[0],
          `${scene.id}/${g.label}: ambient at (${anim.x}, ${y}) starts on '${buf[y][anim.x]}', not '${anim.frames[0]}'`,
        )
      }
    }
  }
})

test("ambient candidates stay inside both geometries and use scene palette keys", () => {
  for (const scene of SCENES) {
    for (const anim of scene.anim) {
      assert.ok(anim.x >= 0 && anim.x < ROOM_W, `${scene.id}: ambient x ${anim.x}`)
      assert.ok(anim.every >= 1, `${scene.id}: ambient every ${anim.every}`)
      assert.ok(anim.frames.length > 0, `${scene.id}: ambient frames`)
      for (const key of anim.frames) assert.ok(scene.palette[key], `${scene.id}: ambient '${key}' not in palette`)
      for (const g of GEOMETRIES) {
        const geo = geometry(g)
        const y = geo.floorTop + anim.dy
        assert.ok(y >= 0 && y < geo.h, `${scene.id}/${g.label}: ambient y ${y}`)
      }
    }
  }
})

const tuiSource = readFileSync(new URL("../tui.tsx", import.meta.url), "utf8")

test("tui.tsx wires the selected scene into background, POIs and ambient", () => {
  assert.match(tuiSource, /chooseScene\(process\.env\.OC_DITTO_SCENE\)/)
  assert.match(tuiSource, /const currentArt = CHOSEN\.scene/)
  assert.match(tuiSource, /const POIS = currentArt\.pois/)
  assert.match(tuiSource, /currentArt\.anim/)
  assert.match(tuiSource, /currentArt\.palette/)
  assert.match(tuiSource, /if \(!AMBIENT_ON\) return/)
  assert.match(tuiSource, /!AMBIENT_ON \|\| ANIM_DEFS\.length === 0/)
})
