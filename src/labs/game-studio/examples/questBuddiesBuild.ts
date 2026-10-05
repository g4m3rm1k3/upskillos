// Quest Buddies, chapter 11's build (docs/game-studio-course-plan.md, "The standard for every game chapter"): every
// script as each lesson leaves it, and every task step's code. The finished example (examples/questBuddies.ts) is
// these steps, in order, from an empty project; the tasks (tasks/questBuddies.ts) start and end at points along the
// same chain. So the game and the lessons that build it cannot drift apart.

import type { Pos } from '../tasks/helpers';

const SHEET = 'assets/tiny-dungeon/tilemap/tilemap_packed.png';
const tile = (n: number) => `assets/tiny-dungeon/tiles/tile_${String(n).padStart(4, '0')}.png`;
const HERO = tile(98), DOOR = tile(45), FIRE = tile(29), RANGER = tile(112), AMULET = tile(101);
/** Every picture the chapter's tasks use, so each task can add any of them. */
const IMAGES = [SHEET, HERO, DOOR, FIRE, RANGER, AMULET];

// Where things are, in both maps (16-pixel tiles; the maps are 20 × 12 tiles).
export const AT = {
  townDoor: { x: 312, y: 88 }, forestDoor: { x: 8, y: 88 },
  start: { x: 56, y: 96 }, fromForest: { x: 280, y: 88 }, fromTown: { x: 32, y: 88 },
  coin: { x: 120, y: 140 }, campfire: { x: 160, y: 152 }, campfireSpawn: { x: 160, y: 132 },
};

// ── scripts, as each stage leaves them ──────────────────────────────────

const PLAYER_MOVES = `export default class Player extends CharacterBody2D {
  speed = 70;

  physicsUpdate(dt) {
    this.velocity = input.vector('move_left', 'move_right', 'move_up', 'move_down').scale(this.speed);
    this.moveAndSlide();
  }
}
`;
const DOOR_SCRIPT = `// A door: walk into it and the game moves to another map. Each door is a small script that extends this one and
// says where it leads.
export default class Door extends Area2D {
  target = '';     // the scene it leads to
  arriveAt = '';   // the spawn point there to stand on

  bodyEntered(body) {
    if (body.name !== 'Player') return;
    state.arriveAt = this.arriveAt;
    scene.change(this.target);
  }
}
`;
const doorTo = (target: string, arriveAt: string) => `import Door from './door.js';

export default class extends Door {
  target = '${target}';
  arriveAt = '${arriveAt}';
}
`;
const PLAYER_SPAWNS = PLAYER_MOVES.replace(`  speed = 70;
`, `  speed = 70;

  ready() {
    // Arriving through a door: stand on the spawn point it named.
    const spawn = state.arriveAt && scene.find('Spawns/' + state.arriveAt);
    if (spawn) this.position = spawn.position;
  }
`);
const GAME_SCRIPT = `// What a new game starts with: everything the game remembers between maps is in state.
export function newGame() {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, {
    map: 'scenes/town.scene',   // where the player is
    arriveAt: 'Start',          // which spawn point of that map to stand on
    gold: 0,
    taken: [],                  // things picked up, by name, so they do not come back
  });
}
`;
const PLAYER_STATE = `import { newGame } from './game.js';

` + PLAYER_SPAWNS.replace(`  ready() {
`, `  ready() {
    // The first map of a game run on its own (F5 or F6): start a new game, so state has its starting values.
    if (state.gold === undefined) newGame();
`).replace(`    if (spawn) this.position = spawn.position;
`, `    if (spawn) this.position = spawn.position;
    state.map = scene.path;   // so a saved game knows which map to load
`);
const COIN_SCRIPT = `// A coin: 10 gold, once. It writes down that it was taken, so it is not there when you come back.
export default class Coin extends Area2D {
  ready() {
    if (state.taken.includes(this.name)) this.queueFree();
  }

  bodyEntered(body) {
    if (body.name !== 'Player') return;
    state.gold += 10;
    state.taken.push(this.name);
    this.queueFree();
  }
}
`;
const HUD_GOLD = `// The HUD reads state every frame, so it shows the same gold on every map.
export default class Hud extends CanvasLayer {
  update(dt) {
    this.get('Gold').text = 'Gold: ' + state.gold;
  }
}
`;
const CAMPFIRE_SCRIPT = `// A save point: rest here and the game is saved, with this campfire as where you will wake up.
export default class Campfire extends Area2D {
  bodyEntered(body) {
    if (body.name !== 'Player') return;
    state.arriveAt = 'Campfire';
    save.write('slot1');   // a copy of all of state
  }
}
`;
const TITLE_KEYS = `import { newGame } from './game.js';

export default class Title extends Node2D {
  update(dt) {
    if (input.isJustPressed('new_game')) {
      newGame();
      scene.change(state.map);
    }
  }
}
`;
const TITLE_CONTINUES = `import { newGame } from './game.js';

export default class Title extends Node2D {
  ready() {
    // Only offer Continue when there is a game to continue.
    this.get('Continue').visible = save.has('slot1');
  }

  update(dt) {
    if (input.isJustPressed('new_game')) {
      newGame();
      scene.change(state.map);
    }
    if (input.isJustPressed('continue') && save.has('slot1')) {
      save.load('slot1');   // everything in state, as it was saved
      scene.change(state.map);
    }
  }
}
`;

