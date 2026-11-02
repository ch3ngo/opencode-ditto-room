// Ditto room art data (v10, flat readable room, compact wall, large Ditto, blue
// companion variant). Plain data only: no imports, no functions.
//
// ART MODEL (v10). The room is a layered scene that the engine composes at the
// height the terminal allows:
//   - a flat wall, a two pixel baseboard and a flat floor (one colour each)
//   - a small set of floor-anchored objects with flat fills, clear silhouettes
//     and a one pixel dark outline on the furniture, so they read against the
//     wall
//   - no gradients, no vignette, no dithering, no contact shading. The only
//     shading in the room is the Ditto foot shadow the engine paints.
// The floor keeps a fixed pixel depth for the current terminal tier and the
// wall takes the remaining height, so every object stays anchored to the floor
// and simply gets more wall above it in a taller room. The floor line is
// therefore not simply half the room height.
//
// COORDINATES. ROOM_W is in pixels (1 pixel = 1 terminal cell wide, half a cell
// tall). An object's `bottom` is the offset of its LAST row from its anchor: the
// floor top by default (negative = above the floor line, positive = below it,
// into the floor), or the deepest usable floor row when `from: "bottom"`. Its
// first row is the anchor plus/minus the offset minus (rows.length - 1).
// ANIM `dy` is relative to the floor top (negative = above it). Points of
// interest use `at: "back"` (floor top row plus `offset`) or `at: "front"`
// (last usable floor row minus `offset`).
//
// DITTO VARIANTS. `DITTO_SETS` holds one shape, 14 x 11. `DITTO_COLORS` supplies
// per-kind colour overrides: agents use the normal palette, companions use the
// shiny blue body. Shape, frames, animations and shadow are identical.
export const ART_VERSION = 10
export const PALETTE: Record<string, string> = {
  // Ditto sprite, emotes and speech bubble (unchanged since v1)
  K: "#593a82",
  L: "#8a67b8",
  B: "#c997e7",
  S: "#ac7fd3",
  F: "#8860b2",
  H: "#fbeeff",
  I: "#e3c8f5",
  E: "#1b1b1b",
  M: "#5a3d73",
  P: "#e58fb0",
  U: "#6aa7e8",
  e: "#e0405a",
  i: "#ffb3c0",
  Y: "#f5c542",
  z: "#5a3d10",
  w: "#ffffff",
  N: "#5b3fa0",
  X: "#7d8fb0",
  D: "#2c2438",
  // Room: flat wall, baseboard, flat floor
  a: "#f4e7d2",
  b: "#e0c8a9",
  c: "#c9ac8a",
  f: "#c99a6e",
  g: "#bb8b60",
  // Room: shared outline and object fills
  o: "#3d2b35",
  p: "#7d5a41",
  q: "#fbf5e9",
  s: "#a9d6ea",
  t: "#ffd37a",
  h: "#8a5c3c",
  j: "#6d462c",
  v: "#c14f57",
  y: "#3f8a86",
  x: "#d9a43c",
  k: "#c1704a",
  l: "#3f7a52",
  m: "#64a06c",
  n: "#e6b35c",
  u: "#fff0bd",
  r: "#57454a",
  A: "#2e5a60",
  C: "#3f7d84",
  V: "#dfe9e2",
}
// Per-kind Ditto colours. The agent map is empty (use PALETTE); the companion
// map re-colours the same 14 x 11 frames to a shiny blue body. Eyes (E) and
// tongue (P) are shared on purpose.
export const DITTO_COLORS: Record<"agent" | "companion", Record<string, string>> = {
  agent: {},
  companion: {
    K: "#2b4a66",
    L: "#4a8fc9",
    B: "#6fb7e8",
    S: "#5aa7d8",
    F: "#3f7fb8",
    M: "#2e5f82",
    H: "#e8f7ff",
    I: "#d9f0ff",
  },
}
export const ROOM_W = 38
// Visible compact pixel height: the engine picks an even value in
// [ROOM_H_MIN, ROOM_H_MAX] from the terminal rows. 30 px = 15 text rows,
// 40 px = 20 text rows. The floor depth of the current terminal tier is
// derived separately in tui.tsx.
export const ROOM_H_MIN = 30
export const ROOM_H_MAX = 40
export const WALL_COLOR = "a"
// Two rows drawn at the bottom of the wall, top row first.
export const BASEBOARD: string[] = [
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "cccccccccccccccccccccccccccccccccccccc",
]
export const FLOOR_COLOR = "f"
export const FLOOR_SEAM_COLOR = "g"
// Vertical plank seams, drawn from FLOOR_SEAM_FROM rows below the floor top.
export const FLOOR_SEAMS: number[] = [9, 19, 29]
export const FLOOR_SEAM_FROM = 2
// Floor-anchored objects, painted back to front. `bottom` is the last row
// relative to the floor top (see header). Wall-standing furniture uses -1,
// wall-hung items less. `from: "bottom"` measures from the deepest usable floor
// row instead, which is how the rug stays near the front as the room grows.
export type RoomObject = { name: string; x: number; bottom: number; from?: "top" | "bottom"; rows: string[] }
export const OBJECTS: RoomObject[] = [
  {
    // Large oval rug on the floor plane, front-anchored, 24 x 14
    name: "rug",
    x: 9,
    bottom: 0,
    from: "bottom",
    rows: [
      "........................",
      "......AAVVVVVVVVAA......",
      "....AVVCCCCCCCCCCVVA....",
      "..AVVCCCCCCCCCCCCCCVVA..",
      ".AVCCCCCCCCCCCCCCCCCCVA.",
      ".AVCCCCCCCCCCCCCCCCCCVA.",
      ".VCCCCCCCCCCCCCCCCCCCCV.",
      ".VCCCCCCCCCCCCCCCCCCCCV.",
      ".AVCCCCCCCCCCCCCCCCCCVA.",
      ".AVCCCCCCCCCCCCCCCCCCVA.",
      "..AVVCCCCCCCCCCCCCCVVA..",
      "....AVVCCCCCCCCCCVVA....",
      "......AAVVVVVVVVAA......",
      "........................",
    ],
  },
  {
    // Dog bed in the upper-left floor corner
    name: "dogbed",
    x: 1,
    bottom: 5,
    rows: [
      "..oooo..",
      ".ovvvvo.",
      "ovvvvvvo",
      "ovqqqqvo",
      "ovqqqqvo",
      ".ovvvvo.",
      "..oooo..",
    ],
  },
  {
    // Bookcase against the wall, standing on the floor line
    name: "bookcase",
    x: 20,
    bottom: -1,
    rows: [
      "ooooooooooo",
      "ohhhhhhhhho",
      "ohvvyyhxxho",
      "ohvvyyhxxho",
      "ohvvyyhxxho",
      "ojjjjjjjjjo",
      "ohxxyyhvvho",
      "ohxxyyhvvho",
      "ohxxyyhvvho",
      "ojjjjjjjjjo",
      "ohhvvxxyyho",
      "ohhvvxxyyho",
      "ohhhhhhhhho",
      "ooooooooooo",
    ],
  },
  {
    // Window hung on the wall, flat sky panes and a flat sun. The bottom is 3 px
    // above the floor line (v9 used 6) so the 11 px sprite fits the 14 px compact
    // wall without clipping.
    name: "window",
    x: 3,
    bottom: -3,
    rows: [
      "oooooooooooo",
      "opqqqqqqqqpo",
      "opqssssssqpo",
      "opqssstssqpo",
      "opqssssssqpo",
      "opqqqqqqqqpo",
      "opqssssssqpo",
      "opqssssssqpo",
      "opqssssssqpo",
      "opqqqqqqqqpo",
      "oooooooooooo",
    ],
  },
  {
    // Floor lamp against the wall. Its last row is one pixel into the floor line
    // so the 15 px sprite fits the 14 px compact wall; it sits clear of the rug.
    name: "lamp",
    x: 33,
    bottom: 0,
    rows: [
      ".oo.",
      "onno",
      "onno",
      "onno",
      "oooo",
      ".rr.",
      ".rr.",
      ".rr.",
      ".rr.",
      ".rr.",
      ".rr.",
      ".rr.",
      ".rr.",
      "oooo",
      "oooo",
    ],
  },
]
// One Ditto size (14x11). The engine draws a shadow on row feetY + 1, so the
// deepest usable feet row is ROOM_H - 2.
export type DittoFrameName = "idle" | "squash" | "blink" | "happy" | "sad" | "laugh" | "wobbleL" | "wobbleR" | "stretch"
export const DITTO_SETS: { w: number; h: number; frames: Record<DittoFrameName, string[]> }[] = [
  {
    w: 14,
    h: 11,
    frames: {
      idle: [
        "....LLL.......",
        "...LHHIBLLL...",
        "..LHIIBBBHBK..",
        "..LIBEBBBEBBK.",
        "..LIBBBBBBBBK.",
        ".LIBBFBBBFBBSK",
        "LBBBBBMMMBBBSK",
        "LBBBBBBBBBBSSK",
        "KSBBBBBBSSBSSK",
        "KSSSSSSSSSSSFK",
        ".KFKKFKKFKKFKK",
      ],
      squash: [
        "..............",
        "..............",
        "...LLLLLLLL...",
        "..LHIIBBBHBK..",
        "..LIBEBBBEBBK.",
        ".LIBBFBBBFBBSK",
        "LBBBBBMMMBBBSK",
        "LBBBBBBBBBBSSK",
        "KSBBBBBBSSBSSK",
        "KSSSSSSSSSSSFK",
        ".KFKKFKKFKKFKK",
      ],
      blink: [
        "....LLL.......",
        "...LHHIBLLL...",
        "..LHIIBBBHBK..",
        "..LIMMBBBMMBK.",
        "..LIBBBBBBBBK.",
        ".LIBBFBBBFBBSK",
        "LBBBBBMMMBBBSK",
        "LBBBBBBBBBBSSK",
        "KSBBBBBBSSBSSK",
        "KSSSSSSSSSSSFK",
        ".KFKKFKKFKKFKK",
      ],
      happy: [
        "....LLL.......",
        "...LHHIBLLL...",
        "..LHIIBBBHBK..",
        "..LIBEBBBEBBK.",
        "..LIEBEBEBEBK.",
        ".LIBBBBBBBBBSK",
        "LBBBMBBBBBMBSK",
        "LBBBBMMMMMBSSK",
        "KSBBBBBBSSBSSK",
        "KSSSSSSSSSSSFK",
        ".KFKKFKKFKKFKK",
      ],
      sad: [
        "....LLL.......",
        "...LHHIBLLL...",
        "..LHIIBBBHBK..",
        "..LIBEBBBEBBK.",
        "..LIUBBBBBBBK.",
        ".LIBUBMMMBBBSK",
        "LBBBBMBBBMBBSK",
        "LBBBBBBBBBBSSK",
        "KSBBBBBBSSBSSK",
        "KSSSSSSSSSSSFK",
        ".KFKKFKKFKKFKK",
      ],
      laugh: [
        "....LLL.......",
        "...LHHIBLLL...",
        "..LHEIBBBHEK..",
        "..LIBEBBBEBBK.",
        "..LIEBBBBBEBK.",
        ".LIBBMMMMMBBSK",
        "LBBBBBMPMBBBSK",
        "LBBBBBBBBBBSSK",
        "KSBBBBBBSSBSSK",
        "KSSSSSSSSSSSFK",
        ".KFKKFKKFKKFKK",
      ],
      wobbleL: [
        "...LLL........",
        "..LHHIBLLL....",
        "..LHIIBBBHBK..",
        "..LIBEBBBEBBK.",
        "..LIBBBBBBBBK.",
        ".LIBBFBBBFBBSK",
        "LBBBBBMMMBBSK.",
        "LBBBBBBBBBSSK.",
        "KSBBBBBBSBSSK.",
        "KSSSSSSSSSSFK.",
        ".KFKKFKKFK....",
      ],
      wobbleR: [
        ".....LLL......",
        "....LHHIBLLL..",
        "..LHIIBBBHBK..",
        "..LIBEBBBEBBK.",
        "..LIBBBBBBBBK.",
        ".LIBBFBBBFBBSK",
        ".LBBBBMMMBBBSK",
        ".LBBBBBBBBBSSK",
        ".KSBBBBBSSBSSK",
        ".KSSSSSSSSSSFK",
        "..KFKKFKKFK...",
      ],
      stretch: [
        "....LLL.......",
        "...LHHIBLLL...",
        "...LHIIBBBBK..",
        "...LIEBBBEBBK.",
        "...LBBBBBBBBK.",
        "...LBFBBBFBBK.",
        "...LBBMMMBBSK.",
        "...LBBBBBBSSK.",
        "...KSBBBBSSSK.",
        "...KSSSSSSSFK.",
        "...KFKKFKKFK..",
      ],
    },
  },
]
export const EMOTE_W = 5
export const EMOTE_H = 5
export const EMOTE_NAMES = ["heart", "laugh", "sad", "exclaim", "question", "note", "zzz", "sparkle"] as const
export const EMOTES: Record<typeof EMOTE_NAMES[number], string[]> = {
  heart: [
    ".e.e.",
    "eieee",
    "eeeee",
    ".eee.",
    "..e..",
  ],
  laugh: [
    ".YYY.",
    "YzYzY",
    "YYYYY",
    "YzzzY",
    ".YYY.",
  ],
  sad: [
    "..U..",
    "..U..",
    ".UwU.",
    "UUUUU",
    ".UUU.",
  ],
  exclaim: [
    "..ee.",
    "..ee.",
    "..ee.",
    ".....",
    "..ee.",
  ],
  question: [
    ".UUU.",
    "U...U",
    "..UU.",
    ".....",
    "..U..",
  ],
  note: [
    "..NN.",
    "..N.N",
    "..N..",
    "NNN..",
    "NN...",
  ],
  zzz: [
    "XXXXX",
    "...X.",
    "..X..",
    ".X...",
    "XXXXX",
  ],
  sparkle: [
    "..Y..",
    ".YwY.",
    "YwwwY",
    ".YwY.",
    "..Y..",
  ],
}
export const BUBBLE_W = 9
export const BUBBLE_H = 11
export const BUBBLE_TAIL_X = 4
export const BUBBLE_INNER_X = 2
export const BUBBLE_INNER_Y = 2
export const BUBBLE: string[] = [
  ".DDDDDDD.",
  "DwwwwwwwD",
  "DwwwwwwwD",
  "DwwwwwwwD",
  "DwwwwwwwD",
  "DwwwwwwwD",
  "DwwwwwwwD",
  "DwwwwwwwD",
  ".DDDwDDD.",
  "...DwD...",
  "....D....",
]
export const DIGIT_W = 3
export const DIGIT_H = 5
export const GLYPHS: Record<string, string[]> = {
  "0": [
    "###",
    "#.#",
    "#.#",
    "#.#",
    "###",
  ],
  "1": [
    ".#.",
    "##.",
    ".#.",
    ".#.",
    "###",
  ],
  "2": [
    "###",
    "..#",
    "###",
    "#..",
    "###",
  ],
  "3": [
    "###",
    "..#",
    "###",
    "..#",
    "###",
  ],
  "4": [
    "#.#",
    "#.#",
    "###",
    "..#",
    "..#",
  ],
  "5": [
    "###",
    "#..",
    "###",
    "..#",
    "###",
  ],
  "6": [
    "###",
    "#..",
    "###",
    "#.#",
    "###",
  ],
  "7": [
    "###",
    "..#",
    "..#",
    "..#",
    "..#",
  ],
  "8": [
    "###",
    "#.#",
    "###",
    "#.#",
    "###",
  ],
  "9": [
    "###",
    "#.#",
    "###",
    "..#",
    "###",
  ],
  "+": [
    "...",
    ".#.",
    "###",
    ".#.",
    "...",
  ],
}
// Dark on the cream wall and still readable on a lavender Ditto
export const BADGE_COLOR = "#3d2b35"
// Points of interest for a lone Ditto. `cx` is the horizontal centre pixel and
// `at`/`offset` place the feet row relative to the floor (see header). Each one
// must be a legal standing spot at every supported height.
export const POIS: { name: string; cx: number; at: "back" | "front"; offset: number; emote: typeof EMOTE_NAMES[number] }[] = [
  { name: "window", cx: 9, at: "back", offset: 0, emote: "sparkle" },
  { name: "lamp", cx: 29, at: "back", offset: 0, emote: "note" },
  { name: "rug", cx: 19, at: "front", offset: 1, emote: "zzz" },
]
// Ambient animated pixels: one palette key per step, one step every `every`
// ambient ticks (600 ms). `dy` is relative to the floor top. First frame equals
// the pixel already drawn by the object underneath, so step 0 is the plain room.
export const ANIM: { x: number; dy: number; frames: string[]; every: number }[] = [
  { x: 10, dy: -9, frames: ["s", "q", "s", "u"], every: 4 },
  { x: 7, dy: -11, frames: ["s", "q", "s"], every: 5 },
  { x: 34, dy: -11, frames: ["n", "u", "n", "n"], every: 3 },
]
