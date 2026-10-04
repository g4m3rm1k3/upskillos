// The AI: an agent (Run › Train an agent… with { "agent": "Opponent" }).
//
// It is turn-based. legalActions() says which moves it may make now ([] when it is not its turn), so the brain only
// ever chooses a legal one. Its moves are numbered:
//   0–14   throw two of its six cards to the crib (THROWS[0] is the first and second, … THROWS[14] the fifth and sixth)
//   15–18  play the first, second, third or fourth card of its hand
// features(action) describes a move as numbers (scripts/features.js), and its brain, a linear Q brain, values each
// move as w · features. temperature sets how often it picks a move that is not its best: the difficulty.
// It earns the points it pegs minus the points you peg, so it learns to score and to stop you scoring.

import { FEATURE_NAMES, THROWS } from './features.js';
import { cardName } from './cards.js';
import { rulesThrow, rulesPlay } from './partner.js';

const AI = 1, YOU = 0;

export default class Opponent extends Node2D {
  actions = [...THROWS.map(([i, j]) => `throw ${i + 1}+${j + 1}`), 'play 1', 'play 2', 'play 3', 'play 4'];
  observations = ['my score', 'your score', 'count'];
  featureNames = FEATURE_NAMES;
  brain = 'brains/cribbage.json';
  decideEvery = 1;
  temperature = 0;

  ready() {
    this.table = scene.root;
    this.seen = [0, 0];
    this.last = null;
  }

  observe() { const t = this.table; return [t.scores[AI], t.scores[YOU], t.count]; }

  legalActions() { const d = this.table.decision(AI); return d ? d.legal : []; }

  features(action) { return this.table.featuresFor(AI, action); }

  act(action) {
    if (!ai.training) this.remember(action);
    this.table.move(AI, action);
  }

  /**
   * For the developer view: how it valued every move it could have made, and why it chose this one over the next
   * best. Q is a sum of weight × feature, so the difference between two moves' Q is the sum of
   * weight × (difference in that feature): the biggest of those terms are the reasons. Features that are the same
   * for both moves (the bias, its hand at the show) cancel.
   */
  remember(action) {
    const t = this.table, d = t.decision(AI, true);
    this.last = { kind: d.kind, chosen: t.moveName(AI, action), ranked: [], why: [], over: '' };
    if (!ai.has(this.brain)) return;
    const phis = d.legal.map((a) => this.features(a)), values = ai.values(this.brain, phis);
    this.last.ranked = d.legal.map((a, i) => ({ a, name: t.moveName(AI, a), q: values[i], phi: phis[i] })).sort((x, y) => y.q - x.q);
    const chosen = this.last.ranked.find((m) => m.a === action), other = this.last.ranked.find((m) => m.a !== action);
    if (!other) return;
    this.last.over = other.name;
    const w = ai.weights(this.brain);
    this.last.why = chosen.phi.map((x, i) => ({ name: this.featureNames[i].replace(/^\w+: /, ''), part: w[i] * (x - other.phi[i]) }))
      .filter((p) => Math.abs(p.part) >= 0.01).sort((a, b) => Math.abs(b.part) - Math.abs(a.part)).slice(0, 4);
  }

  /** What it earned since its last move: its points minus yours. */
  reward() {
    const s = this.table.scores, r = (s[AI] - this.seen[AI]) - (s[YOU] - this.seen[YOU]);
    this.seen = [...s];
    return r;
  }

  done() { return this.table.phase === 'done' || this.table.phase === 'over'; }

  update() {
    // No brain yet: it plays by the rules (scripts/partner.js), so the game can be played before any training.
    if (ai.training || ai.has(this.brain)) return;
    const t = this.table, d = t.decision(AI);
    if (!d) return;
    this.act(d.kind === 'throw' ? rulesThrow(t.hands[AI], t.dealer === AI) : 15 + rulesPlay(t.hands[AI], d.legal.map((a) => a - 15), t.pile));
  }

  /**
   * The developer view: its hand face up, and what its brain made of its last decision: the value (Q, the points it
   * expects from here to the end of the hand) of every move it could have made, the move it chose, and why.
   */
  explain() {
    const t = this.table, lines = ['DEVELOPER VIEW', `AI hand: ${t.hands?.[AI]?.map(cardName).join(' ') ?? ''}`];
    if (!ai.has(this.brain)) lines.push('No brain yet: it plays by the rules.');
    else lines.push(`Difficulty: ${t.difficulty} (temperature ${this.temperature})`);
    const last = this.last;
    if (!last) return lines.join('\n');
    lines.push('', `It chose: ${last.chosen}`);
    if (last.ranked.length) {
      lines.push(last.kind === 'throw' ? 'Its best throws, by Q:' : 'Every card it could play, by Q:');
      for (const m of last.ranked.slice(0, 5)) lines.push(`  ${m.name.padEnd(15)} ${m.q.toFixed(2)}`);
      if (last.over) lines.push(`Why, over ${last.over} (weight × difference):`);
      for (const p of last.why) lines.push(`  ${p.name.slice(0, 30).padEnd(31)} ${p.part >= 0 ? '+' : ''}${p.part.toFixed(2)}`);
    }
    return lines.join('\n');
  }
}
