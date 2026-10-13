import { useEffect, useMemo, useState } from 'react'
import { tokenizePython } from '../../a-arcade-python/analysis.js'
import { codeLines } from '../source.js'
import * as T from '../engine/text.js'
import { corpus } from '../lessons/corpus.js'

const hex = n => n.toString(16).toUpperCase().padStart(2, '0')
const codePoint = ch => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
const visible = ch => ch === ' ' ? '␣' : ch === '\n' ? '↵' : ch === '\t' ? '⇥' : ch

export function TextInput({ value, onChange, label = 'Text', rows = 2 }) {
  return <label className="nlp-input"><span>{label}</span>
    <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} spellCheck={false} /></label>
}

// UTF-8's rule, drawn: a byte that starts with 0 is a whole character; 110, 1110 and 11110 start
// a 2-, 3- or 4-byte character; 10 marks a continuation byte. The rest of the bits are the number.
function Bits({ byte }) {
  const bits = byte.toString(2).padStart(8, '0')
  const lead = byte < 0x80 ? 1 : byte < 0xc0 ? 2 : byte < 0xe0 ? 3 : byte < 0xf0 ? 4 : 5
  return <span className="nlp-bits"><b>{bits.slice(0, lead)}</b>{bits.slice(lead)}</span>
}

export function CharBytes({ text: initial = 'café 🙂' }) {
  const [text, setText] = useState(initial)
  const cs = T.chars(text), bytes = T.utf8Bytes(text)
  return <div className="qm-fig">
    <TextInput value={text} onChange={setText} />
    <p className="qm-small"><b>{cs.length}</b> characters (what Python’s <code>len(text)</code> says) · <b>{bytes.length}</b> bytes in UTF-8 (<code>len(text.encode())</code>) · JavaScript’s <code>text.length</code> says <b>{text.length}</b></p>
    <div className="qm-scroll"><table className="qm-log nlp-left">
      <thead><tr><th>Character</th><th>Number</th><th>Decimal</th><th>UTF-8 bytes</th><th>In binary (<b>marker bits</b> + the number’s bits)</th></tr></thead>
      <tbody>{cs.map((ch, i) => {
        const b = T.utf8Bytes(ch)
        return <tr key={i}><td className="nlp-char">{visible(ch)}</td><td className="mono">{codePoint(ch)}</td><td className="mono">{ch.codePointAt(0)}</td>
          <td className="mono">{b.map(hex).join(' ')}</td><td className="mono">{b.map((x, j) => <Bits key={j} byte={x} />)}</td></tr>
      })}</tbody>
    </table></div>
  </div>
}

// The real Python function with one line lit, beside the text and the loop's variables.
export function CodePane({ fn, line, file = 'text_basics.py' }) {
  const lines = codeLines({ file, fn })
  const lit = line ? lines.findIndex(l => l.text.includes(line) && !l.text.trim().startsWith('def')) : -1
  return <pre className="nlp-trace-code">{lines.map((l, i) => <div key={l.n} className={i === lit ? 'lit' : ''}>
    <span className="qm-ln">{l.n}</span><code>{tokenizePython(l.text).map((t, j) => <span key={j} className={`tk-${t.kind}`}>{t.text}</span>)}{l.text === '' ? ' ' : ''}</code>
  </div>)}</pre>
}

const EXPLAIN = {
  'current += ch': s => s.kind ? `“${visible(s.ch)}” is a word character, so it is added to the end of \`current\`, the word being built.` : `“${visible(s.ch)}” is not a space, so it is added to the end of \`current\`, the word being built.${/[\p{L}\p{N}]/u.test(s.ch) ? '' : ' (Punctuation too: this splitter only knows spaces. Lesson 1.3 fixes that.)'}`,
  'if current:': s => `“${visible(s.ch)}” is ${s.kind === 'space' || !s.kind ? 'a space' : 'not part of a word'}, but \`current\` is empty: there is no word to finish, so nothing is saved.`,
  'words.append(current)': s => s.end ? `The text has ended with a word still in \`current\`: “${s.saved}” is saved. Without these last lines the final word would be lost.` : `A space ends the word: “${s.saved}” is saved in the list, and \`current\` starts again empty.`,
  'tokens.append(current)': s => s.end ? `The text ended inside a word: “${s.saved}” is saved.` : `“${visible(s.ch)}” is a space, so the word in progress, “${s.saved}”, is finished and saved. The space itself is dropped.`,
  'tokens.append(ch)': s => s.saved ? `“${s.ch}” is punctuation. First the word before it, “${s.saved}”, is saved; then “${s.ch}” is saved as a token of its own.` : `“${s.ch}” is punctuation: it becomes a token of its own.`,
}

