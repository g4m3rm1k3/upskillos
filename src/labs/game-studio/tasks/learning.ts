// The course's bonus chapter, "A game that learns": train a Q-learning agent to play Breakout
// (lesson 8.1; ml/qlearning.ts, the method of the ML Lab's lesson 37.4).
//
// The game is the finished Breakout example; what the learner builds is the environment around it. The
// task starts with Breakout's environment minus its bins, so the first two steps turn the game's numbers
// into the states of a Q table. Then it trains, watches the agent play, and trains again on coarser states
// to see what the table can no longer tell apart. Every step is done in Run › Train an agent…, so the
// checks are editor checks, on what the dialog holds and what training reported.

import type { GameTask, TrainingView } from './types';
import type { EnvSpec, Reading } from '../ml/env';
import { breakout } from '../examples/breakout';
import { BREAKOUT_SPEC } from '../ml/breakout';
import { cliffWalk, CLIFF_SPEC } from '../examples/cliffWalk';
import { breakoutLab, breakoutLabCode, PADDLE_AGENT, PADDLE_AGENT_FEATURES, PADDLE_AGENT_SIDEWAYS, PADDLE_SPEC, FULL_WALL, PYRAMID, wallScript } from '../examples/breakoutLab';
import type { PlayView, ProjectView } from './types';
import type { QOptions } from '../ml/qlearning';
import { FINISHED, GOAL_BRAINS, PADDLE_FEATURES_GOAL } from './goals';
import { ghostLab, ghostLabCode, GHOST_AGENT, GHOST_PLAYER, GHOST_SPEC, TRAP } from '../examples/ghostLab';
import { stubMethod } from './cribbage';
import type { Node } from '../engine/nodes';

/** Breakout's environment without bins: what the agent sees, does and earns, but no states yet. */
const UNBINNED: EnvSpec = { ...BREAKOUT_SPEC, observation: BREAKOUT_SPEC.observation!.map(({ bins: _bins, ...r }) => r) };
const ACROSS = [-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], COARSE = [-0.1, 0.1];

const reading = (spec: EnvSpec | null | undefined, path: string, minus?: string): Reading | undefined =>
  spec?.observation?.find((o) => o.path === path && (minus === undefined || o.minus === minus));
const acrossOf = (spec: EnvSpec | null | undefined) => reading(spec, 'Ball:position.x', 'Paddle:position.x');
const cuts = (r: Reading | undefined) => (Array.isArray(r?.bins) ? r!.bins!.filter((c) => typeof c === 'number') : []);
const increasing = (c: number[]) => c.every((x, i) => i === 0 || x > c[i - 1]);

/** Bins on the ball-across reading: at least 5 increasing cuts, with one below and one above 0 (the paddle's middle). */
function fineAcross(spec: EnvSpec | null | undefined): true | string {
  if (!spec) return 'Open Run › Train an agent… to see the environment.';
  const r = acrossOf(spec);
  if (!r) return 'Keep the first reading: { "path": "Ball:position.x", "minus": "Paddle:position.x", … }.';
  const c = cuts(r);
  if (!c.length) return 'Add "bins": [-0.25, -0.1, -0.03, 0.03, 0.1, 0.25] to the first reading (the ball’s x minus the paddle’s).';
  if (!increasing(c)) return 'The cut points must go up: each one larger than the one before.';
  if (c.length < 5) return `${c.length} cut points make ${c.length + 1} bins. Use 6 (7 bins), so "over the paddle" and "just off it" are different states.`;
  if (!(c[0] < 0 && c[c.length - 1] > 0)) return 'Cut on both sides of 0, so "left of the paddle" and "right of it" are different states.';
  return true;
}

/** A finished Q-learning run whose spec has fine across bins and the up/down bin, and beat random play clearly. */
const goodRun = (runs: TrainingView['runs']) =>
  runs.find((r) => r.method === 'q' && fineAcross(r.spec) === true && cuts(reading(r.spec, 'Ball:velocity.y')).length > 0 && r.score > r.random + 10);

// ── Lessons 9.9 to 9.11: NPCs that learn (Ghost Lab) ─────────────────────────

/** The ghost with its agent methods to write (lesson 9.9). */
const GHOST_STUB = [
  ['observe()', `    return [0, 0];   // write it: where the player is heading (this.player.target) minus this ghost's cell, across and down, in cells`],
  ['legalActions()', `    return [];   // write it: [] when resting, waiting (this.wait > 0), done, or between cells (not this.deciding); else this.ways()`],
  ['act(action)', `    // write it: head off in DIRS[action]: set this.dir, this.target (the next cell), this.deciding = false, and pay for
    // the step (this.earned -= 1)`],
].reduce((src, [head, body]) => stubMethod(src, head, body), GHOST_AGENT)
  .replace('  reward() { const r = this.earned; this.earned = 0; return r; }', '  reward() { return 0; }   // write it: what it earned since its last move (this.earned), then clear it')
  .replace('  done() { return this.caught || this.player.over; }', '  done() { return false; }   // write it: it has caught the player, or the game is over');

/** The ambusher (lesson 9.11): the same ghost, aiming four cells ahead of the player, with a brain of its own. */
export const AMBUSHER = `import Ghost from './ghost.js';

// The ambusher: the same ghost, with a different job. It looks where the player will be four cells on, so it learns
// to cut the player off rather than chase. It has its own brain, and it hunts while it trains.
export default class Ambusher extends Ghost {
  brain = 'brains/ambusher.json';
  get resting() { return false; }
  observe() {
    const p = this.player.target, d = this.player.dir;
    return [p.x + 4 * d.x - this.cell.x, p.y + 4 * d.y - this.cell.y];
  }
}
`;

type GhostNode = Node & Record<string, unknown> & { observe(): number[]; legalActions(): number[]; act(a: number): void; reward(): number; done(): boolean; cell: { x: number; y: number }; player: { target: { x: number; y: number }; dir: { x: number; y: number } }; deciding: boolean; caught: boolean; target: { x: number; y: number } };
/** Ghost Lab as training runs it (the player wanders); the first ghost. */
async function trainingGhost(v: PlayView, path = 'Ghosts/Ghost', seconds = 0.05) {
  const r = await v.play({ seconds, training: path });
  if (r.errors.length) throw new Error(r.errors[0]);
  return { g: r.node(path) as unknown as GhostNode, r };
}
const ghostRuns = (v: { training?: TrainingView }, agent = 'Ghosts/Ghost') => (v.training?.runs ?? []).filter((r) => r.method === 'q' && r.spec.agent === agent);
const GHOST_RUN = { method: 'q' as const, spec: GHOST_SPEC, score: 12, random: -72 };

