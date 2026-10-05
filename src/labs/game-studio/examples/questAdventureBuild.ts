// Quest Buddies: Adventure, chapter 12's build (docs/game-studio-course-plan.md, "The standard for every game
// chapter"): every script as each lesson leaves it, and every task step's code. The chain starts from chapter 11's
// finished game (QB_FINISHED); the finished example (examples/questAdventure.ts) is that game plus these steps, in
// order, and the tasks (tasks/questAdventure.ts) start and end at points along the same chain.
//
// Each script here is chapter 11's final script with changes made to it (swap), so a change to chapter 11 that
// chapter 12 depends on fails loudly here instead of drifting.

import { QB_FINAL, QB_FINISHED, QB_IMAGES } from './questBuddiesBuild';

const tile = (n: number) => `assets/tiny-dungeon/tiles/tile_${String(n).padStart(4, '0')}.png`;
const WARRIOR = 96, RANGER_CLASS = 98, MAGE = 84, SLIME_TILE = 108, BUDDY_TILE = 99;   // tile numbers in the sheet
/** Every picture the chapter's tasks use. */
export const QA_IMAGES = [...QB_IMAGES, ...[WARRIOR, MAGE, SLIME_TILE, BUDDY_TILE].map(tile)];

/** Replace text that must be there: a missing anchor is a build error, not a silent no-op. */
function swap(src: string, from: string | RegExp, to: string): string {
  if (typeof from === 'string' ? !src.includes(from) : !from.test(src)) throw new Error(`questAdventureBuild: no ${String(from).slice(0, 80)}`);
  return src.replace(from, to);
}

// ── 12.1: classes, stats and levels ─────────────────────────────────────

const CLASSES = `// The classes: each a row of data. Everything that differs between them is here, so a new class is a new row.
export const CLASSES = {
  Warrior: { picture: '${tile(WARRIOR)}', hp: 14, attack: 3, speed: 60, hpPerLevel: 3, attackPerLevel: 1, about: 'Tough and strong, but slow.' },
  Ranger:  { picture: '${tile(RANGER_CLASS)}', hp: 10, attack: 2, speed: 78, hpPerLevel: 2, attackPerLevel: 1, about: 'Quick on their feet.' },
  Mage:    { picture: '${tile(MAGE)}', hp: 8, attack: 4, speed: 66, hpPerLevel: 1, attackPerLevel: 2, about: 'Hits hard, falls fast.' },
};

// Experience needed to go from this level to the next: 10, then half as much again each level (10, 15, 23, 34, …).
export function xpToNext(level) {
  return Math.round(10 * Math.pow(1.5, level - 1));
}
`;

const GAME_CLASSES = swap(swap(QB_FINAL.game,
  `// What a new game starts with: everything the game remembers between maps is in state.
export function newGame() {
`, `import { CLASSES } from './classes.js';

// What a new game starts with, for a class: everything the game remembers between maps is in state.
export function newGame(className = 'Warrior') {
  const c = CLASSES[className];
`),
  `    hp: 10, maxHp: 10,
`, `    className, level: 1, xp: 0, skillPoints: 0,               // the class, and how far it has come
    hp: c.hp, maxHp: c.hp, attack: c.attack, speed: c.speed,   // stats, from the class's row
`);

// The hero with its class's picture and speed (step 2), then experience and levels (step 4).
const PLAYER_CLASS = swap(swap(swap(swap(QB_FINAL.player,
  `import { newGame } from './game.js';
`, `import { newGame } from './game.js';
import { CLASSES } from './classes.js';
`),
  `  speed = 70;
`, ''),
  `    state.map = scene.path;   // so a saved game knows which map to load
`, `    state.map = scene.path;   // so a saved game knows which map to load
    this.get('Sprite').texture = CLASSES[state.className].picture;   // the class's picture
`),
  `.scale(this.speed);`, `.scale(state.speed);   // the class's speed, kept in state`);
const GAIN_XP = `
  // Experience: enough for the next level raises it, maybe more than once.
  gainXp(amount) {
    state.xp += amount;
    while (state.xp >= xpToNext(state.level)) {
      state.xp -= xpToNext(state.level);
      state.level += 1;
      const c = CLASSES[state.className];
      state.maxHp += c.hpPerLevel;
      state.hp = state.maxHp;
      state.attack += c.attackPerLevel;
      state.skillPoints += 1;
      scene.get('HUD/Sounds/LevelUp').play();
      scene.get('HUD').say('Level ' + state.level + '! A skill point to spend.');
    }
  }
}
`;
const PLAYER_LEVELS = swap(swap(PLAYER_CLASS, `import { CLASSES } from './classes.js';`, `import { CLASSES, xpToNext } from './classes.js';`), /\n}\n$/, `\n${GAIN_XP}`);

const TITLE_CLASSES = swap(swap(swap(QB_FINAL.title,
  `import { newGame } from './game.js';

// The title screen: buttons in a VBoxContainer. New game has the focus, so the arrow keys and Enter work at once.
`, `import { CLASSES } from './classes.js';
import { newGame } from './game.js';

// The title screen: New game opens the class menu, whose buttons are made from the CLASSES table.
`),
  `    buttons.get('New game').connect('pressed', this, 'newGame');
`, `    buttons.get('New game').connect('pressed', this, 'chooseClass');
`),
  `    buttons.get('New game').grabFocus();
  }

  newGame() {
    newGame();
    scene.change(state.map);
  }
`, `    buttons.get('New game').grabFocus();
    this.get('Menu/Classes').visible = false;
    // A button for each class: add a row to CLASSES and it is on the menu.
    const list = this.get('Menu/Classes/List');
    for (const [name, c] of Object.entries(CLASSES)) {
      const b = new Button();
      b.name = name;
      b.text = name + ': ' + c.about;
      b.size = { x: 420, y: 44 };
      b.fontSize = 16;
      b.connect('pressed', () => this.start(name));
      list.addChild(b);
    }
  }

  chooseClass() {
    this.get('Menu/Box').visible = false;
    this.get('Menu/Classes').visible = true;
    this.get('Menu/Classes/List').children[0].grabFocus();
  }

  start(className) {
    newGame(className);
    scene.change(state.map);
  }
`);

