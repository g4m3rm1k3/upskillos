import React, { useState } from 'react'
import { PanelHeading, Slider, Toggle, Controls, Metrics, Insight, Table, Caption, Legend } from '../../kit/ui.jsx'

// Lesson 00a's experiment: the same file-processing example as the text,
// laid out in the order of the lesson's sections.
const BATCHES = [
  { name: 'Batch A', mb: 2, files: 3, seconds: 23.4 },
  { name: 'Batch B', mb: 1, files: 1, seconds: 9.2 },
  { name: 'Batch C', mb: 5, files: 2, seconds: 29.1 },
  { name: 'Batch D', mb: 0, files: 4, seconds: 20.6 },
]
const n = v => Number(v.toFixed(2)).toString()
const A = 'var(--chart-train)', B = 'var(--chart-val)', BIAS = 'var(--muted)'

function Step({ number, title, children }) {
  return <section style={{ marginTop: 22 }}><h3 style={{ margin: '0 0 6px' }}><span className="ml-eyebrow" style={{ marginRight: 8 }}>Step {number}</span>{title}</h3>{children}</section>
}

function ContributionBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0), max = Math.max(60, total * 1.1), W = 520, X = v => 10 + v / max * (W - 20)
  let start = 0
  return <svg viewBox={`0 0 ${W} 70`} className="ml-plot" role="img" aria-label="Contributions stacked into the prediction">
    {parts.map(p => { const x0 = start; start += p.value; return p.value > 0 && <g key={p.label}>
      <rect x={X(x0)} y={10} width={X(start) - X(x0)} height={30} fill={p.color} opacity="0.85" rx="3" />
      {X(start) - X(x0) > 34 && <text x={(X(x0) + X(start)) / 2} y={30} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700 }} fill="white">{n(p.value)} s</text>}
    </g> })}
    <line x1={X(total)} x2={X(total)} y1={4} y2={46} stroke="var(--text)" strokeWidth="2" />
    <text x={Math.min(X(total), W - 60)} y={62} style={{ fontSize: 12 }} fill="var(--text)">prediction = {n(total)} s</text>
  </svg>
}