function ghostTasks(): GameTask[] {
  const save = (path: string, brain: unknown) => `project.saveBrain(${JSON.stringify(path)}, ${JSON.stringify(brain)})`;
  return [
    {
      id: 'ghost-agent',
      finished: FINISHED.ghost,
      chain: 'Game AI that learns',
      title: 'A ghost that learns to hunt',
      goal: 'Make Maze Chase\'s ghost a learning NPC: what it sees, which ways it may go, what it earns; train it against a wandering player; and let both ghosts share its brain.',
      images: ghostLab.images,
      start: ghostLabCode(GHOST_STUB),
      agent: GHOST_SPEC,
      steps: [
        {
          text: 'Open scripts/ghost.js. Write observe(): where the player is heading (this.player.target) minus the ghost\'s cell (this.cell), across and down, in cells.',
          check: { kind: 'play', test: async (v) => {
            const { g } = await trainingGhost(v);
            const o = g.observe(), want = [g.player.target.x - g.cell.x, g.player.target.y - g.cell.y];
            return JSON.stringify(o) === JSON.stringify(want) || `observe() should be ${JSON.stringify(want)} here; it is ${JSON.stringify(o)}.`;
          } },
        },
        {
          text: 'Write legalActions(): nothing ([]) while it is resting, waiting to come out, done, or between cells; at a cell centre (this.deciding), the ways it may go, this.ways(): the open directions, not straight back.',
          check: { kind: 'play', test: async (v) => {
            const { g } = await trainingGhost(v);
            const legal = g.legalActions(), ways = (g.ways as () => number[])();
            if (JSON.stringify(legal) !== JSON.stringify(ways)) return `At its first cell legalActions() should be this.ways(), ${JSON.stringify(ways)}; it is ${JSON.stringify(legal)}.`;
            g.deciding = false;
            return JSON.stringify(g.legalActions()) === '[]' || 'Between cells (not deciding), legalActions() should be [].';
          } },
        },
        {
          text: 'Write act(action): set off that way (this.dir = DIRS[action], this.target the next cell, this.deciding = false) and pay 1 for the step (this.earned -= 1). Then reward(): this.earned since the last call, cleared; and done(): it has caught the player, or the game is over.',
          check: { kind: 'play', test: async (v) => {
            const { g } = await trainingGhost(v);
            const a = g.legalActions()[0], cell = { ...g.cell };
            g.act(a);
            const d = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }][a];
            if (g.target.x !== cell.x + d.x || g.target.y !== cell.y + d.y || g.deciding) return 'act(action) should set the target to the next cell that way, and stop deciding.';
            const r1 = g.reward(), r2 = g.reward();
            if (r1 !== -1 || r2 !== 0) return `After one step reward() should be −1, then 0; it was ${r1} and ${r2}.`;
            if (g.done()) return 'done() should be false while it hunts.';
            g.caught = true;
            return g.done() === true || 'Once it has caught the player, done() should be true.';
          } },
        },
        {
          text: 'Run › Train an agent…: { "agent": "Ghosts/Ghost", "bins": [[-0.5, 0.5], [-0.5, 0.5]], "maxSteps": 150 }, Table (TD), 300 episodes, α 0.2, γ 0.97, ε 0.3 to 0.02. While it trains, the player wanders on its own (a scripted opponent) and the second ghost rests. Random play loses about 72 a game; it should learn to catch the player in a dozen steps.',
          check: { kind: 'editor', test: (v) => ghostRuns(v).some((r) => r.score > r.random + 40) || (ghostRuns(v).length ? 'Trained, but not well: check the bins and train again.' : 'Train the ghost with Table (TD).') },
        },
        {
          text: 'Save as brain: brains/ghost.json. Run the game: both ghosts use the one brain (they share the script, and its brain field). One policy, many NPCs.',
          check: { kind: 'editor', test: (v) => ((v.training?.saved ?? []).includes('brains/ghost.json') && v.ran) || 'Save as brain with brains/ghost.json, then press ▶ Run.' },
        },
      ],
      solution: `project.writeScript('scripts/ghost.js', ${JSON.stringify(GHOST_AGENT)})\n${save('brains/ghost.json', GOAL_BRAINS.ghost)}`,
      done: 'An NPC that learns is the same recipe as a paddle: what it sees, does and earns, a scripted opponent to practise on, and one brain for every copy. Back to the lesson.',
      solvedEditor: { training: { draft: GHOST_SPEC, runs: [GHOST_RUN], watched: false, saved: ['brains/ghost.json'] } },
    },
    {
      id: 'learn-or-plan',
      finished: FINISHED.ghost,
      chain: 'Game AI that learns',
      title: 'Learn or plan?',
      goal: 'On a maze built to trap a ghost, measure a planning ghost (a breadth-first search) against a learning one, against a wandering player and a still one.',
      images: ghostLab.images,
      start: ghostLabCode(GHOST_AGENT, TRAP),
      agent: GHOST_SPEC,
      steps: [
        {
          text: 'This is the trap: long walls between the ghosts and you. Press ▶ Run. There is no brain yet, so the ghosts plan: at each cell, the way with the shortest path to you (plan() in scripts/ghost.js).',
          check: { kind: 'editor', test: (v) => v.ran || 'Press ▶ Run.' },
        },
        {
          text: 'Train the ghost on the trap: { "agent": "Ghosts/Ghost", "bins": [[-0.5, 0.5], [-0.5, 0.5]], "maxSteps": 150 }, Table (TD), 300 episodes. Against the wandering player it catches in about 44 steps (−23.7), where the planner, chasing where the player is now, takes about 56 (−36): habits learned against this opponent beat a plan for the wrong problem.',
          check: { kind: 'editor', test: (v) => ghostRuns(v).some((r) => r.score > r.random + 30) || 'Train the ghost on the trap.' },
        },
        {
          text: 'Now make the target simple: in scripts/player.js set wanderSpeed = 0, so in training the player stands still, and save. The planner is now exactly right: the shortest path.',
          check: { kind: 'project', test: (v) => /wanderSpeed\s*=\s*0\s*;/.test(v.script('scripts/player.js') ?? '') || 'Set wanderSpeed = 0 in scripts/player.js.' },
        },
        {
          text: 'Train again. With the player still, the planner takes the shortest path, 30 steps, with no training at all; the learned ghost only matches it after training on this maze, and the one trained against a wanderer takes 42. Plan when the problem is known; learn when it is not.',
          check: { kind: 'editor', test: (v) => (ghostRuns(v).length >= 2 && /wanderSpeed\s*=\s*0\s*;/.test(v.script('scripts/player.js') ?? '')) || 'Train once more, with the player standing still.' },
        },
      ],
      solution: `project.writeScript('scripts/player.js', ${JSON.stringify(GHOST_PLAYER.replace('wanderSpeed = 36;', 'wanderSpeed = 0;'))})`,
      done: 'Planning is exact and free when the problem is fully known; learning wins when it is not, or when what matters is statistics of an opponent. Back to the lesson.',
      solvedEditor: { training: { draft: GHOST_SPEC, runs: [{ ...GHOST_RUN, score: -24, random: -82 }, { ...GHOST_RUN, score: -10, random: -80 }], watched: false, saved: [] } },
    },
    {
      id: 'second-npc',
      finished: FINISHED.ghost,
      chain: 'Game AI that learns',
      title: 'Capstone: a second NPC with its own job',
      goal: 'Give the second ghost a different job (ambush: aim where the player will be) and a brain of its own, train it, and play against a team of two learned NPCs.',
      images: ghostLab.images,
      start: `${ghostLabCode()}\n${save('brains/ghost.json', GOAL_BRAINS.ghost)}`,
      agent: { ...GHOST_SPEC, agent: 'Ghosts/Ghost2' },
      steps: [
        {
          text: 'Make scripts/ambusher.js: a class that extends the ghost (import Ghost from \'./ghost.js\'), with brain = \'brains/ambusher.json\', get resting() returning false (it hunts while it trains), and observe() returning where the player will be four cells on: its target plus 4 × its dir, minus the ghost\'s cell.',
          check: { kind: 'project', test: (v) => { const src = v.script('scripts/ambusher.js') ?? ''; return (/extends\s+Ghost/.test(src) && /brains\/ambusher\.json/.test(src) && /observe\s*\(/.test(src)) || 'scripts/ambusher.js should extend Ghost, name brains/ambusher.json and have its own observe().'; } },
        },
        {
          text: 'Select the second ghost (Ghosts/Ghost2). In the Inspector\'s Script section press Detach, then choose scripts/ambusher.js under Attach existing…. The first ghost keeps the chaser\'s brain.',
          check: { kind: 'play', test: async (v) => {
            const { g } = await trainingGhost(v, 'Ghosts/Ghost2');
            if (!g || g.brain !== 'brains/ambusher.json') return 'Set the second ghost\'s script to scripts/ambusher.js.';
            const o = g.observe(), p = g.player, want = [p.target.x + 4 * p.dir.x - g.cell.x, p.target.y + 4 * p.dir.y - g.cell.y];
            return JSON.stringify(o) === JSON.stringify(want) || `Its observe() should be ${JSON.stringify(want)} here (four cells ahead of the player); it is ${JSON.stringify(o)}.`;
          } },
        },
        {
          text: 'Train it: { "agent": "Ghosts/Ghost2", "bins": [[-0.5, 0.5], [-0.5, 0.5]], "maxSteps": 150 }, Table (TD), 300 episodes. The chaser plays with its own brain while the ambusher learns: it learns its job alongside its partner.',
          check: { kind: 'editor', test: (v) => ghostRuns(v, 'Ghosts/Ghost2').some((r) => r.score > r.random + 20) || 'Train the ambusher (Ghosts/Ghost2).' },
        },
        {
          text: 'Save as brain: brains/ambusher.json, and run. Two NPCs, two jobs, two brains. Is the team better than two chasers? In the lesson\'s grid version it was not (4.9 steps for two chasers, 6.7 with an ambusher trained 1,500 hunts): watch yours and measure before you decide. That is the whole recipe, for any game.',
          check: { kind: 'editor', test: (v) => ((v.training?.saved ?? []).includes('brains/ambusher.json') && v.ran) || 'Save as brain with brains/ambusher.json, then press ▶ Run.' },
        },
      ],
      solution: `project.writeScript('scripts/ambusher.js', ${JSON.stringify(AMBUSHER)})\nscene = project.scene('scenes/maze.scene')\nscene.get('Ghosts/Ghost2').script = 'scripts/ambusher.js'`,
      done: 'A team of learned NPCs, each with its own job. The chapter\'s recipe is yours: apply it to the games you build.',
      solvedEditor: { training: { draft: { ...GHOST_SPEC, agent: 'Ghosts/Ghost2' }, runs: [{ ...GHOST_RUN, spec: { ...GHOST_SPEC, agent: 'Ghosts/Ghost2' } }], watched: false, saved: ['brains/ambusher.json'] } },
    },
  ];
}