const TITLE_BUTTONS = `import { newGame } from './game.js';

// The title screen: buttons in a VBoxContainer. New game has the focus, so the arrow keys and Enter work at once.
export default class Title extends Node2D {
  ready() {
    const buttons = this.get('Menu/Box/Buttons');
    buttons.get('Continue').disabled = !save.has('slot1');
    buttons.get('New game').connect('pressed', this, 'newGame');
    buttons.get('Continue').connect('pressed', this, 'continueGame');
    buttons.get('New game').grabFocus();
  }

  newGame() {
    newGame();
    scene.change(state.map);
  }

  continueGame() {
    save.load('slot1');
    scene.change(state.map);
  }
}
`;
const CAMPFIRE_HEALS = CAMPFIRE_SCRIPT.replace(`    state.arriveAt = 'Campfire';
`, `    state.hp = state.maxHp;   // a rest heals you
    state.arriveAt = 'Campfire';
`);
const HUD_PAUSE = `// The HUD reads state every frame, and holds the pause menu.
export default class Hud extends CanvasLayer {
  // Whether the hero should stand still.
  get busy() { return this.get('Pause').visible; }

  ready() {
    this.get('Pause').visible = false;
    this.get('Pause/Buttons/Resume').connect('pressed', this, 'closePause');
    this.get('Pause/Buttons/Title screen').connect('pressed', this, 'toTitle');
  }

  update(dt) {
    this.get('Gold').text = 'Gold: ' + state.gold;
    if (input.isJustPressed('menu')) { if (this.get('Pause').visible) this.closePause(); else this.openPause(); }
  }

  openPause() {
    this.get('Pause').visible = true;
    this.get('Pause/Buttons/Resume').grabFocus();
  }

  closePause() {
    this.get('Pause').visible = false;
    this.get('Pause/Buttons/Resume').releaseFocus();
  }

  toTitle() { scene.change('scenes/title.scene'); }
}
`;
const PLAYER_WAITS = PLAYER_STATE.replace(`  physicsUpdate(dt) {
`, `  physicsUpdate(dt) {
    // While a menu is open, the hero stands still.
    if (scene.get('HUD').busy) { this.velocity = { x: 0, y: 0 }; return; }
`);
const HUD_BARS = HUD_PAUSE.replace(`  get busy() { return this.get('Pause').visible; }`, `  get busy() { return this.get('Pause').visible || this.get('Bag').visible; }`)
  .replace(`    this.get('Pause').visible = false;
`, `    this.get('Pause').visible = false;
    this.get('Bag').visible = false;
`).replace(`    this.get('Gold').text = 'Gold: ' + state.gold;
`, `    this.get('Gold').text = 'Gold: ' + state.gold;
    this.get('Hp').maxValue = state.maxHp;
    this.get('Hp').value = state.hp;
    if (input.isJustPressed('inventory') && !this.get('Pause').visible) this.toggleBag();
`).replace(`  toTitle() { scene.change('scenes/title.scene'); }
`, `  toTitle() { scene.change('scenes/title.scene'); }

  // The bag: a list rebuilt from state.bag each time it opens. The VBoxContainer places the rows.
  toggleBag() {
    const bag = this.get('Bag');
    bag.visible = !bag.visible;
    if (!bag.visible) return;
    const list = this.get('Bag/List');
    for (const row of list.children) row.queueFree();
    for (const item of state.bag) {
      const row = new Label();
      row.text = item.name + ': ' + item.note;
      row.fontSize = 16;
      row.wrapWidth = 230;
      list.addChild(row);
    }
  }
`);
const GAME_BARS = GAME_SCRIPT.replace(`    gold: 0,
`, `    hp: 10, maxHp: 10,
    gold: 0,
    bag: [],                    // items: { name, note }
`);
const HUD_TALKS = HUD_BARS.replace(`  // Whether the hero should stand still.
  get busy() { return this.get('Pause').visible || this.get('Bag').visible; }`, `  lines = [];      // what is left to say
  shown = 0;       // letters of the current line shown so far
  done = null;     // what to run when the conversation ends

  // Whether the hero should stand still.
  get busy() { return this.lines.length > 0 || this.get('Pause').visible || this.get('Bag').visible; }`)
  .replace(`    this.get('Bag').visible = false;
`, `    this.get('Bag').visible = false;
    this.get('Dialogue').visible = false;
`).replace(`    this.get('Hp').value = state.hp;
`, `    this.get('Hp').value = state.hp;
    if (this.lines.length) { this.typewrite(dt); return; }
`).replace(`  toTitle() { scene.change('scenes/title.scene'); }
`, `  toTitle() { scene.change('scenes/title.scene'); }

  // A conversation: lines shown one at a time, typed out; done() runs at the end.
  talk(name, lines, done = null) {
    this.get('Dialogue/Name').text = name;
    this.lines = [...lines];
    this.done = done;
    this.startLine();
    this.get('Dialogue').visible = true;
    this.openedOn = time.frame;   // the key press that opened it must not also skip the first line
  }

  startLine() {
    this.get('Dialogue/Text').text = this.lines[0];
    this.shown = 0;
    this.get('Dialogue/Text').visibleCharacters = 0;
  }

  typewrite(dt) {
    const text = this.get('Dialogue/Text');
    this.shown = Math.min(text.totalCharacters, this.shown + 40 * dt);   // 40 letters a second
    text.visibleCharacters = this.shown >= text.totalCharacters ? -1 : Math.floor(this.shown);
    if (!input.isJustPressed('interact') || time.frame === this.openedOn) return;
    if (this.shown < text.totalCharacters) { this.shown = text.totalCharacters; text.visibleCharacters = -1; return; }   // finish the line
    this.lines.shift();
    if (this.lines.length) { this.startLine(); return; }   // the next line
    this.get('Dialogue').visible = false;                  // the end
    const done = this.done;
    this.done = null;
    if (done) done();
  }
`);
const GAME_QUEST = GAME_BARS.replace(`    taken: [],                  // things picked up, by name, so they do not come back
`, `    taken: [],                  // things picked up, by name, so they do not come back
    quests: { amulet: 'not started' },   // not started → started → found → done
`);
const PLAYER_TALKS = PLAYER_WAITS.replace(`  speed = 70;
`, `  speed = 70;
  near = null;   // someone close enough to talk to (they set this when you walk up)
`).replace(/\n}\n$/, `

  update(dt) {
    if (this.near && !scene.get('HUD').busy && input.isJustPressed('interact')) this.near.talk();
  }
}
`);
const RANGER_TASK = `// The ranger gives the quest. What she says depends on where the quest has got to: a state machine (lesson 11.7).
//   not started --talk--> started --pick up the amulet--> found --talk--> done
export default class Ranger extends Area2D {
  bodyEntered(body) {
    if (body.name !== 'Player') return;
    body.near = this;
    scene.get('HUD').hint('E: talk');
  }

  bodyExited(body) {
    if (body.name !== 'Player' || body.near !== this) return;
    body.near = null;
    scene.get('HUD').hint('');
  }

  talk() {
    const hud = scene.get('HUD'), quest = state.quests;
    if (quest.amulet === 'not started') {
      hud.talk('Ranger', [
        'You there! I lost my amulet in the forest last night, running from the slimes.',
        'The forest is through the door to the east. Bring it back and I will pay you well.',
      ], () => { quest.amulet = 'started'; hud.say('New quest: the lost amulet'); });
    } else if (quest.amulet === 'started') {
      hud.talk('Ranger', ['No luck yet? Look near the north side of the forest.']);
    } else if (quest.amulet === 'found') {
      hud.talk('Ranger', ['My amulet! Thank you, friend. Here, take this.'], () => {
        quest.amulet = 'done';
        state.bag = state.bag.filter((item) => item.name !== 'Amulet');
        state.gold += 50;
        scene.get('HUD/Sounds/Coin').play();
        hud.say('+50 gold');
      });
    } else {
      hud.talk('Ranger', ['The forest is quiet again. Rest by the campfire there if you are hurt.']);
    }
  }
}
`;

