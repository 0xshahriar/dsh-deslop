# Contributing to dsh-deslop

Thanks for your interest in improving dsh-deslop! This document covers the
basics. By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Project layout

```
dsh-deslop/
├── lib/
│   ├── rules.js       # 50 slop rules (pattern + severity + replacement)
│   ├── engine.js      # deslop() core: modes, code preservation, tidy
│   ├── index.js       # dsh-go handlers + /deslop slash command
│   └── settings.js    # CLI settings persistence
├── bin/
│   ├── dsh-deslop.js       # pipe/file CLI
│   └── dsh-deslop-exec.js  # live CLI-tool output wrapper
├── tests/              # node --test suites (incl. benchmark guards)
├── CHANGELOG.md
└── package.json        # dshGo manifest + engine command registration
```

## Development setup

Requirements: Node.js ≥ 20, no external dependencies.

```sh
git clone https://github.com/0xshahriar/dsh-deslop.git
cd dsh-deslop
node --test tests/           # run all tests
npm test                     # same thing
```

To try it in DSH locally:

```sh
dsh plugin --profile web add "$(pwd)"
```

(The plugin installs as a live link — code edits need an engine restart,
manifest edits hot-reload.)

## Adding a slop rule

1. Add the rule to `lib/rules.js` following the existing shape:

   ```js
   {
     id: 'my-rule',              // stable, kebab-case, unique
     langs: 'en',                // 'en' | 'zh'
     desc: 'English description with examples.',  // no CJK unless quoting the pattern
     re: /pattern/gi,            // must be global; never sticky
     severity: 'hard',           // 'hard' = always slop | 'soft' = aggressive-only
     replace: () => '',          // or (m) => replacement text
   }
   ```

2. Decide the severity carefully: `hard` rules run in every mode and must be
   safe to auto-remove; when in doubt, use `soft`.
3. Add tests to `tests/` — one positive case, one negative case (text that
   must NOT be touched), and a mode-gating case for soft rules.
4. Update `CHANGELOG.md` under an "Unreleased" heading.
5. Run `node --test tests/` and ensure the benchmark guards still pass.

### Rule guidelines

- Never use the sticky (`y`) flag — it blocks mid-text matches.
- Quote examples in descriptions exactly as they appear in text.
- Chinese-matching rules are named `zh-*` and use `langs: 'zh'`.
- Avoid `\s*` where a paragraph break must survive; use `[^\S\n]`.

## Commit messages

Conventional style: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, each with a
subject line ≤ 72 chars and a body explaining *why*. Releases are tagged
`vX.Y.Z` per [SemVer](https://semver.org): new rules = minor, rule/bug fixes =
patch, breaking CLI/manifest changes = major.

## Submitting changes

1. Fork and create a branch: `git checkout -b feat/my-rule`
2. Commit your changes (see above).
3. Ensure tests pass: `node --test tests/`
4. Open a Pull Request describing what slop it removes and why it's safe.

## Reporting bugs

Open an issue with the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).
Include the input text (or a minimized version), the command you ran, expected
vs. actual output.

## Proposing rules

Open an issue with the [rule proposal template](.github/ISSUE_TEMPLATE/rule_proposal.md)
— include example text showing the slop pattern.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
