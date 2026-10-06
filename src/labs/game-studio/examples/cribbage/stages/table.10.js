// The table: a game of cribbage, from the deal to 121. It keeps the game's state (the hands, the crib, the starter,
// the count, the scores), runs its phases in order, takes your clicks, and lays the cards out each frame.
//
//   discard  both players throw two cards to the dealer's crib
//   cut      the starter is turned up (a jack: 2 for the dealer, "his heels")
//   peg      players take turns playing a card, the count going up to 31, pegging points as they go
//   show     the hands are counted, the non-dealer's first, then the dealer's, then the crib
//   over     someone reached 121
//
// The AI is the Opponent node (scripts/opponent.js). It asks this table what it may do (decision) and what each
// move is like (featuresFor), and makes its move (move). While it trains, a practice partner plays your seat, the
// game skips its pauses, and an episode is one hand.

import { newDeck, shuffle, cardName } from './cards.js';
import { scoreHand, pegPoints, countOf, sayParts } from './score.js';
import { THROWS, discardFeatures, pegFeatures } from './features.js';
import { rulesThrow, rulesPlay, pickRandom } from './partner.js';
import CardSprite from './cardsprite.js';

export const YOU = 0, AI = 1;
const NAMES = ['You', 'AI'];

export default class Table extends Node2D {
  goal = 121;
  /** Who plays your seat while the AI trains: 'rules' or 'random'. */
  partner = 'rules';
  developer = false;
  /** The practice partner plays your seat in a normal game too: watch the AI play it, or measure it over many games. */
  autoplay = false;
  /** No pauses (training never pauses). */
  fast = false;

  ready() {
    this.opponent = scene.get('Opponent');
    this.hud = {
      status: scene.get('HUD/Status'), message: scene.get('HUD/Message'), count: scene.get('HUD/Count'),
      log: scene.get('HUD/Log'), dev: scene.get('HUD/Developer'), devHint: scene.get('HUD/DevHint'),
      button: scene.get('HUD/Button'), buttonText: scene.get('HUD/ButtonText'), cribLabel: scene.get('HUD/CribLabel'),
    };
    this.pegs = [[scene.get('Pegs/YouBack'), scene.get('Pegs/YouFront')], [scene.get('Pegs/AIBack'), scene.get('Pegs/AIFront')]];
    this.cards = [];          // the CardSprite nodes on the table this hand
    this.lines = [];          // the log, newest last
    this.pending = null;      // what happens when the timer runs out
    this.timer = 0;
    this.think = 0;           // the AI's pause before it moves, so you can follow it
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
    this.clearCards();
    this.deck = shuffle(newDeck());
    this.hands = [[], []];
    for (let k = 0; k < 6; k++) for (const seat of [1 - this.dealer, this.dealer]) this.hands[seat].push(this.deck.pop());
    this.hands[YOU].sort((a, b) => a.rank - b.rank);   // your hand in order, as a player would hold it
    this.crib = [];
    this.threw = [[], []];
    this.starter = null;
    this.thrown = [false, false];
    this.selected = [];
    this.pile = []; this.older = []; this.history = []; this.count = 0;
    this.played = [[], []];
    this.showing = null;
    this.phase = 'discard';
    this.think = this.thinkTime();
    for (const card of [...this.hands[YOU], ...this.hands[AI]]) this.cards.push(this.addChild(new CardSprite(card, { x: 110, y: 310 })));
    this.say(`${NAMES[this.dealer]} dealt. Throw two cards to ${this.dealer === YOU ? 'your' : "the AI's"} crib.`);
  }

  /** A seat throws two cards (THROWS[t]: their places in the hand of six) to the crib. */
  throwCards(seat, t) {
    const [i, j] = THROWS[t], hand = this.hands[seat];
    this.crib.push(hand[i], hand[j]);
    this.threw[seat] = [hand[i], hand[j]];
    this.hands[seat] = hand.filter((_, k) => k !== i && k !== j);
    this.thrown[seat] = true;
    this.selected = seat === YOU ? [] : this.selected;
    if (seat === AI) this.note(`AI threw two cards to the crib.`);
    if (this.thrown[YOU] && this.thrown[AI]) this.wait(0.6, () => this.cut());
  }