const HUD_LEVELS = swap(swap(QB_FINAL.hud,
  `// The HUD reads state every frame, and holds the pause menu.
export default class Hud extends CanvasLayer {`, `import { xpToNext } from './classes.js';

// The HUD reads state every frame, and holds the pause menu.
export default class Hud extends CanvasLayer {`),
  `    this.get('Hp').value = state.hp;
`, `    this.get('Hp').value = state.hp;
    this.get('Level').text = 'Level ' + state.level + (state.skillPoints ? '  (' + state.skillPoints + ' skill point' + (state.skillPoints > 1 ? 's' : '') + ')' : '');
    this.get('Xp').maxValue = xpToNext(state.level);
    this.get('Xp').value = state.xp;
`);

// ── 12.2: items and loot ────────────────────────────────────────────────

const LOOT = `// What a slime drops: first a roll on the loot table, then, for a weapon, which one and which affix (an extra name
// part with an extra bonus). Rolled with a seeded generator whose state is kept in state.lootSeed, so a saved game
// carries on the same sequence of drops, and a test can fix the seed.
export const TABLE = [['nothing', 40], ['gold', 30], ['potion', 20], ['weapon', 10]];
export const WEAPONS = [['Stick', 1, 50], ['Dagger', 2, 35], ['Sword', 3, 15]];          // name, bonus, weight
export const AFFIXES = [['', 0, 70], [' of Might', 1, 22], [' of the Hero', 3, 8]];      // name part, extra bonus, weight

export function rollLoot() {
  const r = math.rng(state.lootSeed);
  const kind = r.weighted(TABLE);
  let item = null;
  if (kind === 'gold') item = { kind: 'gold', amount: r.int(2, 6) };
  if (kind === 'potion') item = { kind: 'potion', name: 'Potion', note: 'heals 5' };
  if (kind === 'weapon') {
    const [name, bonus] = r.weighted(WEAPONS.map((w) => [w, w[2]]));
    const [part, extra] = r.weighted(AFFIXES.map((a) => [a, a[2]]));
    item = { kind: 'weapon', name: name + part, bonus: bonus + extra, note: '+' + (bonus + extra) + ' attack' };
  }
  state.lootSeed = r.state;   // carry on from here next time
  return item;
}
`;
// Before affixes: weapons have only their own bonus.
const LOOT_PLAIN = swap(LOOT, "export const AFFIXES = [['', 0, 70], [' of Might', 1, 22], [' of the Hero', 3, 8]];      // name part, extra bonus, weight",
  "export const AFFIXES = [['', 0, 100]];      // no affixes yet: every weapon is plain");
const GAME_LOOT = swap(GAME_CLASSES, `    taken: [],                  // things picked up, by name, so they do not come back
`, `    taken: [],                  // things picked up, by name, so they do not come back
    lootSeed: Math.floor(Math.random() * 1e9),   // the loot generator's state: a fresh run of drops each game
`);
const GAME_WEAPON = swap(GAME_LOOT, `    bag: [],                    // items: { name, note }
`, `    bag: [],                    // items: { name, note }, and for things you can use, a kind
    weapon: null,               // the weapon in your hand: { name, bonus }
`);

const HUD_USE = swap(swap(swap(HUD_LEVELS,
  `    this.get('Gold').text = 'Gold: ' + state.gold;
`, `    this.get('Gold').text = 'Gold: ' + state.gold + (state.weapon ? '   ' + state.weapon.name : '');
`),
  `  // The bag: a list rebuilt from state.bag each time it opens. The VBoxContainer places the rows.
`, `  // A bag row as a button: a potion heals, a weapon is equipped (the one equipped goes back in the bag).
  useRow(item) {
    const b = new Button();
    b.text = item.name + ': ' + item.note;
    b.size = { x: 230, y: 30 };
    b.fontSize = 14;
    b.connect('pressed', () => this.use(item));
    return b;
  }

  use(item) {
    state.bag = state.bag.filter((i) => i !== item);
    if (item.kind === 'potion') { state.hp = Math.min(state.maxHp, state.hp + 5); this.say('+5 hit points'); }
    if (item.kind === 'weapon') { if (state.weapon) state.bag.push(state.weapon); state.weapon = item; this.say('Equipped: ' + item.name); }
    this.toggleBag(); this.toggleBag();   // close and open again: the list is rebuilt
  }

  // The bag: a list rebuilt from state.bag each time it opens. The VBoxContainer places the rows.
`),
  `    for (const item of state.bag) {
      const row = new Label();
      row.text = item.name + ': ' + item.note;
      row.fontSize = 16;
      row.wrapWidth = 230;
      list.addChild(row);
    }
`, `    let first = null;   // the first button, to give it the focus
    for (const item of state.bag) {
      if (item.kind) {   // something you can use: a button
        const button = this.useRow(item);
        list.addChild(button);
        first ??= button;
        continue;
      }
      const row = new Label();
      row.text = item.name + ': ' + item.note;
      row.fontSize = 16;
      row.wrapWidth = 230;
      list.addChild(row);
    }
    if (first) first.grabFocus();   // Enter uses the first item; the arrow keys move between them
`);

