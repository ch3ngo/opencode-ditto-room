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
  BUBBLE_INNER_X,
  BUBBLE_INNER_Y,
  BUBBLES,
  BUBBLE_TAIL_X,
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
  assert.equal(ART_VERSION, 13)
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
  for (const side of ["left", "right"]) check(BUBBLES[side], `bubble ${side}`)
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

test("every Ditto frame has face pixels", () => {
  for (const [setIndex, set] of DITTO_SETS.entries()) {
    for (const name of FRAME_NAMES) {
      const rows = set.frames[name]
      assert.ok(rows.some((row) => /[EM]/.test(row)), `set ${setIndex} ${name}: no face pixels`)
    }
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
  for (const side of ["left", "right"]) checkRows(BUBBLES[side], BUBBLE_W, BUBBLE_H, `bubble ${side}`)
  for (const [digit, rows] of Object.entries(GLYPHS)) checkRows(rows, DIGIT_W, DIGIT_H, `glyph ${digit}`)
})

test("bubbles leave a one pixel gutter around every emote and a single tail", () => {
  // Border on the outside, one white pixel, then the 5 x 5 emote on every side.
  assert.ok(BUBBLE_INNER_X >= 2, "the emote needs a left gutter")
  assert.ok(BUBBLE_INNER_Y >= 2, "the emote needs a top gutter")
  assert.ok(BUBBLE_INNER_X + EMOTE_W <= BUBBLE_W - 2, "the emote needs a right gutter")
  assert.ok(BUBBLE_INNER_Y + EMOTE_H <= BUBBLE_H - 3, "the emote needs a bottom gutter")

  for (const side of ["left", "right"]) {
    const rows = BUBBLES[side]
    const tailRow = rows[BUBBLE_H - 1]
    const tail = BUBBLE_TAIL_X[side]
    assert.ok(tail >= 0 && tail < BUBBLE_W, `${side}: tail column outside the bubble`)
    for (const [x, ch] of [...tailRow].entries()) {
      assert.equal(ch, x === tail ? "D" : ".", `${side}: tail row pixel ${x}`)
    }
    assert.equal([...tailRow].filter((ch) => ch === "D").length, 1, `${side}: expected one tail pixel`)
  }
})

test("bubble layout stays legal and clear of the head at both room heights", () => {
  const sprite = DITTO_SETS[0]
  const half = Math.floor(sprite.w / 2)
  // Same floor depths the engine and tools/render-scenes.mjs use.
  for (const [height, floorRows] of [[ROOM_H_MIN, 16], [ROOM_H_MAX, 22]]) {
    const floorTop = height - floorRows
    const floorMax = height - 2
    for (let feet = floorTop; feet <= floorMax; feet++) {
      const top = feet - sprite.h + 1
      for (let cx = half; cx <= ROOM_W - sprite.w + half; cx++) {
        const side = cx < ROOM_W / 2 ? "right" : "left"
        const centered = cx - BUBBLE_TAIL_X[side]
        assert.ok(centered >= 0 && centered + BUBBLE_W <= ROOM_W, `cx ${cx}: ${side} tail does not fit`)
        const bx = top >= BUBBLE_H ? centered : side === "right" ? cx + half : cx - half - BUBBLE_W
        const by = top >= BUBBLE_H ? top - BUBBLE_H : 0
        assert.ok(bx >= 0 && bx + BUBBLE_W <= ROOM_W, `${height}px cx ${cx}: bubble x ${bx} is clipped`)
        assert.ok(by >= 0 && by + BUBBLE_H <= height, `${height}px feet ${feet}: bubble y ${by} is clipped`)
        if (top >= BUBBLE_H) {
          assert.ok(by + BUBBLE_H <= top, `${height}px cx ${cx}: bubble overlaps the head`)
        } else {
          const headLeft = cx - half
          const headRight = headLeft + sprite.w
          assert.ok(bx + BUBBLE_W <= headLeft || bx >= headRight, `${height}px cx ${cx}: bubble covers the head`)
        }
      }
    }
  }
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
  assert.match(source, /companionTarget/)
})

test("tui.tsx wires the diagonal bubbles and the dance routines", () => {
  const source = readFileSync(new URL("../tui.tsx", import.meta.url), "utf8")
  assert.match(source, /bubbleSide\(d\.cx\)/)
  assert.match(source, /bubbleBodyX\(d\.cx, top, Math\.floor\(widthOf\(d\) \/ 2\), side\)/)
  assert.match(source, /bubbleTop\(top\)/)
  assert.match(source, /paint\(buf, BUBBLES\[side\]/)
  assert.match(source, /DANCE_STEPS\[d\.dance\]/)
  // every quoted frame inside DANCE_STEPS must be a real sprite frame, and there
  // is more than the original single sway routine
  const block = source.match(/const DANCE_STEPS[\s\S]*?\n\]/)?.[0] ?? ""
  const names = [...block.matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1])
  assert.ok(names.length >= 6, "expected at least three dance routines")
  for (const name of names) assert.ok(FRAME_NAMES.includes(name), `dance frame '${name}' is not a sprite frame`)
})
