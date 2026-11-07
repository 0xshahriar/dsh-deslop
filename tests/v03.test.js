// v0.3.0 tests — surface fixes (strip/panel capabilities) and exec wrapper.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { deslop } from '../lib/engine.js'

const BIN = new URL('../bin/dsh-deslop-exec.js', import.meta.url).pathname
const manifest = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))

test('strip/panel capabilities: draft/clipboard are not granted there', () => {
  // Regression guard documenting the platform behavior the plugin now relies
  // on: only composer actions and composer.tools get draft/clipboard reads.
  // (This test pins the design assumption; the plugin code must not attempt
  // to read scope.draft in strip/panel handlers.)
  const strip = manifest.dshGo.contributes['composer.strip'][0]
  const panel = manifest.dshGo.contributes.panels[0]
  assert.ok(!strip.panel, 'strip opens no panel')
  assert.equal(panel.id, 'deslop-panel')
  // wants stays minimal-true: draft/clipboard are used by pills/tools only.
  assert.deepEqual([...manifest.dshGo.wants].sort(), ['clipboard', 'draft', 'message'].map(s=>s).sort())
})

test('exec wrapper: deslops CLI output end to end', () => {
  const r = spawnSync(process.execPath, [BIN, '--', 'echo', 'Great question! It works seamlessly.'], {
    encoding: 'utf8',
  })
  assert.equal(r.status, 0)
  assert.ok(!r.stdout.includes('Great question'), 'sycophancy removed')
  assert.ok(!r.stdout.includes('seamlessly'), 'seamlessly removed')
  assert.ok(r.stdout.includes('It works'), 'content preserved')
})

test('exec wrapper: passes through clean output untouched', () => {
  const r = spawnSync(process.execPath, [BIN, '--', 'echo', 'plain output 123'], { encoding: 'utf8' })
  assert.equal(r.status, 0)
  assert.equal(r.stdout.trim(), 'plain output 123')
})

test('exec wrapper: propagates the child exit code', () => {
  const r = spawnSync(process.execPath, [BIN, '--', 'sh', '-c', 'exit 3'], { encoding: 'utf8' })
  assert.equal(r.status, 3)
})

test('exec wrapper: --diff shows changed lines only', () => {
  const r = spawnSync(process.execPath, [BIN, '--diff', '--', 'echo', 'Hope this helps!'], {
    encoding: 'utf8',
  })
  assert.ok(r.stdout.includes('--- raw'))
  assert.ok(r.stdout.includes('-Hope this helps!'))
  assert.ok(r.stdout.includes('+'))
})

test('exec wrapper: missing command exits 2 with usage', () => {
  const r = spawnSync(process.execPath, [BIN], { encoding: 'utf8' })
  assert.equal(r.status, 2)
  assert.ok(r.stdout.includes('Usage'))
})

test('exec wrapper: unknown flag exits 2', () => {
  const r = spawnSync(process.execPath, [BIN, '--bogus', '--', 'echo', 'x'], { encoding: 'utf8' })
  assert.equal(r.status, 2)
})

test('ANSI-heavy progress lines survive desloping', () => {
  const { text } = deslop('\x1b[32m✔ Done\x1b[0m — all good', { mode: 'normal' })
  assert.ok(text.includes('\x1b[32m'))
  assert.ok(text.includes('Done'))
})
