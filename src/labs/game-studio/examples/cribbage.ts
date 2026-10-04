// Example: Cribbage, a card game against an AI that learned to play it (docs/game-studio-learning-ai-plan.md).
//
// Nothing here is pixel art: every card, the board, the pegs and the buttons are SVG, written by the build code
// (cribbage/build.js). The game is in ordinary project scripts (cribbage/*.js), each one a lesson's worth:
//   cards.js     the deck: cards as { rank, suit }, shuffling
//   score.js     scoring the show and pegging
//   table.js     the game: deal, discard, cut, pegging, the show, to 121; your clicks; the layout
//   cardsprite.js a card on the table
//   features.js  what the AI sees of a move: features, numbers that describe it
//   partner.js   players without a brain (random, rules): the practice partner and the yardstick
//   opponent.js  the AI: a turn-based agent, driven by a linear Q brain, with a difficulty and a developer view
// The trained brain (cribbage/brain.json) is in the project, so the finished AI plays from the start.

import type { GameExample } from './types';
import type { EnvSpec } from '../ml/env';
import CARDS from './cribbage/cards.js?raw';
import SCORE from './cribbage/score.js?raw';
import FEATURES from './cribbage/features.js?raw';
import PARTNER from './cribbage/partner.js?raw';
import CARD_SPRITE from './cribbage/cardsprite.js?raw';
import TABLE from './cribbage/table.js?raw';
import OPPONENT from './cribbage/opponent.js?raw';
import BUILD from './cribbage/build.js?raw';
import BRAIN from './cribbage/brain.json';

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

/**
 * The Scene API code: the scripts, then the art and the scene (build.js), then the brain if wanted. A task can start
 * from it with some scripts or pictures replaced (a module still to write, a card still to draw).
 */
export function cribbageCode(opts: { brain?: boolean; scripts?: Record<string, string>; svgs?: Record<string, string> } = {}): string {
  const sources = { ...CRIBBAGE_SCRIPTS, ...opts.scripts };
  const scripts = Object.entries(sources).map(([path, src]) => `project.writeScript(${JSON.stringify(path)}, ${JSON.stringify(src)})`).join('\n');
  const svgs = Object.entries(opts.svgs ?? {}).map(([path, src]) => `project.writeSvg(${JSON.stringify(path)}, ${JSON.stringify(src)})`).join('\n');
  const brain = opts.brain === false ? '' : `\n// The AI's trained brain: one weight per feature (Run › Train an agent… made it).\nproject.saveBrain('brains/cribbage.json', ${JSON.stringify(CRIBBAGE_BRAIN)})\n`;
  return `// Cribbage: the game is in scripts/, the art is SVG drawn below, and the AI's brain is in brains/.\n${scripts}\n\n${BUILD}${svgs ? `\n${svgs}\n` : ''}${brain}`;
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
    'Run › Train an agent… with { "agent": "Opponent" } and the Linear Q method trains a new brain from nothing, against the rules player in scripts/partner.js. The lessons in Building Games › Cribbage build all of this step by step.',
  ],
};
