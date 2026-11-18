import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const source = readFileSync(new URL("../tui.tsx", import.meta.url), "utf8")

// Evaluate the exact show/hide policy block from the plugin source. It is kept
// JSX-free, TypeScript-free and dependency-free so this test does not need a
// loader; the file system and the logger are injected here. This is test-only;
// the plugin itself never evaluates strings.
const START = "// TOGGLE_POLICY_START"
const END = "// TOGGLE_POLICY_END"
const start = source.indexOf(START)
const end = source.indexOf(END)
assert.notEqual(start, -1, "toggle policy start marker is missing")
assert.ok(end > start, "toggle policy end marker is missing or out of order")
const block = source.slice(start + START.length, end)

const make = (logError = () => {}) =>
  new Function(
    "readFileSync",
    "mkdirSync",
    "writeFileSync",
    "dirname",
    "logError",
    `${block}
    return {
      STATE_VERSION, SUMMARY_ITEM_MAX, envHidden, resolveDittoHidden,
      readHiddenFile, writeHiddenFile, compactItem,
      summaryPlanLine, summaryCountsLine, dittoSwitchView, dittoSwitchLine,
    }`,
  )(readFileSync, mkdirSync, writeFileSync, dirname, logError)

const policy = make()

const tempDir = () => mkdtempSync(join(tmpdir(), "ditto-toggle-"))

test("the env override reads the usual on and off spellings", () => {
  for (const on of ["1", "true", "TRUE", "yes", "on", " 1 "]) assert.equal(policy.envHidden(on), true, on)
  for (const off of ["0", "false", "False", "no", "off", " 0 "]) assert.equal(policy.envHidden(off), false, off)
})

test("anything else in the env override means no override", () => {
  for (const none of [undefined, "", "   ", "2", "maybe", "onoff"]) assert.equal(policy.envHidden(none), undefined, String(none))
})

test("the env override wins over the state file", () => {
  assert.equal(policy.resolveDittoHidden(true, false), true)
  assert.equal(policy.resolveDittoHidden(false, true), false)
})

test("without an override only a real hidden flag hides the room", () => {
  assert.equal(policy.resolveDittoHidden(undefined, true), true)
  assert.equal(policy.resolveDittoHidden(undefined, false), false)
  assert.equal(policy.resolveDittoHidden(undefined, undefined), false, "no file means shown")
  assert.equal(policy.resolveDittoHidden(undefined, "true"), false, "a string is not a flag")
  assert.equal(policy.resolveDittoHidden(undefined, 1), false)
  assert.equal(policy.resolveDittoHidden(undefined, null), false)
})

