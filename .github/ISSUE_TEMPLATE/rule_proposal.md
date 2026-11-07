---
name: Rule proposal
about: Propose a new AI-slop pattern for dsh-deslop to remove
title: "[rule] "
labels: enhancement, rule-proposal
assignees: 0xshahriar
---

**The slop pattern**

What LLM tell does this catch? (e.g. "sign-off lines", "hype adjectives")

**Example text** (2–3 real examples)

```text
example sentences containing the slop
```

**What it should become**

```text
the same sentence, deslopped
```

**Proposed rule**

```js
{
  id: 'my-slop',
  langs: 'en',            // or 'zh'
  severity: 'hard',       // or 'soft' if it's sometimes legitimate
  // pattern sketch if you have one (not required)
}
```

**Severity reasoning**

Why is this always slop (`hard`) vs. context-dependent (`soft`)?

**Checklist**

- [ ] The examples are real slop, not just personal style
- [ ] I considered text where this pattern is legitimate
- [ ] No existing rule already covers it (`dsh-deslop --rules`)