// ── 12.3: combat ────────────────────────────────────────────────────────

const PLAYER_COMBAT = swap(swap(swap(PLAYER_LEVELS,
  `export default class Player extends CharacterBody2D {
  near = null;   // someone close enough to talk to (they set this when you walk up)
`, `export default class Player extends CharacterBody2D {
  near = null;                // someone close enough to talk to (they set this when you walk up)
  facing = new Vec2(1, 0);    // the way it last walked: where its attack goes
  cooldown = 0;               // seconds until it can attack again
  safe = 0;                   // seconds it cannot be hurt again (after a hit)
  stunned = 0;                // seconds of knockback, when the keys do not move it
`),
  `    this.velocity = input.vector('move_left', 'move_right', 'move_up', 'move_down').scale(state.speed);   // the class's speed, kept in state
    this.moveAndSlide();
`, `    this.stunned -= dt;
    if (this.stunned > 0) { this.moveAndSlide(); return; }   // knocked back: the hit decides where it goes
    const move = input.vector('move_left', 'move_right', 'move_up', 'move_down');
    if (move.length() > 0) this.facing = move;
    this.velocity = move.scale(state.speed);   // the class's speed, kept in state
    this.moveAndSlide();
`),
  `  update(dt) {
    if (this.near && !scene.get('HUD').busy && input.isJustPressed('interact')) this.near.talk();
  }
`, `  update(dt) {
    this.cooldown -= dt;
    this.safe -= dt;
    if (scene.get('HUD').busy) return;
    if (this.near && input.isJustPressed('interact')) this.near.talk();
    if (input.isJustPressed('attack') && this.cooldown <= 0) this.attack();
  }

  // A swing: every enemy within reach, in front, is hit for the hero's attack plus the weapon's bonus.
  attack() {
    this.cooldown = 0.4;
    const reach = this.position.add(this.facing.normalized().scale(14));
    const damage = state.attack + (state.weapon?.bonus ?? 0);
    const swing = this.get('Swing');
    swing.position = this.facing.normalized().scale(14);
    swing.burst(6);
    scene.get('HUD/Sounds/Swing').play();
    for (const enemy of scene.getNodesInGroup('enemies')) {
      if (enemy.globalPosition.distanceTo(reach) < 16) enemy.hurt(damage, this.position);
    }
  }

  // Hit by an enemy: lose hit points, flash, be knocked back away from it, and a moment when nothing more can hurt.
  hurt(amount, from) {
    if (this.safe > 0) return;
    this.safe = 0.8;
    state.hp -= amount;
    if (from) { this.velocity = this.position.sub(from).normalized().scale(140); this.stunned = 0.15; }
    const sprite = this.get('Sprite');
    sprite.modulate = '#ff4040';
    tween.to(sprite, { modulate: '#ffffff' }, 0.4);
    scene.get('HUD/Sounds/Hurt').play();
    if (state.hp <= 0) this.die();
  }

  // Beaten: wake at the campfire with full hit points and half the gold.
  die() {
    state.hp = state.maxHp;
    state.gold = Math.floor(state.gold / 2);
    state.arriveAt = 'Campfire';
    scene.get('HUD').say('You were beaten. Half your gold is gone.');
    scene.change('scenes/forest.scene');
  }
`);

const SLIME = `import { rollLoot } from './loot.js';

// A slime: chases the hero round walls when it is near, hurts it on touch, flashes and is knocked back when hit, and
// drops loot and gives experience when beaten.
export default class Slime extends CharacterBody2D {
  hp = 4;
  speed = 30;
  sight = 90;      // how near the hero must be for it to chase
  route = [];      // the way round the walls, from findPath
  think = 0;       // seconds until it finds its way again
  stunned = 0;     // seconds of knockback, when it does not move by itself

  physicsUpdate(dt) {
    const hero = scene.find('Player');
    if (!hero || scene.get('HUD').busy) { this.velocity = { x: 0, y: 0 }; return; }
    this.stunned -= dt;
    if (this.stunned > 0) { this.moveAndSlide(); return; }
    const far = this.position.distanceTo(hero.position);
    if (far < 12) hero.hurt(1, this.position);
    const buddy = scene.find('Buddy');
    if (buddy && this.position.distanceTo(buddy.position) < 12) buddy.hurt(1, this.position);
    if (far > this.sight) { this.velocity = { x: 0, y: 0 }; return; }
    // Find the way again a few times a second, not every frame: pathfinding costs more than moving.
    this.think -= dt;
    if (this.think <= 0) { this.think = 0.5; this.route = scene.get('Walls').findPath(this.position, hero.position) ?? []; }
    const next = this.route[0] ?? hero.position;
    if (this.position.distanceTo(next) < 3 && this.route.length) this.route.shift();
    this.velocity = next.sub(this.position).normalized().scale(this.speed);
    this.moveAndSlide();
  }

  hurt(damage, from) {
    this.hp -= damage;
    const sprite = this.get('Sprite');
    sprite.modulate = '#ff6060';
    tween.to(sprite, { modulate: '#ffffff' }, 0.25);
    this.velocity = this.position.sub(from).normalized().scale(160);   // knocked back, away from the hit
    this.stunned = 0.15;
    this.get('Puff').burst(8);
    scene.get('HUD/Sounds/Hit').play();
    if (this.hp <= 0) this.die();
  }

  die() {
    scene.find('Player')?.gainXp(4);
    const item = rollLoot();
    const hud = scene.get('HUD');
    if (item?.kind === 'gold') { state.gold += item.amount; hud.say('+' + item.amount + ' gold'); }
    else if (item) { state.bag.push(item); hud.say('Found: ' + item.name); scene.get('HUD/Sounds/Pickup').play(); }
    this.queueFree();
  }
}
`;
// A slime that can be hurt and beaten, but does not move yet.
const SLIME_STILL = swap(SLIME, /\n  physicsUpdate\(dt\) \{[\s\S]*?\n  \}\n\n  hurt/, '\n  hurt');

