// The table: a game of cribbage, from the deal to 121. It keeps the game's state (the hands, the crib, the starter,
// the count, the scores), runs its phases in order, and shows them as words.
//
//   discard  both players throw two cards to the dealer's crib
//   cut      the starter is turned up (a jack: 2 for the dealer, "his heels")
//   peg      players take turns playing a card, the count going up to 31, pegging points as they go
//   show     the hands are counted, the non-dealer's first, then the dealer's, then the crib
//   over     someone reached 121
//
// For now a stand-in plays both seats: the first move each may make. Lesson 10.7 gives your seat to your clicks,
// lesson 10.8 the AI's to a player with rules.

import { newDeck, shuffle, cardName } from './cards.js';
import { scoreHand, pegPoints, countOf, sayParts } from './score.js';
import { THROWS } from './features.js';

export const YOU = 0, AI = 1;
const NAMES = ['You', 'AI'];

export default class Table extends Node2D {
  goal = 121;
  /** No pauses: a whole game in a moment (the checks use it). */
  fast = false;

  ready() {
    this.hud = {
      status: scene.get('HUD/Status'), message: scene.get('HUD/Message'), count: scene.get('HUD/Count'),
      log: scene.get('HUD/Log'), cribLabel: scene.get('HUD/CribLabel'), hands: scene.get('HUD/Hands'),
    };
    this.lines = [];          // the log, newest last
    this.pending = null;      // what happens when the timer runs out
    this.timer = 0;
    this.newGame();
  }

  // ── the game's flow ───────────────────────────────────────────────────

  newGame() {
    this.scores = [0, 0];
    this.backPeg = [0, 0];
    this.handsPlayed = 0;
    this.dealer = Math.random() < 0.5 ? YOU : AI;
    this.lines = [];
    this.newHand();
  }

  /** Shuffle, deal six each (the non-dealer first), and wait for the discards. */
  newHand() {
    this.deck = shuffle(newDeck());
    this.hands = [[], []];
    for (let k = 0; k < 6; k++) for (const seat of [1 - this.dealer, this.dealer]) this.hands[seat].push(this.deck.pop());
    this.hands[YOU].sort((a, b) => a.rank - b.rank);   // your hand in order, as a player would hold it
    this.crib = [];
    this.threw = [[], []];
    this.starter = null;
    this.thrown = [false, false];
    this.pile = []; this.older = []; this.history = []; this.count = 0;
    this.played = [[], []];
    this.showing = null;
    this.phase = 'discard';
    this.say(`${NAMES[this.dealer]} dealt. Throw two cards to ${this.dealer === YOU ? 'your' : "the AI's"} crib.`);
  }

  /** A seat throws two cards (THROWS[t]: their places in the hand of six) to the crib. */
  throwCards(seat, t) {
    const [i, j] = THROWS[t], hand = this.hands[seat];
    this.crib.push(hand[i], hand[j]);
    this.threw[seat] = [hand[i], hand[j]];
    this.hands[seat] = hand.filter((_, k) => k !== i && k !== j);
    this.thrown[seat] = true;
    if (seat === AI) this.note(`AI threw two cards to the crib.`);
    if (this.thrown[YOU] && this.thrown[AI]) this.wait(0.6, () => this.cut());
  }

  /** Turn up the starter. A jack is 2 for the dealer. */
  cut() {
    this.phase = 'cut';
    this.starter = this.deck.pop();
    this.say(`The starter is ${cardName(this.starter)}.`);
    if (this.starter.rank === 11) this.award(this.dealer, 2, 'his heels (the starter is a jack)');
    if (this.phase === 'over') return;
    this.wait(1, () => this.startPegging());
  }

  startPegging() {
    this.phase = 'peg';
    this.pile = []; this.count = 0; this.lastPlayer = null;
    this.played = [this.hands[YOU].map(() => false), this.hands[AI].map(() => false)];
    this.turn = 1 - this.dealer;   // the non-dealer plays first
    this.nextTurn();
  }

  /** The cards a seat can play now (their places in its hand): unplayed, and not taking the count past 31. */
  options(seat) {
    const out = [];
    this.hands[seat].forEach((c, k) => { if (!this.played[seat][k] && this.count + Math.min(c.rank, 10) <= 31) out.push(k); });
    return out;
  }
  cardsLeft(seat) { return this.played[seat].filter((p) => !p).length; }

  /**
   * Whose turn now. A player who cannot play says "go" and the other plays on; when neither can, the last to play
   * pegs 1 for the go and the count starts again from 0. After the last card of all, the last to play pegs 1
   * ("last card"), unless the count is 31 (that was already 2).
   */
  nextTurn() {
    this.waiting = null;
    if (this.cardsLeft(YOU) + this.cardsLeft(AI) === 0) {
      if (this.count !== 31) this.award(this.lastPlayer, 1, 'last card');
      if (this.phase === 'peg') this.wait(1.2, () => this.startShow());
      return;
    }
    if (this.count === 31) { this.wait(0.8, () => { this.resetCount(); this.nextTurn(); }); return; }
    if (this.options(this.turn).length) return this.waitFor(this.turn);
    const other = 1 - this.turn;
    if (this.options(other).length) {
      if (this.cardsLeft(this.turn)) this.note(`${NAMES[this.turn]}: go.`);
      this.turn = other;
      return this.waitFor(other);
    }
    this.award(this.lastPlayer, 1, 'go');
    if (this.phase !== 'peg') return;
    this.wait(0.8, () => { this.resetCount(); this.turn = 1 - this.lastPlayer; this.nextTurn(); });
  }

