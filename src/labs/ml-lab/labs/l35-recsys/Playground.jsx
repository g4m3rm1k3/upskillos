import React, { useMemo, useState } from 'react'
import { ITEMS, TOPICS, makeWorld, matrix, MODELS, recommend, evaluate, feedbackLoop, clickProb } from './engine.js'
import { Plot, Path, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Table, Caption, Legend, Warning } from '../../kit/ui.jsx'
import { pct, fmt } from '../../kit/math.js'

const METHODS = [['popularity', 'Most popular'], ['itemItem', 'Item-item collaborative filtering'], ['factorize', 'Matrix factorization (ALS)']]
const label = m => METHODS.find(x => x[0] === m)[1]

export default function Playground() {
  const world = useMemo(() => makeWorld(), [])
  const [view, setView] = useState('recommend'), [method, setMethod] = useState('itemItem'), [k, setK] = useState(5)
  const [user, setUser] = useState('3'), [mode, setMode] = useState('last'), [explore, setExplore] = useState(0.3)
  const nU = world.users.length
  // Everything observed so far, plus one extra row for a brand-new user.
  const R = useMemo(() => [...matrix(world.events, nU), Array(ITEMS.length).fill(0)], [world, nU])
  const model = useMemo(() => MODELS[method](R), [method, R])
  const u = Number(user), isNew = u === nU, scores = model(u), recs = recommend(model, R, u, k)
  const tied = recs.every(i => scores[i] === scores[recs[0]])
  const evals = useMemo(() => METHODS.map(([m]) => ({ m, ...evaluate(world.events, nU, m, { k, mode }) })), [world, nU, k, mode])
  const loops = useMemo(() => view !== 'loop' ? null : { none: feedbackLoop(world, { method, explore: 0 }), chosen: feedbackLoop(world, { method, explore }), pop: feedbackLoop(world, { method: 'popularity', explore: 0 }) }, [view, world, method, explore])
  const history = isNew ? [] : world.events.filter(e => e.user === u).map(e => ITEMS[e.item].name)
  return <>
    <PanelHeading title="Which tutorial should each learner see next?" pill={`${nU} users · ${ITEMS.length} tutorials`} />
    <Caption>A learning platform records which tutorials each user opened — **implicit feedback**: no ratings, and a missing interaction means “not seen or not interested”, not “disliked”. The simulator knows each user’s true tastes, so you can see what the recommender gets right and what it can never observe.</Caption>
    <Controls><Choice label="View" value={view} onChange={setView} options={[['recommend', 'Recommend for one user'], ['evaluate', 'Offline evaluation'], ['loop', 'Feedback loop over time']]} /><Choice label="Recommender" value={method} onChange={setMethod} options={METHODS} /></Controls>
    {view === 'recommend' && <>
      <Controls>
        <Choice label="User" value={user} onChange={setUser} options={[...[13, 3, 8, 7, 22, 1].map(i => [String(i), `User ${i} (${TOPICS[world.users[i].main]} fan)`]), [String(nU), 'Brand-new user (no history)']]} />
        <Slider label="Recommendations (k)" value={k} min={1} max={8} onChange={setK} />
      </Controls>
      <p className="ml-caption"><strong>History:</strong> {history.length ? history.join(' → ') : 'none yet'}</p>
      <Table head={['rank', 'tutorial', 'model score', 'true click chance (simulator only)']} rows={recs.map((i, r) => [r + 1, ITEMS[i].name, fmt(scores[i], 3), isNew ? '—' : pct(clickProb(world.users[u], ITEMS[i]))])} />
      {tied && <Warning>{`Every recommended item has the same score (${fmt(scores[recs[0]], 3)}): this model has no information about this user, so the order is arbitrary. This is the cold-start problem — fall back to popularity, ask about interests at sign-up, or use item content.`}</Warning>}
      <Insight title="Compare the three recommenders">Popularity shows every user the same list. Item-item filtering scores a tutorial by how often it was opened by the same people who opened this user’s tutorials. Matrix factorization learns a few hidden “taste” numbers per user and per tutorial. Both personalized methods need history: switch to the brand-new user and watch them fail.</Insight>
    </>}
    {view === 'evaluate' && <>
      <Controls>
        <Choice label="Held-out interaction per user" value={mode} onChange={setMode} options={[['last', 'The most recent one (time-aware)'], ['random', 'A random one (leaks the future)']]} />
        <Slider label="List length (k)" value={k} min={1} max={8} onChange={setK} />
      </Controls>
      <Bars label={`Hit rate@${k}`} format={pct} max={1} items={evals.map(e => ({ label: label(e.m), value: e.hit }))} />
      <Table head={['recommender', `hit rate@${k}`, `NDCG@${k}`, 'catalog coverage']} rows={evals.map(e => [label(e.m), pct(e.hit), fmt(e.ndcg, 3), pct(e.coverage)])} caption={`${evals[0].n} users, one held-out interaction each; the model trains on everything else and recommends only tutorials the user has not opened.`} />
      <Insight title="What to notice">{`Hiding a random interaction lets the model train on things the user did afterwards, so every score rises — a leak (Lab 06). In production you always predict the next interaction from the past. Coverage shows how much of the catalog ever gets recommended: popularity scores well while showing only a handful of tutorials.`}</Insight>
    </>}
    {view === 'loop' && loops && <>
      <Controls><Slider label="Exploration: share of slots given to random unseen tutorials" value={explore} min={0} max={1} step={0.05} onChange={setExplore} format={pct} /></Controls>
      <Caption>For 12 rounds, every user sees 3 tutorials; clicks are added to the data and the model retrains. **Discovery** is the share of tutorials each user would probably like (true click chance above 50%) that they have found. Only a simulator can measure it — a real system never sees the tutorials it did not show.</Caption>
      <Plot x={[1, 12]} y={[0, 1]} xTicks={12} height={240} xLabel="round" yLabel="discovery" yFormat={pct} label="Discovery over time">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={loops.pop.map(h => [h.round, h.discovered])} stroke="var(--muted)" dash="5 4" />
        <Path X={X} Y={Y} points={loops.none.map(h => [h.round, h.discovered])} stroke="var(--chart-train)" />
        <Path X={X} Y={Y} points={loops.chosen.map(h => [h.round, h.discovered])} stroke="var(--accent)" />
      </>}</Plot>
      <Legend items={[['┄', 'popularity, no exploration', 'var(--muted)'], ['━', `${label(method)}, no exploration`, 'var(--chart-train)'], ['━', `${label(method)}, ${pct(explore)} exploration`, 'var(--accent)']]} />
      <Metrics items={[['Discovery after 12 rounds', pct(loops.chosen.at(-1).discovered)], ['Total clicks', String(loops.chosen.reduce((s, h) => s + h.clicks, 0))], ['First-round CTR', pct(loops.chosen[0].ctr)], ['Round-1 catalog coverage', pct(loops.chosen[0].coverage)]]} />
      <Insight title="The loop feeds itself">Recommendations decide what users can click, and clicks become the next training data. A popularity recommender starts by showing a fraction of the catalog; tutorials never shown can never gain clicks. Some exploration costs a little immediate click-through but finds more of what users like; all exploration and no model is worse again. Logged data from such a system is **biased by its own past choices** — keep exploration logs to evaluate new policies fairly.</Insight>
    </>}
  </>
}