const SPAWNER = `// Slimes come back: every 6 seconds, if the forest has fewer than 3, one appears at a spawn spot away from the hero.
export default class Spawner extends Node2D {
  wait = 6;

  update(dt) {
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = 6;
    const enemies = scene.get('Enemies');
    if (enemies.children.length >= 3) return;
    const hero = scene.find('Player');
    const spots = this.children.filter((s) => !hero || s.position.distanceTo(hero.position) > 80);
    if (!spots.length) return;
    const slime = scene.instantiate('scenes/slime.scene');
    slime.position = spots[Math.floor(Math.random() * spots.length)].position;
    enemies.addChild(slime);
  }
}
`;

// ── 12.4: the buddy that learns ─────────────────────────────────────────

// Step 1: it only follows.
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

const BUDDY = `// The buddy: a friend who fights beside you and learns how while you play, by Q-learning (chapter 9) in this script.
// Everything it has learned is in state.buddy, so it is saved with the game. Skill points make it better:
//   senses  how many things it notices, so how many situations it can tell apart (1 to 3)
//   moves   how many things it can do (2 to 4)
//   focus   how rarely it tries a random move: ε = 0.3 × 0.5^focus
export const MOVES = ['follow', 'fight', 'guard', 'rest'];
export const ALPHA = 0.2, GAMMA = 0.9;

export default class Buddy extends CharacterBody2D {
  hp = 6;
  maxHp = 6;
  speed = 64;
  cooldown = 0;     // seconds until it can hit again
  safe = 0;         // seconds it cannot be hurt again
  down = 0;         // seconds it is knocked out
  think = 0;        // seconds until it decides again
  last = null;      // its last decision: { key, action }, to learn from
  earned = 0;       // reward since that decision

  ready() {
    state.buddy ??= { q: {}, senses: 1, moves: 2, focus: 0, decisions: 0, beaten: 0 };
    const hero = scene.find('Player');
    if (hero) this.position = hero.position.add({ x: -16, y: 0 });
  }

  get mind() { return state.buddy; }
  get epsilon() { return 0.3 * Math.pow(0.5, this.mind.focus); }

  nearestSlime() {
    let best = null;
    for (const s of scene.getNodesInGroup('enemies')) if (!best || this.position.distanceTo(s.position) < this.position.distanceTo(best.position)) best = s;
    return best;
  }

  // What it sees: the situation, as words, from the senses it has. Each different key is a different state.
  see() {
    const slime = this.nearestSlime(), hero = scene.find('Player');
    const seen = [slime && this.position.distanceTo(slime.position) < 70 ? 'slime near' : 'no slime'];
    if (this.mind.senses >= 2) seen.push(hero && this.position.distanceTo(hero.position) > 60 ? 'hero far' : 'hero near');
    if (this.mind.senses >= 3) seen.push(this.hp <= 2 ? 'hurt' : 'healthy');
    return seen.join(', ');
  }

  // Q(s, ·): the values of each move it has, in a state (new states and new moves start at 0).
  values(key) {
    const row = this.mind.q[key] ?? (this.mind.q[key] = []);
    while (row.length < this.mind.moves) row.push(0);
    return row;
  }

  decide() {
    const hero = scene.find('Player');
    if (hero && this.position.distanceTo(hero.position) > 80) this.earned -= 0.5;   // a buddy should stay a buddy
    const key = this.see(), now = this.values(key);
    // Q-learning: move the last decision's value towards what it earned plus the best it can expect from here.
    //   Q(s, a) ← Q(s, a) + α (r + γ max Q(s′, ·) − Q(s, a))
    if (this.last) {
      const row = this.values(this.last.key), q = row[this.last.action];
      row[this.last.action] = q + ALPHA * (this.earned + GAMMA * Math.max(...now) - q);
    }
    // ε-greedy: usually the best move it knows, sometimes a random one, to find out.
    const action = Math.random() < this.epsilon ? Math.floor(Math.random() * this.mind.moves) : now.indexOf(Math.max(...now));
    this.last = { key, action };
    this.earned = 0;
    this.mind.decisions++;
    debug.watch('buddy sees', key);
    debug.watch('buddy values', now.map((v, i) => MOVES[i] + ' ' + v.toFixed(2)).join(', '));
    debug.watch('buddy ε', this.epsilon);
  }

  physicsUpdate(dt) {
    const hero = scene.find('Player');
    if (!hero || scene.get('HUD').busy) { this.velocity = { x: 0, y: 0 }; return; }
    this.cooldown -= dt; this.safe -= dt;
    if (this.down > 0) {   // knocked out: it gets up after 4 s, healed
      this.down -= dt;
      if (this.down <= 0) { this.hp = this.maxHp; this.get('Sprite').opacity = 1; }
      return;
    }
    this.think -= dt;
    if (this.think <= 0) { this.think = 0.25; this.decide(); }
    const move = MOVES[this.last.action], slime = this.nearestSlime();
    if (move === 'rest') { this.velocity = { x: 0, y: 0 }; this.hp = Math.min(this.maxHp, this.hp + dt); return; }
    let target = hero.position, stop = 24;
    if (move === 'fight' && slime) { target = slime.position; stop = 10; }
    if (move === 'guard' && slime) { target = hero.position.lerp(slime.position, 0.5); stop = 4; }
    const gap = target.sub(this.position);
    this.velocity = gap.length() > stop ? gap.normalized().scale(this.speed) : { x: 0, y: 0 };
    this.moveAndSlide();
    if (move === 'fight' && slime && this.position.distanceTo(slime.position) < 16 && this.cooldown <= 0) {
      this.cooldown = 0.6;
      slime.hurt(2, this.position);
      this.earned += 1;
      if (slime.hp <= 0) { this.earned += 3; this.mind.beaten++; }
    }
  }

  hurt(amount, from) {
    if (this.safe > 0 || this.down > 0) return;
    this.safe = 0.8;
    this.hp -= amount;
    this.earned -= 1;
    const sprite = this.get('Sprite');
    sprite.modulate = '#ff4040';
    tween.to(sprite, { modulate: '#ffffff' }, 0.4);
    if (from) { this.velocity = this.position.sub(from).normalized().scale(120); this.moveAndSlide(); }
    if (this.hp <= 0) { this.down = 4; this.earned -= 2; sprite.opacity = 0.35; }
  }
}
`;
// Step 2: it sees and chooses, but does not learn yet (no Q update).
const BUDDY_CHOOSES = swap(BUDDY, /\n    if \(this\.last\) \{\n[\s\S]*?\n    \}\n/, '\n');

