// Figures for the Frontier series (docs/frontier-ai-series-plan.md), placed in lesson steps with
// ```figure fences. Each shows one idea with the lesson's own numbers, and says its result in words.
import React, { useState } from 'react';
import { Controls, Slider, Check, Readout, MiniPlot, Path, Label, Table, curve, r, useStepper } from '../../ml-lab/kit/fig.jsx';

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

// ---------- 2.3: a heap, pushed and popped one swap at a time ----------
// Every frame of pushing the numbers in `push`, then popping `pops` times: the list, the two
// positions being compared, and a sentence saying what happened.
function heapFrames(push, pops) {
  const heap = [];
  const frames = [{ heap: [], hi: [], note: 'An empty heap: an empty list.' }];
  const snap = (hi, note) => frames.push({ heap: [...heap], hi, note });
  const swap = (i, j) => { [heap[i], heap[j]] = [heap[j], heap[i]]; };
  for (const item of push) {
    heap.push(item);
    let i = heap.length - 1;
    snap([i], `push(${item}): append it at the end, position ${i}.`);
    if (i === 0) snap([0], `${item} is at the top: it has no parent, so there's nothing to compare.`);
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (!(heap[i] < heap[p])) { snap([i, p], `${heap[i]} is not smaller than its parent ${heap[p]}: stop.`); break; }
      swap(i, p);
      snap([p, i], `${heap[p]} is smaller than its parent ${heap[i]}: swap, ${heap[p]} moves up to position ${p}.`);
      i = p;
    }
  }
  for (let n = 0; n < pops && heap.length; n++) {
    const smallest = heap[0];
    const last = heap.pop();
    if (!heap.length) { snap([], `pop_smallest(): takes ${smallest}, the only item.`); break; }
    heap[0] = last;
    snap([0], `pop_smallest(): takes ${smallest} from the top, and moves the last item, ${last}, up to position 0.`);
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= heap.length) { snap([i], `${heap[i]} has no children: stop.`); break; }
      if (c + 1 < heap.length && heap[c + 1] < heap[c]) c += 1;
      if (heap[i] <= heap[c]) { snap([i, c], `${heap[i]} is no bigger than its smaller child ${heap[c]}: stop.`); break; }
      swap(i, c);
      snap([c, i], `${heap[c]} is bigger than its smaller child ${heap[i]}: swap, ${heap[c]} moves down to position ${c}.`);
      i = c;
    }
  }
  return frames;
}

// push: the numbers pushed in order; pops: how many pop_smallest calls follow.
export function HeapSteps({ push = [], pops = 0 }) {
  const frames = heapFrames(push, pops);
  const [k, controls] = useStepper(frames.length - 1);
  const { heap, hi, note } = frames[k];
  const levels = Math.max(1, Math.floor(Math.log2(Math.max(1, push.length))) + 1);
  const W = 460, H = 40 + 52 * levels;
  const at = (i) => {
    const d = Math.floor(Math.log2(i + 1)), slot = i + 1 - 2 ** d;
    return [W * (slot + 0.5) / 2 ** d, 26 + 52 * d];
  };
  return <div>
    <Controls>{controls}</Controls>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`The heap as a tree: ${heap.join(', ') || 'empty'}`}>
      {heap.map((_, i) => i > 0 && <line key={`e${i}`} x1={at(i)[0]} y1={at(i)[1]} x2={at(Math.floor((i - 1) / 2))[0]} y2={at(Math.floor((i - 1) / 2))[1]} stroke="var(--text)" opacity={0.35} />)}
      {heap.map((v, i) => <g key={i}>
        <circle cx={at(i)[0]} cy={at(i)[1]} r={16} fill={hi.includes(i) ? 'var(--chart-val)' : 'var(--chart-train)'} opacity={hi.includes(i) ? 0.9 : 0.35} stroke="var(--text)" strokeOpacity={0.4} />
        <text x={at(i)[0]} y={at(i)[1] + 4} textAnchor="middle" style={{ fontSize: 12, fill: 'var(--text)' }}>{v}</text>
        <text x={at(i)[0] + 19} y={at(i)[1] - 12} style={{ fontSize: 9, fill: 'var(--text)', opacity: 0.6 }}>{i}</text>
      </g>)}
    </svg>
    <Table head={['position', ...heap.map((_, i) => i)]} rows={[['item', ...heap]]} label="The same heap as a list" />
    <Readout>
      Step {k} of {frames.length - 1}. {note} The tree is only a way of drawing the list: position i's children are at 2i + 1 and 2i + 2.
      {heap.length > 0 && <> The smallest item, <strong>{Math.min(...heap)}</strong>, is at the top, position 0.</>}
    </Readout>
  </div>;
}

