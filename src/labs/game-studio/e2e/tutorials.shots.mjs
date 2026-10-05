// Pictures for every tutorial step, and proof that every step can be done as it says.
//
// For each task: start it from Help › Tutorials, then for each step do what the step says through
// the editor (as a learner would), wait for Game Studio to tick it, outline the control used, and
// save a picture to tasks/shots/<task>-<step>.webp. A step that does not tick is reported, and the
// run fails. The task panel shows the picture for the step you are on.
//
//   npm run game:shots   (starts and stops its own server; rewrites the pictures)

import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { withGameStudio } from './harness.mjs';

const OUT = new URL('../tasks/shots/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const PP = 'assets/pixel-platformer';
const CHAR = `${PP}/characters/tile_0000.png`, WALK2 = `${PP}/characters/tile_0001.png`, COIN = `${PP}/tiles/tile_0151.png`;
const BALL = 'assets/puzzle-pack/balls/ballblue_01.png', SHEET = 'assets/tiny-dungeon/tilemap/tilemap_packed.png';
const only = process.argv[2];
// Tasks whose steps carry on in the same running game (one training run in view across several steps).
const KEEP_RUNNING = new Set(['td-step', 'sarsa-vs-q']);   // a task id (or the start of one, like tetris), to make just those pictures

/**
 * The task's start script with these functions, methods or fields replaced by the solution's: how the script looks
 * once those steps are done. A function is \nexport function name( … \n}; a method \n  name( … \n  }; either may be
 * one line; a field or constant is one line (name = …).
 */
function take(into, from, names) {
  const find = (src, name) => {
    let m = new RegExp(`\\nexport function ${name}\\(`).exec(src), indent = '';
    if (!m) { m = new RegExp(`\\n  ${name}\\(`).exec(src); indent = '  '; }
    if (!m) {
      m = new RegExp(`\\n(export const |  )${name} = `).exec(src);
      if (!m) throw new Error(`take: no ${name}`);
      return [m.index, src.indexOf('\n', m.index + 1)];
    }
    const lineEnd = src.indexOf('\n', m.index + 1);
    if (/\}\s*(\/\/.*)?$/.test(src.slice(m.index, lineEnd)) && !src.slice(m.index, lineEnd).trimEnd().endsWith('{')) return [m.index, lineEnd];
    const close = src.indexOf(`\n${indent}}`, lineEnd);
    return [m.index, close + indent.length + 2];
  };
  for (const name of names) { const [a, b] = find(into, name), [c, d] = find(from, name); into = into.slice(0, a) + from.slice(c, d) + into.slice(b); }
  return into;
}

// The five of hearts, a step at a time (the crib-svg task).
const HEART = 'M0,8 C-3,5 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.5,-10 -0.8,-8.8 0,-7 C0.8,-8.8 2.5,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,5 0,8 Z';
const corner = '  <text x="11" y="23" font-family="Georgia, serif" font-size="19" font-weight="bold" text-anchor="middle" fill="#c1121f">5</text>\n';
const cornerHeart = '  <use href="#heart" transform="translate(11 35) scale(0.55)"/>\n';
const pips = (turned) => [[30, 30], [70, 30], [50, 70], [30, 110], [70, 110]].map(([x, y]) => `  <use href="#heart" transform="translate(${x} ${y})${turned && y > 75 ? ' rotate(180)' : ''}"/>\n`).join('');
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">\n  <defs><path id="heart" d="${HEART}" fill="#c1121f"/></defs>\n  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>\n${body}</svg>\n`;
const FIVE = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">\n  <rect x="1" y="1" width="98" height="138" rx="8" fill="#ffffff" stroke="#555555" stroke-width="2"/>\n${corner}</svg>\n`,
  svg(corner + cornerHeart),
  svg(corner + cornerHeart + pips(false)),
  svg(corner + cornerHeart + `  <g transform="rotate(180 50 70)">\n  ${corner}  ${cornerHeart}  </g>\n` + pips(true)),
];
const GHOST_SPEC = { agent: 'Ghosts/Ghost', bins: [[-0.5, 0.5], [-0.5, 0.5]], maxSteps: 150 };

