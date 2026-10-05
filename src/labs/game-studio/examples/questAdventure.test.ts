// Quest Buddies: Adventure (examples/questAdventure.ts), played headless by its own scripts: choosing a class, a
// fight with a slime, levelling up, the bag's buttons, being beaten, and the loot table's odds.
import { afterAll, describe, expect, it } from 'vitest';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { problems } from '../core/serialize';
import { Game, MATH, scriptGlobals } from '../engine/game';
import { memoryStore } from '../engine/saves';
import { NODE_CLASSES, type CharacterBody2D, type Node } from '../engine/nodes';
import { Vec2 } from '../engine/vec2';
import { dataUrlLoader } from '../ml/testLoader';
import { questAdventure } from './questAdventure';

afterAll(() => { for (const k of ['input', 'scene', 'time', 'state', 'save', 'tween', 'debug', 'math', 'physics', 'ai', 'Vec2', 'PhysicsBody2D', ...Object.keys(NODE_CLASSES)]) delete (globalThis as Record<string, unknown>)[k]; });

function build(): Doc {
  const d = new Doc(newProject(questAdventure.title));
  for (const path of questAdventure.images) d.importAsset(path, { mime: 'image/png', width: path.includes('tilemap') ? 192 : 16, height: path.includes('tilemap') ? 176 : 16 });
  d.runCode('Build', questAdventure.code);
  return d;
}

async function run(d: Doc) {
  Object.assign(globalThis, NODE_CLASSES, { Vec2, math: MATH });
  const classes = await dataUrlLoader(d.project);
  const errors: string[] = [];
  const title = d.project.scenes.find((s) => s.path === d.project.settings.mainScene)!;
  const g = new Game(d.project, title, { frame: () => undefined }, { saves: memoryStore(), scriptClass: (p) => classes.get(p) as typeof Node, onError: (e) => errors.push(`${e.file}: ${e.message}`) });
  Object.assign(globalThis, scriptGlobals(g));
  g.start();
  const step = (n = 1) => { for (let i = 0; i < n; i++) g.step(1 / 60); };
  const press = (code: string) => { g.input.key(code, true); step(); g.input.key(code, false); step(); };
  const hero = () => g.root.get<CharacterBody2D & { gainXp(n: number): void; hurt(n: number): void }>('Player');
  return { g, errors, step, press, hero, classes, st: () => g.state as Record<string, any> };
}

describe('Quest Buddies: Adventure', () => {
  it('builds with no problems', () => { expect(problems(build().project)).toEqual([]); });

  it('a class from the title\'s buttons; a slime beaten with J; experience, a level, the bag, and being beaten', async () => {
    const r = await run(build());
    // New game, then the class menu: three buttons made from CLASSES, the first (Warrior) focused.
    r.press('Enter');
    expect(r.g.root.get('Menu/Classes/List').children.map((c) => c.name)).toEqual(['Warrior', 'Ranger', 'Mage']);
    r.press('ArrowDown'); r.press('Enter'); r.step();
    expect(r.g.sceneApi.path).toBe('scenes/town.scene');
    expect(r.st()).toMatchObject({ className: 'Ranger', hp: 10, maxHp: 10, attack: 2, speed: 78, level: 1 });

    // To the forest; a fixed loot seed, so the drop is known.
    r.hero().position = { x: 312, y: 88 }; r.step(3); r.step();
    expect(r.g.sceneApi.path).toBe('scenes/forest.scene');
    r.st().lootSeed = 42;
    const slimes = () => r.g.sceneApi.getNodesInGroup('enemies');
    expect(slimes().length).toBe(3);
    // Next to the first slime, facing it (walk right for a moment), and attack until it is beaten (2 attack: 2 hits).
    const target = slimes()[0] as Node & { hp: number; position: Vec2 };
    r.hero().position = { x: target.position.x - 12, y: target.position.y };
    r.g.input.key('ArrowRight', true); r.step(2); r.g.input.key('ArrowRight', false);
    for (let i = 0; i < 6 && !target.isInGroup('gone') && slimes().includes(target as never); i++) { r.press('KeyJ'); r.step(24); r.hero().position = { x: target.position.x - 12, y: target.position.y }; }
    expect(slimes().includes(target as never)).toBe(false);
    expect(r.st().xp).toBe(4);
    expect(r.st().lootSeed).not.toBe(42);   // the loot table was rolled

    // Enough experience for a level: a Ranger gains 2 hit points, 1 attack and a skill point.
    r.hero().gainXp(6);
    expect(r.st()).toMatchObject({ level: 2, xp: 0, maxHp: 12, hp: 12, attack: 3, skillPoints: 1 });

    // The bag: a potion and a weapon, as buttons. Enter drinks the potion (the first, focused); then equips the weapon.
    Object.assign(r.st(), { hp: 4, bag: [{ kind: 'potion', name: 'Potion', note: 'heals 5' }, { kind: 'weapon', name: 'Sword of Might', bonus: 4, note: '+4 attack' }] });
    r.press('KeyI');
    r.press('Enter'); r.step();
    expect(r.st().hp).toBe(9);
    r.press('Enter'); r.step();
    expect(r.st().weapon).toMatchObject({ name: 'Sword of Might', bonus: 4 });
    expect(r.st().bag).toEqual([]);
    r.press('KeyI');

    // Beaten: at 1 hit point, a slime's touch sends the hero to the campfire with full hit points and half the gold.
    Object.assign(r.st(), { hp: 1, gold: 9 });
    const other = slimes()[0] as Node & { position: Vec2 };
    r.hero().position = { x: other.position.x, y: other.position.y }; r.step(3); r.step();
    expect(r.st()).toMatchObject({ hp: 12, gold: 4, arriveAt: 'Campfire' });
    r.step();
    expect(r.hero().position).toMatchObject({ x: 160, y: 132 });
    expect(r.errors).toEqual([]);
  });

  it('the loot table\'s odds: 10,000 rolls come out near its weights, and the same seed gives the same drops', async () => {
    const r = await run(build());
    const loot = r.classes.get('module:scripts/loot.js') as { rollLoot(): { kind: string; bonus?: number } | null };
    Object.assign(r.st(), { lootSeed: 7 });
    const counts: Record<string, number> = { nothing: 0, gold: 0, potion: 0, weapon: 0 };
    let best = 0;
    for (let i = 0; i < 10000; i++) { const item = loot.rollLoot(); counts[item?.kind ?? 'nothing']++; best = Math.max(best, item?.bonus ?? 0); }
    expect(counts.nothing / 10000).toBeCloseTo(0.4, 1);
    expect(counts.gold / 10000).toBeCloseTo(0.3, 1);
    expect(counts.potion / 10000).toBeCloseTo(0.2, 1);
    expect(counts.weapon / 10000).toBeCloseTo(0.1, 1);
    expect(best).toBe(6);   // a Sword of the Hero: 3 + 3, rare but there in 10,000
    const drops = (seed: number) => { r.st().lootSeed = seed; return JSON.stringify([...Array(20)].map(() => loot.rollLoot())); };
    expect(drops(99)).toBe(drops(99));
  });
});
