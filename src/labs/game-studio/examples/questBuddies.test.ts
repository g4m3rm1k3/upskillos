// Quest Buddies (examples/questBuddies.ts), played headless by its own scripts: the title screen, two maps and their
// doors, the quest from talk to reward, the campfire's save, Continue in a second run, the pause menu and the bag.
import { afterAll, describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { problems } from '../core/serialize';
import { Game, MATH, scriptGlobals } from '../engine/game';
import { Vec2 } from '../engine/vec2';
import { memoryStore, type SaveStore } from '../engine/saves';
import { NODE_CLASSES, type Button, type CharacterBody2D, type Label, type Node, type ProgressBar } from '../engine/nodes';
import { dataUrlLoader } from '../ml/testLoader';
import { questBuddies } from './questBuddies';

afterAll(() => { for (const k of ['input', 'scene', 'time', 'state', 'save', 'math', 'physics', 'ai', 'Vec2', 'PhysicsBody2D', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

function build(): Doc {
  const d = new Doc(newProject(questBuddies.title));
  for (const path of questBuddies.images) d.importAsset(path, { mime: 'image/png', width: path.includes('tilemap') ? 192 : 16, height: path.includes('tilemap') ? 176 : 16 });
  d.runCode('Build Quest Buddies', questBuddies.code);
  return d;
}

/** One run of the game: its own Game, sharing the saved slots with other runs. */
async function run(d: Doc, saves: SaveStore) {
  Object.assign(globalThis, NODE_CLASSES, { Vec2, math: MATH });   // as the game's frame does before loading scripts
  const classes = await dataUrlLoader(d.project);
  const errors: string[] = [];
  const title = d.project.scenes.find((s) => s.path === d.project.settings.mainScene)!;
  const g = new Game(d.project, title, { frame: () => undefined }, { saves, scriptClass: (p) => classes.get(p) as typeof Node, onError: (e) => errors.push(`${e.file}: ${e.message}`) });
  Object.assign(globalThis, scriptGlobals(g));
  g.start();
  const step = (n = 1) => { for (let i = 0; i < n; i++) g.step(1 / 60); };
  const press = (code: string) => { g.input.key(code, true); step(); g.input.key(code, false); step(); };
  const get = <T extends Node>(path: string) => g.root.get<T>(path);
  /** Put the hero somewhere (over a door, an item, a person) and let the physics notice. */
  const goTo = (x: number, y: number) => { get<CharacterBody2D>('Player').position = { x, y }; step(3); };
  return { g, errors, step, press, get, goTo };
}

describe('Quest Buddies', () => {
  it('builds with no problems', () => {
    expect(problems(build().project)).toEqual([]);
  });

  it('plays from the title screen through the quest, saves, continues, pauses and is rewarded', async () => {
    const d = build(), saves = memoryStore();

    // ── the first run ──
    let r = await run(d, saves);
    expect(r.get<Button>('Menu/Box/Buttons/Continue').disabled).toBe(true);   // nothing saved yet
    r.press('Enter');                                                         // New game has the focus
    r.step();
    expect(r.g.sceneApi.path).toBe('scenes/town.scene');
    expect(r.get<CharacterBody2D>('Player').position).toMatchObject({ x: 56, y: 96 });
    expect(r.get<ProgressBar>('HUD/Status/Hp').value).toBe(10);

    // The ranger: walk up, press E, read both lines (E finishes a line, E again goes on).
    r.goTo(168, 90);
    expect(r.get<Label>('HUD/Hint').text).toBe('E: talk');
    r.press('KeyE');
    const text = r.get<Label>('HUD/Dialogue/Text');
    expect(r.get<Node & { visible: boolean }>('HUD/Dialogue').visible).toBe(true);
    expect(text.visibleCharacters).toBeGreaterThanOrEqual(0);
    expect(text.visibleCharacters).toBeLessThan(text.totalCharacters);   // typing, not all there yet
    r.press('KeyE'); expect(text.visibleCharacters).toBe(-1);            // the line, finished at once
    r.press('KeyE'); expect(text.text).toMatch(/^The forest is through the door/);
    r.step(150); r.press('KeyE');                                        // 82 letters at 40 a second: 2.05 s
    expect(state().quests.amulet).toBe('started');
    expect(r.get<Label>('HUD/Message').text).toBe('New quest: the lost amulet');

    // The door east: into the forest, standing on Spawns/FromTown.
    r.goTo(312, 88); r.step();
    expect(r.g.sceneApi.path).toBe('scenes/forest.scene');
    expect(r.get<CharacterBody2D>('Player').position).toMatchObject({ x: 32, y: 88 });

    // The amulet, then the campfire, which saves.
    r.goTo(280, 40);
    expect(state().bag.map((i: { name: string }) => i.name)).toEqual(['Amulet']);
    expect(state().quests.amulet).toBe('found');
    state().hp = 4;
    r.goTo(160, 152);
    expect(state().hp).toBe(10);
    expect(saves.list()).toEqual(['slot1']);
    expect(JSON.parse(saves.get('slot1')!)).toMatchObject({ map: 'scenes/forest.scene', arriveAt: 'Campfire', quests: { amulet: 'found' } });
    expect(r.errors).toEqual([]);

    // ── a second run: Continue ──
    r = await run(d, saves);
    expect(r.get<Button>('Menu/Box/Buttons/Continue').disabled).toBe(false);
    r.press('ArrowDown'); r.press('Enter'); r.step();
    expect(r.g.sceneApi.path).toBe('scenes/forest.scene');
    expect(r.get<CharacterBody2D>('Player').position).toMatchObject({ x: 160, y: 132 });   // the campfire's spawn point
    expect(r.g.root.find('Amulet')).toBeNull();                                             // found already: not there again
    expect(state().bag.length).toBe(1);

    // The bag (I) lists what is in state.bag; the hero cannot walk while it is open.
    r.press('KeyI');
    const rows = r.get('HUD/Bag/List').children.map((c) => (c as Label).text);
    expect(rows).toEqual(['Amulet: The ranger’s, found in the forest']);
    expect(r.get<Node & { busy: boolean }>('HUD').busy).toBe(true);
    r.press('KeyI');

    // The pause menu: Esc, the focus on Resume, down to Title screen, Enter.
    r.press('Escape');
    expect(r.get<Button>('HUD/Pause/Buttons/Resume').hasFocus).toBe(true);
    r.press('ArrowDown'); r.press('Enter'); r.step();
    expect(r.g.sceneApi.path).toBe('scenes/title.scene');

    // Continue again, back through the door to town, and the reward.
    r.press('ArrowDown'); r.press('Enter'); r.step();
    r.goTo(8, 88); r.step();
    expect(r.g.sceneApi.path).toBe('scenes/town.scene');
    expect(r.get<CharacterBody2D>('Player').position).toMatchObject({ x: 280, y: 88 });
    r.goTo(168, 90);
    r.press('KeyE'); r.step(120); r.press('KeyE');
    expect(state().quests.amulet).toBe('done');
    expect(state().gold).toBe(50);
    expect(state().bag).toEqual([]);
    expect(r.get<Label>('HUD/Status/Gold').text).toBe('Gold: 50');
    expect(r.errors).toEqual([]);
  });

  it('a map run on its own (Run this scene) starts a game, so it works', async () => {
    const d = build();
    const forest = d.project.scenes.find((s) => s.path === 'scenes/forest.scene')!;
    Object.assign(globalThis, NODE_CLASSES, { Vec2, math: MATH });   // as the game's frame does before loading scripts
    const classes = await dataUrlLoader(d.project);
    const errors: string[] = [];
    const g = new Game(d.project, forest, { frame: () => undefined }, { scriptClass: (p) => classes.get(p) as typeof Node, onError: (e) => errors.push(`${e.file}: ${e.message}`) });
    Object.assign(globalThis, scriptGlobals(g));
    g.start();
    for (let i = 0; i < 30; i++) g.step(1 / 60);
    expect(errors).toEqual([]);
    expect(g.state.hp).toBe(10);
  });
});

/** The running game's state (each run sets the state global). */
function state() { return (globalThis as unknown as { state: Record<string, any> }).state; }
