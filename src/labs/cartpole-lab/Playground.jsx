import { Trainer } from './figures/part3.jsx'
import { DriveYourself, RulePlayer } from './figures/part1.jsx'

// Everything in the browser, with every setting: the table learners on any slots, the hand rules,
// and the world itself to drive.
export default function Playground() {
  return <div className="qm-playground">
    <h2 className="qm-h0">Playground</h2>
    <p className="qm-hint">Q-learning and SARSA on the binned CartPole, with any slots and settings. The random numbers are Python's own (the same Mersenne Twister, seeded the same way), so a run here is the run <span className="mono">train_q_learning</span> or <span className="mono">train_sarsa</span> makes with the same settings; the lab's tests check it.</p>
    <Trainer />
    <h3 className="qm-h">Rules written by hand</h3>
    <RulePlayer />
    <h3 className="qm-h">Drive it yourself</h3>
    <DriveYourself />
  </div>
}
