// Run › Train an agent…: a learning agent for this game (ml/). Say what it sees, does and earns (the
// environment spec), train it in a worker with Q-learning (a table of values over binned states) or the
// cross-entropy method (a search over a linear policy's weights), watch the scores climb, see what it
// learned, then watch it play the real game.

import React, { useEffect, useMemo, useState } from 'react';
import type { Store, TrainMethod } from './store';
import { Btn, C, useStore } from './kit';
import { Modal } from './Dialogs';
import type { EnvSpec } from '../ml/env';
import type { QEpisode, QOptions, TdAlgorithm } from '../ml/qlearning';
import { isLinearQ, isQPolicy } from '../ml/policy';
import type { LinearQOptions } from '../ml/linearq';
import { CompareView } from './CompareView';

const W = 460, H = 150, PAD = 26;

/** Axes, the zero line and random play's line, shared by both curves. */
function frame(values: number[], random: number | null) {
  const all = [...values, ...(random === null ? [] : [random]), 0];
  const lo = Math.min(...all), hi = Math.max(...all, lo + 1);
  const y = (v: number) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD - 22);   // room above for the legend
  return { lo, hi, y };
}

function Axes({ lo, hi, y, random, first, total, legend, width }: { lo: number; hi: number; y: (v: number) => number; random: number | null; first: string; total: number; legend: React.ReactNode; width?: number }) {
  const W = width ?? 460;
  return <>
    <line x1={PAD} x2={W - 8} y1={y(0)} y2={y(0)} stroke={C.border} />
    {random !== null && <><line x1={PAD} x2={W - 8} y1={y(random)} y2={y(random)} stroke={C.warn} strokeDasharray="4 3" /><text x={W - 10} y={y(random) - 4} fill={C.warn} fontSize={10} textAnchor="end">random play {random.toFixed(1)}</text></>}
    <text x={PAD} y={12} fill={C.dim} fontSize={10}>{legend}</text>
    <text x={PAD} y={H - 8} fill={C.faint} fontSize={10}>{first}</text>
    <text x={W - 8} y={H - 8} fill={C.faint} fontSize={10} textAnchor="end">{total}</text>
    <text x={4} y={y(hi) + 4} fill={C.faint} fontSize={9}>{hi.toFixed(0)}</text>
    <text x={4} y={y(lo)} fill={C.faint} fontSize={9}>{lo.toFixed(0)}</text>
  </>;
}

const svgStyle: React.CSSProperties = { display: 'block', background: C.bg, borderRadius: 4, border: `1px solid ${C.border}` };

/** Cross-entropy: best and elite-average score per generation, against random play. */
function CemCurve({ points, random, total }: { points: { best: number; eliteMean: number }[]; random: number | null; total: number }) {
  const { lo, hi, y } = frame(points.flatMap((p) => [p.best, p.eliteMean]), random);
  const x = (i: number) => PAD + (i / Math.max(1, total - 1)) * (W - PAD - 8);
  const line = (key: 'best' | 'eliteMean') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  return (
    <svg data-testid="train-curve" width={W} height={H} style={svgStyle}>
      <Axes lo={lo} hi={hi} y={y} random={random} first="generation 1" total={total} legend={<>score per episode · <tspan fill={C.ok}>best</tspan> · <tspan fill={C.accent}>elite average</tspan></>} />
      <path d={line('eliteMean')} fill="none" stroke={C.accent} strokeWidth={1.5} />
      <path d={line('best')} fill="none" stroke={C.ok} strokeWidth={2} />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.best)} r={2.5} fill={C.ok} />)}
    </svg>
  );
}

