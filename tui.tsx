// OpenCode v2 TUI plugin: "Ditto room" in the session sidebar footer
// (02/11/2026, engine v10 for art v10). One Ditto (the Pokemon, a lavender blob)
// per direct child session of the current session that is running right now,
// plus shiny blue companion Dittos when fewer than two agents are active,
// walking around a full-bleed pixel-art room, chatting with each other, showing
// emote bubbles, popping in when a child starts and popping out when it ends.
// The room art (background, the Ditto sprite sets, emotes, bubble, badge digits)
// lives in the sibling file `art.ts`; this file animates and composites it.
//
// SPRITE SETS (v6): `DITTO_SETS` is a list of sprite sets ordered from the back
// of the floor (smallest) to the front (largest), and the engine is generic in
// its length `n`. A Ditto's set index is
//   band(feetY) = min(n-1, floor((feetY - floorMin) * n /
//                                (floorMax - floorMin + 1)))
// Art v10 ships ONE set (14 x 11), so every Ditto is always that size, the band is
// always 0 and band crossings can never happen. `DITTO_COLORS` adds per-kind
// colour overrides, not extra shapes: agents use the normal palette, companions
// the shiny blue one. The machinery is generic, so an art file can ship several
// sets: with three sets a Ditto walking away shrinks and one coming forward
// grows once per band crossing. Positions are stored as the horizontal CENTRE
// `cx` plus the feet row; the box is
//   [cx - floor(w/2), cx - floor(w/2) + w) x [feetY - h + 1, feetY]
// where w and h come from that Ditto's set. Nothing else knows a sprite size: box
// tests, chat spacing, hops, bubble placement, spawn and edge clamps all read the
// set of the Ditto or of the position being tested. No band count is hard-coded:
// grep for `NSETS` (it is `DITTO_SETS.length`).
//
// SHADOW: every drawn Ditto casts a soft shadow on the GROUND row below its feet,
// `feetY + 1`. The shadow darkens the buffer pixels of the foot span minus
// one pixel at each end (`cx - floor(w/2) + 1` to `cx - floor(w/2) + w - 2`) by 30
// percent (each #rrggbb channel times 0.70, rounded). While the Ditto is hopping
// the shadow shrinks to the inner 4 pixels of that span, still on the ground row,
// so it reads as height. Shadows are painted for every drawn Ditto before any
// sprite, they follow the sprite's blink-out visibility, and they are not part of
// any collision box.
//
// AMBIENT (v10): `ANIM` is a list of single object pixels that cycle through
// palette keys, one step every `every` ambient ticks, on a 600 ms clock of their
// own (OC_DITTO_AMBIENT=0 turns them off). Their y is relative to the floor top,
// so they stay on the two window glints and the lamp at every room height; ones
// that fall outside the current view are skipped. They are painted on the
// background before shadows, sprites and bubbles. The ambient clock runs whenever
// the room is visible, including with no Dittos; it only recomposes when the
// 200 ms Ditto ticker is stopped and at least one animated pixel actually
// changed.
//
// RESPONSIVE HEIGHT (v10): the room is composed at a compact height derived from
// process.stdout.rows. The floor is decoupled from the total: it keeps the
// pixel depth of the same v9 terminal tier, and only the wall is trimmed.
// compactRows = legacyRows - 2 at legacy tiers 18..22 and legacyRows - 1 at 16
// and 17, so the wall loses 2 text rows wherever the existing furniture fits and
// 1 row at the two smallest tiers, where a 14 px wall is the minimum that holds
// the 14 px bookcase and 15 px lamp. The visible heights are 15, 16, 16, 17, 18,
// 19 and 20 text rows (30 to 40 pixels) for terminal rows 28..44; the room is
// hidden below 28. The floor's usable feet span is floorRows - 1, exactly as in
// v9 (15, 16, 17, 18, 19, 20 and 21 rows); only the wall changes. The floor line
// is not height / 2 any more. The art is floor-anchored, the Ditto is still
// 14 x 11 and is never resampled. On resize, Dittos that no longer fit are
// requeued and recomposed; queued Dittos use the new geometry.
//
// SOLO BEHAVIOUR (v10): a lone Ditto is never still for long. After every action it
// stands 3 to 12 ticks, breathing (`idle` / `squash` every 6 ticks), then a
// weighted picker chooses: wander 35, visit 20, dance 10, jump 10, lookaround 15,
// emote 5, nap 5 (nap only after 3 actions and never with 3 or more Dittos drawn).
// visit walks to a random free `POIS` point, stands 12 to 18 ticks and shows that
// point's emote (a `zzz` point naps there for 14 ticks); dance is 14 ticks of
// `wobbleL` / `wobbleR` with a note bubble and 2 ticks of `happy`; jump is two
// hops with a 2 tick pause; lookaround is blink, idle, blink, then a 4 tick stand
// with a 2 pixel shuffle; nap is 30 ticks of `squash` with a `zzz` bubble 8 on and
// 4 off, then 2 ticks of `stretch`. Dance, jump, lookaround and nap are never
// interrupted by a chat, and a chat can only start from a plain wander or stand,
// or from a visit once it has arrived.
//
// DEPTH (v10): paint order is by ground feet y ascending, so a nearer Ditto
// (lower feet) is drawn after and occludes a farther one. Two Dittos whose feet
// rows are within SAME_DEPTH_PX (4 pixels, two text rows) are on the same plane
// and obey the full no-overlap rule: their boxes, inflated by 1 on every side,
// may not even touch, and every move is validated with the NEW feet row, so a
// Ditto cannot step from behind into a same-plane overlap. Pairs further apart in
// depth may overlap and pass behind each other; that is the intended occlusion.
// The defensive sweep only repairs same-plane pairs and logs `overlap fixed`.
//
// POPULATION (v10): agents are keyed by real session id, one per active direct
// child. Companions are synthetic (`companion<N>`), have no session behind them,
// and exist only to keep at least two Dittos on screen: 0 active agents -> 2 blue
// companions, 1 -> 1 pink agent plus 1 blue companion, 2 or more -> agents only.
// With OC_DITTO_COMPANIONS=0 no companions are created; only real active agents
// appear, and 0 agents leaves the room empty, with visibility still following
// OC_DITTO_ALWAYS and the terminal height gate. A new companion is queued and
// placed through the normal packing, preferring a spot within chat reach of an
// existing Ditto; a surplus companion pops out, newest first, after any chat it
// is in is ended. Reconciliation runs on every active-set change and every tick,
// so a companion removed during a pop-out is replenished, and a popping-out
// agent is never counted as a companion. Companions use every solo and social
// behaviour, count toward MAX_DITTOS and the queue, and are logged separately
// from the active agent count.
//
// Loaded from cli.json ("plugins"), NOT from plugins/ (a TUI-only part is not a
// server plugin). Docs: https://opencode.ai/v2/docs/build/plugins/cli/ ("Slots").
// Written against OpenCode 2.2.4; the data/slot API may change between releases
// (see README.md, Compatibility). Relative sibling import: verified working in
// OpenCode 2.2.4 on 01/11/2026.
//
// ART CONTRACT (`art.ts`, plain `export const`, no imports in that file). Every
// dimension and name below is read from the module, none is hard-coded here:
//   ART_VERSION                  number, logged once at load
//   PALETTE                      Record<char, "#rrggbb">. "." is NOT a key and
//                                means transparent
//   ROOM_W                       room width in PIXELS. One pixel is one terminal
//                                cell wide and half a cell tall
//   ROOM_H_MIN, ROOM_H_MAX       visible compact height in PIXELS (30 and 40).
//                                The engine picks an even height in this range
//                                from the terminal rows; the floor depth is
//                                preserved separately per terminal tier
//   WALL_COLOR, BASEBOARD, FLOOR_COLOR, FLOOR_SEAM_COLOR, FLOOR_SEAMS,
//   FLOOR_SEAM_FROM              the flat background layers: wall colour key, the
//                                baseboard rows at the bottom of the wall, floor
//                                colour key and the vertical plank seams
//   OBJECTS                      floor-anchored room objects, painted in order,
//                                each { name, x, bottom, from?, rows }. `bottom`
//                                is the offset of the object's LAST row from the
//                                floor top (negative above it, positive below
//                                it), or from the deepest usable floor row when
//                                `from: "bottom"` (the rug). Rows are bottom
//                                aligned, "." transparent
//   DITTO_SETS                   one or more sets ordered back (small) to
//                                front (large), each { w, h, frames }, frames being the
//                                nine frame names idle, squash, blink, happy,
//                                sad, laugh, wobbleL, wobbleR, stretch, h rows
//                                of w chars, bottom aligned
//   DITTO_COLORS                 per-kind colour overrides for the same frames:
//                                { agent, companion }. A missing key falls back
//                                to PALETTE, which is how companions get the
//                                shiny blue body without a second sprite set
//   EMOTE_W, EMOTE_H, EMOTE_NAMES, EMOTES
//                                emote sprite size and names
//   BUBBLE_W, BUBBLE_H, BUBBLE_TAIL_X, BUBBLE_INNER_X, BUBBLE_INNER_Y, BUBBLE
//                                speech bubble; the tail points down at column
//                                BUBBLE_TAIL_X, an emote is drawn with its
//                                top-left at (BUBBLE_INNER_X, BUBBLE_INNER_Y)
//   DIGIT_W, DIGIT_H, GLYPHS     badge digits: "0" to "9" and "+", DIGIT_H rows
//                                of DIGIT_W chars, "." transparent, any other
//                                char is an on-pixel
//   BADGE_COLOR                  "#rrggbb" for the overflow badge
//   POIS                         points of interest { name, cx, at, offset, emote };
//                                `at` is "back" (floor top + offset) or "front"
//                                (last usable feet row - offset)
//   ANIM                         ambient pixels { x, dy, frames, every }; dy is
//                                relative to the floor top, first frame equals
//                                the pixel already there
// Transparent pixels are ".", skipped when painting.
//
// Slot: `prepend: "sidebar.footer"` (falls back to `before: "sidebar.footer"`
// if the registration throws). The footer is a flexShrink 0 box OUTSIDE the
// sidebar scrollbox, pinned below it, so in a short terminal the scrollable
// sections (Context / MCP / Subagents) get clipped and the room does not. Never
// `replace` here, it would remove the built-in cwd/branch line.
//
// Rendering: every tick (and once at start) the flat background is composed into
// a buffer of hex colours (wall, baseboard, floor, seams, objects, ambient
// pixels), the Dittos are painted on it sorted by GROUND feet y ascending, ties
// by creation seq (back to front, so a nearer Ditto covers a farther one and a
// hop does not change the order), companion bodies use DITTO_COLORS.companion,
// then the bubbles, then the `+N` overflow badge in the top-right corner, on top
// of everything. Two
// pixel rows become one text row: `█` in one colour when both pixels are equal,
// else `▀` with the top pixel as fg and the bottom pixel as bg. Neighbouring
// cells with the same (char, fg, bg) are merged into one <span>.
//
// Capacity and queue: at most MAX_DITTOS (8) Dittos are drawn at once. Depth-aware
// overlap raises the practical floor capacity above the old four: the placement
// grid packs 8 at compact 17 to 20 room rows and 6 at compact 15 to 16 rows,
// after which the cap (not the floor) is the limit. Every other Ditto sits QUEUED in the map, not
// drawn and not counted as drawn; it is retried every tick and spawns with the
// pop-in animation the moment a free spot exists. Spawn and wander targets come
// from a coarse candidate grid that is scanned in full (no 20 random tries); a
// spawn prefers a spot that does not touch any full sprite (companions first
// prefer a spot within chat reach) and uses legal cross-depth overlap only when
// nothing cleaner is free. While anything is queued the room shows `+N` (queued
// count, capped at 99) in BADGE_COLOR, top-right.
//
// Active detection follows the same rules as a subagent sidebar (plugins cannot
// share code), trimmed to "which children are active right now": status() ===
// "running", or not ended and (a pending user input is "starting", the last
// assistant message is in flight, or the parent's `subagent` tool part for it is
// still running).
//
// Env vars (set before starting the TUI):
//   OC_DITTO_DEMO       integer 1..12: ignore session data, animate N fake
//                       AGENT Dittos through the same spawn/queue logic, and add
//                       the companions the minimum rule requires when companions
//                       are enabled; off by default
//   OC_DITTO_COMPANIONS=0 disable the blue filler companions. Enabled by default;
//                       only real active agent Dittos remain. With 0 agents,
//                       count() is 0, so the empty room follows OC_DITTO_ALWAYS
//                       and the height gate as described below
//   OC_DITTO_ALWAYS=0   hide an empty room. With companions enabled (default)
//                       there are always at least two, so count() is never 0 and
//                       the flag has no practical effect; with
//                       OC_DITTO_COMPANIONS=0 and 0 agents it hides the empty
//                       room
//   OC_DITTO_MIN_HEIGHT integer, hide the room when stdout rows < it (default
//                       28, the minimum that fits a 16 row room plus 12 rows of
//                       sidebar). Ignored if not an integer in 0..1000
// (No fixed room height env var: the height is derived from the terminal, see
// RESPONSIVE HEIGHT above.)
//
// Privacy: no session id, task text or prompt is ever logged or written. The log
// (/tmp/opencode-ditto-room.log) holds only load/unload, the slot placement, the
// art version, `agents: <n>, companions: <m>` when that composition changes,
// `overlap fixed` (max 20 per run, no content) and error messages (max 20 per
// run). No Ditto position is logged and companion ids never enter the log.
// No network, no state files. Every read is wrapped so a failure renders nothing
// instead of breaking the sidebar.
//
// Deployment: tui.tsx and art.ts are one pair and belong in the same directory.
// Copy both into <config>/tui-plugins/ditto-room/ and list
// "./tui-plugins/ditto-room" in the `plugins` array of cli.json, then restart
// the TUI. See README.md for install, update and uninstall steps.
//
// Verified 02/11/2026 with art v10 (OpenCode 2.2.4, tmux, no prompt sent, no
// model call): compact heights 15 to 20 rows with the v9 floor span preserved
// per tier (0 same-depth overlaps, capacity 6 at 15 to 16 rows and 8 at 17 to
// 20), background and wall props exact at every height from 28 to 44 terminal
// rows (0 unexplained pixels, no prop clipping), population 0 -> 2 blue,
// 1 -> 1 pink + 1 blue, 2 -> pink only, demo 8 drawing 6 +2 at 34 rows and 8 at
// 40, and a 40 -> 34 -> 44 -> 36 -> 35 -> 28 -> 40 resize run with 0
// `overlap fixed`. See README.md (Verification).
// NOT verified: real spawn/despawn on a live subagent (needs a model call), how
// the half-cell background colours and the blue companion look in a native
// terminal outside tmux, the light theme, and the 4 pixel depth threshold over
// a long real session with many agents.
import { Plugin } from "@opencode/plugin/tui"
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import { appendFileSync } from "node:fs"
import {
  ART_VERSION,
  PALETTE,
  ROOM_W,
  ROOM_H_MIN,
  ROOM_H_MAX,
  WALL_COLOR,
  BASEBOARD,
  FLOOR_COLOR,
  FLOOR_SEAM_COLOR,
  FLOOR_SEAMS,
  FLOOR_SEAM_FROM,
  OBJECTS,
  DITTO_SETS,
  DITTO_COLORS,
  EMOTES,
  BUBBLE_W,
  BUBBLE_H,
  BUBBLE_TAIL_X,
  BUBBLE_INNER_X,
  BUBBLE_INNER_Y,
  BUBBLE,
  DIGIT_W,
  DIGIT_H,
  GLYPHS,
  BADGE_COLOR,
  POIS,
  ANIM,
} from "./art"