const AMULET_SOURCE = `// The quest's item. It is only in the forest while the quest is looking for it.
export default class Amulet extends Area2D {
  ready() {
    if (state.quests?.amulet !== 'started') this.queueFree();
  }

  bodyEntered(body) {
    if (body.name !== 'Player') return;
    state.bag.push({ name: 'Amulet', note: 'The ranger\\u2019s, found in the forest' });
    state.quests.amulet = 'found';
    scene.get('HUD/Sounds/Pickup').play();
    scene.get('HUD').say('Found the amulet!');
    this.queueFree();
  }
}
`;

const AMULET_TASK = AMULET_SOURCE.replace("state.quests?.amulet", "state.quests.amulet").replace(`    scene.get('HUD/Sounds/Pickup').play();
`, '');
const RANGER_PLAIN = RANGER_TASK.replace(`        scene.get('HUD/Sounds/Coin').play();
`, '');

// ── stage code: each task's solution, and so the next task's start ──────

const doorNode = (scene: string, name: string, at: Pos, script: string) => `project.scene('${scene}').add('Area2D', { name: '${name}', position: { x: ${at.x}, y: ${at.y} }, script: '${script}' })
project.scene('${scene}').add('Sprite2D', { name: 'Sprite', parent: '${name}', texture: '${DOOR}' })
project.scene('${scene}').add('CollisionShape2D', { name: 'Shape', parent: '${name}', size: { x: 12, y: 14 } })`;

const COIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5" fill="#ffd43b" stroke="#b08900" stroke-width="1.5"/></svg>';
const MENUS = `// The title screen with buttons, and a pause menu in the HUD.
const title = project.scene('scenes/title.scene')
title.get('NewGame').delete()
title.get('Continue').delete()
title.add('CanvasLayer', { name: 'Menu' })
title.add('Panel', { name: 'Box', parent: 'Menu', position: { x: 290, y: 60 }, size: { x: 380, y: 420 } })
title.get('Name').reparent('Menu/Box')
title.get('Menu/Box/Name').position = { x: 70, y: 24 }
title.add('VBoxContainer', { name: 'Buttons', parent: 'Menu/Box', position: { x: 40, y: 110 }, separation: 14 })
title.add('Button', { name: 'New game', parent: 'Menu/Box/Buttons', text: 'New game', size: { x: 300, y: 48 } })
title.add('Button', { name: 'Continue', parent: 'Menu/Box/Buttons', text: 'Continue', size: { x: 300, y: 48 } })
project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_BUTTONS)})
project.addAction('menu', ['Escape'])
const hud = project.scene('scenes/hud.scene')
hud.add('Panel', { name: 'Pause', position: { x: 330, y: 150 }, size: { x: 300, y: 200 } })
hud.add('Label', { name: 'Title', parent: 'Pause', position: { x: 105, y: 16 }, fontSize: 24, text: 'Paused' })
hud.add('VBoxContainer', { name: 'Buttons', parent: 'Pause', position: { x: 30, y: 64 }, separation: 12 })
hud.add('Button', { name: 'Resume', parent: 'Pause/Buttons', text: 'Resume', size: { x: 240, y: 44 } })
hud.add('Button', { name: 'Title screen', parent: 'Pause/Buttons', text: 'Title screen', size: { x: 240, y: 44 } })
project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_PAUSE)})
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_WAITS)})`;

const HUD_SAYS = (src: string) => src.replace(`  toTitle() {`, `  say(text) { this.get('Message').text = text; }
  hint(text) { this.get('Hint').text = text; }

  toTitle() {`);
const COIN_SOUND = COIN_SCRIPT.replace(`    state.gold += 10;
`, `    state.gold += 10;
    scene.get('HUD/Sounds/Coin').play();
`);
const PLAYER_SOUNDS = PLAYER_TALKS.replace(`    state.map = scene.path;   // so a saved game knows which map to load
`, `    state.map = scene.path;   // so a saved game knows which map to load
    scene.get('HUD/Sounds/Arrive').play();
`);
const SOUNDS = `// Sound effects made from numbers, played by AudioStreamPlayers in the HUD.
project.writeSound('assets/sounds/coin.wav', { wave: 'square', from: 880, to: 1760, length: 0.15, attack: 0.005, volume: 0.35 })
project.writeSound('assets/sounds/arrive.wav', { wave: 'noise', from: 1500, to: 300, length: 0.35, attack: 0.02, volume: 0.25, seed: 7 })
const hud = project.scene('scenes/hud.scene')
hud.add('Node', { name: 'Sounds' })
hud.add('AudioStreamPlayer', { name: 'Coin', parent: 'Sounds', stream: 'assets/sounds/coin.wav' })
hud.add('AudioStreamPlayer', { name: 'Arrive', parent: 'Sounds', stream: 'assets/sounds/arrive.wav' })
project.writeScript('scripts/coin.js', ${JSON.stringify(COIN_SOUND)})
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_SOUNDS)})`;


