// Linear systems: row operations that change the equations but not the answer, and the shape of a solution set.
import { useRef, useState } from 'react'
import { Arrow, fmt, Handle, lineThrough, MatrixTile, Notes, Plane, Readout, ScreenArrow, Slider, solveLinear, Stat, toSvg, vec } from './parts.jsx'

const SYSTEMS = {
  'One answer': [[1, 1, 3], [2, -1, 0]],
  'No answer': [[1, 1, 3], [2, 2, 2]],
  'Every point on a line': [[1, 1, 3], [2, 2, 6]],
}

function solve2([[a, b, e], [c, d, f]]) {
  const det = a * d - b * c
  return Math.abs(det) > 1e-9 ? [(e * d - b * f) / det, (a * f - e * c) / det] : null
}

function EqLine({ row, tone, label }) {
  const ends = lineThrough(row[0], row[1], row[2])
  if (!ends) return null
  const [[x1, y1], [x2, y2]] = ends.map(p => toSvg(p))
  const [lx, ly] = toSvg([-4.6, Math.abs(row[1]) > 1e-9 ? (row[2] + row[0] * 4.6) / row[1] : 0])
  return <g className="la-eqline" style={{ '--tone': `var(--c-${tone})` }}><line x1={x1} y1={y1} x2={x2} y2={y2} />{Math.abs(row[1]) > 1e-9 && ly > 14 && ly < 350 && <text x={lx} y={ly - 8}>{label}</text>}</g>
}

const rowText = r => `${fmt(r[0])}x + ${fmt(r[1])}y = ${fmt(r[2])}`

export function Eliminate() {
  const plane = useRef(null)
  const [name, setName] = useState('One answer')
  const [M, setM] = useState(SYSTEMS['One answer'])
  const [k, setK] = useState(2)
  const [log, setLog] = useState([])
  const solution = solve2(M)
  const pivot = M[0][0] || 1
  const apply = (next, text) => { setM(next.map(r => r.map(v => Math.abs(v) < 1e-12 ? 0 : v))); setLog(l => [...l, text]) }
  const zeroRow = M.find(r => Math.abs(r[0]) < 1e-9 && Math.abs(r[1]) < 1e-9)
  const verdict = zeroRow ? (Math.abs(zeroRow[2]) > 1e-9 ? `A row now reads 0 = ${fmt(zeroRow[2])}: impossible, so the system has no solution.` : 'A row now reads 0 = 0: it adds no information, so a free variable remains and there are infinitely many solutions.') : solution ? `The lines cross at ${vec(solution)}, and every row operation keeps that point.` : 'The two lines are parallel.'
  return <>
    <div className="la-presets" role="group" aria-label="Choose a system">{Object.keys(SYSTEMS).map(n => <button key={n} type="button" aria-pressed={n === name} onClick={() => { setName(n); setM(SYSTEMS[n]); setLog([]) }}>{n}</button>)}</div>
    <Plane plane={plane} label={`Coordinate plane: row 1 is ${rowText(M[0])}, row 2 is ${rowText(M[1])}. ${verdict}`}>
      <EqLine row={M[0]} tone="i" label="row 1" /><EqLine row={M[1]} tone="j" label="row 2" />
      {solution && <circle className="la-solution" cx={toSvg(solution)[0]} cy={toSvg(solution)[1]} r="7" />}
    </Plane>
    <div className="la-matrix-row">
      <MatrixTile label="[A | b]" rows={M} rowTones={['i', 'j']} />
      <Stat label="Solution" value={solution ? vec(solution) : zeroRow && Math.abs(zeroRow[2]) < 1e-9 ? 'a whole line' : 'none'} tone="v" />
    </div>
    <div className="la-controls"><Slider label="Multiplier k" tone="j" value={k} onChange={setK} min={-3} max={3} step={0.5} /></div>
    <div className="la-rowops" role="group" aria-label="Row operations">
      <button type="button" onClick={() => apply([M[0], M[1].map((v, i) => v - k * M[0][i])], `R2 ← R2 − ${fmt(k)}·R1`)}>R2 ← R2 − k·R1</button>
      <button type="button" onClick={() => apply([M[0].map((v, i) => v - k * M[1][i]), M[1]], `R1 ← R1 − ${fmt(k)}·R2`)}>R1 ← R1 − k·R2</button>
      <button type="button" disabled={Math.abs(M[0][0]) < 1e-9} onClick={() => apply([M[0].map(v => v / pivot), M[1]], `R1 ← R1 ÷ ${fmt(pivot)}`)}>R1 ← R1 ÷ pivot</button>
      <button type="button" disabled={Math.abs(M[1][1]) < 1e-9} onClick={() => apply([M[0], M[1].map(v => v / M[1][1])], `R2 ← R2 ÷ ${fmt(M[1][1])}`)}>R2 ← R2 ÷ pivot</button>
      <button type="button" onClick={() => apply([M[1], M[0]], 'Swap R1 and R2')}>Swap rows</button>
      <button type="button" className="la-ghost" onClick={() => { setM(SYSTEMS[name]); setLog([]) }}>Reset</button>
    </div>
    {log.length > 0 && <ol className="la-oplog">{log.map((t, i) => <li key={i}>{t}</li>)}</ol>}
    <Readout>{verdict}</Readout>
    <Notes try={Math.abs(M[1][0]) > 1e-9 && Math.abs(M[0][0]) > 1e-9 ? `Set k = ${fmt(M[1][0] / M[0][0])} and press R2 ← R2 − k·R1 to clear the x term of row 2. Watch the green line turn flat while the crossing point stays put.` : 'Row 2 has no x term now. Divide each row by its pivot, then clear above the second pivot with R1 ← R1 − k·R2. Can you reach [1 0 | x; 0 1 | y]?'} truth="Row operations rotate and shift the lines, but the crossing point never moves. That is why elimination is allowed." trap="Multiplying a row by 0 is not a row operation: it throws an equation away and can create solutions that were never there."
      code={`A = [${M.map(r => `${fmt(r[0])} ${fmt(r[1])}`).join('; ')}];\nb = [${M.map(r => fmt(r[2])).join('; ')}];\ndisp(rref([A b]))`} />
  </>
}

