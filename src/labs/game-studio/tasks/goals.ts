// What a learning task is building towards, shown first (the task panel's ▶ Watch the finished agent): the finished
// game with a trained brain, run beside your project without changing it. The brains in goals/ are trained ahead of
// time by GOAL_RECIPES (tasks/goals.test.ts trains them again and checks they are the same).

import type { EnvSpec } from '../ml/env';
import type { AgentPolicy } from '../ml/brain';
import type { QOptions } from '../ml/qlearning';
import type { BrainData } from '../core/types';
import { breakout } from '../examples/breakout';
import { BREAKOUT_SPEC } from '../ml/breakout';
import { cliffWalk, CLIFF_SPEC } from '../examples/cliffWalk';
import { breakoutLab, breakoutLabCode, PADDLE_AGENT } from '../examples/breakoutLab';
import { cribbage, cribbageCode } from '../examples/cribbage';
import BREAKOUT_BRAIN from './goals/breakout.json';
import CLIFF_BRAIN from './goals/cliff.json';
import PADDLE_BRAIN from './goals/paddle.json';
import PADDLE_FEATURES_BRAIN from './goals/paddle-features.json';
import GHOST_BRAIN from './goals/ghost.json';
import { ghostLab, ghostLabCode } from '../examples/ghostLab';
import type { LinearQOptions } from '../ml/linearq';

export type GoalName = 'breakout' | 'cliff' | 'paddle' | 'ghost';

/** How each was trained: Run › Train an agent…'s settings. */
export const GOAL_RECIPES: Record<GoalName, QOptions> = {
  // The dialog's defaults: 100 episodes, α 0.2, γ 0.97, ε 0.3 → 0.02, a greedy check every 10 episodes keeping the best.
  breakout: { episodes: 100, algorithm: 'q', alpha: 0.2, gamma: 0.97, explore: 'epsilon', schedule: 'linear', epsilon: 0.3, epsilonEnd: 0.02, seed: 3, checkEvery: 10 },
  // Sutton & Barto's Example 6.6 settings: ε 0.1 constant, α 0.5, γ 1, 500 episodes.
  cliff: { episodes: 500, algorithm: 'q', alpha: 0.5, gamma: 1, explore: 'epsilon', schedule: 'constant', epsilon: 0.1, epsilonEnd: 0.1, seed: 3, checkEvery: 10 },
  paddle: { episodes: 100, algorithm: 'q', alpha: 0.2, gamma: 0.97, explore: 'epsilon', schedule: 'linear', epsilon: 0.3, epsilonEnd: 0.02, seed: 3, checkEvery: 10 },
  // Ghost Lab's ghost: 300 episodes against the wandering player, a greedy check of 3 games every 10.
  ghost: { episodes: 300, algorithm: 'q', alpha: 0.2, gamma: 0.97, explore: 'epsilon', schedule: 'linear', epsilon: 0.3, epsilonEnd: 0.02, seed: 3, checkEvery: 10, checkEpisodes: 3 },
};

/** The paddle with features (lesson 9.8), trained by linear Q-learning: the settings its task asks for. */
export const PADDLE_FEATURES_RECIPE: LinearQOptions = { episodes: 100, algorithm: 'q', alpha: 0.05, alphaEnd: 0.005, gamma: 0.97, epsilon: 0.3, epsilonEnd: 0.02, schedule: 'linear', seed: 3, checkEvery: 10, checkEpisodes: 2 };

type SavedBrain = Omit<BrainData, 'path'>;
export const GOAL_BRAINS: Record<GoalName, SavedBrain> = { breakout: BREAKOUT_BRAIN as SavedBrain, cliff: CLIFF_BRAIN as SavedBrain, paddle: PADDLE_BRAIN as SavedBrain, ghost: GHOST_BRAIN as SavedBrain };
export const PADDLE_FEATURES_GOAL = PADDLE_FEATURES_BRAIN as SavedBrain;

/** A finished agent: its game (Scene API code, with the brain saved in it when the game's script drives it) and what to watch for. */
export interface FinishedAgent {
  /** What you see, in a sentence. */
  what: string;
  images: string[];
  code: string;
  /** For an agent the environment drives (no script of its own): its environment and brain. */
  agent?: { spec: EnvSpec; policy: AgentPolicy };
}

const save = (path: string, brain: SavedBrain) => `\n// The finished agent's brain, trained ahead of time.\nproject.saveBrain(${JSON.stringify(path)}, ${JSON.stringify(brain)})\n`;

export const FINISHED: Record<GoalName | 'cribbage', FinishedAgent> = {
  breakout: {
    what: 'Breakout played by a Q-learning agent: 14 states, 3 actions, 100 episodes of training. It clears the wall.',
    images: breakout.images, code: breakout.code, agent: { spec: BREAKOUT_SPEC, policy: GOAL_BRAINS.breakout.policy as AgentPolicy },
  },
  cliff: {
    what: 'Cliff Walk walked by a Q-learning agent: the table drawn on the grid, each cell\'s colour its best Q and its arrow the move it makes. It takes the shortest walk, 13 moves along the spikes.',
    images: cliffWalk.images, code: cliffWalk.code + save('brains/walker.json', GOAL_BRAINS.cliff),
    // Watched through its environment too, so the table is drawn over the grid.
    agent: { spec: CLIFF_SPEC, policy: GOAL_BRAINS.cliff.policy as AgentPolicy },
  },
  paddle: {
    what: 'Breakout Lab\'s paddle as a learning agent you will build: it sees the ball across from it and whether it is falling, and clears the wall.',
    images: breakoutLab.images, code: `${breakoutLabCode()}\nproject.writeScript('scripts/paddle.js', ${JSON.stringify(PADDLE_AGENT)})${save('brains/paddle.json', GOAL_BRAINS.paddle)}`,
  },
  ghost: {
    what: 'Maze Chase\'s two ghosts sharing one learned brain: at every junction each looks at where you are and chooses, from habits learned against a wandering player.',
    images: ghostLab.images, code: ghostLabCode() + save('brains/ghost.json', GOAL_BRAINS.ghost),
  },
  cribbage: {
    what: 'Cribbage against the AI you will build: choose a difficulty and play, and press D for the developer view, the AI\'s hand and what its brain thinks of every move.',
    images: cribbage.images, code: cribbageCode(),
  },
};