// ── step by step: each step's code, as a learner might write it, for the tests and the step pictures ──────────────

const DOOR_FIRST = `export default class Door extends Area2D {
  bodyEntered(body) {
    if (body.name === 'Player') scene.change('scenes/forest.scene');
  }
}
`;
const DOOR_ARRIVES = `export default class Door extends Area2D {
  bodyEntered(body) {
    if (body.name !== 'Player') return;
    state.arriveAt = 'FromTown';   // where to stand in the forest
    scene.change('scenes/forest.scene');
  }
}
`;
const TITLE_CONTINUE_ALWAYS = TITLE_CONTINUES.replace(`  ready() {
    // Only offer Continue when there is a game to continue.
    this.get('Continue').visible = save.has('slot1');
  }

`, '');
const HUD_HP = HUD_PAUSE.replace(`    this.get('Gold').text = 'Gold: ' + state.gold;
`, `    this.get('Gold').text = 'Gold: ' + state.gold;
    this.get('Hp').maxValue = state.maxHp;
    this.get('Hp').value = state.hp;
`);
const HUD_BAG_ONLY = HUD_BARS.replace(`  get busy() { return this.get('Pause').visible || this.get('Bag').visible; }`, `  get busy() { return this.get('Pause').visible; }`);
const COIN_FIRST = `export default class Coin extends Area2D {
  bodyEntered(body) {
    if (body.name !== 'Player') return;
    state.gold += 10;
    this.queueFree();
  }
}
`;

// ── the maps, the campfire, the title screen, the bag and the talk, each built in its own steps ─────────────────────

// A map's floor and its ring of wall, with a gap where a door will go.
const floorAndWalls = (path: string, name: string, floorTile: number, gap: [number, number]) => `const map = project.createScene('${path}', 'Node2D', '${name}')
map.add('TileMapLayer', { name: 'Floor', tileset: 'tilesets/dungeon.tileset' }).fill(0, 0, 20, 12, ${floorTile})
const walls = map.add('TileMapLayer', { name: 'Walls', tileset: 'tilesets/dungeon.tileset' })
for (let col = 0; col < 20; col++) { walls.setCell(col, 0, 40); walls.setCell(col, 11, 40) }   // the top and bottom rows
for (let row = 1; row < 11; row++) for (const col of [0, 19]) if (!(col === ${gap[0]} && row === ${gap[1]})) walls.setCell(col, row, 40)   // the sides, but not the gap`;
const MAP_TOWN = `// The town: a tileset cut from the Tiny Dungeon sheet (tile 40, a wall, is solid), a floor, and walls with a gap east.
project.setSettings({ background: '#141018', pixelArt: true, gravity: 0 })
project.createTileset('tilesets/dungeon.tileset', { image: '${SHEET}', tileWidth: 16, tileHeight: 16, solid: [40] })
${floorAndWalls('scenes/town.scene', 'Town', 48, [19, 5])}
project.setMainScene('scenes/town.scene')`;
const MAP_FOREST = `// The forest: the same, with a darker floor (tile 0) and the gap on the west side.
${floorAndWalls('scenes/forest.scene', 'Forest', 0, [0, 5])}`;
const MAP_HERO = `// The hero: a scene of its own (a body, a picture, a shape, a camera), put into both maps.
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_MOVES)})
const hero = project.createScene('scenes/player.scene', 'CharacterBody2D', 'Player')
hero.root.script = 'scripts/player.js'
hero.add('Sprite2D', { name: 'Sprite', texture: '${HERO}' })
hero.add('CollisionShape2D', { name: 'Shape', size: { x: 10, y: 10 } })
hero.add('Camera2D', { name: 'Camera', zoom: 3, smoothing: 8, limitTopLeft: { x: 0, y: 0 }, limitBottomRight: { x: 320, y: 192 } })
project.scene('scenes/town.scene').instance('scenes/player.scene', { name: 'Player', position: { x: ${AT.start.x}, y: ${AT.start.y} }, zIndex: 2 })
project.scene('scenes/forest.scene').instance('scenes/player.scene', { name: 'Player', position: { x: ${AT.fromTown.x}, y: ${AT.fromTown.y} }, zIndex: 2 })`;

