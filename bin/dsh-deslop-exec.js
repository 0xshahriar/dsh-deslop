// dsh-deslop exec — deslop the UI output of CLI tools, live.
//
//   dsh-deslop exec -- <command> [args...]        run a tool, deslop its output
//   dsh-deslop exec -a -- npm install             aggressive
//   dsh-deslop exec --diff -- npm test            show what would change
//   dsh-deslop exec --stats -- <tool>             summary on stderr
//
// Streams: the child's stdout is desloped line-buffered (ANSI escapes, code
// spans in tables and progress bars are safe — rules skip them), then written
// through to the terminal. The child's stderr passes through untouched by
// default (--deslop-stderr to include it). Exit code is the child's.

import { spawn } from 'node:child_process'
import { deslop } from '../lib/engine.js'
import { loadSettings } from '../lib/settings.js'

const VERSION = '1.0.0'

function usage() {
  console.log(`dsh-deslop exec v${VERSION} — deslop a CLI tool's output, live

Usage:
  dsh-deslop exec [options] -- <command> [args...]

Options:
  -a, --aggressive      aggressive mode (default: normal)
  -H, --hard-only       hard-only mode
      --stats           print a summary of removals to stderr
      --diff            print a unified diff instead of live output
      --deslop-stderr   also deslop the child's stderr (default: passthrough)
      --only a,b / --disable a,b   rule selection
  -h, --help

Examples:
  dsh-deslop exec -- npm run build
  dsh-deslop exec -a -- gh pr view 42
  dsh-deslop exec --stats -- git log --oneline -20
  dsh-deslop exec --diff -- some-ai-tool "explain this"`)
}

const argv = process.argv.slice(2)

let mode = 'normal'
let stats = false
let diff = false
let deslopStderr = false
let only = []
let disable = []
let cmd = null

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--') { cmd = argv.slice(i + 1); break }
  if (a === '-a' || a === '--aggressive') mode = 'aggressive'
  else if (a === '-H' || a === '--hard-only') mode = 'hard-only'
  else if (a === '--stats') stats = true
  else if (a === '--diff') diff = true
  else if (a === '--deslop-stderr') deslopStderr = true
  else if (a === '--only') only = (argv[++i] || '').split(',').filter(Boolean)
  else if (a === '--disable') disable = (argv[++i] || '').split(',').filter(Boolean)
  else if (a === '-h' || a === '--help') { usage(); process.exit(0) }
  else if (a === '--version') { console.log(VERSION); process.exit(0) }
  else { console.error(`unknown option: ${a} (see --help)`); process.exit(2) }
}

if (!cmd || cmd.length === 0) {
  usage()
  process.exit(2)
}

const settings = loadSettings()
const opts = { mode, only, disable, custom: settings.custom || [] }

// Buffer stdout per line so progress bars / tables are desloped line by line.
let stdoutBuf = ''
let totalHits = 0
const rawLines = []
const cleanLines = []

function deslopLine(line) {
  // Keep trailing newline state; deslop the content.
  const hadNL = line.endsWith('\n')
  const body = hadNL ? line.slice(0, -1) : line
  const { text, hits } = deslop(body, opts)
  totalHits += hits.length
  if ((stats || diff) && hits.length > 0) { rawLines.push(body); cleanLines.push(text) }
  return text + (hadNL ? '\n' : '')
}

const child = spawn(cmd[0], cmd.slice(1), { stdio: ['inherit', 'pipe', 'pipe'] })

child.stdout.setEncoding('utf8')
child.stdout.on('data', (chunk) => {
  stdoutBuf += chunk
  let idx
  let out = ''
  while ((idx = stdoutBuf.indexOf('\n')) !== -1) {
    const line = stdoutBuf.slice(0, idx + 1)
    stdoutBuf = stdoutBuf.slice(idx + 1)
    out += deslopLine(line)
  }
  // Incomplete line (progress bar) — deslop it too, no newline added.
  if (stdoutBuf) { out += deslopLine(stdoutBuf); stdoutBuf = '' }
  process.stdout.write(diff ? '' : out)
})

child.stderr.setEncoding('utf8')
child.stderr.on('data', (chunk) => {
  if (deslopStderr) {
    const lines = chunk.split(/(?<=\n)/)
    process.stderr.write(lines.map(deslopLine).join(''))
  } else {
    process.stderr.write(chunk)
  }
})

child.on('close', (code) => {
  if (diff && rawLines.length > 0) {
    const n = Math.max(rawLines.length, cleanLines.length)
    const lines = ['--- raw', '+++ deslopped']
    for (let i = 0; i < n; i++) {
      if (rawLines[i] !== cleanLines[i]) {
        if (rawLines[i] !== undefined) lines.push(`-${rawLines[i]}`)
        if (cleanLines[i] !== undefined) lines.push(`+${cleanLines[i]}`)
      }
    }
    process.stdout.write(lines.join('\n') + '\n')
  }
  if (stats) process.stderr.write(`dsh-deslop exec: ${totalHits} fix(es)\n`)
  process.exit(code ?? 1)
})

child.on('error', (e) => {
  console.error(`dsh-deslop exec: cannot run ${cmd[0]}: ${e.message}`)
  process.exit(2)
})
