import React, { useMemo, useState } from 'react'
import { W, H, START, GOAL, CHECKPOINT, isDitch, ARROWS, qLearning, valueIteration, evaluatePolicy, fromQ, fromTable, edgeWalker, rollout, movingAverage, cell } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Table, Caption, Legend, Actions } from '../../kit/ui.jsx'
import { random, pct, fmt } from '../../kit/math.js'

const C = 64

function Grid({ values, policy, path, design }) {
  const lo = Math.min(...values), hi = Math.max(...values)
  const pts = path.map(s => cell(s)).map(([x, y]) => `${x * C + C / 2},${y * C + C / 2}`).join(' ')
  return <svg viewBox={`0 0 ${W * C} ${H * C}`} className="ml-plot" role="img" aria-label="Gridworld with the policy's action in each cell" style={{ maxWidth: W * C }}>
    {Array.from({ length: W * H }, (_, s) => {
      const [x, y] = cell(s), ditch = isDitch(x, y), goal = x === GOAL[0] && y === GOAL[1], start = x === START[0] && y === START[1], cp = design === 'checkpoint' && x === CHECKPOINT[0] && y === CHECKPOINT[1]
      const t = hi > lo ? (values[s] - lo) / (hi - lo) : 0
      return <g key={s}>
        <rect x={x * C + 1} y={y * C + 1} width={C - 2} height={C - 2} rx="6" fill={ditch ? '#ef4444' : goal ? '#10b981' : 'var(--accent)'} opacity={ditch || goal ? 0.75 : 0.08 + 0.5 * t} />
        {cp && <circle cx={x * C + C / 2} cy={y * C + C / 2} r={C / 3} fill="none" stroke="#f59e0b" strokeWidth="3" />}
        <text x={x * C + C / 2} y={y * C + C / 2 + 8} textAnchor="middle" style={{ fontSize: 24, fontWeight: 700 }} fill="var(--text)">{ditch ? '' : goal ? '★' : policy(s) >= 0 ? ARROWS[policy(s)] : ''}</text>
        {start && <text x={x * C + 6} y={y * C + 16} fontSize="11" fill="var(--text)">start</text>}
        {!ditch && !goal && <text x={x * C + C - 5} y={y * C + C - 6} textAnchor="end" fontSize="9" fill="var(--muted)">{values[s].toFixed(1)}</text>}
      </g>
    })}
    <text x={3 * C} y={4 * C + C / 2 + 5} textAnchor="middle" fontSize="13" fill="white">ditch (−10, episode ends)</text>
    <polyline points={pts} fill="none" stroke="var(--text)" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.7" />
  </svg>
}

