// Example: Ghost Lab. Maze Chase's ghosts as learning NPCs (lessons 9.9 and 9.10).
//
// The maze, the player and the art are Maze Chase's. What changes is the ghost:
// - it is a turn-based agent: at the centre of each cell it chooses a direction, among the open ones that do not
//   turn straight back (as in Pac-Man), so legalActions() is those directions and nothing between cells;
// - it sees where the player is from it, in cells (observe()), and earns −1 a step and +20 for a catch;
// - with a brain (brains/ghost.json) the brain chooses; without one it plans with a breadth-first search, as Maze
//   Chase's ghost does, so the two can be measured against each other (lesson 9.10);
// - both ghosts use the same brain: one policy, many NPCs.
// While a ghost trains, the player is a scripted wanderer (ai.training), slower than you, choosing at random at each
// junction; and only the first ghost hunts.

import type { GameExample } from './types';
import type { EnvSpec } from '../ml/env';
import { mazeChase, MAZE } from './mazeChase';

const SHEET = 'assets/tiny-dungeon/tilemap/tilemap_packed.png';
const HERO = 'assets/tiny-dungeon/tiles/tile_0085.png';
const GHOST = 'assets/tiny-dungeon/tiles/tile_0121.png';

/** The player: Maze Chase's, but while a ghost trains it wanders on its own (a scripted opponent). */
export const GHOST_PLAYER = `export default class Player extends Sprite2D {
  speed = 60;        // pixels per second: almost 4 cells a second
  wanderSpeed = 36;  // while a ghost trains: slower, so a lone ghost can catch it
  lives = 3;
  score = 0;

  ready() {
    this.walls = scene.get('Walls');
    this.coins = scene.get('Coins');
    this.home = this.position.copy();
    this.over = false;
    this.restart();
  }

  restart() {
    this.position = this.home;
    this.cell = this.walls.localToMap(this.position);
    this.target = this.cell;
    this.dir = { x: 0, y: 0 };
    this.want = { x: 0, y: 0 };
    this.showHud();
  }

  open(cell, d) { return !this.walls.isCellSolid(cell.x + d.x, cell.y + d.y); }

  // The scripted opponent: at each cell, a random open direction, not straight back unless it must.
  wander() {
    const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }].filter((d) => this.open(this.cell, d));
    const ahead = dirs.filter((d) => !(d.x === -this.dir.x && d.y === -this.dir.y));
    const choice = ahead.length ? ahead : dirs;
    return choice[Math.floor(Math.random() * choice.length)];
  }

  update(dt) {
    if (this.over) return;
    const training = ai.training;
    if (!training) {
      if (input.isPressed('move_left')) this.want = { x: -1, y: 0 };
      if (input.isPressed('move_right')) this.want = { x: 1, y: 0 };
      if (input.isPressed('move_up')) this.want = { x: 0, y: -1 };
      if (input.isPressed('move_down')) this.want = { x: 0, y: 1 };
      if (this.want.x === -this.dir.x && this.want.y === -this.dir.y && (this.want.x || this.want.y)) {
        this.dir = this.want;
        [this.cell, this.target] = [this.target, this.cell];
      }
    }
    let step = (training ? this.wanderSpeed : this.speed) * dt;
    while (step > 0) {
      const goal = this.walls.mapToLocal(this.target);
      const gap = goal.distanceTo(this.position);
      if (gap > step) { this.position = this.position.add(goal.sub(this.position).scale(step / gap)); break; }
      this.position = goal;
      step -= gap;
      this.cell = this.target;
      if (!training) this.eat(this.cell);
      if (training) this.dir = this.wander();
      else if ((this.want.x || this.want.y) && this.open(this.cell, this.want)) this.dir = this.want;
      if (!(this.dir.x || this.dir.y) || !this.open(this.cell, this.dir)) { this.dir = { x: 0, y: 0 }; break; }
      this.target = { x: this.cell.x + this.dir.x, y: this.cell.y + this.dir.y };
    }
  }

  eat(cell) {
    if (this.coins.getCell(cell.x, cell.y) < 0) return;
    this.coins.eraseCell(cell.x, cell.y);
    this.score += 10;
    if (this.coins.getUsedCells().length === 0) this.finish('You cleared the maze!');
    this.showHud();
  }

  // A ghost calls this when it reaches the player.
  caught() {
    if (this.over) return;
    this.lives -= 1;
    if (ai.training) return;   // training: the ghost's episode ends; nothing to restart
    if (this.lives === 0) { this.finish('Caught! Press ↻ to play again.'); return; }
    this.restart();
    for (const g of scene.get('Ghosts').children) g.restart();
  }

  finish(message) {
    this.over = true;
    scene.get('HUD/Message').text = message;
    scene.get('HUD/Message').visible = true;
    this.showHud();
  }

  showHud() {
    scene.get('HUD/Score').text = \`Score: \${this.score}   Coins left: \${this.coins.getUsedCells().length}\`;
    scene.get('HUD/Lives').text = \`Lives: \${this.lives}\`;
  }
}
`;