  waitFor(seat) {
    this.waiting = seat;
    this.say(seat === YOU ? 'Your turn.' : "The AI's turn.");
  }

  resetCount() { this.older.push(...this.pile); this.pile = []; this.count = 0; }

  /** A seat plays the k-th card of its hand onto the pile, and pegs what it scores. */
  play(seat, k) {
    const card = this.hands[seat][k];
    this.played[seat][k] = true;
    this.pile.push(card);
    this.history.push({ seat, card });
    this.count = countOf(this.pile);
    this.lastPlayer = seat;
    this.waiting = null;
    this.note(`${NAMES[seat]} played ${cardName(card)}: ${this.count}.`);
    const points = pegPoints(this.pile);
    if (points.total) this.award(seat, points.total, sayParts(points.parts));
    if (this.phase !== 'peg') return;
    this.turn = 1 - seat;
    this.wait(0.5, () => this.nextTurn());
  }

  /** The show: the non-dealer's hand, the dealer's hand, then the crib, each with the starter. */
  startShow() {
    this.phase = 'show';
    this.resetCount(); this.older = [];
    const pone = 1 - this.dealer;
    const steps = [[pone, 'hand'], [this.dealer, 'hand'], [this.dealer, 'crib']];
    const next = (i) => {
      if (this.phase !== 'show') return;
      if (i === steps.length) return this.endHand();
      const [seat, what] = steps[i];
      const cards = what === 'crib' ? this.crib : this.hands[seat];
      const s = scoreHand(cards, this.starter, what === 'crib');
      this.showing = { seat, what, cards };
      const whose = seat === YOU ? 'Your' : "The AI's";
      this.say(`${whose} ${what}: ${s.total ? sayParts(s.parts) : 'no points'}.`);
      if (s.total) this.award(seat, s.total, `${what}`);
      if (this.phase === 'show') this.wait(4, () => next(i + 1));
    };
    next(0);
  }

  endHand() {
    this.handsPlayed++;
    this.showing = null;
    this.dealer = 1 - this.dealer;
    this.newHand();
  }

  /** Points to a seat, moving its pegs; 121 ends the game at once, even mid-hand. */
  award(seat, points, why) {
    this.backPeg[seat] = this.scores[seat];
    this.scores[seat] = Math.min(this.goal, this.scores[seat] + points);
    this.note(`${NAMES[seat]} ${seat === YOU ? 'peg' : 'pegs'} ${points}: ${why}.`);
    if (this.scores[seat] >= this.goal) {
      this.phase = 'over';
      this.pending = null; this.waiting = null;
      this.say(seat === YOU ? `You win, ${this.scores[YOU]} to ${this.scores[AI]}!` : `The AI wins, ${this.scores[AI]} to ${this.scores[YOU]}.`);
    }
  }

  // ── what a player may do ──────────────────────────────────────────────

  /** What a seat must decide now, or null: { kind: 'throw' | 'play', legal: action numbers } (0–14 throws, 15–18 a card). */
  decision(seat) {
    if (this.pending) return null;
    if (this.phase === 'discard' && !this.thrown[seat]) return { kind: 'throw', legal: THROWS.map((_, t) => t) };
    if (this.phase === 'peg' && this.waiting === seat) return { kind: 'play', legal: this.options(seat).map((k) => 15 + k) };
    return null;
  }

  /** Make a move: a throw (0–14) or play the card at place action − 15. */
  move(seat, action) {
    const d = this.decision(seat);
    if (!d || !d.legal.includes(action)) throw new Error(`${NAMES[seat]} cannot make move ${action} now`);
    if (action < 15) this.throwCards(seat, action); else this.play(seat, action - 15);
  }

  /** For now both seats play the same way: the first move each may make. */
  standIn() {
    for (const seat of [YOU, AI]) {
      const d = this.decision(seat);
      if (d) { this.move(seat, d.legal[0]); return; }
    }
  }

  // ── each frame ────────────────────────────────────────────────────────

  update(dt) {
    if (this.pending) {
      this.timer -= dt;
      if (this.timer <= 0) { const then = this.pending; this.pending = null; then(); }
    } else this.standIn();
    this.layout();
  }

  /** Wait, then go on. */
  wait(seconds, then) { this.pending = then; this.timer = this.fast ? 0 : seconds; }

  // ── drawing, in words for now ─────────────────────────────────────────

  say(text) { this.hud.message.text = text; }
  note(text) { this.lines = [...this.lines, text].slice(-6); }

  layout() {
    const hand = (seat) => this.hands[seat].map((c, k) => (this.played[seat]?.[k] ? '··' : cardName(c))).join(' ');
    this.hud.hands.text = `Your hand: ${hand(YOU)}\nAI's hand: ${hand(AI)}\nCrib: ${this.crib.length} cards   Starter: ${this.starter ? cardName(this.starter) : '–'}`;
    this.hud.status.text = `You ${this.scores[YOU]}   AI ${this.scores[AI]}   Dealer: ${NAMES[this.dealer]}`;
    this.hud.count.text = this.phase === 'peg' ? `Count\n${this.count}` : '';
    this.hud.cribLabel.text = this.dealer === YOU ? 'Your crib' : "AI's crib";
    this.hud.log.text = this.lines.join('\n');
  }
}