// ---------- 2.4: count(node) walking a tree, one call at a time ----------
// tree: { label, children: [...] }. Every event of count(): a call starting, or a call returning
// its total. Each frame keeps the call stack and the totals returned so far.
function countFrames(tree) {
  const frames = [{ stack: [], done: {}, note: 'Nothing has been called yet.' }];
  const stack = [], done = {};
  const snap = (note) => frames.push({ stack: [...stack], done: { ...done }, note });
  const walk = (node) => {
    stack.push(node.label);
    const kids = node.children || [];
    snap(`count(${node.label}) starts. ${kids.length ? `It has ${kids.length} ${kids.length === 1 ? 'child' : 'children'}, so it calls count on ${kids.length === 1 ? 'it' : 'each'} first.` : 'It has no children: this is the base case.'}`);
    const total = 1 + kids.reduce((s, c) => s + walk(c), 0);
    done[node.label] = total;
    stack.pop();
    snap(`count(${node.label}) returns ${kids.length ? `1 + ${kids.map((c) => done[c.label]).join(' + ')} = ${total}` : '1'}.${stack.length ? ` Back in count(${stack[stack.length - 1]}).` : ' That was the first call: the answer.'}`);
    return total;
  };
  walk(tree);
  return frames;
}

function layoutTree(tree) {
  // Leaves take one column each, left to right; a parent sits over the middle of its children.
  const nodes = [], edges = [];
  let column = 0;
  const place = (node, depth) => {
    const kids = node.children || [];
    const xs = kids.map((c) => place(c, depth + 1));
    const x = kids.length ? (xs[0] + xs[xs.length - 1]) / 2 : column++;
    nodes.push({ label: node.label, x, depth });
    kids.forEach((c) => edges.push([node.label, c.label]));
    return x;
  };
  place(tree, 0);
  return { nodes, edges, columns: column, depth: Math.max(...nodes.map((n) => n.depth)) + 1 };
}

// tree: the tree to walk, as nested { label, children }. Labels must be different.
export function TreeCount({ tree = { label: 'A', children: [] } }) {
  const frames = countFrames(tree);
  const [k, controls] = useStepper(frames.length - 1);
  const { stack, done, note } = frames[k];
  const { nodes, edges, columns, depth } = layoutTree(tree);
  const W = 460, H = 30 + 56 * depth;
  const at = Object.fromEntries(nodes.map((n) => [n.label, [W * (n.x + 0.5) / columns, 24 + 56 * n.depth]]));
  const state = (label) => (stack[stack.length - 1] === label ? 'running' : stack.includes(label) ? 'waiting' : label in done ? 'done' : 'not yet');
  const fill = { running: 'var(--chart-val)', waiting: 'var(--chart-model)', done: 'var(--chart-good)', 'not yet': 'var(--chart-train)' };
  return <div>
    <Controls>{controls}</Controls>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`A tree of ${nodes.length} nodes, counted by recursion`}>
      {edges.map(([a, b]) => <line key={`${a}-${b}`} x1={at[a][0]} y1={at[a][1]} x2={at[b][0]} y2={at[b][1]} stroke="var(--text)" opacity={0.35} />)}
      {nodes.map((n) => <g key={n.label}>
        <circle cx={at[n.label][0]} cy={at[n.label][1]} r={16} fill={fill[state(n.label)]} opacity={state(n.label) === 'not yet' ? 0.25 : 0.85} stroke="var(--text)" strokeOpacity={0.4} />
        <text x={at[n.label][0]} y={at[n.label][1] + 4} textAnchor="middle" style={{ fontSize: 12, fill: 'var(--text)' }}>{n.label}</text>
        {n.label in done && <text x={at[n.label][0] + 19} y={at[n.label][1] - 10} style={{ fontSize: 11, fill: 'var(--text)' }}>{done[n.label]}</text>}
      </g>)}
    </svg>
    <Table head={['call stack, first call at the top', 'state']} rows={stack.length ? stack.map((l, i) => [`count(${l})`, i === stack.length - 1 ? 'running' : 'waiting for a child']) : [['(empty)', '']]} active={stack.length - 1} label="The call stack" />
    <Readout>
      Step {k} of {frames.length - 1}. {note} A number beside a node is what its call returned: the size of the tree below it, itself included.
    </Readout>
  </div>;
}

