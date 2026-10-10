import { useMemo, useState } from 'react'
import type { MathOSState } from '../hooks/useMathOSState'
import { columnSummary, fitLinearModel, numericPairs, parseDataset, tableCSV, type Dataset } from '../dataset'

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const fmt = (n: number | null) => n === null ? '—' : Number(n.toPrecision(7)).toString()

export default function DatasetPanel({ s }: { s: MathOSState }) {
  const [source, setSource] = useState('time,measurement\n0,1\n1,3\n2,5\n3,7\n4,9\n5,11')
  const [name, setName] = useState('Measurements')
  const [delimiter, setDelimiter] = useState('')
  const [header, setHeader] = useState(true)
  const [preview, setPreview] = useState<Dataset | null>(null)
  const [message, setMessage] = useState('')
  const [x, setX] = useState(0), [y, setY] = useState(1), [page, setPage] = useState(0)
  const [fit, setFit] = useState<{ data: Dataset; model: ReturnType<typeof fitLinearModel> } | null>(null)
  const d = s.dataset, xc = d && x < d.columns.length ? x : 0, yc = d && y < d.columns.length ? y : 0
  const model = fit?.data === d && fit.model.xColumn === xc && fit.model.yColumn === yc ? fit.model : null
  const analysis = useMemo(() => {
    if (!d) return null
    try { return { summaries: d.columns.map((_, i) => columnSummary(d, i)), pairs: numericPairs(d, xc, yc), error: '' } }
    catch (e) { return { summaries: [], pairs: [], error: (e as Error).message } }
  }, [d, xc, yc])
  const run = (action: () => void) => { try { action(); setMessage('') } catch (e) { setMessage((e as Error).message) } }
  const button = 'rounded border border-slate-600 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-40'
  const field = 'rounded border border-slate-600 bg-slate-900 p-2 min-w-0 text-slate-100'
  const pairs = analysis?.pairs ?? []
  const xs = pairs.map(p => p.x), ys = pairs.map(p => p.y)
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys)
  const px = (v: number) => 40 + 520 * ((v / 2 - xmin / 2) / ((xmax / 2 - xmin / 2) || 1))
  const py = (v: number) => 230 - 210 * ((v / 2 - ymin / 2) / ((ymax / 2 - ymin / 2) || 1))
  const currentPage = d ? Math.min(page, Math.max(0, Math.ceil(d.rows.length / 20) - 1)) : 0
  return <section className="space-y-4 p-4 text-slate-200 min-w-0" aria-label="Data workspace">
    <h2 className="text-lg font-semibold">Data, statistics & models</h2>
    <p className="text-sm text-slate-400">Import once, edit measurements, inspect statistics and fit a model in your browser. Saved locally without an account; include your table in a project export for backup.</p>
    <details open={!d} className="rounded border border-slate-700 p-3">
      <summary className="cursor-pointer">Import or paste a table</summary>
      <div className="space-y-3 mt-3">
        <label className="block">Dataset name <input aria-label="Dataset name" className={`${field} w-full`} value={name} onChange={e => { setName(e.target.value); setPreview(null) }} /></label>
        <input aria-label="Import CSV or TSV" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ''; if (!file) return
          try {
            if (file.size > 2_000_000) throw new Error('Use a file smaller than 2 MB.')
            setSource(await file.text()); setName(file.name); setPreview(null); setMessage('File loaded. Preview the table before replacing your data.')
          } catch (error) { setMessage((error as Error).message) }
        }} />
        <textarea aria-label="CSV or TSV data" className={`${field} w-full h-32 font-mono text-sm`} value={source} onChange={e => { setSource(e.target.value); setPreview(null) }} />
        <div className="flex flex-wrap gap-3 items-center">
          <label>Delimiter <select aria-label="Delimiter" className={field} value={delimiter} onChange={e => { setDelimiter(e.target.value); setPreview(null) }}><option value="">Auto</option><option value=",">Comma</option><option value={'\t'}>Tab</option><option value=";">Semicolon</option></select></label>
          <label><input type="checkbox" checked={header} onChange={e => { setHeader(e.target.checked); setPreview(null) }} /> First row has headers</label>
          <button className={button} onClick={() => run(() => setPreview(parseDataset(source, { delimiter, header, name })))}>Preview table</button>
        </div>
        <p className="text-xs text-slate-400">Up to 10,000 rows and 32 columns. Decimal point numbers and scientific notation supported. Empty and nonnumeric cells stay intact.</p>
        {preview && <div className="space-y-2"><p>{preview.rows.length} rows · {preview.columns.length} columns</p><pre className="overflow-auto text-xs max-h-32">{tableCSV(preview.columns, preview.rows.slice(0, 5), false)}</pre><button className={button} onClick={() => run(() => { s.setDataset(preview); setPage(0); setX(0); setY(Math.min(1, preview.columns.length - 1)); setPreview(null) })}>{d ? 'Replace current table' : 'Use this table'}</button></div>}
      </div>
    </details>
    {message && <p role="status" className="text-amber-300 break-words">{message}</p>}
    {d && <>
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold break-all">{d.name} · {d.rows.length} rows</h3>
        <button className={button} onClick={() => download('mathos-data.csv', tableCSV(d.columns, d.rows), 'text/csv')}>Export CSV</button>
        <button className={button} onClick={async () => { try { await navigator.clipboard.writeText(tableCSV(d.columns, d.rows)); setMessage('Table copied as CSV.') } catch { setMessage('Clipboard unavailable. Use Export CSV instead.') } }}>Copy table</button>
      </div>
      <p className="text-xs text-slate-400">CSV copy and exports prefix formula-like text with an apostrophe for spreadsheets. Project JSON preserves exact cell text.</p>
      <div className="flex flex-wrap gap-2">{(['JavaScript', 'Python'] as const).map(language => <button key={language} className={button} onClick={() => {
        if (!window.confirm(`Replace the current ${language} draft with a program containing this table?`)) return
        const json = JSON.stringify(d)
        if (language === 'JavaScript') {
          s.setScript(`// Cell values remain strings; convert numeric columns explicitly.\nconst data = ${json};\nconsole.log(data.columns);\nconsole.log(data.rows.slice(0, 5));\n`)
          s.setScriptLang('js')
        } else {
          s.setPyScript(`# Cell values remain strings; convert numeric columns explicitly.\nimport json\ndata = json.loads(${JSON.stringify(json)})\nprint(data['columns'])\nprint(data['rows'][:5])\n`)
          s.setScriptLang('python')
        }
        s.setSection('script')
      }}>Use table in {language}</button>)}</div>
      <div className="overflow-auto max-w-full max-h-80"><table className="text-sm"><thead><tr><th>Row</th>{d.columns.map(c => <th key={c} className="p-2">{c}</th>)}</tr></thead><tbody>{d.rows.slice(currentPage * 20, currentPage * 20 + 20).map((row, ri) => <tr key={currentPage * 20 + ri}><th>{currentPage * 20 + ri + 1}</th>{row.map((cell, ci) => <td key={ci}><input aria-label={`Row ${currentPage * 20 + ri + 1}, ${d.columns[ci]}`} className={`${field} w-32`} value={cell} onChange={e => run(() => s.setDataset({ ...d, rows: d.rows.map((r, i) => i === currentPage * 20 + ri ? r.map((v, j) => j === ci ? e.target.value : v) : r) }))} /></td>)}</tr>)}</tbody></table></div>
      <div className="flex gap-2 items-center"><button className={button} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous rows</button><span>Page {currentPage + 1}</span><button className={button} disabled={(currentPage + 1) * 20 >= d.rows.length} onClick={() => setPage(currentPage + 1)}>Next rows</button></div>
      {analysis?.error && <p role="alert">{analysis.error}</p>}
      <h3 className="font-semibold">Column statistics</h3>
      <div className="overflow-auto"><table className="text-sm whitespace-nowrap"><thead><tr>{['Column', 'Numeric', 'Missing', 'Nonnumeric', 'Mean', 'Median', 'Min', 'Max', 'Sample SD'].map(c => <th className="p-2 text-left" key={c}>{c}</th>)}</tr></thead><tbody>{analysis?.summaries.map((v, i) => <tr key={i}><th className="p-2 text-left">{d.columns[i]}</th>{[v.count, v.missing, v.nonnumeric, v.mean, v.median, v.min, v.max, v.sampleSD].map((n, j) => <td className="p-2" key={j}>{fmt(n)}</td>)}</tr>)}</tbody></table></div>
      <div className="flex flex-wrap gap-3">{[['X / feature', xc, setX], ['Y / target', yc, setY]].map(([label, value, setter]) => <label key={String(label)}>{String(label)} <select aria-label={String(label)} className={field} value={value as number} onChange={e => (setter as (n: number) => void)(Number(e.target.value))}>{d.columns.map((c, i) => <option key={c} value={i}>{c}</option>)}</select></label>)}</div>
      <p className="text-sm">{pairs.length} complete numeric pairs; {d.rows.length - pairs.length} excluded. Plot shows up to 1,000 evenly sampled pairs; the model uses all complete pairs.</p>
      {pairs.length > 0 && <svg role="img" aria-label={`Scatter plot: ${d.columns[yc]} versus ${d.columns[xc]}`} viewBox="0 0 600 270" className="w-full max-w-3xl bg-slate-900 rounded"><path d="M40 20 V230 H560" fill="none" stroke="#94a3b8" />{pairs.filter((_, i) => i % Math.ceil(pairs.length / 1000) === 0).map(p => <circle key={p.row} cx={px(p.x)} cy={py(p.y)} r="3" fill="#38bdf8"><title>Row {p.row + 1}: {p.x}, {p.y}</title></circle>)}<text x="40" y="250" fill="#cbd5e1" fontSize="12">X: {fmt(xmin)} to {fmt(xmax)} · Y: {fmt(ymin)} to {fmt(ymax)}</text></svg>}
      <h3 className="font-semibold">Linear regression</h3><p className="text-sm text-slate-400">Ordinary least squares. First 80% of complete rows train the model; last 20% test it, in table order. Row order matters; this is a simple holdout, not cross-validation.</p>
      <button className={button} onClick={() => run(() => setFit({ data: d, model: fitLinearModel(d, xc, yc) }))}>Fit linear model</button>
      {model && <div className="space-y-2" role="status"><p>y = {fmt(model.slope)} × x + {fmt(model.intercept)}</p><p>Held-out RMSE: {fmt(model.rmse)} · Training-mean baseline RMSE: {fmt(model.baselineRMSE)}</p><p>{model.trainCount} training rows · {model.testCount} test rows · {model.excluded} excluded</p><div className="flex flex-wrap gap-2"><button className={button} onClick={() => download('mathos-model.json', JSON.stringify({ algorithm: 'ordinary-least-squares', feature: d.columns[xc], target: d.columns[yc], split: 'first 80% train, last 20% test; complete rows in source order', ...model }, null, 2), 'application/json')}>Export model JSON</button><button className={button} onClick={() => download('mathos-predictions.csv', tableCSV(['row', 'x', 'y', 'prediction', 'residual', 'split'], model.predictions.map(p => [String(p.row + 1), String(p.x), String(p.y), String(p.prediction), String(p.residual), p.split])), 'text/csv')}>Export predictions CSV</button></div></div>}
      <p className="text-xs text-slate-400">Editing cells or selecting other columns clears the displayed fit. Refit before exporting results.</p>
    </>}
  </section>
}
