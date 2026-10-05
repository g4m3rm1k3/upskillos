// Game state across scenes, and save slots (engine/saves.ts).
import { describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { Game } from './game';
import { memoryStore, saveApi } from './saves';
import { Node, Node2D } from './nodes';

/** Two maps, each with a script, the first the main scene. */
function twoMaps() {
  const d = new Doc(newProject());
  d.writeScript('scripts/town.js', ''); d.writeScript('scripts/forest.js', '');
  const town = d.createScene('scenes/town.scene', 'Node2D', 'Town');
  d.setScript(town.id, d.scene(town.id).root.id, 'scripts/town.js');
  const forest = d.createScene('scenes/forest.scene', 'Node2D', 'Forest');
  d.setScript(forest.id, d.scene(forest.id).root.id, 'scripts/forest.js');
  d.setMainScene('scenes/town.scene');
  return { d, town };
}

describe('state', () => {
  it('survives scene.change: the forest sees the gold the town gave', () => {
    const seen: unknown[] = [];
    let g!: Game;
    class Town extends Node2D { ready() { g.state.gold = 10; g.state.quests = ['find the key']; } update() { g.sceneApi.change('scenes/forest.scene'); } }
    class Forest extends Node2D { ready() { seen.push(g.state.gold, [...(g.state.quests as string[])]); } }
    const { d, town } = twoMaps();
    const classes: Record<string, typeof Node> = { 'scripts/town.js': Town, 'scripts/forest.js': Forest };
    g = new Game(d.project, d.scene(town.id), { frame: () => undefined }, { scriptClass: (p) => classes[p] });
    g.start(); g.step(1 / 60);
    expect(g.sceneApi.path).toBe('scenes/forest.scene');
    expect(seen).toEqual([10, ['find the key']]);
  });

  it('a new game starts with empty state, but the slots in its store are still there', () => {
    const store = memoryStore();
    const { d, town } = twoMaps();
    const a = new Game(d.project, d.scene(town.id), { frame: () => undefined }, { saves: store, scriptClass: () => Node2D });
    a.state.level = 3; a.save.write('slot1');
    const b = new Game(d.project, d.scene(town.id), { frame: () => undefined }, { saves: store, scriptClass: () => Node2D });
    expect(b.state).toEqual({});
    expect(b.save.load('slot1')).toBe(true);
    expect(b.state).toEqual({ level: 3 });
  });
});

describe('save', () => {
  it('write keeps a copy: changing state afterwards does not change the save', () => {
    const state: Record<string, unknown> = { hp: 5, bag: ['potion'] };
    const save = saveApi(memoryStore(), state);
    save.write('slot1');
    state.hp = 1; (state.bag as string[]).push('sword');
    expect(save.read('slot1')).toEqual({ hp: 5, bag: ['potion'] });
  });

  it('load replaces everything in state, and keeps state the same object (scripts hold on to it)', () => {
    const state: Record<string, unknown> = { hp: 5 };
    const save = saveApi(memoryStore({ main: JSON.stringify({ gold: 7 }) }), state);
    const before = state;
    expect(save.load()).toBe(true);
    expect(state).toEqual({ gold: 7 });
    expect(state).toBe(before);
  });

  it('an empty slot: load is false and leaves state alone; read is null; has is false', () => {
    const state: Record<string, unknown> = { hp: 5 };
    const save = saveApi(memoryStore(), state);
    expect(save.load('nothing')).toBe(false);
    expect(state).toEqual({ hp: 5 });
    expect(save.read('nothing')).toBeNull();
    expect(save.has('nothing')).toBe(false);
  });

  it('any data can go in a slot, slots are listed in order, and remove empties one', () => {
    const save = saveApi(memoryStore(), {});
    save.write('settings', { volume: 0.5 });
    save.write('best', 1234);
    expect(save.read('best')).toBe(1234);
    expect(save.slots()).toEqual(['best', 'settings']);
    save.remove('best');
    expect(save.slots()).toEqual(['settings']);
  });

  it('tells the store’s listener about every change, so the editor can keep the slots', () => {
    const changes: [string, string | null][] = [];
    const save = saveApi(memoryStore({}, (slot, json) => changes.push([slot, json])), { a: 1 });
    save.write('s'); save.remove('s'); save.remove('s');
    expect(changes).toEqual([['s', '{"a":1}'], ['s', null]]);
  });

  it('says clearly what went wrong', () => {
    const loop: Record<string, unknown> = {}; loop.self = loop;
    const save = saveApi(memoryStore({ list: '[1,2]' }), {});
    expect(() => save.write('x', loop)).toThrow(/cannot be saved[\s\S]*not nodes/);
    expect(() => save.write('x', undefined as unknown as object)).not.toThrow();   // undefined means "state"
    expect(() => save.write('x', () => 1)).toThrow(/nothing to save/);
    expect(() => save.write('' as string)).toThrow(/named by a string/);
    expect(() => save.load('list')).toThrow(/a list, not an object.*save.read/);
  });
});
