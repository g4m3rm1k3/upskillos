// Cribbage, chapter 10's build (docs/game-studio-course-plan.md, "The standard for every game chapter"): every
// script as each lesson leaves it, and every task step's code. The finished example (examples/cribbage.ts) is these
// steps, in order, from an empty project; the tasks (tasks/cribbage.ts) start and end at points along the same chain.
//
// The finished scripts are the files in examples/cribbage/ (they are tested as they are, by cribbage.test.ts). Each
// earlier version is cut from them: `without` removes whole functions, `swap` changes a line that must be there. A
// cut that no longer finds its text is an error here, not a silent difference.

import CARDS from './cribbage/cards.js?raw';
import SCORE from './cribbage/score.js?raw';
import CARD_TOOL from './cribbage/tools/cards.js?raw';
import TABLE_6 from './cribbage/stages/table.6.js?raw';
import TABLE_7 from './cribbage/stages/table.7.js?raw';
import CARD_SPRITE from './cribbage/cardsprite.js?raw';
import TABLE_TOOL from './cribbage/tools/table.js?raw';
import FEATURES from './cribbage/features.js?raw';
import PARTNER from './cribbage/partner.js?raw';
import TABLE_8 from './cribbage/stages/table.8.js?raw';
import TABLE_9 from './cribbage/stages/table.9.js?raw';
import OPPONENT_9 from './cribbage/stages/opponent.9.js?raw';
import OPPONENT_10 from './cribbage/stages/opponent.10.js?raw';
import OPPONENT_11 from './cribbage/stages/opponent.11.js?raw';
import OPPONENT from './cribbage/opponent.js?raw';
import TABLE_10 from './cribbage/stages/table.10.js?raw';
import TABLE_11 from './cribbage/stages/table.11.js?raw';
import TABLE from './cribbage/table.js?raw';
import BRAIN from './cribbage/brain.json';

/** Replace text that must be there. */
export function swap(src: string, from: string | RegExp, to: string): string {
  if (typeof from === 'string' ? !src.includes(from) : !from.test(src)) throw new Error(`cribbageBuild: no ${String(from).slice(0, 90)}`);
  return src.replace(from, to);
}

/**
 * Remove top-level declarations by name (a function, or a const), each with the doc comment right above it and the
 * blank line after it. A one-line declaration ends at its line; a longer one at the first line that is just } (or ];
 * or };) at the start of a line.
 */
export function without(src: string, ...names: string[]): string {
  for (const name of names) src = cutDeclaration(src, name)[0];
  return src.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '\n');
}

/** One top-level declaration, with its doc comment, as it is in the file. */
export function declaration(src: string, name: string): string {
  return cutDeclaration(src, name)[1].replace(/\n+$/, '\n');
}