export function ScanPlayer({ fn = 'split_words', text: initial = 'Hello,  world!' }) {
  const [text, setText] = useState(initial)
  const trace = useMemo(() => (fn === 'tokenize' ? T.tokenizeTrace(text) : T.splitWordsTrace(text)), [fn, text])
  const [k, setK] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => { setK(0); setPlaying(false) }, [text])
  useEffect(() => {
    if (!playing) return undefined
    if (k >= trace.steps.length) { setPlaying(false); return undefined }
    const id = setTimeout(() => setK(x => x + 1), 450)
    return () => clearTimeout(id)
  }, [playing, k, trace.steps.length])
  const step = k > 0 ? trace.steps[k - 1] : null
  const list = fn === 'tokenize' ? 'tokens' : 'words'
  const done = step ? step[list] : []
  const cs = T.chars(text)
  return <div className="qm-fig">
    <TextInput value={text} onChange={setText} label="Text to scan" rows={1} />
    <div className="qm-fig-controls">
      <button onClick={() => setK(0)} disabled={k === 0}>⏮ Start</button>
      <button onClick={() => setK(x => Math.max(0, x - 1))} disabled={k === 0}>◀ Back</button>
      <button className="qm-primary" onClick={() => setK(x => Math.min(trace.steps.length, x + 1))} disabled={k >= trace.steps.length}>Next character ▶</button>
      <button onClick={() => setPlaying(p => !p)} disabled={k >= trace.steps.length && !playing}>{playing ? '⏸ Pause' : '⏵ Play'}</button>
      <span className="qm-hint">Step {k} of {trace.steps.length}</span>
    </div>
    <div className="qm-fig-row">
      <CodePane fn={fn} line={step?.line} />
      <div className="qm-fig-side">
        <div className="nlp-tape" aria-label="The text, one character per box">{cs.map((ch, i) => <span key={i} className={`${step?.i === i ? 'now' : ''} ${step && (step.i === null || i < step.i) ? 'past' : ''} k-${T.charKind(ch)}`}>{visible(ch)}</span>)}</div>
        <table className="qm-kv"><tbody>
          <tr><td>ch</td><td className="mono">{step?.ch == null ? '—' : `'${visible(step.ch)}'`}</td></tr>
          {fn === 'tokenize' && <tr><td>char_kind(ch)</td><td className="mono">{step?.kind ? `'${step.kind}'` : '—'}</td></tr>}
          <tr><td>current</td><td className="mono">'{step?.current ?? ''}'</td></tr>
          <tr><td>{list}</td><td className="mono">[{done.map(w => `'${w}'`).join(', ')}]</td></tr>
        </tbody></table>
        <p className="nlp-explain">{step ? EXPLAIN[step.line]?.(step) : `Press “Next character”. The loop looks at one character at a time, from the left, and \`current\` holds the ${fn === 'tokenize' ? 'word' : 'word'} it is building.`}</p>
        {k >= trace.steps.length && trace.steps.length > 0 && <p className="qm-result">Finished: <span className="mono">[{trace[list].map(w => `'${w}'`).join(', ')}]</span>, {trace[list].length} {list}.</p>}
      </div>
    </div>
  </div>
}

function Chips({ items }) {
  return <div className="nlp-chips">{items.map((t, i) => <span key={i}>{visible(t)}</span>)}{items.length === 0 && <span className="qm-dim">(none)</span>}</div>
}

export function TokenCompare({ text: initial = "Mr. Smith paid $3.50, didn't he?" }) {
  const [text, setText] = useState(initial)
  const rows = [
    ['split_words(text), the same as text.split()', T.splitWords(text), 'Only spaces separate; punctuation stays stuck to its word.'],
    ['tokenize(text): the hand-written loop', T.tokenize(text), 'Words stay together; every punctuation mark is its own token.'],
    [`re.findall(r"${T.TOKEN_PATTERN}", text)`, T.tokenizeRegex(text), 'One regular expression: the same tokens as the loop.'],
  ]
  return <div className="qm-fig">
    <TextInput value={text} onChange={setText} />
    {rows.map(([name, tokens, why]) => <div key={name} className="nlp-compare-row">
      <p className="qm-small"><span className="mono">{name}</span> · <b>{tokens.length}</b> tokens · {why}</p>
      <Chips items={tokens} />
    </div>)}
  </div>
}

