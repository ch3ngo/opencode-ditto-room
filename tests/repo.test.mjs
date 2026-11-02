import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8")

// Negative checks. Split so the test does not repeat private path fragments or
// attribution markers in the clear.
const forbidden = [
  "$" + "VAULT",
  "/mnt" + "/c/",
  "ai" + "-vault",
  "system" + "/opencode-user",
  "archive" + "/ditto-room",
  "Co-" + "Authored-By",
  "Generated" + " with",
  "generated" + "-by",
]

test("no private paths or attribution trailers in shipped text files", () => {
  for (const file of ["tui.tsx", "art.ts", "README.md", "CHANGELOG.md", "LICENSE", ".gitignore", "tests/art.test.mjs"]) {
    const text = read(file)
    for (const needle of forbidden) {
      assert.ok(!text.includes(needle), `${file} contains '${needle}'`)
    }
  }
})

test("license is MIT with the configured author", () => {
  const license = read("LICENSE")
  assert.match(license, /^MIT License/)
  assert.match(license, /Copyright \(c\) 2026 ch3ngo/)
  assert.match(license, /Permission is hereby granted, free of charge/)
  assert.match(license, /THE SOFTWARE IS PROVIDED "AS IS"/)
})

test("gitignore keeps local and generated files out of the repository", () => {
  const ignore = read(".gitignore")
  for (const entry of ["node_modules/", "*.log", ".DS_Store"]) {
    assert.ok(ignore.includes(entry), `.gitignore is missing ${entry}`)
  }
})

test("preview image is a real PNG", () => {
  const path = new URL("../preview.png", import.meta.url)
  assert.ok(statSync(path).size > 1000)
  const magic = readFileSync(path).subarray(0, 8)
  assert.deepEqual([...magic], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
})