  /** Turn up the starter. A jack is 2 for the dealer. */
  cut() {
    this.phase = 'cut';
    this.starter = this.deck.pop();
    this.cards.push(this.addChild(new CardSprite(this.starter, { x: 110, y: 310 })));
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
    if (seat === AI) this.think = this.thinkTime();
    this.say(seat === YOU ? 'Your turn: click a card to play it.' : 'The AI is thinking…');
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
      this.say(`${whose} ${what}: ${s.total ? sayParts(s.parts) : 'no points'}. Click to go on.`);
      if (s.total) this.award(seat, s.total, `${what}`);
      if (this.phase === 'show') this.wait(4, () => next(i + 1));
    };
    next(0);
  }

  endHand() {
    this.handsPlayed++;
    this.showing = null;
    if (ai.training) { this.phase = 'done'; return; }   // an episode of training is one hand
    this.dealer = 1 - this.dealer;
    this.newHand();
  }

  /** Points to a seat, moving its pegs; 121 ends the game at once, even mid-hand. */
  award(seat, points, why) {
    this.backPeg[seat] = this.scores[seat];
    this.scores[seat] = Math.min(this.goal, this.scores[seat] + points);
    this.note(`${NAMES[seat]} ${seat === YOU ? 'peg' : 'pegs'} ${points}: ${why}.`);
    if (this.scores[seat] >= this.goal && !ai.training) {
      this.phase = 'over';
      this.pending = null; this.waiting = null;
      this.say(seat === YOU ? `You win, ${this.scores[YOU]} to ${this.scores[AI]}! Click to play again.` : `The AI wins, ${this.scores[AI]} to ${this.scores[YOU]}. Click to play again.`);
    }
  }

  // ── what a player may do, for the AI (scripts/opponent.js) and your practice partner ─────────────

  /** What a seat must decide now, or null: { kind: 'throw' | 'play', legal: action numbers } (0–14 throws, 15–18 a card). */
  decision(seat, evenWhileThinking = false) {
    if (this.pending || (seat === AI && this.think > 0 && !evenWhileThinking)) return null;
    if (this.phase === 'discard' && !this.thrown[seat]) return { kind: 'throw', legal: THROWS.map((_, t) => t) };
    if (this.phase === 'peg' && this.waiting === seat) return { kind: 'play', legal: this.options(seat).map((k) => 15 + k) };
    return null;
  }

  /** Every card a seat has seen: its own (the two it threw too), the starter, and the cards the other has played. */
  known(seat) {
    return [...this.hands[seat], ...this.threw[seat], ...(this.starter ? [this.starter] : []), ...this.history.filter((h) => h.seat !== seat).map((h) => h.card)];
  }

  /** What a move is like, as numbers (scripts/features.js). */
  featuresFor(seat, action) {
    if (action < 15) return discardFeatures(this.hands[seat], THROWS[action], this.dealer === seat);
    const card = this.hands[seat][action - 15];
    return pegFeatures(card, this.pile, this.known(seat), scoreHand(this.hands[seat], this.starter).total, this.dealer === seat, this.threw[seat]);
  }

  /** Make a move: a throw (0–14) or play the card at place action − 15. */
  move(seat, action) {
    const d = this.decision(seat, true);
    if (!d || !d.legal.includes(action)) throw new Error(`${NAMES[seat]} cannot make move ${action} now`);
    if (action < 15) this.throwCards(seat, action); else this.play(seat, action - 15);
  }

  /** Your seat while the AI trains: the practice partner's move. */
  partnerMove() {
    const d = this.decision(YOU);
    if (!d) return;
    let action;
    if (this.partner === 'random') action = pickRandom(d.legal);
    else action = d.kind === 'throw' ? rulesThrow(this.hands[YOU], this.dealer === YOU) : 15 + rulesPlay(this.hands[YOU], d.legal.map((a) => a - 15), this.pile);
    this.move(YOU, action);
  }

  // ── each frame ────────────────────────────────────────────────────────

  update(dt) {
    if (input.isJustPressed('developer')) this.developer = !this.developer;
    if (this.think > 0) this.think -= dt;
    if (this.pending) {
      // A click hurries the game along (the show waits for one).
      if (!ai.training && !this.autoplay && (input.isJustPressed('select') || input.isJustPressed('confirm'))) this.timer = 0;
      this.timer -= dt;
      if (this.timer <= 0) { const then = this.pending; this.pending = null; then(); }
    } else if (ai.training || this.autoplay) this.partnerMove();
    else this.takeInput();
    if (!ai.training) this.layout();
  }

  /** Wait, then go on. Training does not wait. */
  wait(seconds, then) { this.pending = then; this.timer = ai.training || this.fast ? 0 : seconds; }
  thinkTime() { return ai.training || this.fast ? 0 : 0.8; }

  /** Your clicks (or keys 1–6 and Enter). */
  takeInput() {
    const click = input.isJustPressed('select'), confirm = input.isJustPressed('confirm');
    let picked = -1;
    for (let k = 0; k < 6; k++) if (input.isJustPressed(`pick_${k + 1}`)) picked = k;
    if (this.phase === 'over') { if (click || confirm) this.newGame(); return; }
    const mine = this.cards.filter((n) => this.hands[YOU].includes(n.card));
    if (click) { const n = mine.find((c) => c.contains(input.mouse)); if (n) picked = this.hands[YOU].indexOf(n.card); }
    if (this.phase === 'discard' && !this.thrown[YOU]) {
      if (picked >= 0 && picked < this.hands[YOU].length) {
        const s = this.selected;
        this.selected = s.includes(picked) ? s.filter((x) => x !== picked) : s.length < 2 ? [...s, picked] : [s[1], picked];
      }
      if (this.selected.length === 2 && (confirm || (click && this.hits('HUD/Button', 160, 44)))) {
        const [i, j] = [...this.selected].sort((a, b) => a - b);
        this.throwCards(YOU, THROWS.findIndex(([a, b]) => a === i && b === j));
      }
    } else if (this.phase === 'peg' && this.waiting === YOU && picked >= 0) {
      if (this.options(YOU).includes(picked)) this.play(YOU, picked);
      else if (!this.played[YOU][picked]) this.say(`That would take the count past 31: play another card.`);
    }
  }

  /** Is the pointer over this sprite, a picture width × height pixels centred on its position? */
  hits(path, width, height) {
    const n = scene.get(path), m = input.mouse;
    return n.visible && Math.abs(m.x - n.position.x) <= width / 2 && Math.abs(m.y - n.position.y) <= height / 2;
  }

  // ── drawing ───────────────────────────────────────────────────────────

  say(text) { this.hud.message.text = text; }
  note(text) {
    if (ai.training) return;
    this.lines = [...this.lines, text].slice(-6);
  }

  clearCards() { for (const n of this.cards) n.queueFree(); this.cards = []; }

  /** Where every card goes this frame, face up or down; the pegs; the words. */
  layout() {
    const at = (n, x, y, faceUp, z) => { n.target = { x, y }; n.faceUp = faceUp; n.zIndex = z; n.opacity = 1; n.visible = true; };
    const showing = this.showing, counted = showing ? [...showing.cards, this.starter] : [];
    for (const n of this.cards) {
      const c = n.card;
      const ci = counted.indexOf(c);
      if (ci >= 0) { at(n, 330 + ci * 90, 310, true, 20 + ci); continue; }
      if (c === this.starter) { at(n, 110, 310, true, 5); continue; }
      const pi = this.pile.indexOf(c);
      if (pi >= 0) { at(n, 330 + pi * 42, 310, true, 10 + pi); continue; }
      const oi = this.older.indexOf(c);
      if (oi >= 0) { at(n, 230 + oi * 3, 310, true, 2 + oi); n.opacity = 0.45; continue; }
      const cr = this.crib.indexOf(c);
      if (cr >= 0) { at(n, 110 + cr * 3, 470, false, 3 + cr); continue; }
      for (const seat of [YOU, AI]) {
        const k = this.hands[seat].indexOf(c);
        if (k < 0) continue;
        if (this.played[seat]?.[k] && this.phase === 'peg') { n.visible = false; break; }
        const shown = seat === YOU || this.developer || this.phase === 'show';
        if (seat === YOU) at(n, 330 + k * 86, 470 - (this.selected.includes(k) ? 24 : 0), true, 30 + k);
        else at(n, 300 + k * 70, 165, shown, 30 + k);
      }
    }
    // The pegs: the front one at the score, the back one where it was before the last points.
    for (const seat of [YOU, AI]) {
      const [back, front] = this.pegs[seat], y = seat === YOU ? 26 : 50;
      back.position = { x: holeX(this.backPeg[seat]), y };
      front.position = { x: holeX(this.scores[seat]), y };
    }
    this.hud.status.text = `You ${this.scores[YOU]}   AI ${this.scores[AI]}   Dealer: ${NAMES[this.dealer]}`;
    this.hud.count.text = this.phase === 'peg' ? `Count\n${this.count}` : '';
    this.hud.cribLabel.text = this.dealer === YOU ? 'Your crib' : "AI's crib";
    this.hud.log.text = this.lines.join('\n');
    const throwing = this.phase === 'discard' && !this.thrown[YOU];
    this.hud.button.visible = this.hud.buttonText.visible = throwing && this.selected.length === 2;
    this.hud.buttonText.text = 'Throw to crib';
    this.hud.dev.visible = this.developer;
    this.hud.dev.text = this.developer ? this.opponent.explain() : '';
    this.hud.devHint.text = this.developer ? 'D: hide the AI\'s cards' : 'D: developer view';
  }
}

/** The x of a hole on the board: 0 is the start hole, then 1 to 121 along the track. */
export function holeX(score) { return score <= 0 ? 72 : 92 + (score - 1) * 6.7; }

