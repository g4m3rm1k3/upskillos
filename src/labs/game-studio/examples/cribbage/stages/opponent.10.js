// The AI: an agent (Run › Train an agent… with { "agent": "Opponent" }).
//
// It is turn-based. legalActions() says which moves it may make now ([] when it is not its turn), so the brain only
// ever chooses a legal one. Its moves are numbered:
//   0–14   throw two of its six cards to the crib (THROWS[0] is the first and second, … THROWS[14] the fifth and sixth)
//   15–18  play the first, second, third or fourth card of its hand
// features(action) describes a move as numbers (scripts/features.js): what a brain (lesson 10.11) will value it by.
// It earns the points it pegs minus the points you peg, so it learns to score and to stop you scoring.

import { FEATURE_NAMES, THROWS } from './features.js';
import { cardName } from './cards.js';
import { rulesThrow, rulesPlay } from './partner.js';

const AI = 1, YOU = 0;

export default class Opponent extends Node2D {
  actions = [...THROWS.map(([i, j]) => `throw ${i + 1}+${j + 1}`), 'play 1', 'play 2', 'play 3', 'play 4'];
  observations = ['my score', 'your score', 'count'];
  featureNames = FEATURE_NAMES;
  decideEvery = 1;

  ready() {
    this.table = scene.root;
    this.seen = [0, 0];
  }

  observe() { const t = this.table; return [t.scores[AI], t.scores[YOU], t.count]; }

  legalActions() { const d = this.table.decision(AI); return d ? d.legal : []; }

  features(action) { return this.table.featuresFor(AI, action); }

  act(action) {
    this.table.move(AI, action);
  }

  /** What it earned since its last move: its points minus yours. */
  reward() {
    const s = this.table.scores, r = (s[AI] - this.seen[AI]) - (s[YOU] - this.seen[YOU]);
    this.seen = [...s];
    return r;
  }

  done() { return this.table.phase === 'done' || this.table.phase === 'over'; }

  update() {
    // While it trains, the trainer makes its moves; otherwise it plays by the rules (scripts/partner.js).
    if (ai.training) return;
    const t = this.table, d = t.decision(AI);
    if (!d) return;
    this.act(d.kind === 'throw' ? rulesThrow(t.hands[AI], t.dealer === AI) : 15 + rulesPlay(t.hands[AI], d.legal.map((a) => a - 15), t.pile));
  }

  /** The developer view: its hand face up. */
  explain() {
    const t = this.table, lines = ['DEVELOPER VIEW', `AI hand: ${t.hands?.[AI]?.map(cardName).join(' ') ?? ''}`];
    return lines.join('\n');
  }
}
