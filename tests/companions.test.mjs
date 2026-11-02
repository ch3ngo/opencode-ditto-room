import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("../tui.tsx", import.meta.url), "utf8")

// Evaluate the exact policy function from the plugin source. It is kept
// JSX-free and dependency-free so this test does not need a TypeScript or JSX
// loader. This is test-only; the plugin itself never evaluates strings.
const START = "// COMPANION_POLICY_START"
const END = "// COMPANION_POLICY_END"
const start = source.indexOf(START)
const end = source.indexOf(END)
assert.notEqual(start, -1, "companion policy start marker is missing")
assert.ok(end > start, "companion policy end marker is missing or out of order")
const policySource = source.slice(start + START.length, end)
const companionTarget = new Function(`${policySource}\nreturn companionTarget`)()

test("companions enabled keeps the existing minimum population", () => {
  assert.equal(companionTarget(0), 2)
  assert.equal(companionTarget(1), 1)
  assert.equal(companionTarget(2), 0)
  assert.equal(companionTarget(5), 0)
  assert.equal(companionTarget(12), 0)
})

test("explicitly enabled companions match the default", () => {
  for (const agents of [0, 1, 2, 3, 8, 12]) {
    assert.equal(companionTarget(agents, true), companionTarget(agents))
  }
})

test("companions disabled never creates a filler", () => {
  for (const agents of [0, 1, 2, 3, 8, 12]) {
    assert.equal(companionTarget(agents, false), 0)
  }
})

test("the policy is total at its edges", () => {
  // The active count is never negative in the runtime, but the policy should not
  // produce a surprising value if it is called with one.
  assert.equal(companionTarget(-1), 2)
  assert.equal(companionTarget(-1, false), 0)
  assert.equal(companionTarget(0, undefined), 2, "undefined keeps the default")
})

test("tui.tsx wires OC_DITTO_COMPANIONS to the policy", () => {
  assert.match(source, /OC_DITTO_COMPANIONS/)
  assert.match(source, /const COMPANIONS_ON\s*=\s*\(process\.env\.OC_DITTO_COMPANIONS \?\? ""\)\.trim\(\) !== "0"/)
  assert.match(source, /companionTarget\(agents,\s*COMPANIONS_ON\)/)
})
