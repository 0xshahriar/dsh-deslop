// dsh-deslop v0.2.0 regression tests — new rules, audit bug fixes, CLI behaviors.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deslop } from '../lib/engine.js'
import { RULES } from '../lib/rules.js'

const t = (name, fn) => test(name, fn)

// ── Sticky-flag bug: mid-text sentence-start rules must fire ──────────
t('sycophancy fires mid-text (sticky bug)', () => {
  const { text, hits } = deslop('Thanks. That is a great point. Moving on.', { mode: 'normal' })
  assert.ok(!text.includes('That is a great point'))
  assert.ok(hits.some((h) => h.rule === 'sycophancy'))
})

t('sign-off removes multi-line sign-off mid-message', () => {
  const { text } = deslop('Good work.\n\nBest regards,\nJohn', { mode: 'normal' })
  assert.equal(text, 'Good work.')
})

t('sign-off on short message does not delete everything', () => {
  const { text } = deslop('Body text here\n\nBest regards,\nAlice Johnson', { mode: 'normal' })
  assert.equal(text, 'Body text here')
})

t('in-conclusion fires mid-text', () => {
  const { text } = deslop('It scales. In conclusion, done.', { mode: 'normal' })
  assert.ok(!text.includes('In conclusion'))
})

// ── New v0.2.0 rules ──────────────────────────────────────────────────
t('agreement-sycophancy: "You are absolutely right"', () => {
  const { text } = deslop('You are absolutely right. Next topic.', { mode: 'normal' })
  assert.equal(text, 'Next topic.')
})

t('agreement-sycophancy: "You are right about that!"', () => {
  const { text } = deslop('You are right about that! Great.', { mode: 'normal' })
  assert.equal(text, 'Great.')
})

t('agreement-sycophancy: contracted "You\'re totally right"', () => {
  const { text } = deslop("You're totally right! Moving on.", { mode: 'normal' })
  assert.equal(text, 'Moving on.')
})

t('offer-tails: "Would you like me to elaborate?"', () => {
  const { text } = deslop('Here is the plan. Would you like me to elaborate?', { mode: 'normal' })
  assert.ok(!text.includes('Would you like'))
})

t('offer-tails: "Is there anything else?"', () => {
  const { text } = deslop('That is all. Is there anything else you need?', { mode: 'normal' })
  assert.ok(!text.includes('anything else'))
})

t('corporate-verbs: leverage/utilize → use forms', () => {
  const { text } = deslop('Leverage the API and utilize caching; we are leveraging it well.', { mode: 'normal' })
  assert.ok(text.includes('Use the API') || text.includes('use the API'))
  assert.ok(text.includes('use caching'))
  assert.ok(!/\butiliz/i.test(text))
})

t('transition-openers: Moreover/Furthermore removed', () => {
  const { text } = deslop('It works. Moreover, it scales. Furthermore, it is fast.', { mode: 'normal' })
  assert.ok(!text.includes('Moreover'))
  assert.ok(!text.includes('Furthermore'))
})

t('firstly-secondly: enumerated words normalized', () => {
  const { text } = deslop('Firstly, install it. Secondly, run it.', { mode: 'normal' })
  assert.ok(text.includes('First'))
  assert.ok(text.includes('Second'))
  assert.ok(!text.includes('Firstly'))
})

t('discourse-frames: "The bottom line:" stripped (aggressive)', () => {
  const { text } = deslop('The bottom line: it works.', { mode: 'aggressive' })
  assert.ok(!text.includes('bottom line'))
  const n = deslop('The bottom line: it works.', { mode: 'normal' })
  assert.ok(n.text.includes('bottom line')) // soft → normal keeps it
})

t('not-about-x template (aggressive only)', () => {
  const { text } = deslop("It's not about speed, it's about reliability.", { mode: 'aggressive' })
  assert.ok(!text.includes('not about'))
})

t('rhetorical-questions stripped (aggressive)', () => {
  const { text } = deslop('So, what does this mean?\nIt means this.', { mode: 'aggressive' })
  assert.ok(!text.includes('what does this mean'))
})

t('intensifier-adjectives: crucial → key, plethora → many', () => {
  const { text } = deslop('This is a crucial step with a plethora of options.', { mode: 'aggressive' })
  assert.ok(text.includes('key'))
  assert.ok(text.includes('many'))
  assert.ok(!/\bcrucial\b/.test(text))
})

t('metaphors: in the realm of / beacon of / embark on a journey', () => {
  const { text } = deslop('In the realm of AI, it is a beacon of hope; embark on a journey today.', { mode: 'normal' })
  assert.ok(!text.includes('realm'))
  assert.ok(!text.includes('beacon'))
  assert.ok(!text.includes('embark'))
})

t('thanks-for: "Thanks for sharing" removed', () => {
  const { text } = deslop('Thanks for sharing this. Here is mine.', { mode: 'normal' })
  assert.ok(!text.includes('Thanks for'))
})