/** Q-learning: each training episode's return (faint), their average over the last 10 (blue), and the greedy checks (green). */
export function QCurve({ episodes, random, total, width }: { episodes: QEpisode[]; random: number | null; total: number; width?: number }) {
  const avg = episodes.map((_, i) => { const w = episodes.slice(Math.max(0, i - 9), i + 1); return w.reduce((s, e) => s + e.total, 0) / w.length; });
  const checks = episodes.filter((e) => e.greedy !== undefined);
  const { lo, hi, y } = frame([...episodes.map((e) => e.total), ...checks.map((e) => e.greedy!)], random);
  const Wd = width ?? W;
  const x = (ep: number) => PAD + ((ep - 1) / Math.max(1, total - 1)) * (Wd - PAD - 8);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg data-testid="train-curve" width={Wd} height={H} style={svgStyle}>
      <Axes lo={lo} hi={hi} y={y} random={random} first="episode 1" total={total} width={Wd} legend={width ? <>return · <tspan fill={C.accent}>last 10</tspan> · <tspan fill={C.ok}>greedy</tspan></> : <>return per episode · <tspan fill={C.faint}>each</tspan> · <tspan fill={C.accent}>last 10 averaged</tspan> · <tspan fill={C.ok}>greedy check</tspan></>} />
      <path d={path(episodes.map((e) => e.total))} fill="none" stroke={C.faint} strokeWidth={1} />
      <path d={path(avg)} fill="none" stroke={C.accent} strokeWidth={2} />
      {checks.map((e) => <circle key={e.episode} cx={x(e.episode)} cy={y(e.greedy!)} r={3} fill={C.ok} />)}
    </svg>
  );
}

/** Bin i of cut points [c₁ … cₖ] in words: below c₁, between two cuts, or from cₖ up. */
const binText = (cuts: number[], i: number) => (i === 0 ? `< ${cuts[0]}` : i === cuts.length ? `≥ ${cuts[i - 1]}` : `${cuts[i - 1]} to ${cuts[i]}`);
/** A name to show: a node path's property, without the node (Ball:position.x − … → position.x − Paddle). */
const shortName = (name: string) => name.replace(/^[^:\s]*:/, '').replace(/ − ([^:]*):.*$/, ' − $1');

type Described = { actions: string[]; observation: string[]; bins: number[][] };

