// Chapter 12 of the course, "Quest Buddies: Adventure": classes and levels, loot, and combat, added to the finished
// chapter 11 game (docs/game-studio-starters-plan.md). As in chapter 11, each task starts where the one before ends,
// and each step has code of its own (qaStep) that the tests and the step pictures use.

import type { GameTask, PlayOptions } from './types';
import type { Game } from '../engine/game';
import { named, noErrors, type Pos } from './helpers';
import { rng } from '../engine/random';
import { questBuddies } from '../examples/questBuddies';
import { BUDDY_CODE, BUDDY_START, CLASSES_CODE, COMBAT_CODE, COMBAT_START, COPY_CODE, COPY_START, LOOT_CODE, MATCH_CODE, QA_SCRIPTS, questAdventure } from '../examples/questAdventure';

type G = Game & { state: Record<string, any> };
type Mod = Record<string, any>;
const IMAGES = questAdventure.images;
const block = (c: string) => `{\n${c}\n}`;
const START_CLASSES = questBuddies.code;
const START_LOOT = `${questBuddies.code}\n${block(CLASSES_CODE)}`;
const START_COMBAT = `${START_LOOT}\n${block(LOOT_CODE)}\n${block(COMBAT_START)}`;
const START_BUDDY = `${START_COMBAT}\n${block(COMBAT_CODE)}\n${block(BUDDY_START)}`;
const START_COPY = `${START_BUDDY}\n${block(BUDDY_CODE)}\n${block(COPY_START)}`;
const START_MATCH = `${START_COPY}\n${block(COPY_CODE)}`;

/** A watch that presses keys at frames: [frame, code], each held for two frames. */
function presses(list: [number, string][]): (g: Game) => void {
  let f = 0;
  return (g) => { f++; for (const [at, code] of list) { if (f === at) g.input.key(code, true); if (f === at + 2) g.input.key(code, false); } };
}
const both = (...ws: ((g: Game) => void)[]) => (g: Game) => { for (const w of ws) w(g); };
/** Start a new game of a class (with the game's own newGame) on a map. */
const startAs = (game: Mod, className: string | undefined, map: string): PlayOptions['setup'] => (g) => { game.newGame(className); g.sceneApi.change(map); };
const hero = (g: Game) => named<{ position: Pos; gainXp?: (n: number) => void }>(g, 'Player');

// ── step code: as a learner might write each step ───────────────────────

// A loot table before affixes: weapons have only their own bonus.
const LOOT_PLAIN = QA_SCRIPTS.loot.replace("export const AFFIXES = [['', 0, 70], [' of Might', 1, 22], [' of the Hero', 3, 8]];      // name part, extra bonus, weight",
  "export const AFFIXES = [['', 0, 100]];      // no affixes yet: every weapon is plain");
// A slime that can be hurt and beaten, but does not move yet.
const SLIME_STILL = QA_SCRIPTS.slime.replace(/\n  physicsUpdate\(dt\) \{[\s\S]*?\n  \}\n\n  hurt/, '\n  hurt');

// The buddy at 12.4, step 1: it only follows.
const BUDDY_FOLLOWS = `// The buddy: for now it follows the hero, stopping a little way off.
export default class Buddy extends CharacterBody2D {
  speed = 64;

  physicsUpdate(dt) {
    const hero = scene.find('Player');
    if (!hero || scene.get('HUD').busy) { this.velocity = { x: 0, y: 0 }; return; }
    const gap = hero.position.sub(this.position);
    this.velocity = gap.length() > 24 ? gap.normalized().scale(this.speed) : { x: 0, y: 0 };
    this.moveAndSlide();
  }
}
`;
// Step 2: it sees and chooses, but does not learn yet (no Q update).
const BUDDY_CHOOSES = QA_SCRIPTS.buddy.replace(/\n    if \(this\.last\) \{\n[\s\S]*?\n    \}\n/, '\n');
// 12.5, step 1: teach mode and counting, but on its own it does not copy yet.
const BUDDY_TAUGHT = QA_SCRIPTS.buddyCopies.replace(`    const shown = (this.mind.shown[key] ?? []).slice(0, this.mind.moves), n = shown.reduce((t, c) => t + c, 0);
    if (n > 0 && Math.random() < n / (n + 10)) return shown.indexOf(Math.max(...shown));
`, '');
// 12.6, step 2: slimes take their kind, but fights are not rated yet.
const SLIME_KINDS = QA_SCRIPTS.slimeMatched.replace(`
    rate(this.dealt === 0 ? 1 : this.dealt < 3 ? 0.75 : 0.5, this.tier.rating);   // a clean win counts for most`, '');

