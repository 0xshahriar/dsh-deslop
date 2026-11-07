# Engine patch: `inspect()` must return a boolean `bundle`

## Problem

dsh-android (the Kotlin app) rejects a plugin installation with:

```
unexpected android/ext/inspect result: Failed to parse literal 'null' as a boolean value at path: $.bundle
JSON input: ......gz","bundle":null,"registry":"https://registry.npmjs.org/"}
```

`@deepseek-ai/dsh-plugin-manager`'s `inspect()` handles four spec kinds. Two of
them return a **hardcoded `null`** for `bundle`, because they never read the
package manifest:

```js
case "git":     return { status: "accepted", kind: "git",     bundle: null, ... }
case "tarball": return { status: "accepted", kind: "tarball", bundle: null, ... }
```

Only `registry` and `path` specs pass through `inspectionOf()`, which computes
a real boolean:

```js
const bundle = typeof declared.bundle === "object" && declared.bundle !== null
```

The dsh-go bridge tolerates the `null`; dsh-android's strict Kotlin
deserializer does not, so any install from a **git URL** or a **tarball URL**
fails there. This is not a plugin defect: dsh-deslop declares
`dsh.bundle = { "patch": "./cordis.patch.yml" }`, which resolves to `true` on
the registry and path routes.

## Fix

`plugin-manager-inspect-bundle-boolean.diff` makes both branches emit a real
boolean:

- **git** — the remote manifest is not fetched during inspection, so the field
  is `false` (meaning "not known to be a bundle") instead of `null`.
- **tarball** — a local tarball carries its `package.json`, so the patch reads
  it with `tar -xOzf` and reports the actual `dsh.bundle` flag. A remote
  tarball cannot be read without fetching, which inspection deliberately does
  not do, so it reports `false`.

## Applying

The engine lives at `/opt/dsh`. Depending on the app build, apply either the
matching source edit or the diff:

```sh
cd /opt/dsh/node_modules/@deepseek-ai/dsh-plugin-manager
patch -p0 lib/index.js < /path/to/plugin-manager-inspect-bundle-boolean.diff
```

Restart the engine afterwards. Verify with:

```sh
dsh --profile web --dump-config   # must exit 0 with no load errors
```

## Important

This patch lives in the engine checkout, so a **runtime upgrade replaces it**.
Treat it as an upstream bug report: the durable fix belongs in
`@deepseek-ai/dsh-plugin-manager`. Re-apply after each engine update, or
avoid the issue entirely by installing from a local path:

```sh
dsh plugin --profile web add /path/to/dsh-deslop
```