// Step 4: the HUD's skills menu (K): spend skill points on the buddy.
const HUD_SKILLS = swap(swap(swap(swap(HUD_USE,
  `  get busy() { return this.lines.length > 0 || this.get('Pause').visible || this.get('Bag').visible; }`,
  `  get busy() { return this.lines.length > 0 || this.get('Pause').visible || this.get('Bag').visible || this.get('Skills').visible; }`),
  `    this.get('Dialogue').visible = false;
`, `    this.get('Dialogue').visible = false;
    this.get('Skills').visible = false;
    for (const [name, field, max] of [['Senses', 'senses', 3], ['Moves', 'moves', 4], ['Focus', 'focus', 3]]) this.get('Skills/List/' + name).connect('pressed', () => this.spend(field, max));
`),
  `    if (input.isJustPressed('inventory') && !this.get('Pause').visible) this.toggleBag();
`, `    if (input.isJustPressed('inventory') && !this.get('Pause').visible && !this.get('Skills').visible) this.toggleBag();
    if (input.isJustPressed('skills') && !this.get('Pause').visible && !this.get('Bag').visible) this.toggleSkills();
    if (this.get('Skills').visible) this.showSkills();
`),
  /\n}\n$/, `

  // ── the buddy's skills (lesson 12.4): skill points buy senses, moves and focus ──
  toggleSkills() {
    const panel = this.get('Skills');
    panel.visible = !panel.visible;
    if (panel.visible) this.get('Skills/List/Senses').grabFocus();
  }

  showSkills() {
    const b = state.buddy;
    if (!b) return;
    this.get('Skills/Points').text = 'Skill points: ' + state.skillPoints;
    for (const [name, field, max] of [['Senses', 'senses', 3], ['Moves', 'moves', 4], ['Focus', 'focus', 3]]) {
      const button = this.get('Skills/List/' + name);
      button.text = name + ': ' + b[field] + ' of ' + max;
      button.disabled = state.skillPoints <= 0 || b[field] >= max;
    }
  }

  spend(field, max) {
    const b = state.buddy;
    if (!b || state.skillPoints <= 0 || b[field] >= max) return;
    state.skillPoints -= 1;
    b[field] += 1;
    this.say('Your buddy\\u2019s ' + field + ' is now ' + b[field] + '.');
    scene.get('HUD/Sounds/LevelUp').play();
  }
}
`);

// ── 12.5: the buddy that copies you ─────────────────────────────────────

// Teach mode (T): keys 1 to 4 choose its move, and it counts your choices in each situation. Off it, it copies what
// you did most there, trusting it more the more you showed it; and its Q-learning learns from your choices as from its
// own (Q-learning is off-policy: it learns whoever chooses).
const BUDDY_COPIES = swap(swap(swap(swap(swap(BUDDY,
  `//   focus   how rarely it tries a random move: ε = 0.3 × 0.5^focus
`, `//   focus   how rarely it tries a random move: ε = 0.3 × 0.5^focus
// And it copies you (lesson 12.5): in teach mode (T) keys 1 to 4 choose its move, and it counts what you chose.
`),
  `  earned = 0;       // reward since that decision
`, `  earned = 0;       // reward since that decision
  taught = 0;       // the move you chose for it, in teach mode
`),
  `    state.buddy ??= { q: {}, senses: 1, moves: 2, focus: 0, decisions: 0, beaten: 0 };`,
  `    state.buddy ??= { q: {}, senses: 1, moves: 2, focus: 0, decisions: 0, beaten: 0 };
    state.buddy.shown ??= {};       // your choices: shown[situation][move] = how many times
    state.buddy.teaching ??= false;`),
  `    // ε-greedy: usually the best move it knows, sometimes a random one, to find out.
    const action = Math.random() < this.epsilon ? Math.floor(Math.random() * this.mind.moves) : now.indexOf(Math.max(...now));`,
  `    const action = this.mind.teaching ? this.learnFromYou(key) : this.choose(key, now);`),
  `  physicsUpdate(dt) {`, `  // Teach mode: do what you chose, and count it.
  learnFromYou(key) {
    const action = Math.min(this.taught, this.mind.moves - 1);
    const row = this.mind.shown[key] ?? (this.mind.shown[key] = []);
    while (row.length < MOVES.length) row.push(0);
    row[action] += 1;
    return action;
  }

  // On its own: copy what you did most in this situation, with a chance that grows with how often you showed it
  // (n / (n + 10)); otherwise its own ε-greedy choice from what it has learned.
  choose(key, now) {
    const shown = (this.mind.shown[key] ?? []).slice(0, this.mind.moves), n = shown.reduce((t, c) => t + c, 0);
    if (n > 0 && Math.random() < n / (n + 10)) return shown.indexOf(Math.max(...shown));
    return Math.random() < this.epsilon ? Math.floor(Math.random() * this.mind.moves) : now.indexOf(Math.max(...now));
  }

  update(dt) {
    if (input.isJustPressed('teach')) {
      this.mind.teaching = !this.mind.teaching;
      scene.get('HUD').say(this.mind.teaching ? 'Teaching your buddy: 1 follow, 2 fight, 3 guard, 4 rest' : 'Your buddy is on its own again');
    }
    for (let k = 0; k < MOVES.length; k++) if (input.isJustPressed('buddy_' + (k + 1))) this.taught = k;
  }

  physicsUpdate(dt) {`);
