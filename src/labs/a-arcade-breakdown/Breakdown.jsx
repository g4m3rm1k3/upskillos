import Katex from '../../components/concept-explorer/Katex.jsx'
import { PIECES, ROOT, outline, parentsOf, pathTo } from './pieces.js'
import { linesFor } from './engine.js'
import engineSource from './engine.js?raw'
import { CODE_LINES } from './codeLines.js'

// A piece's live value or formula can only be computed once the program has produced it
// (a step run, a batch collected); until then it shows null and the view says so.
function attempt(fn, L) {
  try { return fn?.(L) ?? null } catch { return null }
}

// Each line of the piece's code beside what it does, the symbol it computes and the value it
// produced on the step the program just ran. Lines without a note (closing braces) stay plain.
function CodeBreakdown({ code, notes, live }) {
  return <ol className="ab-code-lines">{code.split('\n').map((line, i) => {
    const note = notes.find(nb => line.includes(nb.has))
    const now = note && attempt(note.now, live)
    return <li key={i} className={note ? 'noted' : ''}>
      <pre><code>{line || ' '}</code></pre>
      {note && <div className="ab-line-note">
        {note.tex && <span className="ab-line-tex"><Katex latex={note.tex} display={false} /></span>}
        <p>{note.say}</p>
        {now != null && <p className="ab-now">this step → {now}</p>}
      </div>}
    </li>
  })}</ol>
}

export function PieceView({ id, live, onOpen, onBreak, algorithm }) {
  const piece = PIECES[id] ?? PIECES[ROOT]
  const path = pathTo(id), parents = parentsOf(id)
  const plugged = attempt(piece.plug, live)
  const code = linesFor(engineSource, id)
  const breakIt = piece.breakIt && (!piece.breakIt.algorithm || piece.breakIt.algorithm === algorithm) ? piece.breakIt : null
  return <article className="ab-piece" aria-label={`Piece: ${piece.title}`}>
    <nav className="ab-crumbs" aria-label="Where this piece sits">{path.map((p, i) => <span key={p}>{i > 0 && <b>›</b>}{p === id ? <strong>{PIECES[p].title}</strong> : <button className="ab-link" onClick={() => onOpen(p)}>{PIECES[p].title}</button>}</span>)}</nav>
    <p className="ab-eyebrow">LEVEL {path.length - 1} · {piece.parts.length ? `MADE OF ${piece.parts.length} PIECES` : 'A FOUNDATION'}</p>
    <h2>{piece.title}</h2>
    <p className="ab-question">{piece.question}</p>

    <section><h3>In plain words</h3>{piece.plain.map((p, i) => <p key={i} className="ab-plain">{p}</p>)}</section>

    <section><h3>The code, line by line</h3>{code ? <CodeBreakdown code={code} notes={CODE_LINES[id] ?? []} live={live} /> : <p className="ab-caption">No lines of its own: this piece is carried out by the pieces it is made of{piece.parts.length ? '' : ', or it is maths the code uses without naming'}.</p>}</section>

    {piece.table && <section><h3>Side by side</h3><div className="ab-batch"><table><thead><tr>{piece.table.head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{piece.table.rows.map(row => <tr key={row[0]}>{row.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div></section>}

    <section><h3>The maths</h3>{piece.math.map((m, i) => <div className="ab-formula" key={i}><Katex latex={m.tex} /><p>{m.say}</p></div>)}</section>

    {piece.symbols.length > 0 && <section><h3>Every symbol</h3><div className="ab-batch ab-symbols"><table><thead><tr><th>Symbol</th><th>Say it</th><th>What it means</th><th>In the code</th><th>Right now</th></tr></thead><tbody>{piece.symbols.map(s => {
      const now = attempt(s.now, live)
      return <tr key={s.tex}><td><Katex latex={s.tex} display={false} /></td><td>{s.say}</td><td>{s.means}</td><td>{s.code ? <code>{s.code}</code> : '—'}</td><td className="ab-now">{now ?? '—'}</td></tr>
    })}</tbody></table></div></section>}

    {piece.example.steps.length > 0 && <section className="ab-worked"><h3>Work it by hand: a general example</h3><p>{piece.example.setup}</p><ol>{piece.example.steps.map((s, i) => <li key={i}>{s.tex ? <Katex latex={s.tex} /> : s.text}</li>)}</ol></section>}
    {piece.example.steps.length === 0 && <section className="ab-worked"><h3>Work it by hand</h3><p>{piece.example.setup}</p></section>}

    {piece.plug && <section className="ab-plugged"><h3>The same maths with this step's numbers</h3>{plugged ? <Katex latex={plugged} /> : <p>Not available yet: {live.algorithm === 'a2c' ? 'step the program (with learning on, for batch values) until this piece has run' : 'use One action or Next operation until this piece has run'}{live.cartpole ? '' : ', or switch to CartPole'}.</p>}</section>}

    {breakIt && <section className="ab-break"><h3>Break it</h3><p>{breakIt.text}</p><button onClick={() => onBreak(breakIt.option, breakIt.value)}>Break this piece</button></section>}

    {piece.parts.length > 0 && <section><h3>Made of: go one level down</h3><div className="ab-parts">{piece.parts.map(p => <button key={p} onClick={() => onOpen(p)}><strong>{PIECES[p].title}</strong><small>{PIECES[p].question}</small></button>)}</div></section>}
    {parents.length > 0 && <section><h3>Part of: go back up</h3><div className="ab-parents">{parents.map(p => <button key={p} className="ab-link" onClick={() => onOpen(p)}>↑ {PIECES[p].title}</button>)}</div></section>}
  </article>
}

export function PieceMap({ current, onOpen }) {
  const onPath = new Set(pathTo(current))
  return <section className="ab-panel ab-map"><p className="ab-eyebrow">THE WHOLE BREAKDOWN</p><h3>Every piece, top to bottom</h3>
    <nav aria-label="Breakdown map">{outline().map(({ id, depth }) => <button key={id} onClick={() => onOpen(id)} className={id === current ? 'current' : onPath.has(id) ? 'on-path' : ''} style={{ paddingLeft: 6 + depth * 12 }} aria-current={id === current ? 'true' : undefined}>{PIECES[id].title}</button>)}</nav>
    <p className="ab-caption">Pieces used in several places appear once, under the first piece that needs them. "Part of" on each piece lists every place it is used.</p>
  </section>
}