// ── Chinese additions ─────────────────────────────────────────────────
t('zh-fillers: \u603b\u4e4b/\u7531\u6b64\u53ef\u89c1 removed (aggressive)', () => {
  const { text } = deslop('\u603b\u4e4b\uff0c\u8fd9\u4e2a\u65b9\u6848\u53ef\u884c\u3002\u7531\u6b64\u53ef\u89c1\uff0c\u503c\u5f97\u91c7\u7528\u3002', { mode: 'aggressive' })
  assert.ok(!text.includes('\u603b\u4e4b'))
  assert.ok(!text.includes('\u7531\u6b64\u53ef\u89c1'))
})

t('zh-buzzwords: \u8d4b\u80fd/\u6293\u624b/\u95ed\u73af removed (aggressive)', () => {
  const { text } = deslop('\u4ee5\u6570\u636e\u4e3a\u6293\u624b\uff0c\u8d4b\u80fd\u4e1a\u52a1\u95ed\u73af\u3002', { mode: 'aggressive' })
  assert.ok(!text.includes('\u6293\u624b'))
  assert.ok(!text.includes('\u8d4b\u80fd'))
  assert.ok(!text.includes('\u95ed\u73af'))
})

t('zh-punct-mix: half-width punct between Chinese chars (aggressive)', () => {
  const { text } = deslop('\u9996\u5148,\u5b89\u88c5\u4f9d\u8d56;\u7136\u540e,\u8fd0\u884c\u6d4b\u8bd5\u3002', { mode: 'aggressive' })
  assert.ok(text.includes('\uff0c'))
  assert.ok(text.includes('\uff1b'))
  assert.ok(!text.includes(','))
})

t('zh em-dash ordering: —— handled by zh-dash, not split by em-dash', () => {
  const { text, hits } = deslop('\u7ed3\u8bba——\u5982\u4e0b', { mode: 'aggressive' })
  assert.equal(text, '\u7ed3\u8bba\uff1a\u5982\u4e0b')
  assert.ok(hits.every((h) => h.rule === 'zh-dash'))
})

t('en em-dash still works beside zh rules', () => {
  const { text } = deslop('Great — really great', { mode: 'normal' })
  assert.ok(!text.includes('—'))
})

t('zh-fancy-punct: \uff5e normalized', () => {
  const { text } = deslop('\u597d\uff5e\u6211\u660e\u767d\u4e86', { mode: 'normal' })
  assert.ok(!text.includes('\uff5e'))
})

// ── tidy() regression fixes ───────────────────────────────────────────
t('tidy preserves TL;DR initialism', () => {
  const { text } = deslop('TL;DR: it works', { mode: 'aggressive' })
  assert.ok(text.includes('TL;DR'))
})

t('tidy preserves URLs', () => {
  const { text } = deslop('see https://example.com/x now', { mode: 'aggressive' })
  assert.ok(text.includes('https://example.com/x'))
})

t('tidy preserves filenames', () => {
  const { text } = deslop('open config.js and run main.js', { mode: 'aggressive' })
  assert.ok(text.includes('config.js'))
  assert.ok(text.includes('main.js'))
})

t('newline before a code fence is preserved', () => {
  const input = '1. First item\n2. Second item\n\n```js\nconst x=1\n```\n'
  const { text } = deslop(input, { mode: 'aggressive' })
  assert.ok(text.includes('Second item\n\n```js'))
})

// ── Custom rule gating (audit #8) ─────────────────────────────────────
t('custom rules respect --only selection', () => {
  const custom = [{ id: 'my-slop', pattern: 'frobnicate', replacement: 'use', severity: 'hard' }]
  const { hits } = deslop('please frobnicate the widget', { mode: 'normal', custom, only: ['em-dash'] })
  assert.equal(hits.length, 0)
})

t('custom rules respect --disable', () => {
  const custom = [{ id: 'my-slop', pattern: 'frobnicate', replacement: 'use', severity: 'hard' }]
  const { hits } = deslop('please frobnicate the widget', { mode: 'normal', custom, disable: ['my-slop'] })
  assert.equal(hits.length, 0)
})

// ── Rule hygiene ──────────────────────────────────────────────────────
t('all rule ids unique', () => {
  const ids = new Set(RULES.map((r) => r.id))
  assert.equal(ids.size, RULES.length)
})

t('no rule regex uses the sticky flag (blocks mid-text matches)', () => {
  for (const r of RULES) assert.ok(!r.re.sticky, `${r.id} must not be sticky`)
})

t('all rule regexes are global', () => {
  for (const r of RULES) assert.ok(r.re.global, `${r.id} must be global`)
})

t('rule count grew to at least 45 in v0.2.0', () => {
  assert.ok(RULES.length >= 45, `expected >= 45 rules, got ${RULES.length}`)
})
