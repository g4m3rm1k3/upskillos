// Figures for the Frontier series (docs/frontier-ai-series-plan.md), placed in lesson steps with
// ```figure fences. Each shows one idea with the lesson's own numbers, and says its result in words.
import React, { useState } from 'react';
import { Controls, Slider, Check, Readout, MiniPlot, Path, Label, Table, curve, r } from '../../ml-lab/kit/fig.jsx';

// ---------- 2.1: how the number of steps grows with n ----------
const GROWTH = [
  { key: '1', name: 'O(1)', f: () => 1, color: 'var(--chart-good)' },
  { key: 'log', name: 'O(log n)', f: (n) => Math.max(1, Math.log2(n)), color: 'var(--chart-train)' },
  { key: 'n', name: 'O(n)', f: (n) => n, color: 'var(--chart-model)' },
  { key: 'nlog', name: 'O(n log n)', f: (n) => n * Math.max(1, Math.log2(n)), color: 'var(--chart-val)' },
  { key: 'n2', name: 'O(n²)', f: (n) => n * n, color: 'var(--chart-bad)' },
];
const big = (v) => (v >= 1e6 ? `${r(v / 1e6, 2)} million` : Math.round(v).toLocaleString('en'));

// n: where the slider starts; max: the slider's top; show: which curves start ticked.
export function GrowthCurves({ n: start = 16, max = 64, show = ['1', 'log', 'n', 'nlog', 'n2'] }) {
  const [n, setN] = useState(start);
  const [on, setOn] = useState(Object.fromEntries(GROWTH.map((g) => [g.key, show.includes(g.key)])));
  const shown = GROWTH.filter((g) => on[g.key]);
  const top = Math.max(4, ...shown.map((g) => g.f(max)));
  return <div>
    <Controls>
      <Slider label="n" value={n} min={2} max={max} step={1} onChange={setN} digits={0} />
      {GROWTH.map((g) => <Check key={g.key} label={g.name} checked={on[g.key]} onChange={(v) => setOn({ ...on, [g.key]: v })} />)}
    </Controls>
    <MiniPlot x={[0, max]} y={[0, top]} xLabel="n (how much data)" yLabel="steps" label={`Steps against n for ${shown.map((g) => g.name).join(', ')}`}>{({ X, Y }) => <>
      {shown.map((g) => <Path key={g.key} X={X} Y={Y} points={curve(g.f, 1, max, 120)} stroke={g.color} width={2} />)}
      {shown.map((g) => <circle key={g.key} cx={X(n)} cy={Y(g.f(n))} r={4} fill={g.color} />)}
      {shown.map((g) => g.f(max) / top > 0.04 && <Label key={g.key} X={X} Y={Y} x={max} y={g.f(max)} anchor="end" color={g.color}>{`${g.name} `}</Label>)}
    </>}</MiniPlot>
    <Table head={['growth', `steps at n = ${n}`, `at n = ${2 * n}`, 'doubling n multiplies the steps by']}
      rows={shown.map((g) => [g.name, big(g.f(n)), big(g.f(2 * n)), `× ${r(g.f(2 * n) / g.f(n), 2)}`])} label="Steps before and after doubling n" />
    <Readout>
      Doubling n leaves O(1) alone, adds one step to O(log n), doubles O(n), slightly more than doubles O(n log n), and multiplies O(n²) by four.
      {on.n2 && on.n && <> At n = {n}, O(n²) takes <strong>{big(n * n)}</strong> steps against O(n)'s <strong>{n}</strong>: {n} times as many, and the gap grows with n.</>}
    </Readout>
  </div>;
}

// ---------- 2.2: words shared out into buckets by a hash ----------
const HASHES = {
  sum: { label: 'letter_sum: add the letter codes', f: (w) => [...w].reduce((h, c) => h + c.charCodeAt(0), 0) },
  poly: { label: 'poly_hash: h = h * 31 + code, letter by letter', f: (w) => [...w].reduce((h, c) => h * 31n + BigInt(c.charCodeAt(0)), 0n) },
};

// words: what goes in the table; buckets: how many to start with; hash: 'sum' or 'poly'.
export function HashBuckets({ words = [], buckets: start = 8, hash: startHash = 'sum', max = 16 }) {
  const [buckets, setBuckets] = useState(start);
  const [hash, setHash] = useState(startHash);
  const h = HASHES[hash].f;
  const index = (w) => Number(BigInt(h(w)) % BigInt(buckets));
  const table = Array.from({ length: buckets }, () => []);
  for (const w of words) if (!table[index(w)].includes(w)) table[index(w)].push(w);
  const longest = Math.max(...table.map((b) => b.length));
  const empty = table.filter((b) => !b.length).length;
  return <div>
    <Controls>
      <Slider label="buckets" value={buckets} min={1} max={max} step={1} onChange={setBuckets} digits={0} />
      {Object.entries(HASHES).map(([key, { label }]) => <label key={key}><input type="radio" name="frontier-hash" checked={hash === key} onChange={() => setHash(key)} /> {label}</label>)}
    </Controls>
    <Table head={['bucket', 'words in it']} rows={table.map((b, i) => [i, b.length ? b.join(', ') : '—'])} label={`${words.length} words in ${buckets} buckets`} />
    <Readout>
      Each word goes to bucket <code>hash(word) % {buckets}</code>. Looking a word up checks only its own bucket: at most <strong>{longest}</strong> comparison{longest === 1 ? '' : 's'} here, against {words.length} for a list. {empty} of {buckets} buckets are empty.
      {hash === 'sum' && words.some((a, i) => words.some((b, j) => j > i && h(a) === h(b))) && <> Some words share a bucket whatever the number of buckets: their letters add up to the same total.</>}
    </Readout>
  </div>;
}
