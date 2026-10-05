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
import { rng } from '../engine/random';

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

  it('the buddy learns while it plays: after three minutes near slimes it values fighting above following', async () => {
    const real = Math.random, r = rng(2026);
    Math.random = () => r.next();   // the buddy explores with Math.random: seeded here, so the test is the same every run
    try {
      const d = build();
      Object.assign(globalThis, NODE_CLASSES, { Vec2, math: MATH });
      const classes = await dataUrlLoader(d.project);
      const forest = d.project.scenes.find((s) => s.path === 'scenes/forest.scene')!;
      const errors: string[] = [];
      const g = new Game(d.project, forest, { frame: () => undefined }, { saves: memoryStore(), scriptClass: (p) => classes.get(p) as typeof Node, onError: (e) => errors.push(e.message) });
      Object.assign(globalThis, scriptGlobals(g));
      g.start();
      const st = g.state as Record<string, any>, hero = g.root.get<CharacterBody2D>('Player');
      // The hero stands in the middle of the forest and cannot be beaten, so only the buddy fights; its rating is held
      // at 950, so every slime is an ordinary one (lesson 12.6's matching is tested on its own).
      for (let f = 0; f < 60 * 180; f++) { Object.assign(st, { hp: 99, maxHp: 99, rating: 950 }); hero.position = new Vec2(150, 90); g.step(1 / 60); }
      expect(errors).toEqual([]);
      const near = st.buddy.q['slime near'];
      expect(near[1]).toBeGreaterThan(near[0]);          // fight above follow
      expect(st.buddy.beaten).toBeGreaterThan(10);
      expect(st.buddy.decisions).toBeGreaterThan(500);   // four decisions a second
    } finally { Math.random = real; }
  }, 120000);

  it('skill points buy the buddy senses, moves and focus in the skills menu (K)', async () => {
    const r = await run(build());
    r.press('Enter'); r.press('Enter'); r.step();          // a Warrior
    Object.assign(r.st(), { skillPoints: 2 });
    r.press('KeyK');
    expect(r.g.root.get<Node & { visible: boolean }>('HUD/Skills').visible).toBe(true);
    r.press('Enter');                                       // Senses has the focus: 1 → 2
    r.press('ArrowDown'); r.press('Enter');                 // Moves: 2 → 3
    expect(r.st().buddy).toMatchObject({ senses: 2, moves: 3, focus: 0 });
    expect(r.st().skillPoints).toBe(0);
    r.press('ArrowDown'); r.press('Enter');                 // Focus: no points left, so it is disabled
    expect(r.st().buddy.focus).toBe(0);
    expect(r.errors).toEqual([]);
  });

  it('the buddy copies you: taught to rest for a minute, it rests on its own; its Q-learning learned from your choices', async () => {
    const real = Math.random, r = rng(7);
    Math.random = () => r.next();
    try {
      const d = build();
      Object.assign(globalThis, NODE_CLASSES, { Vec2, math: MATH });
      const classes = await dataUrlLoader(d.project);
      const town = d.project.scenes.find((s) => s.path === 'scenes/town.scene')!;   // no slimes: the situation is "no slime"
      const errors: string[] = [];
      const g = new Game(d.project, town, { frame: () => undefined }, { saves: memoryStore(), scriptClass: (p) => classes.get(p) as typeof Node, onError: (e) => errors.push(e.message) });
      Object.assign(globalThis, scriptGlobals(g));
      g.start();
      const st = g.state as Record<string, any>;
      st.buddy.moves = 4;                                      // it can rest
      const press = (code: string) => { g.input.key(code, true); g.step(1 / 60); g.input.key(code, false); g.step(1 / 60); };
      press('KeyT'); press('Digit4');                          // teach mode, and choose rest
      // You teach it to rest while you walk away (the hero far off): each rest costs it −0.5 for straying.
      const hero = g.root.get<CharacterBody2D>('Player');
      for (let f = 0; f < 60 * 60; f++) { hero.position = new Vec2(280, 88); g.step(1 / 60); }
      expect(st.buddy.teaching).toBe(true);
      expect(st.buddy.shown['no slime'][3]).toBeGreaterThan(200);   // four decisions a second, for a minute
      expect(st.buddy.q['no slime'][3]).toBeCloseTo(-0.5, 2);       // learned from your choices: r + γ·max = −0.5 + 0.9 × 0 (follow is still 0)
      press('KeyT');                                                 // on its own again
      const buddy = g.root.get<Node & { last: { action: number } }>('Buddy');
      let rested = 0, decisions = 0, before = st.buddy.decisions;
      for (let f = 0; f < 60 * 30; f++) { hero.position = new Vec2(280, 88); g.step(1 / 60); if (st.buddy.decisions !== before) { before = st.buddy.decisions; decisions++; if (buddy.last.action === 3) rested++; } }
      expect(rested / decisions).toBeGreaterThan(0.8);               // n / (n + 10) with n over 200: it copies you, even against its own values
      expect(errors).toEqual([]);
    } finally { Math.random = real; }
  }, 120000);

  it('enemies matched to the player: clean wins raise the rating and bring harder slimes; being beaten lowers it', async () => {
    const r = await run(build());
    r.press('Enter'); r.press('Enter'); r.step();                     // a Warrior
    const tiers = r.classes.get('module:scripts/tiers.js') as { expected(a: number, b: number): number; rate(s: number, b: number): void; tierFor(r: number): { name: string } };
    expect(tiers.expected(1000, 1000)).toBe(0.5);
    expect(tiers.expected(1400, 1000)).toBeCloseTo(10 / 11, 9);       // 400 points apart: 10 to 1
    expect(r.st().rating).toBe(1000);
    expect(tiers.tierFor(1000).name).toBe('Slime');
    // Ten clean wins against ordinary slimes: each moves the rating 32 × (1 − expected).
    for (let i = 0; i < 10; i++) tiers.rate(1, 1000);
    expect(r.st().rating).toBeGreaterThan(1100);
    expect(tiers.tierFor(r.st().rating).name).toBe('Red slime');
    // In the forest, new slimes are red: 6 hit points, tinted.
    r.hero().position = { x: 312, y: 88 }; r.step(3); r.step();
    const slime = r.g.sceneApi.getNodesInGroup('enemies')[0] as Node & { hp: number; tier: { name: string } };
    expect(slime.tier.name).toBe('Red slime');
    expect(slime.hp).toBe(6);
    // Beaten: the rating falls.
    const before = r.st().rating;
    Object.assign(r.st(), { hp: 1 });
    r.hero().position = { x: (slime as unknown as { position: Vec2 }).position.x, y: (slime as unknown as { position: Vec2 }).position.y }; r.step(3); r.step();
    expect(r.st().rating).toBeLessThan(before);
    expect(r.errors).toEqual([]);
  });
});

