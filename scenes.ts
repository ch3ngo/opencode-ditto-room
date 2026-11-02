// Scene data for the Ditto room. The runtime selects one scene at startup with
// OC_DITTO_SCENE and paints it through the compositor in tui.tsx. The Living Room
// entry reuses the exact art.ts exports, so the current default cannot drift; the
// other five are new flat scene data. The local preview tools consume the same
// SCENES array.
//
// Scene geometry follows the art contract: ROOM_W is 38 pixels, one pixel is one
// cell wide and half a cell tall, and objects are bottom aligned and anchored to
// the floor line or the deepest floor row. Outdoor scenes use an empty baseboard
// because the wall meets the ground directly.
import {
  PALETTE as LIVING_PALETTE,
  WALL_COLOR as LIVING_WALL,
  BASEBOARD as LIVING_BASEBOARD,
  FLOOR_COLOR as LIVING_FLOOR,
  FLOOR_SEAM_COLOR as LIVING_SEAM,
  FLOOR_SEAMS as LIVING_SEAMS,
  FLOOR_SEAM_FROM as LIVING_SEAM_FROM,
  OBJECTS as LIVING_OBJECTS,
  POIS as LIVING_POIS,
  ANIM as LIVING_ANIM,
} from "./art.ts"

export type SceneObject = {
  name: string
  x: number
  bottom: number
  from?: "top" | "bottom"
  rows: string[]
}

export type ScenePoi = {
  name: string
  cx: number
  at: "back" | "front"
  offset: number
  emote: string
}

export type SceneAnim = {
  x: number
  dy: number
  frames: string[]
  every: number
}

export type Scene = {
  id: string
  name: string
  palette: Record<string, string>
  wall: string
  baseboard: string[]
  floor: string
  floorSeam: string
  floorSeams: number[]
  floorSeamFrom: number
  objects: SceneObject[]
  pois: ScenePoi[]
  anim: SceneAnim[]
}

// A 38-wide stand band with generic crowd colours. No team marks or logos.
const STAND_CROWD = "turuyr".repeat(6) + "tu"
const STAND_PLAIN = "t".repeat(38)
const STAND_LOWER = "u".repeat(38)
const STAND_SHADE = "v".repeat(38)