// One equation a·x + b·y = c in two unknowns: every solution is one particular solution plus a multiple of the nullspace direction.
export function SolutionSet() {
  const plane = useRef(null)
  const [a, setA] = useState(1), [b, setB] = useState(2), [c, setC] = useState(4), [t, setT] = useState(1)
  const nn = a * a + b * b
  const p = nn ? [a * c / nn, b * c / nn] : [0, 0]
  const n = [-b, a]
  const x = [p[0] + t * n[0], p[1] + t * n[1]]
  const check = a * x[0] + b * x[1]
  const sol = lineThrough(a, b, c), nul = lineThrough(a, b, 0)
  const seg = (ends, cls) => { if (!ends) return null; const [[x1, y1], [x2, y2]] = ends.map(q => toSvg(q)); return <line className={cls} x1={x1} y1={y1} x2={x2} y2={y2} /> }
  const meaning = nn ? `Particular solution p = ${vec(p)}. Nullspace direction n = ${vec(n)}. x = p + ${fmt(t)}·n = ${vec(x)}, and a·x + b·y = ${fmt(check)}.` : 'With a = b = 0 the equation says 0 = c.'
  return <>
    <Plane plane={plane} label={`Coordinate plane: the solution line of ${fmt(a)}x + ${fmt(b)}y = ${fmt(c)} and the parallel nullspace line through the origin. ${meaning}`}>
      {seg(nul, 'la-nullline')}{seg(sol, 'la-solline')}
      <Arrow to={p} tone="out" label="p" width={3} />
      <Arrow from={p} to={x} tone="dir" label="t·n" dashed width={2.5} mid />
      <Arrow to={[n[0] * 0.6, n[1] * 0.6]} tone="dir" label="n" width={2} />
      <circle className="la-solution" cx={toSvg(x)[0]} cy={toSvg(x)[1]} r="7" />
    </Plane>
    <div className="la-controls">
      <Slider label="a" tone="i" value={a} onChange={setA} min={-2} max={2} />
      <Slider label="b" tone="j" value={b} onChange={setB} min={-2} max={2} />
      <Slider label="Right-hand side c" tone="out" value={c} onChange={setC} min={-5} max={5} step={0.5} />
      <Slider label="Free parameter t" tone="dir" value={t} onChange={setT} min={-2} max={2} />
    </div>
    <Readout>{meaning}</Readout>
    <Notes try="Set c = 0. The solution line now passes through the origin and equals the nullspace. Then move t and watch the gold point slide while the equation stays satisfied." truth="Changing c shifts the solution line but never turns it: every solution set is a shifted copy of the nullspace." trap="The nullspace is not 'the solutions'. It is the set of differences between solutions, and it always contains 0."
      code={`a = [${fmt(a)}; ${fmt(b)}];   % the equation is dot(a, x) = c\nc = ${fmt(c)};\np = (c / dot(a,a)) * a;     % particular solution\nn = [-a(2); a(1)];          % nullspace direction: dot(a, n) = 0\nx = p + ${fmt(t)}*n;\ndisp(dot(a, x))`} />
  </>
}

// A triangle truss: A = (0, 0) pinned, B = (L, 0) on a roller, C = (cx, h) carrying a load P downwards.
// Unknowns [F_AB, F_AC, F_BC, Ax, Ay, By]; tension is positive. Two balance equations per joint.
export function trussForces(cx, h, P, L = 4) {
  const lac = Math.hypot(cx, h), lbc = Math.hypot(cx - L, h)
  const [ax, ay] = [cx / lac, h / lac], [bx, by] = [(cx - L) / lbc, h / lbc]
  const M = [[1, ax, 0, 1, 0, 0], [0, ay, 0, 0, 1, 0], [-1, 0, bx, 0, 0, 0], [0, 0, by, 0, 0, 1], [0, -ax, -bx, 0, 0, 0], [0, -ay, -by, 0, 0, 0]]
  return { M, forces: solveLinear(M, [0, 0, 0, 0, 0, P]), dirs: { ax, ay, bx, by } }
}