export default function Playground() {
  const [episodes, setEpisodes] = useState(400), [alpha, setAlpha] = useState(0.5), [epsilon, setEpsilon] = useState(0.1), [gamma, setGamma] = useState(0.95)
  const [slip, setSlip] = useState(0.1), [design, setDesign] = useState('task'), [show, setShow] = useState('q'), [seed, setSeed] = useState(37), [runSeed, setRunSeed] = useState(1)
  const opts = { slip, design }
  const q = useMemo(() => qLearning({ episodes, alpha, epsilon, gamma, slip, design, seed }), [episodes, alpha, epsilon, gamma, slip, design, seed])
  const vi = useMemo(() => valueIteration({ gamma, slip, design }), [gamma, slip, design])
  const policies = { q: fromQ(q.Q), vi: fromTable(vi.policy), edge: edgeWalker }
  const evals = useMemo(() => ({ q: evaluatePolicy(policies.q, opts), vi: evaluatePolicy(policies.vi, opts), edge: evaluatePolicy(policies.edge, opts) }), [q, vi, slip, design]) // eslint-disable-line react-hooks/exhaustive-deps
  const values = show === 'q' ? q.Q.map(r => Math.max(...r)) : show === 'vi' ? vi.V : Array(W * H).fill(0)
  const path = rollout(policies[show], random(runSeed), opts).path
  const task = movingAverage(q.log.map(l => l.task)), designed = movingAverage(q.log.map(l => l.ret))
  const names = { q: 'Q-learning (learned from trial and error)', vi: 'Value iteration (knows the rules)', edge: 'Hand-written: walk along the ditch' }
  return <>
    <PanelHeading title="Teach a robot to cross the yard — by reward alone." pill={`${episodes} training episodes`} />
    <Caption>The robot starts bottom-left and must reach the star. The bottom row between them is a ditch. Each move costs 0.1; the star gives +10; the ditch gives −10 and ends the episode. With **slip**, a move sometimes goes in a random direction. Nobody tells the robot the right move: it only receives rewards.</Caption>
    <Controls>
      <Choice label="Reward design" value={design} onChange={setDesign} options={[['task', 'Task reward only'], ['checkpoint', 'Task reward + 2 for entering the checkpoint (a “helpful” bonus)']]} />
      <Choice label="Show policy" value={show} onChange={setShow} options={Object.entries(names)} />
      <Slider label="Slip probability" value={slip} min={0} max={0.3} step={0.05} onChange={setSlip} format={pct} />
      <Slider label="Training episodes" value={episodes} min={0} max={1000} step={25} onChange={setEpisodes} />
      <Slider label="Exploration ε" value={epsilon} min={0} max={0.5} step={0.05} onChange={setEpsilon} />
      <Slider label="Learning rate α" value={alpha} min={0.05} max={1} step={0.05} onChange={setAlpha} />
      <Slider label="Discount γ" value={gamma} min={0.5} max={0.99} step={0.01} onChange={setGamma} />
    </Controls>
    <Grid values={values} policy={policies[show]} path={path} design={design} />
    <Legend items={[['■', 'darker = higher estimated value of the best action', 'var(--accent)'], ['┄', 'one episode following the policy', 'var(--text)'], ...(design === 'checkpoint' ? [['○', 'checkpoint: +2 every time it is entered', '#f59e0b']] : [])]} />
    <Actions><button onClick={() => setRunSeed(v => v + 1)}>Run another episode</button><button onClick={() => setSeed(v => v + 1)}>Retrain with a new seed</button></Actions>
    <Table head={['policy', 'reaches the star', 'falls in the ditch', 'times out (60 moves)', 'reward it was trained on', 'task reward']} rows={Object.entries(evals).map(([k, e]) => [names[k], pct(e.goal), pct(e.ditch), pct(e.timeout), fmt(e.ret, 2), fmt(e.task, 2)])} caption="Each policy run for 400 episodes with the current slip. The task reward is what we actually care about: −0.1 per move, +10 star, −10 ditch." />
    {q.log.length > 1 && <>
      <Plot x={[0, q.log.length - 1]} y={[-12, Math.max(12, ...designed)]} height={220} xLabel="training episode" yLabel="return (20-episode average)" xFormat={v => Math.round(v)} yFormat={v => Math.round(v)} label="Q-learning progress">{({ X, Y }) => <>
        {design === 'checkpoint' && <Path X={X} Y={Y} points={designed.map((v, i) => [i, v])} stroke="var(--chart-val)" />}
        <Path X={X} Y={Y} points={task.map((v, i) => [i, v])} stroke="var(--chart-train)" />
      </>}</Plot>
      <Legend items={[...(design === 'checkpoint' ? [['━', 'reward the agent optimizes', 'var(--chart-val)']] : []), ['━', design === 'checkpoint' ? 'task reward (what we wanted)' : 'task reward (the agent optimizes exactly this)', 'var(--chart-train)']]} />
    </>}
    <Metrics items={[['Q-learning success', pct(evals.q.goal)], ['Optimal (value iteration)', pct(evals.vi.goal)], ['Hand-written baseline', pct(evals.edge.goal)], ['Avg moves to the star (Q)', Number.isFinite(evals.q.steps) ? fmt(evals.q.steps, 1) : '—']]} />
    <Insight title="What to notice">With no slip, the shortest path along the ditch is optimal and the hand-written policy is perfect. Add slip: the edge walker falls in often, while the learned policy detours one row up — it discovered risk from experience. Now switch to the checkpoint bonus: the reward the agent optimizes goes **up** while the task reward collapses, because circling the checkpoint forever pays more than finishing. The agent is not broken; the reward is. Always evaluate against the outcome you actually want.</Insight>
  </>
}
