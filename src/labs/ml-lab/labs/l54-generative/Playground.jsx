import React, { useMemo, useState } from 'react'
import { TARGETS, sampleTarget, modeCoverage, modeShares, trainGAN, GAN_PRESETS, trainDiffusion, forwardFrames, T_STEPS } from './engine.js'
import { Plot, ProbabilityField, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { random, pct } from '../../kit/math.js'

const B = [-3.2, 3.2], REAL = sampleTarget('ring', 600, random(77))
const cache = {}
const memo = (k, f) => cache[k] ?? (cache[k] = f())
const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }

function Mini({ pts, title, real = true, height = 170 }) {
  return <div><p className="ml-caption" style={{ margin: 0 }}><strong>{title}</strong></p>
    <Plot x={B} y={B} height={height} width={260} xLabel="" yLabel="" xFormat={() => ''} yFormat={() => ''} label={title}>{({ X, Y }) => <>
      {real && REAL.slice(0, 300).map((p, i) => <circle key={`r${i}`} cx={X(p[0])} cy={Y(p[1])} r="1.6" fill="var(--muted)" opacity="0.35" />)}
      {pts.map((p, i) => <circle key={i} cx={X(Math.max(B[0], Math.min(B[1], p[0])))} cy={Y(Math.max(B[0], Math.min(B[1], p[1])))} r="1.8" fill="var(--chart-val)" opacity="0.7" />)}
    </>}</Plot></div>
}

function GanView() {
  const [preset, setPreset] = useState('balanced'), [seed, setSeed] = useState(1)
  const g = useMemo(() => memo(`gan-${preset}-${seed}`, () => trainGAN({ seed, ...GAN_PRESETS[preset].opts })), [preset, seed])
  const final = g.sample(1000), cov = modeCoverage(final), shares = modeShares(final)
  return <>
    <Controls>
      <Choice label="Training schedule" value={preset} onChange={setPreset} options={Object.entries(GAN_PRESETS).map(([k, v]) => [k, v.name])} />
      <Slider label="Random seed" value={seed} min={1} max={3} onChange={setSeed} />
    </Controls>
    <Caption>The generator turns 2D Gaussian noise into points; the discriminator tries to tell those points from real ones (grey, a ring of eight clusters). Each improves against the other. Snapshots use the same noise throughout.</Caption>
    <div style={grid3}>{g.snaps.map(s => <Mini key={s.step} pts={s.samples} title={`step ${s.step}`} />)}</div>
    <Plot x={B} y={B} height={280} xLabel="x₁" yLabel="x₂" label="Final discriminator and generated samples">{({ X, Y }) => <>
      <ProbabilityField X={X} Y={Y} x0={B[0]} x1={B[1]} y0={B[0]} y1={B[1]} p={g.finalD} cells={36} />
      {REAL.slice(0, 300).map((p, i) => <circle key={`r${i}`} cx={X(p[0])} cy={Y(p[1])} r="2" fill="var(--text)" opacity="0.4" />)}
      {final.slice(0, 400).map((p, i) => <circle key={i} cx={X(Math.max(B[0], Math.min(B[1], p[0])))} cy={Y(Math.max(B[0], Math.min(B[1], p[1])))} r="2" fill="var(--chart-val)" />)}
    </>}</Plot>
    <Legend items={[['●', 'real data', 'var(--text)'], ['●', 'generated', 'var(--chart-val)'], ['■', 'shading: where the discriminator says “real”', 'var(--chart-val)']]} />
    <Bars label="Share of generated samples near each of the 8 modes (ideal: 12.5% each)" format={pct} max={Math.max(0.3, ...shares)} items={shares.map((v, k) => ({ label: `mode ${k + 1}`, value: v }))} />
    <Metrics items={[['Modes covered (≥ 2% of samples)', `${cov.covered} of 8`], ['Samples landing on some mode', pct(cov.quality)]]} />
    <Insight title="What to notice">Nobody tells the generator where the data are; it only learns from the discriminator’s gradient, pushing samples toward regions the discriminator believes are real. With balanced training it spreads over all eight clusters. When the generator is trained much harder than the discriminator, it finds one region the discriminator currently accepts and piles everything there — **mode collapse**: sharp, convincing samples with almost no diversity. By the time the discriminator catches up, the generator jumps to another mode.</Insight>
  </>
}

function DiffusionView() {
  const fwd = useMemo(() => forwardFrames(), [])
  const d = useMemo(() => memo('diff', () => trainDiffusion()), [])
  const s = useMemo(() => d.sample(800), [d]), cov = modeCoverage(s.x), shares = modeShares(s.x)
  return <>
    <Caption>{`Forward process: add a little Gaussian noise at each of ${T_STEPS} steps until only noise is left. A network learns to predict the noise that was added; running the process backwards with it turns fresh noise into data.`}</Caption>
    <p className="ml-caption"><strong>Forward (fixed): data → noise</strong></p>
    <div style={grid3}>{fwd.map(f => <Mini key={f.t} pts={f.x} real={false} title={`t = ${f.t} · signal ×${f.signal.toFixed(2)}`} />)}</div>
    <p className="ml-caption"><strong>Reverse (learned): noise → data</strong></p>
    <div style={grid3}>{s.frames.slice(-6).map(f => <Mini key={f.t} pts={f.x} title={`t = ${f.t}`} />)}</div>
    <Bars label="Share of diffusion samples near each of the 8 modes (ideal: 12.5% each)" format={pct} max={0.3} items={shares.map((v, k) => ({ label: `mode ${k + 1}`, value: v }))} />
    <Metrics items={[['Modes covered', `${cov.covered} of 8`], ['Samples landing on some mode', pct(cov.quality)], ['Denoising network', '11 → 64 → 64 → 2']]} />
    <Insight title="What to notice">The forward process destroys structure gradually; the network only ever solves a simple regression — “what noise was added to this point at step t?” — which is stable to train, unlike the GAN game. Sampling reverses the noising in many small steps, and because the training objective covers every region of the data, diffusion models cover all modes. The price is speed: generation takes many network evaluations instead of one.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('gan')
  return <>
    <PanelHeading title="Two ways to make new data." pill="GANs · diffusion" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['gan', 'GAN: a generator versus a discriminator'], ['diffusion', 'Diffusion: learn to remove noise']]} /></Controls>
    {view === 'gan' ? <GanView /> : <DiffusionView />}
  </>
}
