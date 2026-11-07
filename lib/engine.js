// dsh-deslop — desloping engine. Pure string in → { text, hits } out.
// Used by both the dsh-go plugin handlers and the standalone CLI.
import { RULES, RULE_BY_ID, parseCustomRule } from './rules.js'

export const MODES = ['off', 'normal', 'aggressive', 'hard-only']

/**
 * @param {string} input
 * @param {object} [opts]
 * @param {'normal'|'aggressive'|'hard-only'} [opts.mode='normal']
 * @param {string[]} [opts.disable=[]]   rule ids to skip
 * @param {string[]} [opts.only=[]]      run only these rule ids
 * @param {string[]} [opts.langs=['en','zh']]
 * @param {Array<object>} [opts.custom=[]]  saved custom rules (raw form)
 * @param {boolean} [opts.preserveCode=true]  skip lines inside fenced code blocks & inline code
 */
export function deslop(input, opts = {}) {
  const {
    mode = 'normal',
    disable = [],
    only = [],
    langs = ['en', 'zh'],
    custom = [],
    preserveCode = true,
  } = opts

  if (typeof input !== 'string' || input === '') return { text: input ?? '', hits: [] }
  if (mode === 'off') return { text: input, hits: [] }

  const enabled = new Set()
  for (const r of RULES) {
    if (!langs.includes(r.langs)) continue
    if (only.length ? only.includes(r.id) : !disable.includes(r.id)) enabled.add(r.id)
  }
  const customRules = custom
    .map(parseCustomRule)
    .filter(Boolean)
    // Custom rules honor --only / --disable like built-ins (audit #8).
    .filter((r) => (only.length ? only.includes(r.id) : !disable.includes(r.id)))

  // Split into prose vs. code segments so we never deslop code blocks.
  const segments = preserveCode ? splitCode(input) : [{ text: input, code: false }]
  let hits = []
  const outParts = []

  for (const seg of segments) {
    if (seg.code) {
      outParts.push(seg.text)
      continue
    }
    let text = seg.text
    const before = text
    for (const rule of buildRuleList(enabled, customRules)) {
      if (rule.severity === 'soft' && mode === 'hard-only') continue
      text = applyRule(text, rule, mode, hits)
    }
    if (text !== before) text = recap(text, before)
    // tidy() must not trim the trailing newline(s) that separate this prose
    // segment from a following code segment — keep them.
    const keepTail = /(?:\n\n?)+$/.exec(text)?.[0] ?? ''
    text = tidy(text) + keepTail
    outParts.push(text)
  }

  return { text: outParts.join(''), hits }
}

function buildRuleList(enabled, customRules) {
  const list = []
  for (const id of enabled) {
    const r = RULE_BY_ID[id]
    if (r) list.push(r)
  }
  return [...list, ...customRules]
}

function applyRule(text, rule, mode, hits) {
  if (rule.severity === 'soft' && mode === 'normal') {
    // In normal mode soft rules are skipped — they may carry intended meaning.
    return text
  }
  rule.re.lastIndex = 0
  let m
  let changed = false
  let out = ''
  let last = 0
  while ((m = rule.re.exec(text)) !== null) {
    if (m[0] === '') { rule.re.lastIndex++; continue }
    changed = true
    out += text.slice(last, m.index)
    out += rule.replace(m)
    last = m.index + m[0].length
    hits.push({ rule: rule.id, sample: m[0].slice(0, 60) })
    if (hits.length > 500) break
  }
  if (!changed) return text
  out += text.slice(last)
  return out
}

// Trim leading orphan space left by an opener removal, then re-capitalize
// the first letter — but only when the first word was originally capitalized
// (i.e. only undo lowercase-ing caused by a removed opener, like "In
// conclusion, this..." → "this..." should become "This...").
function recap(text, original) {
  // A removal at the very start can leave an orphan separator (e.g. the
  // em-dash replacement " - " when the dash followed a removed opener).
  let cleaned = text.replace(/^[ \t]*-[ \t]+/, '')
  cleaned = cleaned.replace(/^[ \t]+/, '')
  const trimmed = cleaned
  const origFirst = (original ?? '').trimStart()[0]
  if (
    trimmed.length > 0 &&
    /[a-z]/.test(trimmed[0]) &&
    // Only when the original started with a capital that got removed along
    // with the opener (e.g. "In conclusion, this..." → "this...").
    origFirst &&
    origFirst === origFirst.toUpperCase()
  ) {
    return trimmed[0].toUpperCase() + trimmed.slice(1)
  }
  return trimmed
}

function tidy(text) {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+/gm, (s) => s) // keep leading indentation (code-ish lines)
    // "wait ," → "wait," (space before punct). Only when the punct is
    // followed by space/end — so "TL;DR" and "1,000" pass through.
    .replace(/[ \t]+([,.;:!?])(?=[\s]|$)/g, '$1')
    // NOTE: no "add space after punct" pass — it cannot distinguish
    // "works.next" from "config.js"/"example.com" and damages URLs.
    .trimEnd()
}

/** Split text into alternating prose / code segments. */
export function splitCode(text) {
  const segs = []
  const re = /```[\s\S]*?(?:```|$)|`[^`\n]*`/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), code: false })
    segs.push({ text: m[0], code: true })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ text: text.slice(last), code: false })
  return segs
}

/** Deslop a chat assistant message body (used by message action). */
export function deslopMessage(text, opts) {
  return deslop(text, { mode: 'aggressive', ...opts })
}

/** Summarize hits into a one-line count, e.g. "3 rules, 7 fixes". */
export function summarize(hits) {
  if (!hits || hits.length === 0) return 'clean'
  const ids = [...new Set(hits.map((h) => h.rule))]
  return `${ids.length} rule${ids.length === 1 ? '' : 's'}, ${hits.length} fix${hits.length === 1 ? '' : 'es'}`
}
