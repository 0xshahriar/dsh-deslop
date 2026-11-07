// dsh-deslop — dsh-go native plugin handlers + /deslop slash command.
// Author: Md. Shahriar Alam Shaon AKA 0xShahriar
//
// All user-facing strings are English-only.
// The /deslop slash command is registered on hosts with a command registry;
// the dsh-go surfaces live in a child fiber that stays dormant elsewhere.

import { deslop, summarize, MODES } from './engine.js'
import { RULES } from './rules.js'

export const name = 'dsh-deslop'

const INSERT_LIMIT = 2000
const COPY_LIMIT = 8000

// Per-session in-memory undo store: sessionId -> previous draft text.
const undoStore = new Map()

function getMode(scope) {
  // Mode chosen in the panel this session; defaults to aggressive for chat
  // cleanups, normal for the composer draft (handled per action).
  return (scope && undoStore.get(`mode:${scope.sessionId ?? ''}`)) || 'aggressive'
}

function rememberUndo(scope, previous) {
  if (!scope) return
  undoStore.set(`draft:${scope.sessionId ?? ''}`, previous)
}

/**
 * Services this plugin consumes, declared so Cordis can resolve them.
 *
 * `commands` must be declared: reading an undeclared service through the ctx
 * proxy throws ("cannot get property ... without inject"), which is what made
 * the plugin fail to start after installation.
 *
 * `dshGo` is intentionally not declared here. It exists only on hosts running
 * the dsh-go bridge, and a required declaration would keep the plugin inactive
 * everywhere else. The dsh-go surfaces register inside the ctx.inject(['dshGo'])
 * child fiber below, which simply stays dormant when the bridge is absent.
 */
export const inject = ['commands']