// ---------- 2.5: an order for a graph, by depth-first visiting ----------
// graph: { node: [what it needs first] }. Every event of order(graph): a visit starting, a node
// skipped because it is done, a node added to the result. Without `done`, nothing is skipped.
function orderFrames(graph, useDone) {
  const frames = [{ stack: [], result: [], note: 'Nothing visited yet.' }];
  const stack = [], result = [], done = new Set();
  const snap = (note) => frames.push({ stack: [...stack], result: [...result], note });
  const visit = (node) => {
    if (useDone && done.has(node)) { snap(`visit(${node}): already done, so return at once.`); return; }
    stack.push(node);
    const needs = graph[node] || [];
    snap(`visit(${node}) starts. ${needs.length ? `It needs ${needs.join(' and ')} first.` : 'It needs nothing.'}`);
    for (const need of needs) visit(need);
    stack.pop();
    done.add(node);
    result.push(node);
    snap(`Everything ${node} needs is in the result, so ${node} is added.${useDone ? '' : result.filter((x) => x === node).length > 1 ? ` That's ${node}'s ${result.filter((x) => x === node).length}${['', 'st', 'nd', 'rd'][result.filter((x) => x === node).length] || 'th'} time.` : ''}`);
  };
  for (const node of Object.keys(graph)) visit(node);
  return frames;
}

// graph: what each node needs; done: whether the done set starts switched on.
export function GraphOrder({ graph = {}, done: startDone = true }) {
  const [useDone, setUseDone] = useState(startDone);
  const frames = orderFrames(graph, useDone);
  const [k, controls, setK] = useStepper(frames.length - 1);
  const frame = frames[Math.min(k, frames.length - 1)];
  // Rows by how long a chain of needs sits below each node, so every arrow points up the page.
  const all = [...new Set([...Object.keys(graph), ...Object.values(graph).flat()])];
  const level = {};
  const lv = (n) => (n in level ? level[n] : (level[n] = 1 + Math.max(-1, ...(graph[n] || []).map(lv))));
  all.forEach(lv);
  const rows = Math.max(...all.map((n) => level[n])) + 1;
  const W = 460, H = 30 + 60 * rows;
  const at = {};
  for (let d = 0; d < rows; d++) {
    const row = all.filter((n) => level[n] === d);
    row.forEach((n, i) => { at[n] = [W * (i + 0.5) / row.length, H - 24 - 60 * d]; });
  }
  const state = (n) => (frame.stack[frame.stack.length - 1] === n ? 'running' : frame.stack.includes(n) ? 'waiting' : frame.result.includes(n) ? 'done' : 'not yet');
  const fill = { running: 'var(--chart-val)', waiting: 'var(--chart-model)', done: 'var(--chart-good)', 'not yet': 'var(--chart-train)' };
  return <div>
    <Controls>
      {controls}
      <Check label="skip nodes that are done" checked={useDone} onChange={(v) => { setUseDone(v); setK(0); }} />
    </Controls>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="The graph: each node above the nodes it needs">
      {all.flatMap((n) => (graph[n] || []).map((m) => <line key={`${n}-${m}`} x1={at[n][0]} y1={at[n][1]} x2={at[m][0]} y2={at[m][1]} stroke="var(--text)" opacity={0.35} />))}
      {all.map((n) => <g key={n}>
        <rect x={at[n][0] - 34} y={at[n][1] - 13} width={68} height={26} rx={6} fill={fill[state(n)]} opacity={state(n) === 'not yet' ? 0.25 : 0.85} stroke="var(--text)" strokeOpacity={0.4} />
        <text x={at[n][0]} y={at[n][1] + 4} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>{n}</text>
      </g>)}
    </svg>
    <Table head={['call stack', 'result so far']} rows={[[frame.stack.join(' → ') || '(empty)', frame.result.join(', ') || '(empty)']]} label="The visits waiting, and the order so far" />
    <Readout>
      Step {Math.min(k, frames.length - 1)} of {frames.length - 1}. {frame.note} Each node is drawn above the nodes it needs.
      {!useDone && <> Without the done set, the result ends up with <strong>{frames[frames.length - 1].result.length}</strong> entries for {all.length} nodes.</>}
    </Readout>
  </div>;
}

// ---------- 2.6: the 64 bits of a float, and the exact number they hold ----------
// A value is a number, or two joined by " + " (added as floats, as Python does).
const floatOf = (text) => text.split('+').map((part) => Number(part.trim())).reduce((a, b) => a + b);

