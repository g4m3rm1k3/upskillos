import React, { useMemo, useState } from 'react'
import { usage, acf, walkForward, FEATURES } from './engine.js'
import { Plot, Path, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Legend, Warning } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

export default function Playground() {
  const [h, setH] = useState(6), [leaky, setLeaky] = useState(false), [seed, setSeed] = useState(2), [noise, setNoise] = useState(3), [show, setShow] = useState('regression')
  const y = useMemo(() => usage({ seed, noise }), [seed, noise])
  const wf = useMemo(() => walkForward(y, h, { leaky }), [y, h, leaky])
  const byH = useMemo(() => [1, 2, 3, 6, 12, 18, 24].map(hh => ({ h: hh, ...walkForward(y, hh, { leaky }).mae })), [y, leaky])
  const r = useMemo(() => acf(y, 170), [y])
  const lastWeek = wf.time.map((t, i) => [t, i]).filter(([t]) => t >= y.length - 7 * 24)
  const lo = Math.min(...y) - 2, hi = Math.max(...y) + 2
  return <>
    <PanelHeading title="Forecast the future using only the past." pill={`horizon ${h} h`} />
    <Controls>
      <Slider label="Forecast horizon h (hours ahead)" value={h} min={1} max={24} onChange={setH} />
      <Choice label="Forecast shown" value={show} onChange={setShow} options={[['regression', 'Lag regression'], ['seasonal', 'Seasonal naive (same hour, last day)'], ['persistence', 'Persistence (latest value)']]} />
      <Slider label="Noise level" value={noise} min={0.5} max={8} step={0.5} onChange={setNoise} format={v => v.toFixed(1)} />
      <div className="ml-toggles"><Toggle label="Add a leaky feature (smoothed value around the target hour)" checked={leaky} onChange={setLeaky} /><label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label></div>
    </Controls>
    {leaky && <Warning>The leaky feature averages usage around the target hour — information that exists only after the hour you are forecasting. Every score below is now fiction.</Warning>}
    <Legend items={[['━', 'actual CPU usage (%)', 'var(--chart-train)'], ['━', `${h}-hour-ahead forecast (walk-forward)`, 'var(--chart-val)'], ['▮', 'evaluation period (last two weeks)', 'var(--muted)']]} />
    <Plot x={[0, y.length]} y={[lo, hi]} xLabel="hour" yLabel="CPU %" label="Five weeks of hourly usage" xFormat={v => `day ${Math.round(v / 24)}`}>{({ X, Y }) => <>
      <rect x={X(21 * 24)} y={Y(hi)} width={X(y.length) - X(21 * 24)} height={Y(lo) - Y(hi)} fill="var(--muted)" opacity="0.08" />
      <Path X={X} Y={Y} points={y.map((v, t) => [t, v])} stroke="var(--chart-train)" width={1.2} />
      <Path X={X} Y={Y} points={wf.time.map((t, i) => [t, wf[show][i]])} stroke="var(--chart-val)" width={1.2} opacity={0.85} />
    </>}</Plot>
    <Plot x={[y.length - 7 * 24, y.length]} y={[lo, hi]} height={230} xLabel="hour (last week)" yLabel="CPU %" label="Last week, actual versus forecast" xFormat={v => `d${Math.round(v / 24)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={lastWeek.map(([t, i]) => [t, wf.actual[i]])} stroke="var(--chart-train)" width={1.8} />
      <Path X={X} Y={Y} points={lastWeek.map(([t, i]) => [t, wf[show][i]])} stroke="var(--chart-val)" width={1.8} dash="5 3" />
    </>}</Plot>
    <Metrics items={[['Persistence MAE', fmt(wf.mae.persistence, 2)], ['Seasonal naive MAE', fmt(wf.mae.seasonal, 2)], ['Lag regression MAE', fmt(wf.mae.regression, 2)], ['Skill vs best baseline', `${fmt(100 * (1 - wf.mae.regression / Math.min(wf.mae.persistence, wf.mae.seasonal)), 1)}%`]]} />
    <Legend items={[['━', 'persistence', 'var(--muted)'], ['━', 'seasonal naive', 'var(--chart-train)'], ['━', 'lag regression', 'var(--chart-val)']]} />
    <Plot x={[1, 24]} y={[0, Math.max(...byH.flatMap(b => [b.persistence, b.seasonal, b.regression])) * 1.1]} height={200} xLabel="horizon (hours)" yLabel="walk-forward MAE" label="Error against forecast horizon">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={byH.map(b => [b.h, b.persistence])} stroke="var(--muted)" />
      <Path X={X} Y={Y} points={byH.map(b => [b.h, b.seasonal])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={byH.map(b => [b.h, b.regression])} stroke="var(--chart-val)" />
    </>}</Plot>
    <Insight title="Read the horizon curve">Persistence is excellent one hour ahead and poor six hours ahead, when the daily cycle has moved on. Seasonal naive does not care about the horizon. The lag regression combines both kinds of information. Honest forecasts get worse — or at best stay flat — as the horizon grows; a model whose error does **not** grow is a warning sign. Turn on the leaky feature and look at this curve again.</Insight>
    <Bars label="Autocorrelation at selected lags" format={v => v.toFixed(2)} items={[1, 2, 6, 12, 24, 48, 72, 168].map(k => ({ label: `lag ${k} h`, value: r[k] }))} />
    <p className="ml-caption">Autocorrelation: how strongly the series correlates with itself k hours earlier. High at lag 1 (usage changes slowly), high again at 24 and 168 (daily and weekly cycles), low at 12 (opposite side of the day). Features used: {FEATURES.join(' · ')}.</p>
  </>
}
