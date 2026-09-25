// Figures placed between the paragraphs of Lab 16 (16.1–16.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, Bars, MiniPlot, Path, Dots, Table, r } from '../../kit/fig.jsx'
import { generateJobs, devTest, design, defaultFeatures, MODELS, mae, crossValidate, finalTest, segmentErrors } from './engine.js'
import { mean } from '../../kit/math.js'

const JOBS = generateJobs(), { dev: DEV, test: TEST } = devTest(JOBS)
const ENGINEERED = { ...defaultFeatures, interactions: true, busy: true }

// ---------- 16.1 ----------
const CANDIDATES = [['size_mb', 'queued'], ['file count', 'queued'], ['cache hit', 'queued'], ['runner type', 'queued'], ['language', 'queued'], ['hour of day', 'queued'], ['number of failed tests', 'finished'], ['peak memory used', 'finished'], ['duration of the previous build on this branch', 'queued']]
export function KnownAtPredictionTime() {
  const [when, setWhen] = useState('queued')
  return <div>
    <Controls><Radio name="predwhen" value={when} onChange={setWhen} options={[['queued', 'predict when the job is queued'], ['finished', 'predict after it finishes (useless for routing)']]} /></Controls>
    <Table head={['candidate feature', 'known when', 'allowed?']} rows={CANDIDATES.map(([f, w]) => [f, w === 'queued' ? 'at queue time' : 'only after the build', when === 'finished' || w === 'queued' ? '✓' : '✗ future leakage'])} label="Features available at prediction time" />
    <Readout>{when === 'queued' ? `${CANDIDATES.filter(c => c[1] === 'queued').length} features are available when the job is queued. Failed-test counts and peak memory would make validation look great and be missing in production.` : 'After the build finishes every column is known — but then there is nothing left to predict.'}</Readout>
  </div>
}

export function MaeVersusRmse() {
  const [big, setBig] = useState(20), errs = [10, 10, 10, big], m = mean(errs.map(Math.abs)), rm = Math.sqrt(mean(errs.map(e => e * e)))
  return <div>
    <Controls><Slider label="size of one large miss (s)" value={big} min={0} max={120} step={5} onChange={setBig} digits={0} /></Controls>
    <Bars items={[{ label: 'MAE', value: m, highlight: true }, { label: 'RMSE', value: rm, color: 'var(--chart-val)' }]} digits={2} />
    <Readout>Errors [10, 10, 10, {big}] s. MAE = {r(m, 2)} s: each second of error counts once. RMSE = {r(rm, 2)} s: squaring lets one large miss dominate. For a displayed wait time, MAE matches how users experience errors.</Readout>
  </div>
}

// ---------- 16.2 ----------
export function PerMbBySharedRunner() {
  const [twoLines, setTwoLines] = useState(true), pts = DEV.filter(j => j.cache === 0 && j.size < 200)
  const fit = rows => { const mx = mean(rows.map(j => j.size)), my = mean(rows.map(j => j.duration)), w = rows.reduce((t, j) => t + (j.size - mx) * (j.duration - my), 0) / rows.reduce((t, j) => t + (j.size - mx) ** 2, 0); return { w, b: my - w * mx } }
  const all = fit(pts), sh = fit(pts.filter(j => j.shared)), de = fit(pts.filter(j => !j.shared))
  return <div>
    <Controls><Check label="separate slope for shared runners (the size × shared feature)" checked={twoLines} onChange={setTwoLines} /></Controls>
    <MiniPlot x={[0, 200]} y={[0, 400]} xLabel="size (MB), cache misses only" yLabel="duration (s)" label="Duration against size by runner type">{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={pts.map(j => [j.size, j.duration, 2.5, j.shared ? 'var(--chart-val)' : 'var(--chart-train)'])} opacity={0.6} />
      {twoLines ? <><Path X={X} Y={Y} points={[[0, sh.b], [200, sh.b + 200 * sh.w]]} stroke="var(--chart-val)" /><Path X={X} Y={Y} points={[[0, de.b], [200, de.b + 200 * de.w]]} stroke="var(--chart-train)" /></> : <Path X={X} Y={Y} points={[[0, all.b], [200, all.b + 200 * all.w]]} stroke="var(--text)" />}
    </>}</MiniPlot>
    <Readout>{twoLines ? `Shared runners (orange): ${r(sh.w, 2)} s per MB; dedicated (blue): ${r(de.w, 2)} s per MB. One extra column, size × shared, lets a linear model learn both slopes.` : `One slope for everyone: ${r(all.w, 2)} s per MB — too steep for dedicated runners, too shallow for shared ones.`}</Readout>
  </div>
}

export function FeatureToggleCV() {
  const [f, setF] = useState(defaultFeatures), set = k => v => setF(o => ({ ...o, [k]: v }))
  const res = useMemo(() => ['linear', 'tree'].map(m => [m, crossValidate(DEV, f, m)]), [f])
  return <div>
    <Controls><Check label="log(size)" checked={f.logSize} onChange={set('logSize')} /><Check label="interactions size×shared, size×(1−cache)" checked={f.interactions} onChange={set('interactions')} /><Check label="shared × busy hours" checked={f.busy} onChange={set('busy')} /></Controls>
    <Bars items={res.map(([m, cv]) => ({ label: MODELS[m].label.split(' (')[0], value: cv.mean, highlight: m === 'linear' }))} digits={2} label="Cross-validated MAE (seconds)" />
    <Readout>{design(DEV.slice(0, 1), f).names.length} columns: {design(DEV.slice(0, 1), f).names.join(', ')}. 5-fold CV MAE — linear {r(res[0][1].mean, 2)} s, tree {r(res[1][1].mean, 2)} s. The right features transform the linear model; the tree was already approximating them with many splits.</Readout>
  </div>
}

