// Figures for the Applied Machine Learning series (docs/applied-ml-series-plan.md), placed in
// lesson steps with ```figure fences. Each one shows a single idea with the lesson's own
// numbers (passed as props), and states its result in words as well as drawing it.
import React, { useState } from 'react';
import { Controls, Slider, Check, Readout, MiniPlot, Dots, VLine, Label, Table, useStepper, r } from '../../ml-lab/kit/fig.jsx';

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
// A number as Python prints it: lesson props arrive as JSON, where 4.0 is just 4, but the lesson's
// data are floats, so whole numbers keep their ".0" (12.0, not 12), matching the learner's terminal.
const py = (v) => (Number.isInteger(v) ? `${v}.0` : String(Number(v.toFixed(10))));
const mean = (xs) => sum(xs) / xs.length;
function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ---------- 0.3: the mean follows an outlier; the median doesn't ----------
// values: the run timings; index: which run the slider moves; max: the slider's top.
export function MeanMedianOutlier({ values = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1, 4.1, 4.2, 4.0, 3.8, 3.7, 4.1, 4.2, 4.0], index = 5, max = 130, unit = 's' }) {
  const [v, setV] = useState(values[index]);
  const xs = values.map((x, i) => (i === index ? v : x));
  const m = mean(xs), med = median(xs);
  const near = (c) => xs.filter((x) => Math.abs(x - c) <= 0.5).length;
  // Ticks every 20 seconds: an axis to a round number keeps the tick labels round.
  const hi = Math.ceil(Math.max(max, ...xs) / 20) * 20;
  return <div>
    <Controls><Slider label={`run ${index + 1}`} value={v} min={0} max={max} step={0.1} onChange={setV} digits={1} unit={` ${unit}`} /></Controls>
    <MiniPlot x={[0, hi]} y={[-1, 1]} xLabel="seconds" xTicks={hi / 20 + 1} yTicks={2} yFormat={() => ''} label={`Timings with mean ${r(m, 2)} and median ${r(med, 2)}`}>{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={xs.map((x, i) => [x, i === index ? 0.25 : -0.7 + (i % 5) * 0.16, i === index ? 6 : 3.5, i === index ? 'var(--chart-val)' : undefined])} />
      <VLine X={X} Y={Y} x={m} y0={-1} y1={1} color="var(--chart-val)" dash="5 3" />
      <VLine X={X} Y={Y} x={med} y0={-1} y1={1} color="var(--chart-train)" dash="2 2" />
      <Label X={X} Y={Y} x={m} y={0.78} anchor={m > hi * 0.8 ? 'end' : 'start'} color="var(--chart-val)">{` mean ${r(m, 2)} `}</Label>
      <Label X={X} Y={Y} x={med} y={0.55} color="var(--chart-train)">{` median ${r(med, 2)}`}</Label>
    </>}</MiniPlot>
    <Readout>
      mean = {r(sum(xs), 1)} / {xs.length} = <strong>{r(m, 2)} {unit}</strong>; median = <strong>{r(med, 2)} {unit}</strong>.
      {' '}{near(m)} of {xs.length} runs are within half a second of the mean; {near(med)} are within half a second of the median.
    </Readout>
  </div>;
}