// Step 1: teach mode and counting, but on its own it does not copy yet.
const BUDDY_TAUGHT = swap(BUDDY_COPIES, `    const shown = (this.mind.shown[key] ?? []).slice(0, this.mind.moves), n = shown.reduce((t, c) => t + c, 0);
    if (n > 0 && Math.random() < n / (n + 10)) return shown.indexOf(Math.max(...shown));
`, '');

// ── 12.6: enemies matched to the player ─────────────────────────────────

const TIERS = `// Enemies matched to the player (lesson 12.6). Each kind of slime has a rating; the hero has one too, state.rating,
// which goes up when it beats slimes cleanly and down when it is beaten. Each new slime is the kind whose rating is
// closest to just above the hero's, so the fights stay close.
export const TIERS = [
  { name: 'Green slime', rating: 850,  hp: 3, speed: 24, damage: 1, xp: 3, colour: '#b2f2bb' },
  { name: 'Slime',       rating: 1000, hp: 4, speed: 30, damage: 1, xp: 4, colour: '#ffffff' },
  { name: 'Red slime',   rating: 1150, hp: 6, speed: 36, damage: 1, xp: 6, colour: '#ff8787' },
  { name: 'Dark slime',  rating: 1300, hp: 9, speed: 42, damage: 2, xp: 9, colour: '#9775fa' },
];

// Elo's expected score: how likely a rating a is to beat a rating b, from 0 to 1. 400 points apart is 10 to 1.
export function expected(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

// After a fight: result 1 (a win), 0.5, or 0 (a loss). The rating moves by K times how much better or worse than expected.
export function rate(result, enemyRating, k = 32) {
  state.rating = (state.rating ?? 1000) + k * (result - expected(state.rating ?? 1000, enemyRating));
}

// The kind for a new slime: the one closest to 50 points above the hero.
export function tierFor(rating = 1000) {
  return TIERS.reduce((best, t) => (Math.abs(t.rating - (rating + 50)) < Math.abs(best.rating - (rating + 50)) ? t : best));
}
`;
const GAME_MATCHED = swap(GAME_WEAPON, `    weapon: null,               // the weapon in your hand: { name, bonus }
`, `    weapon: null,               // the weapon in your hand: { name, bonus }
    rating: 1000,               // how well you fight: slimes are matched to it (lesson 12.6)
`);
const SLIME_MATCHED = swap(swap(swap(swap(swap(SLIME,
  `import { rollLoot } from './loot.js';`, `import { rollLoot } from './loot.js';
import { tierFor, rate } from './tiers.js';`),
  `  stunned = 0;     // seconds of knockback, when it does not move by itself
`, `  stunned = 0;     // seconds of knockback, when it does not move by itself
  tier = null;     // its kind, chosen for the hero's rating (lesson 12.6)
  dealt = 0;       // damage it has done to the hero, to rate the fight

  ready() {
    this.tier = tierFor(state.rating);
    this.hp = this.tier.hp;
    this.speed = this.tier.speed;
    this.get('Sprite').modulate = this.tier.colour;
  }
`),
  `    if (far < 12) hero.hurt(1, this.position);`, `    if (far < 12) {
      state.lastHitBy = this.tier.rating;   // if this hit beats the hero, the fight is rated as a loss against this kind
      if (hero.hurt(this.tier.damage, this.position)) this.dealt += this.tier.damage;
    }`),
  `    tween.to(sprite, { modulate: '#ffffff' }, 0.25);`, `    tween.to(sprite, { modulate: this.tier.colour }, 0.25);`),
  `    scene.find('Player')?.gainXp(4);`, `    scene.find('Player')?.gainXp(this.tier.xp);
    rate(this.dealt === 0 ? 1 : this.dealt < 3 ? 0.75 : 0.5, this.tier.rating);   // a clean win counts for most`);
// Step 2: slimes take their kind, but fights are not rated yet.
const SLIME_KINDS = swap(SLIME_MATCHED, `
    rate(this.dealt === 0 ? 1 : this.dealt < 3 ? 0.75 : 0.5, this.tier.rating);   // a clean win counts for most`, '');
const PLAYER_MATCHED = swap(swap(swap(swap(PLAYER_COMBAT,
  `import { CLASSES, xpToNext } from './classes.js';`, `import { CLASSES, xpToNext } from './classes.js';
import { rate } from './tiers.js';`),
  `  hurt(amount, from) {
    if (this.safe > 0) return;`, `  hurt(amount, from) {
    if (this.safe > 0) return false;`),
  `    if (state.hp <= 0) this.die();
  }`, `    if (state.hp <= 0) this.die();
    return true;   // it was hurt (the slime counts the damage it did)
  }`),
  `  die() {
    state.hp = state.maxHp;`, `  die() {
    if (state.lastHitBy) rate(0, state.lastHitBy);   // a loss: the rating goes down, and the slimes get easier
    state.hp = state.maxHp;`);