// ---------- 16.3 ----------
export function ModelBoard() {
  const [eng, setEng] = useState(true), [run, setRun] = useState(false), f = eng ? ENGINEERED : defaultFeatures
  const res = useMemo(() => (run ? Object.keys(MODELS).map(m => [m, crossValidate(DEV, f, m)]) : null), [run, eng]) // eslint-disable-line react-hooks/exhaustive-deps
  const best = res && res.slice(1).reduce((b, x) => (x[1].mean < b[1].mean ? x : b))
  return <div>
    <Controls><Check label="use the engineered features" checked={eng} onChange={setEng} /><button onClick={() => setRun(true)}>Run the comparison on the same 5 folds</button></Controls>
    {res ? <>
      <Table head={['model', 'CV MAE mean', '± sd over folds', 'fold scores']} rows={res.map(([m, cv]) => [MODELS[m].label, r(cv.mean, 2), r(cv.sd, 2), cv.scores.map(s => r(s, 1)).join(' · ')])} active={res.indexOf(best)} label="Model comparison" />
      <Readout>Best mean: {MODELS[best[0]].label}. Compare fold by fold (same folds for every model) before calling a gap real: differences smaller than the fold-to-fold spread are within noise.</Readout>
    </> : <Readout>Press run: five models, one fixed configuration each, the same five folds of the development data. The test rows are not touched.</Readout>}
  </div>
}

// ---------- 16.4 ----------
export function SegmentErrors() {
  const [m, setM] = useState('linear'), cv = useMemo(() => crossValidate(DEV, ENGINEERED, m), [m]), segs = segmentErrors(DEV, cv.oof)
  return <div>
    <Controls><Radio name="segmodel" value={m} onChange={setM} options={[['linear', 'linear'], ['boosting', 'boosting']]} /></Controls>
    <MiniPlot x={[0, 400]} y={[0, 400]} width={330} height={300} xLabel="actual duration (s)" yLabel="out-of-fold prediction (s)" label="Predicted against actual">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[0, 0], [400, 400]]} stroke="var(--muted)" dash="4 3" width={1} />
      <Dots X={X} Y={Y} points={DEV.map((j, i) => [Math.min(400, j.duration), Math.min(400, cv.oof[i]), 2.2, j.shared ? 'var(--chart-val)' : 'var(--chart-train)'])} opacity={0.6} />
    </>}</MiniPlot>
    <Table head={['segment', 'jobs', 'MAE (s)']} rows={segs.map(s => [s.label, s.n, r(s.mae, 2)])} label="Out-of-fold error by segment" />
    <Readout>Overall out-of-fold MAE {r(mae(cv.oof, DEV.map(j => j.duration)), 2)} s. Look for the segment with the largest error and ask whether a feature is missing or the noise is simply larger there.</Readout>
  </div>
}

// ---------- 16.5 ----------
export function FinalTestOnce() {
  const [opened, setOpened] = useState(0), [m, setM] = useState('linear'), res = useMemo(() => (opened ? finalTest(DEV, TEST, ENGINEERED, m) : null), [opened, m])
  return <div>
    <Controls><Radio name="finalm" value={m} onChange={setM} options={[['linear', 'linear (engineered)'], ['boosting', 'boosting (engineered)']]} /><button onClick={() => setOpened(k => k + 1)}>Open the test set</button></Controls>
    {res && <Table head={['on the test rows', 'value']} rows={[['baseline MAE', `${r(res.baselineMAE, 2)} s`], ['model MAE', `${r(res.modelMAE, 2)} s`], ['improvement', `${r(res.improvement, 2)} s`], ['95% bootstrap interval of the paired improvement', `${r(res.ci[0], 2)} to ${r(res.ci[1], 2)} s`]]} label="Final test result" />}
    <Readout>{opened === 0 ? 'The test set is locked. Choose the model before opening it.' : opened === 1 ? `Opened once: this is an honest estimate. Improvement ${r(res.improvement / res.baselineMAE * 100, 0)}% of the baseline MAE; the interval excludes zero.` : <strong>Opened {opened} times. If you changed the model between openings, the test set has helped choose it and this number is optimistic.</strong>}</Readout>
  </div>
}

// ---------- 16.6 ----------
const REPORT = ['Problem, decision supported and success criterion', 'Data source, dates, rows and how the test set was separated', 'Features, and why each is available at prediction time', 'Every model compared, with CV mean and spread', 'How many configurations were tried in total', 'The single test result with its interval', 'Error analysis by segment', 'The decision: ship, iterate or reject, and why', 'Code version, seeds, package versions, data fingerprint', 'Limitations stated plainly']
export function ReportChecklist() {
  const [done, setDone] = useState(() => REPORT.map(() => false))
  return <div>
    {REPORT.map((item, i) => <p key={item} style={{ margin: '4px 0' }}><label><input type="checkbox" checked={done[i]} onChange={e => setDone(d => d.map((v, k) => (k === i ? e.target.checked : v)))} /> {item}</label></p>)}
    <Readout>{done.filter(Boolean).length} of {REPORT.length} sections. {done.every(Boolean) ? 'Someone else can now check, reproduce and disagree with your result.' : 'Each missing section is a question a reviewer cannot answer.'}</Readout>
  </div>
}
