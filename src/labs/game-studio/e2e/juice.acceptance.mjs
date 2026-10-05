// Tweens, particles, modulate, pathfinding and the debug panel in the real editor and game frame: a hero that slides
// (tween) to the end of a path found round a wall (findPath), tinted red (modulate), with sparks (Particles2D), and
// whose speed is a debug slider: moving it in the Debug tab changes the running game, and a watch shows it.
//
//   node src/labs/game-studio/e2e/juice.acceptance.mjs   (starts and stops its own server)

import { withGameStudio } from './harness.mjs';

const OUT = process.env.SCREENSHOTS;
const SHEET = 'assets/tiny-dungeon/tilemap/tilemap_packed.png', HERO = 'assets/tiny-dungeon/tiles/tile_0098.png';
const BUILD = `project.setSettings({ background: '#141018', pixelArt: true, gravity: 0 })
project.createTileset('tilesets/t.tileset', { image: '${SHEET}', tileWidth: 16, tileHeight: 16, solid: [40] })
const s = project.createScene('scenes/main.scene', 'Node2D', 'Main')
const walls = s.add('TileMapLayer', { name: 'Walls', tileset: 'tilesets/t.tileset', scale: { x: 3, y: 3 } })
walls.fill(0, 0, 20, 12, 48)
for (let y = 0; y < 9; y++) walls.setCell(10, y, 40)
s.add('Node2D', { name: 'Hero', position: { x: 72, y: 72 } })
s.add('Sprite2D', { name: 'Sprite', parent: 'Hero', texture: '${HERO}', scale: { x: 3, y: 3 }, modulate: '#ff8080' })
s.add('Particles2D', { name: 'Sparks', parent: 'Hero', emitting: true, rate: 40, speed: 80, gravity: 120, size: 4 })
project.writeScript('scripts/hero.js', \`export default class Hero extends Node2D {
  ready() {
    // The way round the wall, as world points: walk it with one tween after another.
    this.route = scene.get('Walls').findPath(this.position, { x: 15 * 48 + 24, y: 2 * 48 + 24 });
    console.log('path of ' + this.route.length + ' cells');
  }
  update(dt) {
    this.speed = debug.slider('speed', 0, 0, 400);
    debug.watch('x', Math.round(this.position.x));
    if (this.route.length && !this.moving && this.speed > 0) {
      const next = this.route.shift();
      this.moving = true;
      tween.to(this, { position: next }, 48 / this.speed, { ease: 'linear', then: () => { this.moving = false; } });
    }
  }
}\`)
s.get('Hero').script = 'scripts/hero.js'
project.setMainScene('scenes/main.scene')`;

const failed = await withGameStudio(5199, async ({ page, t, check }) => {
  const store = (fn, arg) => page.evaluate(fn, arg);
  await store(async ([code, sheet, hero]) => {
    const s = window.__gameStudio.store;
    s.newProject('Juice');
    for (const path of [sheet, hero]) { const img = await (await fetch(`/src/labs/game-studio/starter/${path.replace(/^assets\//, '')}`)).blob(); await s.importStarter(path, URL.createObjectURL(img)); }
    s.act((d) => d.runCode('Build', code));
  }, [BUILD, SHEET, HERO]);
  await t('projects-dialog').getByRole('button', { name: 'Close' }).click().catch(() => {});
  await t('run-project').click();
  await page.waitForFunction(() => window.__gameStudio.store.output.some((o) => o.text.startsWith('path of')), null, { timeout: 30000 });
  const out = await store(() => window.__gameStudio.store.output.map((o) => o.text));
  const cells = Number(out.find((l) => l.startsWith('path of')).split(' ')[2]);
  check('findPath goes round the wall: more cells than the straight line (13)', cells > 13, String(cells));

  await t('tab-debug').click();
  await t('debug-slider-speed').waitFor({ timeout: 10000 });
  const x0 = Number(await t('debug-x').innerText().then((s) => s.replace(/\D+/g, ' ').trim().split(' ').pop()));
  await page.waitForTimeout(800);
  const x1 = Number(await t('debug-x').innerText().then((s) => s.replace(/\D+/g, ' ').trim().split(' ').pop()));
  check('With speed 0 (the slider\'s start), the hero stays put', x0 === 72 && x1 === 72, `${x0} → ${x1}`);
  await t('debug-number-speed').fill('300');
  await page.waitForTimeout(2500);
  const x2 = Number(await t('debug-x').innerText().then((s) => s.replace(/\D+/g, ' ').trim().split(' ').pop()));
  check('Setting speed to 300 in the Debug tab sets the running hero moving along its path (the watch shows it)', x2 !== 72, `x is ${x2}`);
  if (OUT) { await page.screenshot({ path: `${OUT}/juice-editor.png` }); await page.locator('iframe[title="Running game"]').screenshot({ path: `${OUT}/juice-game.png` }); }
  const errors = await store(() => window.__gameStudio.store.output.filter((o) => o.level === 'error').map((o) => o.text));
  check('No errors in the game', errors.length === 0, errors.join(' | '));
  await t('stop').click();
});
process.exit(failed ? 1 : 0);
