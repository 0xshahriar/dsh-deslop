<div align="center">

# 🧹 dsh-deslop

**Remove AI slop from anything.**

Em-dashes · "Great question!" · "Hope this helps!" · 🚀 decorations · formulaic
openers and buzzwords — the tells that scream *"a language model wrote this"* —
cleaned from chat replies, clipboard text, files, and even **live CLI tool output**.

[![Version](https://img.shields.io/badge/version-1.1.0-2563eb?style=flat-square)](CHANGELOG.md)
[![Tests](https://img.shields.io/badge/tests-82%20passing-16a34a?style=flat-square)](#-development)
[![Rules](https://img.shields.io/badge/rules-50%20built--in-ea580c?style=flat-square)](#-rules)
[![License](https://img.shields.io/badge/license-MIT-64748b?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-334155?style=flat-square)](package.json)

**Author:** [Md. Shahriar Alam Shaon AKA 0xShahriar](https://github.com/0xshahriar)

</div>

---

## 📖 Table of contents

- [Why](#-why)
- [Install](#-install)
- [Quick start](#-quick-start)
- [Three ways to use it](#-three-ways-to-use-it)
- [Modes](#-modes)
- [Rules](#-rules)
- [Development](#-development)
- [Documentation](#-documentation)

---

## 🤔 Why

Large language models have tells: the em-dash habit, *"Great question!"*
openers, *"Hope this helps!"* tails, *"delve into"*, 🚀-decorated headers —
and formulaic openers plus corporate buzzwords in Chinese too. Whether you're
cleaning up AI-drafted prose for publishing, or you just want terminal output
without the theater, **dsh-deslop removes them** — with 50 rules you can
inspect, disable, and extend.

> Zero runtime dependencies · Node ≥ 20 · 100 KB of slop-heavy text deslops in
> **< 500 ms** — fast enough to run on a phone while you type.

---

## 📦 Install

```sh
# Global CLI
npm install -g dsh-deslop

# Or use it without installing
npx dsh-deslop --help

# Install from GitHub instead (always latest main)
npm install -g github:0xshahriar/dsh-deslop

# As a DSH plugin
dsh plugin --profile web add /path/to/dsh-deslop
```

> **Installing from a GitHub or tarball URL fails on strict hosts.**
> `dsh-plugin-manager`'s `inspect()` returns a hardcoded `bundle: null` for git
> and tarball specs, because it never reads the manifest for those spec kinds.
> dsh-go tolerates that; dsh-android (Kotlin) rejects it with
> `Failed to parse literal 'null' as a boolean value at path: $.bundle`.
> This is an upstream DSH issue, not a defect in this package — our
> `dsh.bundle` is a non-null object and resolves to `true` on the registry and
> path routes.
>
> **Use a local path instead:** `dsh plugin --profile web add /path/to/dsh-deslop`
>
> A one-file engine patch for anyone who needs URL installs is in
> [`contrib/engine-patch/`](contrib/engine-patch/README.md).

---

## ⚡ Quick start

```sh
cat reply.md | dsh-deslop            # normal mode: unambiguous slop only
cat reply.md | dsh-deslop -a         # aggressive: + hedges, filler, decoration
dsh-deslop -i draft.md               # rewrite a file in place
dsh-deslop --diff draft.md           # preview what would change
dsh-deslop --check . && publish      # CI gate: exit 1 if slop found
```

**Before → after:**

```diff
- Absolutely! You are absolutely right — it works seamlessly. Hope this helps!
+ It works.
```

---

## 🛠️ Three ways to use it

### 1️⃣ CLI — pipe, files, in-place

| Command | What it does |
|---------|--------------|
| `… \| dsh-deslop` | deslop stdin → stdout |
| `dsh-deslop file.md` | deslop file → stdout |
| `dsh-deslop -i file.md` | rewrite the file in place |
| `dsh-deslop --diff file` | unified diff of changes |
| `dsh-deslop --check file` | exit `1` if slop found — CI / pre-commit hooks |
| `dsh-deslop --json` | `{label, text, hits, stats}` machine-readable output |
| `dsh-deslop --rules` | list all 50 built-in rules |

### 2️⃣ `dsh-deslop exec` — deslop any CLI tool's output, live

```sh
dsh-deslop exec -- npm run build        # clean build logs
dsh-deslop exec -a -- gh pr view 42     # aggressive for AI-written text
dsh-deslop exec --diff -- <ai-tool>     # see exactly what it stripped
```

Line-buffered · ANSI-color-safe · child exit codes propagated · stderr
untouched by default.

### 3️⃣ As a DSH plugin — slash command everywhere, buttons on dsh-go

The plugin layers on whatever the host provides. It never assumes the
dsh-go phone app.

| Surface | Where it appears | Action |
|---------|------------------|--------|
| `/deslop <text>` | **any DSH host** (web, desktop, CLI, ACP) | deslop text — supports `-a`, `-H`, `--rules` |
| Composer pill | dsh-go app only | deslop the draft in place |
| Undo pill | dsh-go app only | restore the previous draft |
| Reply long-press | dsh-go app only | deslop the reply · copy the clean version |
| Status strip | dsh-go app only | shows the active strength |
| Panel | dsh-go app only | pick the strength (hard-only / normal / aggressive) |
| `+` tool | dsh-go app only | clean the clipboard |
| Session action | dsh-go app only | export the cleaned reply |

**Using it on another app?** The desloping engine (`lib/engine.js`) and the
rule set (`lib/rules.js`) are plain ESM with no host dependency — import them
directly from any Node program:

```js
import { deslop } from "dsh-deslop"
// or import the pieces directly:
//   import { deslop } from "dsh-deslop/engine"
//   import { RULES }  from "dsh-deslop/rules"

const { text, hits } = deslop("Great question! It works.", { mode: "aggressive" })
```

`commands` is the only service the plugin requires, so on a host without the
dsh-go bridge the slash command still registers and every other surface stays
dormant instead of failing to start.

---

## 🎚️ Modes

| Mode | Flag | Removes |
|------|------|---------|
| Hard only | `-H` | Only unambiguous slop: em-dashes, curly quotes, sycophantic lines, sign-offs |
| **Normal** ⭐ | *(default)* | All hard slop + chatty tails, LLM vocabulary, "In conclusion" |
| Aggressive | `-a` | Everything: + hedging, filler adverbs, emoji decoration, Chinese buzzwords |

> 🛡️ **Safe by design:** code fences and inline code are never touched. URLs,
> filenames, and initialisms (`TL;DR`, `e.g.`) survive the tidy pass.

---

## 📜 Rules

**50 built-in patterns**, all inspectable and individually toggleable:

```sh
dsh-deslop --rules
```

```text
em-dash                hard  [en]  Em dash (—) / spaced en dash (–)...
sycophancy             hard  [en]  Sycophantic praise lines: "Great question!"...
agreement-sycophancy   hard  [en]  "You're absolutely right!"...
offer-tails            hard  [en]  "Would you like me to...?"...
corporate-verbs        hard  [en]  leverage / utilize → use...
transition-openers     hard  [en]  "Furthermore," / "Moreover,"...
zh-openers             hard  [zh]  Chinese formulaic openers...
zh-buzzwords           soft  [zh]  Chinese corporate buzzwords — aggressive only
…                      …     …     (50 total)
```

Every rule id works with `--only` and `--disable`. **Add your own:**

```sh
echo '{"id":"brand-name","pattern":"Delve AI","replacement":"DelveAI","severity":"hard"}' > rule.json
dsh-deslop --add-rule rule.json      # persists in ~/.config/dsh-deslop/
```

---

## 💻 Development

```sh
git clone https://github.com/0xshahriar/dsh-deslop.git
cd dsh-deslop
npm install && npm test     # 82 tests, incl. benchmark guards
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a rule.

---

## 📚 Documentation

| File | Contents |
|------|----------|
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Adding rules, dev setup, commit style |
| [SECURITY.md](SECURITY.md) | Supported versions, private disclosure |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |

---

<div align="center">

**[MIT](LICENSE)** © [Md. Shahriar Alam Shaon (0xShahriar)](https://github.com/0xshahriar)

⭐ Found it useful? Star the repo!

</div>