// Word counts, ranked, and Zipf's law: count ≈ C / rank, a straight line of slope −1 on log axes.
export function WordRanks({ useCorpus = true, text: initial = '' }) {
  const [text, setText] = useState(useCorpus ? corpus() : initial)
  const table = useMemo(() => T.rankTable(T.wordCounts(text)), [text])
  const total = table.reduce((s, r) => s + r[2], 0)
  const C = table[0]?.[2] ?? 1
  const W = 420, H = 260, P = 36
  const maxR = Math.max(2, table.length), maxN = Math.max(2, C)
  const x = r => P + (W - P - 10) * Math.log10(r) / Math.log10(maxR)
  const y = n => H - P - (H - P - 10) * Math.log10(n) / Math.log10(maxN)
  return <div className="qm-fig">
    <TextInput value={text} onChange={setText} rows={3} label={useCorpus ? 'Text (to start with: the words of this lab’s own lessons; paste your own)' : 'Text'} />
    <p className="qm-small"><b>{total}</b> words in all (tokens) · <b>{table.length}</b> different words (the vocabulary)</p>
    <div className="qm-fig-row">
      <div className="qm-scroll" style={{ maxHeight: 300 }}><table className="qm-log">
        <thead><tr><th>Rank r</th><th>Word</th><th>Count</th><th>C / r</th><th>r × count</th></tr></thead>
        <tbody>{table.slice(0, 40).map(([r, w, n]) => <tr key={w}><td>{r}</td><td className="mono" style={{ textAlign: 'left' }}>{w}</td><td>{n}</td><td>{(C / r).toFixed(1)}</td><td>{r * n}</td></tr>)}</tbody>
      </table></div>
      {table.length > 1 && <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Count against rank, both on log scales">
        <line className="qm-axis" x1={P} y1={H - P} x2={W - 5} y2={H - P} /><line className="qm-axis" x1={P} y1={10} x2={P} y2={H - P} />
        <text className="qm-tick" x={W / 2} y={H - 8}>rank r (log scale)</text>
        <text className="qm-tick" x={4} y={14}>count</text>
        <line x1={x(1)} y1={y(C)} x2={x(maxR)} y2={y(Math.max(1e-9, C / maxR))} stroke="#7a3fb0" strokeDasharray="5 4" strokeWidth="1.5" />
        {table.map(([r, w, n]) => <circle key={w} cx={x(r)} cy={y(n)} r="2.6" fill="#1f6f68" opacity=".75"><title>{`${r}. ${w}: ${n}`}</title></circle>)}
      </svg>}
    </div>
    <p className="qm-hint">Dots: the real counts. Dashed line: Zipf’s law, count = C / r with C = {C} (the top word’s count). On log axes it is a straight line falling one step for every step right: slope −1.</p>
    {table.length > 2 && <p className="qm-small">Best straight line through these dots: slope <b>{T.logLogSlope(table).toFixed(2)}</b> (Zipf says −1) · words seen only once: <b>{table.filter(r => r[2] === 1).length}</b> of {table.length}</p>}
  </div>
}

export function SentenceSplit({ text: initial = 'Mr. Smith paid $3.50. Was it worth it? Dr. Jones thought so, e.g. for the U.S. market!' }) {
  const [text, setText] = useState(initial)
  const [naive, setNaive] = useState(false)
  const decisions = useMemo(() => T.sentenceDecisions(text), [text])
  const byIndex = Object.fromEntries(decisions.map(d => [d.i, d]))
  const sentences = naive ? T.splitSentencesNaive(text) : T.splitSentences(text)
  const cs = T.chars(text)
  return <div className="qm-fig">
    <TextInput value={text} onChange={setText} />
    <div className="qm-fig-controls">
      <button className={naive ? 'active' : ''} onClick={() => setNaive(true)}>split_sentences_naive</button>
      <button className={!naive ? 'active' : ''} onClick={() => setNaive(false)}>split_sentences (with the rules)</button>
    </div>
    <p className="nlp-marked">{cs.map((ch, i) => {
      const d = byIndex[i]
      if (!d) return <span key={i}>{ch}</span>
      const ends = naive || d.ends
      return <mark key={i} className={ends ? 'ends' : 'not'} title={naive ? 'The naive splitter ends a sentence at every mark.' : d.reason}>{ch}</mark>
    })}</p>
    {!naive && <ul className="qm-legend">{decisions.map(d => <li key={d.i}><mark className={d.ends ? 'ends' : 'not'}>{d.ch}</mark> at position {d.i}: {d.ends ? 'ends a sentence' : 'does not end one'}, because {d.reason}.</li>)}</ul>}
    <ol className="nlp-sentences">{sentences.map((s, i) => <li key={i}>{s}</li>)}</ol>
  </div>
}