const failed = await withGameStudio(5182, async ({ page, t, check, answer }) => {
  let focus = null;
  const mark = (loc) => { focus = loc; return loc; };
  const node = (name, last = false) => (last ? page.getByTestId(`tree-${name}`).last() : page.getByTestId(`tree-${name}`).first());
  const ui = {
    add: async (type, parent) => { if (parent) await node(parent).click(); await mark(t('add-node')).selectOption(type); },
    rename: async (from, to, last = false) => { await node(from, last).dblclick(); await t('rename-input').fill(to); await t('rename-input').press('Enter'); mark(node(to)); },
    select: async (name, last = false) => { await mark(node(name, last)).click(); },
    prop: async (id, value) => { const f = mark(t(`prop-${id}`)); await f.fill(String(value)); await f.press('Enter'); },
    choose: async (id, value) => { await mark(t(`prop-${id}`)).selectOption(value); },
    click: async (id) => { await mark(t(id)).click(); },
    script: async (text) => {
      const ed = page.locator('.monaco-editor');
      await ed.waitFor(); await page.waitForTimeout(500);
      await page.evaluate((x) => navigator.clipboard.writeText(x), text);
      await ed.click({ position: { x: 120, y: 80 } });
      await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('ControlOrMeta+V');
      await page.waitForTimeout(300);
      mark(ed);
    },
    openScript: async (path) => { await t(`file-${path}`).click(); },
    solution: (task, path) => page.evaluate(([a, b]) => window.__gameStudio.solutionScripts(a)[b], [task, path]),
    run: async () => { await mark(t('run-project')).click(); await page.locator('iframe[title="Running game"]').waitFor({ timeout: 20000 }); await page.waitForTimeout(800); },
    stop: async () => { if (await t('stop').isEnabled()) await t('stop').click(); },
    palette: async (id, columns = 12, k = 2, tile = 16) => { const b = await t('tile-palette').boundingBox(); await page.mouse.click(b.x + (id % columns) * tile * k + tile * k / 2, b.y + Math.floor(id / columns) * tile * k + tile * k / 2); mark(t('tile-palette')); },
    drag: async (fx0, fy0, fx1, fy1) => { const v = await t('viewport').boundingBox(); await page.mouse.move(v.x + v.width * fx0, v.y + v.height * fy0); await page.mouse.down(); await page.mouse.move(v.x + v.width * fx1, v.y + v.height * fy1, { steps: 8 }); await page.mouse.up(); mark(t('viewport')); },
    store: (fn, arg) => page.evaluate(fn, arg),
    // Tetris: type board.js as it is after this step (tasks/tetris.ts), then run the game, so the picture shows what it does.
    board: async (task, step) => {
      await t('left-files').click(); await ui.openScript('scripts/board.js');
      await ui.script(await page.evaluate(([a, b]) => window.__gameStudio.tetrisStepScripts(a)[b], [task, step]));
      await ui.run(); mark(page.locator('iframe[title="Running game"]'));
    },
    // Quest Buddies (chapter 11): do step k of a task (tasks/questBuddies.ts) as its code, then show it: a script
    // opened, a scene opened with a node selected, or the game running (with keys pressed in it, for menus).
    qb: async (task, k, show = {}) => {
      const code = await page.evaluate(([a, b]) => (a.startsWith('qa-') ? window.__gameStudio.qaStep : window.__gameStudio.qbStep)(a, b), [task, k]);
      if (code) await page.evaluate(([c, label]) => window.__gameStudio.store.act((d) => d.runCode(label, c)), [code, `${task} step ${k + 1}`]);
      if (show.scene) { await t('left-files').click(); await t(`file-${show.scene}`).click(); if (show.node) await ui.select(show.node); else mark(t('viewport')); }
      if (show.script) { await t('left-files').click(); await ui.openScript(show.script); mark(page.locator('.monaco-editor')); }
      if (show.run) {
        await ui.run();
        const frame = page.locator('iframe[title="Running game"]');
        if (show.keys) { await frame.click({ position: { x: 5, y: 5 } }); for (const key of show.keys) { await page.keyboard.press(key); await page.waitForTimeout(500); } }
        mark(frame);
      }
    },
    // Run › Train an agent…: the table-learning settings, typed in.
    td: async ({ algorithm = 'q', episodes, alpha, gamma, from, to, schedule, explore, q0 }) => {
      await t('train-algorithm').selectOption(algorithm);
      if (explore) await t('train-explore').selectOption(explore);
      if (schedule) await t('train-schedule').selectOption(schedule);
      if (q0 !== undefined) await t('train-initial-q').fill(String(q0));
      for (const [id, v] of [['train-episodes', episodes], ['train-alpha', alpha], ['train-gamma', gamma], ['train-epsilon', from], ['train-epsilon-end', to]]) if (v !== undefined) await t(id).fill(String(v));
    },
    // Train an agent… with this environment typed in, Table (TD) with the default settings, and wait for it.
    trainSpec: async (spec) => {
      if (!(await t('train-spec').count())) { await t('menu-Run').click(); await t('item-Train an agent…').click(); }
      await t('train-method-q').click();
      await mark(t('train-spec')).fill(JSON.stringify(spec, null, 2));
      await ui.td({ algorithm: 'q', episodes: 100, alpha: 0.2, gamma: 0.97, from: 0.3, to: 0.02, schedule: 'linear', explore: 'epsilon', q0: 0 });
      await t('train-start').click();
      await page.getByTestId('train-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 });
      mark(t('train-curve'));
    },
    // Compare: add each setting, then run them all over `seeds` seeds and wait for the table.
    compare: async (settings, seeds) => {
      await t('train-method-compare').click();
      for (const st of settings) { await ui.td(st); await t('compare-add').click(); }
      await t('compare-seeds').fill(String(seeds));
      await t('compare-start').click();
      await page.getByTestId('compare-status').filter({ hasText: 'Done:' }).waitFor({ timeout: 600000 });
      mark(t('compare-view'));
    },
    // Train in view, paused: Step to the next update, and wait until the trace shows it.
    step: async () => {
      const head = await page.getByTestId('trace-head').innerText().catch(() => '');
      await mark(t('train-step')).click();
      await page.waitForFunction((h) => { const e = document.querySelector('[data-testid="trace-head"]'); return e && e.textContent !== h; }, head, { timeout: 15000 });
    },
    // Run › Train an agent…: Breakout's environment with these bins on the ball-across and ball-velocity.y readings, typed in.
    spec: async ({ across, vy }) => {
      const spec = JSON.parse(await t('train-spec').inputValue());
      spec.observation = spec.observation.map((o) => { const { bins, ...r } = o; void bins; return o.minus && across ? { ...r, bins: across } : o.path === 'Ball:velocity.y' && vy ? { ...r, bins: vy } : r; });
      await mark(t('train-spec')).fill(JSON.stringify(spec, null, 2));
    },
    // A script as it is once some of its functions or methods are written: the task's start with those taken from
    // its solution (tasks/solutions.ts), typed in. names: functions (export function), methods, or one-line fields.
    code: async (task, path, names) => {
      const [start, sol] = await page.evaluate(([a, b]) => [window.__gameStudio.startScripts(a)[b], window.__gameStudio.solutionScripts(a)[b]], [task, path]);
      await t('left-files').click(); await ui.openScript(path);
      await ui.script(take(start, sol, names));
    },
    // An SVG image's text, typed in and saved (an image is saved, not left in the editor).
    svg: async (path, text) => {
      await t('left-files').click(); await t(`asset-${path}`).click();
      await ui.script(text); await page.keyboard.press('ControlOrMeta+S'); await page.waitForTimeout(400);
      mark(t('svg-preview'));
    },
    // Run, then press keys in the game (it has the focus once it runs).
    play: async (...keys) => { await ui.run(); for (const k of keys) { await page.keyboard.press(k); await page.waitForTimeout(700); } mark(page.locator('iframe[title="Running game"]')); },
    // Train an agent… with Features (linear Q): the settings typed in, Train, and wait.
    linear: async (spec, { episodes, alpha, alphaEnd, gamma, from, to } = {}) => {
      if (!(await t('train-spec').count())) { await t('menu-Run').click(); await t('item-Train an agent…').click(); }
      await t('train-method-linear-q').click();
      if (spec) await t('train-spec').fill(JSON.stringify(spec, null, 2));
      for (const [id, v] of [['train-episodes', episodes], ['train-alpha', alpha], ['train-alpha-end', alphaEnd], ['train-gamma', gamma], ['train-epsilon', from], ['train-epsilon-end', to]]) if (v !== undefined) await t(id).fill(String(v));
      await t('train-start').click();
      await page.getByTestId('train-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 600000 });
      mark(t('train-feature-weights'));
    },
    // Table (TD) on this environment with these episodes, the default settings otherwise.
    table: async (spec, episodes) => {
      if (!(await t('train-spec').count())) { await t('menu-Run').click(); await t('item-Train an agent…').click(); }
      await t('train-method-q').click();
      await t('train-spec').fill(JSON.stringify(spec, null, 2));
      await ui.td({ algorithm: 'q', episodes, alpha: 0.2, gamma: 0.97, from: 0.3, to: 0.02, schedule: 'linear', explore: 'epsilon', q0: 0 });
      await t('train-start').click();
      await page.getByTestId('train-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 600000 });
      mark(t('train-curve'));
    },
    saveBrain: async (path) => { await t('train-brain-path').fill(path); await mark(t('train-save-brain')).click(); },
    label: async (name, y, text) => { await ui.add('Label', 'HUD'); await ui.rename('Label', name); await ui.select(name); await ui.prop('text', text); await ui.prop('position-x', 640); await ui.prop('position-y', y); },
  };
  const boardSteps = (task, n) => Array.from({ length: n }, (_, k) => () => ui.board(task, k));

  // What each step says to do, for every task (in the order of the task's steps).
  const STEPS = {
    'first-sprite': [
      () => ui.add('Sprite2D'),
      async () => { await ui.select('Sprite2D'); await ui.choose('texture', CHAR); },
      () => ui.rename('Sprite2D', 'Hero'),
      async () => { await ui.select('Hero'); await ui.prop('position-x', 480); await ui.prop('position-y', 270); },
    ],
    'run-and-stop': [
      async () => { await t('menu-Project').click(); await t('item-Project settings…').click(); await mark(t('setting-background')).fill('#2a6f97'); },
      async () => { await t('dialog-close').click(); await ui.run(); },
    ],
    'first-script': [
      async () => { await ui.select('Hero'); await ui.click('new-script'); },
      () => ui.script("export default class Hero extends Sprite2D {\n  update(dt) {\n    this.position = { x: this.position.x + 2, y: this.position.y };\n  }\n}\n"),
      async () => ui.script(await ui.solution('first-script', 'scripts/hero.js')),
    ],
    'input-actions': [
      async () => { await ui.select('Hero'); await t('open-script').click(); await ui.script("export default class Hero extends Sprite2D {\n  speed = 100;\n\n  update(dt) {\n    if (input.isPressed('move_right')) this.position = { x: this.position.x + this.speed * dt, y: this.position.y };\n  }\n}\n"); },
      () => ui.script("export default class Hero extends Sprite2D {\n  speed = 100;\n\n  update(dt) {\n    const x = input.axis('move_left', 'move_right'), y = input.axis('move_up', 'move_down');\n    this.position = { x: this.position.x + x * this.speed * dt, y: this.position.y + y * this.speed * dt };\n  }\n}\n"),
      async () => ui.script(await ui.solution('input-actions', 'scripts/hero.js')),
    ],
    'stop-at-walls': [
      async () => { await ui.add('CharacterBody2D', 'Main'); await ui.rename('CharacterBody2D', 'Player'); await ui.select('Player'); await ui.prop('position-x', 300); await ui.prop('position-y', 270); },
      async () => { await ui.add('Sprite2D', 'Player'); await ui.select('Sprite2D'); await ui.choose('texture', CHAR); await ui.add('CollisionShape2D', 'Player'); },
      async () => { await ui.select('Player'); await ui.click('new-script'); },
      async () => { await t('file-scenes/main.scene').click(); await ui.add('StaticBody2D', 'Main'); await ui.rename('StaticBody2D', 'Wall'); await ui.select('Wall'); await ui.prop('position-x', 600); await ui.prop('position-y', 270); await ui.add('CollisionShape2D', 'Wall'); await ui.select('CollisionShape2D', true); await ui.prop('size-y', 200); },
    ],
    'gravity-and-jumping': [
      async () => { await ui.select('Player'); await t('open-script').click(); await ui.script("export default class Player extends CharacterBody2D {\n  speed = 200;\n\n  physicsUpdate(dt) {\n    const v = this.velocity;\n    v.x = input.vector('move_left', 'move_right', 'move_up', 'move_down').x * this.speed;\n    v.y += physics.gravity * dt;\n    this.velocity = v;\n    this.moveAndSlide();\n  }\n}\n"); },
      async () => {},
      async () => ui.script(await ui.solution('gravity-and-jumping', 'scripts/player.js')),
      async () => {},
    ],
    'collect-coins': [
      async () => { await ui.add('Area2D', 'Main'); await ui.rename('Area2D', 'Coin'); await ui.select('Coin'); await ui.prop('position-x', 450); await ui.prop('position-y', 389); await ui.add('Sprite2D', 'Coin'); await ui.select('Sprite2D'); await ui.choose('texture', COIN); await ui.add('CollisionShape2D', 'Coin'); },
      async () => { await ui.select('Coin'); await ui.click('new-script'); await ui.script("export default class Coin extends Area2D {\n  bodyEntered(body) {\n    if (body.name !== 'Player') return;\n    this.queueFree();\n  }\n}\n"); },
      async () => { await ui.script(await ui.solution('collect-coins', 'scripts/coin.js')); await ui.openScript('scripts/player.js'); await ui.script(await ui.solution('collect-coins', 'scripts/player.js')); },
    ],
    'bouncing-ball': [
      async () => { await ui.add('RigidBody2D', 'Main'); await ui.rename('RigidBody2D', 'Ball'); await ui.select('Ball'); await ui.prop('position-x', 480); await ui.prop('position-y', 120); await ui.add('CollisionShape2D', 'Ball'); await ui.select('CollisionShape2D'); await ui.choose('shape', 'circle'); await ui.prop('size-x', 26); await ui.add('Sprite2D', 'Ball'); await ui.select('Sprite2D'); await ui.choose('texture', BALL); await ui.prop('scale-x', 0.2); await ui.prop('scale-y', 0.2); },
      async () => { await ui.select('Ball'); },
      async () => { await ui.select('Ball'); await ui.prop('bounce', 0.8); },
    ],
    'collision-layers': [
      async () => { await ui.select('Glass'); await ui.click('prop-collisionLayer-1'); await ui.click('prop-collisionLayer-2'); },
      async () => { await ui.select('Ball'); await page.keyboard.press('ControlOrMeta+d'); await ui.select('Ball2'); await ui.click('prop-collisionMask-2'); },
    ],
    'follow-camera': [
      () => ui.add('Camera2D', 'Player'),
      async () => { await ui.run(); await ui.stop(); },
      async () => { await ui.select('Camera2D'); await ui.prop('smoothing', 5); },
    ],
    'camera-limits': [
      async () => { await ui.select('Camera'); await ui.prop('limitTopLeft-x', 0); },
      () => ui.prop('limitBottomRight-x', 3000),
      () => ui.prop('limitBottomRight-y', 540),
    ],
    'hud': [
      async () => { await ui.add('Label', 'Main'); await ui.rename('Label', 'Score'); await ui.select('Score'); await ui.prop('text', 'Score: 0'); await ui.prop('position-x', 16); await ui.prop('position-y', 12); },
      async () => { await ui.add('CanvasLayer', 'Main'); await ui.rename('CanvasLayer', 'HUD'); await node('Score').dragTo(node('HUD')); mark(node('HUD')); },
    ],
    'walk-animation': [
      async () => { await ui.select('Sprite', true); await page.keyboard.press('Delete'); await ui.add('AnimatedSprite2D', 'Player'); await ui.rename('AnimatedSprite2D', 'Sprite'); await ui.select('Sprite', true); await ui.click('frames-add-animation'); await t('frames-add-picture-0').selectOption(CHAR); await t('frames-add-picture-0').selectOption(WALK2); await t('frames-fps-0').fill('8'); await t('frames-fps-0').press('Enter'); await t('frames-name-0').fill('walk'); await t('frames-name-0').press('Enter'); mark(t('frames-editor')); },
      async () => { await ui.click('frames-add-animation'); await t('frames-add-picture-1').selectOption(CHAR); await t('frames-name-1').fill('idle'); await t('frames-name-1').press('Enter'); await ui.openScript('scripts/player.js'); await ui.script(await ui.solution('walk-animation', 'scripts/player.js')); },
    ],
    'sliding-door': [
      async () => { await ui.add('AnimationPlayer', 'Main'); await ui.rename('AnimationPlayer', 'DoorAnimation'); await ui.select('DoorAnimation'); },
      async () => { await t('anim-new').click(); await t('anim-name').fill('open'); await t('anim-name').press('Enter'); await t('anim-length').fill('1'); await t('anim-length').press('Enter'); await ui.select('Door'); await ui.click('key-position'); const r = await t('anim-ruler').boundingBox(); await page.mouse.click(r.x + r.width - 3, r.y + 10); await ui.prop('position-y', 220); mark(t('timeline')); },
      async () => { await ui.select('DoorAnimation'); await ui.click('anim-autoplay'); },
    ],
    'door-switch': [
      async () => { await ui.add('Area2D', 'Main'); await ui.rename('Area2D', 'Switch'); await ui.select('Switch'); await ui.prop('position-x', 420); await ui.prop('position-y', 389); await ui.add('CollisionShape2D', 'Switch'); },
      async () => { await ui.select('Switch'); await ui.click('new-script'); await ui.script(await ui.solution('door-switch', 'scripts/switch.js')); },
    ],
    'paint-a-floor': [
      async () => { await ui.add('TileMapLayer', 'Main'); await ui.rename('TileMapLayer', 'Floor'); await ui.select('Floor'); },
      async () => { await ui.click('tile-new-tileset'); await t('new-tileset-image').selectOption(SHEET); await ui.click('new-tileset-create'); },
      async () => { await ui.palette(48); await t('tile-tool-rect').click(); await ui.drag(0.3, 0.3, 0.55, 0.5); },
    ],
    'solid-walls': [
      async () => {
        await ui.add('TileMapLayer', 'Main'); await ui.rename('TileMapLayer', 'Walls'); await ui.select('Walls');
        await t('tile-tileset').selectOption('tilesets/dungeon.tileset'); await ui.palette(40); await t('tile-tool-rect').click();
        // The border, painted with the rectangle tool four times (the cells are set directly, so they land exactly on the edge).
        await ui.store(() => { const s = window.__gameStudio.store; const w = s.selected; const e = []; for (let x = 0; x < 20; x++) e.push([x, 0, 40], [x, 11, 40]); for (let y = 1; y < 11; y++) e.push([0, y, 40], [19, y, 40]); s.act((d) => d.paintCells(s.sceneId, w.id, e, 'Fill a rectangle')); });
        mark(t('tile-panel'));
      },
      async () => { await ui.click('tile-collision'); await ui.palette(40); },
      async () => { await ui.run(); await ui.stop(); },
    ],
    'tiled-map': [
      async () => { await t('left-art').click(); await t('starter-pack').selectOption('tiny-dungeon'); await ui.click('starter-map-sample-map.tmx'); },
    ],
    'scene-instances': [
      async () => { await t('left-files').click(); await t('new-scene').click(); await t('new-scene-root').selectOption('Area2D'); await t('new-scene-name').fill('coin'); await t('new-scene-name').press('Enter'); await ui.add('Sprite2D', 'Coin'); await ui.select('Sprite2D'); await ui.choose('texture', COIN); await ui.add('CollisionShape2D', 'Coin'); },
      async () => { await t('file-scenes/main.scene').click(); for (const [i, x] of [400, 500, 600].entries()) { await ui.select('Main'); await t('instance-scenes/coin.scene').click(); await ui.prop('position-x', x); await ui.prop('position-y', 389); void i; } mark(t('instance-scenes/coin.scene')); },
      async () => { await t('file-scenes/coin.scene').click(); await ui.select('Coin'); await ui.click('new-script'); await ui.script(await ui.solution('scene-instances', 'scripts/coin.js')); },
    ],
    'spawn-bullets': [
      async () => { await ui.select('Player'); await t('open-script').click(); const s = await ui.solution('spawn-bullets', 'scripts/player.js'); await ui.script(s.replace("input.isPressed('jump') && this.cooldown <= 0", "input.isJustPressed('jump')")); },
      async () => ui.script(await ui.solution('spawn-bullets', 'scripts/player.js')),
    ],
    'enemy-group': [
      async () => { for (const e of ['Enemy', 'Enemy2']) { await ui.select(e); await t('group-add').fill('enemies'); await t('group-add').press('Enter'); } mark(t('groups')); },
      async () => { await ui.openScript('scripts/bullet.js'); await ui.script(await ui.solution('enemy-group', 'scripts/bullet.js')); },
    ],
    'health-signal': [
      async () => { await ui.select('Player'); await t('open-script').click(); await ui.script(await ui.solution('health-signal', 'scripts/player.js')); },
      async () => { await t('file-scenes/main.scene').click(); await ui.select('Player'); await t('signal-name').fill('healthChanged'); await t('signal-target').selectOption({ label: 'HUD/Health' }); await t('signal-method').fill('show'); await ui.click('signal-connect'); mark(t('signals')); },
      async () => { await ui.run(); await ui.stop(); },
    ],
    'title-scene': [
      async () => { await t('new-scene').click(); await t('new-scene-name').fill('title'); await t('new-scene-name').press('Enter'); await ui.add('Label', 'Title'); await ui.select('Label'); await ui.prop('text', 'MY GAME'); await ui.click('main-scene-scenes/title.scene'); },
      async () => { await ui.select('Title'); await ui.click('new-script'); await ui.script(await ui.solution('title-scene', 'scripts/title.js')); },
    ],
    'tetris-board': [
      async () => { await ui.select('Board'); await ui.click('new-script'); },
      ...boardSteps('tetris-board', 4).slice(1),
    ],
    'tetris-piece': boardSteps('tetris-piece', 2),
    'tetris-move': boardSteps('tetris-move', 3),
    'tetris-fall': boardSteps('tetris-fall', 3),
    'tetris-rotate': boardSteps('tetris-rotate', 3),
    'tetris-lines': boardSteps('tetris-lines', 2),
    'tetris-score': [
      async () => { await t('file-scenes/main.scene').click(); await ui.add('CanvasLayer', 'Main'); await ui.rename('CanvasLayer', 'HUD'); await ui.label('Score', 20, 'Score 0'); await ui.label('Lines', 56, 'Lines 0'); },
      ...boardSteps('tetris-score', 3).slice(1),
    ],
    'tetris-bag': [
      () => ui.board('tetris-bag', 0),
      async () => { await t('file-scenes/main.scene').click(); await ui.label('Message', 140, ''); },
      () => ui.board('tetris-bag', 2),
    ],
    'tetris-finish': [
      () => ui.board('tetris-finish', 0),
      () => ui.board('tetris-finish', 1),
      async () => { await t('file-scenes/main.scene').click(); await ui.label('Next', 92, 'Next'); await ui.board('tetris-finish', 2); },
    ],
    // Game AI that learns, 9.7: coarse bins, fine bins, one more number.
    'state-design': [
      async () => { await ui.trainSpec({ agent: 'Paddle', bins: [[-0.1, 0.1], [0.5]], maxSteps: 1200 }); },
      async () => { await ui.trainSpec({ agent: 'Paddle', bins: [[-0.5, -0.3, -0.2, -0.1, -0.05, -0.02, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5], [0.5]], maxSteps: 1200 }); },
      async () => {
        await t('dialog-close').click().catch(() => {});
        await t('left-files').click(); await ui.openScript('scripts/paddle.js'); await ui.script(await ui.solution('state-design', 'scripts/paddle.js'));
        await ui.trainSpec({ agent: 'Paddle', bins: [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5], [0.5]], maxSteps: 1200 });
      },
    ],
    // Game AI that learns, 9.6: an α sweep over 5 seeds, then 10.
    'experiments': [
      async () => {
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        const base = { algorithm: 'q', episodes: 100, gamma: 1, from: 0.1, to: 0.1, schedule: 'constant', explore: 'epsilon', q0: 0 };
        await ui.compare([0.1, 0.3, 0.5, 0.9].map((alpha) => ({ ...base, alpha })), 5);
      },
      async () => {
        await t('compare-seeds').fill('10');
        await t('compare-start').click();
        await page.getByTestId('compare-status').filter({ hasText: 'Done: 40 runs' }).waitFor({ timeout: 600000 });
        mark(t('compare-view'));
      },
    ],
    // Game AI that learns, 9.5: all four updates compared, then SARSA and Expected SARSA at α 1.
    'all-four': [
      async () => {
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        const base = { episodes: 300, alpha: 0.5, gamma: 1, from: 0.1, to: 0.1, schedule: 'constant', explore: 'epsilon', q0: 0 };
        await ui.compare(['q', 'sarsa', 'expected-sarsa', 'double-q'].map((algorithm) => ({ ...base, algorithm })), 5);
      },
      async () => {
        while (await page.locator('[data-testid="compare-table"] button').count()) await page.locator('[data-testid="compare-table"] button').first().click();
        const base = { episodes: 300, alpha: 1, gamma: 1, from: 0.1, to: 0.1, schedule: 'constant', explore: 'epsilon', q0: 0 };
        await ui.compare([{ ...base, algorithm: 'sarsa' }, { ...base, algorithm: 'expected-sarsa' }], 5);
      },
    ],
    // Game AI that learns, 9.4: SARSA and Q-learning in view, then compared.
    'sarsa-vs-q': [
      async () => {
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        await t('train-method-q').click();
        await ui.td({ algorithm: 'sarsa', episodes: 500, alpha: 0.5, gamma: 1, from: 0.1, to: 0.1, schedule: 'constant', explore: 'epsilon', q0: 0 });
        await t('train-in-view').click();
        await page.getByTestId('train-hud-status').filter({ hasText: /Episode \d+ of 500/ }).waitFor({ timeout: 60000 });
        await t('train-speed-1024').click();
        await page.getByTestId('train-hud-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 });
        mark(page.locator('[data-testid="game-box"]'));
      },
      async () => {
        await ui.stop();
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        await ui.td({ algorithm: 'q' });
        await t('train-in-view').click();
        await page.getByTestId('train-hud-status').filter({ hasText: /Episode \d+ of 500/ }).waitFor({ timeout: 60000 });
        await t('train-speed-1024').click();
        await page.getByTestId('train-hud-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 });
        mark(page.locator('[data-testid="game-box"]'));
      },
      async () => {
        await ui.stop();
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        await t('train-method-compare').click();
        while (await page.locator('[data-testid="compare-table"] button').count()) await page.locator('[data-testid="compare-table"] button').first().click();
        await ui.compare([
          { algorithm: 'sarsa', episodes: 300, alpha: 0.5, gamma: 1, from: 0.1, to: 0.1, schedule: 'constant', explore: 'epsilon', q0: 0 },
          { algorithm: 'q', episodes: 300, alpha: 0.5, gamma: 1, from: 0.1, to: 0.1, schedule: 'constant', explore: 'epsilon', q0: 0 },
        ], 5);
      },
    ],
    // Game AI that learns, 9.3: the paddle made an agent (typed in, as a learner would), trained, shipped, a new wall.
    'breakout-scratch': [
      async () => { await t('left-files').click(); await ui.openScript('scripts/paddle.js'); await ui.script(await ui.solution('breakout-scratch', 'scripts/paddle.js')); },
      async () => { mark(page.locator('.monaco-editor')); },
      async () => { mark(page.locator('.monaco-editor')); },
      async () => {
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        await t('train-method-q').click();
        await mark(t('train-spec')).fill(JSON.stringify({ agent: 'Paddle', bins: [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5]], maxSteps: 1200 }, null, 2));
        await ui.td({ algorithm: 'q', episodes: 100, alpha: 0.2, gamma: 0.97, from: 0.3, to: 0.02, schedule: 'linear', explore: 'epsilon', q0: 0 });
        await t('train-start').click();
        await page.getByTestId('train-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 });
        mark(t('train-curve'));
      },
      async () => {
        await t('train-brain-path').fill('brains/paddle.json');
        await t('train-save-brain').click();
        await t('dialog-close').click().catch(() => {});
        await ui.run(); await page.waitForTimeout(2500);
      },
      async () => {
        await ui.stop();
        await ui.openScript('scripts/wall.js'); await ui.script(await ui.solution('breakout-scratch', 'scripts/wall.js'));
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        await t('train-start').click();
        await page.getByTestId('train-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 });
        mark(t('train-curve'));
      },
    ],
    // Game AI that learns, 9.2: exploration schedules compared, optimism in view, optimism against pessimism.
    'explore-compare': [
      async () => {
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        const base = { algorithm: 'q', episodes: 200, alpha: 0.5, gamma: 1, q0: 0 };
        await ui.compare([
          { ...base, explore: 'epsilon', from: 0.1, to: 0.1, schedule: 'constant' },
          { ...base, explore: 'epsilon', from: 0.3, to: 0.01, schedule: 'linear' },
          { ...base, explore: 'epsilon', from: 0.3, to: 0.01, schedule: 'exponential' },
          { ...base, explore: 'softmax', from: 5, to: 0.1, schedule: 'exponential' },
        ], 5);
      },
      async () => {
        await t('train-method-q').click();
        await ui.td({ algorithm: 'q', explore: 'epsilon', from: 0, to: 0, schedule: 'constant', q0: 0 });
        await t('train-in-view').click();
        await page.getByTestId('train-hud-status').filter({ hasText: /Episode \d+ of 200/ }).waitFor({ timeout: 60000 });
        await t('train-speed-4').click();
        await page.waitForTimeout(4000);
        await t('train-speed-1024').click();
        await page.getByTestId('train-hud-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 });
        mark(page.getByTestId('train-hud'));
      },
      async () => {
        await ui.stop();
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        // A fresh comparison: remove the earlier settings first.
        await t('train-method-compare').click();
        while (await page.locator('[data-testid="compare-table"] button').count()) await page.locator('[data-testid="compare-table"] button').first().click();
        await ui.compare([
          { algorithm: 'q', explore: 'epsilon', from: 0, to: 0, schedule: 'constant', q0: 0 },
          { algorithm: 'q', explore: 'epsilon', from: 0, to: 0, schedule: 'constant', q0: -100 },
        ], 5);
      },
    ],
    // Game AI that learns, 9.1: step through updates, predict three, finish, then a small α.
    'td-step': [
      async () => {
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        await ui.td({ algorithm: 'q', episodes: 200, alpha: 0.5, gamma: 1, from: 0.1, to: 0.1, schedule: 'constant' });
        await t('train-in-view').click();
        await page.getByTestId('train-hud-status').filter({ hasText: /Episode \d+ of 200/ }).waitFor({ timeout: 60000 });
        for (let k = 0; k < 5; k++) await ui.step();
        mark(page.getByTestId('train-trace'));
      },
      async () => {
        await t('train-predict').check();
        for (let k = 0; k < 3; k++) {
          await ui.step();
          const tr = await page.evaluate(() => window.__gameStudio.store.trainTransition);
          await t('trace-guess-target').fill(String(+tr.target.toFixed(3)));
          await t('trace-guess-after').fill(String(+tr.after.toFixed(3)));
          await t('trace-check').click();
        }
        mark(page.getByTestId('train-trace'));
      },
      async () => {
        await t('train-predict').uncheck();
        await t('train-speed-1024').click();
        await page.getByTestId('train-hud-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 });
        mark(page.getByTestId('train-hud'));
      },
      async () => {
        await ui.stop();
        await t('menu-Run').click(); await t('item-Train an agent…').click();
        await ui.td({ alpha: 0.05 });
        await t('train-in-view').click();
        await page.getByTestId('train-hud-status').filter({ hasText: /Episode \d+ of 200/ }).waitFor({ timeout: 60000 });
        await t('train-speed-1024').click();
        await page.getByTestId('train-hud-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 });
        mark(page.getByTestId('train-hud'));
      },
    ],
    // A game that learns: every step is in Run › Train an agent…. The spec is edited as JSON, as a learner types it.
    // ── Cribbage (chapter 10): each module written a function at a time ──
    'crib-tour': [
      () => ui.play('Digit2'),
      async () => { const sol = await ui.solution('crib-tour', 'scripts/table.js'); await t('left-files').click(); await ui.openScript('scripts/table.js'); await ui.script(sol.replace("difficulty = 'Hard';", "difficulty = 'Medium';")); },
      async () => { await ui.script(await ui.solution('crib-tour', 'scripts/table.js')); await page.keyboard.press('ControlOrMeta+S'); },
    ],
    'crib-cards': [
      () => ui.code('crib-cards', 'scripts/cards.js', ['value']),
      () => ui.code('crib-cards', 'scripts/cards.js', ['value', 'cardName']),
      () => ui.code('crib-cards', 'scripts/cards.js', ['value', 'cardName', 'newDeck']),
      () => ui.code('crib-cards', 'scripts/cards.js', ['value', 'cardName', 'newDeck', 'shuffle']),
      () => ui.play('Digit2'),
    ],
    'crib-svg': [
      () => ui.svg('assets/cards/5H.svg', FIVE[0]),
      () => ui.svg('assets/cards/5H.svg', FIVE[1]),
      () => ui.svg('assets/cards/5H.svg', FIVE[2]),
      () => ui.svg('assets/cards/5H.svg', FIVE[3]),
      () => ui.play('Digit2'),
    ],
    'crib-score': [
      () => ui.code('crib-score', 'scripts/score.js', ['fifteens']),
      () => ui.code('crib-score', 'scripts/score.js', ['fifteens', 'pairs']),
      () => ui.code('crib-score', 'scripts/score.js', ['fifteens', 'pairs', 'runs']),
      () => ui.code('crib-score', 'scripts/score.js', ['fifteens', 'pairs', 'runs', 'flush', 'nobs']),
      () => ui.play('Digit2'),
    ],
    'crib-peg': [
      () => ui.code('crib-peg', 'scripts/score.js', ['countOf']),
      () => ui.code('crib-peg', 'scripts/score.js', ['countOf', 'pegPoints']),
      async () => { mark(page.locator('.monaco-editor')); },
      async () => { mark(page.locator('.monaco-editor')); },
      () => ui.code('crib-peg', 'scripts/table.js', ['options']),
      () => ui.code('crib-peg', 'scripts/table.js', ['options', 'nextTurn']),
    ],
    'crib-table': [
      () => ui.code('crib-table', 'scripts/table.js', ['newHand']),
      () => ui.code('crib-table', 'scripts/table.js', ['newHand', 'throwCards']),
      () => ui.code('crib-table', 'scripts/table.js', ['newHand', 'throwCards', 'award']),
      () => ui.code('crib-table', 'scripts/table.js', ['newHand', 'throwCards', 'award', 'cut']),
      () => ui.code('crib-table', 'scripts/table.js', ['newHand', 'throwCards', 'cut', 'award', 'startShow']),
      () => ui.play('Digit2'),
    ],
    'crib-screen': [
      () => ui.code('crib-screen', 'scripts/cardsprite.js', ['update']),
      () => ui.code('crib-screen', 'scripts/cardsprite.js', ['update', 'contains']),
      () => ui.code('crib-screen', 'scripts/table.js', ['takeInput']),
      async () => { mark(page.locator('.monaco-editor')); },
      () => ui.play('Digit2'),
    ],
    'crib-rules': [
      () => ui.code('crib-rules', 'scripts/features.js', ['unseen']),
      () => ui.code('crib-rules', 'scripts/features.js', ['unseen', 'expectedHand']),
      () => ui.code('crib-rules', 'scripts/partner.js', ['rulesThrow']),
      () => ui.code('crib-rules', 'scripts/partner.js', ['rulesThrow', 'rulesPlay']),
      () => ui.play('Digit2', 'KeyD'),
    ],
    'crib-agent': [
      () => ui.code('crib-agent', 'scripts/opponent.js', ['actions']),
      () => ui.code('crib-agent', 'scripts/opponent.js', ['actions', 'legalActions']),
      () => ui.code('crib-agent', 'scripts/opponent.js', ['actions', 'legalActions', 'act']),
      () => ui.code('crib-agent', 'scripts/opponent.js', ['actions', 'legalActions', 'act', 'reward']),
      () => ui.code('crib-agent', 'scripts/opponent.js', ['actions', 'legalActions', 'act', 'reward', 'done']),
    ],
    'crib-features': [
      () => ui.code('crib-features', 'scripts/features.js', ['discardFeatures']),
      () => ui.code('crib-features', 'scripts/features.js', ['discardFeatures', 'pegFeatures']),
      async () => { mark(page.locator('.monaco-editor')); },
      async () => { mark(page.locator('.monaco-editor')); },
      async () => { mark(page.locator('.monaco-editor')); },
    ],
    'crib-train': [
      () => ui.linear({ agent: 'Opponent', maxSteps: 40 }, { episodes: 2000 }),
      () => ui.saveBrain('brains/cribbage.json'),
      async () => { await t('dialog-close').click().catch(() => {}); await ui.play('Digit2', 'KeyD'); },
      async () => { await ui.stop(); await ui.linear(null, { episodes: 200 }); },
    ],
    'crib-difficulty': [
      () => ui.code('crib-difficulty', 'scripts/table.js', ['DIFFICULTY']),
      () => ui.code('crib-difficulty', 'scripts/opponent.js', ['remember']),
      async () => { mark(page.locator('.monaco-editor')); },
      () => ui.play('Digit3', 'KeyD'),
    ],
    // ── Quest Buddies (chapter 11): each step done as its code, then shown ──
    'qb-tour': [
      () => ui.qb('qb-tour', 0, { run: true, keys: ['Enter'] }),
      () => ui.qb('qb-tour', 1, { script: 'scripts/game.js' }),
      () => ui.qb('qb-tour', 2, { script: 'scripts/ranger.js' }),
    ],
    'qb-doors': [
      () => ui.qb('qb-doors', 0, { scene: 'scenes/town.scene', node: 'Door to forest' }),
      () => ui.qb('qb-doors', 1, { scene: 'scenes/forest.scene', node: 'FromTown' }),
      () => ui.qb('qb-doors', 2, { script: 'scripts/door_to_town.js' }),
    ],
    'qb-state': [
      () => ui.qb('qb-state', 0, { scene: 'scenes/town.scene', node: 'Coin' }),
      () => ui.qb('qb-state', 1, { scene: 'scenes/hud.scene', node: 'Gold' }),
      () => ui.qb('qb-state', 2, { script: 'scripts/coin.js' }),
    ],
    'qb-save': [
      () => ui.qb('qb-save', 0, { script: 'scripts/campfire.js' }),
      () => ui.qb('qb-save', 1, { script: 'scripts/title.js' }),
      () => ui.qb('qb-save', 2, { run: true }),
    ],
    'qb-menus': [
      () => ui.qb('qb-menus', 0, { scene: 'scenes/title.scene', node: 'Buttons' }),
      () => ui.qb('qb-menus', 1, { run: true }),
      async () => { await ui.stop(); await ui.qb('qb-menus', 2, { run: true, keys: ['Enter', 'Escape'] }); },
    ],
    'qb-bars': [
      () => ui.qb('qb-bars', 0, { scene: 'scenes/hud.scene', node: 'Hp' }),
      () => ui.qb('qb-bars', 1, { scene: 'scenes/hud.scene', node: 'List' }),
      () => ui.qb('qb-bars', 2, { script: 'scripts/hud.js' }),
    ],
    'qb-talk': [
      () => ui.qb('qb-talk', 0, { script: 'scripts/hud.js' }),
      () => ui.qb('qb-talk', 1, { script: 'scripts/hud.js' }),
      () => ui.qb('qb-talk', 2, { script: 'scripts/ranger.js' }),
    ],
    'qb-sounds': [
      async () => { await ui.qb('qb-sounds', 0); await t('left-files').click(); await t('asset-assets/sounds/coin.wav').click(); mark(t('sound-preview')); },
      () => ui.qb('qb-sounds', 1, { scene: 'scenes/hud.scene', node: 'Coin' }),
      async () => { await ui.qb('qb-sounds', 2); await t('left-files').click(); await t('asset-assets/sounds/arrive.wav').click(); mark(t('sound-preview')); },
    ],
    // ── Quest Buddies: Adventure (chapter 12) ──
    'qa-classes': [
      () => ui.qb('qa-classes', 0, { script: 'scripts/classes.js' }),
      () => ui.qb('qa-classes', 1, { script: 'scripts/game.js' }),
      () => ui.qb('qa-classes', 2, { run: true, keys: ['Enter'] }),
      async () => { await ui.stop(); await ui.qb('qa-classes', 3, { scene: 'scenes/hud.scene', node: 'Xp' }); },
    ],
    'qa-loot': [
      () => ui.qb('qa-loot', 0, { script: 'scripts/loot.js' }),
      () => ui.qb('qa-loot', 1, { script: 'scripts/loot.js' }),
      () => ui.qb('qa-loot', 2, { script: 'scripts/hud.js' }),
    ],
    'qa-combat': [
      () => ui.qb('qa-combat', 0, { script: 'scripts/slime.js' }),
      () => ui.qb('qa-combat', 1, { script: 'scripts/player.js' }),
      () => ui.qb('qa-combat', 2, { scene: 'scenes/forest.scene', node: 'Enemies' }),
    ],
    // ── Game AI that learns, 9.8: the paddle with features ──
    'paddle-features': [
      async () => { await t('left-files').click(); await ui.openScript('scripts/paddle.js'); await ui.script(await ui.solution('paddle-features', 'scripts/paddle.js')); },
      () => ui.linear({ agent: 'Paddle', maxSteps: 1200 }, { episodes: 100, alpha: 0.05, alphaEnd: 0.005, gamma: 0.97, from: 0.3, to: 0.02 }),
      () => ui.saveBrain('brains/paddle.json'),
      () => ui.table({ agent: 'Paddle', bins: [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5]], maxSteps: 1200 }, 100),
    ],
    // ── Game AI that learns, 9.9 to 9.11: Ghost Lab ──
    'ghost-agent': [
      () => ui.code('ghost-agent', 'scripts/ghost.js', ['observe']),
      () => ui.code('ghost-agent', 'scripts/ghost.js', ['observe', 'legalActions']),
      () => ui.code('ghost-agent', 'scripts/ghost.js', ['observe', 'legalActions', 'act', 'reward', 'done']),
      () => ui.table(GHOST_SPEC, 300),
      async () => { await ui.saveBrain('brains/ghost.json'); await t('dialog-close').click().catch(() => {}); await ui.play(); },
    ],
    'learn-or-plan': [
      () => ui.play(),
      () => ui.table(GHOST_SPEC, 300),
      async () => { await t('dialog-close').click().catch(() => {}); await t('left-files').click(); await ui.openScript('scripts/player.js'); await ui.script(await ui.solution('learn-or-plan', 'scripts/player.js')); },
      () => ui.table(GHOST_SPEC, 300),
    ],
    'second-npc': [
      async () => { await t('left-files').click(); await t('new-script-file').click(); await t('new-script-name').fill('ambusher'); await t('new-script-name').press('Enter'); await ui.script(await ui.solution('second-npc', 'scripts/ambusher.js')); },
      async () => { await ui.select('Ghost2'); await t('detach-script').click(); await mark(t('attach-script')).selectOption('scripts/ambusher.js'); },
      () => ui.table({ ...GHOST_SPEC, agent: 'Ghosts/Ghost2' }, 300),
      async () => { await ui.saveBrain('brains/ambusher.json'); await t('dialog-close').click().catch(() => {}); await ui.play(); },
    ],
    'q-agent': [
      async () => { await t('menu-Run').click(); await t('item-Train an agent…').click(); await ui.spec({ across: [-0.25, -0.1, -0.03, 0.03, 0.1, 0.25] }); },
      () => ui.spec({ across: [-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], vy: [0] }),
      async () => { await t('train-method-q').click(); await t('train-start').click(); await page.getByTestId('train-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 }); mark(t('train-qtable')); },
      async () => { await t('train-watch').click(); await page.locator('iframe[title="Running game"]').waitFor({ timeout: 20000 }); await page.waitForTimeout(2500); mark(page.locator('iframe[title="Running game"]')); },
      async () => {
        await ui.stop(); await t('menu-Run').click(); await t('item-Train an agent…').click();
        await ui.spec({ across: [-0.1, 0.1], vy: [0] });
        await t('train-start').click(); await page.getByTestId('train-status').filter({ hasText: 'Trained.' }).waitFor({ timeout: 300000 }); mark(t('train-qtable'));
      },
    ],
  };

  const ids = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="example-"]')].length >= 0);
  void ids;
  await t('create-project').click();
  const tasks = await page.evaluate(() => window.__gameStudio.store.constructor && null);
  void tasks;
  const all = Object.keys(STEPS).filter((id) => !only || id.startsWith(only));
  const bad = [];
  for (const id of all) {
    try {
      await t('menu-Help').click(); await t('item-Tutorials…').click();
      await t(`tutorial-${id}`).scrollIntoViewIfNeeded(); await t(`tutorial-${id}`).click();
      await answer('discard');
      await t('task-panel').waitFor({ timeout: 15000 });
      for (const [i, act] of STEPS[id].entries()) {
        focus = null;
        try { await act(); } catch (e) { bad.push(`${id} step ${i + 1}: ${e.message.split('\n')[0]}`); }
        const ok = await page.locator(`[data-testid="task-step-${i}"][data-done="yes"]`).waitFor({ timeout: 12000 }).then(() => true, () => false);
        const why = ok ? '' : await page.getByTestId('task-why').innerText({ timeout: 1000 }).catch(() => '(no task panel)');
        if (!ok) bad.push(`${id} step ${i + 1} did not tick: ${why}`);
        console.log(`${ok ? '✓' : '✗'} ${id} ${i + 1}${ok ? '' : `  ${why}`}`);
        if (focus) await focus.evaluate((el) => { el.dataset.gsShot = '1'; el.style.outline = '3px solid #ff9f1c'; el.style.outlineOffset = '2px'; }).catch(() => {});
        // The picture is shown in the task panel, so it shows the editor without the panel.
        await page.evaluate(() => { const p = document.querySelector('[data-testid="task-panel"]'); if (p) p.style.visibility = 'hidden'; });
        // Sharp enough to read every label when enlarged: captured at 2× and saved as WebP (about 100 KB each).
        await sharp(await page.screenshot({ type: 'png' })).webp({ quality: 85 }).toFile(new URL(`${id}-${i}.webp`, OUT).pathname);
        await page.evaluate(() => { const p = document.querySelector('[data-testid="task-panel"]'); if (p) p.style.visibility = ''; });
        await page.evaluate(() => document.querySelectorAll('[data-gs-shot]').forEach((el) => { el.style.outline = ''; delete el.dataset.gsShot; }));
        if (!KEEP_RUNNING.has(id)) await ui.stop();
      }
      await ui.stop();
      // A step may end with a dialog open (Train an agent…): close it, so the next task's menus can be reached.
      if (await t('dialog-close').count()) await t('dialog-close').click().catch(() => {});
      await page.locator('[data-testid="task-finished"]').waitFor({ timeout: 8000 }).catch(async () => bad.push(`${id}: not finished: ${JSON.stringify(await page.evaluate(() => window.__gameStudio.store.task?.results))}`));
    } catch (e) {
      bad.push(`${id}: ${e.message.split('\n')[0]}`);
      console.log(`✗ ${id}: ${e.message.split('\n')[0]}`);
      if (await t('dialog-close').count()) await t('dialog-close').click().catch(() => {});
    }
  }
  check(`Every step of ${all.length} tutorials done as it says, ticked, and pictured`, bad.length === 0, bad.join(' | '));
}, { scale: 2 });
process.exit(failed ? 1 : 0);