// ---------- 0.3: a loop that remembers something, one pass at a time ----------
// mode 'sum': total = total + s. mode 'max': if s > slowest: slowest = s.
// list: the name the lesson's code gives the list, shown in the setup line.
export function LoopTrace({ values = [4.1, 4.1, 3.8, 4.0, 4.3], mode = 'sum', list = 'values' }) {
  const [k, controls] = useStepper(values.length);
  const rows = [];
  let acc = mode === 'sum' ? 0 : values[0];
  rows.push(['before the loop', '—', mode === 'sum' ? 'total = 0' : `slowest = ${list}[0] = ${py(values[0])}`, mode === 'sum' ? '0' : py(acc)]);
  values.forEach((s, i) => {
    let what;
    if (mode === 'sum') {
      what = `total = ${i === 0 ? '0' : py(acc)} + ${py(s)}`;
      acc += s;
    } else if (s > acc) {
      what = `${py(s)} > ${py(acc)} is True: slowest = ${py(s)}`;
      acc = s;
    } else {
      what = `${py(s)} > ${py(acc)} is False: no change`;
    }
    // Rounded to 10 places: the trace shows the idea, not lesson 0.2's float error.
    acc = Number(acc.toFixed(10));
    rows.push([`pass ${i + 1}`, py(s), what, py(acc)]);
  });
  const name = mode === 'sum' ? 'total' : 'slowest';
  const shown = rows.slice(0, k + 1);
  return <div>
    <Controls>{controls}</Controls>
    <Table head={['', 's', 'what the line does', `${name} after`]} rows={shown} active={k} label={`Trace of ${name} through the loop`} />
    <Readout>
      {k < values.length
        ? <>After {k === 0 ? 'the setup line' : `pass ${k}`}, <code>{name}</code> is <strong>{shown[k][3]}</strong>. {k === 0 ? 'The loop hasn\'t started.' : `It has seen ${k} of ${values.length} values.`}</>
        : <>The loop is finished: <code>{name}</code> is <strong>{py(acc)}</strong>{mode === 'sum' ? `, and ${py(acc)} / ${values.length} = ${r(acc / values.length, 2)} is the mean.` : ', the largest value in the list.'}</>}
    </Readout>
  </div>;
}

// ---------- 0.3: the median is the middle of the sorted list ----------
export function MedianSorted({ values = [4.1, 4.1, 3.8, 4.0, 4.3, 120.0, 4.1] }) {
  const [dropLast, setDropLast] = useState(false);
  const xs = dropLast ? values.slice(0, -1) : values;
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length, mid = Math.floor(n / 2);
  const middle = n % 2 ? [mid] : [mid - 1, mid];
  return <div>
    <Controls><Check label={`leave out the last value (${py(values[values.length - 1])})`} checked={dropLast} onChange={setDropLast} /></Controls>
    <Table head={['index', ...s.map((_, i) => i)]} rows={[['sorted', ...s.map((x, i) => (middle.includes(i) ? <strong key={i}>{py(x)}</strong> : py(x)))]]} label="The sorted values with the middle marked" />
    <Readout>
      {n} values, so <code>len(s) // 2</code> = {n} // 2 = <strong>{mid}</strong>.{' '}
      {n % 2
        ? <>An odd count has one middle: <code>s[{mid}]</code> = <strong>{py(s[mid])}</strong>, with {mid} values on each side.</>
        : <>An even count has two middles, <code>s[{mid - 1}]</code> = {py(s[mid - 1])} and <code>s[{mid}]</code> = {py(s[mid])}; the median is their average, <strong>{py((s[mid - 1] + s[mid]) / 2)}</strong>.</>}
    </Readout>
  </div>;
}

// ---------- 0.4: pass/fail histories, and what flips tell you ----------
// tests: [{ name, results: "ppfpp…" }] with p = pass, f = fail.
export function ResultStrip({ tests = [] }) {
  const [showFlips, setShowFlips] = useState(false);
  const cell = 18;
  const width = 120 + cell * Math.max(...tests.map((t) => t.results.length), 1) + 90;
  const flipsOf = (res) => [...res].filter((c, i) => i > 0 && c !== res[i - 1]).length;
  return <div>
    <Controls><Check label="mark each flip (a result different from the run before)" checked={showFlips} onChange={setShowFlips} /></Controls>
    <svg viewBox={`0 0 ${width} ${tests.length * (cell + 8) + 24}`} role="img" aria-label={tests.map((t) => `${t.name}: ${t.results}`).join('; ')}>
      {[...tests[0]?.results ?? ''].map((_, i) => <text key={i} x={120 + i * cell + cell / 2} y={12} textAnchor="middle" className="ml-axis">{i + 1}</text>)}
      {tests.map((t, row) => {
        const y = 20 + row * (cell + 8);
        return <g key={t.name}>
          <text x={0} y={y + 13} style={{ fontSize: 12 }}>{t.name}</text>
          {[...t.results].map((c, i) => <g key={i}>
            <rect x={120 + i * cell + 1} y={y} width={cell - 2} height={cell} rx={3} fill={c === 'f' ? 'var(--chart-bad)' : 'var(--chart-good)'} opacity={0.8} />
            {showFlips && i > 0 && c !== t.results[i - 1] && <line x1={120 + i * cell} x2={120 + i * cell} y1={y - 3} y2={y + cell + 3} stroke="var(--text)" strokeWidth={2.5} />}
          </g>)}
          <text x={120 + t.results.length * cell + 8} y={y + 13} style={{ fontSize: 12 }}>
            {[...t.results].filter((c) => c === 'f').length} fail{showFlips ? `, ${flipsOf(t.results)} flips` : ''}
          </text>
        </g>;
      })}
    </svg>
    <Readout>
      Green is a pass, red a fail, one square per nightly run.{' '}
      {showFlips
        ? tests.map((t) => `${t.name}: ${flipsOf(t.results)} flips`).join('; ') + '. Failures that come and go flip often; a breakage that gets fixed flips twice: once when it breaks, once when it is fixed.'
        : 'Tick the box to count how often each history changes from one run to the next.'}
    </Readout>
  </div>;
}