const SAVE_CAMPFIRE = `// A campfire in the forest that saves the game, and a spawn point beside it where a loaded game wakes up.
project.writeScript('scripts/campfire.js', ${JSON.stringify(CAMPFIRE_SCRIPT)})
const forest = project.scene('scenes/forest.scene')
forest.add('Area2D', { name: 'Campfire', position: { x: ${AT.campfire.x}, y: ${AT.campfire.y} }, script: 'scripts/campfire.js' })
forest.add('Sprite2D', { name: 'Sprite', parent: 'Campfire', texture: '${FIRE}' })
forest.add('CollisionShape2D', { name: 'Shape', parent: 'Campfire', size: { x: 14, y: 14 } })
forest.add('Node2D', { name: 'Campfire', parent: 'Spawns', position: { x: ${AT.campfireSpawn.x}, y: ${AT.campfireSpawn.y} } })`;
const SAVE_TITLE = `// A title screen: the game's name, and N for a new game. The game now starts here.
project.addAction('new_game', ['KeyN'])
const title = project.createScene('scenes/title.scene', 'Node2D', 'Title')
title.add('Label', { name: 'Name', position: { x: 330, y: 150 }, fontSize: 48, color: '#ffd43b', text: 'Quest Buddies' })
title.add('Label', { name: 'NewGame', position: { x: 380, y: 260 }, fontSize: 24, text: 'N: new game' })
project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_KEYS)})
title.root.script = 'scripts/title.js'
project.setMainScene('scenes/title.scene')`;
const SAVE_CONTINUE = `// C: carry on from the saved game.
project.addAction('continue', ['KeyC'])
project.scene('scenes/title.scene').add('Label', { name: 'Continue', position: { x: 380, y: 300 }, fontSize: 24, text: 'C: continue' })
project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_CONTINUE_ALWAYS)})`;

const BAG = `// The bag: I opens and closes a panel, with a list that lays its rows out one under another.
project.addAction('inventory', ['KeyI'])
const hud = project.scene('scenes/hud.scene')
hud.add('Panel', { name: 'Bag', position: { x: 680, y: 70 }, size: { x: 260, y: 280 } })
hud.add('Label', { name: 'Title', parent: 'Bag', position: { x: 16, y: 12 }, fontSize: 20, text: 'Bag (I to close)' })
hud.add('VBoxContainer', { name: 'List', parent: 'Bag', position: { x: 16, y: 48 }, separation: 6 })
project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_BAG_ONLY)})`;