test("the state file round-trips one boolean and rejects anything else", () => {
  const dir = tempDir()
  try {
    const path = join(dir, "opencode-ditto-room", "state.json")
    assert.equal(policy.readHiddenFile(path), undefined, "missing file means no state")
    assert.equal(policy.writeHiddenFile(path, true), true)
    assert.equal(policy.readHiddenFile(path), true)
    assert.equal(policy.writeHiddenFile(path, false), true)
    assert.equal(policy.readHiddenFile(path), false)
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), { v: policy.STATE_VERSION, hidden: false })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("the state file is 0600 inside a 0700 directory", { skip: process.platform === "win32" }, () => {
  const dir = tempDir()
  try {
    const path = join(dir, "opencode-ditto-room", "state.json")
    assert.equal(policy.writeHiddenFile(path, true), true)
    assert.equal(statSync(path).mode & 0o777, 0o600, "state file mode")
    assert.equal(statSync(dirname(path)).mode & 0o777, 0o700, "state directory mode")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("an unreadable or unexpected state file is ignored", () => {
  const dir = tempDir()
  try {
    const path = join(dir, "state.json")
    writeFileSync(path, "not json")
    assert.equal(policy.readHiddenFile(path), undefined)
    writeFileSync(path, "[]")
    assert.equal(policy.readHiddenFile(path), undefined)
    writeFileSync(path, "null")
    assert.equal(policy.readHiddenFile(path), undefined)
    writeFileSync(path, JSON.stringify({ v: 1, hidden: "yes" }))
    assert.equal(policy.readHiddenFile(path), undefined, "a non boolean is not a state")
    writeFileSync(path, JSON.stringify({ v: 1 }))
    assert.equal(policy.readHiddenFile(path), undefined)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("a failed write is reported and not thrown", () => {
  const failures = []
  const failing = make((where, e) => failures.push(`${where}: ${e.message}`))
  const dir = tempDir()
  try {
    // a path under an existing regular file can never be created
    const file = join(dir, "blocked")
    writeFileSync(file, "x")
    assert.equal(failing.writeHiddenFile(join(file, "state.json"), true), false)
    assert.equal(failures.length, 1)
    assert.match(failures[0], /^state write: /)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("the hidden summary shows the plan progress and cuts the item at 30 characters", () => {
  assert.equal(policy.summaryPlanLine(null), "no plan")
  assert.equal(policy.summaryPlanLine({ total: 0, done: 0, current: null }), "no plan")
  assert.equal(policy.summaryPlanLine({ total: 6, done: 2, current: null }), "plan 2/6")
  assert.equal(policy.summaryPlanLine({ total: 6, done: 2, current: "Ship it" }), "plan 2/6 · Ship it")
  const long = "a".repeat(60)
  const item = policy.summaryPlanLine({ total: 3, done: 1, current: long }).split(" · ")[1]
  assert.equal(item.length, policy.SUMMARY_ITEM_MAX)
  assert.ok(item.endsWith("…"), "a cut item ends with an ellipsis")
})

test("the item is collapsed to one line before it is cut", () => {
  assert.equal(policy.compactItem("  a\n\n b\tc  ", 30), "a b c")
  assert.equal(policy.compactItem("abc", 3), "abc", "an exact fit is not cut")
  assert.equal(policy.compactItem("abcd", 3), "ab…")
  assert.equal(policy.compactItem("", 30), "")
  assert.equal(policy.compactItem(undefined, 30), "")
})

test("the counts line is fixed wording", () => {
  assert.equal(policy.summaryCountsLine(0, 0, 0), "0 running · 0 done · 0 failed")
  assert.equal(policy.summaryCountsLine(2, 5, 1), "2 running · 5 done · 1 failed")
})

test("the switch glyphs read on when shown and off when hidden", () => {
  assert.deepEqual(policy.dittoSwitchView(false), { label: "Ditto", thumbLeft: false, state: "on" })
  assert.deepEqual(policy.dittoSwitchView(true), { label: "Ditto", thumbLeft: true, state: "off" })
  assert.equal(policy.dittoSwitchLine(false), "Ditto ━━━━● on")
  assert.equal(policy.dittoSwitchLine(true), "Ditto ●━━━━ off")
})

test("tui.tsx wires the toggle to the state file, the env override and the palette", () => {
  assert.match(source, /OC_DITTO_HIDDEN/)
  assert.match(source, /const ENV_HIDDEN = envHidden\(process\.env\.OC_DITTO_HIDDEN\)/)
  assert.match(source, /const \[hidden, setHidden\] = createSignal\(resolveDittoHidden\(ENV_HIDDEN, fileHidden\)\)/)
  assert.match(source, /mode: 0o700/)
  assert.match(source, /mode: 0o600/)
  assert.match(source, /id: "ditto-room\.toggle"/)
  assert.match(source, /"Show Ditto room" : "Hide Ditto room"/)
  assert.match(source, /palette: true/)
  assert.match(source, /onMouseUp=\{toggleHidden\}/)
})

test("the state path follows XDG_STATE_HOME and falls back to the user state dir", () => {
  assert.match(source, /process\.env\.XDG_STATE_HOME/)
  assert.match(source, /join\(homedir\(\), "\.local", "state"\)/)
  assert.match(source, /"opencode-ditto-room",\s*"state\.json"/)
  assert.ok(!source.includes(".cache"), "the state file is not in the cache tree")
})

test("hiding unmounts the room and the summary takes its place", () => {
  assert.match(source, /<Show when=\{hidden\(\)\} fallback=\{<Room sessionID=\{sid\} \/>\}>/)
  assert.match(source, /<Summary sessionID=\{sid\} \/>/)
  assert.match(source, /<DittoSwitch \/>/)
  // the ticker and the ambient clock stop with the Room component
  assert.match(source, /onCleanup\(stopTimer\)/)
  assert.match(source, /onCleanup\(stopAmbient\)/)
  assert.ok(!/\bhidden\(\)\s*&&[^)]*stopTimer/.test(source), "the room is not mounted hidden, so no extra gate is needed")
})