function floatParts(x) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const bits = view.getBigUint64(0).toString(2).padStart(64, '0');
  const raw = parseInt(bits.slice(1, 12), 2);
  // The exact value: (1 + fraction / 2^52) * 2^(raw - 1023), as a whole number times a power of two.
  const whole = BigInt(`0b${raw ? '1' : '0'}${bits.slice(12)}`);
  const shift = (raw || 1) - 1075;
  let exact;
  if (shift >= 0) exact = (whole << BigInt(shift)).toString();
  else {
    const digits = (whole * 5n ** BigInt(-shift)).toString().padStart(-shift + 1, '0');
    exact = `${digits.slice(0, shift)}.${digits.slice(shift)}`.replace(/0+$/, '').replace(/\.$/, '');
  }
  return { bits, power: raw - 1023, exact: (bits[0] === '1' ? '-' : '') + exact };
}

// values: the numbers to choose between, as text ("0.1", "0.1 + 0.2").
export function FloatBits({ values = ['0.1'] }) {
  const [text, setText] = useState(values[0]);
  const x = floatOf(text);
  const { bits, power, exact } = floatParts(x);
  const span = (from, to, color, label) => <span title={label} style={{ color, fontWeight: 600 }}>{bits.slice(from, to)}</span>;
  return <div>
    <Controls>
      {values.map((v) => <label key={v}><input type="radio" name="frontier-float" checked={text === v} onChange={() => setText(v)} /> <code>{v}</code></label>)}
    </Controls>
    <p style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 13 }} aria-label="The 64 bits: sign, exponent, fraction">
      {span(0, 1, 'var(--chart-val)', 'sign')} {span(1, 12, 'var(--chart-model)', 'exponent')} {span(12, 64, 'var(--chart-good)', 'fraction')}
    </p>
    <Table head={['part', 'bits', 'means']} rows={[
      ['sign', 1, bits[0] === '0' ? 'positive' : 'negative'],
      ['exponent', 11, `times 2 to the power ${power}`],
      ['fraction', 52, 'the binary digits after "1."'],
    ]} label="The three parts of a float" />
    <Readout>
      <code>{text}</code> is stored as exactly <strong style={{ wordBreak: 'break-all' }}>{exact}</strong>. Python prints it as <code>{String(x)}</code>: the shortest decimal that would be stored as these same 64 bits.
    </Readout>
  </div>;
}

