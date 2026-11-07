// dsh-deslop tests — run with: node --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deslop, summarize, splitCode } from '../lib/engine.js'
import { RULES, parseCustomRule } from '../lib/rules.js'

const t = (name, fn) => test(name, fn)

// ── Basic slop removal ────────────────────────────────────────────────
t('removes em-dash (hard rule, all modes)', () => {
  const { text } = deslop('This is great — really it is', { mode: 'hard-only' })
  assert.ok(!text.includes('—'))
  assert.ok(text.includes(' - '))
})

t('removes "Great question!" opener (hard rule)', () => {
  const { text } = deslop('Great question! Here is the answer.', { mode: 'normal' })
  assert.equal(text, 'Here is the answer.')
})

t('removes "In conclusion," closer', () => {
  const { text } = deslop('In conclusion, this is the answer.', { mode: 'normal' })
  assert.equal(text, 'This is the answer.')
})

t('removes "Hope this helps!" tail', () => {
  const { text } = deslop('That is how it works. Hope this helps!', { mode: 'normal' })
  assert.ok(!text.includes('Hope this helps'))
})

t('removes "Let me know if you have any questions"', () => {
  const { text } = deslop('Run the tests. Let me know if you have any questions!', { mode: 'normal' })
  assert.ok(!text.includes('Let me know'))
})

t('replaces delve into → explore', () => {
  const { text } = deslop("Let's delve into the details", { mode: 'normal' })
  assert.ok(text.includes('explore the details'))
})

t('removes "not only X but also Y"', () => {
  const { text } = deslop('not only fast but also reliable', { mode: 'aggressive' })
  assert.ok(!text.includes('not only'))
  assert.ok(text.includes('fast and reliable'))
})

// ── Mode gating ───────────────────────────────────────────────────────
t('soft rules skipped in normal mode', () => {
  const input = 'basically this works'
  const { hits } = deslop(input, { mode: 'normal' })
  assert.equal(hits.length, 0)
})

t('soft rules applied in aggressive mode', () => {
  const input = 'basically this works'
  const { hits } = deslop(input, { mode: 'aggressive' })
  assert.ok(hits.some((h) => h.rule === 'filler-adverbs'))
})

t('soft rules skipped in hard-only mode', () => {
  const input = 'basically this works — right?'
  const { text, hits } = deslop(input, { mode: 'hard-only' })
  assert.ok(text.includes('basically'))
  assert.ok(!text.includes('—'))
  assert.ok(hits.every((h) => h.rule === 'em-dash'))
})

t('mode off returns input unchanged', () => {
  const input = 'Great question! — basically'
  const { text, hits } = deslop(input, { mode: 'off' })
  assert.equal(text, input)
  assert.equal(hits.length, 0)
})

// ── Code preservation ─────────────────────────────────────────────────
t('fenced code blocks untouched', () => {
  const input = '```\nif (x — y) { // em dash inside code\n}\n```'
  const { text } = deslop(input, { mode: 'aggressive' })
  assert.ok(text.includes('x — y'))
})

t('inline code untouched', () => {
  const input = 'Run `a — b` now'
  const { text } = deslop(input, { mode: 'aggressive' })
  assert.ok(text.includes('`a — b`'))
})

t('splitCode segments alternate correctly', () => {
  const segs = splitCode('before `code` after')
  assert.equal(segs.length, 3)
  assert.equal(segs[1].code, true)
  assert.equal(segs[0].code, false)
})

// ── Unicode / decoration ──────────────────────────────────────────────
t('curly quotes straightened', () => {
  const { text } = deslop('He said “hello” to her', { mode: 'normal' })
  assert.ok(text.includes('"hello"'))
})

t('zero-width chars removed', () => {
  const { text } = deslop('hid\u200Bden', { mode: 'normal' })
  assert.equal(text, 'hidden')
})

t('emoji decoration stripped in aggressive', () => {
  const { text } = deslop('🚀 Launch fast\n💡 Think big', { mode: 'aggressive' })
  assert.ok(!text.includes('🚀'))
})

t('excess exclamation collapsed in aggressive', () => {
  const { text } = deslop('Wow!!!', { mode: 'aggressive' })
  assert.ok(!text.includes('!!!'))
})

t('3+ blank lines collapsed', () => {
  const { text } = deslop('a\n\n\n\n\nb', { mode: 'normal' })
  assert.equal(text, 'a\n\nb')
})

// ── Chinese slop ──────────────────────────────────────────────────────
t('zh opener removed', () => {
  const { text } = deslop('\u597d\u7684\uff0c\u6211\u6765\u770b\u770b\u8fd9\u4e2a\u95ee\u9898\u3002', { mode: 'normal' })
  assert.ok(!text.startsWith('\u597d\u7684'))
})

t('zh flattery removed', () => {
  const { text } = deslop('\u8fd9\u662f\u4e00\u4e2a\u5f88\u597d\u7684\u95ee\u9898\uff01\u7b54\u6848\u662f42\u3002', { mode: 'normal' })
  assert.ok(!text.includes('\u5f88\u597d\u7684\u95ee\u9898'))
})

t('zh tail removed', () => {
  const { text } = deslop('\u5148\u5b89\u88c5\u4f9d\u8d56\uff0c\u7136\u540e\u8fd0\u884c\u3002\u5e0c\u671b\u5bf9\u4f60\u6709\u5e2e\u52a9\uff01', { mode: 'normal' })
  assert.ok(!text.includes('\u5e0c\u671b'))
})

t('zh filler in aggressive only', () => {
  const input = '\u5176\u5b9e\u8fd9\u4e2a\u4e1c\u897f\u4e0d\u96be\u3002'
  const n = deslop(input, { mode: 'normal' })
  const a = deslop(input, { mode: 'aggressive' })
  assert.ok(n.text.includes('\u5176\u5b9e'))
  assert.ok(!a.text.includes('\u5176\u5b9e'))
})

// ── Custom rules ──────────────────────────────────────────────────────
t('custom rule parsed and applied', () => {
  const raw = { id: 'my-slop', pattern: 'frobnicate', replacement: 'use', severity: 'hard' }
  const parsed = parseCustomRule(raw)
  assert.ok(parsed)
  const { text } = deslop('please frobnicate the widget', { custom: [raw], mode: 'normal' })
  assert.ok(text.includes('please use the widget'))
})

t('custom rule with bad regex rejected', () => {
  assert.equal(parseCustomRule({ id: 'bad', pattern: '([unclosed' }), null)
})

t('custom rule with reserved id rejected', () => {
  assert.equal(parseCustomRule({ id: 'em-dash', pattern: 'x' }), null)
})

// ── Utility ───────────────────────────────────────────────────────────
t('summarize formats counts', () => {
  assert.equal(summarize([]), 'clean')
  assert.equal(summarize([{ rule: 'a' }, { rule: 'a' }, { rule: 'b' }]), '2 rules, 3 fixes')
})

t('empty input is a no-op', () => {
  const { text, hits } = deslop('')
  assert.equal(text, '')
  assert.equal(hits.length, 0)
})

t('rule ids unique across all rules', () => {
  const ids = new Set(RULES.map((r) => r.id))
  assert.equal(ids.size, RULES.length)
})

t('all rule regexes are global and safe to reuse', () => {
  for (const r of RULES) {
    assert.ok(r.re.global, `${r.id} must be global`)
    r.re.lastIndex = 0
  }
})