const QA_STEPS: Record<string, string[]> = {
  'qa-classes': [
    `project.writeScript('scripts/classes.js', ${JSON.stringify(QA_SCRIPTS.classes)})`,
    `project.writeScript('scripts/game.js', ${JSON.stringify(QA_SCRIPTS.game)})
project.writeScript('scripts/player.js', ${JSON.stringify(QA_SCRIPTS.playerLevels)})`,
    `project.writeScript('scripts/title.js', ${JSON.stringify(QA_SCRIPTS.title)})
const titleScene = project.scene('scenes/title.scene')
titleScene.add('Panel', { name: 'Classes', parent: 'Menu', position: { x: 240, y: 90 }, size: { x: 480, y: 280 } })
titleScene.add('Label', { name: 'Choose', parent: 'Menu/Classes', position: { x: 30, y: 20 }, fontSize: 28, color: '#ffd43b', text: 'Choose your class' })
titleScene.add('VBoxContainer', { name: 'List', parent: 'Menu/Classes', position: { x: 30, y: 80 }, separation: 12 })`,
    `project.writeScript('scripts/hud.js', ${JSON.stringify(QA_SCRIPTS.hudLevels)})
project.writeSound('assets/sounds/levelup.wav', { wave: 'triangle', from: 523, to: 1046, length: 0.5, attack: 0.02, volume: 0.45 })
const hudScene = project.scene('scenes/hud.scene')
hudScene.add('AudioStreamPlayer', { name: 'LevelUp', parent: 'Sounds', stream: 'assets/sounds/levelup.wav' })
hudScene.get('Status').size = { x: 260, y: 100 }
hudScene.add('Label', { name: 'Level', parent: 'Status', position: { x: 12, y: 64 }, fontSize: 16, color: '#c5f6fa', text: 'Level 1' })
hudScene.add('ProgressBar', { name: 'Xp', parent: 'Status', position: { x: 12, y: 86 }, size: { x: 200, y: 6 }, value: 0, maxValue: 10, fillColor: '#4dabf7' })`,
  ],
  'qa-loot': [
    `project.writeScript('scripts/loot.js', ${JSON.stringify(LOOT_PLAIN)})`,
    `project.writeScript('scripts/loot.js', ${JSON.stringify(QA_SCRIPTS.loot)})`,
    `project.writeScript('scripts/hud.js', ${JSON.stringify(QA_SCRIPTS.hud)})`,
  ],
  'qa-combat': [
    `project.writeScript('scripts/slime.js', ${JSON.stringify(SLIME_STILL)})
project.scene('scenes/slime.scene').root.script = 'scripts/slime.js'`,
    `project.writeScript('scripts/player.js', ${JSON.stringify(QA_SCRIPTS.player)})`,
    `project.writeScript('scripts/slime.js', ${JSON.stringify(QA_SCRIPTS.slime)})`,
  ],
  'qa-buddy': [
    `project.writeScript('scripts/buddy.js', ${JSON.stringify(BUDDY_FOLLOWS)})
project.scene('scenes/buddy.scene').root.script = 'scripts/buddy.js'`,
    `project.writeScript('scripts/buddy.js', ${JSON.stringify(BUDDY_CHOOSES)})`,
    `project.writeScript('scripts/buddy.js', ${JSON.stringify(QA_SCRIPTS.buddy)})`,
    `project.writeScript('scripts/hud.js', ${JSON.stringify(QA_SCRIPTS.hudSkills)})`,
  ],
  'qa-copy': [
    `project.writeScript('scripts/buddy.js', ${JSON.stringify(BUDDY_TAUGHT)})`,
    `project.writeScript('scripts/buddy.js', ${JSON.stringify(QA_SCRIPTS.buddyCopies)})`,
    '',
  ],
  'qa-match': [
    `project.writeScript('scripts/tiers.js', ${JSON.stringify(QA_SCRIPTS.tiers)})
project.writeScript('scripts/game.js', ${JSON.stringify(QA_SCRIPTS.gameMatched)})`,
    `project.writeScript('scripts/slime.js', ${JSON.stringify(SLIME_KINDS)})`,
    `project.writeScript('scripts/slime.js', ${JSON.stringify(QA_SCRIPTS.slimeMatched)})
project.writeScript('scripts/player.js', ${JSON.stringify(QA_SCRIPTS.playerMatched)})
project.writeScript('scripts/spawner.js', ${JSON.stringify(QA_SCRIPTS.spawnerMatched)})`,
  ],
};

