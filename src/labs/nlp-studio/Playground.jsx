import { useMemo, useState } from 'react'
import * as T from './engine/text.js'

// Your own text through every tool so far: characters and bytes, tokens, word counts, sentences.
const SAMPLE = `Paste your own text here: an article, an email, a chapter of a book. Every tool from Part 1 runs on it as you type.

Mr. Smith paid $3.50 for it. Was it worth it? He thought so!`

export default function Playground() {
  const [text, setText] = useState(SAMPLE)
  const [tokenizer, setTokenizer] = useState('tokenize')
  const tokens = useMemo(() => (tokenizer === 'split' ? T.splitWords(text) : T.tokenize(text)), [text, tokenizer])
  const ranks = useMemo(() => T.rankTable(T.wordCounts(text)), [text])
  const sentences = useMemo(() => T.splitSentences(text), [text])
  const words = ranks.reduce((s, r) => s + r[2], 0)
  return <div className="qm-playground">
    <h2 className="qm-h0">Your text</h2>
    <textarea className="nlp-playground-text" aria-label="Your text" rows={8} value={text} onChange={e => setText(e.target.value)} spellCheck={false} />
    <table className="qm-kv nlp-stats"><tbody>
      <tr><td>Characters, <code>len(text)</code></td><td><b>{T.chars(text).length}</b></td></tr>
      <tr><td>Bytes in UTF-8</td><td><b>{T.utf8Bytes(text).length}</b></td></tr>
      <tr><td>Words (tokens that are words)</td><td><b>{words}</b></td></tr>
      <tr><td>Vocabulary (different words)</td><td><b>{ranks.length}</b></td></tr>
      <tr><td>Sentences</td><td><b>{sentences.length}</b></td></tr>
    </tbody></table>
    <div className="qm-fig-row">
      <section className="qm-fig nlp-play-col">
        <div className="qm-fig-controls">
          <button className={tokenizer === 'split' ? 'active' : ''} onClick={() => setTokenizer('split')}>split_words</button>
          <button className={tokenizer === 'tokenize' ? 'active' : ''} onClick={() => setTokenizer('tokenize')}>tokenize</button>
          <span className="qm-hint">{tokens.length} tokens</span>
        </div>
        <div className="nlp-chips qm-scroll">{tokens.map((t, i) => <span key={i}>{t}</span>)}</div>
      </section>
      <section className="qm-fig nlp-play-col">
        <h3 className="qm-small-h">Most frequent words</h3>
        <div className="qm-scroll"><table className="qm-log"><thead><tr><th>Rank</th><th>Word</th><th>Count</th></tr></thead>
          <tbody>{ranks.slice(0, 30).map(([r, w, n]) => <tr key={w}><td>{r}</td><td className="mono" style={{ textAlign: 'left' }}>{w}</td><td>{n}</td></tr>)}</tbody></table></div>
      </section>
    </div>
    <section className="qm-fig">
      <h3 className="qm-small-h">Sentences</h3>
      <ol className="nlp-sentences">{sentences.map((s, i) => <li key={i}>{s}</li>)}</ol>
    </section>
  </div>
}
