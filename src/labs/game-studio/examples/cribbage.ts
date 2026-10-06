// Example: Cribbage, a card game against an AI that learned to play it (docs/game-studio-learning-ai-plan.md).
//
// Nothing here is pixel art: every card, the board, the pegs and the buttons are SVG, drawn by two tool scripts
// (cribbage/tools/cards.js and table.js, run in the editor). The game is in ordinary project scripts (cribbage/*.js):
//   cards.js     the deck: cards as { rank, suit }, shuffling
//   score.js     scoring the show and pegging
//   table.js     the game: deal, discard, cut, pegging, the show, to 121; your clicks; the layout
//   cardsprite.js a card on the table
//   features.js  what the AI sees of a move: features, numbers that describe it
//   partner.js   players without a brain (random, rules): the practice partner and the yardstick
//   opponent.js  the AI: a turn-based agent, driven by a linear Q brain, with a difficulty and a developer view
// The trained brain (cribbage/brain.json) is in the project, so the finished AI plays from the start.
//
// The example's code is chapter 10's task steps, in order, from an empty project (examples/cribbageBuild.ts): the
// lessons build exactly this game.

import type { GameExample } from './types';
import type { EnvSpec } from '../ml/env';
import CARDS_RAW from './cribbage/cards.js?raw';
import SCORE_RAW from './cribbage/score.js?raw';
import FEATURES_RAW from './cribbage/features.js?raw';
import PARTNER_RAW from './cribbage/partner.js?raw';
import CARD_SPRITE_RAW from './cribbage/cardsprite.js?raw';
import TABLE_RAW from './cribbage/table.js?raw';
import OPPONENT_RAW from './cribbage/opponent.js?raw';
import BRAIN from './cribbage/brain.json';
import { CB_FINISHED, CB_FINISHED_NO_BRAIN } from './cribbageBuild';

/** The files as text, with Unix line endings whatever the checkout has (Git on Windows may give \r\n). */
const lf = (text: string) => text.replace(/\r\n/g, '\n');
const CARDS = lf(CARDS_RAW);
const SCORE = lf(SCORE_RAW);
const FEATURES = lf(FEATURES_RAW);
const PARTNER = lf(PARTNER_RAW);
const CARD_SPRITE = lf(CARD_SPRITE_RAW);
const TABLE = lf(TABLE_RAW);
const OPPONENT = lf(OPPONENT_RAW);

/** The game's scripts, by project path. */
export const CRIBBAGE_SCRIPTS: Record<string, string> = {
  'scripts/cards.js': CARDS,
  'scripts/score.js': SCORE,
  'scripts/features.js': FEATURES,
  'scripts/partner.js': PARTNER,
  'scripts/cardsprite.js': CARD_SPRITE,
  'scripts/table.js': TABLE,
  'scripts/opponent.js': OPPONENT,
};

/** The trained brain: linear Q weights, one per feature (cribbage.brain.test.ts has the recipe, and checks it makes these). */
export const CRIBBAGE_BRAIN = BRAIN as { actions: string[]; observation: string[]; method: 'linear-q'; policy: { kind: 'linear-q'; features: string[]; weights: number[] }; trained: { steps: number; score: number; random: number } };

/** The finished game's code: with its trained brain, or without one (the AI plays by the rules, and a test trains one). */
export function cribbageCode(opts: { brain?: boolean } = {}): string {
  return opts.brain === false ? CB_FINISHED_NO_BRAIN : CB_FINISHED;
}

/** The AI as an environment: a turn-based agent, an episode one hand. */
export const CRIBBAGE_SPEC: EnvSpec = { agent: 'Opponent', maxSteps: 40 };

export const cribbage: GameExample = {
  id: 'cribbage',
  title: 'Cribbage',
  blurb: 'The card game, against an AI that learned it by playing: every card, the board and the pegs drawn as SVG by code, the rules in plain scripts, and a developer view that shows the AI\'s hand and what its brain thinks of every move.',
  art: 'SVG drawn by the build code (no image files)',
  images: [],
  code: cribbageCode(),
  agent: CRIBBAGE_SPEC,
  guide: [
    'Press ▶ Run, choose Easy, Medium or Hard, and play to 121. Click two cards to throw to the crib, then click cards to play them. The count, your pegs and the AI\'s are on the board at the top.',
    'Press D for the developer view: the AI\'s cards turn face up, and on the right is what its brain thinks of every move it could make, a value for each (Q, in points). Hard always plays its best; Easy and Medium sometimes pick a move that is nearly as good.',
    'Open scripts/score.js: every scoring rule is a short function. Open scripts/features.js: the numbers the AI sees about each move. Its brain is one weight per feature (brains/cribbage.json).',
    'Run › Train an agent… with { "agent": "Opponent" } and the Linear Q method trains a new brain from nothing, against the rules player in scripts/partner.js. Open scripts/tools/cards.js: the tool that drew every card. The lessons in Building Games › Cribbage build all of this step by step, from an empty project.',
  ],
};