// ---------- 4.1: two texts as arrows, and the angle between them ----------
// words: the two vocabulary words on the axes; a, b: each text's counts of those two words.
export function WordArrows({ words = ['cat', 'the'], a: startA = [1, 2], b: startB = [0, 2], max = 6 }) {
  const [a, setA] = useState(startA);
  const [b, setB] = useState(startB);
  const dot = a[0] * b[0] + a[1] * b[1];
  const len = (v) => Math.hypot(v[0], v[1]);
  const zero = len(a) === 0 || len(b) === 0;
  const cos = zero ? null : dot / (len(a) * len(b));
  const angle = zero ? null : (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
  const size = 260, pad = 30, unit = (size - 2 * pad) / max;
  const X = (x) => pad + x * unit, Y = (y) => size - pad - y * unit;
  const arrow = (v, color, name) => (len(v) === 0
    ? <circle cx={X(0)} cy={Y(0)} r={5} fill={color} />
    : <g>
      <line x1={X(0)} y1={Y(0)} x2={X(v[0])} y2={Y(v[1])} stroke={color} strokeWidth={3} />
      <circle cx={X(v[0])} cy={Y(v[1])} r={5} fill={color} />
      <text x={X(v[0]) + 8} y={Y(v[1]) - 6} style={{ fontSize: 12, fill: color, fontWeight: 600 }}>{name} = [{v[0]}, {v[1]}]</text>
    </g>);
  const slider = (label, v, set, i) => <Slider label={label} value={v[i]} min={0} max={max} step={1} digits={0} onChange={(n) => set(i ? [v[0], n] : [n, v[1]])} />;
  return <div>
    <Controls>
      {slider(`a: "${words[0]}"`, a, setA, 0)}{slider(`a: "${words[1]}"`, a, setA, 1)}
      {slider(`b: "${words[0]}"`, b, setB, 0)}{slider(`b: "${words[1]}"`, b, setB, 1)}
    </Controls>
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Arrows a = [${a}] and b = [${b}]`} style={{ maxWidth: '100%' }}>
      {Array.from({ length: max + 1 }, (_, i) => <g key={i} opacity={0.15}>
        <line x1={X(i)} y1={Y(0)} x2={X(i)} y2={Y(max)} stroke="var(--text)" />
        <line x1={X(0)} y1={Y(i)} x2={X(max)} y2={Y(i)} stroke="var(--text)" />
      </g>)}
      <text x={X(max)} y={Y(0) + 20} textAnchor="end" style={{ fontSize: 12, fill: 'var(--text)' }}>"{words[0]}" →</text>
      <text x={X(0) - 6} y={Y(max) - 8} style={{ fontSize: 12, fill: 'var(--text)' }}>↑ "{words[1]}"</text>
      {arrow(a, 'var(--chart-train)', 'a')}
      {arrow(b, 'var(--chart-model)', 'b')}
    </svg>
    <Table head={['a · b', '‖a‖', '‖b‖', 'cosine', 'angle']}
      rows={[[r(dot, 2), r(len(a), 3), r(len(b), 3), zero ? '—' : r(cos, 3), zero ? '—' : `${r(angle, 1)}°`]]} label="The dot product, lengths, cosine and angle" />
    <Readout>
      {zero
        ? <>A vector of zeros is a point, not an arrow: it has no direction, so there's no angle and no cosine.</>
        : <>a · b = {a[0]}×{b[0]} + {a[1]}×{b[1]} = <strong>{r(dot, 2)}</strong>, and dividing by both lengths gives a cosine of <strong>{r(cos, 3)}</strong>.
          {Math.abs(cos - 1) < 1e-9 && <> The arrows point the same way: the same words in the same proportions, however long the texts.</>}
          {Math.abs(cos) < 1e-9 && <> The arrows are at right angles: the texts share no word.</>}</>}
    </Readout>
  </div>;
}

// ---------- 4.3: matrix multiplication, one entry at a time ----------
// a, b: the two matrices, as lists of rows. Click an entry of the answer to see where it comes from.
export function MatrixTimes({ a = [[1, 2, 3], [4, 5, 6]], b = [[1, 0], [0, 1], [1, 1]] }) {
  const [[i, j], setAt] = useState([0, 0]);
  const fits = a[0].length === b.length;
  const out = fits ? a.map((row) => b[0].map((_, col) => row.reduce((s, x, k) => s + x * b[k][col], 0))) : [];
  const tint = (color) => ({ background: `color-mix(in srgb, ${color} 28%, transparent)` });
  const cell = { padding: '4px 10px', textAlign: 'center', fontFamily: 'monospace', minWidth: 28 };
  const grid = (name, m, style, onPick) => <table aria-label={name} style={{ borderCollapse: 'collapse', border: '1px solid var(--border, #8884)' }}>
    <caption style={{ fontSize: 12, paddingBottom: 4 }}>{name} <span style={{ opacity: 0.7 }}>({m.length} × {m[0].length})</span></caption>
    <tbody>{m.map((row, ri) => <tr key={ri}>{row.map((x, ci) => <td key={ci} style={{ ...cell, ...style(ri, ci) }}>
      {onPick ? <button type="button" onClick={() => onPick(ri, ci)} aria-pressed={ri === i && ci === j} style={{ font: 'inherit', fontWeight: ri === i && ci === j ? 700 : 400 }}>{r(x, 2)}</button> : r(x, 2)}
    </td>)}</tr>)}</tbody>
  </table>;
  const terms = fits ? a[i].map((x, k) => `${r(x, 2)}×${r(b[k][j], 2)}`).join(' + ') : '';
  return <div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      {grid('a', a, (ri) => (fits && ri === i ? tint('var(--chart-train)') : {}))}
      <span aria-hidden="true">@</span>
      {grid('b', b, (_, ci) => (fits && ci === j ? tint('var(--chart-model)') : {}))}
      <span aria-hidden="true">=</span>
      {fits && grid('a @ b', out, (ri, ci) => (ri === i && ci === j ? tint('var(--chart-good)') : {}), (ri, ci) => setAt([ri, ci]))}
    </div>
    <Readout>
      {fits
        ? <>Entry [{i}, {j}] of the answer is row {i} of a dotted with column {j} of b: {terms} = <strong>{r(out[i][j], 2)}</strong>. Click another entry of the answer to see its row and column.</>
        : <>a has {a[0].length} columns but b has {b.length} rows, so a row of a and a column of b have different lengths: there's no dot product, and <code>@</code> raises a <code>ValueError</code>.</>}
    </Readout>
  </div>;
}
