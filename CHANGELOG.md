# Changelog

All notable changes to dsh-deslop are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer](https://semver.org/).

## [1.0.0] - 2026-11-07

First stable release. Fresh start — all history consolidated.

### Core
- **50 built-in slop rules** across English and Chinese, each tagged `hard` (always slop) or `soft` (aggressive-only): punctuation tells, sycophancy, hedging/filler, structural templates, LLM vocabulary, chatty tails, sign-offs, decoration, Chinese formulaic openers/fillers/buzzwords/punctuation.
- **Three modes**: `hard-only` / `normal` (default) / `aggressive`.
- Code fences and inline code are never desloped; URLs, filenames, and initialisms (`TL;DR`, `e.g.`) survive the tidy pass.

### CLI (`dsh-deslop`)
- Pipe mode, file arguments, `-i/--in-place`, `--diff` (unified), `--check` (exit 1 for CI/hooks), `--json`, `--stats`, `--only`/`--disable`, custom rules via `--add-rule` (persisted, honored by `--only`/`--disable` too).

### CLI wrapper (`dsh-deslop-exec`)
- `dsh-deslop exec -- <command>` deslops any CLI tool's stdout live: line-buffered, ANSI-safe, child exit codes propagated, stderr passthrough by default, `--diff`/`--stats`.

### DSH plugin (dsh-go app)
- `/deslop` slash command (`-a`, `-H`, `--rules`) via the engine command registry, graceful fallback on hosts without it.
- Composer pills (deslop + undo), reply long-press actions (deslop / copy clean), live status strip, strength panel, clipboard +tool, session export action.
- No silent truncation; destructive actions are undoable.

### Quality
- 82 tests (`node --test tests/`), including benchmark guards (100 KB < 500 ms).
- Zero runtime dependencies. English-only documentation and UI strings.

## [0.4.0] - 2026-11-07

### Added — /deslop slash command
- `ctx.commands.register()` (engine command registry) when the host exposes it:
  - `/deslop <text>` — deslop text, reply includes the clean version + summary
  - `/deslop -a <text>` — aggressive mode; `/deslop -H <text>` — hard-only
  - `/deslop --rules` — list all 50 rule ids
- Graceful degradation: hosts without a command service just skip registration; all dsh-go surfaces keep working.

### Changed — English-only everywhere
- All manifest labels/titles are plain English strings (no zh/en maps).
- All toasts, panel text, strip text, mode names: English-only.
- All 50 rule descriptions translated/normalized to English (`dsh-deslop --rules` output). The zh-* rule *patterns* intentionally keep CJK — they match Chinese slop.

### Moved — plugin source of truth is now the workspace
- `/sdcard/DeepSeekHarness/dsh-deslop` (git repo, tag per release); DSH installs it via link from this directory.

## [0.3.0] - 2026-11-07

### Fixed — plugin surfaces that could not work (user-reported via screenshots)
- Status strip showed a perpetual "Deslop ready": strips never receive the draft, so the live slop count was dead code. It now shows the active strength ("Deslop · Aggressive").
- Panel's "Clean draft / Clean clipboard" buttons could never read their targets (same platform capability gap). The panel is now the control room: strength picker with a plain-language description of what each strength removes.
- Clipboard cleanup moved to a + tool ("De-clip") — composer tools are the only surface granted clipboard read on tap.
- Labels sized to platform limits; kit checker fully clean (0 hints).

### Added — CLI tool output desloping (dsh-deslop exec)
- `dsh-deslop exec -- <command>` runs any CLI tool and deslops its stdout live, line-buffered: `dsh-deslop exec -- npm run build`, `dsh-deslop exec -a -- gh pr view 42`.
- Child stderr passes through untouched by default (`--deslop-stderr` to include).
- `--diff` prints the raw → deslopped line changes instead of live output; `--stats` totals removals.
- The child's exit code is propagated; ANSI color codes in progress lines survive.
- Second binary `dsh-deslop-exec` registered in `package.json`.

## [0.2.0] - 2026-11-07

Researched via two parallel audits (rules-coverage vs. 2025 LLM tells, and engine/UX) plus live stress-testing.

### Added — 20 new rules (30 → 50)
- English: agreement sycophancy ("You're absolutely right"), offer tails ("Would you like me to…?"), thanks openers, corporate verbs (leverage/utilize → use), puffy transitions (Moreover/Furthermore/Additionally), discourse frames ("The bottom line:", "That said," — aggressive), rhetorical question openers (aggressive), "not about X, it's about Y" (aggressive), intensifier adjectives (crucial/pivotal/myriad/plethora — aggressive), extended metaphors (realm/beacon/embark), Firstly→First normalization.
- Chinese: extended fillers (Chinese "in summary / it is thus clear / undeniably / meanwhile" phrases), internet buzzwords (Chinese "empower / grip / closed loop / granularity" jargon — aggressive), half-width punctuation between Chinese chars → full-width (aggressive), and tilde normalization.

### Fixed — engine bugs found by audit and stress-testing
- Sticky-anchor bug: sentence-start rules only matched at position 0; mid-text "That's a great point." and multi-line sign-offs were missed. All 10 affected rules now match everywhere (10 regression tests).
- Sign-off rule could delete an entire short message ("Best regards,\nJohn" → ""); now only strips the sign-off block.
- Chinese "——" was being split by the English em-dash rule before zh-dash could run (a Chinese sentence with a —— dash came out as "x - - y"); em-dash now skips runs of ——.
- tidy() no longer damages "TL;DR", URLs, filenames, abbreviations ("config.js", "https://…") — the ambiguous "add space after punctuation" pass was removed as inherently unsafe; space-before-punctuation cleanup kept.
- Newline separating prose from a following code fence is preserved.
- Custom rules now honor `--only` / `--disable` (previously bypassed both).

### Added — CLI
- File arguments (`dsh-deslop -a reply.md`), `--diff` (unified diff), `--json` ({text, hits, stats}), `--check` (CI mode: exit 1 when slop found), `-i/--in-place`, `--off` mode, unknown-flag rejection with exit 2.
- `"bin"` field added — `npm i -g` / `npx` installable.

### Added — dsh-go plugin
- Undo: destructive actions store the previous draft; a new composer pill restores it.
- No more silent truncation: over-limit text is refused with a clear message instead of being cut.
- Panel mode picker is now honored by every action (previously only panel actions read it).
- Panel shows which rules fired with per-rule counts (list view).
- Status strip re-checks on change (800 ms debounce) instead of blind 1.2 s polling.

### Added — quality
- 36 new tests (30 → 66): sticky regressions, all 20 new rules, tidy edge cases, custom-rule gating, benchmark guards (100 KB < 500 ms).
- Composer slot cap respected (Deslop + Undo pills; clipboard cleanup lives in the panel).

## [0.1.0] - 2026-11-07

### Added
- Core desloping engine (`lib/engine.js`) with three modes: `hard-only`, `normal`, `aggressive`.
- 30 built-in slop rules across English and Chinese (`lib/rules.js`), each tagged hard/soft:
  - Punctuation: em/en dash, curly quotes, curly apostrophes, Unicode ellipsis.
  - Sycophancy: "Great question!", praise openers, Chinese flattery lines.
  - Hedging & filler: "It's important to note", "basically/essentially", Chinese filler phrases.
  - Structure slop: "In conclusion,", "not only X but also Y", bolded pseudo-headers.
  - Chatty tails: "Hope this helps!", "Let me know if…", Chinese help-offer tails.
  - LLM vocabulary: delve into, tapestry/symphony metaphors, game-changer, seamlessly.
  - Unicode slop: zero-width chars, emoji decorations, decoration lines, "!!!" runs, excess blank lines, trailing whitespace.
  - Sign-offs: "Best regards", "Happy coding!".
- Code preservation: fenced code blocks and inline code are never desloped.
- Custom user rules with persistence (`~/.config/dsh-deslop/settings.json`) and `--add-rule`.
- CLI (`bin/dsh-deslop.js`): pipe mode, `--stats`, `--only`, `--disable`, `--rules`, `--add-rule`, `--version`.
- dsh-go native plugin surfaces: 2 composer actions, 2 message actions, live status strip, interactive panel, +menu tool, session export action (all bilingual zh/en).
- 30-test suite (`node --test tests/*.test.js`).
- Git version control with SemVer tags.
