import React, { useMemo, useState } from 'react'
import { TRAIN, TEST, W, H, trainAE, trainVAE, encode, decode, reconstruct, reconError, sampleQuality, noisy } from './engine.js'
import { Plot } from '../../kit/Plot.jsx'
import { PanelHeading, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { random, fmt, pct } from '../../kit/math.js'

const DIGIT_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']
function Pixels({ img, size = 5, label }) {
  return <svg viewBox={`0 0 ${W} ${H}`} width={W * size} height={H * size} role="img" aria-label={label ?? 'digit image'} style={{ background: 'var(--surface, white)', border: '1px solid var(--border)', borderRadius: 3 }}>
    {Array.from(img).map((v, i) => <rect key={i} x={i % W} y={Math.floor(i / W)} width="1.02" height="1.02" fill="var(--text)" opacity={Math.max(0, Math.min(1, v))} />)}
  </svg>
}
const cache = {}
const getModel = (key, fn) => cache[key] ?? (cache[key] = fn())

function LatentScatter({ model, title }) {
  const pts = TEST.map(t => ({ z: encode(model, t.x), d: t.d })), b = Math.max(3, ...pts.flatMap(p => p.z.map(Math.abs))) * 1.1
  return <div><p className="ml-caption"><strong>{title}</strong></p><Plot x={[-b, b]} y={[-b, b]} height={260} width={400} xLabel="z₁" yLabel="z₂" tickFormat={v => v.toFixed(1)} label={title}>{({ X, Y }) => <>
    <rect x={X(-2.5)} y={Y(2.5)} width={X(2.5) - X(-2.5)} height={Y(-2.5) - Y(2.5)} fill="none" stroke="var(--muted)" strokeDasharray="4 3" />
    {pts.map((p, i) => <text key={i} x={X(p.z[0])} y={Y(p.z[1]) + 4} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: DIGIT_COLORS[p.d] }}>{p.d}</text>)}
  </>}</Plot></div>
}

function AEView() {
  const [latent, setLatent] = useState('2'), [denoise, setDenoise] = useState(false)
  const m = useMemo(() => getModel(`ae${latent}${denoise}`, () => trainAE({ latent: Number(latent), noise: denoise ? 0.3 : 0 })), [latent, denoise])
  const plain = useMemo(() => getModel(`ae${latent}false`, () => trainAE({ latent: Number(latent) })), [latent])
  const rng = random(8), examples = TEST.slice(0, 10).map(t => { const input = denoise ? noisy(t.x, 0.3, rng) : t.x; return { t, input, out: reconstruct(m, input) } })
  return <>
    <Controls>
      <Choice label="Bottleneck size (latent dimensions)" value={latent} onChange={setLatent} options={['2', '4', '8']} />
      <Toggle label="Denoising: corrupt inputs with noise during training and testing" checked={denoise} onChange={setDenoise} />
    </Controls>
    <Caption>An encoder squeezes each 35-pixel digit into a few numbers; a decoder rebuilds the image from them. The network is trained only to reproduce its input — no labels.</Caption>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(10, auto)', gap: 6, alignItems: 'center', justifyContent: 'start' }}>
      <small>{denoise ? 'noisy input' : 'input'}</small>{examples.map((e, i) => <Pixels key={i} img={e.input} />)}
      <small>reconstruction</small>{examples.map((e, i) => <Pixels key={i} img={e.out} />)}
    </div>
    {latent === '2' && <LatentScatter model={m} title="Test digits in the 2D latent space (labels shown only for reading)" />}
    <Metrics items={[['Reconstruction error (bits-ish: BCE per image)', fmt(reconError(m, TEST), 2)], ['Numbers per image: input → code', `35 → ${latent}`], ...(denoise ? [['Clean-up error, denoising vs plain AE', `${fmt(cleanErr(m), 4)} vs ${fmt(cleanErr(plain), 4)}`]] : [])]} />
    <Insight title="What to notice">With a 2-number bottleneck, the network must organize digits so that similar images get similar codes: the latent map groups digits even though no labels were used. Wider bottlenecks reconstruct more detail. Train on corrupted inputs but ask for the clean image, and the autoencoder learns to **remove noise** — it cannot simply copy its input, so it must learn what digits look like.</Insight>
  </>
}
function cleanErr(m) { const rng = random(4); return TEST.reduce((s, t) => { const r = reconstruct(m, noisy(t.x, 0.3, rng)); return s + r.reduce((u, v, i) => u + (v - t.x[i]) ** 2, 0) / r.length }, 0) / TEST.length }

const BETAS = ['0.1', '1', '4']
function VAEView() {
  const [beta, setBeta] = useState('1'), [useAE, setUseAE] = useState(false)
  const v = useMemo(() => getModel(`vae${beta}`, () => trainVAE({ beta: Number(beta) })), [beta])
  const ae = useMemo(() => getModel('ae2false', () => trainAE({ latent: 2 })), [])
  const m = useAE ? ae : v, q = sampleQuality(m), last = v.curve.at(-1)
  const K = 7, grid = Array.from({ length: K }, (_, i) => Array.from({ length: K }, (_, j) => decode(m, [-2.5 + 5 * j / (K - 1), 2.5 - 5 * i / (K - 1)])))
  return <>
    <Controls>
      <Choice label="β (weight on the KL term)" value={beta} onChange={setBeta} options={BETAS} />
      <Toggle label="Decode the grid with the plain autoencoder instead" checked={useAE} onChange={setUseAE} />
    </Controls>
    <div className="ml-grid-2">
      <LatentScatter model={m} title={useAE ? 'Plain autoencoder: codes of test digits' : `VAE (β = ${beta}): mean codes of test digits`} />
      <div><p className="ml-caption"><strong>Decoding a grid of codes from −2.5 to 2.5 (the dashed square)</strong></p>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${K}, auto)`, gap: 4, justifyContent: 'start' }}>{grid.flat().map((img, i) => <Pixels key={i} img={img} size={6} />)}</div></div>
    </div>
    <Metrics items={[['Random codes z ~ N(0, I) that decode to a clear digit', pct(q.recognizable)], ['Different digits among them', `${q.distinct} of 10`], ...(useAE ? [] : [['Reconstruction term (BCE)', fmt(last.rec, 2)], ['KL term', fmt(last.kl, 2)]])]} />
    <Insight title="What to notice">A plain autoencoder’s codes can sit anywhere and at any scale, so random codes often decode to a few digits or to nothing clear. The VAE encodes each image as a small Gaussian cloud and pays a **KL penalty** for straying from N(0, I): codes fill the prior smoothly, and any random draw decodes to one of all ten digits. Raise β to 4 and the penalty wins — the encoder stops using the code at all (KL ≈ 0), so every code decodes to the same average digit: **posterior collapse**. β trades reconstruction against a well-organized latent space.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('ae')
  return <>
    <PanelHeading title="Compress, reconstruct — then generate." pill="autoencoders · VAEs" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['ae', 'Autoencoders: bottlenecks and denoising'], ['vae', 'Variational autoencoder: a latent space you can sample']]} /></Controls>
    {view === 'ae' ? <AEView /> : <VAEView />}
    <Legend items={DIGIT_COLORS.map((c, d) => ['■', String(d), c])} />
  </>
}