// ---------- 0.4: a threshold is a decision rule with one number ----------
// items: [{ label, value }]; start: the threshold to begin with.
export function ThresholdRule({ items = [], start = 5, max = 10, unit = 's' }) {
  const [t, setT] = useState(start);
  const slow = items.filter((it) => it.value > t);
  const sorted = [...items].sort((a, b) => a.value - b.value);
  return <div>
    <Controls><Slider label="slow if the median is over" value={t} min={0} max={max} step={0.1} onChange={setT} digits={1} unit={` ${unit}`} /></Controls>
    <MiniPlot x={[0, max]} y={[-0.5, sorted.length - 0.5]} yTicks={2} yFormat={() => ''} xLabel={`median seconds`} label={`Threshold ${r(t, 1)}: ${slow.length} slow`}>{({ X, Y }) => <>
      {sorted.map((it, i) => <g key={it.label}>
        <circle cx={X(it.value)} cy={Y(i)} r={5} fill={it.value > t ? 'var(--chart-val)' : 'var(--chart-train)'} />
        <text x={X(it.value) + (it.value > max * 0.7 ? -8 : 8)} y={Y(i) + 4} textAnchor={it.value > max * 0.7 ? 'end' : 'start'} style={{ fontSize: 11 }}>{it.label} ({py(it.value)})</text>
      </g>)}
      <VLine X={X} Y={Y} x={t} y0={-0.5} y1={sorted.length - 0.5} color="var(--text)" />
    </>}</MiniPlot>
    <Readout>
      The rule <code>median &gt; {r(t, 1)}</code> marks <strong>{slow.length}</strong> of {items.length} tests as slow{slow.length ? `: ${slow.map((s) => s.label).join(', ')}` : ''}.
      {' '}Moving one number changes every answer. Choosing that number well, from data, is what "learning" will mean later in this series.
    </Readout>
  </div>;
}

// ---------- 0.6: grouping rows into a dictionary of lists ----------
// rows: [[test, seconds], …] in file order; name: the dictionary's name in the lesson's code.
export function GroupingTrace({ rows = [], name = 'seconds_by_test' }) {
  const [k, controls] = useStepper(rows.length);
  const groups = {};
  let what = `${name} = {}: an empty dictionary, before the loop.`;
  rows.slice(0, k).forEach(([test, s], i) => {
    if (!(test in groups)) {
      groups[test] = [];
      if (i === k - 1) what = `"${test}" is not a key yet, so ${name}[test] = [] makes an empty list for it, then .append(${py(s)}) puts ${py(s)} in it.`;
    } else if (i === k - 1) {
      what = `"${test}" is already a key, so ${name}[test].append(${py(s)}) adds to the list that's there.`;
    }
    groups[test].push(s);
  });
  return <div>
    <Controls>{controls}</Controls>
    <Table head={['row', 'test', 'seconds']} rows={rows.map(([test, s], i) => [i + 1, test, py(s)])} active={k - 1} label="The rows, with the current one highlighted" />
    <pre style={{ margin: '6px 0', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{`${name} = {\n` + Object.entries(groups).map(([key, list]) => `    '${key}': [${list.map(py).join(', ')}],`).join('\n') + (Object.keys(groups).length ? '\n' : '') + '}'}</pre>
    <Readout>{k === 0 ? what : <>Row {k}: {what}</>}</Readout>
  </div>;
}
