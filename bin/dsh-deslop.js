#!/usr/bin/env node
// dsh-deslop CLI — remove AI slop from any text. Works as a pipe or on files:
//   cat reply.md | dsh-deslop            # normal mode
//   cat reply.md | dsh-deslop -a         # aggressive
//   dsh-deslop -a reply.md               # file argument → stdout
//   dsh-deslop -i reply.md               # in-place edit
//   dsh-deslop --check reply.md          # exit 1 if slop found, no output
//   dsh-deslop --diff reply.md           # unified diff of changes
//   cat reply.md | dsh-deslop --json     # {text, hits, stats} JSON out

import { readFileSync, writeFileSync } from 'node:fs'
import { deslop, summarize, MODES } from '../lib/engine.js'
import { RULES } from '../lib/rules.js'
import { loadSettings, saveSettings, SETTINGS_FILE } from '../lib/settings.js'

const VERSION = '1.0.0'

function usage() {
  console.log(`dsh-deslop v${VERSION} — remove AI slop from text

Usage:
  ... | dsh-deslop [options]        deslop stdin → stdout
  dsh-deslop [options] file...      deslop files → stdout
  dsh-deslop -i file...             deslop files in place
  dsh-deslop --check file...        exit 1 if slop found (prints count)
  dsh-deslop --diff file...         unified diff of what would change
  dsh-deslop --rules                list built-in rules
  dsh-deslop --add-rule rules.json  add custom rule(s)
  dsh-deslop --version

Options:
  -a, --aggressive   remove soft slop too (hedges, filler adverbs, decoration)
  -n, --normal       default: remove hard slop only
  -H, --hard-only    only unambiguous slop (em-dash etc.)
      --stats        append a summary of removals to stderr
      --json         machine-readable JSON {text, hits, stats} on stdout
      --diff         unified diff instead of the rewritten text
      --check        no rewrite; exit 1 when slop is found (for CI/hooks)
  -i, --in-place     rewrite files in place (refuses stdin)
      --only a,b     run only these rule ids
      --disable a,b  skip these rule ids
      --no-preserve-code  also deslop inside code fences (default: skip)
  -q, --quiet        no stderr summary

Modes: ${MODES.join(', ')}
Settings: ${SETTINGS_FILE}`)
}

/** Minimal line-based unified diff (LCS not needed; use a simple two-way scan). */
function unifiedDiff(before, after, label = 'input') {
  const a = before.split('\n')
  const b = after.split('\n')
  // Simple O(n*m) LCS is fine for CLI-sized texts.
  const n = a.length, m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const lines = [`--- a/${label}`, `+++ b/${label}`]
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { lines.push(`-${a[i++]}`) }
    else { lines.push(`+${b[j++]}`) }
  }
  while (i < n) lines.push(`-${a[i++]}`)
  while (j < m) lines.push(`+${b[j++]}`)
  return lines.join('\n')
}

const argv = process.argv.slice(2)
const settings = loadSettings()

let mode = settings.mode || 'normal'
let stats = false
let quiet = false
let listRules = false
let addRulePath = null
let only = []
let disable = []
let noPreserveCode = false
let json = false
let diff = false
let check = false
let inPlace = false
const files = []

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '-a' || a === '--aggressive') mode = 'aggressive'
  else if (a === '-n' || a === '--normal') mode = 'normal'
  else if (a === '-H' || a === '--hard-only') mode = 'hard-only'
  else if (a === '--off') mode = 'off'
  else if (a === '--stats') stats = true
  else if (a === '-q' || a === '--quiet') quiet = true
  else if (a === '--rules') listRules = true
  else if (a === '--add-rule') addRulePath = argv[++i]
  else if (a === '--only') only = (argv[++i] || '').split(',').filter(Boolean)
  else if (a === '--disable') disable = (argv[++i] || '').split(',').filter(Boolean)
  else if (a === '--no-preserve-code') noPreserveCode = true
  else if (a === '--json') json = true
  else if (a === '--diff') diff = true
  else if (a === '--check') check = true
  else if (a === '-i' || a === '--in-place') inPlace = true
  else if (a === '--version') { console.log('dsh-deslop v' + VERSION); process.exit(0) }
  else if (a === '-h' || a === '--help') { usage(); process.exit(0) }
  else if (a.startsWith('-')) { console.error(`unknown option: ${a} (see --help)`); process.exit(2) }
  else files.push(a)
}

if (listRules) {
  for (const r of RULES) {
    console.log(`${r.id.padEnd(24)} ${r.severity.padEnd(5)} [${r.langs}] ${r.desc}`)
  }
  process.exit(0)
}

if (addRulePath) {
  try {
    const raw = JSON.parse(readFileSync(addRulePath, 'utf8'))
    const items = Array.isArray(raw) ? raw : [raw]
    const s = loadSettings()
    let added = 0
    for (const it of items) {
      if (!it || typeof it.id !== 'string' || typeof it.pattern !== 'string') {
        console.error(`skip invalid rule: ${JSON.stringify(it).slice(0, 80)}`)
        continue
      }
      s.custom = (s.custom || []).filter((c) => c.id !== it.id)
      s.custom.push(it)
      added++
    }
    saveSettings(s)
    console.log(`saved ${added} custom rule(s) to ${SETTINGS_FILE}`)
  } catch (e) {
    console.error('add-rule failed: ' + e.message)
    process.exit(1)
  }
  process.exit(0)
}

const readStdin = async () => {
  const chunks = []
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) chunks.push(chunk)
  return chunks.join('')
}

const runOne = (input, label) => {
  const result = deslop(input, {
    mode,
    only,
    disable,
    custom: settings.custom || [],
    preserveCode: !noPreserveCode,
  })
  return { ...result, label }
}

// Gather inputs
let inputs
if (files.length > 0) {
  inputs = files.map((f) => {
    try {
      return { label: f, content: readFileSync(f, 'utf8') }
    } catch (e) {
      console.error(`dsh-deslop: cannot read ${f}: ${e.message}`)
      process.exit(2)
    }
  })
} else {
  if (inPlace) { console.error('dsh-deslop: -i needs file arguments'); process.exit(2) }
  inputs = [{ label: 'stdin', content: await readStdin() }]
}

// --check mode: report + exit code only
if (check) {
  let found = 0
  for (const { label, content } of inputs) {
    const { hits } = runOne(content, label)
    if (hits.length > 0) {
      found += hits.length
      console.error(`${label}: ${summarize(hits)}`)
    }
  }
  if (found > 0) { console.error(`dsh-deslop: ${found} slop fix(es) needed`); process.exit(1) }
  console.error('dsh-deslop: clean')
  process.exit(0)
}

let totalHits = 0
const outputs = []
for (const { label, content } of inputs) {
  const { text, hits } = runOne(content, label)
  totalHits += hits.length
  if (json) {
    outputs.push(JSON.stringify({ label, text, hits, stats: summarize(hits) }))
  } else if (diff) {
    outputs.push(text !== content ? unifiedDiff(content, text, label) : '')
  } else {
    outputs.push(text)
  }
  if (inPlace && text !== content) {
    writeFileSync(label, text)
  }
}

if (json) process.stdout.write(outputs.length === 1 ? outputs[0] : '[\n' + outputs.join(',\n') + '\n]\n')
else process.stdout.write(outputs.join(''))

if (!quiet && !json && !check) {
  const where = inPlace ? '' : diff ? '' : ' (use --stats for details)'
  if (totalHits > 0) process.stderr.write(`dsh-deslop: ${totalHits} fix(es)${where}\n`)
}
process.exit(totalHits > 0 ? 1 : 0)