/** The Q table: one row per state (a bin of each binned reading), one column per action; the highest is what it does. */
function QTable({ described, table, visits }: { described: Described; table: number[][]; visits: number[] | null }) {
  const binned = described.bins.map((cuts, i) => ({ cuts, name: described.observation[i] ?? `seen ${i + 1}` })).filter((x) => x.cuts.length);
  const decode = (s: number) => {
    const out: number[] = [];
    for (let k = binned.length - 1; k >= 0; k--) { const n = binned[k].cuts.length + 1; out[k] = s % n; s = Math.floor(s / n); }
    return out;
  };
  const cell: React.CSSProperties = { padding: '1px 6px', textAlign: 'right' };
  return (
    <div style={{ maxHeight: 220, overflow: 'auto', border: `1px solid ${C.border}`, borderRadius: 3 }}>
      <table data-testid="train-qtable" style={{ fontSize: 11, fontFamily: C.mono, borderCollapse: 'collapse', color: C.text, width: '100%' }}>
        <thead><tr style={{ position: 'sticky', top: 0, background: C.panel2 }}>
          <td style={{ color: C.faint, padding: '1px 6px' }}>s</td>
          {binned.map((b) => <td key={b.name} style={{ color: C.faint, padding: '1px 6px' }}>{shortName(b.name)}</td>)}
          {described.actions.map((a, i) => <td key={i} style={{ ...cell, color: C.faint }}>Q(s, {a})</td>)}
          {visits && <td style={{ ...cell, color: C.faint }} title="Updates made from this state: a row updated rarely holds a rough estimate">visits</td>}
        </tr></thead>
        <tbody>{table.map((row, s) => {
          const bins = decode(s), best = row.indexOf(Math.max(...row)), untried = visits ? visits[s] === 0 : row.every((q) => q === 0);
          return (
            <tr key={s} style={{ color: untried ? C.faint : C.text }} title={untried ? 'Never updated: the agent has not been in this state' : undefined}>
              <td style={{ padding: '1px 6px', color: C.faint }}>{s}</td>
              {binned.map((b, k) => <td key={k} style={{ padding: '1px 6px' }}>{binText(b.cuts, bins[k])}</td>)}
              {row.map((q, a) => <td key={a} style={{ ...cell, color: !untried && a === best ? C.ok : undefined, fontWeight: !untried && a === best ? 700 : 400 }}>{q.toFixed(2)}</td>)}
              {visits && <td style={{ ...cell, color: C.faint }}>{visits[s]}</td>}
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

/** Where to save a brain: brains/ and the agent's name (or the project's), lower case. */
const brainPathFor = (spec: EnvSpec | null, project: string) => `brains/${((spec?.agent ?? project).split('/').pop() ?? 'agent').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'agent'}.json`;

/** The Q-learning settings the dialog trains with (in the worker, or in view). */
export interface TdSettings { episodes: number; algorithm: TdAlgorithm; alpha: number; gamma: number; explore: 'epsilon' | 'softmax'; schedule: 'linear' | 'exponential' | 'constant'; start: number; end: number; initialQ: number }
export const DEFAULT_TD: TdSettings = { episodes: 100, algorithm: 'q', alpha: 0.2, gamma: 0.97, explore: 'epsilon', schedule: 'linear', start: 0.3, end: 0.02, initialQ: 0 };
export const qOptions = (t: TdSettings): QOptions => ({
  episodes: t.episodes, algorithm: t.algorithm, alpha: t.alpha, gamma: t.gamma, explore: t.explore, schedule: t.schedule,
  ...(t.explore === 'softmax' ? { temperature: t.start, temperatureEnd: t.end } : { epsilon: t.start, epsilonEnd: t.end }),
  ...(t.initialQ ? { initialQ: t.initialQ } : {}), seed: 3, checkEvery: 10,
});
/** A setting in a line, for the comparison's legend. */
export const settingsLabel = (t: TdSettings) => `${ALGORITHM_TEXT[t.algorithm][0]}, α ${t.alpha}, γ ${t.gamma}, ${t.explore === 'softmax' ? 'τ' : 'ε'} ${t.start}${t.schedule === 'constant' ? '' : `→${t.end} ${t.schedule}`}${t.initialQ ? `, Q₀ ${t.initialQ}` : ''}, ${t.episodes} ep.`;

/** What each update is, in a line (Sutton & Barto ch. 6). */
export const ALGORITHM_TEXT: Record<TdAlgorithm, [string, string]> = {
  q: ['Q-learning', 'target r + γ max Q(s′, ·): learns the greedy policy\'s values while exploring (off-policy)'],
  sarsa: ['SARSA', 'target r + γ Q(s′, a′), a′ the action it takes next: learns the exploring policy\'s values (on-policy)'],
  'expected-sarsa': ['Expected SARSA', 'target r + γ Σ π(a′|s′) Q(s′, a′): SARSA without the randomness of a′'],
  'double-q': ['Double Q-learning', 'two tables: one picks the best next action, the other values it, so noise is not mistaken for value'],
};

/** Linear Q's settings (ml/linearq.ts): the step size and exploration each fall from a start to an end over training. */
export interface LinearSettings { episodes: number; algorithm: 'q' | 'sarsa'; alpha: number; alphaEnd: number; gamma: number; start: number; end: number }
export const DEFAULT_LINEAR: LinearSettings = { episodes: 2000, algorithm: 'q', alpha: 0.1, alphaEnd: 0.005, gamma: 1, start: 0.2, end: 0.02 };
export const linearOptions = (l: LinearSettings): LinearQOptions => ({
  episodes: l.episodes, algorithm: l.algorithm, alpha: l.alpha, alphaEnd: l.alphaEnd, gamma: l.gamma, epsilon: l.start, epsilonEnd: l.end,
  schedule: 'linear', seed: 1, checkEvery: Math.max(10, Math.round(l.episodes / 20)), checkEpisodes: 100,
});

/** Linear Q's weights: one per feature. A positive weight makes a move worth more the more it has of that feature. */
function WeightTable({ features, weights }: { features: string[]; weights: number[] }) {
  const top = Math.max(1e-9, ...weights.map(Math.abs));
  return (
    <div style={{ maxHeight: 260, overflow: 'auto', border: `1px solid ${C.border}`, borderRadius: 3 }}>
      <table data-testid="train-feature-weights" style={{ fontSize: 11, fontFamily: C.mono, borderCollapse: 'collapse', color: C.text, width: '100%' }}>
        <tbody>{features.map((f, i) => (
          <tr key={f}>
            <td style={{ padding: '1px 6px', whiteSpace: 'nowrap' }}>{f}</td>
            <td style={{ padding: '1px 6px', textAlign: 'right', color: weights[i] >= 0 ? C.ok : C.warn }}>{weights[i].toFixed(2)}</td>
            <td style={{ padding: '1px 6px', width: 120 }}>
              <div style={{ height: 8, width: `${(Math.abs(weights[i]) / top) * 100}%`, background: weights[i] >= 0 ? C.ok : C.warn, marginLeft: 0, borderRadius: 2 }} />
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function TrainDialog({ store, onClose, onWatch, onTrainInView }: { store: Store; onClose: () => void; onWatch: () => void; onTrainInView: (spec: EnvSpec, options: QOptions) => void }) {
  useStore(store);
  const t = store.training;
  const [text, setText] = useState(() => JSON.stringify(t.spec ?? store.defaultAgentSpec(), null, 2));
  // An agent with no bins is a turn-based one (a card game's player): it learns with features, not a table.
  const [method, setMethod] = useState<TrainMethod | 'compare'>(() => {
    const s = t.spec ?? store.defaultAgentSpec();
    return !t.spec && s.agent && !s.bins ? 'linear-q' : t.method;
  });
  const [generations, setGenerations] = useState(10);
  const [population, setPopulation] = useState(24);
  const [td, setTd] = useState<TdSettings>(store.tdSettings ?? DEFAULT_TD);
  const [lin, setLin] = useState<LinearSettings>(DEFAULT_LINEAR);
  const setL = (patch: Partial<LinearSettings>) => setLin((l) => ({ ...l, ...patch }));
  const setT = (patch: Partial<TdSettings>) => setTd((t) => { const n = { ...t, ...patch }; store.tdSettings = n; return n; });
  const parsed = useMemo((): { spec: EnvSpec } | { error: string } => {
    try {
      const spec = JSON.parse(text) as EnvSpec;
      if (typeof spec.agent === 'string') {
        // A script agent: its script says what it sees, does and earns; the spec gives the bins (a table needs them).
        if (method === 'linear-q') return { spec };
        if (method !== 'cem' && !(Array.isArray(spec.bins) && spec.bins.some((c) => Array.isArray(c) && c.length))) return { error: 'Q-learning needs "bins": a list of cut points for each number the agent\'s observe() returns ([] for one that is not binned).' };
        return { spec };
      }
      if (method === 'linear-q') return { error: 'Linear Q needs "agent": an agent whose script has features(action).' };
      if (!Array.isArray(spec.actions) || !Array.isArray(spec.observation) || !Array.isArray(spec.reward)) return { error: 'It needs actions, observation and reward lists, or "agent": the path of a node whose script has observe() and act().' };
      if (method !== 'cem' && !spec.observation.some((o) => o.bins?.length)) return { error: 'Q-learning needs "bins" on at least one observation reading: the cut points that turn its numbers into states.' };
      return { spec };
    } catch (e) { return { error: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}` }; }
  }, [text, method]);
  // The environment as typed, for a task's checks (whether it parses for training or not).
  useEffect(() => {
    let spec: EnvSpec | null = null;
    try { spec = JSON.parse(text) as EnvSpec; } catch { /* not JSON yet */ }
    store.setTrainDraft(spec && typeof spec === 'object' ? spec : null);
  }, [text, store]);
  const sel: React.CSSProperties = { background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 3, padding: '2px 4px' };
  const num: React.CSSProperties = { width: 50, background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 3, padding: '2px 4px' };
  const field = (label: string, value: number, set: (v: number) => void, opts: { min: number; max: number; step?: number; testid?: string; title?: string }) => (
    <label title={opts.title} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{label}
      <input data-testid={opts.testid} type="number" min={opts.min} max={opts.max} step={opts.step && opts.step < 1 ? 'any' : opts.step ?? 1} value={value} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) set(Math.min(opts.max, Math.max(opts.min, v))); }} style={num} />
    </label>
  );
  const spec = t.spec ?? ('spec' in parsed ? parsed.spec : null);
  const [brainPath, setBrainPath] = useState(() => brainPathFor(t.spec, store.doc?.project.name ?? 'agent'));
  const savedBrain = store.doc?.project.brains?.find((b) => b.path === brainPath);
  const shown = t.method;   // what the curve and results show: the run that happened, not the radio
  const lastGen = t.generations.at(-1), lastEp = t.episodes.at(-1);
  const lastCheck = [...t.episodes].reverse().find((e) => e.greedy !== undefined);
  const start = () => {
    if (!('spec' in parsed)) return;
    if (method === 'q') store.startTraining(parsed.spec, { method: 'q', options: qOptions(td) });
    else if (method === 'linear-q') store.startTraining(parsed.spec, { method: 'linear-q', options: linearOptions(lin) });
    else store.startTraining(parsed.spec, { method: 'cem', options: { generations, population, elite: 0.2, noise: 1, seed: 3 } });
  };
  const status = t.error ? `Could not train: ${t.error}`
    : t.running ? (shown === 'linear-q'
      ? (lastEp ? `Episode ${lastEp.episode} of ${t.total}: return ${lastEp.total.toFixed(1)}, ε ${lastEp.epsilon.toFixed(2)}${lastCheck ? `; last greedy check ${lastCheck.greedy!.toFixed(2)}` : ''}` : 'Starting: loading the game and playing at random first…')
      : shown === 'q'
      ? (lastEp ? `Episode ${lastEp.episode} of ${t.total}: return ${lastEp.total.toFixed(1)}, ε ${lastEp.epsilon.toFixed(2)}, ${lastEp.visited} states visited${lastCheck ? `; last greedy check ${lastCheck.greedy!.toFixed(1)}` : ''}` : 'Starting: loading the game and playing at random first…')
      : (lastGen ? `Generation ${lastGen.generation} of ${t.total}: best ${lastGen.best.toFixed(1)}, elite average ${lastGen.eliteMean.toFixed(1)}` : 'Starting: loading the game and playing at random first…'))
    : t.score !== null ? `Trained. It averages ${t.score.toFixed(shown === 'linear-q' ? 2 : 1)} an episode; playing at random averages ${t.random?.toFixed(shown === 'linear-q' ? 2 : 1)}.`
    : 'Not trained yet.';
  return (
    <Modal title="Train an agent" onClose={() => { onClose(); }} width={800} testid="train-dialog">
      <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, marginBottom: 10 }}>
        An agent learns to play this game from its <b>state</b>, the numbers in its nodes, not its pixels. Say what it <b>sees</b> (observation:
        node paths like <code>Ball:position.x</code>, optionally <code>minus</code> another, and for Q-learning the <code>bins</code> that cut each
        number into states), what it can <b>do</b> (actions: input actions held for a step) and what it <b>earns</b> (reward: how much each value
        changes). Training plays the game headless, on the real engine with your scripts.
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, fontSize: 12, color: C.dim }}>
        method
        <Btn small testid="train-method-q" active={method === 'q'} onClick={() => setMethod('q')} title="A table of Q(s, a): the return it expects for each action in each state, learned from every step (Q-learning, SARSA and their relatives)">Table (TD)</Btn>
        <Btn small testid="train-method-compare" active={method === 'compare'} onClick={() => setMethod('compare')} title="Several settings, each trained over the same seeds: averaged learning curves, and mean ± spread">Compare</Btn>
        <Btn small testid="train-method-linear-q" active={method === 'linear-q'} onClick={() => setMethod('linear-q')} title="Q(s, a) = weights · features of the move: for a turn-based agent (a card game) whose script describes each legal move as numbers">Features (linear Q)</Btn>
        <Btn small testid="train-method-cem" active={method === 'cem'} onClick={() => setMethod('cem')} title="Many random weightings of a linear policy; keep the best and search around them">Cross-entropy</Btn>
        <span style={{ color: C.faint, marginLeft: 6 }}>{method === 'linear-q' ? 'learns one weight per feature of a move, from every move it makes: for games with too many states for a table' : method === 'q' ? 'learns a value for every state and action, one step at a time (ML Lab lessons 37.4 and 37.5)' : method === 'compare' ? 'settings side by side, each averaged over seeds: add the current settings, change them, add again' : 'searches over the weights of a linear policy, one whole game at a time'}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: C.faint, fontWeight: 700, marginBottom: 4 }}>ENVIRONMENT (JSON)</div>
          <textarea data-testid="train-spec" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.stopPropagation()} spellCheck={false}
            style={{ width: '100%', height: 300, boxSizing: 'border-box', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 3, fontFamily: C.mono, fontSize: 11, padding: 6 }} />
          {'error' in parsed && <div data-testid="train-spec-error" style={{ color: C.warn, fontSize: 11 }}>{parsed.error}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, fontSize: 12, color: C.dim, flexWrap: 'wrap' }}>
            {method === 'linear-q' ? <>
              <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>update
                <select data-testid="train-linear-algorithm" value={lin.algorithm} onChange={(e) => setL({ algorithm: e.target.value as 'q' | 'sarsa' })} style={sel}>
                  <option value="q">Q-learning</option><option value="sarsa">SARSA</option>
                </select>
              </label>
              {field('episodes', lin.episodes, (v) => setL({ episodes: v }), { min: 1, max: 20000, testid: 'train-episodes' })}
              {field('α from', lin.alpha, (v) => setL({ alpha: v }), { min: 0.0001, max: 1, step: 0.01, testid: 'train-alpha', title: 'Step size at the start: how far each update moves the weights' })}
              {field('to', lin.alphaEnd, (v) => setL({ alphaEnd: v }), { min: 0.0001, max: 1, step: 0.001, testid: 'train-alpha-end', title: 'Step size at the end: smaller, so the weights settle' })}
              {field('γ', lin.gamma, (v) => setL({ gamma: v }), { min: 0, max: 1, step: 0.01, testid: 'train-gamma', title: 'Discount per move' })}
              {field('ε from', lin.start, (v) => setL({ start: v }), { min: 0, max: 1, step: 0.05, testid: 'train-epsilon', title: 'Exploration at the start: a random legal move with this probability' })}
              {field('to', lin.end, (v) => setL({ end: v }), { min: 0, max: 1, step: 0.01, testid: 'train-epsilon-end' })}
            </> : method !== 'cem' ? <>
              <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>update
                <select data-testid="train-algorithm" value={td.algorithm} onChange={(e) => setT({ algorithm: e.target.value as TdAlgorithm })} style={sel} title={ALGORITHM_TEXT[td.algorithm][1]}>
                  {(Object.keys(ALGORITHM_TEXT) as TdAlgorithm[]).map((a) => <option key={a} value={a}>{ALGORITHM_TEXT[a][0]}</option>)}
                </select>
              </label>
              {field('episodes', td.episodes, (v) => setT({ episodes: v }), { min: 1, max: 5000, testid: 'train-episodes' })}
              {field('α', td.alpha, (v) => setT({ alpha: v }), { min: 0.01, max: 1, step: 0.05, testid: 'train-alpha', title: 'Step size: how far each update moves Q(s, a) towards its target' })}
              {field('γ', td.gamma, (v) => setT({ gamma: v }), { min: 0, max: 1, step: 0.01, testid: 'train-gamma', title: 'Discount per step: a reward k steps away counts γ^k' })}
              <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>explore
                <select data-testid="train-explore" value={td.explore} onChange={(e) => { const explore = e.target.value as 'epsilon' | 'softmax'; setT(explore === 'softmax' ? { explore, start: 1, end: 0.05 } : { explore, start: 0.3, end: 0.02 }); }} style={sel}>
                  <option value="epsilon">ε-greedy</option><option value="softmax">softmax</option>
                </select>
              </label>
              {field(td.explore === 'softmax' ? 'τ from' : 'ε from', td.start, (v) => setT({ start: v }), { min: 0, max: td.explore === 'softmax' ? 100 : 1, step: 0.05, testid: 'train-epsilon', title: td.explore === 'softmax' ? 'Temperature at the start: high is nearly random, low is nearly greedy' : 'Exploration at the start: a random action with this probability' })}
              {field('to', td.end, (v) => setT({ end: v }), { min: 0, max: td.explore === 'softmax' ? 100 : 1, step: 0.01, testid: 'train-epsilon-end', title: 'Its value at the last episode' })}
              <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} title="How it goes from the start to the end: a straight line, the same ratio each episode, or not at all">
                <select data-testid="train-schedule" value={td.schedule} onChange={(e) => setT({ schedule: e.target.value as TdSettings['schedule'] })} style={sel}>
                  <option value="linear">linear</option><option value="exponential">exponential</option><option value="constant">constant</option>
                </select>
              </label>
              {field('Q₀', td.initialQ, (v) => setT({ initialQ: v }), { min: -1000, max: 1000, step: 1, testid: 'train-initial-q', title: 'Every Q value starts here. Higher than any return it can earn is "optimistic": untried actions look best, so it tries them' })}
            </> : <>
              {field('generations', generations, setGenerations, { min: 1, max: 200, testid: 'train-generations' })}
              {field('population', population, setPopulation, { min: 4, max: 200 })}
            </>}
            <span style={{ flex: 1 }} />
            {method === 'compare'
              ? <Btn testid="compare-add" disabled={!('spec' in parsed) || store.comparison.running} onClick={() => store.addCompareConfig({ label: settingsLabel(td), options: qOptions(td) })}>+ Add to comparison</Btn>
              : t.running
              ? <Btn testid="train-stop" onClick={() => store.stopTraining()}>Stop</Btn>
              : <>
                {method === 'q' && <Btn testid="train-in-view" disabled={!('spec' in parsed)} title="Train inside the running game: watch every episode as it learns (slower; set the speed while it runs)" onClick={() => 'spec' in parsed && onTrainInView(parsed.spec, qOptions(td))}>▶ Train in view</Btn>}
                <Btn testid="train-start" disabled={!('spec' in parsed)} title="Train headless, as fast as it can go" onClick={start}>Train</Btn>
              </>}
          </div>
        </div>
        <div style={{ width: 470 }}>
          {method === 'compare' ? <CompareView store={store} spec={'spec' in parsed ? parsed.spec : null} /> : <>
          {shown === 'q' || shown === 'linear-q'
            ? <QCurve episodes={t.episodes} random={t.random} total={t.total || (shown === 'q' ? td.episodes : lin.episodes)} />
            : <CemCurve points={t.generations} random={t.random} total={t.total || generations} />}
          <div data-testid="train-status" style={{ fontSize: 12, color: t.error ? C.warn : C.dim, margin: '6px 0' }}>{status}</div>
          {shown === 'q' && t.table && t.described && (
            <>
              <div style={{ fontSize: 11, color: C.faint, fontWeight: 700, margin: '8px 0 4px' }}>
                {t.running ? 'THE TABLE AT THE LAST CHECK' : 'WHAT IT LEARNED'} (each row a state, each column an action; Q(s, a) is the return it expects; it plays the green one)
              </div>
              <QTable described={t.described} table={t.table} visits={t.visits} />
            </>
          )}
          {shown === 'linear-q' && t.described?.features && (t.weights ?? (t.policy && isLinearQ(t.policy) ? t.policy.weights : null)) && (
            <>
              <div style={{ fontSize: 11, color: C.faint, fontWeight: 700, margin: '8px 0 4px' }}>
                {t.running ? 'THE WEIGHTS AT THE LAST CHECK' : 'WHAT IT LEARNED'} (a move's Q is the sum of weight × feature; it plays the legal move with the highest)
              </div>
              <WeightTable features={t.described.features} weights={(t.weights ?? (t.policy && isLinearQ(t.policy) ? t.policy.weights : []))!} />
            </>
          )}
          {shown === 'cem' && t.policy && !isQPolicy(t.policy) && !isLinearQ(t.policy) && t.described && (
            <>
              <div style={{ fontSize: 11, color: C.faint, fontWeight: 700, margin: '8px 0 4px' }}>WHAT IT LEARNED (the weights: for each action, a score from what it sees; it takes the highest)</div>
              <table data-testid="train-weights" style={{ fontSize: 11, fontFamily: C.mono, borderCollapse: 'collapse', color: C.text }}>
                <thead><tr><td style={{ color: C.faint, paddingRight: 8 }}>action</td>{t.described.observation.map((o, i) => <td key={i} style={{ color: C.faint, padding: '0 6px' }} title={o}>{shortName(o)}</td>)}<td style={{ color: C.faint, padding: '0 6px' }}>bias</td></tr></thead>
                <tbody>{t.policy.weights.map((w, a) => <tr key={a}><td style={{ paddingRight: 8 }}>{t.described!.actions[a] ?? a}</td>{w.map((v, i) => <td key={i} style={{ padding: '0 6px', textAlign: 'right', color: v >= 0 ? C.ok : C.warn }}>{v.toFixed(2)}</td>)}</tr>)}</tbody>
              </table>
            </>
          )}
          {t.policy && !t.running && (
            <>
              <div style={{ marginTop: 10 }}>
                <Btn testid="train-watch" onClick={onWatch}>▶ Watch it play</Btn>
                <span style={{ fontSize: 11, color: C.faint, marginLeft: 8 }}>Runs the game with the agent at the controls. ■ Stop ends it.</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: C.dim }}>
                <input data-testid="train-brain-path" value={brainPath} onChange={(e) => setBrainPath(e.target.value)} onKeyDown={(e) => e.stopPropagation()} spellCheck={false}
                  style={{ width: 190, background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 3, padding: '2px 4px', fontFamily: C.mono, fontSize: 11 }} />
                <Btn testid="train-save-brain" onClick={() => store.saveBrain(brainPath)}>{savedBrain ? 'Replace brain' : 'Save as brain'}</Btn>
              </div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>
                {t.spec?.agent
                  ? <>Saved in the project and exported with the game. In {t.spec.agent}'s script, <code>brain = '{brainPath}'</code> makes the game use it.</>
                  : <>Saved in the project and exported with the game. A script can ask it what to do: <code>ai.act('{brainPath}', numbers)</code>.</>}
              </div>
            </>
          )}
          </>}
        </div>
      </div>
    </Modal>
  );
}
