// Benchmark guard: deslop of a large document must stay fast — the dsh-go
// status strip runs the engine on the phone while the user types.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deslop } from '../lib/engine.js'

function bigSlopDoc(kb) {
  const chunk = `Absolutely! Great question! It's important to note that you should
delve into the code — it works seamlessly and is a game-changer. 🚀
Furthermore, it's not just fast, it's reliable. Hope this helps!

\u7ed3\u8bba——\u5982\u4e0b\uff1a\u8d4b\u80fd\u4e1a\u52a1\u95ed\u73af,\u9996\u5148,\u5b89\u88c5\u4f9d\u8d56\u3002\u5e0c\u671b\u5bf9\u4f60\u6709\u5e2e\u52a9\uff01

| Col A | Col B |
| ----- | ----- |
| 1     | 2     |

`
  const block = chunk.repeat(Math.ceil((kb * 1024) / chunk.length))
  return block.slice(0, kb * 1024)
}

test('deslop 100 KB of slop-heavy text in under 500 ms (aggressive)', () => {
  const doc = bigSlopDoc(100)
  const t0 = performance.now()
  const { hits } = deslop(doc, { mode: 'aggressive' })
  const ms = performance.now() - t0
  assert.ok(hits.length > 100, 'should find lots of slop in the fixture')
  assert.ok(ms < 500, `deslop took ${ms.toFixed(0)} ms, budget is 500 ms`)
})

test('deslop 100 KB of clean text in under 250 ms (normal)', () => {
  const doc = ('Plain technical writing with no slop. '.repeat(80) + '\n').repeat(24)
  const t0 = performance.now()
  deslop(doc.slice(0, 100 * 1024), { mode: 'normal' })
  const ms = performance.now() - t0
  assert.ok(ms < 250, `deslop took ${ms.toFixed(0)} ms, budget is 250 ms`)
})