export const SCENES: Scene[] = [
  {
    id: "living-room",
    name: "Living Room",
    palette: LIVING_PALETTE,
    wall: LIVING_WALL,
    baseboard: LIVING_BASEBOARD,
    floor: LIVING_FLOOR,
    floorSeam: LIVING_SEAM,
    floorSeams: LIVING_SEAMS,
    floorSeamFrom: LIVING_SEAM_FROM,
    objects: LIVING_OBJECTS,
    pois: LIVING_POIS,
    anim: LIVING_ANIM,
  },
  {
    id: "mountain-meadow",
    name: "Mountain Meadow",
    palette: {
      a: "#dceff7", // pale sky wall
      b: "#7f9bb3", // far mountain
      c: "#5f7f99", // near mountain
      d: "#f7fbff", // snow cap
      e: "#8fbf6a", // meadow floor
      f: "#7aa957", // grass seam
      g: "#3f6b3a", // fir dark
      h: "#5b8a4a", // fir light
      i: "#6b4a2f", // trunk
      j: "#f2d24b", // sun
      k: "#ffffff", // cloud
      l: "#f2d24b", // yellow flower
      m: "#e88aa8", // pink flower
      n: "#ffffff", // white flower
    },
    wall: "a",
    baseboard: [],
    floor: "e",
    floorSeam: "f",
    floorSeams: [10, 26],
    floorSeamFrom: 3,
    objects: [
      {
        name: "mountains",
        x: 3,
        bottom: 0,
        rows: [
          "................................",
          "..........dd....................",
          ".........dccd..........dd.......",
          "........dccccd........dccd......",
          ".......bcccccb.......bccccb.....",
          "......bcccccccb.....bccccccb....",
          ".....bcccccccccb...bccccccccb...",
          "....bcccccccccccb.bccccccccccb..",
          "...bcccccccccccccbccccccccccccb.",
          "..bccccccccccccccccccccccccccccb",
          "cccccccccccccccccccccccccccccccc",
        ],
      },
      {
        name: "fir-left",
        x: 0,
        bottom: 0,
        rows: [
          "..g..",
          ".ghg.",
          "gghgg",
          ".ghg.",
          "..i..",
          "..i..",
          "..i..",
        ],
      },
      {
        name: "fir-right",
        x: 33,
        bottom: 0,
        rows: [
          "..g..",
          ".ghg.",
          "gghgg",
          ".ghg.",
          "..i..",
          "..i..",
          "..i..",
        ],
      },
      {
        name: "sun",
        x: 31,
        bottom: -10,
        rows: [
          ".jjj.",
          "jjjjj",
          "jjjjj",
          ".jjj.",
        ],
      },
      {
        name: "cloud",
        x: 5,
        bottom: -9,
        rows: [
          ".kkk...",
          "kkkkkk.",
          ".kkkkk.",
        ],
      },
    ],
    pois: [
      { name: "sun", cx: 30, at: "back", offset: 0, emote: "sparkle" },
      { name: "firs", cx: 8, at: "back", offset: 0, emote: "note" },
      { name: "meadow", cx: 19, at: "front", offset: 1, emote: "zzz" },
    ],
    anim: [
      { x: 6, dy: 2, frames: ["e", "l", "e", "m"], every: 5 },
      { x: 18, dy: 3, frames: ["e", "n", "e", "l"], every: 7 },
      { x: 30, dy: 2, frames: ["e", "m", "e", "n"], every: 6 },
    ],
  },
  {
    id: "japanese-garden",
    name: "Japanese Garden",
    palette: {
      c: "#f2e7cf", // cream wall
      t: "#7a4b2a", // timber trim
      d: "#5a3520", // dark timber
      b: "#6f9a4a", // bamboo
      e: "#8fbf6a", // bamboo light
      l: "#4f7a3a", // bamboo dark
      s: "#e6d6b8", // sand floor
      r: "#d6c39f", // sand seam
      k: "#9a9a8e", // stone
      q: "#7a7a70", // stone shadow
      g: "#6f8f4f", // moss
      h: "#5b7a3f", // moss dark
      y: "#d9a441", // lantern warm
      o: "#f2c96b", // lantern light
      v: "#7fb7c9", // pond water
      x: "#b7dce6", // pond ripple
      z: "#4f7f8f", // pond edge
    },
    wall: "c",
    baseboard: [
      "tttttttttttttttttttttttttttttttttttttt",
      "dddddddddddddddddddddddddddddddddddddd",
    ],
    floor: "s",
    floorSeam: "r",
    floorSeams: [5, 12, 19, 26, 33],
    floorSeamFrom: 3,
    objects: [
      {
        name: "top-beam",
        x: 0,
        bottom: -12,
        rows: ["t".repeat(38), "d".repeat(38)],
      },
      {
        name: "bamboo-left",
        x: 1,
        bottom: 0,
        rows: [
          ".b..b..b",
          ".b..b..b",
          "eb..b..b",
          ".b.eb..b",
          ".b..b..b",
          ".b..b.eb",
          ".b..b..b",
          "eb..b..b",
          ".b.eb..b",
          ".b..b..b",
          ".b..b..b",
          ".b..b..b",
        ],
      },
      {
        name: "bamboo-right",
        x: 30,
        bottom: 0,
        rows: [
          ".b..b..b",
          ".b..b..b",
          "eb..b..b",
          ".b.eb..b",
          ".b..b..b",
          ".b..b.eb",
          ".b..b..b",
          "eb..b..b",
          ".b.eb..b",
          ".b..b..b",
          ".b..b..b",
          ".b..b..b",
        ],
      },
      {
        name: "stone-lantern",
        x: 12,
        bottom: 0,
        rows: [
          "..kkk..",
          ".kkkkk.",
          "kkkkkkk",
          ".k...k.",
          "..kyk..",
          "..kyk..",
          ".kkkkk.",
          "..kkk..",
          ".kqqqk.",
          "..qqq..",
        ],
      },
      {
        name: "pond",
        x: 19,
        bottom: 3,
        rows: [
          "..zzzzzzzzzz..",
          ".zvvvvvvvvvvz.",
          ".zvvxvvvvxvvz.",
          "..zzzzzzzzzz..",
        ],
      },
      {
        name: "moss-left",
        x: 0,
        bottom: 0,
        from: "bottom",
        rows: [
          "ggghh...",
          "gghhhg..",
          ".gghhg..",
          "..ggg...",
        ],
      },
      {
        name: "moss-right",
        x: 30,
        bottom: 0,
        from: "bottom",
        rows: [
          "ggghh...",
          "gghhhg..",
          ".gghhg..",
          "..ggg...",
        ],
      },
    ],
    pois: [
      { name: "lantern", cx: 15, at: "back", offset: 0, emote: "sparkle" },
      { name: "bamboo", cx: 8, at: "back", offset: 0, emote: "note" },
      { name: "sand", cx: 22, at: "front", offset: 1, emote: "zzz" },
    ],
    anim: [
      { x: 5, dy: -8, frames: ["b", "e", "b"], every: 6 },
      { x: 15, dy: -5, frames: ["y", "o", "y"], every: 5 },
      { x: 34, dy: -10, frames: ["b", "e", "b"], every: 7 },
      { x: 22, dy: 1, frames: ["v", "x", "v"], every: 6 },
      { x: 28, dy: 1, frames: ["v", "x", "v"], every: 8 },
    ],
  },
  {
    id: "office",
    name: "Office",
    palette: {
      w: "#e3e9ec", // wall
      b: "#c9d2d7", // baseboard light
      f: "#9aa6ae", // carpet floor
      h: "#7f8b93", // carpet seam
      d: "#b07a4a", // desk wood
      e: "#8a5a34", // desk dark wood
      k: "#2f3a44", // monitor body
      s: "#7fb6d9", // screen
      l: "#a8d4ea", // screen light
      c: "#4a4f55", // chair
      g: "#8a8f95", // cabinet
      i: "#6f747a", // cabinet dark
      r: "#d94f4f", // small red accent
      y: "#f2d24b", // sticky note
      o: "#3f4750", // outline
    },
    wall: "w",
    baseboard: [
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "gggggggggggggggggggggggggggggggggggggg",
    ],
    floor: "f",
    floorSeam: "h",
    floorSeams: [10, 28],
    floorSeamFrom: 3,
    objects: [
      {
        name: "desk-monitor",
        x: 5,
        bottom: 0,
        rows: [
          "....kkkkkkkk......",
          "....kllllllk......",
          "....kllllllk......",
          "....kkkkkkkk......",
          "....k..kk..k......",
          "..dddddddddddd....",
          "..deeeeeeeeeed....",
          "..d..........d....",
          "..d..........d....",
        ],
      },
      {
        name: "office-chair",
        x: 25,
        bottom: 0,
        rows: [
          ".cccc.",
          "cccccc",
          "cccccc",
          ".cccc.",
          "..cc..",
          "..cc..",
          ".c..c.",
          "c....c",
        ],
      },
      {
        name: "filing-cabinet",
        x: 33,
        bottom: 0,
        rows: [
          ".ggg.",
          "giig.",
          "giig.",
          "ggggg",
          "giig.",
          "giig.",
          "ggggg",
          "giig.",
          "giig.",
          "ggggg",
          ".ggg.",
        ],
      },
      {
        name: "wall-clock",
        x: 2,
        bottom: -9,
        rows: [
          ".ooo.",
          "o...o",
          "o.k.o",
          "o...o",
          ".ooo.",
        ],
      },
    ],
    pois: [
      { name: "desk", cx: 12, at: "back", offset: 0, emote: "sparkle" },
      { name: "chair", cx: 27, at: "back", offset: 0, emote: "note" },
      { name: "floor", cx: 20, at: "front", offset: 1, emote: "zzz" },
    ],
    anim: [
      { x: 10, dy: -7, frames: ["l", "s", "l", "s"], every: 8 },
      { x: 16, dy: -2, frames: ["e", "r", "e"], every: 6 },
      { x: 4, dy: -11, frames: ["k", "o", "k"], every: 10 },
    ],
  },
  {
    id: "arcade",
    name: "Arcade",
    palette: {
      w: "#3f4f7a", // medium indigo wall
      b: "#2f3a5c", // baseboard
      f: "#6a5a7a", // floor
      h: "#574a66", // floor seam
      k: "#1f2430", // cabinet outline
      r: "#d94f4f", // red cabinet
      c: "#4fc3d9", // cyan cabinet
      y: "#f2d24b", // marquee yellow
      s: "#7fe08a", // screen green
      l: "#a8f0c0", // screen light
      p: "#e88aa8", // pink accent
      o: "#f28c4b", // orange accent
      g: "#3f8a86", // teal
    },
    wall: "w",
    baseboard: [
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    ],
    floor: "f",
    floorSeam: "h",
    floorSeams: [7, 19, 31],
    floorSeamFrom: 3,
    objects: [
      {
        name: "cabinet-red",
        x: 1,
        bottom: 0,
        rows: [
          ".kkkkk.",
          "kyyyyyk",
          "kyyyyyk",
          "kkkkkkk",
          "ksssssk",
          "kslllsk",
          "ksssssk",
          "kkkkkkk",
          "krrrrrk",
          "kr.o.rk",
          "kkkkkkk",
          ".kkkkk.",
        ],
      },
      {
        name: "cabinet-red-2",
        x: 9,
        bottom: 0,
        rows: [
          ".kkkkk.",
          "kooooook",
          "kooooook",
          "kkkkkkk",
          "kgggggk",
          "kglllgk",
          "kgggggk",
          "kkkkkkk",
          "kyyyyyk",
          "ky.y.yk",
          "kkkkkkk",
          ".kkkkk.",
        ],
      },
      {
        name: "cabinet-cyan",
        x: 31,
        bottom: 0,
        rows: [
          ".kkkkk.",
          "kccccck",
          "kccccck",
          "kkkkkkk",
          "kpppppk",
          "kplplpk",
          "kpppppk",
          "kkkkkkk",
          "koooook",
          "ko.o.ok",
          "kkkkkkk",
          ".kkkkk.",
        ],
      },
      {
        name: "neon-sign",
        x: 16,
        bottom: -10,
        rows: [
          "..yyyyyyyy..",
          ".yooooooooy.",
          "yoyoyoyoyoyy",
          ".yooooooooy.",
        ],
      },
    ],
    pois: [
      { name: "cabinet-left", cx: 8, at: "back", offset: 0, emote: "sparkle" },
      { name: "sign", cx: 19, at: "back", offset: 0, emote: "note" },
      { name: "cabinet-right", cx: 30, at: "back", offset: 0, emote: "zzz" },
    ],
    anim: [
      { x: 3, dy: -7, frames: ["s", "l", "s"], every: 5 },
      { x: 34, dy: -7, frames: ["p", "l", "p"], every: 6 },
      { x: 16, dy: -11, frames: ["y", "o", "y"], every: 4 },
    ],
  },
  {
    id: "football-stadium",
    name: "Football Stadium",
    palette: {
      s: "#cfe8f5", // pale sky wall
      c: "#f7fbff", // cloud / flash
      t: "#7f8fa6", // stand tier
      u: "#5f6f86", // stand tier dark
      v: "#4f5f76", // stand shade
      r: "#d94f4f", // crowd red
      y: "#f2d24b", // crowd yellow
      b: "#4f8fd9", // crowd blue
      g: "#6fae5a", // pitch
      h: "#5f9a4a", // pitch stripe
      w: "#f5f5f0", // line and goal
      n: "#3f6b3a", // net
      f: "#d94f4f", // corner flag
      p: "#f2d24b", // flag pole highlight
    },
    wall: "s",
    baseboard: [],
    floor: "g",
    floorSeam: "h",
    floorSeams: [9, 19, 29],
    floorSeamFrom: 0,
    objects: [
      {
        name: "stands",
        x: 0,
        bottom: 0,
        rows: [
          STAND_PLAIN,
          STAND_CROWD,
          STAND_LOWER,
          STAND_CROWD,
          STAND_SHADE,
          STAND_PLAIN,
        ],
      },
      {
        name: "goal",
        x: 13,
        bottom: 0,
        rows: [
          "wwwwwwwwwwww",
          "ww........ww",
          "ww..n..n..ww",
          "ww.n..n..n.ww",
          "ww..n..n..ww",
          "ww.n..n..n.ww",
          "ww........ww",
          "wwwwwwwwwwww",
        ],
      },
      {
        name: "flag-left",
        x: 1,
        bottom: 0,
        rows: [
          ".f.",
          ".p.",
          ".p.",
          ".p.",
          ".p.",
          "ppp",
        ],
      },
      {
        name: "flag-right",
        x: 35,
        bottom: 0,
        rows: [
          ".f.",
          ".p.",
          ".p.",
          ".p.",
          ".p.",
          "ppp",
        ],
      },
      {
        name: "halfway-line",
        x: 4,
        bottom: 8,
        rows: [
          "..............................",
          "wwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
          "..............................",
        ],
      },
      {
        name: "centre-circle",
        x: 16,
        bottom: 12,
        rows: [
          ".wwww.",
          "w....w",
          "w....w",
          "w....w",
          ".wwww.",
        ],
      },
    ],
    pois: [
      { name: "goal", cx: 19, at: "back", offset: 0, emote: "sparkle" },
      { name: "corner", cx: 8, at: "back", offset: 0, emote: "note" },
      { name: "pitch", cx: 19, at: "front", offset: 1, emote: "zzz" },
    ],
    anim: [
      { x: 2, dy: -12, frames: ["s", "c", "s"], every: 8 },
      { x: 30, dy: -5, frames: ["t", "w", "t"], every: 6 },
      { x: 36, dy: -5, frames: ["f", "y", "f"], every: 5 },
    ],
  },
]

// Stable scene IDs for OC_DITTO_SCENE. The order is the documented order and
// Living Room is first, so it is also the safe fallback for an invalid value.
export const SCENE_IDS = SCENES.map((s) => s.id)

export const findScene = (id: string) => SCENES.find((s) => s.id === id)

export type SceneSource = "explicit" | "random" | "fallback"
export type SceneChoice = { scene: Scene; source: SceneSource }

// Pick a scene once, at startup. A valid ID pins it; unset or "random" picks
// one; anything else falls back to Living Room. The caller keeps the returned
// object for the whole TUI lifetime, so resizes, tabs and child sessions cannot
// change it.
export const chooseScene = (raw: string | undefined, random: () => number = Math.random): SceneChoice => {
  const requested = (raw ?? "").trim().toLowerCase()
  if (requested && requested !== "random") {
    const found = findScene(requested)
    if (found) return { scene: found, source: "explicit" }
    return { scene: SCENES[0], source: "fallback" }
  }
  const index = Math.max(0, Math.min(SCENES.length - 1, Math.floor(random() * SCENES.length)))
  return { scene: SCENES[index], source: "random" }
}
