// dsh-deslop — slop pattern rules.
// Each rule: { id, langs, desc, re (global regex), severity: 'hard'|'soft' }
//   hard  = nearly always slop in chat output; safe to auto-remove.
//   soft  = context-dependent (sometimes legitimately wanted); auto-remove
//           only in "aggressive" mode, reported otherwise.
// All regexes carry the global flag; replacement functions receive match arrays.

/** @type {Array<{id:string, langs:string, desc:string, re:RegExp, severity:'hard'|'soft', replace:(m:RegExpExecArray)=>string}>} */
export const RULES = [
  // ── 1. Em-dash & punctuation slop ─────────────────────────────────────
  {
    id: 'em-dash',
    langs: 'en',
    desc: 'Em dash (—) / spaced en dash (–), the #1 LLM tell. Replaced with " - ". Skips "——" (the Chinese dash, handled by zh-dash).',
    re: /\s*(?<!—)[—–](?!—)\s*/g,
    severity: 'hard',
    replace: () => ' - ',
  },
  {
    id: 'curly-quotes',
    langs: 'en',
    desc: 'Curly/smart quotes (“ ” ‘ ’) straightened to plain ASCII quotes.',
    re: /[“”«»„]/g,
    severity: 'hard',
    replace: () => '"',
  },
  {
    id: 'curly-apostrophe',
    langs: 'en',
    desc: 'Curly apostrophe (’) straightened.',
    re: /[‘’]/g,
    severity: 'hard',
    replace: () => "'",
  },
  {
    id: 'fancy-ellipsis',
    langs: 'en',
    desc: 'Unicode ellipsis (…) normalized to three dots.',
    re: /…/g,
    severity: 'hard',
    replace: () => '...',
  },

  // ── 2. Opening fluff: "Great/Excellent question!" ─────────────────────
  {
    id: 'praise-opener',
    langs: 'en',
    desc: 'Sycophantic openers: "Great question!", "Excellent question!", "That\'s a great question!", "Good catch!", "Awesome, thanks for..."',
    re: /^(?:sure|certainly|absolutely|of course)\s*[!,.]?\s*/gi,
    severity: 'soft',
    replace: () => '',
  },
  {
    id: 'sycophancy',
    langs: 'en',
    desc: 'Sycophantic praise lines: "Great question!", "Excellent point!", "That\'s a great observation!", "Good catch!" at sentence start.',
    re: /(?:^|[.!?]\s+)(?:(?:That(?:'| i)?s|This is)\s+(?:a\s+|an\s+|really\s+)?(?:great|excellent|fantastic|wonderful|insightful|thought-provoking|very good|good)\s+(?:question|point|observation|catch|idea|insight|note)|Great\s+question|Excellent\s+question|Good\s+catch|Awesome\s+question)[!.]?\s*/gi,
    severity: 'hard',
    replace: (m) => (m[0].match(/^[.!?]/) ? '. ' : ''),
  },
  {
    id: 'agreement-sycophancy',
    langs: 'en',
    desc: 'Agreement sycophancy: "You\'re absolutely right!", "You make a great point", "That\'s absolutely correct" — the #1 mocked 2025 ChatGPT tell.',
    re: /(?:^|[.!?]\s+)(?:You\s+(?:are|re)(?:\s+(?:absolutely|completely|totally))?\s+right(?:\s+about\s+that)?|You(?:'| i)?re\s+(?:absolutely|completely|totally|100%)\s+right(?:\s+about\s+that)?|You\s+make\s+(?:a\s+)?(?:great|good|excellent|valid|fair)\s+point|That(?:'| i)?s\s+(?:absolutely\s+)?correct)[!.]?\s*/gi,
    severity: 'hard',
    replace: (m) => (m[0].match(/^[.!?]/) ? '. ' : ''),
  },

  // ── 3. Hedging & filler ───────────────────────────────────────────────
  {
    id: 'hedging',
    langs: 'en',
    desc: 'Pointless hedges: "It\'s important to note that", "It\'s worth noting that", "Keep in mind that" (kept in aggressive mode only).',
    re: /\b(?:It(?:'| i)?s|It is)\s+(?:also\s+)?(?:important|worthwhile)\s+(?:to\s+note|to\s+mention|noting|to\s+point\s+out)\s+that\s+/gi,
    severity: 'soft',
    replace: () => '',
  },
  {
    id: 'worth-noting',
    langs: 'en',
    desc: '"Worth noting:", "Worth mentioning:", "Note that" standalone openers.',
    re: /\b(?:Worth\s+(?:noting|mentioning)\s*:|Note\s+that\s+)/gi,
    severity: 'soft',
    replace: () => '',
  },
  {
    id: 'i-cannot-but',
    langs: 'en',
    desc: 'Caveat padding: "I should mention that", "It should be noted that".',
    re: /\b(?:I\s+should\s+mention\s+that|It\s+should\s+be\s+noted\s+that)\s+/gi,
    severity: 'soft',
    replace: () => '',
  },
  {
    id: 'filler-adverbs',
    langs: 'en',
    desc: 'Filler adverbs and intensifiers: "simply", "essentially", "basically", "actually", "literally", "truly", "genuinely", "really quite", "very much".',
    re: /\b(?:simply|essentially|basically|literally|genuinely|truly|arguably|arguably|actually)\s+/gi,
    severity: 'soft',
    replace: () => '',
  },
  {
    id: 'just-plain',
    langs: 'en',
    desc: 'Empty intensifier "just" before a verb ("just simply run" → "run").',
    re: /\bjust\s+(?:simply\s+)?/gi,
    severity: 'soft',
    replace: () => '',
  },

  // ── 4. Structure slop: bold headers, "In conclusion" ──────────────────
  {
    id: 'in-conclusion',
    langs: 'en',
    desc: 'Formulaic closers: "In conclusion,", "To sum up,", "In summary,", "Overall,", "All in all,".',
    re: /^(?:In\s+conclusion|To\s+sum\s+up|In\s+summary|To\s+summarize|All\s+in\s+all|Overall)\s*,\s*/gi,
    severity: 'hard',
    replace: () => '',
  },
  {
    id: 'in-conclusion-inline',
    langs: 'en',
    desc: 'Inline "In conclusion," mid-paragraph.',
    re: /(?:[.!?]\s+)In\s+conclusion\s*,\s*/gi,
    severity: 'hard',
    replace: () => '. ',
  },
  {
    id: 'bold-sentence',
    langs: 'en',
    desc: 'Bolded whole sentences used as pseudo-headers inside prose: "**This is the key point.**"',
    re: /\*\*((?:(?!\*\*|\n).)+?[.!?])\*\*\s*/g,
    severity: 'soft',
    replace: (m) => m[1] + ' ',
  },
  {
    id: 'rule-of-three',
    langs: 'en',
    desc: 'Rule-of-three tricolon openers: "Whether you\'re X, Y, or Z" / "From X to Y, ..." (aggressive only).',
    re: /^(?:Whether\s+you(?:'| i)?re\s+[^.!?\n]{3,120}?,\s*or\s+[^.!?\n]{2,80}?,\s*)/gi,
    severity: 'soft',
    replace: () => '',
  },
  {
    id: 'not-only-but',
    langs: 'en',
    desc: '"not only ... but also ..." → plain "and" phrasing.',
    re: /\bnot\s+only\s+([^,;.!?\n]{2,120}?)\s*,?\s*but\s+(?:also\s+)?/gi,
    severity: 'soft',
    replace: (m) => m[1] + ' and ',
  },
  {
    id: 'not-about-x',
    langs: 'en',
    desc: '"It\'s not about X, it\'s about Y" contrast template (aggressive only).',
    re: /\b(?:It(?:'| i)?s|This\s+is)\s+not\s+(?:just\s+|merely\s+)?about\s+([^,;.!?\n]{2,80})[;,]?\s+it(?:'| i)?s\s+about\s+/gi,
    severity: 'soft',
    replace: (m) => `It's about ${m[1]} and `,
  },
  {
    id: 'discourse-frames',
    langs: 'en',
    desc: 'Discourse framing openers: "Here\'s the thing:", "The bottom line:", "The reality is,", "At the end of the day,", "That said,", "Ultimately," (aggressive only).',
    re: /(?:^|[.!?]\s+)(?:Here(?:'| i)?s\s+the\s+thing\s*:|The\s+bottom\s+line\s*(?:is)?\s*:|The\s+(?:reality|truth)\s+is\s*,|At\s+its\s+core\s*,|At\s+the\s+end\s+of\s+the\s+day\s*,|That\s+said\s*,|With\s+that\s+in\s+mind\s*,|Ultimately\s*,)\s*/gi,
    severity: 'soft',
    replace: (m) => (m[0].match(/^[.!?]/) ? '. ' : ''),
  },
  {
    id: 'rhetorical-questions',
    langs: 'en',
    desc: 'Rhetorical question openers: "So, what does this mean?", "Why does this matter?", "What\'s the takeaway?" (aggressive only).',
    re: /(?:^|\n)(?:So\s*,\s*)?(?:What\s+does\s+(?:this|that|all\s+this)\s+mean|Why\s+does\s+this\s+matter|What(?:'| i)?s\s+the\s+takeaway)[^\n?]*\?\s*\n?/gi,
    severity: 'soft',
    replace: (m) => (m[0].startsWith('\n') ? '' : ''),
  },

  // ── 5. Chatty filler sentences ────────────────────────────────────────
  {
    id: 'let-me-know',
    langs: 'en',
    desc: 'Boilerplate tails: "Let me know if ...", "Feel free to ...", "Hope this helps!", "I hope this helps".',
    re: /(?:^|[.!?]\s+)(?:(?:I\s+)?Hope\s+(?:this|that)\s+helps(?:\s+you)?|Let\s+me\s+know\s+if\s+you\s+(?:have\s+any\s+)?(?:other\s+)?(?:questions?|need\s+anything\s+else|need\s+more)|Feel\s+free\s+to\s+(?:ask|reach\s+out)[^.!?]*)[.!]?\s*/gi,
    severity: 'hard',
    replace: (m) => (m[0].match(/^[.!?]/) ? '. ' : ''),
  },
  {
    id: 'offer-tails',
    langs: 'en',
    desc: 'Offer tails: "Would you like me to…?", "Do you want me to…?", "Shall I…?", "Is there anything else…?", "Anything else I can do?"',
    re: /(?:^|[.!?]\s+)(?:Would\s+you\s+like\s+(?:me\s+to|some|a)[^.?\n]*|Do\s+you\s+want\s+me\s+to[^.?\n]*|Sh(?:all|ould)\s+I[^.?\n]*|Is\s+there\s+(?:anything|something)\s+else[^.?\n]*|Anything\s+else\s+I\s+can\s+(?:help|do)[^.?\n]*)\?\s*/gi,
    severity: 'hard',
    replace: (m) => (m[0].match(/^[.!?]/) ? '. ' : ''),
  },
  {
    id: 'happy-to',
    langs: 'en',
    desc: '"I\'d be happy to help you with that." style offers.',
    re: /(?:^|[.!?]\s+)I(?:'| i)?(?:d|'ll|m)\s+be\s+(?:happy|glad|delighted)\s+to\s+(?:help|assist|answer|clarify|explain)[^.!?]*[.!]?\s*/gi,
    severity: 'hard',
    replace: (m) => (m[0].match(/^[.!?]/) ? '. ' : ''),
  },
  {
    id: 'thanks-for',
    langs: 'en',
    desc: 'Conversational thanks: "Thanks for sharing", "Thanks for pointing that out", "Thanks for bringing this up".',
    re: /(?:^|[.!?]\s+)Thanks\s+for\s+(?:sharing|asking|pointing\s+(?:this|that)\s+out|bringing\s+(?:this|that)\s+up)[^.!?]*[.!]?\s*/gi,
    severity: 'hard',
    replace: (m) => (m[0].match(/^[.!?]/) ? '. ' : ''),
  },
  {
    id: 'delve',
    langs: 'en',
    desc: 'Classic LLM verbs: "delve into", "dive deep into", "navigate the complexities of", "unlock", "unleash", "harness the power of".',
    re: /\b(?:delv(?:e|es|ed|ing)\s+into|div(?:e|es|ing)\s+deep\s+into|navigat(?:e|es|ing)\s+the\s+complexities\s+of|unlock(?:ing)?\s+the\s+(?:power|potential)\s+of|unleash(?:ing)?\s+the\s+(?:power|potential)\s+of|harness(?:ing)?\s+the\s+power\s+of)\b/gi,
    severity: 'hard',
    replace: (m) => {
      const w = m[0]
      if (/^delv/i.test(w)) return 'explore '
      if (/^div/i.test(w)) return 'examine '
      if (/^navigat/i.test(w)) return 'handle '
      return 'use '
    },
  },
  {
    id: 'corporate-verbs',
    langs: 'en',
    desc: 'Corporate verbs: "leverage/utilize" → "use".',
    re: /\b(leverag|utiliz)(e|es|ed|ing)\b/gi,
    severity: 'hard',
    replace: (m) => {
      const suffix = m[2].toLowerCase()
      const ing = suffix === 'ing' ? 'using' : suffix === 'es' ? 'uses' : suffix === 'ed' ? 'used' : 'use'
      return ing
    },
  },
  {
    id: 'transition-openers',
    langs: 'en',
    desc: 'Puffy transition openers: "Furthermore,", "Moreover,", "Additionally,", "In addition,", "Consequently,", "Subsequently," at sentence start.',
    re: /(?:^|[.!?]\s+)(?:Furthermore|Moreover|Additionally|In\s+addition|Consequently|Subsequently)\s*,\s*/gi,
    severity: 'hard',
    replace: (m) => (m[0].match(/^[.!?]/) ? '. ' : ''),
  },
  {
    id: 'firstly-secondly',
    langs: 'en',
    desc: 'Stiff enumerators: "Firstly/Secondly/Thirdly/Lastly" → "First/Second/Third/Finally".',
    re: /\b(Firstly|Secondly|Thirdly|Lastly)\b/g,
    severity: 'hard',
    replace: (m) => {
      const map = { firstly: 'First', secondly: 'Second', thirdly: 'Third', lastly: 'Finally' }
      return map[m[1].toLowerCase()] ?? m[1]
    },
  },
  {
    id: 'tapestry',
    langs: 'en',
    desc: 'Overwrought metaphors: "rich tapestry of", "intricate dance of", "symphony of", "testament to", "in the realm of", "a beacon of", "embark on a journey".',
    re: /\b(?:a\s+)?(?:rich\s+)?(?:tapestry|symphony|mosaic)\s+of\b|\b(?:an\s+)?intricate\s+dance\s+of\b|\b(?:a\s+)?testament\s+to\b|\bin\s+the\s+realm\s+of\b|\ba\s+beacon\s+of\b|\bembark(?:ing|ed)?\s+on\s+(?:a\s+)?(?:journey|adventure)\b/gi,
    severity: 'hard',
    replace: (m) => (/^in/i.test(m[0]) ? 'in ' : ''),
  },
  {
    id: 'intensifier-adjectives',
    langs: 'en',
    desc: 'Overused intensifier adjectives: crucial/pivotal/paramount/myriad → "key"; "a plethora of" → "many" (aggressive only).',
    re: /\b(?:crucial|pivotal|paramount|myriad)\b|\ba\s+plethora\s+of\b/gi,
    severity: 'soft',
    replace: (m) => (/plethora/i.test(m[0]) ? 'many ' : 'key'),
  },
  {
    id: 'game-changer',
    langs: 'en',
    desc: 'Hype words: "game-changer", "revolutionize", "cutting-edge", "seamless(ly)", "robust" (aggressive only for robust).',
    re: /\b(?:a\s+)?game[-\s]?chang(?:er|ing)\b|\brevolutioniz(?:e|es|ing)\b|\bcutting[-\s]edge\b/gi,
    severity: 'hard',
    replace: () => 'major ',
  },
  {
    id: 'seamlessly',
    langs: 'en',
    desc: '"seamlessly integrates/works" → "integrates/works".',
    re: /\bseamlessly\b\s*/gi,
    severity: 'hard',
    replace: () => '',
  },
  {
    id: 'it-not-just-x',
    langs: 'en',
    desc: '"It\'s not just X — it\'s Y" contrast template (aggressive only).',
    re: /\bIt(?:'| i)?s\s+not\s+just\s+[^.!?\n]{2,80}?[,—–-]\s*it(?:'| i)?s\s+/gi,
    severity: 'soft',
    replace: () => "It's ",
  },

  // ── 6. Sign-off slop ──────────────────────────────────────────────────
  {
    id: 'sign-off',
    langs: 'en',
    desc: 'Assistant sign-offs: "Best regards", "Warm regards", "Cheers!", standalone "Happy coding!".',
    re: /(?:^|\n)\s*(?:Best|Kind|Warm|With\s+warm)\s+regards\s*,?\s*\n?[^\n]*$|(?:^|\n)\s*Happy\s+coding\s*[!.]?\s*$/gi,
    severity: 'hard',
    replace: () => '',
  },

  // ── 7. Unicode slop & decoration ──────────────────────────────────────
  {
    id: 'emoji-decoration',
    langs: 'en',
    desc: 'Decorative emoji bullets/headers (🚀 ✨ 🎯 💡 ✅ 🔥 …) stripped from line starts and inline headers.',
    re: /(?:^|\n)\s*(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2705}\u{274C}\u{2728}]{1,3}\s+)+/gu,
    severity: 'soft',
    replace: (m) => (m[0].startsWith('\n') ? '\n' : ''),
  },
  {
    id: 'zero-width',
    langs: 'en',
    desc: 'Zero-width characters (U+200B/200C/200D/FEFF) and stray BOMs removed.',
    re: /[\u200B\u200C\u200D\uFEFF]/g,
    severity: 'hard',
    replace: () => '',
  },
  {
    id: 'box-drawing',
    langs: 'en',
    desc: 'ASCII/box-drawing decoration lines (────, ════, ████, ╔══╗ borders) removed.',
    re: /(?:^|\n)[ \t]*(?:[─━═▬▤▥▦▧▨▩▓▒░█▄▀■□▪▫\-=_*~]{6,})[ \t]*(?=\n|$)/g,
    severity: 'soft',
    replace: (m) => (m[0].startsWith('\n') ? '' : ''),
  },
  {
    id: 'excess-exclaim',
    langs: 'en',
    desc: 'Runs of 2+ exclamation/question marks ("Great!!!" → "Great!").',
    re: /([!?]){2,}/g,
    severity: 'soft',
    replace: (m) => m[1],
  },
  {
    id: 'double-space',
    langs: 'en',
    desc: 'Multiple consecutive spaces collapsed to one (outside line starts, to preserve code indentation).',
    re: /(^|\n)([^\S\n]{2,})/g,
    severity: 'soft',
    replace: (m) => m[1],
  },
  {
    id: 'excess-newlines',
    langs: 'en',
    desc: '3+ consecutive blank lines collapsed to one blank line.',
    re: /\n{3,}/g,
    severity: 'hard',
    replace: () => '\n\n',
  },
  {
    id: 'trailing-ws',
    langs: 'en',
    desc: 'Trailing whitespace on lines removed.',
    re: /[ \t]+(?=\n|$)/g,
    severity: 'hard',
    replace: () => '',
  },

  // ── 8. Chinese slop ──────────────────────────────────────────────────
  {
    id: 'zh-openers',
    langs: 'zh',
    desc: 'Chinese formulaic openers: OK / sure / no problem / got it.',
    re: /^(?:好的[的呀啊]?[，,！!]?)\s*|^(?:当然可以[，,！!]?|没问题[，,！!]?|收到[！!]?|明白了[，,！!]?)\s*/gi,
    severity: 'hard',
    replace: () => '',
  },
  {
    id: 'zh-tail',
    langs: 'zh',
    desc: 'Chinese formulaic tails: hope-this-helps / good-luck / ask-me-anytime closers.',
    re: /(?:[。！!]?\s*)(?:希望(?:这|以上内容)?(?:对你|对大家)?有(?:所)?帮助|祝(?:你)?(?:学习|工作|编程)顺利)[。！!]?\s*$|(?:如果(?:你)?(?:还)?有(?:任何)?(?:其他)?问题[^。！!\n]*[。！!]?)\s*$/g,
    severity: 'hard',
    replace: () => '',
  },
  {
    id: 'zh-fillers',
    langs: 'zh',
    desc: 'Chinese filler phrases: actually / basically / in short / in summary / note-that / it-is-thus-clear / undeniably / meanwhile / honestly.',
    re: /(?:^|[。！!，,\n])\s*(?:总的来说|综上所述|总而言之|简而言之|简单来说|值得注意的是|需要注意的是|值得一提(?:的)?是|其实|基本上|总之|综上(?!述)|由此可见|一言以蔽之|不难[发看]出|需要指出的是|不可否认|毋庸置疑|与此同时|说实话)[，,]?\s*/g,
    severity: 'soft',
    replace: (m) => (m[0].match(/[。！!\n]/) ? '' : ''),
  },
  {
    id: 'zh-buzzwords',
    langs: 'zh',
    desc: 'Chinese corporate buzzwords: empower / grip / closed loop / granularity / underlying logic / top-level design / combo moves / moat — aggressive only.',
    re: /(赋能|抓手|闭环|颗粒度|底层逻辑|顶层设计|组合拳|护城河)/g,
    severity: 'soft',
    replace: () => '',
  },
  {
    id: 'zh-punct-mix',
    langs: 'zh',
    desc: 'Mixed Chinese/English punctuation: half-width , ; : ! ? between Chinese characters converted to full-width — aggressive only.',
    re: /([\u4e00-\u9fff])\s*([,;:!?])\s*(?=[\u4e00-\u9fff])/g,
    severity: 'soft',
    replace: (m) => {
      const map = { ',': '，', ';': '；', ':': '：', '!': '！', '?': '？' }
      return m[1] + (map[m[2]] ?? m[2])
    },
  },
  {
    id: 'zh-flattery',
    langs: 'zh',
    desc: 'Chinese flattery: great-question / keen-observation / great-idea lines.',
    re: /(?:^|[。！!]\s*)(?:这?是一个(?:非常|很)?好(?:的)?问题|你的?(?:观察|思路|想法)(?:非常|很)(?:敏锐|清晰|好)|非常棒(?:的)?(?:想法|问题)|好问题[！!])[。！!]?\s*/gi,
    severity: 'hard',
    replace: (m) => (m[0].match(/[。！!]/) ? '' : ''),
  },
  {
    id: 'zh-emoji-bullets',
    langs: 'zh',
    desc: 'Decorative emoji at Chinese line starts (✨ 🚀 💡 …) stripped.',
    re: /(?:^|\n)\s*(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]{1,3}\s+)+/gu,
    severity: 'soft',
    replace: (m) => (m[0].startsWith('\n') ? '\n' : ''),
  },
  {
    id: 'zh-dash',
    langs: 'zh',
    desc: 'Chinese dash slop: "——" used for interjected explanations is replaced with a full-width colon.',
    re: /\s*——\s*/g,
    severity: 'soft',
    replace: () => '：',
  },
  {
    id: 'zh-fancy-punct',
    langs: 'zh',
    desc: 'Full-width quotes and tilde slop: “ ” → straight quotes, ～ → ~.',
    re: /[“”～]/g,
    severity: 'hard',
    replace: (m) => (m[0] === '～' ? '~' : '"'),
  },
]

/** Rules indexed by id for quick lookup. */
export const RULE_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]))

/**
 * Deserialize a saved custom rule (from settings store) into a usable rule
 * object. Returns null if invalid.
 */
export function parseCustomRule(raw) {
  if (!raw || typeof raw !== 'object') return null
  const { id, pattern, replacement = '', severity = 'soft', flags = 'gi' } = raw
  if (typeof id !== 'string' || typeof pattern !== 'string' || !pattern) return null
  if (!/^[a-zA-Z0-9_.-]+$/.test(id)) return null
  if (RULE_BY_ID[id]) return null
  if (severity !== 'hard' && severity !== 'soft') return null
  const safeFlags = flags === 'g' ? 'g' : 'gi'
  try {
    const re = new RegExp(pattern, safeFlags)
    return { id, desc: raw.desc || 'Custom rule', re, severity, replace: () => replacement }
  } catch {
    return null
  }
}