export const LEARNING: GameTask[] = [
  {
    id: 'q-agent',
    finished: FINISHED.breakout,
    chain: 'A game that learns',
    title: 'Train an agent with Q-learning',
    goal: 'Turn Breakout into an environment with states, and train a Q-learning agent that clears the wall on its own.',
    images: breakout.images,
    start: breakout.code,
    agent: UNBINNED,
    steps: [
      {
        text: 'Open Run › Train an agent…. It starts with what the agent sees, does and earns in Breakout, but Q-learning keeps a table, one row per state, so the numbers must be cut into bins. On the first reading (the ball’s x minus the paddle’s), add "bins": [-0.25, -0.1, -0.03, 0.03, 0.1, 0.25]: seven bins, the middle one "over the paddle" (it is 104 pixels wide, ±0.11 here).',
        // Done once typed, and stays done after a run trained on it (step 5 changes the bins again).
        check: { kind: 'editor', test: (v) => (v.training?.runs ?? []).some((r) => fineAcross(r.spec) === true) || fineAcross(v.training?.draft) },
        hint: 'Inside the first { … } of "observation", after "scale": 0.0020833…, add a comma and "bins": [-0.25, -0.1, -0.03, 0.03, 0.1, 0.25].',
      },
      {
        text: 'On the ball’s velocity.y reading, add "bins": [0]: going up (below 0) or coming down. Now there are 7 × 2 = 14 states. The other two readings have no bins, so they are not part of the state.',
        check: { kind: 'editor', test: (v) => [v.training?.draft, ...(v.training?.runs ?? []).map((r) => r.spec)].some((spec) => cuts(reading(spec, 'Ball:velocity.y')).length > 0) || (v.training?.draft ? 'Add "bins": [0] to the reading with "path": "Ball:velocity.y".' : 'Open Run › Train an agent… to see the environment.') },
      },
      {
        text: 'With Q-learning chosen, press Train (headless, about 15 seconds), or ▶ Train in view to watch every episode in the game, with a speed control: 100 episodes, α 0.2, γ 0.97, ε falling from 0.3. Watch the faint line (each episode’s return) and the blue one (the last 10 averaged) climb above random play, and the green greedy checks. Then read the table: each row a state, the green number the action it takes there.',
        check: { kind: 'editor', test: (v) => !!goodRun(v.training?.runs ?? []) || ((v.training?.runs ?? []).some((r) => r.method === 'q') ? 'Trained, but not on 14 states, or it did not beat random play by much: check the bins and train again.' : 'Press Train with Q-learning chosen, and wait for "Trained."') },
      },
      {
        text: 'Press ▶ Watch it play. The real game runs with the agent at the controls: 15 times a second it reads the ball’s position, finds its row in the table, and holds the keys of the highest Q.',
        check: { kind: 'editor', test: (v) => v.training?.watched || 'Press ▶ Watch it play in the dialog after training.' },
      },
      {
        text: 'Experiment: change the first reading’s bins to [-0.1, 0.1], three bins (left of the paddle, over it, right of it), and train again. With fewer states the table cannot tell "just off the edge" from "far away": compare the score with the 14-state agent’s.',
        check: { kind: 'editor', test: (v) => (v.training?.runs ?? []).some((r) => r.method === 'q' && cuts(acrossOf(r.spec)).length > 0 && cuts(acrossOf(r.spec)).length <= 2) || 'Train once more with Q-learning, with only two cut points on the first reading, such as [-0.1, 0.1].' },
      },
    ],
    // Nothing to build in the project: every step is done in Run › Train an agent….
    solution: '// Every step of this task is done in Run › Train an agent…',
    done: 'You trained an agent with Q-learning. Back to the lesson for why the update works, and what the table holds.',
    solvedEditor: {
      training: {
        draft: { ...UNBINNED, observation: UNBINNED.observation!.map((r, i) => (i === 0 ? { ...r, bins: COARSE } : i === 3 ? { ...r, bins: [0] } : r)) },
        runs: [
          { method: 'q', spec: { ...UNBINNED, observation: UNBINNED.observation!.map((r, i) => (i === 0 ? { ...r, bins: ACROSS } : i === 3 ? { ...r, bins: [0] } : r)) }, score: 48, random: -5.3 },
          { method: 'q', spec: { ...UNBINNED, observation: UNBINNED.observation!.map((r, i) => (i === 0 ? { ...r, bins: COARSE } : i === 3 ? { ...r, bins: [0] } : r)) }, score: 34, random: -5.3 },
        ],
        watched: true,
      },
    },
  },

  // ── Chapter 9, "Game AI that learns" ─────────────────────────────────────
  {
    id: 'td-step',
    finished: FINISHED.cliff,
    chain: 'Game AI that learns',
    title: 'Step through TD updates',
    goal: 'Watch Q-learning learn Cliff Walk one update at a time, predict updates yourself, and see what the step size α does.',
    images: cliffWalk.images,
    start: cliffWalk.code,
    agent: CLIFF_SPEC,
    steps: [
      {
        text: 'Open Run › Train an agent…. With Table (TD) and Q-learning, set episodes 200, α 0.5, γ 1, ε from 0.1 to 0.1, constant (the textbook\'s settings). Press ▶ Train in view, then Step: training pauses, and the panel writes out the last update with its numbers. Step through 5 updates, reading each line.',
        check: { kind: 'editor', test: (v) => (v.training?.stepped ?? 0) >= 5 || `Stepped ${v.training?.stepped ?? 0} of 5 updates: press Step under the game while it trains in view.` },
      },
      {
        text: 'Tick Predict. Before each Check, work out the target, R + γ · max Q(S′, ·), and the new Q(S, A) = Q(S, A) + α (target − Q(S, A)) from the numbers shown. Get 3 right (to within 0.01).',
        check: { kind: 'editor', test: (v) => { const p = v.training?.predictions ?? { right: 0, total: 0 }; return p.right >= 3 || `${p.right} right of ${p.total} checked: 3 needed. Step, work it out, type both numbers, then Check.`; } },
      },
      {
        text: 'Press Max and let it finish. The greedy walk (no exploring) should be the shortest, 13 moves: a return of −13. The arrows on the grid show why: along the row next to the spikes.',
        check: { kind: 'editor', test: (v) => !!(v.training?.runs ?? []).find((r) => r.inView && textbookQ(r.options, 0.5) && r.score === -13) || 'Let a Q-learning run in view with α 0.5 and γ 1 finish: the panel says "Trained."' },
      },
      {
        text: 'Now train in view again with α 0.05 instead of 0.5, the rest the same. Each update moves Q a tenth as far: after 200 episodes the greedy walk does not even reach the chest (it scores −200, the episode\'s step limit). A step size has to be big enough to learn in the time you have, and small enough not to chase noise.',
        check: { kind: 'editor', test: (v) => !!(v.training?.runs ?? []).find((r) => r.inView && textbookQ(r.options, 0.05)) || 'Train in view once more with α 0.05, and let it finish.' },
      },
    ],
    solution: '// Every step of this task is done in Run › Train an agent…',
    done: 'You followed TD updates by hand and saw the step size at work. Back to the lesson for TD(0) and Monte Carlo.',
    solvedEditor: {
      training: {
        draft: CLIFF_SPEC,
        runs: [
          { method: 'q', spec: CLIFF_SPEC, score: -13, random: -1751, inView: true, options: { episodes: 200, algorithm: 'q', alpha: 0.5, gamma: 1, epsilon: 0.1, epsilonEnd: 0.1, schedule: 'constant' } },
          { method: 'q', spec: CLIFF_SPEC, score: -200, random: -1751, inView: true, options: { episodes: 200, algorithm: 'q', alpha: 0.05, gamma: 1, epsilon: 0.1, epsilonEnd: 0.1, schedule: 'constant' } },
        ],
        watched: false, stepped: 5, predictions: { right: 3, total: 3 },
      },
    },
  },
  {
    id: 'explore-compare',
    finished: FINISHED.cliff,
    chain: 'Game AI that learns',
    title: 'Ways to explore',
    goal: 'Compare exploration schedules, and see an optimistic start explore with no randomness at all.',
    images: cliffWalk.images,
    start: cliffWalk.code,
    agent: CLIFF_SPEC,
    steps: [
      {
        text: 'Run › Train an agent… › Compare. With Q-learning, episodes 200, α 0.5, γ 1, add four settings: ε 0.1 to 0.1 constant; ε 0.3 to 0.01 linear; ε 0.3 to 0.01 exponential; and explore softmax, τ 5 to 0.1 exponential. Seeds 5, then Compare. Which earns most while still learning (late return), and do they all find the 13-move walk (greedy)?',
        check: { kind: 'editor', test: (v) => !!(v.training?.compared ?? []).find((c) => c.seeds >= 3 && new Set(c.options.map((o) => `${o.explore ?? 'epsilon'}/${o.schedule ?? 'linear'}`)).size >= 3) || 'Compare at least three different exploration settings (ε schedules, softmax) over 3 or more seeds.' },
      },
      {
        text: 'Optimism. Back on Table (TD), set ε from 0 to 0 (always greedy: never a random move) and Q₀ 0, and press ▶ Train in view at 4×. Every real return on the cliff is negative, so 0 is optimistic: any move it has not tried still looks better than one it has, and it tries them. Watch the colours spread over the grid, then let it finish: −13.',
        check: { kind: 'editor', test: (v) => !!(v.training?.runs ?? []).find((r) => r.inView && (r.options as QOptions) && (r.options as QOptions).explore !== 'softmax' && ((r.options as QOptions).epsilon ?? 1) === 0 && ((r.options as QOptions).epsilonEnd ?? 1) === 0 && !((r.options as QOptions).initialQ ?? 0) && r.score === -13) || 'Train in view with ε 0 to 0 and Q₀ 0, and let it finish (it should reach −13).' },
      },
      {
        text: 'Pessimism. Compare two greedy settings (ε 0 to 0) over 5 seeds: Q₀ 0, and Q₀ −100. With −100 every untried move looks worse than the walk it already knows, so it stops exploring early and keeps a longer walk on some seeds.',
        check: { kind: 'editor', test: (v) => !!(v.training?.compared ?? []).find((c) => c.seeds >= 3 && c.options.some((o) => (o.epsilon ?? 1) === 0 && !(o.initialQ ?? 0)) && c.options.some((o) => (o.epsilon ?? 1) === 0 && (o.initialQ ?? 0) <= -50)) || 'Compare ε 0 with Q₀ 0 against ε 0 with Q₀ −100 (or lower), over 3 or more seeds.' },
      },
    ],
    solution: '// Every step of this task is done in Run › Train an agent…',
    done: 'You compared ways to explore. Back to the lesson for the bandit, UCB and why optimism works.',
    solvedEditor: {
      training: {
        draft: CLIFF_SPEC,
        runs: [{ method: 'q', spec: CLIFF_SPEC, score: -13, random: -1751, inView: true, options: { episodes: 200, algorithm: 'q', alpha: 0.5, gamma: 1, explore: 'epsilon', epsilon: 0, epsilonEnd: 0, schedule: 'linear' } }],
        watched: false,
        compared: [
          { seeds: 5, options: [{ episodes: 200, epsilon: 0.1, epsilonEnd: 0.1, schedule: 'constant' }, { episodes: 200, epsilon: 0.3, epsilonEnd: 0.01, schedule: 'linear' }, { episodes: 200, epsilon: 0.3, epsilonEnd: 0.01, schedule: 'exponential' }, { episodes: 200, explore: 'softmax', temperature: 5, temperatureEnd: 0.1, schedule: 'exponential' }] },
          { seeds: 5, options: [{ episodes: 200, epsilon: 0, epsilonEnd: 0 }, { episodes: 200, epsilon: 0, epsilonEnd: 0, initialQ: -100 }] },
        ],
      },
    },
  },
  {
    id: 'breakout-scratch',
    finished: FINISHED.paddle,
    chain: 'Game AI that learns',
    title: 'Breakout learns, from scratch',
    goal: 'Turn Breakout’s paddle into an agent yourself (what it sees, does and earns), train it, ship its brain, and change the wall to see it learn again.',
    images: breakoutLab.images,
    start: breakoutLabCode(),
    agent: { agent: 'Paddle' },
    steps: [
      {
        text: 'Make the paddle an agent that can act. In scripts/paddle.js add actions = [\'left\', \'stay\', \'right\'] and move = 0, and a method act(action) that sets this.move = action − 1 and launches the ball if it is resting (if (!ball.launched && ball.lives > 0 && ball.left > 0) ball.launch(), with ball = scene.get(\'Ball\')). In physicsUpdate, steer with this.move while ai.training (or when a brain is driving), and with the keys otherwise.',
        hint: 'const steer = ai.training || ai.has(this.brain) ? this.move : input.axis(\'move_left\', \'move_right\')',
        check: { kind: 'play', test: async (v) => {
          const src = v.script('scripts/paddle.js') ?? '';
          if (!/actions\s*=\s*\[/.test(src)) return 'The paddle needs a list of its actions: actions = [\'left\', \'stay\', \'right\'].';
          if (!/\bact\s*\(\s*\w+\s*\)\s*\{/.test(src)) return 'The paddle needs a method act(action).';
          const r = await v.play({ seconds: 0.2 });
          if (r.errors.length) return `The game stopped: ${r.errors[0]}`;
          const p = r.node('Paddle') as unknown as { act?: (a: number) => void; actions?: unknown[]; move?: number };
          if (!p?.act || !Array.isArray(p.actions)) return 'Paddle has no act(action) or actions while the game runs: is paddle.js attached to it?';
          p.act(2);
          if (p.move !== 1) return 'act(2) (right) should set this.move to 1: this.move = action − 1.';
          const ball = r.node('Ball') as unknown as { launched?: boolean };
          if (!ball?.launched) return 'act() should launch the ball when it is resting on the paddle.';
          return /ai\.training/.test(src) || 'In physicsUpdate, steer with this.move while ai.training (training cannot press keys).';
        } },
      },
      {
        text: 'What it sees: add observe(), returning the numbers that decide the move. Return [(ball.x − paddle.x) / 480, falling ? 1 : 0]: how far the ball is across from the paddle, scaled to about −1 to 1, and whether it is coming down (velocity.y > 0). Give their names too: observations = [\'ball across\', \'ball falling\'].',
        check: { kind: 'play', test: async (v) => observes(v) },
      },
      {
        text: 'What it earns: add reward(), the reward since the last decision: +1 for each brick (10 points of ball.score) and −3 for each lost ball (ball.lives going down). Keep the last score and lives in ready() and update them each call. And done(): true when ball.lives <= 0 or ball.left <= 0.',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.2 });
          const p = r.node('Paddle') as unknown as { reward?: () => unknown; done?: () => unknown };
          if (typeof p?.reward !== 'function') return 'Paddle needs reward(): what it earned since the last decision.';
          if (typeof p?.done !== 'function') return 'Paddle needs done(): whether the episode is over.';
          const rw = p.reward(), d = p.done();
          if (typeof rw !== 'number' || !Number.isFinite(rw)) return `reward() should return a number; it returned ${String(rw)}.`;
          if (rw !== 0) return `At the start nothing has happened, so reward() should be 0; it returned ${rw}.`;
          return d === false || `At the start the game is not over, so done() should be false; it returned ${String(d)}.`;
        } },
      },
      {
        text: 'Train it. Run › Train an agent…: the environment is { "agent": "Paddle" }. Q-learning needs states: add "bins": [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5]] (7 bins across, the middle one "over the paddle"; and falling or not: 14 states). Press Train or ▶ Train in view. It should beat random play by far.',
        check: { kind: 'editor', test: (v) => {
          const runs = (v.training?.runs ?? []).filter((r) => r.spec.agent === 'Paddle');
          if (!runs.length) return 'Train with { "agent": "Paddle", "bins": … } and wait for "Trained."';
          return runs.some((r) => r.score > r.random + 10) || 'Trained, but it did not beat random play by much: check observe() (the difference across, not the two positions) and the bins.';
        } },
      },
      {
        text: 'Ship it: in the dialog press Save as brain (brains/paddle.json), and give the paddle’s script brain = \'brains/paddle.json\'. Press ▶ Run: the brain plays, no keys needed.',
        check: { kind: 'editor', test: (v) => {
          if (!(v.training?.saved ?? []).includes('brains/paddle.json') && !(v.project.brains ?? []).some((b) => b.path === 'brains/paddle.json')) return 'Save the trained agent as brains/paddle.json (Save as brain in the dialog).';
          return /brain\s*=\s*['"]brains\/paddle\.json['"]/.test(v.script('scripts/paddle.js') ?? '') || 'Give the paddle’s script brain = \'brains/paddle.json\'.';
        } },
      },
      {
        text: 'Change the level: in scripts/wall.js edit the map (# a brick, . a gap): one row, a pyramid, two columns at the sides. Train again (Compare the old and new walls if you like). The agent sees only the ball, not the bricks, so it learns the same skill, keeping the ball in play, and the wall changes how much that skill earns and how long learning takes.',
        check: { kind: 'editor', test: (v) => {
          const wall = v.script('scripts/wall.js') ?? '';
          if (wall.includes(JSON.stringify(FULL_WALL, null, 2))) return 'Edit the MAP in scripts/wall.js: change some # to . (or add rows).';
          return (v.training?.runs ?? []).filter((r) => r.spec.agent === 'Paddle').length >= 2 || 'Train again on the new wall.';
        } },
      },
    ],
    solution: `project.writeScript('scripts/paddle.js', ${JSON.stringify(PADDLE_AGENT)})
project.writeScript('scripts/wall.js', ${JSON.stringify(wallScript(PYRAMID))})`,
    done: 'You built a learning agent for a game from scratch. Back to the lesson: the same recipe works for your own games.',
    solvedEditor: {
      training: {
        draft: PADDLE_SPEC,
        runs: [
          { method: 'q', spec: PADDLE_SPEC, score: 48, random: -5, options: { episodes: 100 } },
          { method: 'q', spec: PADDLE_SPEC, score: 20, random: -6, options: { episodes: 100 } },
        ],
        watched: false,
        saved: ['brains/paddle.json'],
      },
    },
  },
  {
    id: 'sarsa-vs-q',
    finished: FINISHED.cliff,
    chain: 'Game AI that learns',
    title: 'SARSA against Q-learning',
    goal: 'Train SARSA and Q-learning on Cliff Walk, see one walk safe and one walk the edge, and compare them over seeds.',
    images: cliffWalk.images,
    start: cliffWalk.code,
    agent: CLIFF_SPEC,
    steps: [
      {
        text: 'Run › Train an agent… with Table (TD). Set the update to SARSA, episodes 500, α 0.5, γ 1, ε from 0.1 to 0.1, constant, and press ▶ Train in view. Watch the arrows: SARSA’s run along the top row, away from the spikes. Let it finish.',
        check: { kind: 'editor', test: (v) => !!(v.training?.runs ?? []).find((r) => r.inView && r.options?.algorithm === 'sarsa') || 'Train in view with the update set to SARSA, and let it finish.' },
      },
      {
        text: 'Now the same with the update set to Q-learning. Its arrows run along the row next to the spikes: the 13-move walk, −13. Exploring, a random step there falls off, which is why Q-learning earns less per episode while it learns.',
        check: { kind: 'editor', test: (v) => !!(v.training?.runs ?? []).find((r) => r.inView && (r.options?.algorithm ?? 'q') === 'q' && r.options?.schedule === 'constant') || 'Train in view with Q-learning (ε 0.1 constant), and let it finish.' },
      },
      {
        text: 'Compare them: in Compare, add SARSA and Q-learning with those settings (300 episodes is enough), seeds 5, Compare. SARSA has the better late return (it pays less for exploring), Q-learning the better greedy score (its walk is shorter): two questions, two answers.',
        check: { kind: 'editor', test: (v) => !!(v.training?.compared ?? []).find((c) => c.seeds >= 3 && c.options.some((o) => o.algorithm === 'sarsa') && c.options.some((o) => (o.algorithm ?? 'q') === 'q')) || 'Compare SARSA and Q-learning over 3 or more seeds.' },
      },
    ],
    solution: '// Every step of this task is done in Run › Train an agent…',
    done: 'You saw on-policy and off-policy learning disagree. Back to the lesson for why.',
    solvedEditor: {
      training: {
        draft: CLIFF_SPEC,
        runs: [
          { method: 'q', spec: CLIFF_SPEC, score: -17, random: -1751, inView: true, options: { episodes: 500, algorithm: 'sarsa', alpha: 0.5, gamma: 1, epsilon: 0.1, epsilonEnd: 0.1, schedule: 'constant' } },
          { method: 'q', spec: CLIFF_SPEC, score: -13, random: -1751, inView: true, options: { episodes: 500, algorithm: 'q', alpha: 0.5, gamma: 1, epsilon: 0.1, epsilonEnd: 0.1, schedule: 'constant' } },
        ],
        watched: false,
        compared: [{ seeds: 5, options: [{ episodes: 300, algorithm: 'sarsa' }, { episodes: 300, algorithm: 'q' }] }],
      },
    },
  },
  {
    id: 'all-four',
    finished: FINISHED.cliff,
    chain: 'Game AI that learns',
    title: 'Four ways to update',
    goal: 'Compare Q-learning, SARSA, Expected SARSA and Double Q-learning on Cliff Walk, then push the step size to 1.',
    images: cliffWalk.images,
    start: cliffWalk.code,
    agent: CLIFF_SPEC,
    steps: [
      {
        text: 'Run › Train an agent… › Compare. With episodes 300, α 0.5, γ 1, ε 0.1 to 0.1 constant, add four settings, one per update: Q-learning, SARSA, Expected SARSA, Double Q-learning. Seeds 5, Compare. Which earns most while learning? Which walks are shortest?',
        check: { kind: 'editor', test: (v) => !!(v.training?.compared ?? []).find((c) => c.seeds >= 3 && ['q', 'sarsa', 'expected-sarsa', 'double-q'].every((a) => c.options.some((o) => (o.algorithm ?? 'q') === a))) || 'Compare all four updates (Q-learning, SARSA, Expected SARSA, Double Q-learning) over 3 or more seeds.' },
      },
      {
        text: 'A bigger step: compare SARSA and Expected SARSA with α 1 (the rest the same). SARSA’s target depends on the one random next action it happens to pick, so a full step chases that noise; Expected SARSA averages over the next actions and holds up.',
        check: { kind: 'editor', test: (v) => !!(v.training?.compared ?? []).find((c) => c.seeds >= 3 && c.options.some((o) => o.algorithm === 'sarsa' && o.alpha === 1) && c.options.some((o) => o.algorithm === 'expected-sarsa' && o.alpha === 1)) || 'Compare SARSA and Expected SARSA, both with α 1, over 3 or more seeds.' },
      },
    ],
    solution: '// Every step of this task is done in Run › Train an agent…',
    done: 'You compared the four TD updates. Back to the lesson for maximization bias.',
    solvedEditor: {
      training: {
        draft: CLIFF_SPEC, runs: [], watched: false,
        compared: [
          { seeds: 5, options: [{ episodes: 300, algorithm: 'q' }, { episodes: 300, algorithm: 'sarsa' }, { episodes: 300, algorithm: 'expected-sarsa' }, { episodes: 300, algorithm: 'double-q' }] },
          { seeds: 5, options: [{ episodes: 300, algorithm: 'sarsa', alpha: 1 }, { episodes: 300, algorithm: 'expected-sarsa', alpha: 1 }] },
        ],
      },
    },
  },
  {
    id: 'experiments',
    finished: FINISHED.cliff,
    chain: 'Game AI that learns',
    title: 'A parameter study',
    goal: 'Sweep the step size α on Cliff Walk over seeds, read the means and their spread, and see more seeds tighten them.',
    images: cliffWalk.images,
    start: cliffWalk.code,
    agent: CLIFF_SPEC,
    steps: [
      {
        text: 'Run › Train an agent… › Compare. Q-learning, 100 episodes, γ 1, ε 0.1 to 0.1 constant; add α 0.1, 0.3, 0.5 and 0.9 (four settings). Seeds 5, Compare. Read each late return as mean ± spread: which α is best here, and do the spreads overlap?',
        check: { kind: 'editor', test: (v) => !!(v.training?.compared ?? []).find((c) => c.seeds >= 5 && new Set(c.options.map((o) => o.alpha)).size >= 3) || 'Compare at least three values of α over 5 or more seeds.' },
      },
      {
        text: 'The same four settings with 10 seeds. The means move a little and the ± numbers (sample standard deviations over seeds) settle; the uncertainty of each mean shrinks like 1/√(seeds). A difference you would report should be larger than that uncertainty.',
        check: { kind: 'editor', test: (v) => !!(v.training?.compared ?? []).find((c) => c.seeds >= 10 && new Set(c.options.map((o) => o.alpha)).size >= 3) || 'Compare the same α values over 10 or more seeds.' },
      },
    ],
    solution: '// Every step of this task is done in Run › Train an agent…',
    done: 'You ran a parameter study. Back to the lesson for intervals and reporting.',
    solvedEditor: {
      training: {
        draft: CLIFF_SPEC, runs: [], watched: false,
        compared: [
          { seeds: 5, options: [0.1, 0.3, 0.5, 0.9].map((alpha) => ({ episodes: 100, alpha })) },
          { seeds: 10, options: [0.1, 0.3, 0.5, 0.9].map((alpha) => ({ episodes: 100, alpha })) },
        ],
      },
    },
  },
  {
    id: 'state-design',
    finished: FINISHED.paddle,
    chain: 'Game AI that learns',
    title: 'How many states?',
    goal: 'Train Breakout’s agent on coarser and finer bins, then give it one more number, and see what each does to learning.',
    images: breakoutLab.images,
    start: `${breakoutLabCode()}\nproject.writeScript('scripts/paddle.js', ${JSON.stringify(PADDLE_AGENT)})`,
    agent: PADDLE_SPEC,
    steps: [
      {
        text: 'The paddle is already an agent (lesson 9.3). Run › Train an agent… with coarse bins across: "bins": [[-0.1, 0.1], [0.5]] (3 × 2 = 6 states: left of, over, or right of the paddle). Train. Compare its score with the 14-state agent’s (48 on most seeds).',
        check: { kind: 'editor', test: (v) => !!binnedRuns(v).find((b) => b[0] <= 2) || 'Train with only 2 cut points across, such as [-0.1, 0.1].' },
      },
      {
        text: 'Now fine bins: "bins": [[-0.5, -0.3, -0.2, -0.1, -0.05, -0.02, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5], [0.5]] (13 × 2 = 26 states). Train. Finer is not better here: each state is visited less in the same 100 episodes.',
        check: { kind: 'editor', test: (v) => !!binnedRuns(v).find((b) => b[0] >= 10) || 'Train with 10 or more cut points across.' },
      },
      {
        text: 'One more number: in scripts/paddle.js make observe() return a third number, 1 if the ball is going right (velocity.x > 0) and 0 if not, and add \'ball going right\' to observations. Train with "bins": [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5], [0.5]] (28 states). It can now tell a ball coming back off a wall from one flying away; it also has twice the states to learn.',
        check: { kind: 'editor', test: (v) => !!binnedRuns(v).find((b) => b.length >= 3) || 'Add a third number to observe(), a third list to "bins", and train.' },
      },
    ],
    solution: `project.writeScript('scripts/paddle.js', ${JSON.stringify(PADDLE_AGENT_SIDEWAYS)})`,
    done: 'You measured what states cost and buy. Back to the lesson for aliasing and the Markov property.',
    solvedEditor: {
      training: {
        draft: PADDLE_SPEC, watched: false,
        runs: [
          { method: 'q', spec: { ...PADDLE_SPEC, bins: [[-0.1, 0.1], [0.5]] }, score: 21, random: -5 },
          { method: 'q', spec: { ...PADDLE_SPEC, bins: [[-0.5, -0.3, -0.2, -0.1, -0.05, -0.02, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5], [0.5]] }, score: 46, random: -5 },
          { method: 'q', spec: { ...PADDLE_SPEC, bins: [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5], [0.5]] }, score: 44, random: -5 },
        ],
      },
    },
  },
  {
    id: 'paddle-features',
    finished: FINISHED.paddle,
    chain: 'Game AI that learns',
    title: 'Breakout with features: linear Q-learning',
    goal: 'Describe the paddle\'s moves with features instead of bins, train it with linear Q-learning, and read what each weight learned.',
    images: breakoutLab.images,
    start: `${breakoutLabCode()}\nproject.writeScript('scripts/paddle.js', ${JSON.stringify(PADDLE_AGENT)})`,
    agent: { agent: 'Paddle', maxSteps: 1200 },
    steps: [
      {
        text: 'Open scripts/paddle.js. Add featureNames (nine names) and features(action): a list of nine numbers, all 0 except the three in this move\'s block (left 0–2, stay 3–5, right 6–8), which are 1, across = (ball x − paddle x) / 480, and its size, Math.abs(across).',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.2 });
          if (r.errors.length) return `The game stopped: ${r.errors[0]}`;
          const p = r.node('Paddle') as unknown as { features?: (a: number) => unknown; position: { x: number } };
          const ball = r.node('Ball') as unknown as { position: { x: number } };
          if (typeof p?.features !== 'function') return 'The paddle needs a method features(action) that returns a list of numbers.';
          const across = (ball.position.x - p.position.x) / 480;
          for (let a = 0; a < 3; a++) {
            const phi = p.features(a) as number[], want = new Array(9).fill(0);
            [1, across, Math.abs(across)].forEach((x, i) => { want[a * 3 + i] = x; });
            if (!Array.isArray(phi) || phi.length !== 9 || phi.some((x, i) => Math.abs(x - want[i]) > 1e-9)) return `features(${a}) should be ${JSON.stringify(want.map((x) => +x.toFixed(3)))} here; it is ${JSON.stringify(Array.isArray(phi) ? phi.map((x) => +Number(x).toFixed(3)) : phi)}.`;
          }
          return true;
        } },
        hint: 'const phi = new Array(9).fill(0); [1, across, Math.abs(across)].forEach((x, i) => { phi[action * 3 + i] = x; }); return phi;',
      },
      {
        text: 'Run › Train an agent…, environment { "agent": "Paddle", "maxSteps": 1200 }, method Features (linear Q). Set episodes 100, α from 0.05 to 0.005, γ 0.97, ε from 0.3 to 0.02, and Train. The greedy checks should climb well above random play\'s −5.',
        check: { kind: 'editor', test: (v) => (v.training?.runs ?? []).some((r) => r.method === 'linear-q' && r.spec.agent === 'Paddle' && r.score > r.random + 20) || ((v.training?.runs ?? []).some((r) => r.method === 'linear-q') ? 'Trained, but it did not beat random play by 20: check features(action) and the settings, and train again.' : 'Train with Features (linear Q) chosen.') },
      },
      {
        text: 'Read WHAT IT LEARNED. Left\'s "across" weight should be negative (go left when the ball is to the left), right\'s positive, and stay\'s "distance" the most negative (do not stay when the ball is far). Save it as brains/paddle.json, the paddle\'s brain, and run the game.',
        check: { kind: 'editor', test: (v) => ((v.training?.saved ?? []).includes('brains/paddle.json') && v.project.brains?.some((b) => b.path === 'brains/paddle.json' && b.method === 'linear-q')) || 'Save as brain with brains/paddle.json.' },
      },
      {
        text: 'Compare: train the same paddle with Table (TD) and { "agent": "Paddle", "bins": [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5]], "maxSteps": 1200 }. Nine weights against 42 table entries: which clears more of the wall, and why might it?',
        check: { kind: 'editor', test: (v) => (v.training?.runs ?? []).some((r) => r.method === 'q' && r.spec.agent === 'Paddle') || 'Train once with Table (TD) and the bins.' },
      },
    ],
    // "Show me": the features, and the brain that training with the step 2 settings makes.
    solution: `project.writeScript('scripts/paddle.js', ${JSON.stringify(PADDLE_AGENT_FEATURES)})\nproject.saveBrain('brains/paddle.json', ${JSON.stringify(PADDLE_FEATURES_GOAL)})`,
    done: 'Nine weights instead of a table: what it learned is readable at a glance. Back to the lesson for why features generalise, and their dangers.',
    solvedEditor: {
      training: {
        draft: { agent: 'Paddle', maxSteps: 1200 }, watched: false, saved: ['brains/paddle.json'],
        runs: [
          { method: 'linear-q', spec: { agent: 'Paddle', maxSteps: 1200 }, score: 42, random: -5, options: { episodes: 100 } },
          { method: 'q', spec: PADDLE_SPEC, score: 48, random: -5 },
        ],
      },
    },
  },
  ...ghostTasks(),
];

