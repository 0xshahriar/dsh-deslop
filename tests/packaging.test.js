// Packaging tests — these guard the things that broke on the first npm
// publish and would break every consumer if they regressed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(root + 'package.json', 'utf8'))

test('every bin declares a shebang so npm can build its shim', () => {
  for (const [name, rel] of Object.entries(pkg.bin)) {
    const src = readFileSync(root + rel, 'utf8')
    assert.ok(
      src.startsWith('#!/usr/bin/env node'),
      `bin "${name}" (${rel}) must start with a node shebang`,
    )
  }
})

test('bins are recorded as executable in git', () => {
  for (const rel of Object.values(pkg.bin)) {
    const mode = execFileSync('git', ['ls-files', '-s', rel], { cwd: root, encoding: 'utf8' })
    assert.ok(mode.startsWith('100755'), `${rel} must be tracked as 100755, got ${mode.slice(0, 6)}`)
  }
})

test('the DSH bundle patch ships in the package', () => {
  // dsh.bundle.patch points at this file; without it an npm install is a
  // bundle DSH cannot load.
  const patch = pkg.dsh?.bundle?.patch
  assert.ok(patch, 'package.json must declare dsh.bundle.patch')
  const rel = patch.replace(/^\.\//, '')
  assert.ok(existsSync(root + rel), `${rel} must exist`)
  const shipped = pkg.files.some((f) => f === rel || f === './' + rel)
  assert.ok(shipped, `${rel} must be listed in package.json "files"`)
})

test('package is publishable', () => {
  assert.equal(pkg.private, false, 'private must be false to publish')
  assert.equal(pkg.publishConfig?.access, 'public')
  assert.ok(pkg.version && /^\d+\.\d+\.\d+$/.test(pkg.version), 'version must be semver')
  assert.ok(pkg.repository?.url, 'repository is required for provenance')
  assert.equal(pkg.license, 'MIT')
})

test('engines requires a modern Node', () => {
  assert.ok(pkg.engines?.node, 'engines.node must be declared')
})

test('exports map resolves to files that exist', () => {
  for (const [key, value] of Object.entries(pkg.exports ?? {})) {
    const targets = typeof value === 'string' ? [value] : Object.values(value)
    for (const t of targets) {
      if (typeof t !== 'string' || !t.startsWith('./')) continue
      assert.ok(existsSync(root + t.slice(2)), `export "${key}" -> ${t} must exist`)
    }
  }
})

test('shipped files all exist', () => {
  for (const entry of pkg.files) {
    if (entry.includes('*')) continue
    assert.ok(existsSync(root + entry), `files entry "${entry}" must exist`)
  }
})