const HUD_TYPES = HUD_SAYS(HUD_TALKS).replace(/    if \(!input\.isJustPressed\('interact'\)[\s\S]*?if \(done\) done\(\);\n/, '');   // talk() and the typing; E comes next
const TALK_BOX = `// A dialogue box in the HUD that talk() types into, and two labels: a message at the top, a hint at the bottom.
project.addAction('interact', ['KeyE', 'Space'])
const hud = project.scene('scenes/hud.scene')
hud.add('Panel', { name: 'Dialogue', position: { x: 80, y: 370 }, size: { x: 800, y: 150 }, visible: false })
hud.add('Label', { name: 'Name', parent: 'Dialogue', position: { x: 20, y: 12 }, fontSize: 20, color: '#ffd43b', text: 'Name' })
hud.add('Label', { name: 'Text', parent: 'Dialogue', position: { x: 20, y: 44 }, fontSize: 22, wrapWidth: 760, text: '' })
hud.add('Label', { name: 'Message', position: { x: 360, y: 16 }, fontSize: 24, text: '' })
hud.add('Label', { name: 'Hint', position: { x: 420, y: 330 }, fontSize: 18, color: '#c5f6fa', text: '' })
project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_TYPES)})`;
const TALK_QUEST = `// The quest: the ranger in town who gives it, the amulet in the forest, and where the quest has got to, in state.
project.writeScript('scripts/game.js', ${JSON.stringify(GAME_QUEST)})
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_TALKS)})
project.writeScript('scripts/ranger.js', ${JSON.stringify(RANGER_PLAIN)})
project.writeScript('scripts/amulet.js', ${JSON.stringify(AMULET_TASK)})
const town = project.scene('scenes/town.scene')
town.add('Area2D', { name: 'Ranger', position: { x: 168, y: 72 }, script: 'scripts/ranger.js' })
town.add('Sprite2D', { name: 'Sprite', parent: 'Ranger', texture: '${RANGER}' })
town.add('CollisionShape2D', { name: 'Shape', parent: 'Ranger', shape: 'circle', size: { x: 40, y: 40 } })
const forest = project.scene('scenes/forest.scene')
forest.add('Area2D', { name: 'Amulet', position: { x: 280, y: 40 }, script: 'scripts/amulet.js' })
forest.add('Sprite2D', { name: 'Sprite', parent: 'Amulet', texture: '${AMULET}' })
forest.add('CollisionShape2D', { name: 'Shape', parent: 'Amulet', size: { x: 10, y: 10 } })`;

/** The chapter's tasks in order. Each starts exactly where the one before ends; qb-tour (lesson 11.1) opens the finished game. */
export const QB_CHAIN = ['qb-maps', 'qb-doors', 'qb-state', 'qb-save', 'qb-menus', 'qb-bars', 'qb-talk', 'qb-sounds'];

/** Each task's steps as Scene API code: steps[k] is what step k + 1 adds to what came before. */
export const QB_STEPS: Record<string, string[]> = {
  'qb-maps': [MAP_TOWN, MAP_FOREST, MAP_HERO],
  'qb-doors': [
    `project.writeScript('scripts/door.js', ${JSON.stringify(DOOR_FIRST)})
${doorNode('scenes/town.scene', 'Door to forest', AT.townDoor, 'scripts/door.js')}`,
    `project.scene('scenes/forest.scene').add('Node2D', { name: 'Spawns' })
project.scene('scenes/forest.scene').add('Node2D', { name: 'FromTown', parent: 'Spawns', position: { x: ${AT.fromTown.x}, y: ${AT.fromTown.y} } })
project.writeScript('scripts/door.js', ${JSON.stringify(DOOR_ARRIVES)})
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_SPAWNS)})`,
    `project.writeScript('scripts/door.js', ${JSON.stringify(DOOR_SCRIPT)})
project.writeScript('scripts/door_to_forest.js', ${JSON.stringify(doorTo('scenes/forest.scene', 'FromTown'))})
project.writeScript('scripts/door_to_town.js', ${JSON.stringify(doorTo('scenes/town.scene', 'FromForest'))})
project.scene('scenes/town.scene').get('Door to forest').script = 'scripts/door_to_forest.js'
${doorNode('scenes/forest.scene', 'Door to town', AT.forestDoor, 'scripts/door_to_town.js')}
project.scene('scenes/town.scene').add('Node2D', { name: 'Spawns' })
project.scene('scenes/town.scene').add('Node2D', { name: 'Start', parent: 'Spawns', position: { x: ${AT.start.x}, y: ${AT.start.y} } })
project.scene('scenes/town.scene').add('Node2D', { name: 'FromForest', parent: 'Spawns', position: { x: ${AT.fromForest.x}, y: ${AT.fromForest.y} } })`,
  ],
  'qb-state': [
    `project.writeScript('scripts/game.js', ${JSON.stringify(GAME_SCRIPT)})
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_STATE)})
project.writeSvg('assets/coin.svg', ${JSON.stringify(COIN_SVG)})
project.writeScript('scripts/coin.js', ${JSON.stringify(COIN_FIRST)})
project.scene('scenes/town.scene').add('Area2D', { name: 'Coin', position: { x: ${AT.coin.x}, y: ${AT.coin.y} }, script: 'scripts/coin.js' })
project.scene('scenes/town.scene').add('Sprite2D', { name: 'Sprite', parent: 'Coin', texture: 'assets/coin.svg' })
project.scene('scenes/town.scene').add('CollisionShape2D', { name: 'Shape', parent: 'Coin', shape: 'circle', size: { x: 10, y: 10 } })`,
    `project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_GOLD)})
const hud = project.createScene('scenes/hud.scene', 'CanvasLayer', 'HUD')
hud.root.script = 'scripts/hud.js'
hud.add('Label', { name: 'Gold', position: { x: 16, y: 12 }, fontSize: 24, color: '#ffd43b', text: 'Gold: 0' })
project.scene('scenes/town.scene').instance('scenes/hud.scene', { name: 'HUD' })
project.scene('scenes/forest.scene').instance('scenes/hud.scene', { name: 'HUD' })`,
    `project.writeScript('scripts/coin.js', ${JSON.stringify(COIN_SCRIPT)})`,
  ],
  'qb-save': [SAVE_CAMPFIRE, SAVE_TITLE, SAVE_CONTINUE, `project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_CONTINUES)})`],
  'qb-menus': [
    MENUS.slice(0, MENUS.indexOf("project.writeScript('scripts/title.js'")),
    `project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_BUTTONS)})`,
    MENUS.slice(MENUS.indexOf("project.addAction('menu'")),
  ],
  'qb-bars': [
    `project.writeScript('scripts/game.js', ${JSON.stringify(GAME_BARS)})
project.scene('scenes/hud.scene').add('ProgressBar', { name: 'Hp', position: { x: 16, y: 48 }, size: { x: 200, y: 20 }, value: 10, maxValue: 10, fillColor: '#e03131', showText: true })
project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_HP)})
project.writeScript('scripts/campfire.js', ${JSON.stringify(CAMPFIRE_HEALS)})`,
    BAG,
    `project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_BARS)})`,
  ],
  'qb-talk': [TALK_BOX, `project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_SAYS(HUD_TALKS))})`, TALK_QUEST],
  'qb-sounds': [
    `project.writeSound('assets/sounds/coin.wav', { wave: 'square', from: 880, to: 1760, length: 0.15, attack: 0.005, volume: 0.35 })`,
    SOUNDS.replace(/project\.writeSound\('assets\/sounds\/arrive\.wav'[^\n]*\n/, '').replace(/hud\.add\('AudioStreamPlayer', \{ name: 'Arrive'[^\n]*\n/, '').replace(/project\.writeScript\('scripts\/player\.js'[\s\S]*$/, '').trimEnd(),
    `project.writeSound('assets/sounds/arrive.wav', { wave: 'noise', from: 1500, to: 300, length: 0.35, attack: 0.02, volume: 0.25, seed: 7 })
project.scene('scenes/hud.scene').add('AudioStreamPlayer', { name: 'Arrive', parent: 'Sounds', stream: 'assets/sounds/arrive.wav' })
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_SOUNDS)})`,
  ],
  // Lesson 11.1's tour: open the finished game, then change two things in it.
  'qb-tour': [
    '',
    `project.writeScript('scripts/game.js', ${JSON.stringify(GAME_QUEST.replace('gold: 0,', 'gold: 25,'))})`,
    `project.writeScript('scripts/ranger.js', ${JSON.stringify(RANGER_PLAIN.replace('You there! I lost my amulet in the forest last night, running from the slimes.', 'Hello, traveller. Slimes chased me through the forest, and I dropped my amulet.'))})`,
  ],
};

const blocks = (steps: string[]) => steps.filter(Boolean).map((c) => `{\n${c}\n}`).join('\n');
/** A task's solution: its own steps. */
export const qbSolution = (taskId: string): string => blocks(QB_STEPS[taskId]);
/** The finished game: every step of every task, in order, from an empty project. */
export const QB_FINISHED = blocks(QB_CHAIN.flatMap((t) => QB_STEPS[t]));
/** A task's start: every step of the tasks before it (the tour starts from the finished game). */
export const qbStart = (taskId: string): string => taskId === 'qb-tour' ? QB_FINISHED : blocks(QB_CHAIN.slice(0, QB_CHAIN.indexOf(taskId)).flatMap((t) => QB_STEPS[t]));
/** Steps 1 to k + 1 of a task (run on top of the task's start). */
export const qbStepCode = (taskId: string, k: number): string => blocks((QB_STEPS[taskId] ?? []).slice(0, k + 1));
/** Step k + 1 of a task on its own (the step pictures do the steps one after another). */
export const qbStep = (taskId: string, k: number): string => QB_STEPS[taskId]?.[k] ?? '';
/** The finished game's scripts, for chapter 12 to build on. */
export const QB_FINAL = {
  game: GAME_QUEST, player: PLAYER_SOUNDS, hud: HUD_SAYS(HUD_TALKS), title: TITLE_BUTTONS, ranger: RANGER_PLAIN, amulet: AMULET_TASK,
  campfire: CAMPFIRE_HEALS, coin: COIN_SOUND, door: DOOR_SCRIPT,
};
export { IMAGES as QB_IMAGES, SHEET as QB_SHEET };
