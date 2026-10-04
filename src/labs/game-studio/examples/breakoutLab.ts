// Example: Breakout Lab. Breakout, set up for teaching an agent to play it from scratch (lesson 9.3).
//
// The same game as the Breakout example, with two changes:
// - the wall is built when the game starts, from a text map in scripts/wall.js (# a brick, . a gap), so changing the
//   level is editing a few characters, and retraining shows how the agent learns on a different wall;
// - the paddle is an ordinary player's paddle: making it an agent (what it sees, does and earns) is the lesson.
// PADDLE_AGENT is that agent, written out: the tests' proof that the recipe works, and the task's "Show me".

import type { GameExample } from './types';
import type { EnvSpec } from '../ml/env';
import { BALL, BREAKOUT_CODE, BRICKS, PADDLE } from './breakout';

/** The wall's maps: 12 columns, up to 8 rows. */
export const PYRAMID = ['.....##.....', '....####....', '...######...', '..########..'];
export const FULL_WALL = ['############', '############', '############', '############'];

/** The wall script for a map. */
export const wallScript = (map: string[]) => `// The wall, built when the game starts from a map: # is a brick, . is a gap. 12 columns, up to 8 rows.
// Change the map and the level changes: one row, a pyramid, a checkerboard, gaps for the ball to slip through.
export const MAP = ${JSON.stringify(map, null, 2)}

const COLOURS = ${JSON.stringify(BRICKS)}

export default class Wall extends Node2D {
  ready() {
    MAP.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== '#') return
      const brick = scene.instantiate('scenes/brick.scene')   // a copy of the brick scene
      brick.position = { x: 84 + 72 * c, y: 70 + 36 * r }
      brick.get('Sprite').texture = COLOURS[r % 4]
      this.addChild(brick)
    }))
  }
}
`;

/** The Breakout Lab's Scene API code, with this wall. */
export function breakoutLabCode(map: string[] = FULL_WALL): string {
  const start = BREAKOUT_CODE.indexOf('// Back to the game: 12 across');
  const end = BREAKOUT_CODE.indexOf('// The paddle:');
  if (start < 0 || end < 0) throw new Error('The Breakout example changed: update breakoutLab.ts');
  return `${BREAKOUT_CODE.slice(0, start)}// Back to the game. The wall is built when the game starts, from the map in scripts/wall.js.
scene = project.scene('scenes/breakout.scene')
project.writeScript('scripts/wall.js', ${JSON.stringify(wallScript(map))})
scene.add('Node2D', { name: 'Bricks', script: 'scripts/wall.js' })

${BREAKOUT_CODE.slice(end)}`;
}

/**
 * The paddle as an agent: Breakout's paddle script with what an agent needs. It still answers the keys when no brain
 * or training is driving it, so you can play it too.
 */
export const PADDLE_AGENT = `export default class Paddle extends CharacterBody2D {
  speed = 480;   // pixels per second

  // ── The agent (Run › Train an agent… with { "agent": "Paddle", "bins": … }) ──
  actions = ['left', 'stay', 'right'];            // what it can do
  observations = ['ball across', 'ball falling']; // what it sees
  brain = 'brains/paddle.json';                   // in the game, this brain decides (once you have saved one)
  decideEvery = 4;                                // frames between decisions: 15 a second
  move = 0;

  ready() {
    this.ball = scene.get('Ball');
    this.seen = { score: 0, lives: 3 };
  }

  // What it sees: how far the ball is across from the paddle (scaled to about −1 to 1), and whether it is falling.
  observe() {
    return [(this.ball.position.x - this.position.x) / 480, this.ball.velocity.y > 0 ? 1 : 0];
  }

  // What it does: steer left, stay or steer right until the next decision; and launch the ball when it rests.
  act(action) {
    this.move = action - 1;
    if (!this.ball.launched && this.ball.lives > 0 && this.ball.left > 0) this.ball.launch();
  }

  // What it earns since the last decision: 1 a brick (10 points), −3 for a lost ball.
  reward() {
    const b = this.ball, r = (b.score - this.seen.score) / 10 - 3 * (this.seen.lives - b.lives);
    this.seen = { score: b.score, lives: b.lives };
    return r;
  }

  // The episode is over when the balls run out or the wall is cleared.
  done() { return this.ball.lives <= 0 || this.ball.left <= 0; }

  physicsUpdate(dt) {
    // A brain or training steers it; otherwise the player does.
    const steer = ai.training || ai.has(this.brain) ? this.move : input.axis('move_left', 'move_right');
    this.velocity = { x: steer * this.speed, y: 0 };
    this.moveAndSlide();
  }
}
`;

/** The agent seeing one more number: whether the ball is going right (lesson 9.7). */
export const PADDLE_AGENT_SIDEWAYS = PADDLE_AGENT
  .replace("observations = ['ball across', 'ball falling'];", "observations = ['ball across', 'ball falling', 'ball going right'];")
  .replace('return [(this.ball.position.x - this.position.x) / 480, this.ball.velocity.y > 0 ? 1 : 0];', 'return [(this.ball.position.x - this.position.x) / 480, this.ball.velocity.y > 0 ? 1 : 0, this.ball.velocity.x > 0 ? 1 : 0];');

/** The agent's environment: 7 bins across (the middle one "over the paddle") × falling or not = 14 states. */
export const PADDLE_SPEC: EnvSpec = { agent: 'Paddle', bins: [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5]], maxSteps: 1200 };

export const breakoutLab: GameExample = {
  id: 'breakout-lab',
  title: 'Breakout Lab',
  blurb: 'Breakout, ready for you to teach an agent to play it from scratch: make the paddle an agent, decide what it sees and earns, train it, and change the wall\'s map to see how it learns differently.',
  art: 'Kenney Puzzle Pack 2 (CC0)',
  images: [...BRICKS, PADDLE, BALL],
  code: breakoutLabCode(),
  agent: PADDLE_SPEC,
  guide: [
    'Press ▶ Run and play: ← → move the paddle, Space launches the ball. The wall is built when the game starts, from the map in scripts/wall.js.',
    'Open scripts/wall.js and change the map: # is a brick, . a gap. Run again: a different level.',
    'Lesson 9.3 (Building Games › Game AI that learns) turns the paddle into an agent, step by step, and trains it on your wall.',
  ],
};
