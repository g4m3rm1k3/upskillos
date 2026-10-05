// Chapter 11 of the course, "Quest Buddies": the RPG starter built a feature at a time, from an empty project
// (docs/game-studio-course-plan.md, "The standard for every game chapter"). Every task starts exactly where the one
// before it ends, and the finished example is all the steps in order: both come from examples/questBuddiesBuild.ts.
// The first task (lesson 11.1) opens the finished starter to play and change.

import type { GameTask, PlayOptions } from './types';
import type { Game } from '../engine/game';
import { named, noErrors, type Pos } from './helpers';
import { AT, QB_IMAGES as IMAGES, qbStart, qbSolution } from '../examples/questBuddiesBuild';

export { qbStepCode, qbStep } from '../examples/questBuddiesBuild';

// ── check helpers ───────────────────────────────────────────────────────

type G = Game & { state: Record<string, any> };
const hero = (g: Game) => named<{ position: Pos }>(g, 'Player');
const near = (p: Pos | undefined | null, q: Pos, d = 2) => !!p && Math.abs(p.x - q.x) <= d && Math.abs(p.y - q.y) <= d;
const fmt = (p: Pos | undefined | null) => (p ? `(${Math.round(p.x)}, ${Math.round(p.y)})` : 'nowhere');
/** A watch that walks the hero through a route: each time the game arrives on a map, if it is the next map in the
 *  plan, the hero is put where the plan says (over a door, a coin, a campfire). */
function route(plan: [string, Pos][]): Pick<PlayOptions, 'watch'> {
  let next = 0, lastRoot: unknown = null;
  return {
    watch: (g) => {
      if (g.root === lastRoot) return;
      lastRoot = g.root;
      const step = plan[next];
      if (step && g.sceneApi.path === step[0]) { next++; const h = hero(g); if (h) h.position = step[1]; }
    },
  };
}
/** A watch that presses keys at frames: [frame, code], each held for two frames. */
function presses(list: [number, string][]): (g: Game) => void {
  let f = 0;
  return (g) => { f++; for (const [at, code] of list) { if (f === at) g.input.key(code, true); if (f === at + 2) g.input.key(code, false); } };
}
/** Several watches as one. */
const both = (...ws: ((g: Game, v: import('../engine/game').View) => void)[]) => (g: Game, v: import('../engine/game').View) => { for (const w of ws) w(g, v); };
/** A node of the running game by path, or null. */
const at = <T>(g: Game, path: string) => g.root.find(path) as unknown as T | null;
/** Start a play on a map, as a new game (the hero's ready() starts one when there is none). */
const onMap = (path: string) => (g: Game) => { g.sceneApi.change(path); };

const texts = (r: { drawn: { kind: string }[] }) => r.drawn.filter((i) => i.kind === 'text').map((i) => (i as unknown as { text: string }).text);