const SPAWNER_MATCHED = swap(SPAWNER, `  update(dt) {
    this.wait -= dt;`, `  update(dt) {
    debug.watch('your rating', Math.round(state.rating ?? 1000));
    this.wait -= dt;`);

// ── the steps ───────────────────────────────────────────────────────────

const w = (path: string, src: string) => `project.writeScript('${path}', ${JSON.stringify(src)})`;

/** The chapter's tasks in order. The first starts from chapter 11's finished game; each later one where the one before ends. */
export const QA_CHAIN = ['qa-classes', 'qa-loot', 'qa-combat', 'qa-buddy', 'qa-copy', 'qa-match'];

/** Each task's steps as Scene API code: steps[k] is what step k + 1 adds to what came before. */
export const QA_STEPS: Record<string, string[]> = {
  'qa-classes': [
    w('scripts/classes.js', CLASSES),
    `${w('scripts/game.js', GAME_CLASSES)}
${w('scripts/player.js', PLAYER_CLASS)}`,
    `// The class menu: a panel on the title screen, with a list that title.js fills from CLASSES.
const title = project.scene('scenes/title.scene')
title.add('Panel', { name: 'Classes', parent: 'Menu', position: { x: 240, y: 90 }, size: { x: 480, y: 280 } })
title.add('Label', { name: 'Choose', parent: 'Menu/Classes', position: { x: 30, y: 20 }, fontSize: 28, color: '#ffd43b', text: 'Choose your class' })
title.add('VBoxContainer', { name: 'List', parent: 'Menu/Classes', position: { x: 30, y: 80 }, separation: 12 })
${w('scripts/title.js', TITLE_CLASSES)}`,
    `// Levels: gainXp in the hero, a level-up sound, and the level and an experience bar in the HUD.
${w('scripts/player.js', PLAYER_LEVELS)}
project.writeSound('assets/sounds/levelup.wav', { wave: 'triangle', from: 523, to: 1046, length: 0.5, attack: 0.02, volume: 0.45 })
const hud = project.scene('scenes/hud.scene')
hud.add('AudioStreamPlayer', { name: 'LevelUp', parent: 'Sounds', stream: 'assets/sounds/levelup.wav' })
hud.add('Label', { name: 'Level', position: { x: 16, y: 76 }, fontSize: 16, color: '#c5f6fa', text: 'Level 1' })
hud.add('ProgressBar', { name: 'Xp', position: { x: 16, y: 100 }, size: { x: 200, y: 6 }, value: 0, maxValue: 10, fillColor: '#4dabf7' })
${w('scripts/hud.js', HUD_LEVELS)}`,
  ],
  'qa-loot': [
    `${w('scripts/loot.js', LOOT_PLAIN)}
${w('scripts/game.js', GAME_LOOT)}`,
    w('scripts/loot.js', LOOT),
    `${w('scripts/game.js', GAME_WEAPON)}
${w('scripts/hud.js', HUD_USE)}`,
  ],
  'qa-combat': [
    `// Slimes: their own scene (a body in the enemies group, a picture, a shape, a puff of particles), three in the
// forest under Enemies, sounds for a hit and a pickup, and a script that can be hurt and beaten.
project.writeSound('assets/sounds/hit.wav', { wave: 'square', from: 300, to: 120, length: 0.12, attack: 0.002, volume: 0.3 })
project.writeSound('assets/sounds/pickup.wav', { wave: 'triangle', from: 440, to: 880, length: 0.2, volume: 0.5 })
const hud = project.scene('scenes/hud.scene')
hud.add('AudioStreamPlayer', { name: 'Hit', parent: 'Sounds', stream: 'assets/sounds/hit.wav' })
hud.add('AudioStreamPlayer', { name: 'Pickup', parent: 'Sounds', stream: 'assets/sounds/pickup.wav' })
${w('scripts/slime.js', SLIME_STILL)}
const slime = project.createScene('scenes/slime.scene', 'CharacterBody2D', 'Slime')
slime.root.script = 'scripts/slime.js'
slime.root.groups = ['enemies']
slime.add('Sprite2D', { name: 'Sprite', texture: '${tile(SLIME_TILE)}' })
slime.add('CollisionShape2D', { name: 'Shape', size: { x: 10, y: 9 } })
slime.add('Particles2D', { name: 'Puff', amount: 8, speed: 50, lifetime: 0.35, gravity: 120, size: 2, color: '#69db7c' })
const forest = project.scene('scenes/forest.scene')
forest.add('Node2D', { name: 'Enemies', zIndex: 1 })
for (const [x, y] of [[200, 60], [240, 120], [120, 100]]) forest.instance('scenes/slime.scene', { name: 'Slime', parent: 'Enemies', position: { x, y } })`,
    `// The hero's attack: an attack action, a swing of particles and a sound, and getting hurt (with its own sound).
project.addAction('attack', ['KeyJ', 'KeyX'])
project.writeSound('assets/sounds/swing.wav', { wave: 'noise', from: 3000, to: 1200, length: 0.12, attack: 0.005, volume: 0.2, seed: 3 })
project.writeSound('assets/sounds/hurt.wav', { wave: 'noise', from: 900, to: 150, length: 0.2, attack: 0.002, volume: 0.4, seed: 5 })
const hud = project.scene('scenes/hud.scene')
hud.add('AudioStreamPlayer', { name: 'Swing', parent: 'Sounds', stream: 'assets/sounds/swing.wav' })
hud.add('AudioStreamPlayer', { name: 'Hurt', parent: 'Sounds', stream: 'assets/sounds/hurt.wav' })
project.scene('scenes/player.scene').add('Particles2D', { name: 'Swing', amount: 6, speed: 40, lifetime: 0.2, size: 2, color: '#ffffff', spread: 1.2 })
${w('scripts/player.js', PLAYER_COMBAT)}`,
    w('scripts/slime.js', SLIME),
    `// Slimes come back: a Spawner in the forest with three spots under it.
${w('scripts/spawner.js', SPAWNER)}
const forest = project.scene('scenes/forest.scene')
forest.add('Node2D', { name: 'Spawner', script: 'scripts/spawner.js' })
for (const [x, y] of [[260, 40], [280, 150], [200, 168]]) forest.add('Node2D', { name: 'Spot', parent: 'Spawner', position: { x, y } })`,
  ],
  'qa-buddy': [
    `// The buddy: its own scene, in both maps, on collision layers of its own, and a script that follows the hero.
${w('scripts/buddy.js', BUDDY_FOLLOWS)}
const buddy = project.createScene('scenes/buddy.scene', 'CharacterBody2D', 'Buddy')
buddy.root.script = 'scripts/buddy.js'
// Collision layers are bits (layer n is 1 << (n − 1)). The walls go on layer 5 too (1 + 16 = 17), and the buddy
// scans only layer 5: walls stop it, the hero and the slimes do not. It is on layer 2, which nothing else scans.
buddy.root.collisionLayer = 2
buddy.root.collisionMask = 16
for (const map of ['scenes/town.scene', 'scenes/forest.scene']) project.scene(map).get('Walls').collisionLayer = 17
buddy.add('Sprite2D', { name: 'Sprite', texture: '${tile(BUDDY_TILE)}' })
buddy.add('CollisionShape2D', { name: 'Shape', size: { x: 10, y: 10 } })
for (const map of ['scenes/town.scene', 'scenes/forest.scene']) project.scene(map).instance('scenes/buddy.scene', { name: 'Buddy', zIndex: 2 })`,
    w('scripts/buddy.js', BUDDY_CHOOSES),
    w('scripts/buddy.js', BUDDY),
    `// Skill points for the buddy: a skills action (K) and a Skills panel in the HUD with three buttons.
project.addAction('skills', ['KeyK'])
const hud = project.scene('scenes/hud.scene')
hud.add('Panel', { name: 'Skills', position: { x: 300, y: 120 }, size: { x: 360, y: 260 }, visible: false })
hud.add('Label', { name: 'Title', parent: 'Skills', position: { x: 20, y: 14 }, fontSize: 22, text: 'Your buddy (K to close)' })
hud.add('Label', { name: 'Points', parent: 'Skills', position: { x: 20, y: 50 }, fontSize: 16, color: '#c5f6fa', text: 'Skill points: 0' })
hud.add('VBoxContainer', { name: 'List', parent: 'Skills', position: { x: 20, y: 84 }, separation: 10 })
for (const name of ['Senses', 'Moves', 'Focus']) hud.add('Button', { name, parent: 'Skills/List', text: name, size: { x: 320, y: 40 }, fontSize: 16 })
${w('scripts/hud.js', HUD_SKILLS)}`,
  ],
  'qa-copy': [
    `// Teach mode: T turns it on and off; 1 to 4 choose the buddy's move.
project.addAction('teach', ['KeyT'])
for (let k = 1; k <= 4; k++) project.addAction('buddy_' + k, ['Digit' + k])
${w('scripts/buddy.js', BUDDY_TAUGHT)}`,
    w('scripts/buddy.js', BUDDY_COPIES),
    '',
  ],
  'qa-match': [
    `${w('scripts/tiers.js', TIERS)}
${w('scripts/game.js', GAME_MATCHED)}`,
    w('scripts/slime.js', SLIME_KINDS),
    `${w('scripts/slime.js', SLIME_MATCHED)}
${w('scripts/player.js', PLAYER_MATCHED)}
${w('scripts/spawner.js', SPAWNER_MATCHED)}`,
  ],
};