/** The ghost as a learning agent. */
export const GHOST_AGENT = `
// A ghost that can learn (Run › Train an agent… with { "agent": "Ghosts/Ghost", "bins": … }).
//
// It moves from cell centre to cell centre. At each centre it is its turn: legalActions() is the open directions,
// except straight back (unless that is the only way), and act(action) sets off that way. Between centres it has
// no legal moves, so it is not asked. It sees where the player is from it, in cells; it earns −1 for every step and
// +20 for catching the player. With a brain (brains/ghost.json) the brain chooses; without one it plans: of the
// directions it may take, the one with the shortest path to the player (a breadth-first search), as Maze Chase's
// ghost does.
const DIRS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

/** Steps from every reachable cell to the goal: a breadth-first search outwards from the goal. */
export function distancesTo(walls, goal) {
  const key = (c) => c.x + ',' + c.y, dist = new Map([[key(goal), 0]]), queue = [goal];
  while (queue.length) {
    const c = queue.shift();
    for (const d of DIRS) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      if (!dist.has(key(n)) && !walls.isCellSolid(n.x, n.y)) { dist.set(key(n), dist.get(key(c)) + 1); queue.push(n); }
    }
  }
  return (c) => dist.get(key(c)) ?? Infinity;
}

export default class Ghost extends Sprite2D {
  actions = ['up', 'right', 'down', 'left'];
  observations = ['player across (cells)', 'player down (cells)'];
  brain = 'brains/ghost.json';
  decideEvery = 1;
  speed = 42;

  ready() {
    this.walls = scene.get('Walls');
    this.player = scene.get('Player');
    this.home = this.position.copy();
    this.delay = this.name === 'Ghost' ? 1 : 4;
    this.restart();
  }

  restart() {
    this.position = this.home;
    this.cell = this.walls.localToMap(this.position);
    this.target = this.cell;
    this.dir = { x: 0, y: 0 };
    this.wait = ai.training ? 0 : this.delay;
    this.earned = 0;
    this.caught = false;
    this.deciding = true;   // at a cell centre, waiting for a direction
  }

  // In training only the first ghost hunts; the other stays at home.
  get resting() { return ai.training && this.name !== 'Ghost'; }

  observe() {
    const p = this.player.target;
    return [p.x - this.cell.x, p.y - this.cell.y];
  }

  /** Planning: of the directions it may take, the one whose next cell is closest to the player by the maze. */
  plan() {
    const far = distancesTo(this.walls, this.player.target);
    return this.ways().reduce((best, a) => (far({ x: this.cell.x + DIRS[a].x, y: this.cell.y + DIRS[a].y }) < far({ x: this.cell.x + DIRS[best].x, y: this.cell.y + DIRS[best].y }) ? a : best));
  }

  /** The directions it may take from this cell: open, and not straight back unless it must. */
  ways() {
    const open = DIRS.map((d, a) => a).filter((a) => !this.walls.isCellSolid(this.cell.x + DIRS[a].x, this.cell.y + DIRS[a].y));
    const ahead = open.filter((a) => !(DIRS[a].x === -this.dir.x && DIRS[a].y === -this.dir.y));
    return ahead.length ? ahead : open;
  }

  legalActions() {
    if (this.resting || this.player.over || this.caught || this.wait > 0 || !this.deciding) return [];
    return this.ways();
  }

  act(action) {
    this.dir = DIRS[action];
    this.target = { x: this.cell.x + this.dir.x, y: this.cell.y + this.dir.y };
    this.deciding = false;
    this.earned -= 1;
  }

  reward() { const r = this.earned; this.earned = 0; return r; }
  done() { return this.caught || this.player.over; }

  update(dt) {
    if (this.resting || this.player.over || this.caught) return;
    if (this.wait > 0) { this.wait -= dt; return; }
    // No brain and not training: it plans (the shortest path), as Maze Chase's ghost does.
    if (this.deciding && !ai.training && !ai.has(this.brain)) this.act(this.plan());
    if (this.deciding) return;
    let step = this.speed * dt;
    while (step > 0) {
      const goal = this.walls.mapToLocal(this.target);
      const gap = goal.distanceTo(this.position);
      if (gap > step) { this.position = this.position.add(goal.sub(this.position).scale(step / gap)); break; }
      this.position = goal;
      this.cell = this.target;
      this.deciding = true;   // its turn again
      break;
    }
    if (this.position.distanceTo(this.player.position) < 10) {
      this.caught = true;
      this.earned += 20;
      this.player.caught();
      if (!ai.training) this.caught = false;
    }
  }
}
`;

