// Figures placed between the paragraphs of Lab 24 (24.2–24.4), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Choice, Readout, Bars, r } from '../../kit/fig.jsx'
import { random } from '../../kit/math.js'
import { KERNELS, conv2d, outputSize, receptiveField, stackedRF, maxPool, digitImage } from './engine.js'

const CELL = 22
// A grid of numbers as coloured squares. `scale` maps a value to [-1, 1]; `mark` outlines some cells.
function Grid({ m, scale, mark = new Set(), label, offset = 0, diverging = false }) {
  const h = m.length, w = m[0].length
  return <svg viewBox={`0 0 ${w * CELL + 2 * offset * CELL + 2} ${h * CELL + 2 * offset * CELL + 2}`} role="img" aria-label={label} style={{ width: (w + 2 * offset) * CELL + 2, maxWidth: '100%' }}>
    {offset > 0 && <rect x={1} y={1} width={(w + 2 * offset) * CELL} height={(h + 2 * offset) * CELL} fill="none" stroke="var(--border)" strokeDasharray="3 3" />}
    {m.map((row, i) => row.map((v, j) => { const t = Math.max(-1, Math.min(1, v / scale))
      const fill = diverging ? (t >= 0 ? `rgba(234, 88, 12, ${t})` : `rgba(37, 99, 235, ${-t})`) : `rgba(100, 116, 139, ${Math.max(0, t)})`
      return <rect key={`${i}-${j}`} x={1 + (j + offset) * CELL} y={1 + (i + offset) * CELL} width={CELL - 1} height={CELL - 1} fill={fill} stroke={mark.has(`${i},${j}`) ? 'var(--accent)' : 'var(--border)'} strokeWidth={mark.has(`${i},${j}`) ? 2.2 : 0.5} /> }))}
  </svg>
}

// ---------- 24.2 ----------
const DIGIT = digitImage(3, 2, 1, random(7), 0.05)
export function ConvSlide() {
  const [kernel, setKernel] = useState('vertical'), [stride, setStride] = useState(1), [pad, setPad] = useState(0)
  const K = KERNELS[kernel].k, n = outputSize(10, 3, stride, pad)
  const [cell, setCell] = useState([3, 2])
  const i = Math.min(cell[0], n - 1), j = Math.min(cell[1], n - 1)
  const out = useMemo(() => conv2d(DIGIT, K, stride, pad), [K, stride, pad])
  const patch = receptiveField(i, j, 3, stride, pad)
  const products = patch.map(([a, b], q) => { const x = a < 0 || b < 0 || a >= 10 || b >= 10 ? 0 : DIGIT[a][b]; return K[Math.floor(q / 3)][q % 3] * x })
  const peak = Math.max(...out.flat().map(Math.abs), 1e-9)
  return <div>
    <Controls>
      <Choice label="kernel" value={kernel} onChange={setKernel} options={Object.entries(KERNELS).map(([k, v]) => [k, v.label])} />
      <Slider label="stride s" value={stride} min={1} max={3} step={1} onChange={setStride} digits={0} />
      <Slider label="padding p" value={pad} min={0} max={2} step={1} onChange={setPad} digits={0} />
      <Slider label="output row" value={i} min={0} max={n - 1} step={1} onChange={v => setCell([v, j])} digits={0} />
      <Slider label="output column" value={j} min={0} max={n - 1} step={1} onChange={v => setCell([i, v])} digits={0} />
    </Controls>
    <div className="ml-fig-row">
      <Grid m={DIGIT} scale={1} offset={pad} mark={new Set(patch.map(([a, b]) => `${a},${b}`))} label={`The 10 × 10 input, a digit 3, with the 3 × 3 patch for output (${i}, ${j}) outlined`} />
      <Grid m={out} scale={peak} diverging mark={new Set([`${i},${j}`])} label={`The ${n} × ${n} feature map; output (${i}, ${j}) = ${r(out[i][j], 3)}`} />
    </div>
    <Readout>Output size ⌊(10 + 2·{pad} − 3)/{stride}⌋ + 1 = {n}. Output ({i}, {j}) = sum of the nine products kernel × patch = {products.map(v => r(v, 2)).join(' + ')} = {r(out[i][j], 3)}. Orange is positive, blue negative; the dashed border is the zero padding.</Readout>
  </div>
}

// ---------- 24.3 ----------
const SOBEL = KERNELS.vertical.k
export function ShiftFeatures() {
  const [dx, setDx] = useState(1)
  const img = useMemo(() => digitImage(3, dx, 1, random(7), 0.05), [dx])
  const fmap = conv2d(img, SOBEL, 1, 1).map(row => row.map(v => Math.max(0, v)))
  const feats = maxPool(fmap, 2).map(row => Math.max(...row))
  return <div>
    <Controls><Slider label="move the digit right by" value={dx} min={0} max={5} step={1} onChange={setDx} digits={0} /></Controls>
    <div className="ml-fig-row">
      <Grid m={img} scale={1} label={`The digit 3 placed ${dx} pixels from the left`} />
      <Grid m={fmap} scale={4} diverging label="Sobel x feature map after ReLU: it moves with the digit" />
    </div>
    <Bars items={feats.map((v, k) => ({ label: `row ${k + 1}`, value: v }))} max={3} digits={2} label={`Five pooled features (largest value in each pooled row): ${feats.map(v => r(v, 2)).join(', ')}`} />
    <Readout>The pixels and the feature map move with the digit; the five pooled features (the largest value in each pooled row) barely change: {feats.map(v => r(v, 2)).join(', ')}. That is the invariance the classifier in 24.3 relies on.</Readout>
  </div>
}

// ---------- 24.4 ----------
export function RFGrowth() {
  const [L, setL] = useState(4), [k, setK] = useState(3), [s, setS] = useState(1)
  const rf = stackedRF(L, k, s)
  const shown = Math.min(rf, 41)
  return <div>
    <Controls>
      <Slider label="layers L" value={L} min={1} max={8} step={1} onChange={setL} digits={0} />
      <Slider label="kernel k" value={k} min={3} max={7} step={2} onChange={setK} digits={0} />
      <Slider label="stride s" value={s} min={1} max={2} step={1} onChange={setS} digits={0} />
    </Controls>
    <svg viewBox="0 0 440 60" role="img" aria-label={`One output after ${L} layers sees ${rf} input pixels in each direction`} style={{ width: 440, maxWidth: '100%' }}>
      {Array.from({ length: 41 }, (_, q) => <rect key={q} x={10 + q * 10.5} y={20} width={9.5} height={20} fill={Math.abs(q - 20) <= (shown - 1) / 2 ? 'var(--chart-model)' : 'var(--border)'} opacity={Math.abs(q - 20) <= (shown - 1) / 2 ? 0.85 : 0.4} />)}
    </svg>
    <Readout>After {L} layer{L > 1 ? 's' : ''} of k = {k}, stride {s}: one output sees {rf} pixels across{s === 1 ? ` (1 + L(k − 1) = 1 + ${L} × ${k - 1})` : ' — stride makes each later layer’s step cover more pixels'}{rf > 41 ? '; the strip shows only 41' : ''}.</Readout>
  </div>
}