const blocks = (steps: string[]) => steps.filter(Boolean).map((c) => `{\n${c}\n}`).join('\n');
/** The finished game: chapter 11's finished game, then every step of chapter 12, in order. */
export const QA_FINISHED = `${QB_FINISHED}\n${blocks(QA_CHAIN.flatMap((t) => QA_STEPS[t]))}`;
/** A task's start: chapter 11's finished game and every step of the tasks before it. */
export const qaStart = (taskId: string): string => `${QB_FINISHED}\n${blocks(QA_CHAIN.slice(0, QA_CHAIN.indexOf(taskId)).flatMap((t) => QA_STEPS[t]))}`.trimEnd();
/** A task's solution: its own steps. */
export const qaSolution = (taskId: string): string => blocks(QA_STEPS[taskId]);
/** Steps 1 to k + 1 of a task (run on top of the task's start). */
export const qaStepCode = (taskId: string, k: number): string => blocks((QA_STEPS[taskId] ?? []).slice(0, k + 1));
/** Step k + 1 of a task on its own (the step pictures do the steps one after another). */
export const qaStep = (taskId: string, k: number): string => QA_STEPS[taskId]?.[k] ?? '';
/** Scripts whose formulas the lessons' notebooks reproduce (src/courses/making-games/adventure.test.js checks they agree). */
export const QA_SCRIPTS = { buddy: BUDDY, buddyCopies: BUDDY_COPIES, tiers: TIERS };