/** Steps 1 to k + 1 of a chapter 12 task as one piece of code, each step in its own block. */
export function qaStepCode(taskId: string, k: number): string {
  return (QA_STEPS[taskId] ?? []).slice(0, k + 1).filter(Boolean).map(block).join('\n');
}
/** Step k + 1 of a chapter 12 task on its own (the step pictures do the steps one after another). */
export const qaStep = (taskId: string, k: number): string => QA_STEPS[taskId]?.[k] ?? '';

// ── checks ──────────────────────────────────────────────────────────────

/** Roll the game's own loot table n times, from a seed, inside a running game (rollLoot uses state and math). */
async function rolls(v: Parameters<Extract<GameTask['steps'][0]['check'], { kind: 'play' }>['test']>[0], n: number, seed: number) {
  const loot = (await v.module('scripts/loot.js')) as Mod;
  if (typeof loot.rollLoot !== 'function') throw new Error('scripts/loot.js does not export a function rollLoot() yet.');
  let out: ({ kind: string; name?: string; bonus?: number; amount?: number; note?: string } | null)[] = [];
  const r = await v.play({ seconds: 0.02, setup: (g) => { (g as G).state.lootSeed = seed; out = [...Array(n)].map(() => loot.rollLoot()); } });
  noErrors(r);
  return out;
}

