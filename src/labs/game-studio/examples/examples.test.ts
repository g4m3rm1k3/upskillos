// Every example builds with the real Scene API, and plays on the real engine with its
// real scripts (loaded as ES modules), with no special cases (ADR 12).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { runSceneCode } from '../core/api';
import { problems, serialize } from '../core/serialize';
import { Game, MATH, scriptGlobals, type DrawItem } from '../engine/game';
import { NODE_CLASSES, Node, type TileMapLayer, type AnimatedSprite2D, type CharacterBody2D, type Node2D, type RigidBody2D } from '../engine/nodes';
import { Vec2 } from '../engine/vec2';
import { EXAMPLES } from './index';
import { importOrder, rewriteImports } from '../runtime/scripts';
import { potionHunt } from './potionHunt';
import { platformer } from './platformer';
import { breakout } from './breakout';
import { MAZE, mazeChase } from './mazeChase';
import { zombieArena } from './zombieArena';
import type { GameExample } from './types';

/** A starter image's real size, from its PNG header (width and height are bytes 16–23), as the editor reads it. */
function pngSize(path: string): { width: number; height: number } {
  const b = readFileSync(fileURLToPath(new URL(`../starter/${path.replace(/^assets\//, '')}`, import.meta.url)));
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function build(ex: GameExample): Doc {
  const d = new Doc(newProject(ex.title));
  for (const path of ex.images) d.importAsset(path, { mime: 'image/png', ...pngSize(path) });
  d.runCode(`Build ${ex.title}`, ex.code);
  return d;
}

/** Load the project's scripts as ES modules (as the game's iframe does) and start the game. */
async function play(d: Doc) {
  Object.assign(globalThis, NODE_CLASSES, { Vec2, math: MATH });
  // As the game's iframe loads them (runtime/scripts.ts): in import order, each import rewritten to its module's URL.
  const classes = new Map<string, typeof Node>(), urls = new Map<string, string>();
  const { order, imports } = importOrder(d.project.scripts);
  for (const path of order) {
    const src = rewriteImports(d.project.scripts.find((x) => x.path === path)!.source, new Map([...imports.get(path)!].map(([spec, target]) => [spec, urls.get(target)!])));
    urls.set(path, `data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
    classes.set(path, (await import(/* @vite-ignore */ urls.get(path)!)).default);
  }
  const frames: DrawItem[][] = [];
  const scene = d.project.scenes.find((s) => s.path === d.project.settings.mainScene)!;
  const errors: string[] = [];
  const game = new Game(d.project, scene, { frame: (items) => frames.push(items) }, { scriptClass: (p) => classes.get(p), onError: (e) => errors.push(`${e.file}: ${e.message}`) });
  Object.assign(globalThis, scriptGlobals(game));
  game.start();
  const texts = () => frames.at(-1)!.filter((i) => i.kind === 'text').map((i) => (i as { text: string }).text);
  return { game, texts, errors };
}

afterAll(() => { for (const k of ['input', 'scene', 'time', 'math', 'physics', 'Vec2', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

describe('every example', () => {
  for (const ex of EXAMPLES) {
    it(`"${ex.title}" builds with the Scene API, is sound, and its GUI → code log replays to the same project`, () => {
      const d = build(ex);
      expect(problems(d.project)).toEqual([]);
      // Its imported images are its starter art; an SVG image is drawn by the code itself (project.writeSvg), and a
      // sound is made by it (project.writeSound).
      expect(d.project.assets.filter((a) => a.svg === undefined && !a.sound).map((a) => a.path).sort()).toEqual([...new Set(ex.images)].sort());
      const replay = newProject(ex.title);
      runSceneCode(replay, d.log.map((l) => l.code).join('\n'));
      expect(serialize(replay)).toBe(serialize(d.project));
    });
  }
});

describe('Potion Hunt plays', () => {
  it('the camera follows the hero but stops at the walls: its view never leaves the dungeon', async () => {
    const views: { x: number; y: number; zoom: number }[] = [];
    const d = build(potionHunt);
    const { game } = await play(d);
    // Watch the view by stepping and reading what the renderer was given.
    const renderer = (game as unknown as { renderer: { frame: (i: unknown, v: { x: number; y: number; zoom: number }) => void } }).renderer;
    const orig = renderer.frame; renderer.frame = (i, v) => { views.push(v); orig(i, v); };
    const player = game.root.get<Node2D>('Player');
    for (const at of [{ x: 24, y: 24 }, { x: 296, y: 168 }, { x: 160, y: 96 }]) { player.position = at; for (let i = 0; i < 120; i++) game.step(1 / 60); }
    // Zoom 4 on a 960 × 540 screen shows 240 × 135 of the world: the centre stays 120 and 67.5 inside the 320 × 192 dungeon.
    for (const v of views) { expect(v.x).toBeGreaterThanOrEqual(120 - 1e-9); expect(v.x).toBeLessThanOrEqual(200 + 1e-9); expect(v.y).toBeGreaterThanOrEqual(67.5 - 1e-9); expect(v.y).toBeLessThanOrEqual(124.5 + 1e-9); }
    expect(Math.min(...views.map((v) => v.x))).toBeCloseTo(120, 3);
    expect(Math.max(...views.map((v) => v.x))).toBeCloseTo(200, 3);
  });


  it('starts with the HUD at 0 / 8 and no message', async () => {
    const { texts, errors } = await play(build(potionHunt));
    expect(texts()).toEqual(['Potions: 0 / 8']);
    expect(errors).toEqual([]);
  });

  it('standing on each potion collects it; the count goes up; at 8 the message shows', async () => {
    const { game, texts, errors } = await play(build(potionHunt));
    const player = game.root.get<Node2D>('Player');
    const spots = game.root.get('Potions').children.map((p) => (p as Node2D).position.copy());
    expect(spots).toHaveLength(8);
    spots.forEach((at, i) => {
      player.position = at;
      game.step(1 / 60);
      game.step(1 / 60);   // freed at the end of the frame it was picked up in
      expect(texts()[0]).toBe(`Potions: ${i + 1} / 8`);
    });
    expect(game.root.get('Potions').children).toHaveLength(0);
    expect(texts()).toEqual(['Potions: 8 / 8', 'You found them all!']);
    expect(errors).toEqual([]);
  });

  it('the bat flies its figure of eight, and touching it sends the hero back to the start', async () => {
    const { game } = await play(build(potionHunt));
    const bat = game.root.get<Node2D>('Bat'), player = game.root.get<Node2D>('Player');
    const b0 = bat.position.copy();
    for (let i = 0; i < 30; i++) game.step(1 / 60);
    expect(bat.position.distanceTo(b0)).toBeGreaterThan(20);
    player.position = bat.globalPosition;
    game.step(1 / 60);
    expect(player.position.x).toBe(40);
    expect(player.position.y).toBe(96);
  });

  it('holding → for 10 seconds walks to the wall and stops against it: 304 − 6 = 298', async () => {
    const { game } = await play(build(potionHunt));
    const player = game.root.get<CharacterBody2D>('Player');
    game.input.key('ArrowRight', true);
    // Keep out of the bat's way and the potions': walk along the bottom row.
    player.position = { x: 40, y: 168 };
    for (let i = 0; i < 600; i++) game.step(1 / 60);
    expect(player.position.x).toBeCloseTo(298, 9);
    expect(player.isOnWall()).toBe(true);
    // And holding ↓ as well slides it into the corner: the bottom wall's top is 176, so 170.
    game.input.key('ArrowDown', true);
    for (let i = 0; i < 120; i++) game.step(1 / 60);
    expect(player.position.y).toBeCloseTo(170, 9);
  });
});

describe('Coin Run plays', () => {
  const DT = 1 / 60, G = 980;
  const steps = (game: Game, n: number) => { for (let i = 0; i < n; i++) game.step(DT); };

  it('the player falls onto the ground and stands on it: ground top 234 − shape bottom 12 = 222', async () => {
    const { game, texts, errors } = await play(build(platformer));
    const player = game.root.get<CharacterBody2D>('Player');
    steps(game, 60);
    expect(player.position.y).toBeCloseTo(222, 9);
    expect(player.isOnFloor()).toBe(true);
    expect(texts()).toEqual(['Coins: 0 / 10']);
    expect(errors).toEqual([]);
  });

  it('a jump rises exactly what gravity allows: 360 up, 980 × 1/60 less every step', async () => {
    const { game } = await play(build(platformer));
    const player = game.root.get<CharacterBody2D>('Player');
    steps(game, 60);
    game.input.key('Space', true);
    let top = player.position.y;
    for (let i = 0; i < 60; i++) { game.step(DT); top = Math.min(top, player.position.y); }
    // Each step: velocity gets + G·dt, then the jump sets it to −360 (first step only), then it moves by velocity·dt.
    let v = -360, rise = 0;
    while (v < 0) { rise -= v * DT; v += G * DT; }
    expect(222 - top).toBeCloseTo(rise, 9);
    expect(rise).toBeGreaterThan(66);   // v²/2g = 66.1; stepping adds a little
    expect(player.position.y).toBeCloseTo(222, 9);   // and back down on the ground
  });

  it('holding jump only jumps once: no jumping again in mid-air', async () => {
    const { game } = await play(build(platformer));
    const player = game.root.get<CharacterBody2D>('Player');
    steps(game, 60);
    game.input.key('Space', true); steps(game, 10);
    game.input.key('Space', false); game.input.key('Space', true);   // press again while in the air
    let top = player.position.y;
    for (let i = 0; i < 60; i++) { game.step(DT); top = Math.min(top, player.position.y); }
    expect(222 - top).toBeLessThan(67);
  });

  it('running and jumping lands on the first platform: its top 180 − 12 = 168', async () => {
    const { game } = await play(build(platformer));
    const player = game.root.get<CharacterBody2D>('Player');
    player.position = { x: 63, y: 222 };
    steps(game, 10);
    game.input.key('ArrowRight', true); game.input.key('Space', true);
    steps(game, 25);
    game.input.key('ArrowRight', false);
    steps(game, 60);
    expect(player.position.y).toBeCloseTo(168, 9);
    expect(player.isOnFloor()).toBe(true);
    expect(player.position.x).toBeGreaterThan(108);
    expect(player.position.x).toBeLessThan(180);
  });

  it('walking into a gap falls out of the level and back to the start', async () => {
    const { game } = await play(build(platformer));
    const player = game.root.get<CharacterBody2D>('Player');
    player.position = { x: 297, y: 200 };   // over the first gap, columns 15 to 17
    steps(game, 60);
    expect(player.position.x).toBe(27);
    steps(game, 60);
    expect(player.position.y).toBeCloseTo(222, 9);
  });

  it('touching each coin collects it; reaching the flag shows the message and stops the player', async () => {
    const { game, texts, errors } = await play(build(platformer));
    const player = game.root.get<CharacterBody2D>('Player');
    const spots = game.root.get('Coins').children.map((c) => (c as Node2D).position.copy());
    expect(spots).toHaveLength(10);
    spots.forEach((at, i) => {
      player.position = at;
      game.step(DT); game.step(DT);
      expect(texts()[0]).toBe(`Coins: ${i + 1} / 10`);
    });
    expect(texts()).toEqual(['Coins: 10 / 10']);
    player.position = { x: 1020, y: 222 };
    game.input.key('ArrowRight', true);
    steps(game, 60);
    expect(texts()).toEqual(['Coins: 10 / 10', 'You reached the flag!']);
    const x = player.position.x;
    steps(game, 30);
    expect(player.position.x).toBe(x);
    expect(errors).toEqual([]);
  });

  it('the player\u2019s AnimatedSprite2D plays idle when still, walk (two pictures, 8 a second) when running, and jump in the air', async () => {
    const { game } = await play(build(platformer));
    const sprite = game.root.get<AnimatedSprite2D>('Player/Sprite');
    steps(game, 60);
    expect(sprite.animation).toBe('idle');
    game.input.key('ArrowRight', true);
    const seen = new Set<number>();
    for (let i = 0; i < 30; i++) { game.step(DT); seen.add(sprite.frame); }
    expect(sprite.animation).toBe('walk');
    expect([...seen].sort()).toEqual([0, 1]);   // both pictures in half a second
    game.input.key('Space', true); steps(game, 5);
    expect(sprite.animation).toBe('jump');
  });

  it('the flag waves (an AnimatedSprite2D), and reaching it plays the message\u2019s animation: 8 px growing to 40 in 0.4 s', async () => {
    const { game } = await play(build(platformer));
    const cloth = game.root.get<AnimatedSprite2D>('Flag/Cloth');
    const seen = new Set<number>();
    for (let i = 0; i < 30; i++) { game.step(DT); seen.add(cloth.frame); }
    expect([...seen].sort()).toEqual([0, 1]);
    const message = game.root.get<Node2D & { fontSize: number; visible: boolean }>('HUD/Message');
    const player = game.root.get<CharacterBody2D>('Player');
    player.position = { x: 1035, y: 222 };
    game.step(DT);
    expect(message.visible).toBe(true);
    expect(message.fontSize).toBeLessThan(10);
    steps(game, 30);
    expect(message.fontSize).toBe(40);
  });

  it('the invisible edges stop the player at both ends of the level', async () => {
    const { game } = await play(build(platformer));
    const player = game.root.get<CharacterBody2D>('Player');
    game.input.key('ArrowLeft', true);
    steps(game, 60);
    expect(player.position.x).toBeCloseTo(7, 9);   // the left edge's right side is 0; half the shape is 7
    expect(player.isOnWall()).toBe(true);
  });

  it('the camera scrolls with the player but its view never leaves the 1080 × 270 level', async () => {
    const views: { x: number; y: number }[] = [];
    const { game } = await play(build(platformer));
    const renderer = (game as unknown as { renderer: { frame: (i: unknown, v: { x: number; y: number }) => void } }).renderer;
    const orig = renderer.frame; renderer.frame = (i, v) => { views.push(v); orig(i, v); };
    const player = game.root.get<Node2D>('Player');
    for (const at of [{ x: 27, y: 222 }, { x: 540, y: 222 }, { x: 1060, y: 222 }]) { player.position = at; steps(game, 120); }
    // Zoom 3 on 960 × 540 shows 320 × 180: the centre stays 160 and 90 inside the level.
    for (const v of views) { expect(v.x).toBeGreaterThanOrEqual(160 - 1e-9); expect(v.x).toBeLessThanOrEqual(920 + 1e-9); expect(v.y).toBeGreaterThanOrEqual(90 - 1e-9); expect(v.y).toBeLessThanOrEqual(180 + 1e-9); }
    expect(Math.min(...views.map((v) => v.x))).toBeCloseTo(160, 3);
    expect(Math.max(...views.map((v) => v.x))).toBeCloseTo(920, 3);
    expect(Math.max(...views.map((v) => v.y))).toBeCloseTo(180, 3);   // the bottom of the level is the bottom of the view
  });
});

describe('Breakout plays', () => {
  const DT = 1 / 60;
  const steps = (game: Game, n: number) => { for (let i = 0; i < n; i++) game.step(DT); };
  type BallScript = RigidBody2D & { launched: boolean; lives: number; left: number; score: number };
  async function start() {
    const r = await play(build(breakout));
    return { ...r, ball: r.game.root.get<BallScript>('Ball'), paddle: r.game.root.get<CharacterBody2D>('Paddle'), bricks: () => r.game.root.get('Bricks').children as Node2D[] };
  }

  it('starts with the HUD, and the ball sits on the paddle and follows it until Space', async () => {
    const { game, texts, errors, ball, paddle } = await start();
    expect(texts()).toEqual(['Score: 0', 'Balls: 3', 'Press Space to launch']);
    game.input.key('ArrowRight', true);
    steps(game, 30);
    expect(paddle.position.x).toBeCloseTo(480 + 480 * 0.5, 9);   // 480 px/s for half a second
    expect(ball.position.x).toBeCloseTo(paddle.position.x, 9);
    expect(ball.position.y).toBeCloseTo(477, 9);
    expect(errors).toEqual([]);
  });

  it('Space launches it at 20° from straight up, and it keeps exactly 360 px/s through every bounce', async () => {
    const { game, texts, ball } = await start();
    game.input.key('Space', true); game.step(DT); game.input.key('Space', false);
    expect(ball.launched).toBe(true);
    expect(texts()).toEqual(['Score: 0', 'Balls: 3']);
    const a = (20 * Math.PI) / 180;
    expect(ball.velocity.x).toBeCloseTo(360 * Math.sin(a), 9);
    expect(ball.velocity.y).toBeCloseTo(-360 * Math.cos(a), 9);
    for (let i = 0; i < 300 && ball.launched; i++) { game.step(DT); if (ball.launched) expect(ball.velocity.length()).toBeCloseTo(360, 9); }
  });

  it('the ball breaks the first brick it reaches: 47 left, score 10', async () => {
    const { game, texts, ball, bricks } = await start();
    game.input.key('Space', true);
    for (let i = 0; i < 120 && ball.score === 0; i++) game.step(DT);
    game.step(DT);   // freed at the end of the frame
    expect(bricks()).toHaveLength(47);
    expect(ball.left).toBe(47);
    expect(texts()[0]).toBe('Score: 10');
  });

  it('where it lands on the paddle aims it: half-way to the right end sends it 30° right', async () => {
    const { game, ball, paddle } = await start();
    ball.launched = true;
    ball.position = { x: paddle.position.x + 26, y: 470 };
    ball.velocity = { x: 0, y: 360 };
    for (let i = 0; i < 10 && ball.velocity.y > 0; i++) game.step(DT);
    const a = (30 * Math.PI) / 180;
    expect(ball.velocity.x).toBeCloseTo(360 * Math.sin(a), 6);
    expect(ball.velocity.y).toBeCloseTo(-360 * Math.cos(a), 6);
  });

  it('a missed ball costs a life and goes back on the paddle; after three, game over and Space does nothing', async () => {
    const { game, texts, ball, paddle } = await start();
    for (let life = 2; life >= 0; life--) {
      ball.launched = true;
      ball.position = { x: 100, y: 540 };        // far from the paddle, falling
      ball.velocity = { x: 0, y: 360 };
      steps(game, 20);
      expect(ball.lives).toBe(life);
      expect(texts()[1]).toBe(`Balls: ${life}`);
    }
    expect(texts()[2]).toBe('Game over. Press \u21bb to play again.');
    game.input.key('Space', true); steps(game, 2);
    expect(ball.launched).toBe(false);
    expect(ball.position.x).toBeCloseTo(paddle.position.x, 9);
  });

  it('the paddle stops at the left wall: 0 + half its width, 52', async () => {
    const { game, paddle } = await start();
    game.input.key('ArrowLeft', true);
    steps(game, 120);
    expect(paddle.position.x).toBeCloseTo(52, 9);
    expect(paddle.isOnWall()).toBe(true);
  });

  it('collision layers: the paddle\u2019s mask does not include the ball\u2019s layer, so the ball never blocks it', async () => {
    const { game, ball, paddle } = await start();
    ball.launched = true;
    ball.position = { x: 560, y: 500 };           // right beside the paddle, not moving
    ball.velocity = { x: 0, y: 0 };
    game.input.key('ArrowRight', true);
    steps(game, 20);
    expect(paddle.position.x).toBeCloseTo(480 + 480 * 20 / 60, 9);
  });

  it('breaking all 48 bricks shows "You cleared the wall!" and the ball rests on the paddle', async () => {
    const { game, texts, errors, ball, bricks } = await start();
    ball.launched = true;
    // From the bottom row up, fire the ball at each brick from just below it.
    for (const b of [...bricks()].reverse()) {
      ball.position = { x: b.position.x, y: b.position.y + 16 + 8 + 2 };
      ball.velocity = { x: 0, y: -360 };
      steps(game, 2);
    }
    expect(bricks()).toHaveLength(0);
    expect(texts()).toEqual(['Score: 480', 'Balls: 3', 'You cleared the wall!']);
    expect(ball.launched).toBe(false);
    expect(errors).toEqual([]);
  });
});

describe('Maze Chase plays', () => {
  const DT = 1 / 60;
  const steps = (game: Game, n: number) => { for (let i = 0; i < n; i++) game.step(DT); };
  type Mover = Node2D & { cell: { x: number; y: number }; target: { x: number; y: number }; score: number; lives: number; over: boolean };
  async function start() {
    const r = await play(build(mazeChase));
    return { ...r, player: r.game.root.get<Mover>('Player'), coins: r.game.root.get<TileMapLayer>('Coins'), walls: r.game.root.get<TileMapLayer>('Walls'), ghosts: r.game.root.get('Ghosts').children as Mover[] };
  }

  it('every open cell of the maze can be reached from the player\u2019s start', () => {
    const open = (x: number, y: number) => MAZE[y]?.[x] !== undefined && MAZE[y][x] !== '#';
    const startY = MAZE.findIndex((r) => r.includes('P')), seen = new Set([`${MAZE[startY].indexOf('P')},${startY}`]), todo = [[MAZE[startY].indexOf('P'), startY]];
    while (todo.length) { const [x, y] = todo.pop()!; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(x + dx, y + dy) && !seen.has(`${x + dx},${y + dy}`)) { seen.add(`${x + dx},${y + dy}`); todo.push([x + dx, y + dy]); } }
    expect(seen.size).toBe(MAZE.join('').split('').filter((c) => c !== '#').length);
  });

  it('starts with every coin, three lives, and walls the map says are solid', async () => {
    const { texts, errors, coins, walls } = await start();
    const total = MAZE.join('').split('.').length - 1;
    expect(coins.getUsedCells()).toHaveLength(total);
    expect(texts()).toEqual([`Score: 0   Coins left: ${total}`, 'Lives: 3']);
    expect(walls.isCellSolid(0, 0)).toBe(true);
    expect(walls.isCellSolid(1, 1)).toBe(false);
    expect(errors).toEqual([]);
  });

  it('holding → walks the row from the start, eating coins, and stops at the wall: at the centre of the last open cell', async () => {
    const { game, player, coins } = await start();
    const total = coins.getUsedCells().length;
    game.input.key('ArrowRight', true);
    steps(game, 180);
    // Row 9: "#...#.....P.....#...#" — from P (column 10), open up to column 15, wall at 16.
    expect([player.position.x, player.position.y]).toEqual([15 * 16 + 8, 9 * 16 + 8]);
    expect(player.score).toBe(50);                       // columns 11 to 15
    expect(coins.getUsedCells()).toHaveLength(total - 5);
  });

  it('the ghosts\u2019 search takes a shortest path: from (10, 5), straight down the middle to the player at (10, 9)', async () => {
    const { game, ghosts } = await start();
    const g = ghosts[0];
    expect(g.cell).toEqual({ x: 10, y: 5 });
    const route: string[] = [];
    for (let i = 0; i < 60 * 3; i++) { game.step(DT); const at = `${g.cell.x},${g.cell.y}`; if (route.at(-1) !== at) route.push(at); }
    // Up and round would be longer; down is 4 steps: (10, 6), (10, 7), (10, 8), (10, 9).
    expect(route.slice(0, 4)).toEqual(['10,5', '10,6', '10,7', '10,8']);
  });

  it('a ghost reaches a player who stands still, and that costs a life and sends everyone home', async () => {
    const { game, player, ghosts, texts } = await start();
    for (let i = 0; i < 60 * 15 && player.lives === 3; i++) game.step(DT);
    expect(player.lives).toBe(2);
    expect(texts()[1]).toBe('Lives: 2');
    expect([player.position.x, player.position.y]).toEqual([10 * 16 + 8, 9 * 16 + 8]);
    expect(ghosts.map((g) => g.cell)).toEqual([{ x: 10, y: 5 }, { x: 10, y: 7 }]);
  });

  it('eating the last coin clears the maze', async () => {
    const { game, coins, texts } = await start();
    coins.cells = [11, 9, 101];                          // one coin left, just right of the start
    game.input.key('ArrowRight', true);
    steps(game, 30);
    expect(texts().at(-1)).toBe('You cleared the maze!');
  });

  it('erasing a wall tile opens a passage the player uses at once', async () => {
    const { game, player, walls } = await start();
    walls.eraseCell(16, 9);                              // the wall that stopped the walk along row 9
    game.input.key('ArrowRight', true);
    steps(game, 240);
    expect(player.position.x).toBe(19 * 16 + 8);         // on to the far end of the row
  });
});

describe('Zombie Arena plays', () => {
  const DT = 1 / 60;
  const steps = (game: Game, n: number) => { for (let i = 0; i < n; i++) game.step(DT); };
  type Body = Node2D & { health: number; hit: () => void; hurt: () => void; safe: number };
  async function arena() {
    const r = await play(build(zombieArena));
    expect(r.game.sceneApi.path).toBe('scenes/title.scene');
    r.game.input.key('Space', true); r.game.step(DT); r.game.input.key('Space', false); r.game.step(DT);
    return r;
  }

  it('starts on the title screen; Space changes to the arena, with the player and two zombies', async () => {
    const { game, texts, errors } = await arena();
    expect(game.sceneApi.path).toBe('scenes/arena.scene');
    expect(game.sceneApi.getNodesInGroup('zombies').map((z) => z.name)).toEqual(['Zombie', 'Zombie2']);
    expect(texts()).toEqual(['Score: 0', 'Health: ♥♥♥']);
    expect(errors).toEqual([]);
  });

  it('holding Space shoots a bullet every quarter of a second, each a new instance of bullet.scene', async () => {
    const { game } = await arena();
    game.input.key('Space', true);
    steps(game, 30);
    const bullets = game.root.children.filter((c) => c.name.startsWith('Bullet'));
    expect(bullets.length).toBe(2);                                  // at 0 s and 0.25 s
  });

  it('two hits kill a zombie: its died signal (connected in code) scores 10', async () => {
    const { game, texts } = await arena();
    const player = game.root.get<Body>('Player'), zombie = game.root.get<Body>('Zombie');
    zombie.position = player.position.add({ x: 120, y: 0 });         // straight ahead (the player faces right)
    game.input.key('Space', true);
    for (let i = 0; i < 90 && zombie.parent; i++) game.step(DT);
    expect(zombie.parent).toBe(null);                                // freed
    expect(texts()[0]).toBe('Score: 10');
  });

  it('new zombies keep coming, from zombie.scene', async () => {
    const { game } = await arena();
    steps(game, 60 * 4);
    expect(game.sceneApi.getNodesInGroup('zombies').length).toBeGreaterThanOrEqual(4);
  });

  it('a zombie\u2019s touch costs health, shown by the HUD through the connection saved in the scene; at none, game over, and the title shows the best', async () => {
    const { game, texts } = await arena();
    const player = game.root.get<Body>('Player');
    player.hurt();
    expect(texts()[1]).toBe('Health: ♥♥♥');                         // drawn next frame
    game.step(DT);
    expect(texts()[1]).toBe('Health: ♥♥');
    player.safe = 0; player.hurt(); player.safe = 0; player.hurt();
    game.step(DT);
    expect(game.sceneApi.path).toBe('scenes/gameover.scene');
    expect(texts()).toContain('Score: 0   Best: 0');
    game.input.key('Space', true); game.step(DT); game.step(DT);
    expect(game.sceneApi.path).toBe('scenes/title.scene');
  });
});