export default function DotProduct() {
  const [asArray, setAsArray] = useState(false)
  const [mb, setMb] = useState(2), [files, setFiles] = useState(3), [wMb, setWMb] = useState(4), [wFile, setWFile] = useState(5)
  const [elementwise, setElementwise] = useState(false), [useBias, setUseBias] = useState(false), [bias, setBias] = useState(2)
  const [column, setColumn] = useState(false)
  const b = useBias ? bias : 0
  const c1 = mb * wMb, c2 = files * wFile, prediction = c1 + c2 + b
  const preds = BATCHES.map(r => r.mb * wMb + r.files * wFile + b)
  const errors = preds.map((p, i) => p - BATCHES[i].seconds)
  const mseRight = errors.reduce((s, e) => s + e * e, 0) / errors.length
  const wrong = preds.map(p => BATCHES.map(r => p - r.seconds))
  const mseWrong = wrong.flat().reduce((s, e) => s + e * e, 0) / 16
  return <>
    <PanelHeading eyebrow="Live experiment · lesson 00a" title="Build a prediction from a weighted sum." pill="same numbers as the text" />
    <Caption>This workbench follows the lesson on the left, step by step, using its example: predicting how long a batch of files takes to process. Change the numbers and watch every intermediate result.</Caption>

    <Step number={1} title="One operation, two meanings">
      <Controls><Toggle label="Store x as a NumPy array (instead of a Python list)" checked={asArray} onChange={setAsArray} /></Controls>
      <div className="ml-update"><code>{asArray ? 'x = np.array([2, 3, 4])' : 'x = [2, 3, 4]'}</code><code>2 * x  →  {asArray ? 'array([4, 6, 8])' : '[2, 3, 4, 2, 3, 4]'}</code><p>{asArray ? 'An array multiplies every entry: this is the arithmetic we want for data.' : 'A list repeats itself: the same-looking expression does something completely different.'}</p></div>
    </Step>

    <Step number={2} title="Pair each input with its weight, then add">
      <Controls>
        <Slider label="Input 1 · total size (MB)" value={mb} min={0} max={10} step={0.5} onChange={setMb} />
        <Slider label="Input 2 · number of files" value={files} min={0} max={10} onChange={setFiles} />
        <Slider label="Weight 1 · seconds per MB" value={wMb} min={0} max={10} step={0.5} onChange={setWMb} />
        <Slider label="Weight 2 · seconds per file" value={wFile} min={0} max={10} step={0.5} onChange={setWFile} />
      </Controls>
      <div className="ml-update">
        <code><span style={{ color: A }}>■</span> {n(mb)} MB × {n(wMb)} s/MB = {n(c1)} s</code>
        <code><span style={{ color: B }}>■</span> {n(files)} files × {n(wFile)} s/file = {n(c2)} s</code>
        {useBias && <code><span style={{ color: BIAS }}>■</span> fixed setup time (bias) = {n(bias)} s</code>}
        <code><strong>weighted sum = {n(c1)} + {n(c2)}{useBias ? ` + ${n(bias)}` : ''} = {n(prediction)} s</strong></code>
      </div>
      <ContributionBar parts={[{ label: 'size', value: c1, color: A }, { label: 'files', value: c2, color: B }, ...(useBias ? [{ label: 'bias', value: bias, color: BIAS }] : [])]} />
      <div className="ml-update">
        <p><strong>The same calculation in NumPy</strong></p>
        <code>inputs = np.array([{n(mb)}, {n(files)}])   # shape (2,)</code>
        <code>weights = np.array([{n(wMb)}, {n(wFile)}])   # shape (2,)</code>
        {elementwise ? <code>inputs * weights  →  array([{n(c1)}, {n(c2)}])   # multiplied, not yet added</code> : <code>inputs @ weights  →  {n(c1 + c2)}   # the dot product: multiply pairs, then add</code>}
        {useBias && <code>inputs @ weights + {n(bias)}  →  {n(prediction)}</code>}
      </div>
      <Controls>
        <Toggle label="Show only the elementwise product (inputs * weights)" checked={elementwise} onChange={setElementwise} />
        <Toggle label="Preview: add a fixed setup time — the bias, introduced in lesson 01" checked={useBias} onChange={setUseBias} />
        {useBias && <Slider label="Bias (seconds)" value={bias} min={0} max={10} step={0.5} onChange={setBias} />}
      </Controls>
      <Caption>{`Notice that the weights (${n(wMb)} and ${n(wFile)}) are the numbers you chose; the prediction (${n(prediction)}) is the result. Swap the order of only one vector and the pairing breaks: size would be multiplied by seconds per file.`}</Caption>
    </Step>

    <Step number={3} title="From one row to many: X @ w">
      <Caption>Each row of X is one batch; its two columns are the inputs. `X @ w` takes the dot product of **every row** with the same weights — here, the weights you set above.</Caption>
      <Table head={['row', 'size (MB)', 'files', 'row · w (with your weights)', 'prediction (s)']} rows={BATCHES.map((r, i) => [r.name, r.mb, r.files, `${r.mb}×${n(wMb)} + ${r.files}×${n(wFile)}${useBias ? ` + ${n(bias)}` : ''}`, n(preds[i])])} />
      <Metrics items={[['X shape', '(4, 2)', '4 rows (batches) × 2 columns (inputs)'], ['w shape', '(2,)', 'one weight per column'], ['X @ w shape', '(4,)', 'one prediction per row']]} />
    </Step>

    <Step number={4} title="Avoid a silent shape mistake">
      <Caption>We measured each batch's real processing time. The error for each row is prediction − measured time. That subtraction must pair row 1 with row 1, row 2 with row 2, and so on.</Caption>
      <Controls><Toggle label="Store the predictions as shape (4, 1) by mistake" checked={column} onChange={setColumn} /></Controls>
      {!column ? <Table head={['row', 'prediction', 'measured', 'error']} rows={BATCHES.map((r, i) => [r.name, n(preds[i]), r.seconds, n(errors[i])])} caption={`predictions (4,) − measured (4,) → errors (4,). Mean squared error = ${n(mseRight)}.`} />
        : <Table head={['prediction ↓ minus measured →', ...BATCHES.map(r => r.name)]} rows={wrong.map((row, i) => [`${BATCHES[i].name} (${n(preds[i])})`, ...row.map(n)])} caption={`predictions (4, 1) − measured (4,) broadcasts to (4, 4): 16 “errors”, most comparing the wrong batches. NumPy raises no error, and the mean squared error becomes ${n(mseWrong)} instead of ${n(mseRight)}.`} />}
      <Legend items={[['✓', 'check with print(pred.shape, y.shape) before subtracting', 'var(--text)']]} />
    </Step>

    <Insight title="Where this goes next">From lesson 01 on, this panel becomes a **trainer** that fits `ŷ = w·x + b` to measurements. That is exactly this weighted sum with **one** input x, **one** weight w, plus the bias b you previewed above. The line it draws is simply this prediction worked out for every possible x — and training means finding the w and b whose predictions best match the measured times.</Insight>
  </>
}
