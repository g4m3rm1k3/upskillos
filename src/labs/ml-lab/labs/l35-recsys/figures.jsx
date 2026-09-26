// Figures placed between the paragraphs of Lab 35 (35.3, 35.4), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, Bars, MiniPlot, Path, Label, r } from '../../kit/fig.jsx'
import { makeWorld, evaluate, feedbackLoop } from './engine.js'

const WORLD = makeWorld()
const NAMES = { popularity: 'popularity', itemItem: 'item-item', factorize: 'factorization' }

// ---------- 35.3 ----------
export function HoldoutLeak() {
  const [k, setK] = useState(5)
  const res = useMemo(() => Object.keys(NAMES).map(m => ({ m, last: evaluate(WORLD.events, 120, m, { k, mode: 'last' }), rand: evaluate(WORLD.events, 120, m, { k, mode: 'random' }) })), [k])
  return <div>
    <Controls><Slider label="list length k" value={k} min={1} max={10} step={1} onChange={setK} digits={0} /></Controls>
    <Bars items={res.flatMap(x => [{ label: `${NAMES[x.m]} · last`, value: x.last.hit }, { label: `random`, value: x.rand.hit, highlight: true }])} max={1} digits={2} label={`Hit rate at ${k}: ${res.map(x => `${NAMES[x.m]} ${r(x.last.hit, 3)} time-aware, ${r(x.rand.hit, 3)} random`).join('; ')}`} />
    <Readout>Hiding a random interaction instead of the last changes the hit rates by {res.map(x => `${x.rand.hit >= x.last.hit ? '+' : ''}${r(100 * (x.rand.hit - x.last.hit), 0)}`).join(', ')} points{res.every(x => x.rand.hit > x.last.hit) ? ': every method looks better, because the model learns from what users did later' : ''}. Coverage at {k}: popularity {r(100 * res[0].last.coverage, 0)}% of the catalog, item-item {r(100 * res[1].last.coverage, 0)}%.</Readout>
  </div>
}

// ---------- 35.4 ----------
export function LoopExplore() {
  const [method, setMethod] = useState('itemItem'), [explore, setExplore] = useState(0.3)
  const runs = useMemo(() => ({ now: feedbackLoop(WORLD, { method, explore }), none: feedbackLoop(WORLD, { method, explore: 0 }) }), [method, explore])
  const pts = h => h.map(x => [x.round, x.discovered])
  return <div>
    <Controls>
      <Radio name="loop35" value={method} onChange={setMethod} options={[['popularity', 'popularity'], ['itemItem', 'item-item']]} />
      <Slider label="exploration ε" value={explore} min={0} max={1} step={0.1} onChange={setExplore} digits={1} />
    </Controls>
    <MiniPlot x={[0, 12]} y={[0.3, 1]} yTicks={8} xLabel="round" yLabel="liked items discovered" label={`Discovery over 12 rounds with ${method}: ${r(runs.now[11].discovered, 3)} at exploration ${explore}, ${r(runs.none[11].discovered, 3)} with none`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={pts(runs.none)} stroke="var(--chart-ref)" dash="4 3" />
      <Path X={X} Y={Y} points={pts(runs.now)} stroke="var(--chart-model)" />
      <Label X={X} Y={Y} x={7} y={0.4} color="var(--chart-ref)">dashed: no exploration</Label>
    </>}</MiniPlot>
    <Readout>After 12 rounds, {r(100 * runs.now[11].discovered, 0)}% of liked (user, tutorial) pairs are found (against {r(100 * runs.none[11].discovered, 0)}% without exploration). First-round click-through {r(runs.now[0].ctr, 3)} (against {r(runs.none[0].ctr, 3)}); first-round catalog shown {r(100 * runs.now[0].coverage, 0)}%.</Readout>
  </div>
}
