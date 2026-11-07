# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.4.x   | ✅        |
| < 0.4   | ❌        |

## Reporting a vulnerability

dsh-deslop is a text-processing tool with no network access, no telemetry, and
no secrets handling, so the attack surface is small — but issues are still
worth reporting.

If you find a security problem (e.g. a regex that can hang the engine on
crafted input, or a way the plugin reads more data than declared), please:

1. **Do not open a public issue.**
2. Use GitHub's private security advisory:
   <https://github.com/0xshahriar/dsh-deslop/security/advisories/new>
3. Include a minimal reproducing input and the affected version.

You will get a response within 7 days. Fixes are released as patch versions.

## Known design boundaries

- The dsh-go plugin reads the draft, clipboard, or a pressed message **only**
  when the user taps a button, and never sends that data anywhere — all
  processing happens in the on-device engine.
- Custom regex rules (`--add-rule`) are compiled with user-provided patterns;
  a pathological pattern could degrade performance. Match output is capped at
  500 hits per run as a mitigation.