export const QUEST_ADVENTURE: GameTask[] = [
  {
    id: 'qa-classes',
    chain: 'Quest Buddies: Adventure',
    title: 'Classes, stats and levels',
    goal: 'Classes as a table of data, a new game made from the class chosen on a menu, and levels that need more experience each time.',
    images: IMAGES,
    start: START_CLASSES,
    steps: [
      { text: 'Make scripts/classes.js: export const CLASSES, a table of at least three classes, each { picture, hp, attack, speed, hpPerLevel, attackPerLevel, about } (pictures: tiles 96, 98 and 84). Also export function xpToNext(level): Math.round(10 * Math.pow(1.5, level - 1)).',
        check: { kind: 'play', test: async (v) => {
          const c = (await v.module('scripts/classes.js')) as Mod;
          const rows = Object.entries((c.CLASSES ?? {}) as Record<string, Record<string, unknown>>);
          if (rows.length < 3) return `CLASSES has ${rows.length} classes: make at least three.`;
          for (const [name, row] of rows) for (const k of ['hp', 'attack', 'speed', 'hpPerLevel', 'attackPerLevel']) if (typeof row[k] !== 'number') return `${name} has no number ${k}.`;
          if (typeof c.xpToNext !== 'function') return 'classes.js does not export xpToNext(level) yet.';
          const got = [1, 2, 3, 4].map((l) => c.xpToNext(l));
          return JSON.stringify(got) === '[10,15,23,34]' || `xpToNext(1 to 4) gives ${got.join(', ')}: it should be 10, 15, 23, 34.`;
        } } },
      { text: 'newGame(className) in game.js fills state from the class: hp and maxHp, attack and speed from its row; level 1, xp 0, skillPoints 0. In player.js, the hero moves at state.speed and shows its class’s picture (this.get(\'Sprite\').texture in ready()).',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod, c = (await v.module('scripts/classes.js')) as Mod;
          const name = Object.keys(c.CLASSES ?? {})[2];
          if (!name) return 'Do step 1 first: CLASSES needs three classes.';
          const r = await v.play({ seconds: 0.2, setup: startAs(game, name, 'scenes/town.scene') });
          noErrors(r);
          const st = (r.game as G).state, row = c.CLASSES[name];
          for (const k of ['hp', 'attack', 'speed']) if (st[k === 'hp' ? 'maxHp' : k] !== row[k]) return `newGame('${name}') gives ${k === 'hp' ? 'maxHp' : k} ${st[k === 'hp' ? 'maxHp' : k]}: the ${name} row says ${row[k]}.`;
          if (st.level !== 1 || st.xp !== 0 || st.skillPoints !== 0) return 'A new game should start at level 1, with 0 xp and 0 skill points.';
          const sprite = r.game.root.find('Player/Sprite') as unknown as { texture: string } | null;
          return sprite?.texture === row.picture || `The hero shows ${sprite?.texture}: it should show the ${name}’s picture.`;
        } } },
      { text: 'A class menu: on the title screen add a Panel Classes (under Menu) with a VBoxContainer List. In title.js, New game shows it instead of starting; ready() makes a Button for each row of CLASSES, whose pressed starts a new game as that class. Give the first one the focus.',
        check: { kind: 'play', test: async (v) => {
          const c = (await v.module('scripts/classes.js')) as Mod;
          const second = Object.keys(c.CLASSES ?? {})[1];
          const r = await v.play({ seconds: 0.6, watch: presses([[3, 'Enter'], [10, 'ArrowDown'], [16, 'Enter']]) });
          noErrors(r);
          const st = (r.game as G).state;
          if (r.game.sceneApi.path !== 'scenes/town.scene') return 'Enter (New game), ↓, Enter should choose the second class and start in the town.';
          return st.className === second || `That chose ${st.className}: ↓ from the first class should choose ${second}.`;
        } } },
      { text: 'Levels: player.js gets gainXp(amount): add to state.xp; while it is at least xpToNext(state.level), take that off, add a level, raise maxHp and attack by the class’s per-level amounts, heal fully, and add a skill point. In hud.scene, show it: a Label Level and a thin ProgressBar Xp in Status, set every frame.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod, c = (await v.module('scripts/classes.js')) as Mod;
          const name = Object.keys(c.CLASSES ?? {})[0], row = c.CLASSES?.[name];
          let gave = false;
          const r = await v.play({ seconds: 0.3, setup: startAs(game, name, 'scenes/town.scene'), watch: (g) => { const h = hero(g); if (!gave && h?.gainXp && g.sceneApi.path === 'scenes/town.scene') { gave = true; h.gainXp(26); } } });
          noErrors(r);
          if (!gave) return 'The hero has no gainXp(amount) method yet.';
          const st = (r.game as G).state;
          if (st.level !== 3 || st.xp !== 1) return `26 experience from level 1 should reach level 3 with 1 left over (10 + 15 = 25): it reached level ${st.level} with ${st.xp}.`;
          if (st.maxHp !== row.hp + 2 * row.hpPerLevel || st.skillPoints !== 2) return `Two levels should add ${2 * row.hpPerLevel} max hit points and 2 skill points: maxHp is ${st.maxHp}, skill points ${st.skillPoints}.`;
          const level = r.game.root.find('HUD/Status/Level') as unknown as { text: string } | null;
          return (!!level && /3/.test(level.text) && !!r.game.root.find('HUD/Status/Xp')) || 'The HUD should show the level (HUD/Status/Level, a Label) and an experience bar (HUD/Status/Xp).';
        } } },
    ],
    solution: CLASSES_CODE,
    done: 'Classes from a table, and levels. Back in the lesson: stats as data, and why experience needed grows each level.',
  },
  {
    id: 'qa-loot',
    chain: 'Quest Buddies: Adventure',
    title: 'Items and loot',
    goal: 'A loot table rolled with a seeded random generator, weapons with generated name parts, and a bag whose items you can use.',
    images: IMAGES,
    start: START_LOOT,
    steps: [
      { text: 'Make scripts/loot.js: a TABLE of [kind, weight] (nothing 40, gold 30, potion 20, weapon 10) and export function rollLoot(): make const r = math.rng(state.lootSeed), pick a kind with r.weighted(TABLE), make the item (gold: { kind: \'gold\', amount: r.int(2, 6) }; potion; weapon: from a WEAPONS table with a bonus), then save state.lootSeed = r.state and return it (null for nothing).',
        hint: 'Saving r.state back into state.lootSeed is what makes the next roll different, and a saved game carry on the same sequence.',
        check: { kind: 'play', test: async (v) => {
          const a = await rolls(v, 2000, 5), b = await rolls(v, 50, 5);
          if (JSON.stringify(a.slice(0, 50)) !== JSON.stringify(b)) return 'The same lootSeed should give the same drops: use math.rng(state.lootSeed), and save state.lootSeed = r.state after.';
          const share = (k: string) => a.filter((x) => (x?.kind ?? 'nothing') === k).length / a.length;
          const want: [string, number][] = [['nothing', 0.4], ['gold', 0.3], ['potion', 0.2], ['weapon', 0.1]];
          const off = want.find(([k, w]) => Math.abs(share(k) - w) > 0.04);
          if (off) return `Over 2000 rolls, ${off[0]} came ${Math.round(share(off[0]) * 100)}% of the time: the table says ${off[1] * 100}%.`;
          return a.every((x) => !x || x.kind !== 'weapon' || typeof x.bonus === 'number') || 'Every weapon needs a number bonus.';
        } } },
      { text: 'Affixes: an AFFIXES table of [name part, extra bonus, weight], such as [\'\', 0, 70], [\' of Might\', 1, 22], [\' of the Hero\', 3, 8]. A weapon’s name is its own plus the affix’s, and its bonus is both added up.',
        check: { kind: 'play', test: async (v) => {
          const a = (await rolls(v, 4000, 11)).filter((x) => x?.kind === 'weapon');
          const named = a.filter((x) => / of /.test(x!.name ?? ''));
          if (!named.length) return 'No weapon in 4000 rolls has an affix (a name part like " of Might").';
          return named.some((x) => (x!.bonus ?? 0) > 3) || 'An affix should add its extra bonus to the weapon’s own.';
        } } },
      { text: 'A bag you can use: in hud.js, make each item in state.bag that has a kind a Button (not a Label). Pressed: a potion heals 5 (up to maxHp) and is gone; a weapon becomes state.weapon (the one equipped goes back in the bag). Rebuild the list after, and give its first button the focus so Enter works.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          let set = false;
          const r = await v.play({ seconds: 0.7, setup: startAs(game, undefined, 'scenes/town.scene'),
            watch: both((g) => { const st = (g as G).state; if (!set && g.sceneApi.path === 'scenes/town.scene') { set = true; Object.assign(st, { hp: 3, maxHp: 10, bag: [{ kind: 'potion', name: 'Potion', note: 'heals 5' }, { kind: 'weapon', name: 'Sword', bonus: 3, note: '+3 attack' }] }); } }, presses([[6, 'KeyI'], [12, 'Enter'], [20, 'Enter']])) });
          noErrors(r);
          const st = (r.game as G).state;
          if (st.hp !== 8) return `Enter on the potion should heal 5: hit points are ${st.hp} (from 3).`;
          return st.weapon?.name === 'Sword' || 'Enter on the weapon (now the first row) should equip it as state.weapon.';
        } } },
    ],
    solution: LOOT_CODE,
    done: 'A loot table and a bag that works. Back in the lesson: weighted choice, seeds, and generated items.',
  },
  {
    id: 'qa-combat',
    chain: 'Quest Buddies: Adventure',
    title: 'Combat',
    goal: 'Slimes you can hit, that flash, are knocked back, drop loot and give experience; an attack with a reach and a cooldown; slimes that chase and hurt.',
    images: IMAGES,
    start: START_COMBAT,
    steps: [
      { text: 'Give the slime scene a script, scripts/slime.js, with hp = 4 and hurt(damage, from): take damage off hp, flash (sprite.modulate red, then tween it back to white), knock it back away from from, burst its Puff particles; at 0 hp, die(): give the hero 4 experience (gainXp), roll the loot (rollLoot) and put it in the bag or the gold, and queueFree().',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          let hit = false;
          const r = await v.play({ seconds: 0.4, setup: startAs(game, undefined, 'scenes/forest.scene'), watch: (g) => { if (hit || g.sceneApi.path !== 'scenes/forest.scene') return; const s = g.sceneApi.getNodesInGroup('enemies')[0] as unknown as { hurt?: (d: number, f: Pos) => void } | undefined; if (s?.hurt) { hit = true; (g as G).state.lootSeed = 3; s.hurt(4, { x: 0, y: 0 }); } } });
          noErrors(r);
          if (!hit) return 'The slimes have no hurt(damage, from) method yet.';
          const st = (r.game as G).state;
          if (r.game.sceneApi.getNodesInGroup('enemies').length !== 2) return '4 damage should beat a slime (hp 4): it should be gone.';
          if (st.xp !== 4) return `Beating a slime should give 4 experience: state.xp is ${st.xp}.`;
          return st.lootSeed !== 3 || 'Beating a slime should roll the loot table (rollLoot).';
        } } },
      { text: 'The hero’s attack: remember which way it last walked (facing). When attack (J) is pressed and the cooldown (0.4 s) is over, every enemy within 16 pixels of a point 14 pixels ahead is hurt for state.attack plus the weapon’s bonus.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          let placed = false;
          const r = await v.play({ seconds: 1.4, setup: startAs(game, 'Warrior', 'scenes/forest.scene'),
            // Each time before J, the hero steps up to the slime (a hit knocks it back out of reach), facing it.
            watch: both((g) => { if (g.sceneApi.path !== 'scenes/forest.scene') return; const s = g.sceneApi.getNodesInGroup('enemies')[0] as unknown as { position: Pos; speed: number } | undefined; if (!s) return; if (!placed) { placed = true; s.speed = 0; } if ([6, 38, 70].includes(g.time.frame)) hero(g)!.position = { x: s.position.x - 13, y: s.position.y }; }, presses([[3, 'ArrowRight'], [8, 'KeyJ'], [40, 'KeyJ'], [72, 'KeyJ']])) });
          noErrors(r);
          return r.game.sceneApi.getNodesInGroup('enemies').length === 2 || 'Facing a slime and pressing J a few times should beat it: it is still there.';
        } } },
      { text: 'Slimes that fight back: in physicsUpdate, a slime within sight (90 pixels) moves towards the hero along scene.get(\'Walls\').findPath (found again twice a second), and when it is within 12 pixels it hurts the hero: hurt(1, from) takes a hit point, flashes, knocks the hero back, and keeps it safe for 0.8 s.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          let placed = false, moved = 0, from: Pos | null = null;
          const r = await v.play({ seconds: 2.5, setup: startAs(game, 'Warrior', 'scenes/forest.scene'),
            watch: (g) => { if (g.sceneApi.path !== 'scenes/forest.scene') return; const s = g.sceneApi.getNodesInGroup('enemies')[0] as unknown as { position: Pos }; if (!placed) { placed = true; hero(g)!.position = { x: s.position.x - 50, y: s.position.y }; from = { ...s.position }; } else if (from) moved = Math.max(moved, Math.abs(s.position.x - from.x)); } });
          noErrors(r);
          if (moved < 10) return 'A slime 50 pixels from the hero should come towards it.';
          const st = (r.game as G).state;
          return st.hp < st.maxHp || 'A slime that reaches the hero should hurt it.';
        } } },
    ],
    solution: COMBAT_CODE,
    done: 'A fight. Back in the lesson: damage formulas, cooldowns, hit feedback, and enemies that find their way.',
  },
  {
    id: 'qa-buddy',
    chain: 'Quest Buddies: Adventure',
    title: 'A buddy that learns',
    goal: 'A buddy who follows you, sees its situation, chooses moves, learns from what happens by Q-learning, and gets better with your skill points.',
    images: IMAGES,
    start: START_BUDDY,
    steps: [
      { text: 'Give scenes/buddy.scene a script, scripts/buddy.js: a CharacterBody2D that, in physicsUpdate, walks towards the hero at 64 pixels a second and stops 24 pixels away.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          let start = 0;
          const r = await v.play({ seconds: 1.5, setup: startAs(game, undefined, 'scenes/town.scene'), watch: (g) => { const b = g.root.find('Buddy') as unknown as { position: Pos } | null, h = hero(g); if (!b || !h) return; if (!start) { h.position = { x: 250, y: 96 }; b.position = { x: 60, y: 96 }; start = 190; } } });
          noErrors(r);
          const b = r.game.root.find('Buddy') as unknown as { position: Pos } | null, h = hero(r.game)!;
          if (!b) return 'There is no Buddy in the town.';
          const gap = Math.hypot(h.position.x - b.position.x, h.position.y - b.position.y);
          return gap < 120 || `After 1.5 s the buddy is still ${Math.round(gap)} pixels from the hero (it started 190 away).`;
        } } },
      { text: 'Senses and choices: state.buddy = { q: {}, senses: 1, moves: 2, focus: 0, decisions: 0 } (made in ready if missing). see() names the situation (\'slime near\' or \'no slime\'; more words with more senses); values(key) is that state’s row in state.buddy.q; every 0.25 s decide() picks a move ε-greedily (ε = 0.3 × 0.5^focus) from MOVES = [\'follow\', \'fight\', \'guard\', \'rest\'], and physicsUpdate does it.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          const r = await v.play({ seconds: 2, setup: startAs(game, undefined, 'scenes/forest.scene') });
          noErrors(r);
          const b = (r.game as G).state.buddy;
          if (!b) return 'state.buddy is not there: make it in the buddy’s ready().';
          if (!(b.decisions >= 4)) return `In 2 seconds the buddy decided ${b.decisions ?? 0} times: it should decide every 0.25 s.`;
          return Object.keys(b.q ?? {}).some((k) => /slime/.test(k)) || 'state.buddy.q has no situation named yet: decide() should look up values(see()).';
        } } },
      { text: 'Learning: in decide(), before choosing, move the last decision’s value towards what it earned plus the best value now: Q(s, a) ← Q(s, a) + 0.2 (r + 0.9 max Q(s′, ·) − Q(s, a)). Earned: +1 a hit, +3 a slime beaten, −1 hurt, −0.5 a decision far from the hero.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          // Learning has luck in it (ε's random moves, the slimes): Math.random is seeded for this check, so the same
          // buddy.js always gets the same result.
          const real = Math.random, seededRandom = rng(2026);
          Math.random = () => seededRandom.next();
          let r: Awaited<ReturnType<typeof v.play>>;
          try { r = await v.play({ seconds: 240, fps: 30, setup: startAs(game, 'Warrior', 'scenes/forest.scene'), watch: (g) => { const st = (g as G).state; Object.assign(st, { hp: 99, maxHp: 99, rating: 950 }); const h = hero(g); if (h) h.position = { x: 150, y: 90 }; } }); }
          finally { Math.random = real; }
          noErrors(r);
          const b = (r.game as G).state.buddy, near = b?.q?.['slime near'];
          if (!near || near.every((x: number) => x === 0)) return 'After four minutes beside slimes, the values for "slime near" have not moved: is the Q update in decide()?';
          return near[1] > near[0] || `After four minutes, fighting a near slime is worth ${near[1].toFixed(2)} and following ${near[0].toFixed(2)}: check the rewards for hits and slimes beaten.`;
        } } },
      { text: 'Skill points: in hud.js, K (the skills action) shows and hides the Skills panel; its three buttons spend a point on senses (up to 3), moves (up to 4) or focus (up to 3), and are disabled with no points or at the top.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          let set = false;
          const r = await v.play({ seconds: 0.8, setup: startAs(game, undefined, 'scenes/town.scene'), watch: both((g) => { if (!set && (g as G).state.buddy) { set = true; (g as G).state.skillPoints = 2; } }, presses([[8, 'KeyK'], [14, 'Enter'], [20, 'ArrowDown'], [26, 'Enter']])) });
          noErrors(r);
          const st = (r.game as G).state;
          if (!(r.game.root.find('HUD/Skills') as unknown as { visible: boolean } | null)?.visible) return 'K should show the Skills panel.';
          return (st.buddy.senses === 2 && st.buddy.moves === 3 && st.skillPoints === 0) || `Enter on Senses, then ↓ and Enter on Moves, should spend both points: senses ${st.buddy.senses}, moves ${st.buddy.moves}, points left ${st.skillPoints}.`;
        } } },
    ],
    solution: BUDDY_CODE,
    done: 'A buddy that learns while you play. Back in the lesson: states, moves, rewards and ε, in a real game.',
  },
  {
    id: 'qa-copy',
    chain: 'Quest Buddies: Adventure',
    title: 'A buddy that copies you',
    goal: 'Teach your buddy by choosing its moves; it copies what you showed it, and its Q-learning learns from your choices too.',
    images: IMAGES,
    start: START_COPY,
    steps: [
      { text: 'Teach mode: T (the teach action) flips state.buddy.teaching; keys 1 to 4 (buddy_1 to buddy_4) choose its move. While teaching, decide() does your move instead of its own, and counts it: state.buddy.shown[situation][move] += 1.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          const r = await v.play({ seconds: 10, setup: startAs(game, undefined, 'scenes/town.scene'), watch: presses([[6, 'KeyT'], [12, 'Digit2']]) });
          noErrors(r);
          const b = (r.game as G).state.buddy;
          if (!b?.teaching) return 'T should turn teach mode on (state.buddy.teaching).';
          const n = b.shown?.['no slime']?.[1] ?? 0;
          return n > 20 || `After 10 s of teaching with 2 (fight) chosen, state.buddy.shown['no slime'][1] is ${n}: count each decision you made for it.`;
        } } },
      { text: 'Copying: on its own, in a situation you showed it, it does what you did most there with probability n / (n + 10), where n is how many times you showed it; otherwise its own ε-greedy choice.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          let set = false, rested = 0, total = 0, last = -1;
          const r = await v.play({ seconds: 20, setup: startAs(game, undefined, 'scenes/town.scene'), watch: (g) => { const st = (g as G).state; if (!st.buddy) return; if (!set) { set = true; Object.assign(st.buddy, { moves: 4, teaching: false, shown: { 'no slime': [0, 0, 0, 300] } }); } const b = g.root.find('Buddy') as unknown as { last?: { action: number } }; if (st.buddy.decisions !== last && b?.last) { last = st.buddy.decisions; total++; if (b.last.action === 3) rested++; } } });
          noErrors(r);
          return (total > 20 && rested / total > 0.8) || `Shown rest 300 times, it rested in ${rested} of ${total} decisions: with n = 300 it should copy you about 97% of the time.`;
        } } },
      { text: 'Learning from you: your choices are decisions like its own, so the Q update in decide() learns from them too (Q-learning learns whoever chooses: it is off-policy). Teach it to rest while you walk away, and watch its value for resting there fall in the Debug tab.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          const r = await v.play({ seconds: 30, setup: startAs(game, undefined, 'scenes/town.scene'), watch: both((g) => { const st = (g as G).state; if (st.buddy) st.buddy.moves = 4; const h = hero(g); if (h) h.position = { x: 280, y: 88 }; }, presses([[6, 'KeyT'], [12, 'Digit4']])) });
          noErrors(r);
          const q = (r.game as G).state.buddy?.q?.['no slime']?.[3];
          return (typeof q === 'number' && q < -0.2) || `Taught to rest far from the hero, its value for resting is ${q}: it should have learned it costs (about −0.5).`;
        } } },
    ],
    solution: COPY_CODE,
    done: 'A buddy that learns from you and from itself. Back in the lesson: imitation learning, and why Q-learning can learn from your choices.',
  },
  {
    id: 'qa-match',
    chain: 'Quest Buddies: Adventure',
    title: 'Enemies matched to the player',
    goal: 'A rating for the hero, kinds of slime with ratings, and each new slime the kind just above the hero: an Elo system.',
    images: IMAGES,
    start: START_MATCH,
    steps: [
      { text: 'Make scripts/tiers.js: TIERS (at least three kinds of slime, each with rating, hp, speed, damage, xp, colour); expected(a, b) = 1 / (1 + 10^((b − a) / 400)); rate(result, enemyRating) moves state.rating by 32 × (result − expected(state.rating, enemyRating)); tierFor(rating) is the kind closest to rating + 50. In newGame, rating: 1000.',
        check: { kind: 'play', test: async (v) => {
          const t = (await v.module('scripts/tiers.js')) as Mod;
          if (!Array.isArray(t.TIERS) || t.TIERS.length < 3) return 'tiers.js should export TIERS with at least three kinds.';
          if (typeof t.expected !== 'function' || Math.abs(t.expected(1400, 1000) - 10 / 11) > 1e-9 || t.expected(1000, 1000) !== 0.5) return 'expected(a, b) should be 1 / (1 + 10^((b − a) / 400)): expected(1000, 1000) is 0.5, expected(1400, 1000) is 10/11.';
          let after = 0, name = '';
          const r = await v.play({ seconds: 0.02, setup: (g) => { (g as G).state.rating = 1000; t.rate(1, 1000); after = (g as G).state.rating; name = t.tierFor(1000)?.name; } });
          noErrors(r);
          if (after !== 1016) return `A win against an equal rating should add 32 × 0.5 = 16: the rating became ${after}.`;
          const closest = [...t.TIERS].sort((a: Mod, b: Mod) => Math.abs(a.rating - 1050) - Math.abs(b.rating - 1050))[0];
          return name === closest.name || `tierFor(1000) gives ${name}: the kind closest to 1050 is ${closest.name}.`;
        } } },
      { text: 'Slimes take their kind: in slime.js’s ready(), this.tier = tierFor(state.rating), and hp, speed and the sprite’s modulate come from it (the hit flash tweens back to the kind’s colour); damage and xp come from it too.',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod, t = (await v.module('scripts/tiers.js')) as Mod;
          const high = [...t.TIERS].sort((a: Mod, b: Mod) => b.rating - a.rating)[0];
          const r = await v.play({ seconds: 0.2, setup: (g) => { game.newGame('Warrior'); (g as G).state.rating = high.rating; g.sceneApi.change('scenes/forest.scene'); } });
          noErrors(r);
          const s = r.game.sceneApi.getNodesInGroup('enemies')[0] as unknown as { hp: number; tier?: Mod } | undefined;
          return (s?.hp === high.hp) || `With the hero rated ${high.rating}, a slime should be a ${high.name} with ${high.hp} hit points: it has ${s?.hp}.`;
        } } },
      { text: 'Rate the fights: when a slime is beaten, rate(1 if it never hurt the hero, 0.75 if it did less than 3 damage, else 0.5, its rating); when the hero is beaten, rate(0, the rating of the slime that hit it last: state.lastHitBy).',
        check: { kind: 'play', test: async (v) => {
          const game = (await v.module('scripts/game.js')) as Mod;
          let done = false, afterWin = 0;
          const r = await v.play({ seconds: 0.6, setup: startAs(game, 'Warrior', 'scenes/forest.scene'), watch: (g) => { if (done || g.sceneApi.path !== 'scenes/forest.scene') return; const s = g.sceneApi.getNodesInGroup('enemies')[0] as unknown as { hurt?: (d: number, f: Pos) => void; position: Pos }; if (!s?.hurt) return; done = true; s.hurt(99, { x: 0, y: 0 }); afterWin = (g as G).state.rating; const o = g.sceneApi.getNodesInGroup('enemies')[1] as unknown as { position: Pos }; (g as G).state.hp = 1; hero(g)!.position = { ...o.position }; } });
          noErrors(r);
          if (!(afterWin > 1000)) return `Beating a slime cleanly should raise the rating above 1000: it is ${afterWin}.`;
          return (r.game as G).state.rating < afterWin || 'Being beaten should lower the rating (rate(0, …) in the hero’s die()).';
        } } },
    ],
    solution: MATCH_CODE,
    done: 'Enemies that keep pace with the player. Back in the lesson: Elo ratings, expected scores, and dynamic difficulty.',
  },
];