export const QUEST_BUDDIES: GameTask[] = [
  {
    id: 'qb-tour',
    chain: 'Quest Buddies',
    title: 'Play Quest Buddies, then change it',
    goal: 'Play the finished starter: a title screen, two maps, a quest, a save point. Then change how a new game starts and what the ranger says.',
    images: IMAGES,
    start: qbStart('qb-tour'),
    steps: [
      { text: 'Press ▶ Run. Choose New game, walk to the ranger and press E to talk. Go through the door east, find the amulet, rest at the campfire, and bring the amulet back.',
        check: { kind: 'editor', test: (v) => v.ran || 'Run the game first (▶ Run, or F5).' } },
      { text: 'Open scripts/game.js: newGame() lists everything a new game starts with. Make a new game start with 25 gold, and run it to see the HUD.',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.4, keys: ['Enter'], keysAt: 0.05 });
          noErrors(r);
          const g = r.game as G;
          if (g.sceneApi.path !== 'scenes/town.scene') return 'Pressing Enter on the title screen should start a new game in the town.';
          return g.state.gold === 25 || `A new game starts with ${g.state.gold} gold: make it 25 in newGame().`;
        } } },
      { text: 'Open scripts/ranger.js and change what she first says: the lines in the not started branch of talk().',
        check: { kind: 'project', test: (v) => { const s = v.script('scripts/ranger.js') ?? ''; if (!/not started/.test(s)) return 'Keep the quest’s stages in ranger.js: only change her words.'; return !s.includes('You there! I lost my amulet in the forest last night') || 'She still says "You there! I lost my amulet…": change that line.'; } } },
    ],
    solution: qbSolution('qb-tour'),
    done: 'You played it and changed it. Back in the lesson: how an RPG is put together, and the plan for building this one yourself.',
  },
  {
    id: 'qb-maps',
    chain: 'Quest Buddies',
    title: 'Two maps and a hero',
    goal: 'From an empty project: a town and a forest made of tiles, each walled in with a gap for a door, and a hero who walks in both.',
    images: IMAGES,
    start: qbStart('qb-maps'),
    steps: [
      { text: 'The town. Make a tileset, tilesets/dungeon.tileset, from the Tiny Dungeon sheet (16 × 16 tiles) with tile 40 solid. Make scenes/town.scene (a Node2D Town) with two TileMapLayers on that tileset: Floor, filled 20 × 12 with tile 48, and Walls, with tile 40 all round the edge except one gap on the east side at column 19, row 5. Make it the main scene.',
        hint: "Floor: fill(0, 0, 20, 12, 48). Walls: setCell(col, row, 40) in two loops, one for the top and bottom rows, one for the two sides, skipping (19, 5).",
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.1 });
          noErrors(r);
          if (r.game.sceneApi.path !== 'scenes/town.scene') return 'Make scenes/town.scene the main scene, so ▶ Run opens it.';
          const floor = at<{ getCell(x: number, y: number): number }>(r.game, 'Floor'), walls = at<{ getCell(x: number, y: number): number }>(r.game, 'Walls');
          if (!floor || !walls) return 'The town needs two TileMapLayers, Floor and Walls.';
          if (floor.getCell(5, 5) !== 48) return `The floor at (5, 5) is tile ${floor.getCell(5, 5)}: fill all 20 × 12 cells with tile 48.`;
          const ring = [[0, 0], [10, 0], [19, 0], [0, 5], [19, 4], [19, 6], [0, 11], [10, 11], [19, 11]].every(([x, y]) => walls.getCell(x, y) === 40);
          if (!ring) return 'Put wall tile 40 all the way round the edge: rows 0 and 11, columns 0 and 19.';
          if (walls.getCell(19, 5) !== -1) return 'Leave a gap in the east wall at column 19, row 5: that is where the door will go.';
          return walls.getCell(5, 5) === -1 || 'Only the edge should have walls: (5, 5) has a tile in Walls.';
        } } },
      { text: 'The forest: scenes/forest.scene (a Node2D Forest), the same as the town but with floor tile 0, and its gap on the west side, at column 0, row 5.',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.1, setup: onMap('scenes/forest.scene') });
          noErrors(r);
          if (r.game.sceneApi.path !== 'scenes/forest.scene') return 'There is no scenes/forest.scene yet.';
          const floor = at<{ getCell(x: number, y: number): number }>(r.game, 'Floor'), walls = at<{ getCell(x: number, y: number): number }>(r.game, 'Walls');
          if (!floor || !walls) return 'The forest needs two TileMapLayers, Floor and Walls.';
          if (floor.getCell(5, 5) !== 0) return `The forest floor at (5, 5) is tile ${floor.getCell(5, 5)}: fill it with tile 0.`;
          if (walls.getCell(0, 5) !== -1) return 'Leave the forest’s gap on the west side, at column 0, row 5.';
          return (walls.getCell(19, 5) === 40 && walls.getCell(0, 4) === 40) || 'Wall the forest all round, except the gap at (0, 5).';
        } } },
      { text: 'The hero: scenes/player.scene, a CharacterBody2D Player with a Sprite2D (tile 98), a 10 × 10 CollisionShape2D, and a Camera2D (zoom 3, smoothing 8, limits 0, 0 to 320, 192). Its script moves it with the arrow keys at 70 pixels a second. Put an instance of it in the town at (56, 96) and in the forest at (32, 88).',
        hint: 'A new project already has the actions move_left, move_right, move_up and move_down (the arrows and WASD). physicsUpdate(dt) { this.velocity = input.vector(\'move_left\', \'move_right\', \'move_up\', \'move_down\').scale(this.speed); this.moveAndSlide(); }',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.5, keys: ['ArrowRight'], keysAt: 0.05 });
          noErrors(r);
          const p = hero(r.game)?.position;
          if (!p) return 'There is no Player in the town yet.';
          if (!(p.x > AT.start.x + 10)) return `Holding → for half a second, the hero only got to ${fmt(p)}: it starts at (56, 96) and should move about 70 pixels a second.`;
          const wall = await v.play({ seconds: 1, keys: ['ArrowLeft'], keysAt: 0.05 });
          const q = hero(wall.game)?.position;
          if (!q || q.x < 16) return `Holding ← the hero went through the west wall (to ${fmt(q)}): make tile 40 solid in the tileset, and give the hero a shape.`;
          const forest = await v.play({ seconds: 0.1, setup: onMap('scenes/forest.scene') });
          return near(hero(forest.game)?.position, AT.fromTown) || 'Put the hero in the forest too, at (32, 88).';
        } } },
    ],
    solution: qbSolution('qb-maps'),
    done: 'Two maps and a hero who walks in both. Back in the lesson: tiles, solid tiles, and a scene used twice.',
  },
  {
    id: 'qb-doors',
    chain: 'Quest Buddies',
    title: 'Two maps and the doors between them',
    goal: 'A door that takes the hero from the town to the forest, arriving in the right place, and a door back.',
    images: IMAGES,
    start: qbStart('qb-doors'),
    steps: [
      { text: 'In town.scene, add an Area2D called Door to forest at the gap in the east wall (x 312, y 88), with a Sprite2D (tile 45, a door) and a CollisionShape2D. Give it a script whose bodyEntered(body) calls scene.change(\'scenes/forest.scene\') when body.name is Player.',
        hint: 'Area2D notices bodies coming in: bodyEntered(body). scene.change switches scenes at the end of the frame.',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.3, setup: (g) => { hero(g)!.position = AT.townDoor; } });
          noErrors(r);
          return r.game.sceneApi.path === 'scenes/forest.scene' || 'Standing in the town’s east doorway (312, 88) does not take the hero to the forest yet.';
        } } },
      { text: 'Arrive by the door, not at the hero’s own position. In forest.scene add a Node2D Spawns, and under it a Node2D FromTown at (32, 88). The door sets state.arriveAt = \'FromTown\' before it changes scene; in player.js, ready() stands the hero on Spawns/ + state.arriveAt if there is one.',
        hint: 'const spawn = state.arriveAt && scene.find(\'Spawns/\' + state.arriveAt); if (spawn) this.position = spawn.position;',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.3, setup: (g) => { hero(g)!.position = AT.townDoor; } });
          noErrors(r);
          if (r.game.sceneApi.path !== 'scenes/forest.scene') return 'The east door no longer leads to the forest.';
          const p = hero(r.game)?.position;
          return near(p, AT.fromTown) || `The hero arrives at ${fmt(p)}: it should stand on Spawns/FromTown, (32, 88).`;
        } } },
      { text: 'The way back. Make door.js a class Door with fields target and arriveAt and the bodyEntered that uses them; then each door is a tiny script that extends it: door_to_forest.js (to the forest, FromTown) and door_to_town.js (to the town, FromForest). Put the door in the forest’s west gap (8, 88), and Spawns/FromForest in town at (280, 88).',
        hint: 'import Door from \'./door.js\'; export default class extends Door { target = \'scenes/town.scene\'; arriveAt = \'FromForest\'; }',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 1, setup: (g) => { hero(g)!.position = AT.townDoor; }, ...route([['scenes/forest.scene', AT.forestDoor]]) });
          noErrors(r);
          if (r.game.sceneApi.path !== 'scenes/town.scene') return 'Through the east door and back through the forest’s west door (8, 88) should end in the town.';
          const p = hero(r.game)?.position;
          if (!near(p, AT.fromForest)) return `Back in town the hero is at ${fmt(p)}: it should stand on Spawns/FromForest, (280, 88).`;
          const doors = v.project.scripts.filter((s) => /extends\s+Door\b/.test(s.source)).length;
          return doors >= 2 || 'Make each door a small script that extends Door (import Door from \'./door.js\'), so the door code is written once.';
        } } },
    ],
    solution: qbSolution('qb-doors'),
    done: 'Two maps joined by doors. Back in the lesson: scene.change, spawn points, and why each door is its own small class.',
  },
  {
    id: 'qb-state',
    chain: 'Quest Buddies',
    title: 'Game state that lasts',
    goal: 'Gold that stays when you change map, a HUD that shows it on every map, and a coin that stays taken.',
    images: IMAGES,
    start: qbStart('qb-state'),
    steps: [
      { text: 'Make scripts/game.js with export function newGame() that fills state with a new game’s values: gold 0 and taken [] (plus map and arriveAt). In player.js’s ready(), call it when there is no game yet (state.gold === undefined). Then add a Coin to the town: an Area2D at (120, 140) with a picture (assets/coin.svg, or any) and a shape, whose script adds 10 to state.gold and removes the coin.',
        hint: 'bodyEntered(body) { if (body.name !== \'Player\') return; state.gold += 10; this.queueFree(); }',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.3, setup: (g) => { hero(g)!.position = AT.coin; } });
          noErrors(r);
          const g = r.game as G;
          if (g.state.gold !== 10) return `After walking onto the coin, state.gold is ${JSON.stringify(g.state.gold)}: it should be 10.`;
          return !named(g, 'Coin') || 'The coin is still there after the hero takes it.';
        } } },
      { text: 'Show the gold on every map: make scenes/hud.scene (a CanvasLayer HUD with a Label Gold), whose script sets the label to \'Gold: \' + state.gold every frame, and put an instance of it in both maps.',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.8, watch: (() => { let f = 0, done = false; return (g: Game) => { if (f++ === 0) hero(g)!.position = AT.coin; if (f === 20 && !done) { done = true; hero(g)!.position = AT.townDoor; } }; })() });
          noErrors(r);
          if (r.game.sceneApi.path !== 'scenes/forest.scene') return 'The east door no longer leads to the forest.';
          return texts(r).some((t) => /\b10\b/.test(t)) || 'In the forest, after taking the coin, no label shows 10 gold. Put the HUD in the forest too.';
        } } },
      { text: 'Come back to town and the coin is there again. Fix it with state: when the coin is taken, push its name onto state.taken; in its ready(), remove it straight away if its name is in state.taken.',
        hint: 'ready() { if (state.taken.includes(this.name)) this.queueFree(); }',
        check: { kind: 'play', test: async (v) => {
          let f = 0;
          const plan = (g: Game) => { f++; const h = hero(g)!; if (f === 1) h.position = AT.coin; if (f === 20) h.position = AT.townDoor; };
          let arrivals = 0, root: unknown = null;
          const r = await v.play({ seconds: 1.4, watch: (g) => { plan(g); if (g.root !== root) { root = g.root; arrivals++; if (arrivals === 2) hero(g)!.position = AT.forestDoor; } } });
          noErrors(r);
          if (r.game.sceneApi.path !== 'scenes/town.scene') return 'Coin, east door, west door: the hero should be back in town.';
          const g = r.game as G;
          if (named(g, 'Coin')) return 'Back in town, the coin is there again: write its name into state.taken and check it in ready().';
          return g.state.gold === 10 || `The hero has ${g.state.gold} gold: it should still be 10.`;
        } } },
    ],
    solution: qbSolution('qb-state'),
    done: 'State that lasts from map to map. Back in the lesson: what belongs in state, and what does not.',
  },
  {
    id: 'qb-save',
    chain: 'Quest Buddies',
    title: 'Saving and loading',
    goal: 'A campfire that saves the game, and a title screen whose Continue loads it.',
    images: IMAGES,
    start: qbStart('qb-save'),
    steps: [
      { text: 'A save point. In forest.scene add an Area2D Campfire at (160, 152) with a Sprite2D (tile 29, a fire) and a 14 × 14 CollisionShape2D, and under Spawns a Node2D Campfire at (160, 132), just above it. Its script: when Player walks in, set state.arriveAt = \'Campfire\' and save.write(\'slot1\'). Run, walk to it, and Output says Saved to slot "slot1".',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.4, setup: (g) => { g.sceneApi.change('scenes/forest.scene'); }, ...route([['scenes/forest.scene', AT.campfire]]) });
          noErrors(r);
          const g = r.game as G;
          if (!g.save.has('slot1')) return 'Walking onto the campfire saves nothing in slot1 yet.';
          const saved = g.save.read('slot1') as Record<string, unknown>;
          if (saved.arriveAt !== 'Campfire') return `The save says arriveAt is ${JSON.stringify(saved.arriveAt)}: set it to 'Campfire' before saving, so a loaded game wakes at the campfire.`;
          return saved.map === 'scenes/forest.scene' || `The save says the map is ${JSON.stringify(saved.map)}: player.js should keep state.map up to date.`;
        } } },
      { text: 'A title screen. Add an input action new_game (N). Make scenes/title.scene, a Node2D Title with two Labels: Name (Quest Buddies, size 48, at 330, 150) and NewGame (N: new game, at 380, 260). Its script, title.js: when new_game is just pressed, call newGame() (import it from ./game.js) and scene.change(state.map). Make the title the main scene.',
        check: { kind: 'play', test: async (v) => {
          const first = await v.play({ seconds: 0.1 });
          noErrors(first);
          if (first.game.sceneApi.path !== 'scenes/title.scene') return 'Make scenes/title.scene the main scene, so the game opens on it.';
          const r = await v.play({ seconds: 0.4, keys: ['KeyN'], keysAt: 0.05 });
          noErrors(r);
          const g = r.game as G;
          if (g.sceneApi.path !== 'scenes/town.scene') return 'Pressing N on the title screen should start a new game in the town.';
          return g.state.gold === 0 || `After N, state.gold is ${JSON.stringify(g.state.gold)}: call newGame() so a new game starts fresh.`;
        } } },
      { text: 'Continue. Add an input action continue (C) and a Label Continue (C: continue, at 380, 300). In title.js, when continue is just pressed and save.has(\'slot1\'), call save.load(\'slot1\') and scene.change(state.map).',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.4, keys: ['KeyC'], keysAt: 0.05, setup: (g) => { g.save.write('slot1', { map: 'scenes/forest.scene', arriveAt: 'Campfire', gold: 30, taken: ['Coin'] }); } });
          noErrors(r);
          const g = r.game as G;
          if (g.sceneApi.path !== 'scenes/forest.scene') return 'With a game saved in the forest, pressing C on the title screen should take you there.';
          if (g.state.gold !== 30) return `After Continue, state.gold is ${g.state.gold}: the save had 30.`;
          const p = hero(g)?.position;
          return near(p, AT.campfireSpawn) || `After Continue the hero is at ${fmt(p)}: it should wake at the campfire, (160, 132).`;
        } } },
      { text: 'Only offer Continue when there is a saved game: in title.js’s ready(), make the Continue label visible only if save.has(\'slot1\').',
        check: { kind: 'play', test: async (v) => {
          const none = await v.play({ seconds: 0.1 });
          noErrors(none);
          if (texts(none).some((t) => /continue/i.test(t))) return 'With no saved game, the title screen still shows "C: continue".';
          const some = await v.play({ seconds: 0.1, setup: (g) => { g.save.write('slot1', { map: 'scenes/forest.scene' }); g.sceneApi.change('scenes/title.scene'); } });
          return texts(some).some((t) => /continue/i.test(t)) || 'With a saved game, the title screen should show "C: continue".';
        } } },
    ],
    solution: qbSolution('qb-save'),
    done: 'A game that can be saved and continued. Back in the lesson: what a save is, why it is a copy, and saves from older versions of your game.',
  },
  {
    id: 'qb-menus',
    chain: 'Quest Buddies',
    title: 'Menus with buttons',
    goal: 'A title screen made of buttons that the mouse or the keys can work, and a pause menu.',
    images: IMAGES,
    start: qbStart('qb-menus'),
    steps: [
      { text: 'Rebuild the title screen with buttons: delete the NewGame and Continue labels; add a CanvasLayer Menu, a Panel Box in it, and in the Panel a VBoxContainer Buttons holding two Buttons, New game and Continue (set each one’s text and size). The container lines them up.',
        check: { kind: 'project', test: (v) => {
          const s = v.project.scenes.find((x) => x.path === 'scenes/title.scene');
          if (!s) return 'There is no scenes/title.scene.';
          const flat: { type: string; name: string; parent: string }[] = [];
          const walk = (n: { type: string; name: string; children: unknown[] }, parent: string) => { flat.push({ type: n.type, name: n.name, parent }); for (const c of n.children as typeof n[]) walk(c, n.type); };
          walk(s.root as never, '');
          if (!flat.some((n) => n.type === 'Panel')) return 'The title screen has no Panel yet.';
          const buttons = flat.filter((n) => n.type === 'Button' && n.parent === 'VBoxContainer').map((n) => n.name);
          return (buttons.includes('New game') && buttons.includes('Continue')) || 'Put two Buttons, New game and Continue, inside a VBoxContainer.';
        } } },
      { text: 'Wire them up in title.js: in ready(), connect each Button’s pressed signal to a method (newGame, continueGame); disable Continue when there is no save (disabled = !save.has(\'slot1\')); and give New game the focus (grabFocus()) so Enter works without the mouse.',
        hint: "buttons.get('New game').connect('pressed', this, 'newGame');",
        check: { kind: 'play', test: async (v) => {
          const fresh = await v.play({ seconds: 0.3, keys: ['Enter'], keysAt: 0.05 });
          noErrors(fresh);
          if (fresh.game.sceneApi.path !== 'scenes/town.scene') return 'With New game focused, Enter on the title screen should start a new game in the town.';
          const r = await v.play({ seconds: 0.5, setup: (g) => { g.save.write('slot1', { map: 'scenes/forest.scene', arriveAt: 'Campfire', gold: 5, taken: [] }); g.sceneApi.change('scenes/title.scene'); }, watch: presses([[10, 'ArrowDown'], [16, 'Enter']]) });
          noErrors(r);
          return r.game.sceneApi.path === 'scenes/forest.scene' || 'With a saved game, ↓ then Enter (Continue) should load it and go to the forest.';
        } } },
      { text: 'A pause menu: in hud.scene add a Panel Pause with a VBoxContainer Buttons holding Resume and Title screen. Add an input action menu (Escape). The HUD script hides Pause at the start, shows it on menu and gives Resume the focus, and hides it again on Resume or menu; Title screen goes back to the title. The hero stands still while it is open: give the HUD a busy getter, and have player.js stop when scene.get(\'HUD\').busy.',
        check: { kind: 'play', test: async (v) => {
          let moved = 0, from: Pos | null = null;
          const r = await v.play({ seconds: 0.8, setup: onMap('scenes/town.scene'), watch: both(presses([[6, 'Escape']]), (g) => { const h = hero(g); if (!h) return; const f = g.time.frame; if (f === 12) { from = { ...h.position }; g.input.key('ArrowRight', true); } if (f > 12 && from) moved = Math.max(moved, Math.abs(h.position.x - from.x)); }) });
          noErrors(r);
          const pause = at<{ visible: boolean }>(r.game, 'HUD/Pause'), resume = at<{ hasFocus: boolean }>(r.game, 'HUD/Pause/Buttons/Resume');
          if (!pause?.visible) return 'Pressing Escape on a map does not show HUD/Pause.';
          if (!resume?.hasFocus) return 'When the pause menu opens, Resume should have the focus (grabFocus()).';
          if (moved > 1) return `While paused, holding → still moved the hero ${Math.round(moved)} pixels: stop it while the HUD is busy.`;
          const back = await v.play({ seconds: 0.5, setup: onMap('scenes/town.scene'), watch: presses([[6, 'Escape'], [12, 'ArrowDown'], [18, 'Enter']]) });
          noErrors(back);
          return back.game.sceneApi.path === 'scenes/title.scene' || 'Escape, ↓, Enter (Title screen) should go back to the title screen.';
        } } },
    ],
    solution: qbSolution('qb-menus'),
    done: 'Menus that work with the mouse or the keys. Back in the lesson: signals, focus, and why a container beats placing buttons by hand.',
  },
  {
    id: 'qb-bars',
    chain: 'Quest Buddies',
    title: 'A health bar and a bag',
    goal: 'Hit points shown as a bar, and a bag that lists what you carry, both read from state.',
    images: IMAGES,
    start: qbStart('qb-bars'),
    steps: [
      { text: 'Add hp: 10, maxHp: 10 and bag: [] to newGame() in game.js. In hud.scene add a ProgressBar Hp (fill colour red, showText on); in the HUD script set its maxValue and value from state every frame. And make the campfire heal: state.hp = state.maxHp before it saves.',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.2, setup: onMap('scenes/town.scene'), watch: (() => { let set = false; return (g: Game) => { const st = (g as G).state; if (!set && st.gold !== undefined) { set = true; st.hp = 4; st.maxHp = 12; } }; })() });
          noErrors(r);
          const bar = at<{ value: number; maxValue: number }>(r.game, 'HUD/Hp');
          if (!bar) return 'There is no ProgressBar called Hp in the HUD yet.';
          if (!(bar.value === 4 && bar.maxValue === 12)) return `With state.hp 4 of 12 the bar shows ${bar.value} of ${bar.maxValue}: set value and maxValue from state every frame.`;
          const rest = await v.play({ seconds: 0.3, setup: (g) => { g.sceneApi.change('scenes/forest.scene'); }, watch: (() => { let f = 0; return (g: Game) => { const st = (g as G).state; if (++f === 3 && st.gold !== undefined) { st.hp = 4; hero(g)!.position = AT.campfire; } }; })() });
          noErrors(rest);
          return (rest.game as G).state.hp === 10 || `After resting at the campfire, hp is ${(rest.game as G).state.hp}: the campfire should set state.hp to state.maxHp.`;
        } } },
      { text: 'The bag: add an input action inventory (I). In hud.scene add a Panel Bag (at 680, 70, 260 × 280) with a Label Title (Bag (I to close)) and a VBoxContainer List in it. The HUD hides Bag at the start; the inventory action (I) shows and hides it. Each time it opens, empty List and add a Label for each item in state.bag (item.name and item.note).',
        hint: 'for (const row of list.children) row.queueFree(); for (const item of state.bag) { const row = new Label(); row.text = item.name; list.addChild(row); }',
        check: { kind: 'play', test: async (v) => {
          let set = false;
          const r = await v.play({ seconds: 0.4, setup: onMap('scenes/town.scene'), watch: both((g) => { const st = (g as G).state; if (!set && st.gold !== undefined) { set = true; st.bag = [{ name: 'Rope', note: '20 feet' }, { name: 'Torch', note: 'unlit' }]; } }, presses([[8, 'KeyI']])) });
          noErrors(r);
          const bag = at<{ visible: boolean }>(r.game, 'HUD/Bag'), list = r.game.root.find('HUD/Bag/List');
          if (!bag?.visible) return 'Pressing I does not show HUD/Bag.';
          const rows = (list?.children ?? []).map((c) => String((c as unknown as { text: string }).text));
          return (rows.length === 2 && rows[0].includes('Rope') && rows[1].includes('Torch')) || `With Rope and Torch in state.bag, the list shows ${rows.length} rows: ${JSON.stringify(rows)}.`;
        } } },
      { text: 'The hero stands still while the bag is open: make the HUD’s busy true when Bag is visible as well as Pause.',
        check: { kind: 'play', test: async (v) => {
          let from: Pos | null = null, moved = 0;
          const r = await v.play({ seconds: 0.6, setup: onMap('scenes/town.scene'), watch: both(presses([[6, 'KeyI']]), (g) => { const h = hero(g); if (!h) return; if (g.time.frame === 12) { from = { ...h.position }; g.input.key('ArrowRight', true); } if (g.time.frame > 12 && from) moved = Math.max(moved, Math.abs(h.position.x - from.x)); }) });
          noErrors(r);
          if (!at<{ visible: boolean }>(r.game, 'HUD/Bag')?.visible) return 'I does not open the bag.';
          return moved <= 1 || `With the bag open, holding → moved the hero ${Math.round(moved)} pixels.`;
        } } },
    ],
    solution: qbSolution('qb-bars'),
    done: 'A HUD that shows state. Back in the lesson: how the bar fills, how the list lays itself out, and rebuilding a list from data.',
  },
  {
    id: 'qb-talk',
    chain: 'Quest Buddies',
    title: 'Dialogue and a quest',
    goal: 'A dialogue box that types its lines out, and a quest that moves through its stages as you play.',
    images: IMAGES,
    start: qbStart('qb-talk'),
    steps: [
      { text: 'A dialogue box. Add an input action interact (E and Space). In hud.scene add a Panel Dialogue (at 80, 370, 800 × 150, hidden) with two Labels, Name and Text (wrap width 760), and two more Labels at the HUD’s top level: Message (top middle) and Hint (above the box). Give the HUD three methods: say(text) puts text in Message, hint(text) puts it in Hint, and talk(name, lines, done) puts the name in Dialogue/Name, keeps the lines, shows Dialogue, and types the first line out at 40 letters a second with Dialogue/Text’s visibleCharacters (−1 when it is all shown).',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.25, setup: onMap('scenes/town.scene'), watch: (() => { let said = false; return (g: Game) => { const h = g.root.find('HUD') as unknown as { talk?: (n: string, l: string[]) => void } | null; if (!said && h?.talk && g.time.frame >= 3) { said = true; h.talk('Test', ['Hello there, traveller, and welcome.']); (h as unknown as { say?: (t: string) => void }).say?.('A message'); (h as unknown as { hint?: (t: string) => void }).hint?.('A hint'); } }; })() });
          noErrors(r);
          const box = at<{ visible: boolean }>(r.game, 'HUD/Dialogue'), text = at<{ visibleCharacters: number; text: string }>(r.game, 'HUD/Dialogue/Text');
          if (!(r.game.root.find('HUD') as unknown as { talk?: unknown })?.talk) return 'The HUD has no talk method yet.';
          if (!box?.visible) return 'After talk(), HUD/Dialogue should be visible.';
          if (at<{ text: string }>(r.game, 'HUD/Message')?.text !== 'A message') return 'say(\'A message\') should put that text in HUD/Message.';
          if (at<{ text: string }>(r.game, 'HUD/Hint')?.text !== 'A hint') return 'hint(\'A hint\') should put that text in HUD/Hint.';
          const n = text?.visibleCharacters ?? -1;
          return (n >= 4 && n <= 12) || `About 0.2 s into a line, ${n === -1 ? 'all of it' : n + ' letters'} show: type it out at 40 letters a second.`;
        } } },
      { text: 'interact (E) moves the conversation on: if the line is still typing, show it all; if it is finished, go to the next line; after the last line, hide Dialogue and call done(). While it is open the hero stands still (busy).',
        check: { kind: 'play', test: async (v) => {
          let ended = false;
          const r = await v.play({ seconds: 1.6, setup: onMap('scenes/town.scene'), watch: both((() => { let said = false; return (g: Game) => { const h = g.root.find('HUD') as unknown as { talk?: (n: string, l: string[], d: () => void) => void } | null; if (!said && h?.talk && g.time.frame >= 3) { said = true; h.talk('Test', ['One two three four five six seven eight nine ten.', 'Second line.'], () => { ended = true; }); } }; })(), presses([[10, 'KeyE'], [20, 'KeyE'], [70, 'KeyE']])) });
          noErrors(r);
          if (!ended) return 'E (finish the line), E (next line), and E again after it has typed out should end the conversation and run done().';
          return !at<{ visible: boolean }>(r.game, 'HUD/Dialogue')?.visible || 'After the last line, hide HUD/Dialogue.';
        } } },
      { text: 'The quest. Add quests: { amulet: \'not started\' } to newGame(). In town.scene add an Area2D Ranger at (168, 72) (tile 112, a circle shape 40 across, so you can talk from a step away); in forest.scene an Area2D Amulet at (280, 40) (tile 101, a 10 × 10 shape). ranger.js: bodyEntered and bodyExited set the player’s near to her (or back to null) and show or clear the hint E: talk; her talk() chooses its lines by the quest’s stage. amulet.js: removes itself in ready() unless the quest is started; picked up, it goes into state.bag and the quest becomes found. In player.js, E calls this.near.talk() when someone is near and the HUD is not busy. Talking to her moves state.quests.amulet from not started to started; picking up the amulet (only there while started) to found, with it in state.bag; talking again to done, with 50 gold.',
        hint: 'Talking again when found: take the amulet out of state.bag (filter), add 50 gold, and the quest becomes done.',
        check: { kind: 'play', test: async (v) => {
          const RANGER = { x: 168, y: 90 }, AMULET_AT = { x: 280, y: 40 };
          const r = await v.play({ seconds: 6, setup: (g) => { g.sceneApi.change('scenes/town.scene'); },
            watch: both(route([['scenes/town.scene', RANGER], ['scenes/forest.scene', AMULET_AT], ['scenes/town.scene', RANGER]]).watch!,
              presses([[8, 'KeyE'], [14, 'KeyE'], [20, 'KeyE'], [140, 'KeyE']]),
              (g) => { const f = g.time.frame, h = hero(g); if (!h) return; if (f === 160) h.position = AT.townDoor; if (f === 200) h.position = AMULET_AT; if (f === 210) h.position = AT.forestDoor; },
              presses([[240, 'KeyE'], [330, 'KeyE']])) });
          noErrors(r);
          const st = (r.game as G).state;
          if (st.quests?.amulet !== 'done') return `The quest ended at "${st.quests?.amulet}": talk → started, amulet → found, talk → done.`;
          if (st.gold !== 50) return `Finishing the quest gave ${st.gold} gold: it should give 50.`;
          return !(st.bag ?? []).some((i: { name: string }) => i.name === 'Amulet') || 'The amulet should leave the bag when the ranger takes it back.';
        } } },
    ],
    solution: qbSolution('qb-talk'),
    done: 'A conversation and a quest. Back in the lesson: the typewriter, and a quest as a state machine.',
  },
  {
    id: 'qb-sounds',
    chain: 'Quest Buddies',
    title: 'Sound effects from numbers',
    goal: 'Make a coin sound and a whoosh from a few numbers each, and play them when they happen.',
    images: IMAGES,
    start: qbStart('qb-sounds'),
    steps: [
      { text: 'Files › New sound…, named coin, and move it to assets/sounds/coin.wav (or make it there with project.writeSound). Make it a coin: a square wave rising in pitch (to higher than from), shorter than 0.3 seconds. Press ▶ Hear it as you change it.',
        check: { kind: 'project', test: (v) => {
          const a = v.project.assets.find((x) => x.path === 'assets/sounds/coin.wav');
          if (!a?.sound) return 'There is no sound at assets/sounds/coin.wav yet.';
          if (a.sound.wave !== 'square') return `coin.wav is a ${a.sound.wave} wave: make it square.`;
          if (!(a.sound.to > a.sound.from)) return 'A coin’s pitch rises: make "to" higher than "from".';
          return a.sound.length < 0.3 || `coin.wav lasts ${a.sound.length} s: make it shorter than 0.3.`;
        } } },
      { text: 'In hud.scene add a Node Sounds, and in it an AudioStreamPlayer Coin playing assets/sounds/coin.wav. In coin.js, play it when the coin is taken: scene.get(\'HUD/Sounds/Coin\').play().',
        check: { kind: 'play', test: async (v) => {
          let heard = false;
          const r = await v.play({ seconds: 0.3, setup: onMap('scenes/town.scene'), watch: both(route([['scenes/town.scene', AT.coin]]).watch!, (g) => { const s = g.root.find('HUD/Sounds/Coin') as unknown as { playing?: boolean } | null; if (s?.playing) heard = true; }) });
          noErrors(r);
          if (!r.game.root.find('HUD/Sounds/Coin')) return 'There is no AudioStreamPlayer at HUD/Sounds/Coin yet.';
          return heard || 'Taking the coin does not play HUD/Sounds/Coin.';
        } } },
      { text: 'A whoosh for doors: a noise wave falling in pitch (from higher than to), at assets/sounds/arrive.wav, in an AudioStreamPlayer HUD/Sounds/Arrive. Play it in player.js’s ready(), so it sounds as you arrive on a map.',
        check: { kind: 'play', test: async (v) => {
          const a = v.project.assets.find((x) => x.path === 'assets/sounds/arrive.wav');
          if (!a?.sound) return 'There is no sound at assets/sounds/arrive.wav yet.';
          if (a.sound.wave !== 'noise' || !(a.sound.from > a.sound.to)) return 'arrive.wav should be a noise wave whose pitch falls (from higher than to).';
          let heard = false;
          const r = await v.play({ seconds: 0.4, setup: onMap('scenes/town.scene'), watch: both(route([['scenes/town.scene', AT.townDoor]]).watch!, (g) => { const s = g.root.find('HUD/Sounds/Arrive') as unknown as { playing?: boolean } | null; if (g.sceneApi.path === 'scenes/forest.scene' && s?.playing) heard = true; }) });
          noErrors(r);
          return heard || 'Arriving in the forest does not play HUD/Sounds/Arrive.';
        } } },
    ],
    solution: qbSolution('qb-sounds'),
    done: 'Sounds made from numbers. Back in the lesson: what the numbers mean, from hertz and octaves to the shape of a wave.',
  },
];