export function Truss() {
  const plane = useRef(null)
  const L = 4, shift = [-2, -1.2]
  const [apex, setApex] = useState([2, 2]), [P, setP] = useState(10)
  const { forces } = trussForces(apex[0], apex[1], P, L)
  const at = ([x, y]) => toSvg([x + shift[0], y + shift[1]])
  const joints = { A: [0, 0], B: [L, 0], C: apex }
  const bars = [['AB', 'A', 'B', forces[0]], ['AC', 'A', 'C', forces[1]], ['BC', 'B', 'C', forces[2]]]
  const biggest = Math.max(...bars.map(b => Math.abs(b[3])), 1e-9)
  const kind = f => Math.abs(f) < 1e-6 ? 'no force' : f > 0 ? 'tension' : 'compression'
  const meaning = `Load ${fmt(P)} kN at C. ${bars.map(([name, , , f]) => `${name}: ${fmt(Math.abs(f))} kN ${kind(f)}`).join('; ')}. Supports push up ${fmt(forces[4])} kN at A and ${fmt(forces[5])} kN at B.`
  const [cxs, cys] = at(apex), [axs, ays] = at([0, 0]), [bxs, bys] = at([L, 0])
  return <>
    <Plane plane={plane} label={`Truss: three bars joined at A, B and C, with a load at C. ${meaning}`}>
      {bars.map(([name, p, q, f]) => { const [x1, y1] = at(joints[p]), [x2, y2] = at(joints[q]); return <g key={name}>
        <line className={`la-bar-member ${f > 1e-6 ? 'la-tension' : f < -1e-6 ? 'la-compression' : ''}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2 + 8 * Math.abs(f) / biggest} />
        <text className="la-member-label" textAnchor="middle" x={(x1 + x2) / 2 + (name === 'AB' ? 0 : name === 'AC' ? -34 : 34)} y={(y1 + y2) / 2 + (name === 'AB' ? 22 : -4)}>{name} {fmt(Math.abs(f))}</text>
      </g> })}
      <polygon className="la-support" points={`${axs},${ays} ${axs - 12},${ays + 18} ${axs + 12},${ays + 18}`} />
      <circle className="la-support" cx={bxs} cy={bys + 9} r="9" />
      <ScreenArrow x1={cxs} y1={cys - 24 - 3 * P} x2={cxs} y2={cys - 12} tone="v" width={3} />
      <text className="la-force-label" style={{ '--tone': 'var(--c-v)' }} textAnchor="middle" x={cxs} y={cys - 30 - 3 * P}>P = {fmt(P)} kN</text>
      <ScreenArrow x1={axs} y1={ays + 56 + 3 * forces[4]} x2={axs} y2={ays + 22} tone="out" width={2.5} />
      <text className="la-force-label" style={{ '--tone': 'var(--c-out)' }} textAnchor="middle" x={axs} y={ays + 72 + 3 * forces[4]}>Ay {fmt(forces[4])}</text>
      <ScreenArrow x1={bxs} y1={bys + 56 + 3 * forces[5]} x2={bxs} y2={bys + 22} tone="out" width={2.5} />
      <text className="la-force-label" style={{ '--tone': 'var(--c-out)' }} textAnchor="middle" x={bxs} y={bys + 72 + 3 * forces[5]}>By {fmt(forces[5])}</text>
      <Handle plane={plane} at={[apex[0] + shift[0], apex[1] + shift[1]]} tone="v" name="joint C" limit={[5.5, 4.2]} onMove={([x, y]) => setApex([Math.min(L - 0.3, Math.max(0.3, x - shift[0])), Math.min(4, Math.max(0.5, y - shift[1]))])} />
    </Plane>
    <div className="la-legend" aria-hidden="true"><span style={{ '--tone': 'var(--c-dir)' }}>tension (pulled)</span><span style={{ '--tone': 'var(--c-err)' }}>compression (squeezed)</span></div>
    <div className="la-controls"><Slider label="Load P (kN)" tone="v" value={P} onChange={setP} min={0} max={20} step={1} /></div>
    <Readout>{meaning}</Readout>
    <Notes try="Drag joint C straight up and watch every force shrink. Then drag it towards B: which support takes more of the load?" truth="The two support pushes always add up to P, and the forces at each joint always cancel. The solve guarantees both." trap="A flat truss is not stronger. As C drops towards the ground, the sloping bars must squeeze very hard to hold the load up."
      code={`L = ${L}; cx = ${fmt(apex[0])}; h = ${fmt(apex[1])}; P = ${fmt(P)};\nlac = sqrt(cx^2 + h^2); lbc = sqrt((cx - L)^2 + h^2);\nax = cx/lac; ay = h/lac; bx = (cx - L)/lbc; by = h/lbc;\nM = [1 ax 0 1 0 0; 0 ay 0 0 1 0; -1 0 bx 0 0 0; 0 0 by 0 0 1; 0 -ax -bx 0 0 0; 0 -ay -by 0 0 0];\nb = [0; 0; 0; 0; 0; P];\nforces = M \ b;\ndisp(forces)`} />
  </>
}
