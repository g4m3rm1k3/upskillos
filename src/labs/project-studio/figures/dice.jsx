import React, { useState } from 'react';

const number = value => Number(value.toFixed(4));
function Slider({ label, value, set, min = 0, max = 1, step = 0.05 }) {
  return <label style={{ display: 'block', margin: '8px 0' }}>
    {label}: <strong>{value}</strong>
    <input aria-label={label} type="range" min={min} max={max} step={step}
      value={value} onChange={event => set(Number(event.target.value))} style={{ display: 'block', width: '100%' }} />
  </label>;
}

export function EpsilonSplit() {
  const [epsilon, setEpsilon] = useState(0.2);
  const exploreBest = epsilon / 2;
  const exploit = 1 - epsilon;
  return <section aria-label="Exploration probability experiment">
    <p>Two legal actions, with Bank uniquely best. The action values stay fixed as epsilon changes.</p>
    <Slider label="Epsilon" value={epsilon} set={setEpsilon} />
    <table><thead><tr><th>Route</th><th>Probability</th></tr></thead><tbody>
      <tr><td>Exploit → Bank</td><td>{number(exploit)}</td></tr>
      <tr><td>Explore → Bank</td><td>{number(exploreBest)}</td></tr>
      <tr><td>Explore → Roll</td><td>{number(exploreBest)}</td></tr>
    </tbody></table>
    <output>Bank: {number(exploit + exploreBest)}; Roll: {number(exploreBest)}. Total stays 1.</output>
    <p>Exploration can still select the best action. These are expected probabilities, not guaranteed finite counts.</p>
  </section>;
}

export function UpdateTrace() {
  const [alpha, setAlpha] = useState(0.5);
  const [done, setDone] = useState(false);
  const old = 0.2;
  const reward = done ? -1 : 0;
  const future = done ? 0 : 0.9 * 0.8;
  const target = reward + future;
  const error = target - old;
  const result = old + alpha * error;
  return <section aria-label="Q update experiment">
    <p>Old estimate stays 0.2; next legal maximum stays 0.8; gamma stays 0.9.</p>
    <Slider label="Alpha" value={alpha} set={setAlpha} />
    <label><input type="checkbox" checked={done} onChange={event => setDone(event.target.checked)} /> Terminal loss</label>
    <table><thead><tr><th>Operation</th><th>Result</th></tr></thead><tbody>
      <tr><td>Reward</td><td>{reward}</td></tr>
      <tr><td>{done ? 'No successor lookup' : 'Discounted next maximum'}</td><td>{number(future)}</td></tr>
      <tr><td>Target</td><td>{number(target)}</td></tr>
      <tr><td>Target − old</td><td>{number(error)}</td></tr>
      <tr><td>Alpha × error</td><td>{number(alpha * error)}</td></tr>
    </tbody></table>
    <output>New estimate: {number(result)}</output>
    <p>A terminal loss uses reward alone. Alpha changes the correction size; it does not create a successor after the game ends.</p>
  </section>;
}

export function RateUncertainty() {
  const [games, setGames] = useState(2000);
  const rate = 0.6;
  const se = Math.sqrt(rate * (1 - rate) / games);
  return <section aria-label="Win rate sampling experiment">
    <p>Hold the observed win rate at 0.6 and change the number of independent evaluation games.</p>
    <Slider label="Evaluation games" value={games} set={setGames} min={500} max={8000} step={500} />
    <output>Approximate standard error: {number(se)}</output>
    <p>sqrt(0.6 × 0.4 / {games}) = {number(se)}. Four times as many games roughly halves the standard error.</p>
    <p>This does not measure variation between training seeds, or correct for a biased opponent sample.</p>
  </section>;
}
