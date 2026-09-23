import React, { useMemo, useState } from 'react'
import { KERNELS, conv2d, outputSize, receptiveField, stackedRF, shiftExperiment, digitImage } from './engine.js'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Actions, Caption, Table } from '../../kit/ui.jsx'
import { random, fmt, pct } from '../../kit/math.js'

function Grid({ m, size = 22, signed = false, highlight = new Set(), onCell, label }) {
  const H = m.length, W = m[0].length, maxAbs = Math.max(1e-9, ...m.flat().map(Math.abs))
  return <svg viewBox={`0 0 ${W * size + 2} ${H * size + 2}`} role="img" aria-label={label} style={{ maxWidth: W * size + 2, width: '100%' }}>
    {m.map((row, i) => row.map((v, j) => <rect key={`${i}-${j}`} x={1 + j * size} y={1 + i * size} width={size - 1} height={size - 1} rx="2"
      fill={signed ? (v >= 0 ? 'var(--chart-val)' : 'var(--chart-train)') : 'var(--text)'} opacity={signed ? 0.08 + 0.85 * Math.abs(v) / maxAbs : 0.06 + 0.9 * Math.max(0, Math.min(1, v))}
      style={{ cursor: onCell ? 'pointer' : 'default' }} onClick={onCell ? () => onCell(i, j) : undefined} />))}
    {m.map((row, i) => row.map((_, j) => highlight.has(`${i},${j}`) && <rect key={`h${i}-${j}`} x={1 + j * size} y={1 + i * size} width={size - 1} height={size - 1} rx="2" fill="var(--accent)" fillOpacity="0.18" stroke="var(--accent)" strokeWidth="2" pointerEvents="none" />))}
  </svg>
}

