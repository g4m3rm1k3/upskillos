import Trainer from './figures/Trainer.jsx'

// Every map, both table methods, every setting: the lessons' trainer with all its controls.
export default function Playground() {
  return <div className="qm-playground">
    <h2 className="qm-h0">Playground</h2>
    <p className="qm-hint">Q-learning and SARSA on any map, with any settings, in the browser. The random numbers are Python's own (the same Mersenne Twister, seeded the same way), so a run here gives the same Q-table as <span className="mono">train_q_learning</span> or <span className="mono">train_sarsa</span> with the same settings: the lab's tests check this. Value iteration's optimum is the reference.</p>
    <Trainer />
  </div>
}