const LOG = "/tmp/opencode-ditto-room.log"
const log = (msg: string) => {
  try { appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`) } catch (_) {}
}
let errorLogs = 0
const logError = (where: string, e: any) => {
  if (errorLogs++ < 20) log(`error in ${where}: ${String(e?.message ?? e).slice(0, 200)}`)
}
let overlapLogs = 0
const logOverlap = () => {
  if (overlapLogs++ < 20) log("overlap fixed")
}

// integer in [lo, hi]; anything else is ignored and the default is used
const parseIntIn = (v: string | undefined, dflt: number, lo: number, hi: number) => {
  const n = Number(v)
  return v !== undefined && v.trim() !== "" && Number.isInteger(n) && n >= lo && n <= hi ? n : dflt
}

// derived from art.ts, never typed in here
const ROOM_COLS = ROOM_W
// v9 geometry, used as the tier reference for the preserved floor: the legacy
// room had H = 2 * rows and the floor line at H / 2.
const COMPACT_ROWS_MIN = Math.ceil(ROOM_H_MIN / 2) // 15
const COMPACT_ROWS_MAX = Math.floor(ROOM_H_MAX / 2) // 20
// v9 tier reference, used only to preserve the floor depth of the same terminal
// size. v10 compact heights remove 2 terminal rows of wall at every tier where
// the existing furniture fits, and 1 row at the two smallest tiers because a
// 14 px wall is the minimum that holds the 14 px bookcase and 15 px lamp. The
// floor span itself never changes.
const LEGACY_ROWS_MIN = COMPACT_ROWS_MIN + 1 // 16
const LEGACY_ROWS_MAX = COMPACT_ROWS_MAX + 2 // 22
const NSETS = DITTO_SETS.length

// RESPONSIVE HEIGHT. The sidebar is 42 cells wide with 2 cells of padding, so
// the 38 cell room always fits horizontally; only the height adapts. 18
// terminal rows stay reserved above the room for the scrollable sidebar
// (Context, MCP, Todo, Subagents) and the built-in cwd line. The room is hidden
// entirely below 28 rows, the old gate.
const SIDEBAR_RESERVE_ROWS = 18
const ROOM_HIDE_BELOW = LEGACY_ROWS_MIN + 12 // 28
const legacyRowsFor = (rows: number) =>
  Math.max(LEGACY_ROWS_MIN, Math.min(LEGACY_ROWS_MAX, rows - SIDEBAR_RESERVE_ROWS))
// Compact rows: legacy 16 -> 15, 17 -> 16, 18 -> 16, 19 -> 17, ..., 22 -> 20.
const compactRowsFor = (rows: number) => {
  if (rows < ROOM_HIDE_BELOW) return 0
  const legacy = legacyRowsFor(rows)
  return legacy >= 18 ? legacy - 2 : legacy - 1
}

// The visible scene: wall plus floor. The floor is decoupled from the total
// height: `floorRows` is the preserved floor region in pixels (equal to the
// legacy room row count of the same terminal tier), and the wall is whatever is
// left above it. The floor's usable feet span is floorRows - 1 rows, exactly as
// in v9; only the wall shrinks.
type Scene = { h: number; floorTop: number; floorMin: number; floorMax: number; floorRows: number }
const sceneFor = (compactRows: number, floorRows: number): Scene => {
  const rows = Math.max(COMPACT_ROWS_MIN, Math.min(COMPACT_ROWS_MAX, compactRows))
  const h = rows * 2
  const fRows = Math.max(1, Math.min(LEGACY_ROWS_MAX, floorRows))
  const floorTop = h - fRows
  return { h, floorTop, floorMin: floorTop, floorMax: h - 2, floorRows: fRows }
}
// One room is visible at a time (one sidebar); the Room component updates this
// from the terminal rows before every compose. Start at the compact minimum with
// the floor of the corresponding legacy 16 row tier.
let scene: Scene = sceneFor(COMPACT_ROWS_MIN, LEGACY_ROWS_MIN)

const DEMO = parseIntIn(process.env.OC_DITTO_DEMO, 0, 1, 12)
// On by default: only an explicit OC_DITTO_ALWAYS=0 hides the empty room.
const ALWAYS = (process.env.OC_DITTO_ALWAYS ?? "").trim() !== "0"
// Blue filler companions are on by default; only an explicit
// OC_DITTO_COMPANIONS=0 disables them.
const COMPANIONS_ON = (process.env.OC_DITTO_COMPANIONS ?? "").trim() !== "0"
// hide the room below this many terminal rows
const MIN_HEIGHT = parseIntIn(process.env.OC_DITTO_MIN_HEIGHT, ROOM_HIDE_BELOW, 0, 1000)
const MAX_DITTOS = 8
const TICK_MS = 200
const AMBIENT_MS = 600
// ambient pixels are on unless OC_DITTO_AMBIENT=0
const AMBIENT_ON = (process.env.OC_DITTO_AMBIENT ?? "").trim() !== "0"
// Depth model: feet rows within this many pixels (two text rows) are the same
// plane, so their full sprite boxes must not touch. Pairs further apart in depth
// may overlap and the nearer (lower) one occludes the farther one.
const SAME_DEPTH_PX = 4
const CHAT_PAD = 6
const CHAT_DY = 8
const CHAT_GAP = 2
const VISIT_ABORT_TICKS = 40
const STAND_MIN = 3
const STAND_MAX = 12
const BREATH_TICKS = 6

type FrameName = "idle" | "squash" | "blink" | "happy" | "sad" | "laugh" | "wobbleL" | "wobbleR" | "stretch"
type ActionName = "idle" | "wander" | "visit" | "dance" | "jump" | "lookaround" | "nap" | "emote"
type Mode = "wander" | "idle" | "chat" | "popin" | "popout"
// agent: one per active child session, normal pink art. companion: minimum
// population filler with no session behind it, shiny blue art.
type DittoKind = "agent" | "companion"
type Bubble = { emote: string; ticks: number }

type Ditto = {
  seq: number
  kind: DittoKind
  cx: number
  feetY: number
  mode: Mode
  frame: FrameName
  targetCx: number
  targetFeetY: number
  walk: number
  cooldown: number
  bubble: Bubble | null
  hop: number
  popTicks: number
  chat: Chat | null
  queued: boolean
  blocked: number
  // solo behaviour
  action: ActionName
  actTicks: number
  actStep: number
  jumpStage: number
  napTicks: number
  napOn: boolean
  actions: number
  poi: number
  breath: number
}

type Chat = {
  a: string
  b: string
  phase: "approach" | "talk"
  approach: number
  targetCx: number
  targetFeetY: number
  turns: number
  turn: number
  first: number
  ticksLeft: number
}

type Run = { text: string; fg: string | null; bg: string | null }
type Frame = Run[][]

const random = (n: number) => Math.floor(Math.random() * n)
const randomIn = (lo: number, hi: number) => lo + random(Math.max(1, hi - lo + 1))
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)

// emote weights for chats: zzz is not used in chats
const EMOTE_WEIGHTS: Record<string, number> = {
  heart: 3,
  laugh: 3,
  sparkle: 2,
  sad: 2,
  exclaim: 2,
  question: 2,
  note: 1,
}
const weightedEmote = () => {
  const keys = Object.keys(EMOTE_WEIGHTS)
  const total = keys.reduce((s, k) => s + EMOTE_WEIGHTS[k], 0)
  let r = Math.random() * total
  for (const k of keys) {
    r -= EMOTE_WEIGHTS[k]
    if (r < 0) return k
  }
  return keys[keys.length - 1]
}

// walk cycle: idle, wobbleL, idle, wobbleR, one frame every 2 walked ticks
const WALK_CYCLE: FrameName[] = ["idle", "wobbleL", "idle", "wobbleR"]
// hop: up on stretch, at the top idle, landing squash for one tick
const hopOffset = (h: number) => (h >= 4 ? 1 : h === 3 ? 2 : h === 2 ? 2 : 0)
const hopFrame = (h: number): FrameName => (h >= 3 ? "stretch" : h === 2 ? "idle" : "squash")

// ------------------------------------------------------- ambient pixels

// ANIM entries cycle through palette keys, one step every `every` ambient ticks;
// the first frame equals the pixel the object already drew, so step 0 is the
// plain room. `dy` is relative to the floor top, so the pixel stays on its object
// at every room height.
const ANIM_DEFS: Array<{ x: number; dy: number; frames: string[]; every: number }> =
  Array.isArray(ANIM) ? ANIM : []
let ambientStep = 0
const animColour = (a: { frames: string[]; every: number }, step: number) => {
  const n = a.frames.length
  if (!n) return null
  return PALETTE[a.frames[Math.floor(step / Math.max(1, a.every)) % n]] ?? null
}
const paintAnim = (buf: Array<string | null>, step: number) => {
  if (!AMBIENT_ON) return
  for (const a of ANIM_DEFS) {
    const y = scene.floorTop + a.dy
    if (y < 0 || y >= scene.h || a.x < 0 || a.x >= ROOM_W) continue
    const c = animColour(a, step)
    if (c) buf[y * ROOM_W + a.x] = c
  }
}
const animChanged = (from: number, to: number) => {
  for (const a of ANIM_DEFS) if (animColour(a, from) !== animColour(a, to)) return true
  return false
}

// ------------------------------------------------------- depth and boxes

// the sprite set for a feet row: 0 is the back (small), NSETS-1 the front
const bandOf = (feet: number) => {
  const span = scene.floorMax - scene.floorMin + 1
  const raw = Math.floor(((feet - scene.floorMin) * NSETS) / Math.max(1, span))
  return clamp(raw, 0, NSETS - 1)
}
const setOf = (feet: number) => DITTO_SETS[bandOf(feet)]
const widthOf = (d: Ditto) => setOf(d.feetY).w
const heightOf = (d: Ditto) => setOf(d.feetY).h

// left edge of the box for a centre and a set
const leftOf = (cx: number, s: number) => cx - Math.floor(DITTO_SETS[s].w / 2)

// an axis aligned box, extents exclusive on the right and bottom-ish side
type Box = { l: number; r: number; t: number; b: number }
const boxAt = (cx: number, feet: number, s: number): Box => {
  const w = DITTO_SETS[s].w
  const h = DITTO_SETS[s].h
  const l = cx - Math.floor(w / 2)
  return { l, r: l + w, t: feet - h + 1, b: feet }
}

// feet actually drawn for a Ditto (hops lift the whole sprite, same set)
const drawnFeetOf = (d: Ditto) => d.feetY - hopOffset(d.hop)
const drawnTopOf = (d: Ditto) => drawnFeetOf(d) - heightOf(d) + 1

// two boxes overlap once each is inflated by 1 pixel on every side
const overlaps = (a: Box, b: Box) =>
  a.l - 1 <= b.r && b.l - 1 <= a.r && a.t - 1 <= b.b + 1 && b.t - 1 <= a.b + 1

// the boxes a standing Ditto occupies; a hopping one reserves its raised box
// AND its ground box, so nobody can slide underneath and be hit on landing
const occupied = (d: Ditto): Box[] => {
  const ground = boxAt(d.cx, d.feetY, bandOf(d.feetY))
  const raised = boxAt(d.cx, drawnFeetOf(d), bandOf(d.feetY))
  return hopOffset(d.hop) === 0 ? [ground] : [raised, ground]
}

// Depth relation between two feet rows. Same plane: the full sprite boxes must
// not touch. Different plane: overlap is allowed and paint order decides who is
// in front.
const sameDepth = (aFeet: number, bFeet: number) => Math.abs(aFeet - bFeet) <= SAME_DEPTH_PX

// a drawn Ditto plus its boxes, the unit of every depth-aware test
type Occupant = { cx: number; feet: number; boxes: Box[] }
const occupantOf = (d: Ditto): Occupant => ({ cx: d.cx, feet: d.feetY, boxes: occupied(d) })

// every drawn Ditto except one
const otherOccupants = (dittos: Map<string, Ditto>, selfId: string): Occupant[] => {
  const out: Occupant[] = []
  for (const [id, o] of dittos) {
    if (id === selfId || o.queued) continue
    out.push(occupantOf(o))
  }
  return out
}

// a position is free when it is inside the room and on the floor, and every
// other Ditto AT THE SAME DEPTH is clear of its full box. Cross-depth Dittos are
// ignored here on purpose: they may overlap and are sorted at paint time.
const freeAgainst = (occ: Occupant[], cx: number, feet: number) => {
  if (feet < scene.floorMin || feet > scene.floorMax) return false
  const box = boxAt(cx, feet, bandOf(feet))
  if (box.l < 0 || box.r > ROOM_W) return false
  for (const o of occ) {
    if (!sameDepth(feet, o.feet)) continue
    for (const b of o.boxes) if (overlaps(box, b)) return false
  }
  return true
}

const spotFree = (dittos: Map<string, Ditto>, selfId: string, cx: number, feet: number) =>
  freeAgainst(otherOccupants(dittos, selfId), cx, feet)

// does a candidate position's full sprite box touch this occupant at any depth?
// Used only for spawn preference, to try for a readable non-overlapping spot
// before falling back to legal cross-depth overlap.
const touchesOccupant = (o: Occupant, cx: number, feet: number) => {
  const box = boxAt(cx, feet, bandOf(feet))
  return o.boxes.some((b) => overlaps(box, b))
}

// a raised box must stay inside the buffer and clear of every Ditto at the same
// depth as the Ditto's ground position; cross-depth sprites may overlap
const raisedFree = (dittos: Map<string, Ditto>, selfId: string, d: Ditto, off: number) => {
  const s = bandOf(d.feetY)
  const box = boxAt(d.cx, d.feetY - off, s)
  if (box.l < 0 || box.r > ROOM_W || box.t < 0) return false
  for (const [id, o] of dittos) {
    if (id === selfId || o.queued) continue
    if (!sameDepth(d.feetY, o.feetY)) continue
    for (const b of occupied(o)) if (overlaps(box, b)) return false
  }
  return true
}

// horizontal centre range for a set, so the whole sprite stays inside the room
const cxMin = (s: number) => Math.floor(DITTO_SETS[s].w / 2)
const cxMax = (s: number) => ROOM_W - DITTO_SETS[s].w + Math.floor(DITTO_SETS[s].w / 2)

// ---------------------------------------------------------------- painting

const paint = (
  buf: Array<string | null>,
  rows: string[],
  ox: number,
  oy: number,
  colours?: Record<string, string>,
) => {
  for (let py = 0; py < rows.length; py++) {
    const row = rows[py] ?? ""
    const y = oy + py
    if (y < 0 || y >= scene.h) continue
    for (let px = 0; px < row.length; px++) {
      const colour = (colours && colours[row[px]]) ?? PALETTE[row[px]]
      if (!colour) continue
      const x = ox + px
      if (x < 0 || x >= ROOM_W) continue
      buf[y * ROOM_W + x] = colour
    }
  }
}

// The flat background: wall, baseboard, floor, plank seams and every object,
// anchored to the floor line. No gradients, no contact shading.
const paintRoom = (buf: Array<string | null>) => {
  const wall = PALETTE[WALL_COLOR] ?? null
  const floor = PALETTE[FLOOR_COLOR] ?? null
  for (let y = 0; y < scene.h; y++) {
    const c = y < scene.floorTop ? wall : floor
    if (c) buf.fill(c, y * ROOM_W, (y + 1) * ROOM_W)
  }
  const baseTop = scene.floorTop - BASEBOARD.length
  for (let i = 0; i < BASEBOARD.length; i++) paint(buf, [BASEBOARD[i]], 0, baseTop + i)
  const seam = PALETTE[FLOOR_SEAM_COLOR]
  if (seam) {
    for (const x of FLOOR_SEAMS) {
      if (x < 0 || x >= ROOM_W) continue
      for (let y = scene.floorTop + FLOOR_SEAM_FROM; y < scene.h; y++) buf[y * ROOM_W + x] = seam
    }
  }
  for (const o of OBJECTS) {
    if (!o || !Array.isArray(o.rows) || o.rows.length === 0) continue
    const fromBottom = o.from === "bottom"
    const anchor = fromBottom ? scene.floorMax : scene.floorTop
    const last = fromBottom ? anchor - o.bottom : anchor + o.bottom
    paint(buf, o.rows, o.x, last - (o.rows.length - 1))
  }
}

// soft shadow: every channel of a "#rrggbb" colour times 0.70, rounded
const SHADOW_FACTOR = 0.7
const shade = (hex: string) => {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * SHADOW_FACTOR)
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * SHADOW_FACTOR)
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * SHADOW_FACTOR)
  const hx = (v: number) => clamp(v, 0, 255).toString(16).padStart(2, "0")
  return `#${hx(r)}${hx(g)}${hx(b)}`
}

// the shadow sits on the ground row below the feet, never on the raised one; it
// covers the foot span minus one pixel at each end, and the inner 4 pixels while
// the Ditto is airborne on a hop
const paintShadow = (buf: Array<string | null>, d: Ditto) => {
  const s = setOf(d.feetY)
  const w = s.w
  const row = d.feetY + 1
  if (row < 0 || row >= scene.h) return
  const left = d.cx - Math.floor(w / 2)
  const from = hopOffset(d.hop) > 0 ? d.cx - 2 : left + 1
  const to = hopOffset(d.hop) > 0 ? d.cx + 1 : left + w - 2
  for (let x = from; x <= to; x++) {
    if (x < 0 || x >= ROOM_W) continue
    const cur = buf[row * ROOM_W + x]
    if (cur) buf[row * ROOM_W + x] = shade(cur)
  }
}

// badge glyphs: any char except "." is an on-pixel, all in BADGE_COLOR
const paintBadge = (buf: Array<string | null>, text: string) => {
  if (!text) return
  const left = ROOM_W - 2 - text.length * DIGIT_W
  const top = 2
  for (let i = 0; i < text.length; i++) {
    const rows = GLYPHS[text[i]] ?? []
    for (let py = 0; py < rows.length; py++) {
      const row = rows[py] ?? ""
      const y = top + py
      if (y < 0 || y >= scene.h) continue
      for (let px = 0; px < row.length; px++) {
        if (row[px] === ".") continue
        const x = left + i * DIGIT_W + px
        if (x < 0 || x >= ROOM_W) continue
        buf[y * ROOM_W + x] = BADGE_COLOR
      }
    }
  }
}

// Compose the whole room into text rows of merged runs.
const compose = (list: Ditto[], parity: number, badge: string): Frame => {
  const buf: Array<string | null> = new Array(scene.h * ROOM_W).fill(null)
  paintRoom(buf)
  // ambient pixels sit on the background, under shadows, sprites and bubbles
  paintAnim(buf, ambientStep)

  // back to front: sorted by feet y so the lower (larger) Ditto is drawn last
  const shown = list.filter((d) => !d.queued && (d.mode !== "popout" || parity % 2 === 0))
  // depth order: ground feet y, farthest first; ties by creation seq. Sorting by
  // ground feet (not the lifted feet) keeps occlusion stable during hops.
  const sorted = [...shown].sort((p, q) => p.feetY - q.feetY || p.seq - q.seq)

  // all shadows first, so no shadow ever falls on a sprite
  for (const d of sorted) paintShadow(buf, d)

  for (const d of sorted) {
    const s = setOf(d.feetY)
    paint(
      buf,
      s.frames[d.frame] ?? s.frames.idle ?? [],
      d.cx - Math.floor(s.w / 2),
      drawnTopOf(d),
      d.kind === "companion" ? DITTO_COLORS.companion : undefined,
    )
  }

  // bubbles go on top of every Ditto, above that Ditto's head
  for (const d of sorted) {
    if (!d.bubble || d.bubble.ticks <= 0) continue
    const bx = clamp(d.cx - BUBBLE_TAIL_X, 0, Math.max(0, ROOM_W - BUBBLE_W))
    const by = Math.max(0, drawnTopOf(d) - BUBBLE_H + 1)
    paint(buf, BUBBLE, bx, by)
    paint(buf, EMOTES[d.bubble.emote] ?? [], bx + BUBBLE_INNER_X, by + BUBBLE_INNER_Y)
  }

  // the overflow badge is the last thing drawn
  paintBadge(buf, badge)

  const out: Frame = []
  for (let r = 0; r < scene.h / 2; r++) {
    const runs: Run[] = []
    const top = 2 * r
    const bottom = 2 * r + 1
    for (let x = 0; x < ROOM_W; x++) {
      const t = buf[top * ROOM_W + x]
      const u = buf[bottom * ROOM_W + x]
      let text: string
      let fg: string | null
      let bg: string | null
      if (t === null && u === null) { text = " "; fg = null; bg = null }
      else if (u === null) { text = "▀"; fg = t; bg = null }
      else if (t === null) { text = "▄"; fg = u; bg = null }
      else if (t === u) { text = "█"; fg = t; bg = null }
      else { text = "▀"; fg = t; bg = u }
      const prev = runs[runs.length - 1]
      if (prev && prev.text[0] === text && prev.fg === fg && prev.bg === bg) prev.text += text
      else runs.push({ text, fg, bg })
    }
    out.push(runs)
  }
  return out
}

// --------------------------------------------------------------- animation

const newDitto = (seq: number, kind: DittoKind): Ditto => ({
  seq,
  kind,
  cx: 0,
  feetY: scene.floorMin,
  mode: "wander",
  frame: "idle",
  targetCx: 0,
  targetFeetY: scene.floorMin,
  walk: 0,
  cooldown: 0,
  bubble: null,
  hop: 0,
  popTicks: 0,
  chat: null,
  queued: true,
  blocked: 0,
  action: "idle",
  actTicks: 0,
  actStep: 0,
  jumpStage: 0,
  napTicks: 0,
  napOn: false,
  actions: 0,
  poi: -1,
  breath: 0,
})

// ------------------------------------------------------ placement grid

// Standing positions are drawn from a coarse grid instead of random pixels: a
// full scan can tell "no spot" apart from "20 random tries failed", and a spawn
// can pick the spot that leaves the most room behind it. The grid is only a
// candidate list, never a collision shortcut: every use is still validated by
// spotFree. Step 4 x 3 keeps neighbours far enough apart that the same list can
// be packed, without making the walk targets look mechanical.
const SPOT_STEP_X = 4
const SPOT_STEP_Y = 3
type Spot = { cx: number; feet: number }

const spotCandidates = (): Spot[] => {
  const out: Spot[] = []
  const feetRows: number[] = []
  for (let feet = scene.floorMin; feet <= scene.floorMax; feet += SPOT_STEP_Y) feetRows.push(feet)
  if (feetRows[feetRows.length - 1] !== scene.floorMax) feetRows.push(scene.floorMax)
  for (const feet of feetRows) {
    const s = bandOf(feet)
    const cols: number[] = []
    for (let cx = cxMin(s); cx <= cxMax(s); cx += SPOT_STEP_X) cols.push(cx)
    if (cols[cols.length - 1] !== cxMax(s)) cols.push(cxMax(s))
    for (const cx of cols) out.push({ cx, feet })
  }
  return out
}

// free candidates, scanned in full in reading order
const freeSpots = (dittos: Map<string, Ditto>, id: string): Spot[] =>
  spotCandidates().filter((s) => spotFree(dittos, id, s.cx, s.feet))

// would this candidate be close enough to an existing Ditto for a chat to start
// (same horizontal reach and depth window as maybeChat)?
const chatNear = (c: Spot, o: Occupant) =>
  Math.abs(c.cx - o.cx) < (DITTO_SETS[bandOf(c.feet)].w + DITTO_SETS[bandOf(o.feet)].w) / 2 + CHAT_PAD &&
  Math.abs(c.feet - o.feet) < CHAT_DY

// a free standing position, or false when the room is too crowded right now
const pickTarget = (dittos: Map<string, Ditto>, id: string, d: Ditto): boolean => {
  const free = freeSpots(dittos, id)
  if (!free.length) {
    d.targetCx = d.cx
    d.targetFeetY = d.feetY
    return false
  }
  const pick = free[random(free.length)]
  d.targetCx = pick.cx
  d.targetFeetY = pick.feet
  return true
}

// same, restricted to a horizontal band (used to walk away after a chat)
const targetOnSide = (dittos: Map<string, Ditto>, id: string, d: Ditto, lo: number, hi: number): boolean => {
  const free = freeSpots(dittos, id).filter((s) => s.cx >= lo && s.cx <= hi)
  if (!free.length) {
    d.targetCx = d.cx
    d.targetFeetY = d.feetY
    return false
  }
  const pick = free[random(free.length)]
  d.targetCx = pick.cx
  d.targetFeetY = pick.feet
  return true
}

// feet row of a point of interest relative to the current floor
const poiFeet = (p: (typeof POIS)[number]) =>
  p.at === "front" ? scene.floorMax - p.offset : scene.floorMin + p.offset

// validated move; the only way cx or feetY ever change. A move that changes the
// band is tested with the new set's box, so a growing Ditto cannot clip
const moveTo = (dittos: Map<string, Ditto>, id: string, d: Ditto, cx: number, feet: number): boolean => {
  if (!spotFree(dittos, id, cx, feet)) return false
  d.cx = cx
  d.feetY = feet
  return true
}

const stepHop = (dittos: Map<string, Ditto>, id: string, d: Ditto) => {
  const next = d.hop - 1
  if (next <= 0) {
    d.hop = 0
    d.frame = "idle"
    return
  }
  const off = hopOffset(next)
  if (off > 0 && !raisedFree(dittos, id, d, off)) {
    d.hop = 0
    d.frame = "idle"
    return
  }
  d.hop = next
  d.frame = hopFrame(next)
}

// ------------------------------------------------------ solo behaviour

const drawnCount = (dittos: Map<string, Ditto>) => {
  let n = 0
  for (const d of dittos.values()) if (!d.queued) n++
  return n
}

// stand between two actions and breathe; 3 to 12 ticks, the shortest pause of
// the whole cycle, so a lone Ditto is never still for long
const stand = (d: Ditto) => {
  d.mode = "idle"
  d.action = "idle"
  d.actTicks = randomIn(STAND_MIN, STAND_MAX)
  d.actStep = 0
  d.jumpStage = 0
  d.frame = "idle"
  d.bubble = null
  d.hop = 0
  d.breath = 0
  d.blocked = 0
  d.poi = -1
}

const startWander = (dittos: Map<string, Ditto>, id: string, d: Ditto): boolean => {
  if (!pickTarget(dittos, id, d)) return false
  d.mode = "wander"
  d.action = "wander"
  d.actTicks = 0
  d.blocked = 0
  d.actions++
  return true
}

const startVisit = (dittos: Map<string, Ditto>, id: string, d: Ditto): boolean => {
  if (!POIS.length) return false
  const order = POIS.map((_, i) => i).sort(() => Math.random() - 0.5)
  for (const i of order) {
    const p = POIS[i]
    if (!p) continue
    const feet = poiFeet(p)
    if (!spotFree(dittos, id, p.cx, feet)) continue
    d.action = "visit"
    d.poi = i
    d.targetCx = p.cx
    d.targetFeetY = feet
    d.mode = "wander"
    d.actTicks = VISIT_ABORT_TICKS
    d.blocked = 0
    d.actions++
    return true
  }
  return false
}

const startDance = (d: Ditto) => {
  d.mode = "idle"
  d.action = "dance"
  d.actTicks = 14
  d.actStep = 0
  d.frame = "wobbleL"
  d.bubble = { emote: "note", ticks: 8 }
  d.actions++
}

const startJump = (dittos: Map<string, Ditto>, id: string, d: Ditto): boolean => {
  if (!raisedFree(dittos, id, d, 2)) return false
  d.mode = "idle"
  d.action = "jump"
  d.jumpStage = 0
  d.actTicks = 0
  d.hop = 4
  d.frame = "stretch"
  d.actions++
  return true
}

const startLook = (d: Ditto) => {
  d.mode = "idle"
  d.action = "lookaround"
  d.actStep = 0
  d.actTicks = 0
  d.frame = "idle"
  d.actions++
}

const startNap = (d: Ditto) => {
  d.mode = "idle"
  d.action = "nap"
  d.actTicks = 30
  d.actStep = 0
  d.frame = "squash"
  d.bubble = { emote: "zzz", ticks: 8 }
  d.napTicks = 8
  d.napOn = true
  d.actions = 0
}

const startEmote = (d: Ditto) => {
  d.mode = "idle"
  d.action = "emote"
  d.actTicks = 8
  d.frame = "idle"
  d.bubble = { emote: "note", ticks: 8 }
  d.actions++
}

// weighted pick of the next solo action; nap only after 3 actions and never in
// a crowded room (3 or more Dittos drawn)
const pickAction = (dittos: Map<string, Ditto>, id: string, d: Ditto) => {
  const options: Array<[ActionName, number]> = [
    ["wander", 35], ["visit", 20], ["dance", 10], ["jump", 10], ["lookaround", 15], ["emote", 5],
  ]
  if (d.actions >= 3 && drawnCount(dittos) < 3) options.push(["nap", 5])
  const total = options.reduce((sum, [, w]) => sum + w, 0)
  let r = Math.random() * total
  let pick: ActionName = "wander"
  for (const [a, w] of options) {
    r -= w
    if (r < 0) { pick = a; break }
  }
  switch (pick) {
    case "wander": if (startWander(dittos, id, d)) return; break
    case "visit": if (startVisit(dittos, id, d)) return; break
    case "dance": startDance(d); return
    case "jump": if (startJump(dittos, id, d)) return; break
    case "lookaround": startLook(d); return
    case "nap": startNap(d); return
    case "emote": startEmote(d); return
  }
  // nothing could start right now: stand a moment and try again later
  stand(d)
}

// the end of a visit: stand at the point of interest, show its emote, or nap
// there when the point asks for zzz (the nap rules, but only 14 ticks)
const arriveAtPoi = (d: Ditto) => {
  const p = d.poi >= 0 ? POIS[d.poi] : undefined
  if (!p) { stand(d); return }
  if (p.emote === "zzz") {
    d.mode = "idle"
    d.action = "nap"
    d.actTicks = 14
    d.actStep = 0
    d.frame = "squash"
    d.bubble = { emote: "zzz", ticks: 8 }
    d.napTicks = 8
    d.napOn = true
    return
  }
  d.mode = "idle"
  d.action = "visit"
  d.actTicks = randomIn(12, 18)
  d.bubble = { emote: p.emote, ticks: 8 }
  d.frame = p.emote === "heart" || p.emote === "sparkle" ? "happy" : p.emote === "laugh" ? "laugh" : "idle"
  d.breath = 0
}

// the passive half of the cycle: everything that happens while standing still
const stepAction = (dittos: Map<string, Ditto>, id: string, d: Ditto) => {
  switch (d.action) {
    case "idle": {
      d.breath++
      if (d.hop === 0) {
        const reaction = d.frame === "happy" || d.frame === "sad" || d.frame === "laugh"
        if (!reaction) d.frame = Math.floor(d.breath / BREATH_TICKS) % 2 === 0 ? "idle" : "squash"
      }
      if (d.actTicks > 0 && --d.actTicks <= 0) pickAction(dittos, id, d)
      return
    }
    case "emote": {
      d.frame = "idle"
      if (--d.actTicks <= 0) stand(d)
      return
    }
    case "dance": {
      if (d.actStep === 0) {
        d.frame = d.actTicks % 2 === 0 ? "wobbleL" : "wobbleR"
        if (--d.actTicks <= 0) {
          d.actStep = 1
          d.actTicks = 2
          d.bubble = null
          d.frame = "happy"
        }
      } else {
        d.frame = "happy"
        if (--d.actTicks <= 0) stand(d)
      }
      return
    }
    case "jump": {
      if (d.hop > 0) {
        stepHop(dittos, id, d)
        if (d.hop === 0) {
          if (d.jumpStage === 0) { d.jumpStage = 1; d.actTicks = 2; d.frame = "idle" }
          else stand(d)
        }
        return
      }
      if (d.jumpStage === 0) {
        // the picker already checked, this is the second hop and the fallback
        if (raisedFree(dittos, id, d, 2)) { d.hop = 4; d.frame = "stretch" }
        else stand(d)
        return
      }
      d.frame = "idle"
      if (--d.actTicks <= 0) {
        if (raisedFree(dittos, id, d, 2)) { d.hop = 4; d.frame = "stretch" }
        else stand(d)
      }
      return
    }
    case "lookaround": {
      d.actStep++
      d.frame = d.actStep === 1 || d.actStep === 5 ? "blink" : "idle"
      if (d.actStep === 6) moveTo(dittos, id, d, d.cx - 1, d.feetY)
      if (d.actStep === 8) moveTo(dittos, id, d, d.cx + 1, d.feetY)
      if (d.actStep >= 9) stand(d)
      return
    }
    case "nap": {
      d.frame = "squash"
      if (d.actStep === 0) {
        d.napTicks--
        if (d.napTicks <= 0) {
          if (d.napOn) { d.napOn = false; d.napTicks = 4; d.bubble = null }
          else { d.napOn = true; d.napTicks = 8; d.bubble = { emote: "zzz", ticks: 8 } }
        }
        if (--d.actTicks <= 0) {
          d.actStep = 1
          d.actTicks = 2
          d.bubble = null
          d.frame = "stretch"
        }
      } else {
        d.frame = "stretch"
        if (--d.actTicks <= 0) stand(d)
      }
      return
    }
    case "visit": {
      if (!d.bubble && (d.frame === "happy" || d.frame === "laugh")) d.frame = "idle"
      if (--d.actTicks <= 0) stand(d)
      return
    }
    default:
      stand(d)
  }
}

// can this Ditto start a chat right now? only from wander or idle standing, a
// visit only once it has arrived, never from dance, jump, lookaround or nap
const canChat = (d: Ditto) => {
  if (d.mode === "wander") return d.action === "wander"
  if (d.mode === "idle") return d.action === "idle" || d.action === "visit" || d.action === "emote"
  return false
}

const startTurn = (c: Chat, dittos: Map<string, Ditto>) => {
  const A = dittos.get(c.a)
  const B = dittos.get(c.b)
  if (!A || !B) return
  const first = c.first === 0 ? A : B
  const speaker = c.turn % 2 === 0 ? first : first === A ? B : A
  const listener = speaker === A ? B : A
  const listenerId = speaker === A ? c.b : c.a
  const emote = weightedEmote()
  speaker.bubble = { emote, ticks: 8 }
  listener.bubble = null
  speaker.frame = "idle"
  listener.frame = "idle"
  listener.hop = 0
  if (emote === "laugh") { speaker.frame = "laugh"; listener.frame = "laugh" }
  else if (emote === "heart" || emote === "sparkle") listener.frame = "happy"
  else if (emote === "sad") listener.frame = "sad"
  else if (emote === "exclaim") {
    // a hop reserves the ground band's set, and only starts when it fits
    if (raisedFree(dittos, listenerId, listener, 2)) {
      listener.hop = 4
      listener.frame = "stretch"
    }
  }
  c.ticksLeft = 8
}

const endChat = (c: Chat, chats: Chat[], dittos: Map<string, Ditto>, completed: boolean) => {
  const i = chats.indexOf(c)
  if (i >= 0) chats.splice(i, 1)
  const A = dittos.get(c.a)
  const B = dittos.get(c.b)
  for (const d of [A, B]) {
    if (!d) continue
    d.chat = null
    d.bubble = null
    d.hop = 0
    d.frame = "idle"
    d.cooldown = completed ? 60 : 30
    if (d.mode === "chat") stand(d)
  }
  if (!completed || !A || !B) return
  // walk away to opposite sides
  const mid = Math.floor(ROOM_W / 2)
  const aLeft = A.cx <= B.cx
  targetOnSide(dittos, c.a, A, aLeft ? 0 : mid, aLeft ? mid : ROOM_W - 1)
  targetOnSide(dittos, c.b, B, aLeft ? mid : 0, aLeft ? ROOM_W - 1 : mid)
}

const startChat = (aId: string, bId: string, chats: Chat[], dittos: Map<string, Ditto>) => {
  const A = dittos.get(aId)
  const B = dittos.get(bId)
  if (!A || !B) return
  const sa = bandOf(A.feetY)
  const sb = bandOf(B.feetY)
  const aw = DITTO_SETS[sa].w
  const bw = DITTO_SETS[sb].w
  const aLeft = leftOf(A.cx, sa)
  const aRight = aLeft + aw
  const prefer = B.cx >= A.cx ? 1 : -1
  // beside the first one, CHAT_GAP pixels of clear space between the boxes, on
  // whichever side is free and keeps the second Ditto in its own band
  for (const side of [prefer, -prefer]) {
    const targetCx = side > 0
      ? aRight + CHAT_GAP + Math.floor(bw / 2)
      : aLeft - CHAT_GAP - bw + Math.floor(bw / 2)
    for (const df of [0, -1, 1]) {
      const targetFeetY = clamp(A.feetY + df, scene.floorMin, scene.floorMax)
      if (bandOf(targetFeetY) !== sb) continue
      if (!spotFree(dittos, bId, targetCx, targetFeetY)) continue
      const c: Chat = {
        a: aId,
        b: bId,
        phase: "approach",
        approach: 12,
        targetCx,
        targetFeetY,
        turns: 3 + random(3),
        turn: 0,
        first: random(2),
        ticksLeft: 0,
      }
      for (const d of [A, B]) {
        d.mode = "chat"
        d.chat = c
        d.bubble = null
        d.hop = 0
        d.frame = "idle"
        d.blocked = 0
      }
      chats.push(c)
      return
    }
  }
  // nowhere to stand next to each other: no chat, both back off for a while
  A.cooldown = 30
  B.cooldown = 30
}

const stepChat = (c: Chat, chats: Chat[], dittos: Map<string, Ditto>) => {
  const A = dittos.get(c.a)
  const B = dittos.get(c.b)
  if (!A || !B || A.mode !== "chat" || B.mode !== "chat" || A.chat !== c || B.chat !== c) {
    endChat(c, chats, dittos, false)
    return
  }
  if (c.phase === "approach") {
    // the second one closes the gap, one pixel per tick, at most 12 ticks
    const dx = c.targetCx - B.cx
    const dy = c.targetFeetY - B.feetY
    if (dx === 0 && dy === 0) {
      c.phase = "talk"
      c.turn = 0
      startTurn(c, dittos)
      return
    }
    if (dx !== 0) moveTo(dittos, c.b, B, B.cx + sign(dx), B.feetY)
    else if (dy !== 0) moveTo(dittos, c.b, B, B.cx, clamp(B.feetY + sign(dy), scene.floorMin, scene.floorMax))
    c.approach--
    if (c.approach <= 0) {
      c.phase = "talk"
      c.turn = 0
      startTurn(c, dittos)
    }
    return
  }
  if (A.hop > 0) stepHop(dittos, c.a, A)
  if (B.hop > 0) stepHop(dittos, c.b, B)
  c.ticksLeft--
  if (c.ticksLeft <= 0) {
    c.turn++
    if (c.turn >= c.turns) endChat(c, chats, dittos, true)
    else startTurn(c, dittos)
  }
}

// chat started by two Dittos that happen to be close to each other
const maybeChat = (chats: Chat[], dittos: Map<string, Ditto>) => {
  const ids = [...dittos.keys()]
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const A = dittos.get(ids[i])
      const B = dittos.get(ids[j])
      if (!A || !B || A.queued || B.queued) continue
      if (!canChat(A) || !canChat(B)) continue
      if (A.cooldown > 0 || B.cooldown > 0) continue
      // centre distance against the average half widths of the two sets
      const reach = (widthOf(A) + widthOf(B)) / 2 + CHAT_PAD
      if (Math.abs(A.cx - B.cx) >= reach) continue
      if (Math.abs(A.feetY - B.feetY) >= CHAT_DY) continue
      if (occupied(A).some((a) => occupied(B).some((b) => overlaps(a, b)))) continue
      if (Math.random() >= 0.15) continue
      startChat(ids[i], ids[j], chats, dittos)
      return
    }
  }
}