function cutDeclaration(src: string, name: string): [string, string] {
  {
    const m = new RegExp(`\\n((?:export )?(?:function ${name}\\(|const ${name} =))`).exec(src);
    if (!m) throw new Error(`cribbageBuild: no declaration ${name}`);
    let start = m.index + 1;
    const before = src.slice(0, start);
    if (before.endsWith('*/\n')) start = before.lastIndexOf('/**');
    const lineEnd = src.indexOf('\n', m.index + 1);
    const line = src.slice(m.index + 1, lineEnd);
    let end: number;
    if (/[;}]\s*(\/\/.*)?$/.test(line) && !/[{[(`]\s*$/.test(line)) end = lineEnd + 1;
    else {
      const closes = ['\n}\n', '\n];\n', '\n};\n'].map((c) => src.indexOf(c, lineEnd)).filter((i) => i >= 0);
      end = Math.min(...closes) + src.slice(Math.min(...closes)).match(/^\n[}\]]+;?\n/)![0].length;
    }
    if (src[end] === '\n') end++;
    return [src.slice(0, start) + src.slice(end), src.slice(start, end)];
  }
}

/**
 * Remove methods from a class by name (two spaces in), each with the doc comment right above it. A one-line method
 * ends at its line; a longer one at the first line that is just two spaces and }.
 */
export function withoutMethods(src: string, ...names: string[]): string {
  for (const name of names) {
    const m = new RegExp(`\\n  (?:get )?${name}\\(`).exec(src);
    if (!m) throw new Error(`cribbageBuild: no method ${name}`);
    let start = m.index + 1;
    const before = src.slice(0, start);
    if (before.endsWith('*/\n')) start = before.lastIndexOf('  /**');
    const lineEnd = src.indexOf('\n', m.index + 1);
    const line = src.slice(m.index + 1, lineEnd);
    let end = /\}\s*(\/\/.*)?$/.test(line) && !/\{\s*$/.test(line) ? lineEnd + 1 : src.indexOf('\n  }\n', lineEnd) + 5;
    if (src[end] === '\n' && src[start - 2] === '\n') end++;
    src = src.slice(0, start) + src.slice(end);
  }
  // A section heading left with nothing under it goes too.
  return src.replace(/\n{3,}/g, '\n\n').replace(/ {2}\/\/ ── [^\n]*\n\n( {2}\/\/ ── )/g, '$1');
}

/** A step that writes a whole script, or a whole SVG picture. */
const w = (path: string, src: string) => `project.writeScript('${path}', ${JSON.stringify(src)})`;
const svg = (path: string, src: string) => `project.writeSvg('${path}', ${JSON.stringify(src)})`;

// ── 10.2: cards as data ─────────────────────────────────────────────────

const CARDS_VALUE = without(CARDS, 'cardName', 'cardImage', 'newDeck', 'shuffle', 'sameCard');
const CARDS_NAME = without(CARDS, 'cardImage', 'newDeck', 'shuffle', 'sameCard');
const CARDS_DECK = without(CARDS, 'cardImage', 'shuffle', 'sameCard');
const CARDS_SHUFFLE = without(CARDS, 'cardImage', 'sameCard');
/** With the picture's path (10.3). The last function, sameCard, comes with the rules player (10.8). */
const CARDS_IMAGE = without(CARDS, 'sameCard');

// ── 10.3: drawing cards with SVG ────────────────────────────────────────

const HEART = 'M0,8 C-3,5 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.5,-10 -0.8,-8.8 0,-7 C0.8,-8.8 2.5,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,5 0,8 Z';
const CORNER = `    <text x="11" y="23" font-family="Georgia, serif" font-size="19" font-weight="bold" text-anchor="middle" fill="#c1121f">5</text>
    <use href="#heart" transform="translate(11 35) scale(0.55)"/>`;
const FIVE_CORNER = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>
  <text x="11" y="23" font-family="Georgia, serif" font-size="19" font-weight="bold" text-anchor="middle" fill="#c1121f">5</text>
</svg>
`;
const FIVE_HEART = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
  <defs><path id="heart" d="${HEART}" fill="#c1121f"/></defs>
  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>
  <g>
${CORNER}
  </g>
</svg>
`;
const FIVE_PIPS = FIVE_HEART.replace('</svg>', `  <use href="#heart" transform="translate(30 30)"/>
  <use href="#heart" transform="translate(70 30)"/>
  <use href="#heart" transform="translate(50 70)"/>
  <use href="#heart" transform="translate(30 110)"/>
  <use href="#heart" transform="translate(70 110)"/>
</svg>`);
/** The five of hearts, drawn by hand: the corner, a heart defined once and used six times, the bottom half turned. */
export const FIVE_OF_HEARTS = FIVE_PIPS
  .replace('  </g>\n', `  </g>\n  <g transform="rotate(180 50 70)">\n${CORNER}\n  </g>\n`)
  .replace('translate(30 110)"', 'translate(30 110) rotate(180)"').replace('translate(70 110)"', 'translate(70 110) rotate(180)"');

/** The card tool before face cards: the ace to the ten, all pips. */
const CARD_TOOL_PIPS = swap(swap(CARD_TOOL, `  let middle;
  if (rank <= 10) middle = PIPS[rank].map(([x, y]) => pip(x, y, rank === 1 ? 2.4 : 0.95)).join('');
  else middle = \`<rect x="22" y="22" width="56" height="96" rx="4" fill="\${ink === '#111111' ? '#e8eefc' : '#fdeaea'}" stroke="\${ink}" stroke-width="1.5"/>
    <text x="50" y="76" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="bold" text-anchor="middle" fill="\${ink}">\${name}</text>\${pip(50, 98, 1)}\${pip(50, 40, 1)}\`;
`, `  const middle = PIPS[rank].map(([x, y]) => pip(x, y, rank === 1 ? 2.4 : 0.95)).join('');
`), 'for (let rank = 1; rank <= 13; rank++)', 'for (let rank = 1; rank <= 10; rank++)');

// ── 10.4 and 10.5: scoring the show, and pegging ────────────────────────

const PEG_FNS = ['countOf', 'pegPoints', 'sayParts'];
const SCORE_FIFTEENS = without(SCORE, 'pairs', 'isRun', 'runs', 'flush', 'nobs', 'scoreHand', ...PEG_FNS);
const SCORE_PAIRS = without(SCORE, 'isRun', 'runs', 'flush', 'nobs', 'scoreHand', ...PEG_FNS);
const SCORE_RUNS = without(SCORE, 'flush', 'nobs', 'scoreHand', ...PEG_FNS);
const SCORE_FLUSH = without(SCORE, 'scoreHand', ...PEG_FNS);
const SCORE_SHOW = without(SCORE, ...PEG_FNS);
const SCORE_COUNT = without(SCORE, 'pegPoints', 'sayParts');
const PEG_RUN_LINES = `  for (let length = pile.length; length >= 3; length--) {
    if (isRun(pile.slice(-length))) { parts.push({ what: \`run of \${length}\`, points: length }); break; }
  }
`;
const PEG_PAIR_LINES = `  let same = 1;
  while (same < pile.length && pile[pile.length - 1 - same].rank === card.rank) same++;
  if (same >= 2) parts.push({ what: ['', '', 'a pair', 'three of a kind', 'four of a kind'][same], points: [0, 0, 2, 6, 12][same] });
`;
const SCORE_PEG_RUNS = without(SCORE, 'sayParts');
const SCORE_PEG_PAIRS = swap(SCORE_PEG_RUNS, PEG_RUN_LINES, '');
const SCORE_PEG_COUNT = swap(SCORE_PEG_PAIRS, PEG_PAIR_LINES, '');

// ── 10.6: the table, played by a stand-in ──────────────────────────────

const FEATURES_THROWS = `// The moves a player can make, as numbers, and (lesson 10.10) what the AI sees of each move: its features.

/** The 15 ways to throw two of six cards to the crib: [i, j] with i < j. */
export const THROWS = [];
for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) THROWS.push([i, j]);
`;
const SHOW_LINE = `      if (this.phase === 'peg') this.wait(1.2, () => this.startShow());\n`;
const T6_TURNS = swap(TABLE_6, SHOW_LINE, '').replace("import { scoreHand, pegPoints, countOf, sayParts } from './score.js';", "import { pegPoints, countOf, sayParts } from './score.js';");
const T6_PLAY = swap(withoutMethods(T6_TURNS, 'startShow', 'endHand', 'cardsLeft', 'resetCount', 'nextTurn'), '  waitFor(seat) {', `  /** Whose turn now: for now, simply the player whose turn it is (the next step adds the go, and 31). */
  nextTurn() {
    this.waiting = null;
    if (this.options(this.turn).length) return this.waitFor(this.turn);
  }

  waitFor(seat) {`);
const T6_CUT = swap(swap(swap(swap(withoutMethods(T6_PLAY, 'startPegging', 'options', 'nextTurn', 'waitFor', 'play'),
  `    if (this.phase === 'peg' && this.waiting === seat) return { kind: 'play', legal: this.options(seat).map((k) => 15 + k) };\n`, ''),
  `    if (action < 15) this.throwCards(seat, action); else this.play(seat, action - 15);`, `    this.throwCards(seat, action);`),
  `    if (this.phase === 'over') return;\n    this.wait(1, () => this.startPegging());\n`, ''),
  "import { pegPoints, countOf, sayParts } from './score.js';\n", '');
const T6_AWARD = swap(withoutMethods(T6_CUT, 'cut'), `    if (this.thrown[YOU] && this.thrown[AI]) this.wait(0.6, () => this.cut());\n`, '');
const T6_THROW = withoutMethods(T6_AWARD, 'award');
const T6_DEAL = swap(swap(withoutMethods(T6_THROW, 'throwCards', 'decision', 'move', 'standIn'), '    } else this.standIn();\n', '    }\n'),
  "import { THROWS } from './features.js';\n", '');

const TABLE_SCENE = `// The table: a scene whose root runs the game, and words on a CanvasLayer (drawn over everything) to show it.
project.setSettings({ background: '#0b6b3a', pixelArt: false })
const table = project.createScene('scenes/cribbage.scene', 'Node2D', 'Table')
table.root.script = 'scripts/table.js'
table.add('CanvasLayer', { name: 'HUD' })
table.add('Label', { name: 'Status', parent: 'HUD', position: { x: 30, y: 76 }, fontSize: 16, text: '' })
table.add('Label', { name: 'Count', parent: 'HUD', position: { x: 196, y: 262 }, fontSize: 22, color: '#ffffff', text: '' })
table.add('Label', { name: 'Message', parent: 'HUD', position: { x: 290, y: 372 }, fontSize: 17, color: '#ffe8a3', text: '' })
table.add('Label', { name: 'CribLabel', parent: 'HUD', position: { x: 66, y: 398 }, fontSize: 13, color: '#a7f3d0', text: '' })
table.add('Label', { name: 'Log', parent: 'HUD', position: { x: 30, y: 110 }, fontSize: 12, color: '#d1fae5', text: '' })
table.add('Label', { name: 'Hands', parent: 'HUD', position: { x: 290, y: 200 }, fontSize: 18, color: '#ffffff', text: '' })
project.setMainScene('scenes/cribbage.scene')`;

// ── 10.7: cards on the screen, and your clicks ──────────────────────────

/** The table-art tool before the title screen's pictures (lesson 10.12 adds them). */
const PANEL = `
const panel = \`<svg xmlns="http://www.w3.org/2000/svg" width="620" height="320" viewBox="0 0 620 320">
  <rect x="2" y="2" width="616" height="316" rx="18" fill="#08351f" stroke="#f4c542" stroke-width="4" opacity="0.96"/></svg>\`;
`;
const TABLE_TOOL_BOARD = swap(swap(swap(swap(TABLE_TOOL, PANEL, ''),
  `// A tool (▶ Run tool): draws the table's pictures as SVG: the cribbage board, a peg for each player, the buttons,
// and the title screen's panel.`, `// A tool (▶ Run tool): draws the table's pictures as SVG: the cribbage board, a peg for each player, and a button.`),
  "  project.writeSvg('assets/button-small.svg', button(140, 48));\n", ''), "  project.writeSvg('assets/panel.svg', panel);\n", '');
const SPRITE_SLIDES = withoutMethods(CARD_SPRITE, 'contains');

const PEG_BLOCK = `    // The pegs: the front one at the score, the back one where it was before the last points.
    for (const seat of [YOU, AI]) {
      const [back, front] = this.pegs[seat], y = seat === YOU ? 26 : 50;
      back.position = { x: holeX(this.backPeg[seat]), y };
      front.position = { x: holeX(this.scores[seat]), y };
    }
`;
const HOLE_X = `
/** The x of a hole on the board: 0 is the start hole, then 1 to 121 along the track. */
export function holeX(score) { return score <= 0 ? 72 : 92 + (score - 1) * 6.7; }
`;
const PEGS_LINE = `    this.pegs = [[scene.get('Pegs/YouBack'), scene.get('Pegs/YouFront')], [scene.get('Pegs/AIBack'), scene.get('Pegs/AIFront')]];\n`;
/** Step 1: the pegs move on the board (the hands are still words). */
const T7_PEGS = swap(swap(TABLE_6, "    this.lines = [];          // the log, newest last\n", PEGS_LINE + "    this.lines = [];          // the log, newest last\n"),
  "    this.hud.status.text =", PEG_BLOCK + "    this.hud.status.text =") + HOLE_X;

// The words a player hears once there are clicks, and the lines that only make sense with them.
const CLICK_TEXTS: [string, string][] = [
  [`    this.say(seat === YOU ? 'Your turn: click a card to play it.' : "The AI's turn.");`, `    this.say(seat === YOU ? 'Your turn.' : "The AI's turn.");`],
  ["      this.say(`${whose} ${what}: ${s.total ? sayParts(s.parts) : 'no points'}. Click to go on.`);", "      this.say(`${whose} ${what}: ${s.total ? sayParts(s.parts) : 'no points'}.`);"],
  ["      this.say(seat === YOU ? `You win, ${this.scores[YOU]} to ${this.scores[AI]}! Click to play again.` : `The AI wins, ${this.scores[AI]} to ${this.scores[YOU]}. Click to play again.`);",
    "      this.say(seat === YOU ? `You win, ${this.scores[YOU]} to ${this.scores[AI]}!` : `The AI wins, ${this.scores[AI]} to ${this.scores[YOU]}.`);"],
  ["      // A click hurries the game along (the show waits for one).\n      if (input.isJustPressed('select') || input.isJustPressed('confirm')) this.timer = 0;\n", ''],
];
const noClicks = (src: string) => CLICK_TEXTS.reduce((t, [a, b]) => swap(t, a, b), src);
const NO_BUTTON: [string, string][] = [
  [`      log: scene.get('HUD/Log'), button: scene.get('HUD/Button'), buttonText: scene.get('HUD/ButtonText'),\n      cribLabel: scene.get('HUD/CribLabel'),\n`, `      log: scene.get('HUD/Log'), cribLabel: scene.get('HUD/CribLabel'),\n`],
  [`    const throwing = this.phase === 'discard' && !this.thrown[YOU];
    this.hud.button.visible = this.hud.buttonText.visible = throwing && this.selected.length === 2;
    this.hud.buttonText.text = 'Throw to crib';
`, ''],
];
const noButton = (src: string) => NO_BUTTON.reduce((t, [a, b]) => swap(t, a, b), src);
const TAKE_PEG = `    } else if (this.phase === 'peg' && this.waiting === YOU && picked >= 0) {
      if (this.options(YOU).includes(picked)) this.play(YOU, picked);
      else if (!this.played[YOU][picked]) this.say(\`That would take the count past 31: play another card.\`);
    }
`;
const TAKE_THROW = `      if (this.selected.length === 2 && (confirm || (click && this.hits('HUD/Button', 160, 44)))) {
        const [i, j] = [...this.selected].sort((a, b) => a - b);
        this.throwCards(YOU, THROWS.findIndex(([a, b]) => a === i && b === j));
      }
`;
/** Step 5: throwing with Enter or the button; not yet playing a card, or starting again after a game. */
const T7_THROW = noClicks(swap(swap(TABLE_7, TAKE_PEG, '    }\n'), "    if (this.phase === 'over') { if (click || confirm) this.newGame(); return; }\n", ''));
/** Step 4: choosing two cards, not yet throwing them. */
const T7_SELECT = noButton(swap(swap(withoutMethods(T7_THROW, 'hits'), TAKE_THROW, ''),
  "    const click = input.isJustPressed('select'), confirm = input.isJustPressed('confirm');", "    const click = input.isJustPressed('select');"));
/** Steps 2 and 3: the cards on the table, sliding into place; the stand-in still plays both seats. */
const T7_CARDS = swap(swap(swap(swap(swap(withoutMethods(T7_SELECT, 'takeInput', 'standIn'),
  `      this.takeInput();\n      this.standIn();\n    }\n`, `      this.standIn();\n    }\n`),
  "  // ── each frame ──", `  /** For now both seats play the same way: the first move each may make. */
  standIn() {
    for (const seat of [YOU, AI]) {
      const d = this.decision(seat);
      if (d) { this.move(seat, d.legal[0]); return; }
    }
  }

  // ── each frame ──`),
  "    this.selected = [];\n", ''), "    this.selected = seat === YOU ? [] : this.selected;\n", ''),
  "at(n, 330 + k * 86, 470 - (this.selected.includes(k) ? 24 : 0), true, 30 + k);", "at(n, 330 + k * 86, 470, true, 30 + k);");
const STAND_IN_BOTH = `// For now a stand-in plays both seats: the first move each may make. Lesson 10.7 gives your seat to your clicks,
// lesson 10.8 the AI's to a player with rules.`;
const STAND_IN_AI = `// For now a stand-in plays the AI's seat: the first move it may make. Lesson 10.8 gives it rules.`;
const T7_CARDS_TEXT = swap(T7_CARDS, STAND_IN_AI, STAND_IN_BOTH);

const BOARD_SCENE = `// The board and the pegs, drawn by a tool, and the deck where cards are dealt from.
${w('scripts/tools/table.js', TABLE_TOOL_BOARD)}
project.runTool('scripts/tools/table.js')
const table = project.scene('scenes/cribbage.scene')
table.add('Sprite2D', { name: 'Board', position: { x: 480, y: 38 }, texture: 'assets/board.svg' })
table.add('Node2D', { name: 'Pegs', zIndex: 2 })
for (const [name, texture, y, opacity] of [['YouBack', 'peg-you', 26, 0.45], ['YouFront', 'peg-you', 26, 1], ['AIBack', 'peg-ai', 50, 0.45], ['AIFront', 'peg-ai', 50, 1]])
  table.add('Sprite2D', { name, parent: 'Pegs', position: { x: 72, y }, texture: \`assets/\${texture}.svg\`, opacity })
table.add('Sprite2D', { name: 'Deck', position: { x: 108, y: 308 }, texture: 'assets/cards/back.svg', scale: { x: 0.8, y: 0.8 } })`;

// ── 10.8: a rules player, and the developer view ────────────────────────

const FEATURES_UNSEEN = `${FEATURES_THROWS}
${declaration(FEATURES, 'unseen')}`.replace("// The moves a player can make, as numbers, and (lesson 10.10) what the AI sees of each move: its features.\n",
  "// The moves a player can make, as numbers, and (lesson 10.10) what the AI sees of each move: its features.\n\nimport { newDeck, sameCard } from './cards.js';\n");
const FEATURES_EXPECTED = `${FEATURES_UNSEEN}
${declaration(FEATURES, 'expectedHand')}`.replace("import { newDeck, sameCard } from './cards.js';\n", "import { newDeck, sameCard } from './cards.js';\nimport { scoreHand } from './score.js';\n");
const PARTNER_THROW = swap(without(PARTNER, 'pickRandom', 'rulesPlay'), "import { pegPoints, countOf } from './score.js';\n", '');
const PARTNER_PLAY = without(PARTNER, 'pickRandom');

/** The AI's seat, played by rules: lesson 10.9 makes it an agent. */
const OPPONENT_RULES = `// The AI's seat: for now a player with rules (scripts/partner.js). Lesson 10.9 makes it an agent that can learn.

import { cardName } from './cards.js';
import { rulesThrow, rulesPlay } from './partner.js';

const AI = 1;

export default class Opponent extends Node2D {
  ready() {
    this.table = scene.root;
  }

  act(action) {
    this.table.move(AI, action);
  }

  update() {
    const t = this.table, d = t.decision(AI);
    if (!d) return;
    this.act(d.kind === 'throw' ? rulesThrow(t.hands[AI], t.dealer === AI) : 15 + rulesPlay(t.hands[AI], d.legal.map((a) => a - 15), t.pile));
  }

  /** The developer view: its hand face up. */
  explain() {
    const t = this.table, lines = ['DEVELOPER VIEW', \`AI hand: \${t.hands?.[AI]?.map(cardName).join(' ') ?? ''}\`];
    return lines.join('\\n');
  }
}
`;
/** Step 6: the developer view, before autoplay. */
const T8_DEV = swap(swap(swap(swap(swap(withoutMethods(TABLE_8, 'partnerMove'),
  `  /** Who plays your seat when the game plays itself (autoplay): 'rules' or 'random'. */\n  partner = 'rules';\n`, ''),
  `  /** The practice partner plays your seat in a normal game too: watch the AI play it, or measure it over many games. */\n  autoplay = false;\n`, ''),
  `    } else if (this.autoplay) this.partnerMove();\n    else this.takeInput();\n`, `    } else this.takeInput();\n`),
  `      if (!this.autoplay && (input.isJustPressed('select') || input.isJustPressed('confirm'))) this.timer = 0;`, `      if (input.isJustPressed('select') || input.isJustPressed('confirm')) this.timer = 0;`),
  "import { rulesThrow, rulesPlay, pickRandom } from './partner.js';\n", '')
  .replace('  // ── what a player may do, for the AI (scripts/opponent.js) and the practice partner ─────────────', '  // ── what a player may do, for the AI (scripts/opponent.js) ──────────────────────────────────');
/** Step 5: the AI plays its seat by rules, with a pause to follow it; no developer view yet. */
const T8_AI = swap(swap(swap(swap(swap(T8_DEV, '  developer = false;\n', ''),
  "    if (input.isJustPressed('developer')) this.developer = !this.developer;\n", ''),
  `      log: scene.get('HUD/Log'), dev: scene.get('HUD/Developer'), devHint: scene.get('HUD/DevHint'),
      button: scene.get('HUD/Button'), buttonText: scene.get('HUD/ButtonText'), cribLabel: scene.get('HUD/CribLabel'),`,
  `      log: scene.get('HUD/Log'), button: scene.get('HUD/Button'), buttonText: scene.get('HUD/ButtonText'),
      cribLabel: scene.get('HUD/CribLabel'),`),
  `    this.hud.dev.visible = this.developer;
    this.hud.dev.text = this.developer ? this.opponent.explain() : '';
    this.hud.devHint.text = this.developer ? 'D: hide the AI\\'s cards' : 'D: developer view';
`, ''), "        const shown = seat === YOU || this.developer || this.phase === 'show';", "        const shown = seat === YOU || this.phase === 'show';");

// ── 10.9: the AI as an agent ────────────────────────────────────────────

/** Step 1: while it trains, the trainer makes its moves (the table now knows about training). */
const OPPONENT_GUARD = swap(OPPONENT_RULES, `  update() {
    const t = this.table`, `  update() {
    // While it trains, the trainer makes its moves; otherwise it plays by the rules (scripts/partner.js).
    if (ai.training) return;
    const t = this.table`);
const OPPONENT_REWARD = withoutMethods(OPPONENT_9, 'done');
const OPPONENT_OBSERVE = swap(withoutMethods(OPPONENT_REWARD, 'reward'), '    this.seen = [0, 0];\n', '');
const OPPONENT_LEGAL = swap(swap(withoutMethods(OPPONENT_OBSERVE, 'observe'), "  observations = ['my score', 'your score', 'count'];\n", ''), '  decideEvery = 1;\n', '');
const OPPONENT_ACTIONS = withoutMethods(OPPONENT_LEGAL, 'legalActions');

// ── 10.10: features ─────────────────────────────────────────────────────

const PEG_LAST_FIVE = `    pile.length === 0 && value(card) < 5 ? 1 : 0,
    value(card) / 10,
    handShow / 10,
    (myCrib ? 1 : -1) * CRIB_VALUE[threw[0].rank - 1][threw[1].rank - 1] / 10,
    myCrib ? 1 : -1,
`;
const PEG_RISKS = `  const others = unseen(known);
  // The chance that the next card, one the other player could hold, scores against this play.
  const fits = others.filter((c) => count + value(c) <= 31);
  const share = (test) => (others.length ? fits.filter(test).length / others.length : 0);
`;
const PEG_SHARES = `    share((c) => count + value(c) === 15 || count + value(c) === 31),
    share((c) => c.rank === card.rank),
    share((c) => pegPoints([...after, c]).parts.some((p) => p.what.startsWith('run'))),
`;
/** Step 3: the risks, before the last five numbers. */
const FEATURES_RISKS = swap(FEATURES, PEG_LAST_FIVE, '    0, 0, 0, 0, 0,   // the last five, in the next step\n');
/** Step 2: the first three numbers of the pegging block. */
const FEATURES_PEG = swap(swap(FEATURES_RISKS, PEG_RISKS, ''), PEG_SHARES + '    0, 0, 0, 0, 0,   // the last five, in the next step\n', '    0, 0, 0, 0, 0, 0, 0, 0,   // the rest, in the next steps\n');
/** Step 1: the discard's features, and the names of both blocks. */
const FEATURES_DISCARD = swap(swap(without(FEATURES, 'pegFeatures'), "import { value, newDeck, sameCard, SUITS } from './cards.js';", "import { newDeck, sameCard, SUITS } from './cards.js';"),
  "import { scoreHand, pegPoints, countOf } from './score.js';", "import { scoreHand } from './score.js';");

// ── 10.11: training the AI ──────────────────────────────────────────────

/** Step 1: the brain's name, and the table saying when there is none; self-play (partner 'brain') comes later. */
const TABLE_BRAIN = swap(swap(TABLE_11, `  /** Who plays your seat while the AI trains: 'rules', 'random', or 'brain' (the AI's saved brain: self-play). */`, `  /** Who plays your seat while the AI trains: 'rules' or 'random'. */`),
  `    const brain = this.opponent.brain;
    if (this.partner === 'random') action = pickRandom(d.legal);
    else if (this.partner === 'brain' && ai.has(brain)) action = d.legal[ai.choose(brain, d.legal.map((a) => this.featuresFor(YOU, a)))];
`, `    if (this.partner === 'random') action = pickRandom(d.legal);
`);
const SAVE_BRAIN = `// The trained brain: one weight per feature (Run › Train an agent… made it; Save as brain wrote this).
project.saveBrain('brains/cribbage.json', ${JSON.stringify(BRAIN)})`;

// ── 10.12: difficulty, and why ──────────────────────────────────────────

const WHY_LINES = `    const chosen = this.last.ranked.find((m) => m.a === action), other = this.last.ranked.find((m) => m.a !== action);
    if (!other) return;
    this.last.over = other.name;
    const w = ai.weights(this.brain);
    this.last.why = chosen.phi.map((x, i) => ({ name: this.featureNames[i].replace(/^\\w+: /, ''), part: w[i] * (x - other.phi[i]) }))
      .filter((p) => Math.abs(p.part) >= 0.01).sort((a, b) => Math.abs(b.part) - Math.abs(a.part)).slice(0, 4);
`;
const WHY_EXPLAIN = `      if (last.over) lines.push(\`Why, over \${last.over} (weight × difference):\`);
      for (const p of last.why) lines.push(\`  \${p.name.slice(0, 30).padEnd(31)} \${p.part >= 0 ? '+' : ''}\${p.part.toFixed(2)}\`);
`;
/** Step 2: every move it could have made, valued, best first; not yet why. */
const OPPONENT_RANKED = swap(swap(OPPONENT, WHY_LINES, ''), WHY_EXPLAIN, '');
const LAST_EXPLAIN = `    const last = this.last;
    if (!last) return lines.join('\\n');
    lines.push('', \`It chose: \${last.chosen}\`);
    if (last.ranked.length) {
      lines.push(last.kind === 'throw' ? 'Its best throws, by Q:' : 'Every card it could play, by Q:');
      for (const m of last.ranked.slice(0, 5)) lines.push(\`  \${m.name.padEnd(15)} \${m.q.toFixed(2)}\`);
    }
`;
/** Step 1: the title screen and a temperature for each difficulty; the developer view says which. */
const OPPONENT_TEMPERATURE = swap(swap(swap(withoutMethods(OPPONENT_RANKED, 'remember'), LAST_EXPLAIN, ''),
  '    if (!ai.training) this.remember(action);\n', ''), '    this.last = null;\n', '');
const TABLE_TITLE = withoutMethods(TABLE, 'moveName');
const TITLE_SCENE = `// The title screen: an Overlay drawn over everything, a panel, and a button for each difficulty.
${w('scripts/tools/table.js', TABLE_TOOL)}
project.runTool('scripts/tools/table.js')
const table = project.scene('scenes/cribbage.scene')
table.add('CanvasLayer', { name: 'Overlay', layer: 2 })
table.add('Node2D', { name: 'Title', parent: 'Overlay' })
table.add('Sprite2D', { name: 'Panel', parent: 'Overlay/Title', position: { x: 480, y: 290 }, texture: 'assets/panel.svg' })
table.add('Label', { name: 'Heading', parent: 'Overlay/Title', position: { x: 395, y: 160 }, fontSize: 40, color: '#f4c542', text: 'Cribbage' })
table.add('Label', { name: 'Blurb', parent: 'Overlay/Title', position: { x: 215, y: 222 }, fontSize: 16, color: '#d1fae5', text: 'Play to 121 against an AI that learned the game by playing it.\\nChoose how well it plays (or press 1, 2 or 3):' })
for (const [name, x] of [['Easy', 330], ['Medium', 480], ['Hard', 630]]) {
  table.add('Sprite2D', { name, parent: 'Overlay/Title', position: { x, y: 330 }, texture: 'assets/button-small.svg' })
  table.add('Label', { name: name + 'Text', parent: 'Overlay/Title', position: { x: x - 6 * name.length, y: 319 }, fontSize: 18, color: '#3b2a00', text: name })
}
table.add('Label', { name: 'Hint', parent: 'Overlay/Title', position: { x: 215, y: 390 }, fontSize: 13, color: '#a7f3d0', text: 'Click cards to choose them. D shows the developer view: the AI\\'s hand, and what its brain\\nthinks of every move it could make.' })`;

// ── the steps ───────────────────────────────────────────────────────────

const FIVE = 'assets/cards/5H.svg';

/** The chapter's tasks in order. Each starts where the one before ends; crib-tour (lesson 10.1) opens the finished game. */
export const CB_CHAIN = ['crib-cards', 'crib-svg', 'crib-score', 'crib-peg', 'crib-table', 'crib-screen', 'crib-rules', 'crib-agent', 'crib-features', 'crib-train', 'crib-difficulty'];

/** Each task's steps as Scene API code: steps[k] is what step k + 1 adds to what came before. */
export const CB_STEPS: Record<string, string[]> = {
  'crib-cards': [
    w('scripts/cards.js', CARDS_VALUE),
    w('scripts/cards.js', CARDS_NAME),
    w('scripts/cards.js', CARDS_DECK),
    w('scripts/cards.js', CARDS_SHUFFLE),
  ],
  'crib-svg': [
    svg(FIVE, FIVE_CORNER),
    svg(FIVE, FIVE_HEART),
    svg(FIVE, FIVE_PIPS),
    svg(FIVE, FIVE_OF_HEARTS),
    `${w('scripts/tools/cards.js', CARD_TOOL_PIPS)}
project.runTool('scripts/tools/cards.js')`,
    `${w('scripts/tools/cards.js', CARD_TOOL)}
project.runTool('scripts/tools/cards.js')
${w('scripts/cards.js', CARDS_IMAGE)}`,
  ],
  'crib-score': [
    w('scripts/score.js', SCORE_FIFTEENS),
    w('scripts/score.js', SCORE_PAIRS),
    w('scripts/score.js', SCORE_RUNS),
    w('scripts/score.js', SCORE_FLUSH),
    w('scripts/score.js', SCORE_SHOW),
  ],
  'crib-peg': [
    w('scripts/score.js', SCORE_COUNT),
    w('scripts/score.js', SCORE_PEG_COUNT),
    w('scripts/score.js', SCORE_PEG_PAIRS),
    w('scripts/score.js', SCORE_PEG_RUNS),
    w('scripts/score.js', SCORE),
  ],
  'crib-table': [
    `${w('scripts/table.js', T6_DEAL)}
${TABLE_SCENE}`,
    `${w('scripts/features.js', FEATURES_THROWS)}
${w('scripts/table.js', T6_THROW)}`,
    w('scripts/table.js', T6_AWARD),
    w('scripts/table.js', T6_CUT),
    w('scripts/table.js', T6_PLAY),
    w('scripts/table.js', T6_TURNS),
    w('scripts/table.js', TABLE_6),
    '',
  ],
  'crib-screen': [
    `${BOARD_SCENE}
${w('scripts/table.js', T7_PEGS)}`,
    `// Cards on the table: a sprite for each, and the words that stood in for them go.
${w('scripts/cardsprite.js', SPRITE_SLIDES)}
${w('scripts/table.js', T7_CARDS_TEXT)}
project.scene('scenes/cribbage.scene').get('HUD/Hands').delete()`,
    w('scripts/cardsprite.js', CARD_SPRITE),
    `project.addAction('select', ['MouseLeft'])
for (let k = 1; k <= 6; k++) project.addAction(\`pick_\${k}\`, [\`Digit\${k}\`])
${w('scripts/table.js', T7_SELECT)}`,
    `project.addAction('confirm', ['Enter', 'Space'])
const table = project.scene('scenes/cribbage.scene')
table.add('Sprite2D', { name: 'Button', parent: 'HUD', position: { x: 878, y: 470 }, texture: 'assets/button.svg', visible: false })
table.add('Label', { name: 'ButtonText', parent: 'HUD', position: { x: 822, y: 460 }, fontSize: 16, color: '#3b2a00', text: '', visible: false })
${w('scripts/table.js', T7_THROW)}`,
    w('scripts/table.js', TABLE_7),
  ],
  'crib-rules': [
    `${w('scripts/cards.js', CARDS)}
${w('scripts/features.js', FEATURES_UNSEEN)}`,
    w('scripts/features.js', FEATURES_EXPECTED),
    w('scripts/partner.js', PARTNER_THROW),
    w('scripts/partner.js', PARTNER_PLAY),
    `// The AI's seat: an Opponent node with its own script, playing by the rules.
${w('scripts/opponent.js', OPPONENT_RULES)}
project.scene('scenes/cribbage.scene').add('Node2D', { name: 'Opponent', script: 'scripts/opponent.js' })
${w('scripts/table.js', T8_AI)}`,
    `// The developer view: D shows the AI's hand, and what it is thinking.
project.addAction('developer', ['KeyD'])
const table = project.scene('scenes/cribbage.scene')
table.add('Label', { name: 'DevHint', parent: 'HUD', position: { x: 760, y: 76 }, fontSize: 13, color: '#a7f3d0', text: 'D: developer view' })
table.add('Label', { name: 'Developer', parent: 'HUD', position: { x: 700, y: 104 }, fontSize: 12, color: '#fde68a', text: '', visible: false })
${w('scripts/table.js', T8_DEV)}`,
    `${w('scripts/partner.js', PARTNER)}
${w('scripts/table.js', TABLE_8)}`,
  ],
  'crib-agent': [
    `${w('scripts/table.js', TABLE_9)}
${w('scripts/opponent.js', OPPONENT_GUARD)}`,
    w('scripts/opponent.js', OPPONENT_ACTIONS),
    w('scripts/opponent.js', OPPONENT_LEGAL),
    w('scripts/opponent.js', OPPONENT_OBSERVE),
    w('scripts/opponent.js', OPPONENT_REWARD),
    w('scripts/opponent.js', OPPONENT_9),
  ],
  'crib-features': [
    w('scripts/features.js', FEATURES_DISCARD),
    w('scripts/features.js', FEATURES_PEG),
    w('scripts/features.js', FEATURES_RISKS),
    w('scripts/features.js', FEATURES),
    `${w('scripts/opponent.js', OPPONENT_10)}
${w('scripts/table.js', TABLE_10)}`,
  ],
  'crib-train': [
    `${w('scripts/opponent.js', OPPONENT_11)}
${w('scripts/table.js', TABLE_BRAIN)}`,
    '',
    SAVE_BRAIN,
    '',
    w('scripts/table.js', TABLE_11),
    '',
  ],
  'crib-difficulty': [
    `${TITLE_SCENE}
${w('scripts/opponent.js', OPPONENT_TEMPERATURE)}
${w('scripts/table.js', TABLE_TITLE)}`,
    `${w('scripts/opponent.js', OPPONENT_RANKED)}
${w('scripts/table.js', TABLE)}`,
    w('scripts/opponent.js', OPPONENT),
    '',
  ],
};

const blocks = (steps: string[]) => steps.filter(Boolean).map((c) => `{\n${c}\n}`).join('\n');
/** The finished game: every step of every task, in order, from an empty project. */
export const CB_FINISHED = blocks(CB_CHAIN.flatMap((t) => CB_STEPS[t]));
/** The finished game without the trained brain: the AI plays by the rules, and a test can train one from nothing. */
export const CB_FINISHED_NO_BRAIN = blocks(CB_CHAIN.flatMap((t) => CB_STEPS[t]).filter((c) => c !== SAVE_BRAIN));
/** A task's start: every step of the tasks before it (the tour starts from the finished game). */
export const cbStart = (taskId: string): string => taskId === 'crib-tour' ? CB_FINISHED : blocks(CB_CHAIN.slice(0, CB_CHAIN.indexOf(taskId)).flatMap((t) => CB_STEPS[t]));
/** A task's solution: its own steps. */
export const cbSolution = (taskId: string): string => blocks(CB_STEPS[taskId]);
/** Steps 1 to k + 1 of a task (run on top of the task's start). */
export const cbStepCode = (taskId: string, k: number): string => blocks((CB_STEPS[taskId] ?? []).slice(0, k + 1));
/** Step k + 1 of a task on its own (the step pictures do the steps one after another). */
export const cbStep = (taskId: string, k: number): string => CB_STEPS[taskId]?.[k] ?? '';