/** A run with Q-learning, γ 1 and this α (the textbook's cliff settings otherwise). */
function textbookQ(o: QOptions | undefined, alpha: number): boolean {
  return !!o && (o.algorithm ?? 'q') === 'q' && Math.abs((o.alpha ?? 0.2) - alpha) < 1e-9 && (o.gamma ?? 0.97) === 1;
}

/** Step 2's check: observe() returns two finite numbers that change as the ball moves across. */
async function observes(v: PlayView & ProjectView): Promise<true | string> {
  if (!/observe\s*\(\s*\)\s*\{/.test(v.script('scripts/paddle.js') ?? '')) return 'The paddle needs a method observe() that returns a list of numbers.';
  const r = await v.play({ seconds: 0.2 });
  if (r.errors.length) return `The game stopped: ${r.errors[0]}`;
  const p = r.node('Paddle') as unknown as { observe?: () => unknown; position: { x: number } };
  const ball = r.node('Ball') as unknown as { position: { x: number } };
  const o = p?.observe?.();
  if (!Array.isArray(o) || !o.length || !o.every((x) => typeof x === 'number' && Number.isFinite(x))) return `observe() should return a list of numbers; it returned ${JSON.stringify(o)}.`;
  if (o.length !== 2) return `Return two numbers (across, falling); observe() gave ${o.length}.`;
  // Measured against where things are now (a saved brain may already have moved the paddle).
  const want = (ball.position.x - p.position.x) / 480;
  if (Math.abs(o[0] - want) > 1e-6) return `The first number should be (ball x − paddle x) / 480 = ${+want.toFixed(4)} here; it is ${+o[0].toFixed(4)}.`;
  p.position.x -= 240;
  const o2 = p.observe!() as number[];
  return Math.abs(o2[0] - (want + 0.5)) < 1e-6 || `Moving the paddle 240 pixels left should add 240 / 480 = 0.5 to the first number; it went from ${+o[0].toFixed(4)} to ${+o2[0].toFixed(4)}.`;
}

/** The cut counts of each binned reading, for each Paddle training run (lesson 9.7's task). */
function binnedRuns(v: { training?: TrainingView }): number[][] {
  return (v.training?.runs ?? []).filter((r) => r.spec.agent === 'Paddle').map((r) => (r.spec.bins ?? []).filter((c) => c.length).map((c) => c.length));
}
