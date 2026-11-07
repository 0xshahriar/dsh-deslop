# Troubleshooting

Solutions to the problems people actually hit with dsh-deslop, in the order
they usually come up. If your case is not here, open an
[issue](https://github.com/0xshahriar/dsh-deslop/issues/new/choose).

---

## Contents

- [The plugin fails to start: `cannot get property "commands" without inject`](#the-plugin-fails-to-start-cannot-get-property-commands-without-inject)
- [`bundle:null` from a GitHub or tarball URL](#bundlenull-from-a-github-or-tarball-url)
- [`/deslop` does not appear in the command list](#deslop-does-not-appear-in-the-command-list)
- [`dsh-deslop-exec: line 1: //: Is a directory`](#dsh-deslop-exec-line-1--is-a-directory)
- [The CLI exits 1 and breaks my pipeline](#the-cli-exits-1-and-breaks-my-pipeline)
- [dsh-deslop changed something it should not have](#dsh-deslop-changed-something-it-should-not-have)
- [Nothing was removed from my text](#nothing-was-removed-from-my-text)
- [Text inside code blocks was modified](#text-inside-code-blocks-was-modified)
- [The phone app still shows the old buttons or behaviour](#the-phone-app-still-shows-the-old-buttons-or-behaviour)
- [npm install fails or installs an old version](#npm-install-fails-or-installs-an-old-version)

---

## The plugin fails to start: `cannot get property "commands" without inject`

**Symptom.** The plugin is installed but shows a red error:

```
dsh-deslop is installed but failed to start: cannot get property 'commands' without inject
```

**Cause.** Cordis resolves services up front. Reading a service that the plugin
never declared does not return `undefined` — the context proxy **throws**.
Optional chaining (`ctx.commands?.`) cannot help, because the read itself is
what fails.

**Fix.** Use a version that declares the dependency. The plugin entry exports
`inject = ['commands']` since v1.0.1. Update:

```sh
dsh plugin --profile web add dsh-deslop
```

Then restart the engine.

**Why this is not a plugin bug in itself.** Any plugin touching a host service
must declare it. If you are writing your own plugin and see this, add the
service name to the plugin's `inject` export.

---

## `bundle:null` from a GitHub or tarball URL

**Symptom.** Installing into dsh-android (the Kotlin app) from a URL fails:

```
unexpected android/ext/inspect result: Failed to parse literal 'null' as a boolean value at path: $.bundle
JSON input: ......gz","bundle":null,"registry":"https://registry.npmjs.org/"}
```

**Cause — this is upstream, not this package.** `dsh-plugin-manager`'s
`inspect()` handles four spec kinds. Two of them return a **hardcoded `null`**
for `bundle`, because they never read the package manifest:

```js
case "git":     return { ..., bundle: null, ... }
case "tarball": return { ..., bundle: null, ... }
```

Only `registry` and `path` specs go through `inspectionOf()`, which computes a
real boolean. dsh-go tolerates the `null`; dsh-android's strict Kotlin
deserializer rejects it.

**Fix — install by name or local path.** Both routes return `bundle: true`:

```sh
dsh plugin --profile web add dsh-deslop          # registry (recommended)
dsh plugin --profile web add /path/to/dsh-deslop # local checkout
```

If you specifically need URL installs, a one-file engine patch is in
[`contrib/engine-patch/`](contrib/engine-patch/README.md).

---

## `/deslop` does not appear in the command list

**Symptom.** The plugin loads, other surfaces work, but typing `/` never shows
`deslop`.

Check, in order:

1. **Is the plugin actually loaded?**
   ```sh
   dsh --profile web --dump-config | grep dsh-deslop
   ```
   You should see three entries. If not, the plugin did not mount — check for a
   startup error first.

2. **Did the engine reload?** Code changes under `lib/` need an engine restart.
   Manifest changes hot-reload; JavaScript does not.

3. **Is the host old enough to have a command registry?** `/deslop` is
   registered through `ctx.commands`. Hosts without that service simply have no
   slash commands at all.

4. **Did a different plugin claim the name?** Registering a duplicate command
   name throws. Since v1.0.1 the registration runs inside `ctx.effect()` and
   failures are logged rather than swallowed — check the engine log for a
   `dsh-deslop` line.

---

## `dsh-deslop-exec: line 1: //: Is a directory`

**Symptom.** Running the wrapper prints shell errors about the file's own
comments:

```
./node_modules/.bin/dsh-deslop-exec: line 1: //: Is a directory
./node_modules/.bin/dsh-deslop-exec: line 3: command: No such file or directory
```

**Cause.** The file had no `#!` line, so npm generated a shell shim instead of a
Node shim and the shell tried to execute the JavaScript comments. Fixed in
**v1.1.1**.

**Fix.** Upgrade:

```sh
npm install -g dsh-deslop@latest
```

`tests/packaging.test.js` now asserts every `bin` starts with a node shebang, so
this cannot regress silently.

---

## The CLI exits 1 and breaks my pipeline

**Symptom.** `set -e` scripts or editor integrations abort, or `&&` chains stop,
even though the output was correct.

**Cause.** Before **v1.1.0** the CLI exited `1` whenever it changed any text.

**Fix.** Upgrade. Ordinary runs exit `0` now. When you *want* a signal, use
`--check`:

```sh
dsh-deslop --check draft.md   # exit 1 if slop found, 0 if clean
```

This is what CI gates and pre-commit hooks should use.

---

## dsh-deslop changed something it should not have

**Symptom.** A word you wanted kept got rewritten, or a legitimate dash became
` - `.

**Steps.**

1. **Switch to a gentler mode.** `normal` (the default) skips every
   context-dependent rule; `-a`/aggressive is the aggressive one:
   ```sh
   dsh-deslop file.md          # normal
   dsh-deslop -H file.md       # hard-only: only unambiguous slop
   ```

2. **Turn off the specific rule.** Rule ids are listed by `--rules`:
   ```sh
   dsh-deslop --rules
   dsh-deslop --disable filler-adverbs file.md
   dsh-deslop --only em-dash,sycophancy file.md
   ```

3. **Undo in the app.** The composer has an Undo pill that restores the draft
   from before the last deslop.

4. **Preview before applying.** `--diff` shows exactly what would change:
   ```sh
   dsh-deslop --diff file.md
   ```

If a rule is genuinely wrong, please
[open a rule issue](https://github.com/0xshahriar/dsh-deslop/issues/new?template=rule_proposal.md) —
rules are meant to be safe.

---

## Nothing was removed from my text

**Likely reasons, in order:**

1. **You are in `normal` mode and the text only contains soft slop.** Hedges
   ("it's important to note"), filler adverbs ("basically"), emoji decoration
   and Chinese buzzwords are aggressive-only by design, because removing them
   can change meaning. Try `-a`.

2. **The text is inside code fences or inline code.** Those are never touched.
   If you really want them processed, pass `--no-preserve-code`.

3. **A rule matched but produced identical output.** The replacement may equal
   the original for your input.

Check what actually ran:

```sh
printf 'your text' | dsh-deslop -a --stats
```

---

## Text inside code blocks was modified

**This should not happen.** Fenced blocks and inline code are excluded before
any rule runs.

If you see it, check whether you passed `--no-preserve-code`, which opts out of
that protection deliberately.

Otherwise it is a bug — please report it with the input and the `--stats`
output.

---

## The phone app still shows the old buttons or behaviour

**Cause.** The dsh-go app draws its surfaces from the manifest, which
hot-reloads, but the handlers in `lib/` are JavaScript the engine loaded at
startup.

**Fix.** Restart the engine from the app: **Engine → Restart**. Manifest-only changes
(new labels, new surfaces) appear without a restart; logic changes do not.

---

## npm install fails or installs an old version

```sh
# What does npm think is latest?
npm view dsh-deslop version

# Force the newest
npm install -g dsh-deslop@latest

# Clear a stale cache if the version looks wrong
npm cache clean --force
```

If you installed from GitHub (`npm i -g github:...`), that spec follows the
default branch and skips npm entirely. Prefer the registry name so you get
tagged releases.

---

## Still stuck?

Open an issue with:

- `dsh-deslop --version`
- the exact command you ran
- the input (or a minimized version)
- what you expected vs. what happened

[Report a bug](https://github.com/0xshahriar/dsh-deslop/issues/new?template=bug_report.md)
· [Propose a rule](https://github.com/0xshahriar/dsh-deslop/issues/new?template=rule_proposal.md)