// One 200 ms step for one Ditto that is not in a chat and has a spot.
const stepDitto = (dittos: Map<string, Ditto>, id: string, d: Ditto) => {
  if (d.queued || d.mode === "chat") return
  if (d.cooldown > 0) d.cooldown--
  if (d.bubble && --d.bubble.ticks <= 0) d.bubble = null

  if (d.mode === "popout") {
    d.popTicks--
    d.frame = "happy"
    d.bubble = null
    d.hop = 0
    return
  }

  if (d.mode === "popin") {
    d.popTicks--
    if (d.hop > 0) stepHop(dittos, id, d)
    else d.frame = d.popTicks % 2 === 0 ? "idle" : "squash"
    if (d.popTicks <= 0) {
      d.bubble = null
      d.hop = 0
      stand(d)
    }
    return
  }

  if (d.mode === "idle") {
    stepAction(dittos, id, d)
    return
  }

  // wander: 1 px in x per tick, 1 px in y every 2 ticks
  const dx = d.targetCx - d.cx
  const dy = d.targetFeetY - d.feetY
  if (dx === 0 && dy === 0) {
    if (d.action === "visit") arriveAtPoi(d)
    else stand(d)
    return
  }
  if (d.action === "visit" && --d.actTicks <= 0) {
    // a visit gives up after 40 ticks of walking
    stand(d)
    return
  }
  const sx = sign(dx)
  const sy = sign(dy)
  let moved = false
  if (sx !== 0) {
    if (moveTo(dittos, id, d, d.cx + sx, d.feetY)) moved = true
  }
  const yDue = sy !== 0 && (d.walk % 2 === 0 || (sx !== 0 && !moved))
  if (yDue) {
    if (moveTo(dittos, id, d, d.cx, clamp(d.feetY + sy, scene.floorMin, scene.floorMax))) moved = true
  }
  if (moved) {
    d.blocked = 0
    d.bubble = null // never a bubble while walking
    d.walk++
    d.frame = WALK_CYCLE[Math.floor(d.walk / 2) % WALK_CYCLE.length]
  } else {
    d.blocked++
    d.frame = "idle"
    if (d.blocked >= 10) {
      d.blocked = 0
      if (d.action === "visit") { stand(d); return }
      if (!pickTarget(dittos, id, d)) { stand(d); return }
    }
  }
}