export function apply(ctx) {
  // ── /deslop slash command (engine-side) ──────────────────────────────
  // Usage:
  //   /deslop <text>            deslop the given text, reply with the clean version
  //   /deslop -a <text>         aggressive
  //   /deslop -H <text>         hard-only
  //   /deslop --rules           list rule ids
  // The handler runs directly against the agent context; no model message.
  //
  // The registration is wrapped in ctx.effect so Cordis disposes it with the
  // plugin; register() returns the disposer. Any failure is logged rather than
  // swallowed, so a broken registration is visible instead of silently absent.
  ctx.effect(() => {
    const dispose = ctx.commands.register({
      name: 'deslop',
      description: 'Remove AI slop from the given text (modes: -a aggressive, -H hard-only, --rules list rules)',
      input: { hint: '[-a|-H|--rules] <text>' },
      handler: ({ rawInput }) => {
        const args = String(rawInput ?? '').trim()
        if (!args) {
          return { kind: 'error', text: 'Usage: /deslop [-a|-H|--rules] <text>' }
        }
        if (args === '--rules' || args === '--list') {
          const ids = RULES.map((r) => r.id).join(', ')
          return { kind: 'success', text: `dsh-deslop rules (${RULES.length}):\n${ids}` }
        }
        let mode = 'normal'
        let text = args
        const m = /^(-a|--aggressive|-H|--hard-only)\s+/.exec(args)
        if (m) {
          mode = m[1] === '-a' || m[1] === '--aggressive' ? 'aggressive' : 'hard-only'
          text = args.slice(m[0].length)
        }
        if (!text.trim()) {
          return { kind: 'error', text: 'Usage: /deslop [-a|-H|--rules] <text>' }
        }
        const { text: clean, hits } = deslop(text, { mode })
        if (hits.length === 0) {
          return { kind: 'success', text: 'No slop found, already clean.' }
        }
        return {
          kind: 'success',
          text: `${clean}\n\ndeslopped: ${summarize(hits)} (${mode} mode)`,
        }
      },
    })
    return () => dispose?.()
  }, 'dsh-deslop: /deslop command')

  ctx.inject(['dshGo'], (ctx) => {
    const tooLong = (n) => `Too long (${n} chars) — split it up`

    // ── Composer action: deslop the draft in place (normal mode) ────────
    ctx.dshGo.on('deslop-draft', (scope, event) => {
      const draft = (scope.draft ?? '').trim()
      if (!draft) return { toast: 'The composer is empty' }
      const mode = getMode(scope) === 'aggressive' ? 'normal' : getMode(scope)
      const { text, hits } = deslop(draft, { mode })
      if (hits.length === 0) return { toast: 'Already clean' }
      if (text.length > INSERT_LIMIT) return { toast: tooLong(text.length) }
      rememberUndo(scope, draft)
      return {
        insert: text,
        toast: 'Cleaned: ' + summarize(hits),
      }
    })

    // ── Composer action: restore the previous draft (undo) ──────────────
    ctx.dshGo.on('deslop-undo', (scope) => {
      const prev = undoStore.get(`draft:${scope?.sessionId ?? ''}`)
      if (!prev) return { toast: 'Nothing to undo' }
      undoStore.delete(`draft:${scope?.sessionId ?? ''}`)
      return {
        insert: prev.slice(0, INSERT_LIMIT),
        toast: 'Restored',
      }
    })

    // ── +tool: clean the clipboard (tools are the only surface that can
    //    read it on tap) ─────────────────────────────────────────────────
    ctx.dshGo.on('deslop-clip-tool', (scope) => {
      const clip = (scope.clipboard ?? '').trim()
      if (!clip) return { toast: 'The clipboard is empty' }
      const { text, hits } = deslop(clip, { mode: getMode(scope) })
      if (hits.length === 0) return { toast: 'Clipboard is already clean' }
      if (text.length > COPY_LIMIT) return { toast: tooLong(text.length) }
      return {
        copy: text,
        toast: 'Cleaned & copied: ' + summarize(hits),
      }
    })

    // ── Message actions ─────────────────────────────────────────────────
    const cleanMessage = (scope, copyOnly) => {
      const msg = (scope.message ?? '').trim()
      if (!msg) return { toast: 'This reply has no text' }
      const { text, hits } = deslop(msg, { mode: getMode(scope) })
      if (hits.length === 0) return { toast: 'No slop found' }
      if (text.length > (copyOnly ? COPY_LIMIT : INSERT_LIMIT)) {
        return { toast: tooLong(text.length) }
      }
      if (!copyOnly) rememberUndo(scope, msg)
      return {
        ...(copyOnly ? { copy: text } : { insert: text }),
        toast: 'Deslopped: ' + summarize(hits),
      }
    }

    ctx.dshGo.on('deslop-msg', (scope) => cleanMessage(scope, false))
    ctx.dshGo.on('deslop-msg-copy', (scope) => cleanMessage(scope, true))

    // ── Session action: copy the cleaned reply ──────────────────────────
    ctx.dshGo.on('deslop-session-export', (scope) => {
      const msg = (scope.message ?? '').trim()
      if (!msg) return { toast: 'Nothing to export' }
      const { text, hits } = deslop(msg, { mode: getMode(scope) })
      if (text.length > COPY_LIMIT) return { toast: tooLong(text.length) }
      return {
        copy: text,
        toast: hits.length
          ? 'Cleaned content copied: ' + summarize(hits)
          : 'Already clean, copied',
      }
    })

    // ── Composer strip: mode indicator ──────────────────────────────────
    // NOTE: strips never receive scope.draft (only pills/tools do), so this
    // shows the active strength instead of a live slop count.
    ctx.dshGo.strip('deslop-status', (scope, emit) => {
      let last = null
      const tick = () => {
        const mode = getMode(scope)
        if (mode === last) return
        last = mode
        const labels = { 'hard-only': 'Hard-only', normal: 'Normal', aggressive: 'Aggressive' }
        emit({ text: `Deslop · ${labels[mode]}`, icon: 'sparkle' })
      }
      tick()
      const timer = setInterval(tick, 1000)
      return () => clearInterval(timer)
    })

    // ── Panel: strength picker (the control room) ───────────────────────
    const MODE_OPTS = [
      { id: 'hard-only', label: 'Hard only' },
      { id: 'normal', label: 'Normal' },
      { id: 'aggressive', label: 'Aggressive' },
    ]

    ctx.dshGo.panel('deslop-panel', {
      view: (scope) => {
        const mode = getMode(scope)
        const modeDesc = {
          'hard-only': 'Only unambiguous slop: em-dashes, curly quotes, sycophantic lines, sign-offs.',
          normal: 'All hard slop plus chatty tails, LLM vocabulary, "In conclusion". Recommended.',
          aggressive: 'Everything: also hedges, filler adverbs, emoji decoration, Chinese buzzwords.',
        }
        return {
          type: 'stack',
          title: 'Deslop',
          children: [
            {
              type: 'text',
              text: 'Pick the strength — it applies to the Deslop pill, reply menu and export.',
            },
            {
              type: 'options',
              id: 'mode',
              options: MODE_OPTS.map((m) => ({ label: m.label, value: m.id })),
              selected: mode,
            },
            { type: 'callout', text: modeDesc[mode] ?? '', tone: 'info' },
          ],
        }
      },
      actions: {
        mode: (scope, event) => {
          const v = event?.value?.value ?? event?.value
          if (MODES.includes(v)) {
            undoStore.set(`mode:${scope?.sessionId ?? ''}`, v)
            return { toast: 'Mode updated', refresh: true }
          }
          return {}
        },
      },
    })
  })
}

// Re-export for the CLI / tests.
export { RULES, deslop, summarize }
