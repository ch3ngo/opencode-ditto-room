// Local preview renderer for the six scene candidates. This is not part of the
// runtime plugin: it imports the preview-only scenes.ts and writes PNGs under
// previews/. It uses only Node built-ins (zlib for the PNG payload).
import { mkdirSync, writeFileSync } from "node:fs"
import { deflateSync } from "node:zlib"
import {
  PALETTE,
  ROOM_W,
  DITTO_SETS,
  DITTO_COLORS,
} from "../art.ts"
import { SCENES } from "../scenes.ts"

const OUT = new URL("../previews/", import.meta.url)
mkdirSync(OUT, { recursive: true })

const SCALE = 12
const TALL = { rows: 20, floorRows: 22 }
const COMPACT = { rows: 15, floorRows: 16 }

const geometry = ({ rows, floorRows }) => {
  const h = rows * 2
  const floorTop = h - floorRows
  return { h, floorTop, floorMin: floorTop, floorMax: h - 2, floorRows, rows }
}

// Minimal RGB PNG writer. No metadata chunks, so generated files carry no
// software, host or timestamp information.
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const t = Buffer.from(type, "ascii")
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
const png = (width, height, rgb) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    const offset = y * (width * 3 + 1)
    raw[offset] = 0
    rgb.copy(raw, offset + 1, y * width * 3, (y + 1) * width * 3)
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]
const shade = (hex) => {
  const [r, g, b] = hexToRgb(hex)
  const f = 0.7
  const h = (v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

const paint = (buf, rows, x, top, width, height, palette, label) => {
  for (const [py, row] of rows.entries()) {
    const y = top + py
    if (y < 0 || y >= height) throw new Error(`${label}: row ${py} is outside the room`)
    for (const [px, ch] of [...row].entries()) {
      if (ch === ".") continue
      const xx = x + px
      if (xx < 0 || xx >= width) throw new Error(`${label}: pixel ${px} is outside the room`)
      const colour = palette[ch]
      if (!colour) throw new Error(`${label}: '${ch}' is not in the palette`)
      buf[y * width + xx] = colour
    }
  }
}

const compose = (scene, geo, dittos = [], ambientStep = 1) => {
  const width = ROOM_W
  const height = geo.h
  const buf = new Array(width * height).fill(scene.palette[scene.wall])

  const baseTop = geo.floorTop - scene.baseboard.length
  if (baseTop < 0) throw new Error(`${scene.id}: baseboard does not fit the wall`)
  for (const [i, row] of scene.baseboard.entries()) {
    paint(buf, [row], 0, baseTop + i, width, height, scene.palette, `${scene.id}/baseboard`)
  }
  for (let y = geo.floorTop; y < height; y++) {
    for (let x = 0; x < width; x++) buf[y * width + x] = scene.palette[scene.floor]
  }
  for (const x of scene.floorSeams) {
    if (x < 0 || x >= width) continue
    for (let y = geo.floorTop + scene.floorSeamFrom; y < height; y++) buf[y * width + x] = scene.palette[scene.floorSeam]
  }
  for (const object of scene.objects) {
    const fromBottom = object.from === "bottom"
    const anchor = fromBottom ? geo.floorMax : geo.floorTop
    const last = fromBottom ? anchor - object.bottom : anchor + object.bottom
    const top = last - (object.rows.length - 1)
    if (top < 0 || last >= height) throw new Error(`${scene.id}/${object.name}: outside ${geo.rows} rows`)
    paint(buf, object.rows, object.x, top, width, height, scene.palette, `${scene.id}/${object.name}`)
  }
  for (const anim of scene.anim) {
    const y = geo.floorTop + anim.dy
    if (y < 0 || y >= height) throw new Error(`${scene.id}: ambient y ${y} outside ${geo.rows} rows`)
    const key = anim.frames[ambientStep % anim.frames.length]
    const colour = scene.palette[key]
    if (!colour) throw new Error(`${scene.id}: ambient '${key}' not in palette`)
    buf[y * width + anim.x] = colour
  }

  const sprite = DITTO_SETS[0]
  const half = Math.floor(sprite.w / 2)
  const sorted = [...dittos].sort((a, b) => a.feet - b.feet)
  for (const d of sorted) {
    const row = d.feet + 1
    if (row < 0 || row >= height) continue
    const left = d.cx - half
    for (let x = left + 1; x <= left + sprite.w - 2; x++) {
      if (x < 0 || x >= width) continue
      const cur = buf[row * width + x]
      if (cur) buf[row * width + x] = shade(cur)
    }
  }
  for (const d of sorted) {
    const left = d.cx - half
    const top = d.feet - sprite.h + 1
    const colours = d.kind === "companion" ? { ...PALETTE, ...DITTO_COLORS.companion } : PALETTE
    paint(buf, sprite.frames[d.frame ?? "idle"], left, top, width, height, colours, `${scene.id}/ditto`)
  }
  return buf
}

const toRgb = (buf, width, height, scale) => {
  const out = Buffer.alloc(width * scale * height * scale * 3)
  for (let y = 0; y < height * scale; y++) {
    for (let x = 0; x < width * scale; x++) {
      const [r, g, b] = hexToRgb(buf[Math.floor(y / scale) * width + Math.floor(x / scale)])
      const offset = (y * width * scale + x) * 3
      out[offset] = r
      out[offset + 1] = g
      out[offset + 2] = b
    }
  }
  return out
}

const writeScene = (scene, geo, name, dittos) => {
  const buf = compose(scene, geo, dittos)
  const width = ROOM_W * SCALE
  const height = geo.h * SCALE
  const file = new URL(name, OUT)
  writeFileSync(file, png(width, height, toRgb(buf, ROOM_W, geo.h, SCALE)))
  return file.pathname
}

const dittoPair = (geo) => [
  { cx: 15, feet: geo.floorMax - 2, kind: "agent", frame: "idle" },
  { cx: 21, feet: geo.floorMax - 8, kind: "companion", frame: "idle" },
]

const written = []
for (const scene of SCENES) {
  for (const [label, geo] of [["tall", geometry(TALL)], ["compact", geometry(COMPACT)]]) {
    written.push(writeScene(scene, geo, `scene-${scene.id}-${label}.png`, []))
    written.push(writeScene(scene, geo, `dittos-${scene.id}-${label}.png`, dittoPair(geo)))
  }
}
console.log(`wrote ${written.length} scene previews to previews/`)
for (const scene of SCENES) console.log(`- ${scene.id}: ${scene.name}`)
