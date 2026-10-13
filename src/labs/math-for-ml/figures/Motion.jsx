import { useEffect, useState } from 'react'
import { END_TIME, format as f, heightAt, interval, SAMPLES } from '../engine/fall.js'

export default function Motion({ stage = 'rate' }) {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [start, setStart] = useState(1)
  const [end, setEnd] = useState(2)
  const [selected, setSelected] = useState('change')
  const measured = stage !== 'observe'
  const table = ['table', 'graph'].includes(stage)
  const comparing = ['change', 'rate'].includes(stage)
  const graph = stage === 'graph' || comparing
  const q = interval(start, end)
  useEffect(() => {
    if (!playing) return
    // Wall time drives playback, independent of frame rate. Cleanup on pause/navigation.
    const origin = performance.now() - time * 1000
    let frame
    const tick = now => {
      const t = Math.min(END_TIME, (now - origin) / 1000)
      setTime(t)
      if (t < END_TIME) frame = requestAnimationFrame(tick)
      else setPlaying(false)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // time is intentionally captured only when playback starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])
  const seek = value => { setPlaying(false); setTime(value) }
  const x = t => 60 + t * 180
  const y = h => 255 - h * 10
  const curve = Array.from({ length: 81 }, (_, i) => `${i ? 'L' : 'M'}${x(i / 40)},${y(heightAt(i / 40))}`).join(' ')
  const explanations = {
    change: `Δh means change in height. Ending height minus starting height: ${f(q.endHeight)} − ${f(q.startHeight)} = ${f(q.change)} m. The vertical orange segment shows this downward change.`,
    elapsed: `Δt means elapsed time. Ending time minus starting time: ${f(end)} − ${f(start)} = ${f(q.elapsed)} s. The horizontal orange segment shows this positive interval.`,
    velocity: `v̄ means average velocity. Divide signed height change by elapsed time: ${f(q.change)} ÷ ${f(q.elapsed)} = ${f(q.velocity)} m/s. This is also the slope of the orange line.`,
  }
  return <div className="qm-fig math-motion">
    <div className="qm-fig-controls">
      <button onClick={() => { if (time >= END_TIME) setTime(0); setPlaying(p => !p) }}>{playing ? 'Pause' : 'Play'}</button>
      <button onClick={() => seek(0)}>Reset time</button>
      <label className="qm-slider">Time (s)<input aria-label="Time in seconds" type="range" min="0" max="2" step="0.01" value={time} onChange={e => seek(Number(e.target.value))} /></label>
      <output aria-label="Current measurement">{f(time)} s{measured ? ` · height ${f(heightAt(time))} m` : ''}</output>
    </div>
    <div className="math-views">
      <svg className="math-scene" viewBox="0 0 190 300" role="img" aria-label={`Ball at ${f(heightAt(time))} meters above ground at ${f(time)} seconds`}>
        <text x="95" y="20" textAnchor="middle">The physical scene</text>
        <line x1="65" y1="55" x2="65" y2="255" stroke="#a89e8c" />
        {measured && [0, 5, 10, 15, 20].map(h => <g key={h}><line x1="60" x2="70" y1={y(h)} y2={y(h)} stroke="#6f665a" /><text x="54" y={y(h) + 4} textAnchor="end">{h} m</text></g>)}
        {comparing && [start, end].map((t, i) => <g key={i}><circle cx="105" cy={y(heightAt(t))} r="9" fill="none" stroke="#b5650d" strokeDasharray="3 2" /><text x="121" y={y(heightAt(t)) + 4}>{i ? 'end' : 'start'}</text></g>)}
        <line x1="55" x2="155" y1="267" y2="267" stroke="#6f665a" strokeWidth="3" />
        <circle cx="105" cy={y(heightAt(time))} r="11" fill="#1f6f68" />
        <text x="105" y="289" textAnchor="middle">Ground · zero height</text>
      </svg>
      {graph && <svg className="math-graph" viewBox="0 0 470 310" role="img" aria-label="Height against time graph. The green point matches the current ball height.">
        <text x="60" y="20">Height (m)</text>
        {[0, 5, 10, 15, 20].map(h => <g key={h}><line x1="60" x2="420" y1={y(h)} y2={y(h)} stroke="#e2dacb" /><text x="49" y={y(h) + 4} textAnchor="end">{h}</text></g>)}
        {SAMPLES.map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1="55" y2="255" stroke="#e2dacb" /><text x={x(t)} y="276" textAnchor="middle">{t}</text></g>)}
        <path d="M60 45V255H430" fill="none" stroke="#6f665a" />
        <text x="250" y="302" textAnchor="middle">Time (s)</text>
        <path d={curve} stroke="#1f6f68" fill="none" strokeWidth="2" />
        {SAMPLES.map(t => <circle key={t} cx={x(t)} cy={y(heightAt(t))} r="4" fill="#1f6f68" />)}
        {comparing && <g stroke="#b5650d" fill="none">
          <path d={`M${x(start)} ${y(q.startHeight)}H${x(end)}V${y(q.endHeight)}`} strokeWidth={selected === 'velocity' ? 2 : 3} strokeDasharray="5 3" />
          {stage === 'rate' && <line x1={x(start)} y1={y(q.startHeight)} x2={x(end)} y2={y(q.endHeight)} strokeWidth="3" />}
          {[start, end].map(t => <circle key={t} cx={x(t)} cy={y(heightAt(t))} r="6" fill="#fffdf8" strokeWidth="2" />)}
        </g>}
        <path d={`M60 ${y(heightAt(time))}H${x(time)}V255`} stroke="#1f6f68" fill="none" strokeDasharray="3 3" />
        <circle cx={x(time)} cy={y(heightAt(time))} r="6" fill="#1f6f68" />
      </svg>}
      {table && <table className="math-table"><caption>Simulated observations</caption><thead><tr><th>Time (s)</th><th>Height (m)</th></tr></thead><tbody>{SAMPLES.map(t => <tr key={t} className={Math.abs(time - t) < .001 ? 'selected' : ''}><td><button aria-label={`Inspect ${t} seconds`} onClick={() => seek(t)}>{t}</button></td><td>{f(heightAt(t))}</td></tr>)}</tbody></table>}
      {!graph && !table && <div className="math-observe"><b>{measured ? 'Read the two scales' : 'Notice what changes'}</b><p>{measured ? 'The clock measures time since release. The vertical scale measures height above ground. Pause at a moment and read both.' : 'Watch the first second, then the second. Does the ball travel the same distance in each?'}</p><p>Playback lasts two seconds. You can inspect it slowly with the slider.</p></div>}
    </div>
    {comparing && <div className="math-interval">
      <div className="qm-fig-controls">
        <label>Start time (s) <select value={start} onChange={e => { const v = Number(e.target.value); setStart(v); seek(v) }}>{SAMPLES.filter(t => t < end).map(t => <option key={t}>{t}</option>)}</select></label>
        <label>End time (s) <select value={end} onChange={e => { const v = Number(e.target.value); setEnd(v); seek(v) }}>{SAMPLES.filter(t => t > start).map(t => <option key={t}>{t}</option>)}</select></label>
      </div>
      <p>Select a quantity to unpack its symbol and calculation. The orange marks compare your selected endpoints; the green point follows the clock.</p>
      <div className="math-quantities">
        {[['change', 'Δh', `${f(q.change)} m`], ['elapsed', 'Δt', `${f(q.elapsed)} s`], ...(stage === 'rate' ? [['velocity', 'v̄', `${f(q.velocity)} m/s`]] : [])].map(([id, symbol, value]) => <button key={id} aria-pressed={selected === id} onClick={() => setSelected(id)}><b>{symbol}</b><span>{value}</span></button>)}
      </div>
      <p className="math-explanation" aria-live="polite">{explanations[selected]}</p>
    </div>}
    <details className="math-model"><summary>Where do these simulated numbers come from?</summary><p>The animation uses an ideal fall from rest at 20 m, with constant downward acceleration of 10 meters per second per second (a rounded teaching value), and no air resistance. We stop after 2 s at the ground.</p><p>Its numerical rule is: multiply elapsed seconds by themselves, multiply the result by 5, and subtract it from 20 to obtain height in meters. At 1.5 s: 1.5 × 1.5 = 2.25; 5 × 2.25 = 11.25; 20 − 11.25 = 8.75 m. The coefficient 5 has units m/s² so the subtraction compares meters with meters.</p><p>This rule supplies the simulated observations; we have not derived it from physics here. The later planned chapter on accumulation will explain why constant acceleration produces this relationship. You do not have to memorize it to measure the fall.</p></details>
  </div>
}