export default function Playground() {
  const [view, setView] = useState('conv')
  const [img, setImg] = useState(() => { const m = digitImage(3, 3, 1, random(1), 0); return [...m, Array(10).fill(0), Array(10).fill(0)].map(r => [...r, 0, 0]) })
  const [kernelKey, setKernelKey] = useState('vertical'), [stride, setStride] = useState(1), [pad, setPad] = useState(1), [sel, setSel] = useState([3, 4])
  const [layers, setLayers] = useState(3), [rfK, setRfK] = useState(3), [rfStride, setRfStride] = useState(1)
  const [kind, setKind] = useState('pixels'), [augment, setAugment] = useState(false), [result, setResult] = useState(null)
  const K = KERNELS[kernelKey].k, out = useMemo(() => conv2d(img, K, stride, pad), [img, K, stride, pad])
  const si = Math.min(sel[0], out.length - 1), sj = Math.min(sel[1], out[0].length - 1)
  const field = new Set(receptiveField(si, sj, 3, stride, pad).map(([a, b]) => `${a},${b}`))
  const presets = { digit: () => { const m = digitImage(3, 3, 1, random(1), 0); return [...m, Array(10).fill(0), Array(10).fill(0)].map(r => [...r, 0, 0]) }, square: () => Array.from({ length: 12 }, (_, i) => Array.from({ length: 12 }, (_, j) => (i > 2 && i < 9 && j > 2 && j < 9 ? 1 : 0))), diagonal: () => Array.from({ length: 12 }, (_, i) => Array.from({ length: 12 }, (_, j) => (Math.abs(i - j) < 1 ? 1 : 0))), clear: () => Array.from({ length: 12 }, () => Array(12).fill(0)) }
  return <>
    <PanelHeading title={{ conv: 'Slide a small pattern across the image.', rf: 'How far does each output see?', shift: 'Why convolutions generalize across position.' }[view]} pill={view === 'conv' ? `${img.length}×${img[0].length} → ${out.length}×${out[0].length}` : view === 'rf' ? `RF ${stackedRF(layers, rfK, rfStride)}×${stackedRF(layers, rfK, rfStride)}` : 'translation test'} />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['conv', 'Convolution explorer'], ['rf', 'Receptive fields of stacked layers'], ['shift', 'Experiment: shifted digits']]} /></Controls>
    {view === 'conv' && <>
      <Controls>
        <Choice label="Kernel" value={kernelKey} onChange={setKernelKey} options={Object.entries(KERNELS).map(([k, v]) => [k, v.label])} />
        <Slider label="Stride" value={stride} min={1} max={3} onChange={setStride} />
        <Slider label="Zero padding" value={pad} min={0} max={2} onChange={setPad} />
      </Controls>
      <Actions>{Object.keys(presets).map(p => <button key={p} onClick={() => setImg(presets[p]())}>{p === 'clear' ? 'Clear canvas' : `Load ${p}`}</button>)}</Actions>
      <div className="ml-grid-2">
        <div><p className="ml-caption">Input (click pixels to paint). Blue outline: the receptive field of the selected output.</p><Grid m={img} highlight={field} label="Input image" onCell={(i, j) => setImg(m => m.map((r, a) => r.map((v, b) => (a === i && b === j ? (v > 0.5 ? 0 : 1) : v))))} /></div>
        <div><p className="ml-caption">Feature map (orange +, blue −). Click a cell to see which inputs produced it.</p><Grid m={out} signed highlight={new Set([`${si},${sj}`])} label="Output feature map" onCell={(i, j) => setSel([i, j])} /></div>
      </div>
      <p className="ml-caption">Kernel weights</p><div style={{ maxWidth: 120 }}><Grid m={K} signed size={34} label="Kernel" /></div>
      <Metrics items={[['Output size', `⌊(${img.length} + 2·${pad} − 3)/${stride}⌋ + 1 = ${out.length}`], [`Output (${si}, ${sj})`, fmt(out[si][sj], 3)], ['Parameters in this layer', '9 weights + 1 bias'], ['Same weights used at', `${out.length * out[0].length} positions`]]} />
      <Caption>{`Output (${si}, ${sj}) = Σ kernel[a][b] × input[${si}·${stride} − ${pad} + a][${sj}·${stride} − ${pad} + b]: the kernel laid over the outlined 3×3 patch, multiplied cell by cell and summed. Positive responses (orange) mark places where the image looks like the kernel.`}</Caption>
    </>}
    {view === 'rf' && <>
      <Controls>
        <Slider label="Stacked conv layers" value={layers} min={1} max={8} onChange={setLayers} />
        <Slider label="Kernel size k" value={rfK} min={2} max={7} onChange={setRfK} />
        <Slider label="Stride of every layer" value={rfStride} min={1} max={2} onChange={setRfStride} />
      </Controls>
      <Table head={['layer', 'receptive field (pixels per side)', 'parameters per filter (1 channel)']} rows={Array.from({ length: layers }, (_, l) => [l + 1, stackedRF(l + 1, rfK, rfStride), rfK * rfK + 1])} />
      <Insight title="Depth widens the view">Each output of one k×k layer sees k×k inputs. Stack another layer and each of its outputs sees k×k outputs of the first — a (2k − 1)-wide patch of pixels. With stride 1 the field grows by k − 1 per layer; with stride 2 it roughly doubles each layer. Deep networks build large receptive fields out of small, cheap kernels: early layers detect edges, later layers combine them into parts and objects.</Insight>
    </>}
    {view === 'shift' && <>
      <Caption>Train on 10×10 digits placed near the **left** edge (shifts 0–1); test on digits shifted to the **right** (shifts 4–5), a position the model never saw. Both models are the same softmax classifier; only the input features differ.</Caption>
      <Controls>
        <Choice label="Input features" value={kind} onChange={v => { setKind(v); setResult(null) }} options={[['pixels', '100 raw pixels'], ['conv', '4 edge filters → ReLU → 2×2 max-pool → max over position']]} />
        <Toggle label="Augment training data with random shifts (0–5)" checked={augment} onChange={v => { setAugment(v); setResult(null) }} />
      </Controls>
      <Actions><button className="ml-primary" onClick={() => setResult(shiftExperiment({ kind, augment }))}>Train and evaluate</button></Actions>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{[0, 1, 4, 5].map(dx => <div key={dx} style={{ width: 80 }}><Grid m={digitImage(7, dx, 1, random(dx + 2))} size={7} label={`digit at shift ${dx}`} /><small>shift {dx}{dx >= 4 ? ' (test)' : ' (train)'}</small></div>)}</div>
      {result && <Metrics items={[['Training accuracy', pct(result.trainAcc)], ['Test at training positions', pct(result.sameAcc)], ['Test at unseen positions', pct(result.shiftedAcc)], ['Features per image', result.featureCount]]} />}
      <Insight title="Weight sharing and pooling">A pixel-based model learns “a 7 has ink at column 3” — useless when the 7 moves to column 7. A convolution applies the same detector at every position (**translation equivariance**: shift the input, the feature map shifts too), and pooling over position discards where a feature occurred (**approximate invariance**). Augmentation teaches a pixel model to cope by showing it every position, at a much higher cost in data. Real CNNs learn their filters; here they are fixed so the effect is easy to isolate.</Insight>
    </>}
  </>
}