/**
 * A second map, the trap: long walls between the ghosts and the player, so the straight way is usually blocked and
 * the way round is long. Same size and starts as Maze Chase's.
 */
export const TRAP = [
  '#####################',
  '#.........#.........#',
  '#.#######.#.#######.#',
  '#.#.....#...#.....#.#',
  '#.#.###.#####.###.#.#',
  '#...#.#...G...#.#...#',
  '###.#.#########.#.###',
  '#...#.....G.....#...#',
  '#.#####.#####.#####.#',
  '#.......#.P.#.......#',
  '#.#####.#.#.#.#####.#',
  '#.........#.........#',
  '#####################',
];

/** Ghost Lab's code: Maze Chase's build with the wandering player and the learning ghost, on a map. */
export function ghostLabCode(ghost: string = GHOST_AGENT, map: string[] = MAZE): string {
  const code = mazeChase.code.replace(JSON.stringify(MAZE, null, 2), JSON.stringify(map, null, 2));
  if (map !== MAZE && !code.includes(JSON.stringify(map, null, 2))) throw new Error('The Maze Chase example changed: update ghostLab.ts');
  const at = (name: string) => code.indexOf(`project.writeScript('scripts/${name}.js'`);
  const end = (start: number) => code.indexOf('\n', start);
  const p = at('player'), g = at('ghost');
  if (p < 0 || g < 0) throw new Error('The Maze Chase example changed: update ghostLab.ts');
  return `${code.slice(0, p)}project.writeScript('scripts/player.js', ${JSON.stringify(GHOST_PLAYER)})${code.slice(end(p), g)}project.writeScript('scripts/ghost.js', ${JSON.stringify(ghost)})${code.slice(end(g))}`;
}

/** The ghost's environment: where the player is, across and down, each cut into left, level, right (3 × 3 = 9 states). */
export const GHOST_SPEC: EnvSpec = { agent: 'Ghosts/Ghost', bins: [[-0.5, 0.5], [-0.5, 0.5]], maxSteps: 150 };

export const ghostLab: GameExample = {
  id: 'ghost-lab',
  title: 'Ghost Lab',
  blurb: 'Maze Chase with ghosts that can learn: each ghost is a turn-based agent choosing a direction at every junction, trained against a wandering player, and both share one brain. Without a brain they use Maze Chase\'s breadth-first search, so you can measure learning against planning.',
  art: 'Kenney Tiny Dungeon (CC0)',
  images: [SHEET, HERO, GHOST],
  code: ghostLabCode(),
  agent: GHOST_SPEC,
  guide: [
    'Press ▶ Run: with no brain yet, the ghosts hunt with a breadth-first search, as in Maze Chase.',
    'Open scripts/ghost.js: the ghost is an agent. legalActions() is the open directions at a cell centre, observe() where the player is from it, reward() −1 a step and +20 for a catch.',
    'Run › Train an agent… with { "agent": "Ghosts/Ghost", "bins": [[-0.5, 0.5], [-0.5, 0.5]] }: nine states, the player left, level or right, and above, level or below. While it trains, the player wanders on its own.',
    'Save as brain (brains/ghost.json) and run: both ghosts use the one brain. Lesson 9.10 measures it against the breadth-first search.',
  ],
};

export { MAZE };
