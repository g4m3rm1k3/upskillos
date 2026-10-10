import { lazy, Suspense } from 'react'
import { useGlobalTheme } from '../../context/ThemeContext'
import { setupOpenCalcMonaco } from '../../utils/monacoThemes'
import type { MathOSState } from './hooks/useMathOSState'
import VarStrip from './components/VarStrip'
import SectionTabs from './components/SectionTabs'
import DatasetPanel from './components/DatasetPanel'
import KatexStep from './components/KatexStep'
import KatexInline from './components/KatexInline'
import CanvasGraph from './components/CanvasGraph'
import MatrixInput from './components/MatrixInput'
import {
  fmtNum, polyEvalAt, calcEval, PHYSICS_FORMULAS, MACHINIST_FORMULAS, CONNECTIONS,
  parseMatrix, hasNaN,
} from './mathEngines.js'

const MonacoEditor = lazy(() => import('@monaco-editor/react').then(m => ({ default: m.default })))

// ─── TRIANGLE SVG ─────────────────────────────────────────────────────────────
function TriangleSVG({ a, b, c, A, B, C }: { a: number; b: number; c: number; A: number; B: number; C: number }) {
  if (!a || !b || !c || !A || !B || !C) return null
  const W = 280, H = 200, pad = 36
  const Bx = 0, By = 0, Cx = c, Cy = 0
  const Ax = c * Math.cos(B), Ay = c * Math.sin(B)
  const pts: [number,number][] = [[Ax,Ay],[Bx,By],[Cx,Cy]]
  const minX = Math.min(...pts.map(p=>p[0])), maxX = Math.max(...pts.map(p=>p[0]))
  const minY = Math.min(...pts.map(p=>p[1])), maxY = Math.max(...pts.map(p=>p[1]))
  const scaleX = (W-2*pad)/(maxX-minX||1), scaleY = (H-2*pad)/(maxY-minY||1)
  const sc = Math.min(scaleX, scaleY)
  const tx = (x: number) => pad + (x-minX)*sc, ty = (y: number) => H-pad-(y-minY)*sc
  const [pA,pB,pC] = [[tx(Ax),ty(Ay)],[tx(Bx),ty(By)],[tx(Cx),ty(Cy)]]
  const mid = (p1: number[], p2: number[]) => [(p1[0]+p2[0])/2,(p1[1]+p2[1])/2]
  const fmtDeg = (v: number) => v.toFixed(1)+'°'
  const isRight = Math.abs(C*180/Math.PI - 90) < 0.1 || Math.abs(B*180/Math.PI - 90) < 0.1 || Math.abs(A*180/Math.PI - 90) < 0.1
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="rounded bg-slate-900 border border-slate-700">
      <polygon points={pA.join(',') + ' ' + pB.join(',') + ' ' + pC.join(',')} fill="#1e3a5f" stroke="#60a5fa" strokeWidth="2.5" strokeLinejoin="round" />
      {isRight && Math.abs(C*180/Math.PI-90)<0.1 && (() => {
        const s = 10
        return <polygon points={`${pC[0]},${pC[1]-s} ${pC[0]-s},${pC[1]-s} ${pC[0]-s},${pC[1]}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      })()}
      {[
        [mid(pA,pB),'c='+parseFloat(c.toFixed(4)),'#f472b6',-12,0],
        [mid(pA,pC),'b='+parseFloat(b.toFixed(4)),'#f472b6',12,0],
        [mid(pB,pC),'a='+parseFloat(a.toFixed(4)),'#34d399',0,14],
      ].map(([pos,lbl,col,dx,dy],i) => (
        <text key={i} x={(pos as number[])[0]+(dx as number)} y={(pos as number[])[1]+(dy as number)} fill={col as string} fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="600">{lbl as string}</text>
      ))}
      {[
        [pA,'A='+fmtDeg(A*180/Math.PI),'#f59e0b',0,-8],
        [pB,'B='+fmtDeg(B*180/Math.PI),'#f59e0b',-10,10],
        [pC,'C='+fmtDeg(C*180/Math.PI),'#f59e0b',10,10],
      ].map(([pos,lbl,col,dx,dy],i) => (
        <text key={i} x={(pos as number[])[0]+(dx as number)} y={(pos as number[])[1]+(dy as number)} fill={col as string} fontSize="10" textAnchor="middle" fontFamily="monospace">{lbl as string}</text>
      ))}
    </svg>
  )
}

// ─── MACHINIST SVG ────────────────────────────────────────────────────────────
function MachinistViz({ viz, vars }: { viz?: string; vars?: Record<string, string> }) {
  if (!viz) return null
  if (viz === 'rotation') return (
    <svg width="160" height="160" viewBox="0 0 160 160" className="rounded bg-slate-900 border border-slate-700">
      <defs><marker id="rot-arr" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#f59e0b" /></marker></defs>
      <circle cx="80" cy="80" r="52" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
      <circle cx="80" cy="80" r="4" fill="#60a5fa" />
      <line x1="80" y1="80" x2="132" y2="80" stroke="#60a5fa" strokeWidth="1.5" />
      <text x="101" y="74" fill="#93c5fd" fontSize="12" fontFamily="monospace">r</text>
      <path d="M 115 42 A 52 52 0 0 1 132 80" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#rot-arr)" />
      <text x="28" y="22" fill="#f59e0b" fontSize="9" fontFamily="monospace">SFM = πDN/12</text>
    </svg>
  )
  if (viz === 'boltcircle') {
    const n = Math.max(1, Math.min(24, parseInt(vars?.n ?? '') || 6))
    const cx = 80, cy = 80, r = 52
    const holes = Array.from({length:n},(_,k)=>({ x: cx+r*Math.cos(2*Math.PI*k/n-Math.PI/2), y: cy+r*Math.sin(2*Math.PI*k/n-Math.PI/2) }))
    return (
      <svg width="160" height="160" viewBox="0 0 160 160" className="rounded bg-slate-900 border border-slate-700">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="5 3" />
        <circle cx={cx} cy={cy} r="4" fill="#60a5fa" opacity="0.5" />
        {holes.map((h,i)=><circle key={i} cx={h.x} cy={h.y} r="6" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5" />)}
        <text x={cx} y="150" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">{n} holes on BCR</text>
      </svg>
    )
  }
  if (viz === 'taper') return (
    <svg width="200" height="120" viewBox="0 0 200 120" className="rounded bg-slate-900 border border-slate-700">
      <polygon points="25,25 25,95 180,78 180,42" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="2" />
      <text x="50" y="18" fill="#94a3b8" fontSize="9" fontFamily="monospace">TPF = (D₁−D₂)/L × 12</text>
    </svg>
  )
  if (viz === 'thread') return (
    <svg width="200" height="120" viewBox="0 0 200 120" className="rounded bg-slate-900 border border-slate-700">
      {[0,1,2,3,4].map(i=><polygon key={i} points={`${18+i*36},18 ${36+i*36},68 ${54+i*36},18`} fill="none" stroke="#60a5fa" strokeWidth="2" />)}
      <text x="105" y="112" fill="#94a3b8" fontSize="9" fontFamily="monospace">60° thread form</text>
    </svg>
  )
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" className="rounded bg-slate-900 border border-slate-700">
      <text x="80" y="65" textAnchor="middle" fill="#475569" fontSize="12" fontFamily="monospace">{viz}</text>
    </svg>
  )
}

// ─── CENTER CONTENT ───────────────────────────────────────────────────────────
export default function MathOSCenter({ s }: { s: MathOSState }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { themeStyles } = useGlobalTheme() as any
  const ui: Record<string, string> = themeStyles.ui
  const explainText = s.getExplain(s.explainLevel)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connData = s.result?.connKey ? (CONNECTIONS as any)[s.result.connKey] : null
  type Op = { id: string; label: string; needsB?: boolean; needsAug?: boolean; squareOnly?: boolean; vectorMode?: boolean }
  const currentOp: Partial<Op> = s.OPERATIONS.find((o: Op) => o.id === s.matOp) ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">

      <VarStrip
        vars={s.vars}
        matVars={s.matVars}
        onVarClick={name => s.setInput(name)}
        onMatVarClick={mat => { s.setSection('matrix'); s.setMatA(mat.map((r: string[]) => r.map(String))) }}
        onClear={() => { s.setVars({}); s.setFormulas({}); s.setMatVars({}) }}
        ui={ui}
      />

      <SectionTabs section={s.section} onSelect={s.setSection} ui={ui} />

      <div className="flex-1 overflow-y-auto">

        {/* ══ COMPUTE ══ */}
        {s.section === 'compute' && (
          <div className="p-5">
            <label htmlFor="mathos-expression" className={`block text-sm font-semibold mb-2 ${ui.txt1}`}>What would you like to calculate?</label>
            <p className={`text-xs mb-3 ${ui.txt2}`}>Enter an expression or choose an example. Use Enter to calculate and the arrow keys to revisit your history.</p>
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                id="mathos-expression"
                ref={s.inputRef}
                value={s.input}
                onChange={e => s.setInput(e.target.value)}
                onKeyDown={s.onKeyDown}
                placeholder='Type any STEM problem: "integrate x^2 from 0 to 1", "derivative of x^3 at x=2", "2^10", "STO→ A 42"...'
                className={`flex-1 min-w-0 basis-64 ${ui.bg2} border ${ui.border} rounded-xl px-4 py-3 text-[15px] font-mono ${ui.txt1} placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 focus:outline-none transition-all shadow-inner`}
              />
              <button onClick={s.compute} className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl font-bold text-sm shrink-0 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">Compute</button>
            </div>
            <details className="mb-4">
              <summary className={`cursor-pointer text-xs font-semibold mb-2 ${ui.txt2}`}>Try an example</summary>
            <div className="flex flex-wrap gap-1">
              {[
                '2^10','sin(pi/4)','sqrt(2)','x = 42','ans * 2',
                'integrate x^2 from 0 to 1','derivative of sin(x) at x=0',
                'table(x^2, -5, 5, 0.5)','solve 2x+3=11','plot sin(x)',
              ].map(ex => (
                <button key={ex} onClick={() => s.setInput(ex)}
                  className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-slate-200/40 dark:border-white/5 hover:border-brand-500/30 text-slate-400 hover:text-brand-300 font-mono transition-colors">
                  {ex}
                </button>
              ))}
            </div>
            </details>

            {s.result && (
              <>
                <div role="status" aria-label="Calculation result" className="flex flex-wrap items-center gap-4 bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl px-5 py-3 mb-4 shadow-inner">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Answer</span>
                  <span className="text-2xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 flex-1 min-w-0 break-all">{s.result.numerical}</span>
                  <button onClick={() => navigator.clipboard?.writeText(s.result!.numerical)} className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-white/5">copy</button>
                  <button onClick={() => { const name = prompt('Store as variable:'); if (name) s.setVars({...s.vars,[name]:parseFloat(s.result!.numerical)||s.result!.numerical}) }} className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 hover:text-brand-300 transition-colors px-2 py-1 rounded hover:bg-white/5">STO→</button>
                </div>
                <div className="flex flex-wrap gap-2 border-b border-slate-200/40 dark:border-white/5 mb-4 pb-1">
                  {[['symbolic','∑ Steps'],['visual','◉ Visual'],['code','</> Code'],['explain','💡 Explain'],['connections','🔗 Connects']].map(([id,label]) => (
                    <button key={id} onClick={() => s.setTab(id as typeof s.tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${s.tab===id?'bg-brand-500/10 text-brand-400 border border-brand-500/20':'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {s.tab === 'symbolic' && <div className="space-y-1">{s.result.steps?.map((st,i)=><KatexStep key={i} label={st.label} latex={st.latex} />)}</div>}
                {s.tab === 'visual' && (() => { const r = s.result as any; return (
                  <div>
                    {r.type === 'integral' && <CanvasGraph fns={[x => polyEvalAt(r.expr, x)]} xMin={r.a-2} xMax={r.b+2} yMin={-5} yMax={10} />}
                    {r.type === 'derivative' && <CanvasGraph fns={[x => polyEvalAt(r.expr, x), x => parseFloat(r.numerical)*(x-r.xv)+polyEvalAt(r.expr, r.xv)]} xMin={r.xv-5} xMax={r.xv+5} yMin={-10} yMax={10} />}
                    {r.type === 'calc' && <CanvasGraph fns={[x => { try { return Number(calcEval(r.expr, {x, pi:Math.PI, e:Math.E})) } catch { return NaN } }]} xMin={-10} xMax={10} yMin={-15} yMax={15} />}
                    {r.type === 'table' && (
                      <div className="overflow-x-auto"><table className="text-xs font-mono w-full border-collapse">
                        <thead><tr className="border-b border-slate-700"><th className="text-left px-3 py-1.5 text-slate-400">x</th><th className="text-right px-3 py-1.5 text-brand-400">f(x)</th></tr></thead>
                        <tbody>{r.tableRows?.map(([x,y]: [number,number],i: number)=><tr key={i} className={`border-b border-slate-800/60 ${i%2===0?'bg-brand-500/5 dark:bg-slate-900/30':''}`}><td className="px-3 py-1 text-slate-400">{fmtNum(x,6)}</td><td className="px-3 py-1 text-right text-green-400">{isFinite(y) ? fmtNum(y,6) : '—'}</td></tr>)}</tbody>
                      </table></div>
                    )}
                    {!['integral','derivative','calc','table'].includes(r.type) && <div className="text-slate-500 text-sm p-4 text-center">Switch to Graph section for interactive plotting.</div>}
                  </div>
                ) })()}
                {s.tab === 'code' && s.result.code && (
                  <div className="space-y-3 font-mono text-xs">
                    {([['JavaScript','js','bg-yellow-950 border-yellow-800 text-yellow-100'],['Python / NumPy','py','bg-blue-950 border-blue-800 text-blue-100'],['Matplotlib','mpl','bg-green-950 border-green-800 text-green-100'],['PyTorch','pt','bg-purple-950 border-purple-800 text-purple-100'],['MATLAB','ml','bg-orange-950 border-orange-800 text-orange-100']] as const).map(([lang,key,cls]) => {
                      const code = (s.result!.code as any)?.[key]
                      return code ? <div key={key}><div className="text-slate-400 mb-1 font-sans text-xs">{lang}</div><pre className={`${cls} border rounded-lg p-3 whitespace-pre-wrap overflow-x-auto leading-relaxed`}>{code}</pre></div> : null
                    })}
                  </div>
                )}
                {s.tab === 'explain' && (
                  <div>
                    <div className="flex gap-2 mb-3">{[['eli5','ELI5'],['student','Student'],['college','College'],['advanced','Advanced']].map(([id,label])=><button key={id} onClick={()=>s.setExplainLevel(id as typeof s.explainLevel)} className={`px-3 py-1 text-xs rounded ${s.explainLevel===id?'bg-brand-600 text-white':'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{label}</button>)}</div>
                    {explainText ? <div className="bg-brand-500/5 dark:bg-slate-800 rounded-lg p-4 text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{explainText}</div> : <div className="text-slate-500 text-sm p-4">No explanation available for this result type.</div>}
                  </div>
                )}
                {s.tab === 'connections' && <div>{connData ? <div><div className="text-xs text-slate-400 mb-2">This concept connects to:</div><div className="flex flex-wrap gap-2">{connData.map((c: string)=><span key={c} className="px-3 py-1 rounded-full bg-slate-700 text-slate-200 text-xs border border-slate-600">{c}</span>)}</div></div> : <div className="text-slate-500 text-sm p-4">No connections mapped for this result.</div>}</div>}
              </>
            )}
          </div>
        )}

        {/* ══ MATRIX ══ */}
        {s.section === 'matrix' && (
          <div className="p-5">
            <div className="mb-5 bg-brand-500/5 dark:bg-black/20 border border-sky-500/20 rounded-xl p-3 shadow-inner">
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-2">Matrix Expression <span className="font-normal text-slate-500 normal-case tracking-normal">uses stored vars — e.g. inv(M)*A*M</span></div>
              <div className="flex gap-2">
                <input value={s.matExpr} onChange={e=>s.setMatExpr(e.target.value)} onKeyDown={e=>e.key==='Enter'&&s.computeMatExpr()} placeholder="inv(M)*A*M  or  A^2  or  trace(A*B)"
                  className="flex-1 text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-2 px-3 text-slate-800 dark:text-slate-100 font-mono focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 focus:outline-none transition-all" />
                <button onClick={s.computeMatExpr} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold transition-all active:scale-95 shadow">Eval</button>
              </div>
              {s.matExprResult && (
                <div className="mt-2 text-sm font-mono">
                  <span className="text-slate-400 text-[11px]">{(s.matExprResult as unknown as Record<string,unknown>).expr as string} =</span>
                  {(s.matExprResult as unknown as Record<string,unknown>).error ? <span className="text-red-400 ml-2">{(s.matExprResult as unknown as Record<string,unknown>).error as string}</span>
                    : (s.matExprResult as unknown as Record<string,unknown>).mat ? <div className="text-emerald-400 mt-1">{((s.matExprResult as unknown as Record<string,unknown>).mat as number[][]).map((r,i)=><div key={i}>[{r.map(x=>(+x.toFixed(4)).toString().padStart(10)).join('  ')}]</div>)}<span className="text-[10px] text-slate-500 mt-1 block">↑ loaded into A</span></div>
                    : <span className="text-emerald-400 ml-2">{(s.matExprResult as unknown as Record<string,unknown>).scalar as string}</span>}
                </div>
              )}
              {Object.keys(s.matVars).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-200/40 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 self-center">Stored:</span>
                  {Object.entries(s.matVars).map(([name, mat]) => (
                    <div key={name} className="flex items-center gap-0.5">
                      <button onClick={()=>s.setMatA((mat as string[][]).map(r=>r.map(String)))} className="text-[11px] font-mono px-2 py-0.5 rounded-l bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/20 transition-colors">
                        {name} <span className="text-slate-500">[{(mat as string[][]).length}×{(mat as string[][])[0]?.length}]</span>
                      </button>
                      {currentOp.needsB && <button onClick={()=>s.setMatB((mat as string[][]).map(r=>r.map(String)))} className="text-[10px] font-mono px-1.5 py-0.5 rounded-r bg-white/5 hover:bg-white/15 text-slate-400 border border-slate-200/60 dark:border-white/10 border-l-0 transition-colors">→B</button>}
                      <button onClick={()=>{ const v={...s.matVars}; delete v[name]; s.setMatVars(v) }} className="text-[10px] px-1 py-0.5 rounded bg-transparent hover:text-red-400 text-slate-600 transition-colors ml-0.5">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-5 p-2 bg-brand-500/5 dark:bg-black/10 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
              {s.OPERATIONS.map((op: { id: string; label: string }) => (
                <button key={op.id} onClick={()=>s.setMatOp(op.id)} className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${s.matOp===op.id?'bg-brand-500 text-white shadow-md shadow-brand-500/20':'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-transparent hover:border-white/10'}`}>{op.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[11px] font-bold text-brand-300 font-mono bg-brand-500/10 px-1.5 py-0.5 rounded">Matrix A</span>
              <button onClick={()=>{ const name=prompt('Store A as:')?.trim(); if(name) s.setMatVars({...s.matVars,[name]:parseMatrix(s.matA)}) }} className="text-[11px] text-slate-400 hover:text-sky-300 font-semibold transition-colors px-2 py-0.5 rounded hover:bg-sky-500/10">+ Store A</button>
            </div>
            <MatrixInput matrix={s.matA} onChange={s.setMatA} label="A" />
            {currentOp.needsB && <>
              <div className="flex items-center gap-3 mb-1 mt-2"><span className="text-[11px] font-bold text-brand-300 font-mono bg-brand-500/10 px-1.5 py-0.5 rounded">Matrix B</span><button onClick={()=>{ const name=prompt('Store B as:')?.trim(); if(name) s.setMatVars({...s.matVars,[name]:parseMatrix(s.matB)}) }} className="text-[11px] text-slate-400 hover:text-sky-300 font-semibold transition-colors px-2 py-0.5 rounded hover:bg-sky-500/10">+ Store B</button></div>
              <MatrixInput matrix={s.matB} onChange={s.setMatB} label="B" />
            </>}
            {currentOp.needsAug && <div className="mb-4"><div className="text-[11px] font-bold text-brand-300 font-mono bg-brand-500/10 px-1.5 py-0.5 rounded inline-block mb-2">Vector b</div><MatrixInput matrix={s.matAugB} onChange={s.setMatAugB} label="b" /></div>}
            {(s.matOp === 'power' || s.matOp === 'scalar') && (
              <div className="mb-4 flex items-center gap-3 bg-brand-500/5 dark:bg-black/20 p-3 rounded-xl border border-slate-200/40 dark:border-white/5 w-max shadow-inner">
                <label className="text-[11px] font-bold text-brand-300 font-mono uppercase tracking-wider">{s.matOp === 'power' ? 'n (power)' : 'scalar c'}</label>
                <input type="number" value={s.matN} onChange={e=>s.setMatN(parseFloat(e.target.value))} className="w-20 text-center text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-1.5 text-slate-800 dark:text-slate-100 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/50 focus:bg-white/10 focus:outline-none transition-all shadow-inner" />
              </div>
            )}
            <button onClick={s.computeMatrix} className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl font-bold text-sm mb-5 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">Compute Matrix</button>
            {s.result?.type === 'matrix' && (
              <>
                <div className="flex gap-2 border-b border-slate-200/40 dark:border-white/5 mb-4 pb-1">{[['symbolic','∑ Steps'],['visual','◉ Visual'],['code','</> Code'],['explain','💡 Explain'],['connections','🔗 Connects']].map(([id,label])=><button key={id} onClick={()=>s.setTab(id as typeof s.tab)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${s.tab===id?'bg-brand-500/10 text-brand-400 border border-brand-500/20':'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}>{label}</button>)}</div>
                {s.tab === 'symbolic' && <div className="space-y-1">{s.result.steps?.map((st,i)=><KatexStep key={i} label={st.label} latex={st.latex} />)}</div>}
                {s.tab === 'visual' && (() => {
                  if (s.matOp === 'transform2d' || s.matOp === 'eigen') {
                    const A = parseMatrix(s.matA)
                    if (A.length !== 2 || A[0].length !== 2 || hasNaN(A)) return <div className="text-slate-500 text-sm">Need 2×2 matrix for 2D visualization.</div>
                    const W = 300, H = 300, cx = W/2, cy = H/2, sc = 50
                    const pts = [[1,0],[0,1],[-1,0],[0,-1]]
                    const tPts = pts.map(([x,y]) => [A[0][0]*x+A[0][1]*y, A[1][0]*x+A[1][1]*y])
                    return <svg width={W} height={H} className="rounded bg-slate-800 border border-slate-700">
                      <line x1={0} y1={cy} x2={W} y2={cy} stroke="#334155" strokeWidth={1} />
                      <line x1={cx} y1={0} x2={cx} y2={H} stroke="#334155" strokeWidth={1} />
                      {pts.map(([x,y],i)=><line key={`o${i}`} x1={cx} y1={cy} x2={cx+x*sc} y2={cy-y*sc} stroke="#475569" strokeWidth={1} strokeDasharray="4"/>)}
                      {tPts.map(([x,y],i)=><line key={`t${i}`} x1={cx} y1={cy} x2={cx+x*sc} y2={cy-y*sc} stroke={['#60a5fa','#34d399','#f472b6','#fb923c'][i]} strokeWidth={2}/>)}
                    </svg>
                  }
                  return <div className="text-slate-500 text-sm p-4 text-center">Visual available for 2D Transform. For other ops, see symbolic steps above.</div>
                })()}
                {s.tab === 'code' && s.result.code && <div className="space-y-3 font-mono text-xs">{[['JavaScript','js'],['Python','py'],['MATLAB','ml']].map(([lang,key])=><div key={key}><div className="text-slate-400 mb-1 font-sans">{lang}</div><pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 whitespace-pre-wrap text-slate-200 overflow-x-auto">{(s.result!.code as any)?.[key]||'// Not available'}</pre></div>)}</div>}
                {s.tab === 'explain' && (<div><div className="flex gap-2 mb-3">{[['eli5','ELI5'],['student','Student'],['college','College'],['advanced','Advanced']].map(([id,label])=><button key={id} onClick={()=>s.setExplainLevel(id as typeof s.explainLevel)} className={`px-3 py-1 text-xs rounded ${s.explainLevel===id?'bg-brand-600 text-white':'bg-slate-700 text-slate-300'}`}>{label}</button>)}</div>{explainText?<div className="bg-brand-500/5 dark:bg-slate-800 rounded-lg p-4 text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{explainText}</div>:<div className="text-slate-500 text-sm p-4">No explanation available.</div>}</div>)}
                {s.tab === 'connections' && s.result.connKey && (CONNECTIONS as any)[s.result.connKey] && <div className="flex flex-wrap gap-2 pt-2">{(CONNECTIONS as any)[s.result.connKey].map((c: string)=><span key={c} className="px-3 py-1 rounded-full bg-slate-700 text-slate-200 text-xs border border-slate-600">{c}</span>)}</div>}
              </>
            )}
          </div>
        )}

        {/* ══ SIGMA ══ */}
        {s.section === 'sigma' && (
          <div className="p-5">
            <div className="flex items-center gap-4 flex-wrap mb-5">
              <div className="flex items-center gap-3 bg-brand-500/5 dark:bg-black/20 p-4 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
                <span className="text-brand-400 text-2xl font-black">Σ</span>
                <div><div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">i from</div><input value={s.sigLo} onChange={e=>s.setSigLo(e.target.value)} className="w-16 text-center text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-1.5 text-slate-800 dark:text-slate-100 font-mono focus:border-brand-400 focus:ring-1 focus:ring-brand-400/50 focus:outline-none transition-all shadow-inner" /></div>
                <div><div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">to (n or num)</div><input value={s.sigHi} onChange={e=>s.setSigHi(e.target.value)} className="w-20 text-center text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-1.5 text-slate-800 dark:text-slate-100 font-mono focus:border-brand-400 focus:ring-1 focus:ring-brand-400/50 focus:outline-none transition-all shadow-inner" /></div>
                <div><div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">f(i) =</div><input value={s.sigExpr} onChange={e=>s.setSigExpr(e.target.value)} className="w-32 px-3 text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-1.5 text-slate-800 dark:text-slate-100 font-mono focus:border-brand-400 focus:ring-1 focus:ring-brand-400/50 focus:outline-none transition-all shadow-inner" /></div>
                {s.sigHi === 'n' && <div><div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">n =</div><input type="number" value={s.sigN} onChange={e=>s.setSigN(parseInt(e.target.value)||10)} className="w-16 text-center text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-1.5 text-slate-800 dark:text-slate-100 font-mono focus:border-brand-400 focus:ring-1 focus:ring-brand-400/50 focus:outline-none transition-all shadow-inner" /></div>}
              </div>
              <button onClick={s.computeSigma} className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">Compute</button>
            </div>
            <div className="flex gap-2 flex-wrap mb-5">{[['1','n','1'],['i','n','i'],['i^2','n','i^2'],['i^3','n','i^3'],['2^i','10','2^i'],['1/i','20','1/i']].map(([e,h,l])=><button key={l} onClick={()=>{s.setSigExpr(e);s.setSigHi(h);s.setSigLo('1')}} className="text-[11px] px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 font-mono font-medium transition-colors border border-transparent hover:border-white/10">{l}</button>)}</div>
            {s.result?.type === 'sigma' && (
              <>
                <div className="bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl px-5 py-4 mb-4 font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 text-2xl shadow-inner">Σ = {s.result.numerical}</div>
                <div className="space-y-1 mb-5">{s.result.steps?.map((st,i)=><KatexStep key={i} label={st.label} latex={st.latex} />)}</div>
                {(s.result as unknown as { terms?: number[] }).terms?.length! > 0 && (
                  <div className="mb-5 bg-brand-500/5 dark:bg-black/20 p-4 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Bar chart of terms</div>
                    <svg width="100%" viewBox={`0 0 ${Math.min((s.result as unknown as { terms: number[] }).terms.length*28+40,840)} 120`} className="rounded-lg">
                      {(() => { const terms = (s.result as unknown as { terms: number[] }).terms; const max=Math.max(...terms.map(Math.abs),1); return terms.slice(0,30).map((v,i)=>{ const barH=Math.abs(v)/max*80; const x=20+i*28; const y=v>=0?90-barH:90; return <g key={i}><rect x={x} y={y} width={20} height={barH} fill={v>=0?'#4ade80':'#f87171'} rx={2}/><text x={x+10} y={108} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight="600">{i+parseInt(s.sigLo)}</text></g> }) })()}
                      <line x1={20} x2={840} y1={90} y2={90} stroke="#475569" strokeWidth={1}/>
                    </svg>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ POLY ══ */}
        {s.section === 'poly' && (
          <div className="p-5">
            <div className="flex flex-wrap gap-3 mb-4">
              <input value={s.polyExpr} onChange={e=>s.setPolyExpr(e.target.value)} placeholder="e.g. x^2 - 5*x + 6, x^3 - 6x^2 + 11x - 6" className={`flex-1 min-w-0 basis-64 ${ui.bg2} border ${ui.border} rounded-xl px-4 py-3 text-[15px] font-mono ${ui.txt1} placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 focus:outline-none transition-all shadow-inner`} />
              <button onClick={s.computePoly} className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl font-bold text-sm shrink-0 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">Solve</button>
            </div>
            <div className="flex gap-2 flex-wrap mb-5">{['x^2 - 4','x^2 - 5*x + 6','x^3 - 6*x^2 + 11*x - 6','x^2 + 1','2*x^2 - 4*x - 6','x^3 - 2*x^2 - x + 2'].map(p=><button key={p} onClick={()=>s.setPolyExpr(p)} className="text-[11px] px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 font-mono font-medium transition-colors border border-transparent hover:border-white/10">{p}</button>)}</div>
            {s.result?.type === 'poly' && (
              <>
                <div className="bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl px-5 py-4 mb-4 font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 shadow-inner">Roots: {s.result.numerical}&nbsp;&nbsp;{(s.result as unknown as {degree?:number}).degree!=null&&<span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 ml-3">degree {(s.result as unknown as {degree:number}).degree}</span>}</div>
                <div className="space-y-1 mb-5">{s.result.steps?.map((st,i)=><KatexStep key={i} label={st.label} latex={st.latex} />)}</div>
                <div className="mb-5 bg-brand-500/5 dark:bg-black/20 p-4 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Graph — hover to trace</div>
                  <CanvasGraph fns={[x=>polyEvalAt(s.result!.expr,x)]} xMin={-8} xMax={8} yMin={-20} yMax={20} highlightRoots={(s.result as unknown as {roots?:number[]}).roots||[]} width={860} height={280} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ STATS ══ */}
        {s.section === 'data' && <DatasetPanel s={s} />}
        {s.section === 'stats' && (
          <div className="p-5">
            <div className="flex flex-wrap gap-3 mb-4">
              <input value={s.statsData} onChange={e=>s.setStatsData(e.target.value)} placeholder="Enter numbers separated by commas: 1, 2, 3, 4, 5" className={`flex-1 min-w-0 basis-64 ${ui.bg2} border ${ui.border} rounded-xl px-4 py-3 text-[15px] font-mono ${ui.txt1} placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 focus:outline-none transition-all shadow-inner`} />
              <button onClick={s.computeStats} className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl font-bold text-sm shrink-0 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">Analyze</button>
            </div>
            {s.result?.type === 'stats' && (
              <>
                <div className="space-y-1 mb-5">{s.result.steps?.map((st,i)=><KatexStep key={i} label={st.label} latex={st.latex} />)}</div>
                <div className="bg-brand-500/5 dark:bg-black/20 p-4 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
                  {(() => { const data=(s.result as unknown as {data:number[]}).data; const max=Math.max(...data.map(Math.abs),1); const mean=data.reduce((a:number,x:number)=>a+x,0)/data.length; return <svg width="100%" viewBox={`0 0 ${data.length*40+60} 140`}>{data.map((v:number,i:number)=>{ const barH=Math.abs(v)/max*100; const x=30+i*40; const y=v>=0?110-barH:110; return <g key={i}><rect x={x} y={y} width={30} height={barH} fill="#818cf8" rx={4} opacity={0.9}/><text x={x+15} y={128} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight="600">{fmtNum(v)}</text></g> })}<line x1={30} x2={data.length*40+30} y1={110} y2={110} stroke="#475569" strokeWidth={1}/>{isFinite(mean)&&<line x1={30} x2={data.length*40+30} y1={110-mean/max*100} y2={110-mean/max*100} stroke="#f472b6" strokeWidth={1.5} strokeDasharray="4"/>}</svg> })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ PHYSICS ══ */}
        {s.section === 'physics' && (
          <div className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Select a formula</div>
            <div className="flex flex-wrap gap-1.5 mb-5 p-2 bg-brand-500/5 dark:bg-black/10 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
              {PHYSICS_FORMULAS.map((f: { name: string; vars: string[] }, i: number) => (
                <button key={i} onClick={()=>{ s.setPhysFormula(f); s.setPhysVarsLocal(Object.fromEntries((f.vars||[]).map((v: string)=>[v,'']))) }}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${s.physFormula?.name===f.name?'bg-brand-500 text-white shadow-md shadow-brand-500/20':'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-transparent hover:border-white/10'}`}>
                  {f.name}
                </button>
              ))}
            </div>
            {s.physFormula && (
              <div>
                <div className="bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl p-5 mb-5 shadow-inner">
                  <KatexStep label={s.physFormula.desc} latex={s.physFormula.latex} />
                </div>
                <div className="flex flex-wrap gap-4 mb-5 p-4 bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl shadow-inner">
                  {(s.physFormula.vars || []).map((v: string) => (
                    <div key={v} className="flex items-center gap-3">
                      <div className="text-xs font-bold text-brand-300 font-mono uppercase">{v} =</div>
                      <input value={s.physVarsLocal[v]||''} onChange={e=>s.setPhysVarsLocal((p: Record<string,string>)=>({...p,[v]:e.target.value}))} className="w-24 text-center text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-1.5 text-slate-800 dark:text-slate-100 font-mono focus:border-brand-400 focus:ring-1 focus:ring-brand-400/50 focus:outline-none transition-all shadow-inner" />
                    </div>
                  ))}
                </div>
                <button onClick={s.computePhysics} className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">Solve</button>
                {s.result?.type === 'physics' && <div className="mt-5"><div className="bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl px-5 py-4 mb-4 font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 text-2xl shadow-inner">{s.result.numerical}</div><div className="space-y-1">{s.result.steps?.map((st,i)=><KatexStep key={i} label={st.label} latex={st.latex} />)}</div></div>}
              </div>
            )}
          </div>
        )}

        {/* ══ MACHINIST ══ */}
        {s.section === 'machinist' && (
          <div className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Select formula</div>
            <div className="flex flex-wrap gap-1.5 mb-5 p-2 bg-brand-500/5 dark:bg-black/10 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
              {MACHINIST_FORMULAS.map((f: { name: string; vars: string[] }, i: number) => (
                <button key={i} onClick={()=>{ s.setMachFormula(f); s.setMachVarsLocal(Object.fromEntries((f.vars||[]).map((v: string)=>[v,'']))); s.setMachResult(null) }}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${s.machFormula?.name===f.name?'bg-orange-500 text-white shadow-md shadow-orange-500/20':'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-transparent hover:border-white/10'}`}>
                  {f.name}
                </button>
              ))}
            </div>
            {s.machFormula && (
              <div className="flex gap-5 flex-wrap lg:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl p-5 mb-5 shadow-inner">
                    <div className="text-sm font-bold text-orange-400 mb-2 uppercase tracking-wide">{s.machFormula.fullName}</div>
                    <div className="text-xs text-slate-400 mb-4">{s.machFormula.desc}</div>
                    <KatexStep label="" latex={s.machFormula.latex} />
                    {s.machFormula.units && <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-white/5 flex flex-wrap gap-x-5 gap-y-1">{Object.entries(s.machFormula.units).map(([k,u])=><div key={k} className="text-xs text-slate-500 font-mono"><span className="text-orange-200/50">{k}</span>: {u as string}</div>)}</div>}
                  </div>
                  <div className="flex flex-wrap gap-4 mb-5 p-4 bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl shadow-inner">
                    {(s.machFormula.vars || []).map((v: string) => (
                      <div key={v} className="flex flex-col gap-1">
                        <div className="text-[11px] font-bold text-orange-300 font-mono uppercase pl-1">{v}</div>
                        <input value={s.machVarsLocal[v]||''} onChange={e=>s.setMachVarsLocal((p: Record<string,string>)=>({...p,[v]:e.target.value}))} placeholder="0" className="w-24 text-center text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-2 text-slate-800 dark:text-slate-100 font-mono focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 focus:outline-none transition-all shadow-inner" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mb-5">
                    <button onClick={s.computeMachinist} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl font-bold text-sm shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 transition-all active:scale-95">Solve</button>
                    <span className="text-xs text-slate-500 flex items-center gap-2">→ <span className="text-orange-400 font-mono font-bold bg-orange-500/10 px-2 py-1 rounded">{s.machFormula.solves}</span></span>
                  </div>
                  {s.machResult && (
                    <div className="mb-5">
                      <div className="bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 rounded-xl px-5 py-4 mb-4 font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 text-2xl shadow-inner">{(s.machResult as unknown as {numerical:string}).numerical}</div>
                      {(s.machResult as unknown as {coords?:{k:number;x:number;y:number}[]}).coords && (
                        <div className="overflow-x-auto mb-4 bg-brand-500/5 dark:bg-black/20 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
                          <table className="text-xs font-mono w-full border-collapse">
                            <thead><tr className="border-b border-white/10 bg-white/5"><th className="text-left px-4 py-2 text-slate-400">Hole</th><th className="text-right px-4 py-2 text-slate-400">X</th><th className="text-right px-4 py-2 text-slate-400">Y</th></tr></thead>
                            <tbody>{(s.machResult as unknown as {coords:{k:number;x:number;y:number}[]}).coords.map(({k,x,y})=><tr key={k} className="border-b border-slate-200/40 dark:border-white/5 hover:bg-white/5"><td className="px-4 py-2 text-slate-500 font-bold">{k+1}</td><td className="px-4 py-2 text-right text-slate-300">{fmtNum(x,5)}</td><td className="px-4 py-2 text-right text-slate-300">{fmtNum(y,5)}</td></tr>)}</tbody>
                          </table>
                        </div>
                      )}
                      <div className="space-y-1">{s.machResult.steps?.map((st,i)=><KatexStep key={i} label={st.label} latex={st.latex} />)}</div>
                    </div>
                  )}
                  {s.machFormula.explain && (
                    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10">
                      <div className="flex gap-2 mb-3">{['eli5','student','college','advanced'].map(l=><button key={l} onClick={()=>s.setExplainLevel(l as typeof s.explainLevel)} className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md transition-colors ${s.explainLevel===l?'bg-orange-500/20 text-orange-400 border border-orange-500/30':'bg-brand-500/5 dark:bg-black/20 text-slate-400 hover:bg-white/10 border border-transparent'}`}>{l}</button>)}</div>
                      <div className="text-sm text-slate-300 leading-relaxed">{s.machFormula.explain[s.explainLevel]}</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-4 shrink-0 bg-brand-500/5 dark:bg-black/20 p-5 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner h-max">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Diagram</div>
                  <div className="bg-brand-500/5 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/40 dark:border-white/5">
                    <MachinistViz viz={s.machFormula.viz} vars={s.machVarsLocal} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TRIANGLE ══ */}
        {s.section === 'triangle' && (
          <div className="p-5">
            <div className="text-[11px] font-semibold text-slate-400 mb-4 uppercase tracking-wider">Enter any 3 known values. Angles in {s.angleMode}. Leave unknowns blank.</div>
            <div className="flex flex-wrap gap-2 mb-6">
              {[['Right: a=3 b=4','a','3','b','4','C','90'],['SAS: a=7 b=10 C=45°','a','7','b','10','C','45'],['ASA: A=35° B=65° c=20','A','35','B','65','c','20'],['SSS: a=5 b=7 c=8','a','5','b','7','c','8'],['AAS: A=40° B=60° a=14','A','40','B','60','a','14']].map(([label,...args]) => (
                <button key={label as string} onClick={()=>{ const sv={a:'',b:'',c:''} as Record<string,string>, an={A:'',B:'',C:''} as Record<string,string>; for(let i=0;i<args.length;i+=2){'abc'.includes(args[i] as string)?sv[args[i] as string]=args[i+1] as string:an[args[i] as string]=args[i+1] as string}; s.setTriSides(sv as typeof s.triSides); s.setTriAngles(an as typeof s.triAngles); s.setTriResult(null) }} className="text-[11px] px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 font-mono font-medium transition-colors border border-transparent hover:border-white/10">{label as string}</button>
              ))}
            </div>
            <div className="flex gap-8 flex-wrap lg:flex-nowrap">
              <div className="flex-1 bg-brand-500/5 dark:bg-black/20 p-5 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner min-w-[300px]">
                <div className="flex gap-8 mb-6">
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Sides</div>
                    <div className="flex flex-col gap-3">{['a','b','c'].map(k=><div key={k} className="flex items-center gap-3"><span className="text-sm font-bold font-mono text-emerald-400 w-4">{k}</span><span className="text-slate-600">=</span><input value={(s.triSides as Record<string,string>)[k]} onChange={e=>s.setTriSides((p: typeof s.triSides)=>({...p,[k]:e.target.value}))} placeholder="?" className="w-24 text-center text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-1.5 text-slate-800 dark:text-slate-100 font-mono focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 focus:outline-none transition-all shadow-inner" /></div>)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Angles ({s.angleMode})</div>
                    <div className="flex flex-col gap-3">{['A','B','C'].map(k=><div key={k} className="flex items-center gap-3"><span className="text-sm font-bold font-mono text-amber-400 w-4">{k}</span><span className="text-slate-600">=</span><input value={(s.triAngles as Record<string,string>)[k]} onChange={e=>s.setTriAngles((p: typeof s.triAngles)=>({...p,[k]:e.target.value}))} placeholder="?" className="w-24 text-center text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-1.5 text-slate-800 dark:text-slate-100 font-mono focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 focus:outline-none transition-all shadow-inner" /></div>)}</div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-200/40 dark:border-white/5">
                  <button onClick={s.computeTriangle} className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">Solve</button>
                  <button onClick={()=>{ s.setTriSides({a:'',b:'',c:''}); s.setTriAngles({A:'',B:'',C:''}); s.setTriResult(null) }} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-semibold text-sm transition-colors">Clear</button>
                </div>
              </div>
              {s.triResult && !(s.triResult as unknown as {error?:string}).error && (
                <div className="flex flex-col items-center bg-brand-500/5 dark:bg-black/20 p-5 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
                  <div className="bg-brand-500/5 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/40 dark:border-white/5 mb-4">
                    {(() => { const r=s.triResult as unknown as {a:number;b:number;c:number;A:number;B:number;C:number}; return <TriangleSVG a={r.a} b={r.b} c={r.c} A={r.A*Math.PI/180} B={r.B*Math.PI/180} C={r.C*Math.PI/180} /> })()}
                  </div>
                  {(() => { const r=s.triResult as unknown as {a:number;b:number;c:number;area:number;R:number;r:number}; return <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono w-full">{[['Area',r.area],['Perimeter',parseFloat((r.a+r.b+r.c).toFixed(6))],['Circumradius R',r.R],['Inradius r',r.r]].map(([k,v])=><div key={k as string} className="flex justify-between gap-4 border-b border-slate-200/40 dark:border-white/5 pb-1"><span className="text-slate-500">{k}</span><span className="text-emerald-400 font-bold">{v}</span></div>)}</div> })()}
                </div>
              )}
            </div>
            {(s.triResult as unknown as {error?:string})?.error && <div className="mt-5 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 shadow-inner">{(s.triResult as unknown as {error:string}).error}</div>}
            {s.triResult && !(s.triResult as unknown as {error?:string}).error && <div className="mt-6 space-y-1">{s.triResult.steps?.map((st,i)=><KatexStep key={i} label={st.label} latex={st.latex} />)}</div>}
            <div className="mt-8 pt-5 border-t border-slate-200/40 dark:border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 col-span-full mb-1">Reference Formulas</div>
              {[['Law of Sines','\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}'],['Law of Cosines','c^2 = a^2 + b^2 - 2ab\\cos C'],['Area','\\text{Area} = \\tfrac{1}{2}ab\\sin C = \\sqrt{s(s-a)(s-b)(s-c)}'],['Angles sum','A + B + C = 180^\\circ']].map(([lbl,lat])=><div key={lbl} className="flex items-center gap-4 text-xs bg-white/5 p-3 rounded-xl border border-slate-200/40 dark:border-white/5"><span className="text-slate-400 w-28 shrink-0 font-medium">{lbl}</span><KatexInline expr={lat} /></div>)}
            </div>
          </div>
        )}

        {/* ══ GRAPH ══ */}
        {s.section === 'graph' && (
          <div className="p-5">
            <div className="flex flex-wrap gap-4 mb-4 items-end bg-brand-500/5 dark:bg-black/20 p-4 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
              {s.graphFns.map((fn: string, i: number) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="text-[11px] font-bold uppercase font-mono tracking-wider" style={{color:['#60a5fa','#34d399','#f472b6','#fb923c'][i]}}>y{i+1} =</div>
                  <input value={fn} onChange={e=>{ const f=[...s.graphFns]; f[i]=e.target.value; s.setGraphFns(f) }} className="w-40 text-sm bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg py-2 px-3 text-slate-800 dark:text-slate-100 font-mono focus:ring-1 focus:outline-none transition-all shadow-inner" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mb-5 items-end text-xs text-slate-400">
              {([['xMin',s.graphXMin,s.setGraphXMin],['xMax',s.graphXMax,s.setGraphXMax],['yMin',s.graphYMin,s.setGraphYMin],['yMax',s.graphYMax,s.setGraphYMax]] as const).map(([label,val,set]) => (
                <div key={label} className="flex flex-col gap-1"><div className="text-[10px] font-bold uppercase tracking-wider">{label}</div><input aria-label={label} type="number" value={val} onChange={e=>set(parseFloat(e.target.value)||0)} className="w-20 text-center text-sm bg-brand-500/5 dark:bg-black/20 border border-slate-200/60 dark:border-white/10 rounded-lg py-1.5 text-slate-800 dark:text-slate-100 font-mono focus:border-brand-400 focus:outline-none shadow-inner transition-colors" /></div>
              ))}
              <button onClick={()=>{ s.setGraphXMin(-10); s.setGraphXMax(10); s.setGraphYMin(-10); s.setGraphYMax(10) }} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 self-end font-medium transition-colors border border-transparent hover:border-white/10">reset bounds</button>
            </div>
            <div className="bg-brand-500/5 dark:bg-black/20 p-2 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
              <CanvasGraph fns={s.builtGraphFns} xMin={s.graphXMin} xMax={s.graphXMax} yMin={s.graphYMin} yMax={s.graphYMax} width={860} height={380} />
            </div>
          </div>
        )}

        {/* ══ SCRIPT ══ */}
        {s.section === 'script' && (
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-brand-500/5 dark:bg-black/20 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">
              {[['js','JavaScript','#f59e0b'],['python','Python (Pyodide)','#60a5fa'],['matlab','OpenMAT','#f97316']].map(([id,label,col])=>(
                <button key={id} onClick={()=>{ s.setScriptLang(id as typeof s.scriptLang); s.setScriptOutput(''); s.setMlOutput(''); s.setMlWorkspace([]) }}
                  className={`px-4 py-2 text-xs rounded-lg font-bold transition-all shadow-sm ${s.scriptLang===id?'text-white shadow-md':'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'}`}
                  style={s.scriptLang===id?{background:col,color:'#0f172a'}:{}}>
                  {label}
                </button>
              ))}
              {s.scriptLang === 'python' && <span className={`text-[11px] font-bold uppercase tracking-wider ml-3 ${s.pyodideStatus==='ready'?'text-emerald-400':s.pyodideStatus==='loading'?'text-amber-400':s.pyodideStatus==='error'?'text-red-400':'text-slate-500'}`}>{s.pyodideStatus==='ready'?'● Runtime ready':s.pyodideStatus==='loading'?'⏳ Loading...':s.pyodideStatus==='error'?'✗ Load failed':'○ First run loads runtime'}</span>}
              {s.scriptLang === 'matlab' && <span className={`text-[11px] font-bold uppercase tracking-wider ml-3 ${s.mlStatus==='done'?'text-emerald-400':s.mlStatus==='running'?'text-amber-400':s.mlStatus==='error'?'text-red-400':'text-slate-500'}`}>{s.mlStatus==='done'?'● Done':s.mlStatus==='running'?'⏳ Running...':s.mlStatus==='error'?'✗ Error':'○ Browser engine'}</span>}
              <div className="ml-auto flex flex-wrap items-center gap-3 pr-1">
                {s.scriptLang !== 'matlab' && (
                  <div className="flex items-center gap-2 bg-brand-500/5 dark:bg-black/40 rounded-lg p-1 border border-slate-200/40 dark:border-white/5">
                    <input value={s.scriptName} onChange={e=>s.setScriptName(e.target.value)} placeholder="name to save..." className="w-32 text-xs bg-transparent border-none rounded px-2 py-1 text-slate-800 dark:text-slate-100 font-mono focus:outline-none placeholder-slate-600" />
                    <button onClick={()=>{ if(s.scriptName.trim()) s.setScripts({...s.scripts,[s.scriptName.trim()]: s.scriptLang==='python'?s.pyScript:s.script}) }} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-slate-200 rounded text-xs font-semibold transition-colors">Save</button>
                  </div>
                )}
                <button onClick={()=>{ if(s.scriptLang==='python') s.runPython(); else if(s.scriptLang==='matlab') s.runMatlab(); else s.runScript() }}
                  className={`px-6 py-2 rounded-lg text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 ${s.scriptLang==='matlab'?'bg-gradient-to-r from-orange-600 to-red-600':s.scriptLang==='python'?'bg-gradient-to-r from-blue-600 to-indigo-600':'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
                  {s.mlStatus === 'running' && s.scriptLang === 'matlab' ? '⏳ Running…' : '▶ Run'}
                </button>
              </div>
            </div>
            {Object.keys(s.scripts).length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap px-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider self-center mr-2">Saved:</span>
                {Object.keys(s.scripts).map(name=><button key={name} onClick={()=>{ if(s.scriptLang==='python') s.setPyScript(s.scripts[name]); else s.setScript(s.scripts[name]); s.setScriptName(name) }} className="text-xs font-mono px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-slate-200/40 dark:border-white/5 hover:border-white/20 text-slate-300 transition-colors">{name}</button>)}
              </div>
            )}
            <div className="rounded-xl overflow-hidden border border-slate-200/60 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <Suspense fallback={<div className="text-slate-400 text-sm p-4 bg-brand-500/5 dark:bg-black/40">Loading editor...</div>}>
                <MonacoEditor
                  height="280px"
                  language={s.scriptLang === 'python' ? 'python' : s.scriptLang === 'matlab' ? 'plaintext' : 'javascript'}
                  beforeMount={setupOpenCalcMonaco}
                  theme={(themeStyles as any).monaco}
                  value={s.scriptLang === 'python' ? s.pyScript : s.scriptLang === 'matlab' ? s.mlScript : s.script}
                  onChange={(v: string | undefined) => { if(s.scriptLang==='python') s.setPyScript(v||''); else if(s.scriptLang==='matlab') s.setMlScript(v||''); else s.setScript(v||'') }}
                  options={{ minimap:{enabled:false}, fontSize:13, wordWrap:'on', scrollBeyondLastLine:false, tabSize:2, padding:{top:10,bottom:10} }} />
              </Suspense>
            </div>
            {s.scriptLang !== 'matlab' && (
              <div className="mt-4 bg-slate-950 rounded-xl border border-slate-200/60 dark:border-white/10 p-4 font-mono text-sm min-h-[4rem] max-h-48 overflow-y-auto shadow-inner">
                {s.scriptOutput ? <pre className="text-emerald-400 whitespace-pre-wrap">{s.scriptOutput}</pre> : <span className="text-slate-600 select-none">Output appears here after ▶ Run...</span>}
              </div>
            )}
            {s.scriptLang === 'matlab' && s.mlStatus !== 'idle' && (
              <div className="mt-4 space-y-3">
                <div className="bg-slate-950 rounded-xl border border-slate-200/60 dark:border-white/10 p-4 font-mono text-sm min-h-[4rem] max-h-56 overflow-y-auto shadow-inner">
                  {s.mlOutput ? <pre className={`whitespace-pre-wrap ${s.mlStatus==='error'?'text-red-400':'text-emerald-400'}`}>{s.mlOutput}</pre> : <span className="text-slate-600">No output.</span>}
                </div>
                {s.mlWorkspace.length > 0 && (
                  <div className="bg-brand-500/5 dark:bg-black/20 rounded-xl border border-slate-200/40 dark:border-white/5 overflow-hidden shadow-inner">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 py-2 border-b border-slate-200/40 dark:border-white/5">Workspace</div>
                    <div className="overflow-x-auto"><table className="w-full text-xs font-mono">
                      <thead><tr className="text-slate-500 border-b border-slate-200/40 dark:border-white/5"><th className="text-left px-4 py-1.5 font-semibold">Name</th><th className="text-left px-4 py-1.5 font-semibold">Size</th><th className="text-left px-4 py-1.5 font-semibold">Class</th><th className="text-left px-4 py-1.5 font-semibold">Value</th><th className="px-2 py-1.5"></th></tr></thead>
                      <tbody>{s.mlWorkspace.map(w=><tr key={w.name} className="border-b border-slate-200/40 dark:border-white/5 hover:bg-white/5 transition-colors"><td className="px-4 py-1.5 text-brand-300 font-bold">{w.name}</td><td className="px-4 py-1.5 text-slate-400">{(w as unknown as {size?:number[]}).size?.join('×')}</td><td className="px-4 py-1.5 text-slate-500">{(w as unknown as {className?:string}).className}</td><td className="px-4 py-1.5 text-emerald-400 max-w-[200px] truncate">{(w as unknown as {preview?:string}).preview}</td><td className="px-2 py-1.5">{Array.isArray((w as unknown as {value?:unknown}).value) && Array.isArray(((w as unknown as {value?:unknown[]}).value as unknown[])?.[0]) && <button onClick={()=>{ s.setMatVars({...s.matVars,[w.name]:(w as unknown as {value:string[][]}).value}); s.setSection('matrix') }} className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold px-1.5 py-0.5 rounded hover:bg-sky-500/10 transition-colors">→ mat</button>}</td></tr>)}</tbody>
                    </table></div>
                  </div>
                )}
              </div>
            )}
            {s.scriptLang === 'matlab' && s.mlStatus === 'idle' && <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-xl px-5 py-3 text-sm text-orange-200 shadow-inner"><strong className="font-bold text-orange-300">OpenMAT</strong> — MATLAB-like engine running entirely in the browser via mathjs. Press <strong>▶ Run</strong> to execute.</div>}
            {s.pyImages.length > 0 && <div className="mt-4 flex flex-wrap gap-4 p-4 bg-brand-500/5 dark:bg-black/20 rounded-xl border border-slate-200/40 dark:border-white/5 shadow-inner">{s.pyImages.map((src: string, i: number)=><img key={i} src={src} alt={`Plot ${i+1}`} className="max-w-full rounded-lg border border-slate-200/60 dark:border-white/10 shadow-md" style={{maxHeight:320}} />)}</div>}
            <iframe ref={s.iframeRef} style={{display:'none'}} sandbox="allow-scripts" title="script-runner-js" />
          </div>
        )}

        {/* ══ FORMULAS ══ */}
        {s.section === 'formulas' && (
          <div className="p-5 space-y-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 pl-1">Physics Formulas</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PHYSICS_FORMULAS.map((f: { name: string; desc: string; latex: string; vars: string[] }) => (
                  <button key={f.name} onClick={()=>{ s.setSection('physics'); s.setPhysFormula(f); s.setPhysVarsLocal(Object.fromEntries((f.vars||[]).map((v: string)=>[v,'']))) }}
                    className="text-left px-4 py-3 rounded-xl bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group">
                    <div className="text-sm font-bold text-brand-400 group-hover:text-brand-300 transition-colors">{f.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-1">{f.desc}</div>
                    <div className="text-xs text-slate-500 mt-2 overflow-hidden bg-brand-500/5 dark:bg-black/20 p-2 rounded-lg"><KatexInline expr={f.latex} /></div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 pl-1 flex items-center gap-2">Machinist Formulas <span className="text-[9px] font-semibold bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">→ open ⚙ Machinist tab for detail</span></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MACHINIST_FORMULAS.map((f: { name: string; desc: string; latex: string; vars: string[] }) => (
                  <button key={f.name} onClick={()=>{ s.setSection('machinist'); s.setMachFormula(f); s.setMachVarsLocal(Object.fromEntries((f.vars||[]).map((v: string)=>[v,'']))); s.setMachResult(null) }}
                    className="text-left px-4 py-3 rounded-xl bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group">
                    <div className="text-sm font-bold text-orange-400 group-hover:text-orange-300 transition-colors">{f.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{f.desc}</div>
                    <div className="text-xs text-slate-500 mt-2 overflow-hidden bg-brand-500/5 dark:bg-black/20 p-2 rounded-lg"><KatexInline expr={f.latex} /></div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 pl-1">Saved Formulas</div>
              {Object.keys(s.formulas).length === 0 && <div className="text-slate-500 text-sm bg-brand-500/5 dark:bg-black/20 p-4 rounded-xl border border-slate-200/40 dark:border-white/5">No saved formulas. In Compute, use "f1 = expr" to save.</div>}
              <div className="flex flex-wrap gap-2">{Object.entries(s.formulas).map(([k,v])=><button key={k} onClick={()=>{ s.setInput(v); s.setSection('compute') }} className="text-xs px-4 py-2 rounded-lg bg-brand-500/5 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 hover:border-brand-400/50 hover:bg-brand-500/5 text-slate-300 font-mono transition-all shadow-inner"><span className="font-bold text-brand-400 mr-2">{k}:</span>{v}</button>)}</div>
            </div>
          </div>
        )}

      </div>

    </div>
  )
}
