import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  ART_VERSION,
  PALETTE,
  ROOM_W,
  ROOM_H_MIN,
  ROOM_H_MAX,
  BASEBOARD,
  OBJECTS,
  DITTO_SETS,
  DITTO_COLORS,
  EMOTE_W,
  EMOTE_H,
  EMOTE_NAMES,
  EMOTES,
  BUBBLE_W,
  BUBBLE_H,
  BUBBLE,
  DIGIT_W,
  DIGIT_H,
  GLYPHS,
  POIS,
  ANIM,
} from "../art.ts"

const HEX = /^#[0-9a-f]{6}$/i
const FRAME_NAMES = ["idle", "squash", "blink", "happy", "sad", "laugh", "wobbleL", "wobbleR", "stretch"]

const checkRows = (rows, width, height, label) => {
  assert.equal(rows.length, height, `${label}: expected ${height} rows`)
  for (const [i, row] of rows.entries()) {
    assert.equal(row.length, width, `${label}: row ${i} is ${row.length} chars, expected ${width}`)
  }
}

test("art version and room dimensions are sane", () => {
  assert.equal(ART_VERSION, 10)
  assert.ok(Number.isInteger(ROOM_W) && ROOM_W > 0 && ROOM_W <= 80)
  assert.ok(Number.isInteger(ROOM_H_MIN) && ROOM_H_MIN > 0)
  assert.ok(Number.isInteger(ROOM_H_MAX) && ROOM_H_MAX >= ROOM_H_MIN)
  assert.equal(ROOM_H_MIN % 2, 0, "ROOM_H_MIN must be even (two pixel rows per text row)")
  assert.equal(ROOM_H_MAX % 2, 0, "ROOM_H_MAX must be even (two pixel rows per text row)")
})

test("palette entries are six-digit hex colours", () => {
  for (const [key, value] of Object.entries(PALETTE)) {
    assert.equal(key.length, 1, `palette key ${key} must be one character`)
    assert.notEqual(key, ".", "'.' is transparent and must not be a palette key")
    assert.match(value, HEX, `palette key ${key}`)
  }
})

test("every sprite pixel is transparent or a palette key", () => {
  const check = (rows, label) => {
    for (const [y, row] of rows.entries()) {
      for (const [x, ch] of [...row].entries()) {
        if (ch === ".") continue
        assert.ok(PALETTE[ch], `${label}: (${x},${y}) uses '${ch}', which is not in PALETTE`)
      }
    }
  }
  for (const row of BASEBOARD) check([row], "baseboard")
  for (const object of OBJECTS) check(object.rows, `object ${object.name}`)
  for (const [setIndex, set] of DITTO_SETS.entries()) {
    for (const name of FRAME_NAMES) check(set.frames[name], `DITTO_SETS[${setIndex}].${name}`)
  }
  for (const name of EMOTE_NAMES) check(EMOTES[name], `emote ${name}`)
  check(BUBBLE, "bubble")
  for (const [digit, rows] of Object.entries(GLYPHS)) {
    for (const row of rows) {
      for (const ch of row) assert.ok(ch === "." || ch === "#", `glyph ${digit}: unexpected '${ch}'`)
    }
  }
})

test("room width holds the baseboard and every object", () => {
  for (const row of BASEBOARD) assert.equal(row.length, ROOM_W)
  for (const object of OBJECTS) {
    assert.ok(Number.isInteger(object.x) && object.x >= 0, `${object.name}: x`)
    const widest = Math.max(...object.rows.map((r) => r.length))
    assert.ok(object.x + widest <= ROOM_W, `${object.name}: ${object.x} + ${widest} exceeds ROOM_W`)
  }
})

test("Ditto sets have all nine frames at one size", () => {
  for (const [setIndex, set] of DITTO_SETS.entries()) {
    assert.ok(Number.isInteger(set.w) && set.w > 0 && set.w <= ROOM_W)
    assert.ok(Number.isInteger(set.h) && set.h > 0)
    assert.deepEqual(Object.keys(set.frames).sort(), [...FRAME_NAMES].sort())
    for (const name of FRAME_NAMES) checkRows(set.frames[name], set.w, set.h, `set ${setIndex} ${name}`)
  }
})

test("per-kind colours override existing palette keys only", () => {
  assert.deepEqual(Object.keys(DITTO_COLORS).sort(), ["agent", "companion"])
  for (const [kind, overrides] of Object.entries(DITTO_COLORS)) {
    for (const [key, value] of Object.entries(overrides)) {
      assert.ok(PALETTE[key], `${kind}: override '${key}' is not a palette key`)
      assert.match(value, HEX, `${kind} override ${key}`)
    }
  }
})

test("emotes, bubble and badge glyphs match their declared sizes", () => {
  for (const name of EMOTE_NAMES) checkRows(EMOTES[name], EMOTE_W, EMOTE_H, `emote ${name}`)
  checkRows(BUBBLE, BUBBLE_W, BUBBLE_H, "bubble")
  for (const [digit, rows] of Object.entries(GLYPHS)) checkRows(rows, DIGIT_W, DIGIT_H, `glyph ${digit}`)
})

test("points of interest and ambient pixels stay inside the room", () => {
  for (const poi of POIS) {
    assert.ok(poi.cx >= 0 && poi.cx < ROOM_W, `${poi.name}: cx`)
    assert.ok(EMOTE_NAMES.includes(poi.emote), `${poi.name}: unknown emote ${poi.emote}`)
    assert.ok(poi.at === "back" || poi.at === "front", `${poi.name}: at`)
  }
  for (const anim of ANIM) {
    assert.ok(anim.x >= 0 && anim.x < ROOM_W, "ambient x")
    assert.ok(anim.every >= 1, "ambient every")
    assert.ok(anim.frames.length > 0, "ambient frames")
    for (const key of anim.frames) assert.ok(PALETTE[key], `ambient frame '${key}' is not in PALETTE`)
  }
})

test("tui.tsx imports its art and registers a local plugin", () => {
  const source = readFileSync(new URL("../tui.tsx", import.meta.url), "utf8")
  assert.match(source, /from "\.\/art"/)
  assert.match(source, /Plugin\.define\(/)
  assert.match(source, /sidebar\.footer/)
  assert.match(source, /export const companionTarget/)
})