// COMPANION_POLICY_START
// Minimum population rule when companions are enabled: 0 active agents -> 2
// companions, 1 -> 1 companion, 2 or more -> none. Disabled companions always
// target 0. Kept as plain JavaScript so the test suite can evaluate this exact
// function without a JSX loader.
const companionTarget = (agents, companionsOn = true) =>
  companionsOn ? (agents <= 0 ? 2 : agents === 1 ? 1 : 0) : 0
// COMPANION_POLICY_END
export { companionTarget }

export default Plugin.define({
  id: "chengo.ditto-room",
  setup(context) {
    const data = context.data
    // children that ended through an execution.failed / interrupted event
    // (session ids only, never logged)
    const failedIDs = new Set<string>()
    const [failedTick, setFailedTick] = createSignal(0)
    const offs: Array<() => void> = []
    try {
      offs.push(data.on("session.execution.failed", (e: any) => { failedIDs.add(e.data.sessionID); setFailedTick((n) => n + 1) }))
      offs.push(data.on("session.execution.interrupted", (e: any) => { failedIDs.add(e.data.sessionID); setFailedTick((n) => n + 1) }))
      offs.push(data.on("session.execution.started", (e: any) => { failedIDs.delete(e.data.sessionID); setFailedTick((n) => n + 1) }))
    } catch (e) { logError("event subscribe", e) }

    const toMs = (t: any): number | undefined => {
      if (t === undefined || t === null) return undefined
      const n = t instanceof Date ? t.getTime() : typeof t === "number" ? t : Date.parse(String(t))
      return Number.isFinite(n) ? n : undefined
    }

    // Active / ended decision for one child (rules in the header comment).
    // Reads are reactive; any failure degrades to status() alone.
    const classify = (id: string, parentRunning: (id: string) => boolean): { active: boolean } => {
      try {
        const running = data.session.status(id) === "running"
        const msgs: any[] = (data.session.message.list(id) as any[]) ?? []
        const last = msgs[msgs.length - 1]
        const lastIdle = last?.type === "idle" ? last : undefined
        const ended = !running && (lastIdle !== undefined || failedIDs.has(id))
        let starting = false
        try {
          for (const p of (data.session.pending.list(id) as any[]) ?? [])
            if (p?.type === "user" && data.session.pending.status(id, p.id) === "starting") { starting = true; break }
        } catch (_) {}
        const inflight =
          last?.type === "assistant" &&
          (last.time?.completed === undefined ||
            (last.content ?? []).some((p: any) => p?.type === "tool" && (p.state?.status === "running" || p.state?.status === "streaming")))
        return { active: running || (!ended && (starting || inflight || parentRunning(id))) }
      } catch (e) {
        logError("classify", e)
        return { active: false }
      }
    }

    // ditto state, keyed by session id for agents and by companion<N> for
    // fillers (the keys are never logged or rendered). activeAgentCount is the
    // number of really active child sessions, never the number of Dittos.
    const dittos = new Map<string, Ditto>()
    const chats: Chat[] = []
    let parity = 0
    let seq = 0
    let companionSeq = 0
    let activeAgentCount = DEMO
    const [count, setCount] = createSignal(0)
    const [frame, setFrame] = createSignal<Frame>(compose([], 0, ""))
    let timer: ReturnType<typeof setInterval> | undefined
    let stopped = false

    const companions = () => [...dittos].filter(([, d]) => d.kind === "companion")
    const companionCount = () => companions().length
    let lastPopulation = ""
    const notePopulation = () => {
      const total = dittos.size
      if (total !== count()) setCount(total)
      const key = `${activeAgentCount}/${companionCount()}`
      if (key === lastPopulation) return
      lastPopulation = key
      log(`agents: ${activeAgentCount}, companions: ${companionCount()}`)
    }

    // Bring the companion count to the target for the current policy. When
    // companions are disabled the target is always 0, so no synthetic Dittos are
    // created and any existing ones are removed. When the target is above the
    // current count, new companions are queued and pop in through the normal
    // placement; surplus companions pop out (newest first) and are removed by
    // the tick, while a queued surplus is dropped at once. A companion in a chat
    // has that chat ended before it leaves. This runs from the spawn effect and
    // from every tick, so a companion removed during a pop-out is replenished on
    // the next tick.
    const reconcileCompanions = (agents: number) => {
      const want = companionTarget(agents, COMPANIONS_ON)
      const have = companions()
      if (have.length < want) {
        for (let i = have.length; i < want; i++) {
          dittos.set(`companion${companionSeq++}`, newDitto(seq++, "companion"))
        }
        return
      }
      if (have.length <= want) return
      const extra = have.sort((a, b) => b[1].seq - a[1].seq).slice(0, have.length - want)
      for (const [id, d] of extra) {
        if (d.queued) { dittos.delete(id); continue }
        if (d.mode === "popout") continue
        if (d.chat) endChat(d.chat, chats, dittos, false)
        d.mode = "popout"
        d.popTicks = 5
        d.frame = "happy"
        d.bubble = null
        d.hop = 0
      }
    }
    const drawnList = () => [...dittos.values()].filter((d) => !d.queued).slice(0, MAX_DITTOS)
    const queuedCount = () => {
      let q = 0
      for (const d of dittos.values()) if (d.queued) q++
      return q
    }
    const badgeText = () => {
      const q = queuedCount()
      if (q <= 0) return ""
      return q > 99 ? "+99" : `+${q}`
    }

    // place a queued Ditto on the free spot that leaves the most room behind it.
    // Every candidate is a real standing spot (freeAgainst); the score is the
    // number of other candidates that stay free once this one is taken, with
    // random tie breaking. A companion prefers a spot within chat reach of an
    // existing Ditto, and every spawn prefers a spot whose full sprite does not
    // touch anyone at all; cross-depth overlap is used only when nothing cleaner
    // is free. The pop-in hop runs only when the raised box is free, so a packed
    // front row still pops in with squash plus sparkle.
    const tryPlace = (id: string, d: Ditto): boolean => {
      const others = otherOccupants(dittos, id)
      const free = spotCandidates().filter((c) => freeAgainst(others, c.cx, c.feet))
      if (!free.length) return false
      let choices = free
      if (d.kind === "companion") {
        const near = choices.filter((c) => others.some((o) => chatNear(c, o)))
        if (near.length) choices = near
      }
      const clean = choices.filter((c) => !others.some((o) => touchesOccupant(o, c.cx, c.feet)))
      if (clean.length) choices = clean
      let best: Spot | null = null
      let bestScore = -1
      for (const c of choices) {
        const withSelf: Occupant[] = [
          ...others,
          { cx: c.cx, feet: c.feet, boxes: [boxAt(c.cx, c.feet, bandOf(c.feet))] },
        ]
        let score = 0
        for (const o of free) {
          if (o === c) continue
          if (freeAgainst(withSelf, o.cx, o.feet)) score++
        }
        if (score > bestScore || (score === bestScore && Math.random() < 0.5)) {
          best = c
          bestScore = score
        }
      }
      if (!best) return false
      d.cx = best.cx
      d.feetY = best.feet
      d.hop = raisedFree(dittos, id, d, 2) ? 4 : 0
      d.queued = false
      d.mode = "popin"
      d.popTicks = 6
      d.frame = d.hop > 0 ? "stretch" : "squash"
      d.bubble = { emote: "sparkle", ticks: 6 }
      d.blocked = 0
      d.walk = 0
      d.action = "idle"
      d.actTicks = 0
      d.actStep = 0
      d.jumpStage = 0
      d.actions = 0
      d.poi = -1
      d.breath = 0
      d.targetCx = best.cx
      d.targetFeetY = best.feet
      return true
    }

    const placeQueued = () => {
      let drawn = 0
      for (const d of dittos.values()) if (!d.queued) drawn++
      if (drawn >= MAX_DITTOS) return
      for (const [id, d] of dittos) {
        if (drawn >= MAX_DITTOS) break
        if (!d.queued) continue
        if (tryPlace(id, d)) drawn++
      }
    }

    // nearest free spot for the defensive repair below
    const nearestFree = (id: string, d: Ditto): { cx: number; feet: number } | null => {
      let best: { cx: number; feet: number; dist: number } | null = null
      for (let feet = scene.floorMin; feet <= scene.floorMax; feet++) {
        const s = bandOf(feet)
        for (let cx = cxMin(s); cx <= cxMax(s); cx++) {
          if (!spotFree(dittos, id, cx, feet)) continue
          const dist = Math.abs(cx - d.cx) + Math.abs(feet - d.feetY)
          if (!best || dist < best.dist) best = { cx, feet, dist }
        }
      }
      return best
    }

    // this must never fire for same-depth pairs; cross-depth overlap is legal
    const fixOverlaps = () => {
      const list = [...dittos].filter(([, d]) => !d.queued)
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const [ia, a] = list[i]
          const [ib, b] = list[j]
          if (!sameDepth(a.feetY, b.feetY)) continue
          const hit = occupied(a).some((x) => occupied(b).some((y) => overlaps(x, y)))
          if (!hit) continue
          const [id, d] = a.seq >= b.seq ? [ia, a] : [ib, b]
          if (d.chat) endChat(d.chat, chats, dittos, false)
          const spot = nearestFree(id, d)
          if (spot) {
            d.cx = spot.cx
            d.feetY = spot.feet
            d.hop = 0
          } else {
            d.queued = true
            d.bubble = null
            d.hop = 0
            d.mode = "wander"
          }
          logOverlap()
        }
      }
    }

    // the terminal height changed: a Ditto whose feet fell outside the new floor
    // is requeued (never moved into someone else's box) and pops back in on the
    // next tick through the packing placement. Dittos that still fit keep their
    // spot; their targets and hops are clamped to the new floor.
    const fitScene = () => {
      for (const d of dittos.values()) {
        if (d.queued) continue
        d.targetFeetY = clamp(d.targetFeetY, scene.floorMin, scene.floorMax)
        if (d.feetY < scene.floorMin || d.feetY > scene.floorMax) {
          if (d.chat) endChat(d.chat, chats, dittos, false)
          d.queued = true
          d.bubble = null
          d.hop = 0
          d.mode = "wander"
          continue
        }
        d.hop = 0
      }
      for (const c of [...chats]) {
        const a = dittos.get(c.a)
        const b = dittos.get(c.b)
        if (!a || !b || a.queued || b.queued) { endChat(c, chats, dittos, false); continue }
        c.targetFeetY = clamp(c.targetFeetY, scene.floorMin, scene.floorMax)
      }
    }

    const tick = () => {
      try {
        parity++
        reconcileCompanions(activeAgentCount)
        maybeChat(chats, dittos)
        for (const c of [...chats]) stepChat(c, chats, dittos)
        for (const [id, d] of dittos) if (d.mode !== "chat") stepDitto(dittos, id, d)
        placeQueued()
        fixOverlaps()
        for (const [id, d] of [...dittos]) {
          if (!d.queued && d.mode === "popout" && d.popTicks <= 0) dittos.delete(id)
        }
        notePopulation()
        setFrame(compose(drawnList(), parity, badgeText()))
      } catch (e) { logError("tick", e) }
    }

    const stopTimer = () => {
      if (timer !== undefined) { clearInterval(timer); timer = undefined }
    }
    const startTimer = () => {
      if (timer !== undefined || stopped) return
      timer = setInterval(tick, TICK_MS)
    }

    // the slow ambient clock runs whenever the room is visible, even with no
    // Dittos; it only recomposes when the 200 ms Ditto ticker is stopped (that
    // ticker recomposes anyway) and only when an animated pixel changed
    let ambientTimer: ReturnType<typeof setInterval> | undefined
    const stopAmbient = () => {
      if (ambientTimer !== undefined) { clearInterval(ambientTimer); ambientTimer = undefined }
    }
    const startAmbient = () => {
      if (ambientTimer !== undefined || stopped || !AMBIENT_ON || ANIM_DEFS.length === 0) return
      ambientTimer = setInterval(() => {
        try {
          const from = ambientStep
          ambientStep++
          if (timer !== undefined) return
          if (!animChanged(from, ambientStep)) return
          setFrame(compose(drawnList(), parity, badgeText()))
        } catch (e) { logError("ambient", e) }
      }, AMBIENT_MS)
    }

    if (DEMO > 0) {
      // same path as real sessions: created queued, placed by the tick. DEMO
      // counts fake AGENTS; the minimum population adds companions on top when
      // companions are enabled.
      for (let i = 0; i < DEMO; i++) dittos.set(`demo${i}`, newDitto(seq++, "agent"))
      activeAgentCount = DEMO
      reconcileCompanions(activeAgentCount)
      setFrame(compose(drawnList(), parity, badgeText()))
      notePopulation()
    }

    function Room(props: { sessionID: string }) {
      // terminal height: the room is dropped before it can crowd the sidebar
      const [rows, setRows] = createSignal(process.stdout.rows || 60)
      const onResize = () => setRows(process.stdout.rows || 60)
      try { process.stdout.on("resize", onResize) } catch (_) {}
      onCleanup(() => { try { process.stdout.off("resize", onResize) } catch (_) {} })

      // direct children of this session, newest first
      const kids = createMemo<Array<{ id: string }>>(() => {
        if (DEMO > 0) return []
        try {
          return (data.session.family(props.sessionID) as string[])
            .filter((x) => x !== props.sessionID && (data.session.get(x) as any)?.parentID === props.sessionID)
            .map((x) => ({ id: x, created: toMs((data.session.get(x) as any)?.time?.created) ?? 0 }))
            .sort((a, b) => b.created - a.created)
        } catch (e) {
          logError("kids", e)
          return []
        }
      })

      // "still running" flag per child, from the parent's subagent tool parts
      // that point at it (metadata.sessionID / input.sessionID)
      const parentRunning = createMemo(() => {
        const running = new Set<string>()
        if (DEMO > 0 || kids().length === 0) return running
        try {
          const msgs: any[] = (data.session.message.list(props.sessionID) as any[]) ?? []
          for (const m of msgs.slice(-100)) {
            if (m?.type !== "assistant") continue
            for (const p of m.content ?? []) {
              if (p?.type !== "tool" || p.name !== "subagent") continue
              const st = p.state ?? {}
              const cid = st.metadata?.sessionID ?? st.metadata?.sessionId ?? st.input?.sessionID
              if (typeof cid !== "string") continue
              if (st.status === "running" || st.status === "streaming") running.add(cid)
              else running.delete(cid)
            }
          }
        } catch (e) { logError("parentRunning", e) }
        return running
      })

      // ids of the children that are active right now
      const activeIDs = createMemo<string[]>(() => {
        if (DEMO > 0) return [...dittos].filter(([, d]) => d.kind === "agent").map(([id]) => id)
        try {
          failedTick()
          const out: string[] = []
          for (const k of kids()) if (classify(k.id, (id) => parentRunning().has(id)).active) out.push(k.id)
          return out
        } catch (e) {
          logError("activeIDs", e)
          return []
        }
      })

      // load a child's messages once, and again when its status changes
      const syncedStatus = new Map<string, string>()
      createEffect(() => {
        if (DEMO > 0) return
        for (const k of kids()) {
          let st: string | undefined
          try { st = String(data.session.status(k.id)) } catch (_) { continue }
          if (syncedStatus.get(k.id) === st) continue
          syncedStatus.set(k.id, st)
          Promise.resolve(data.session.message.sync(k.id)).catch((e) => logError("message.sync", e))
        }
      })

      // spawn (queued, then pop-in when a spot frees) and despawn (pop-out, or
      // dropped silently when it was still queued); a Ditto that is popping out
      // keeps its box and its map entry until its 5 ticks are over
      createEffect(() => {
        if (DEMO > 0) return
        const ids = activeIDs()
        const keep = new Set(ids)
        for (const [id, d] of [...dittos]) {
          if (d.kind === "companion") continue
          if (keep.has(id)) continue
          if (d.queued) { dittos.delete(id); continue }
          if (d.mode === "popout") continue
          if (d.chat) endChat(d.chat, chats, dittos, false)
          d.mode = "popout"
          d.popTicks = 5
          d.frame = "happy"
          d.bubble = null
          d.hop = 0
        }
        for (const id of ids) {
          const d = dittos.get(id)
          if (!d) dittos.set(id, newDitto(seq++, "agent"))
          else if (d.mode === "popout") {
            // the id came back while it was popping out: carry on
            d.popTicks = 0
            d.frame = "idle"
            d.hop = 0
            if (!startWander(dittos, id, d)) stand(d)
          }
        }
        activeAgentCount = ids.length
        reconcileCompanions(activeAgentCount)
        setFrame(compose(drawnList(), parity, badgeText()))
        notePopulation()
      })

      // 5 fps ticker, only while there is something to animate: an empty
      // permanent room has no Ditto to move, so the tick stays stopped until a
      // Ditto spawns or is queued (count() changes and this effect runs again)
      createEffect(() => {
        const n = count()
        if (n === 0 && DEMO === 0) { stopTimer(); return }
        startTimer()
        onCleanup(stopTimer)
      })

      const roomRows = () => compactRowsFor(rows())
      const floorRows = () => legacyRowsFor(rows())
      const visible = () => (DEMO > 0 ? true : count() > 0 || ALWAYS) && rows() >= MIN_HEIGHT && roomRows() > 0

      // Responsive height: derive the compact room rows and the preserved floor
      // rows of the same terminal tier, then recompose. The key includes both,
      // because two adjacent terminal sizes can share a total height but need a
      // different wall/floor split.
      let appliedKey = ""
      createEffect(() => {
        const compact = roomRows()
        if (compact === 0) return
        const floor = floorRows()
        const key = `${compact}/${floor}`
        if (key === appliedKey) return
        appliedKey = key
        scene = sceneFor(compact, floor)
        fitScene()
        setFrame(compose(drawnList(), parity, badgeText()))
        log(`room height: ${compact} rows (${scene.h}px), wall ${scene.floorTop}px, floor ${scene.floorRows}px at ${rows()} terminal rows`)
      })

      // the ambient clock, started and stopped with the room visibility
      createEffect(() => {
        if (!visible()) { stopAmbient(); return }
        startAmbient()
        onCleanup(stopAmbient)
      })
      const styleOf = (r: Run) => (r.fg && r.bg ? { fg: r.fg, bg: r.bg } : r.fg ? { fg: r.fg } : undefined)

      return (
        <Show when={visible()}>
          <box flexDirection="column" flexShrink={0} height={roomRows()} width={ROOM_COLS} minWidth={0}>
            <For each={frame()}>
              {(row) => (
                <text wrapMode="none" truncate={false}>
                  <For each={row}>{(run) => <span style={styleOf(run)}>{run.text}</span>}</For>
                </text>
              )}
            </For>
          </box>
        </Show>
      )
    }

    const render = (input: { sessionID?: string }) =>
      DEMO > 0 ? <Room sessionID={input?.sessionID ?? ""} /> : input?.sessionID ? <Room sessionID={input.sessionID} /> : null

    let off: (() => void) | undefined
    let placement = "prepend"
    try {
      off = context.ui.slot({ prepend: "sidebar.footer", render })
    } catch (e) {
      placement = "before"
      logError("slot prepend", e)
      try { off = context.ui.slot({ before: "sidebar.footer", render }) } catch (e2) { logError("slot before", e2) }
    }
    log(`slot placement: ${placement}`)
    log(`art loaded v${ART_VERSION}`)
    log(`loaded (demo=${DEMO}, always=${ALWAYS ? 1 : 0}, minh=${MIN_HEIGHT})`)

    return () => {
      stopped = true
      stopTimer()
      stopAmbient()
      try { off?.() } catch (_) {}
      for (const o of offs) { try { o() } catch (_) {} }
      log("unloaded")
    }
  },
})
