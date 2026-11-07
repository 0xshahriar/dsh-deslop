// v0.4.0 tests — English-only surfaces and the /deslop slash command.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { RULES } from '../lib/rules.js'
import { deslop } from '../lib/engine.js'

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
)

const CJK = /[\u4e00-\u9fff]/

test('manifest labels/titles are plain English strings (no zh/en maps)', () => {
  const dshGo = manifest.dshGo
  assert.equal(typeof dshGo.title, 'string')
  assert.ok(!CJK.test(dshGo.title))
  for (const slot of Object.keys(dshGo.contributes)) {
    for (const item of dshGo.contributes[slot]) {
      if (item.label !== undefined) {
        assert.equal(typeof item.label, 'string', `${slot}/${item.id} label`)
        assert.ok(!CJK.test(item.label), `${slot}/${item.id} label has no CJK`)
      }
      if (item.title !== undefined) {
        assert.equal(typeof item.title, 'string')
        assert.ok(!CJK.test(item.title))
      }
    }
  }
})

test('all rule descriptions are CJK-free (patterns keep CJK by design)', () => {
  for (const r of RULES) {
    assert.ok(!CJK.test(r.desc), `${r.id} desc must be English-only: ${r.desc}`)
  }
})

test('the zh rules still match Chinese slop (functionality intact)', () => {
  const { text } = deslop('\u597d\u7684\uff0c\u8fd9\u4e2a\u53ef\u4ee5\u3002\u8d4b\u80fd\u4e1a\u52a1\u95ed\u73af\u3002', { mode: 'aggressive' })
  assert.ok(!text.includes('\u597d\u7684'))
  assert.ok(!text.includes('\u8d4b\u80fd'))
})

// Mirrors the Cordis ctx surface the plugin relies on: `effect` runs the
// factory immediately (like Cordis does on activation) and register() returns
// a disposer.
function makeCtx(registered) {
  return {
    commands: { register: (def) => { registered.push(def); return () => {} } },
    inject: () => {},
    effect: (fn) => { const dispose = fn(); return () => dispose?.() },
  }
}

// ── /deslop slash command handler (imported directly — no host needed) ──
// The handler is exercised through the engine with the same grammar the
// command registration parses.

test('slash grammar: bare /deslop with no args is a usage error', async () => {
  const { apply } = await import('../lib/index.js')
  const registered = []
  apply(makeCtx(registered))
  assert.equal(registered.length, 1)
  const cmd = registered[0]
  assert.equal(cmd.name, 'deslop')
  const r1 = cmd.handler({ rawInput: '' })
  assert.equal(r1.kind, 'error')
  assert.ok(r1.text.includes('Usage'))
})

test('slash grammar: /deslop <text> returns cleaned text', async () => {
  const { apply } = await import('../lib/index.js')
  const registered = []
  apply(makeCtx(registered))
  const cmd = registered[0]
  const r = cmd.handler({ rawInput: 'Great question! It works. Hope this helps!' })
  assert.equal(r.kind, 'success')
  assert.ok(!r.text.includes('Great question'))
  assert.ok(r.text.includes('deslopped:'))
})

test('slash grammar: /deslop -a <text> uses aggressive mode', async () => {
  const { apply } = await import('../lib/index.js')
  const registered = []
  apply(makeCtx(registered))
  const cmd = registered[0]
  const soft = cmd.handler({ rawInput: 'basically it works' })
  // normal mode keeps soft slop → reports clean; aggressive removes it
  const rNormal = { kind: 'success', text: soft.text }
  const rAgg = cmd.handler({ rawInput: '-a basically it works' })
  assert.ok(rNormal.text.includes('No slop found'))
  assert.ok(!rAgg.text.includes('basically'))
})

test('slash grammar: /deslop --rules lists all rule ids', async () => {
  const { apply } = await import('../lib/index.js')
  const registered = []
  apply(makeCtx(registered))
  const cmd = registered[0]
  const r = cmd.handler({ rawInput: '--rules' })
  assert.ok(r.text.includes('em-dash'))
  assert.ok(r.text.includes('zh-dash'))
})

test('plugin declares commands in its inject list', async () => {
  const { inject } = await import('../lib/index.js')
  // Cordis reads this export to resolve the service before apply() runs. If it
  // is missing, reading ctx.commands through the proxy throws and the plugin
  // fails to start, which is the bug this guards against.
  assert.ok(Array.isArray(inject), 'inject must be an array')
  assert.ok(inject.includes('commands'), 'commands must be declared')
})

test('plugin leaves dshGo as an optional child fiber', async () => {
  const { inject } = await import('../lib/index.js')
  // dshGo exists only on dsh-go bridge hosts. Declaring it as required would
  // keep the plugin inactive everywhere else, so it must stay out of inject and
  // be attached through ctx.inject([...]) instead.
  assert.ok(!inject.includes('dshGo'), 'dshGo must not be a required inject')
})
