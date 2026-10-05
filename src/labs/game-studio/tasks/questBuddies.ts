// Chapter 11 of the course, "Quest Buddies": the RPG starter built a feature at a time
// (docs/game-studio-starters-plan.md). Each task starts where the one before it ends: its start is the previous
// task's start plus its solution, so doing them in order builds the game from an empty project. The first task
// opens the finished starter (examples/questBuddies.ts) to play and change.

import type { GameTask, PlayOptions } from './types';
import type { Game } from '../engine/game';
import { named, noErrors, type Pos } from './helpers';
import { questBuddies, QB_SCRIPTS } from '../examples/questBuddies';

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
const HUD_TALKS = HUD_BARS.replace(`  get busy() { return this.get('Pause').visible || this.get('Bag').visible; }`, `  lines = [];      // what is left to say
  shown = 0;       // letters of the current line shown so far
  done = null;     // what to run when the conversation ends

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
const RANGER_TASK = QB_SCRIPTS.ranger;
const AMULET_TASK = QB_SCRIPTS.amulet.replace("state.quests?.amulet", "state.quests.amulet").replace(`    scene.get('HUD/Sounds/Pickup').play();
`, '');
const RANGER_PLAIN = RANGER_TASK.replace(`        scene.get('HUD/Sounds/Coin').play();
`, '');

// ── stage code: each task's solution, and so the next task's start ──────

const BASE = `// Quest Buddies, the start: two maps of floor and wall, and a hero who walks.
project.setSettings({ background: '#141018', pixelArt: true, gravity: 0 })
project.createTileset('tilesets/dungeon.tileset', { image: '${SHEET}', tileWidth: 16, tileHeight: 16, solid: [40] })
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_MOVES)})
const hero = project.createScene('scenes/player.scene', 'CharacterBody2D', 'Player')
hero.root.script = 'scripts/player.js'
hero.add('Sprite2D', { name: 'Sprite', texture: '${HERO}' })
hero.add('CollisionShape2D', { name: 'Shape', size: { x: 10, y: 10 } })
hero.add('Camera2D', { name: 'Camera', zoom: 3, smoothing: 8, limitTopLeft: { x: 0, y: 0 }, limitBottomRight: { x: 320, y: 192 } })
// A map: a floor, a ring of wall with a gap where a door will go, and a hero.
function map(path, name, floorTile, gap) {
  const s = project.createScene(path, 'Node2D', name)
  s.add('TileMapLayer', { name: 'Floor', tileset: 'tilesets/dungeon.tileset' }).fill(0, 0, 20, 12, floorTile)
  const walls = s.add('TileMapLayer', { name: 'Walls', tileset: 'tilesets/dungeon.tileset' })
  for (let col = 0; col < 20; col++) { walls.setCell(col, 0, 40); walls.setCell(col, 11, 40) }
  for (let row = 1; row < 11; row++) for (const col of [0, 19]) if (!(col === gap[0] && row === gap[1])) walls.setCell(col, row, 40)
  s.instance('scenes/player.scene', { name: 'Player', position: { x: ${AT.start.x}, y: ${AT.start.y} }, zIndex: 2 })
  return s
}
map('scenes/town.scene', 'Town', 48, [19, 5])
map('scenes/forest.scene', 'Forest', 0, [0, 5])
project.setMainScene('scenes/town.scene')`;

const doorNode = (scene: string, name: string, at: Pos, script: string) => `project.scene('${scene}').add('Area2D', { name: '${name}', position: { x: ${at.x}, y: ${at.y} }, script: '${script}' })
project.scene('${scene}').add('Sprite2D', { name: 'Sprite', parent: '${name}', texture: '${DOOR}' })
project.scene('${scene}').add('CollisionShape2D', { name: 'Shape', parent: '${name}', size: { x: 12, y: 14 } })`;

const DOORS = `// Doors: each says where it leads and where to stand there.
project.writeScript('scripts/door.js', ${JSON.stringify(DOOR_SCRIPT)})
project.writeScript('scripts/door_to_forest.js', ${JSON.stringify(doorTo('scenes/forest.scene', 'FromTown'))})
project.writeScript('scripts/door_to_town.js', ${JSON.stringify(doorTo('scenes/town.scene', 'FromForest'))})
${doorNode('scenes/town.scene', 'Door to forest', AT.townDoor, 'scripts/door_to_forest.js')}
${doorNode('scenes/forest.scene', 'Door to town', AT.forestDoor, 'scripts/door_to_town.js')}
project.scene('scenes/town.scene').add('Node2D', { name: 'Spawns' })
project.scene('scenes/town.scene').add('Node2D', { name: 'Start', parent: 'Spawns', position: { x: ${AT.start.x}, y: ${AT.start.y} } })
project.scene('scenes/town.scene').add('Node2D', { name: 'FromForest', parent: 'Spawns', position: { x: ${AT.fromForest.x}, y: ${AT.fromForest.y} } })
project.scene('scenes/forest.scene').add('Node2D', { name: 'Spawns' })
project.scene('scenes/forest.scene').add('Node2D', { name: 'FromTown', parent: 'Spawns', position: { x: ${AT.fromTown.x}, y: ${AT.fromTown.y} } })
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_SPAWNS)})`;

const COIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5" fill="#ffd43b" stroke="#b08900" stroke-width="1.5"/></svg>';
const STATE = `// State: a starting game, a coin that is remembered, and gold shown on every map.
project.writeScript('scripts/game.js', ${JSON.stringify(GAME_SCRIPT)})
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_STATE)})
project.writeSvg('assets/coin.svg', ${JSON.stringify(COIN_SVG)})
project.writeScript('scripts/coin.js', ${JSON.stringify(COIN_SCRIPT)})
project.scene('scenes/town.scene').add('Area2D', { name: 'Coin', position: { x: ${AT.coin.x}, y: ${AT.coin.y} }, script: 'scripts/coin.js' })
project.scene('scenes/town.scene').add('Sprite2D', { name: 'Sprite', parent: 'Coin', texture: 'assets/coin.svg' })
project.scene('scenes/town.scene').add('CollisionShape2D', { name: 'Shape', parent: 'Coin', shape: 'circle', size: { x: 10, y: 10 } })
project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_GOLD)})
const hud = project.createScene('scenes/hud.scene', 'CanvasLayer', 'HUD')
hud.root.script = 'scripts/hud.js'
hud.add('Label', { name: 'Gold', position: { x: 16, y: 12 }, fontSize: 24, color: '#ffd43b', text: 'Gold: 0' })
project.scene('scenes/town.scene').instance('scenes/hud.scene', { name: 'HUD' })
project.scene('scenes/forest.scene').instance('scenes/hud.scene', { name: 'HUD' })`;

const SAVING_START = `// A campfire in the forest, and a title screen that starts a new game with N.
project.scene('scenes/forest.scene').add('Area2D', { name: 'Campfire', position: { x: ${AT.campfire.x}, y: ${AT.campfire.y} } })
project.scene('scenes/forest.scene').add('Sprite2D', { name: 'Sprite', parent: 'Campfire', texture: '${FIRE}' })
project.scene('scenes/forest.scene').add('CollisionShape2D', { name: 'Shape', parent: 'Campfire', size: { x: 14, y: 14 } })
project.scene('scenes/forest.scene').add('Node2D', { name: 'Campfire', parent: 'Spawns', position: { x: ${AT.campfireSpawn.x}, y: ${AT.campfireSpawn.y} } })
project.addAction('new_game', ['KeyN'])
project.addAction('continue', ['KeyC'])
const title = project.createScene('scenes/title.scene', 'Node2D', 'Title')
title.add('Label', { name: 'Name', position: { x: 330, y: 150 }, fontSize: 48, color: '#ffd43b', text: 'Quest Buddies' })
title.add('Label', { name: 'NewGame', position: { x: 380, y: 260 }, fontSize: 24, text: 'N: new game' })
title.add('Label', { name: 'Continue', position: { x: 380, y: 300 }, fontSize: 24, text: 'C: continue' })
project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_KEYS)})
title.root.script = 'scripts/title.js'
project.setMainScene('scenes/title.scene')`;
const SAVING = `project.writeScript('scripts/campfire.js', ${JSON.stringify(CAMPFIRE_SCRIPT)})
project.scene('scenes/forest.scene').get('Campfire').script = 'scripts/campfire.js'
project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_CONTINUES)})`;

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

const BARS_START = `project.addAction('inventory', ['KeyI'])`;
const BARS = `// A health bar and a bag that lists what you carry.
project.writeScript('scripts/game.js', ${JSON.stringify(GAME_BARS)})
const hud = project.scene('scenes/hud.scene')
hud.add('ProgressBar', { name: 'Hp', position: { x: 16, y: 48 }, size: { x: 200, y: 20 }, value: 10, maxValue: 10, fillColor: '#e03131', showText: true })
hud.add('Panel', { name: 'Bag', position: { x: 680, y: 70 }, size: { x: 260, y: 280 } })
hud.add('Label', { name: 'Title', parent: 'Bag', position: { x: 16, y: 12 }, fontSize: 20, text: 'Bag (I to close)' })
hud.add('VBoxContainer', { name: 'List', parent: 'Bag', position: { x: 16, y: 48 }, separation: 6 })
project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_BARS)})`;

const TALK_START = `// The ranger in town, the amulet in the forest, and an empty dialogue box in the HUD.
project.addAction('interact', ['KeyE', 'Space'])
const town = project.scene('scenes/town.scene')
town.add('Area2D', { name: 'Ranger', position: { x: 168, y: 72 } })
town.add('Sprite2D', { name: 'Sprite', parent: 'Ranger', texture: '${RANGER}' })
town.add('CollisionShape2D', { name: 'Shape', parent: 'Ranger', shape: 'circle', size: { x: 40, y: 40 } })
const forest = project.scene('scenes/forest.scene')
forest.add('Area2D', { name: 'Amulet', position: { x: 280, y: 40 } })
forest.add('Sprite2D', { name: 'Sprite', parent: 'Amulet', texture: '${AMULET}' })
forest.add('CollisionShape2D', { name: 'Shape', parent: 'Amulet', size: { x: 10, y: 10 } })
const hud = project.scene('scenes/hud.scene')
hud.add('Panel', { name: 'Dialogue', position: { x: 80, y: 370 }, size: { x: 800, y: 150 }, visible: false })
hud.add('Label', { name: 'Name', parent: 'Dialogue', position: { x: 20, y: 12 }, fontSize: 20, color: '#ffd43b', text: 'Name' })
hud.add('Label', { name: 'Text', parent: 'Dialogue', position: { x: 20, y: 44 }, fontSize: 22, wrapWidth: 760, text: '' })
hud.add('Label', { name: 'Message', position: { x: 360, y: 16 }, fontSize: 24, text: '' })`;
const HUD_SAYS = (src: string) => src.replace(`  toTitle() {`, `  say(text) { this.get('Message').text = text; }
  hint(text) { }

  toTitle() {`);
const TALK = `project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_SAYS(HUD_TALKS))})
project.writeScript('scripts/game.js', ${JSON.stringify(GAME_QUEST)})
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_TALKS)})
project.writeScript('scripts/ranger.js', ${JSON.stringify(RANGER_PLAIN)})
project.writeScript('scripts/amulet.js', ${JSON.stringify(AMULET_TASK)})
project.scene('scenes/town.scene').get('Ranger').script = 'scripts/ranger.js'
project.scene('scenes/forest.scene').get('Amulet').script = 'scripts/amulet.js'`;

const SOUNDS = `// Sound effects made from numbers, played by AudioStreamPlayers in the HUD.
project.writeSound('assets/sounds/coin.wav', { wave: 'square', from: 880, to: 1760, length: 0.15, attack: 0.005, volume: 0.35 })
project.writeSound('assets/sounds/arrive.wav', { wave: 'noise', from: 1500, to: 300, length: 0.35, attack: 0.02, volume: 0.25, seed: 7 })
const hud = project.scene('scenes/hud.scene')
hud.add('Node', { name: 'Sounds' })
hud.add('AudioStreamPlayer', { name: 'Coin', parent: 'Sounds', stream: 'assets/sounds/coin.wav' })
hud.add('AudioStreamPlayer', { name: 'Arrive', parent: 'Sounds', stream: 'assets/sounds/arrive.wav' })
project.writeScript('scripts/coin.js', ${JSON.stringify(COIN_SCRIPT.replace(`    state.gold += 10;
`, `    state.gold += 10;
    scene.get('HUD/Sounds/Coin').play();
`))})
project.writeScript('scripts/player.js', ${JSON.stringify(PLAYER_TALKS.replace(`    state.map = scene.path;   // so a saved game knows which map to load
`, `    state.map = scene.path;   // so a saved game knows which map to load
    scene.get('HUD/Sounds/Arrive').play();
`))})`;

/** A task's start: the stages before it, each in its own block, so two stages can each name a scene title or hud. */
const stages = (...code: string[]) => code.map((c) => `{\n${c}\n}`).join('\n');

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
    images: questBuddies.images,
    start: questBuddies.code,
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
    solution: `project.writeScript('scripts/game.js', ${JSON.stringify(QB_SCRIPTS.game.replace('gold: 0,', 'gold: 25,'))})
project.writeScript('scripts/ranger.js', ${JSON.stringify(QB_SCRIPTS.ranger.replace('You there! I lost my amulet in the forest last night, running from the slimes.', 'Hello, traveller. Slimes chased me through the forest, and I dropped my amulet.'))})`,
    done: 'You played it and changed it. Back in the lesson: how an RPG is put together, and the plan for building this one yourself.',
  },
  {
    id: 'qb-doors',
    chain: 'Quest Buddies',
    title: 'Two maps and the doors between them',
    goal: 'A door that takes the hero from the town to the forest, arriving in the right place, and a door back.',
    images: IMAGES,
    start: BASE,
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
    solution: DOORS,
    done: 'Two maps joined by doors. Back in the lesson: scene.change, spawn points, and why each door is its own small class.',
  },
  {
    id: 'qb-state',
    chain: 'Quest Buddies',
    title: 'Game state that lasts',
    goal: 'Gold that stays when you change map, a HUD that shows it on every map, and a coin that stays taken.',
    images: IMAGES,
    start: stages(BASE, DOORS),
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
    solution: STATE,
    done: 'State that lasts from map to map. Back in the lesson: what belongs in state, and what does not.',
  },
  {
    id: 'qb-save',
    chain: 'Quest Buddies',
    title: 'Saving and loading',
    goal: 'A campfire that saves the game, and a title screen whose Continue loads it.',
    images: IMAGES,
    start: stages(BASE, DOORS, STATE, SAVING_START),
    steps: [
      { text: 'Give the Campfire in the forest a script: when Player walks in, set state.arriveAt = \'Campfire\' (there is a spawn point of that name) and save.write(\'slot1\'). Run, walk to it, and Output says Saved to slot "slot1".',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.4, setup: (g) => { g.sceneApi.change('scenes/forest.scene'); }, ...route([['scenes/forest.scene', AT.campfire]]) });
          noErrors(r);
          const g = r.game as G;
          if (!g.save.has('slot1')) return 'Walking onto the campfire saves nothing in slot1 yet.';
          const saved = g.save.read('slot1') as Record<string, unknown>;
          if (saved.arriveAt !== 'Campfire') return `The save says arriveAt is ${JSON.stringify(saved.arriveAt)}: set it to 'Campfire' before saving, so a loaded game wakes at the campfire.`;
          return saved.map === 'scenes/forest.scene' || `The save says the map is ${JSON.stringify(saved.map)}: player.js should keep state.map up to date.`;
        } } },
      { text: 'In title.js, when continue (C) is pressed and save.has(\'slot1\'), call save.load(\'slot1\') and scene.change(state.map).',
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
    solution: SAVING,
    done: 'A game that can be saved and continued. Back in the lesson: what a save is, why it is a copy, and saves from older versions of your game.',
  },
  {
    id: 'qb-menus',
    chain: 'Quest Buddies',
    title: 'Menus with buttons',
    goal: 'A title screen made of buttons that the mouse or the keys can work, and a pause menu.',
    images: IMAGES,
    start: stages(BASE, DOORS, STATE, SAVING_START, SAVING),
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
    solution: MENUS,
    done: 'Menus that work with the mouse or the keys. Back in the lesson: signals, focus, and why a container beats placing buttons by hand.',
  },
  {
    id: 'qb-bars',
    chain: 'Quest Buddies',
    title: 'A health bar and a bag',
    goal: 'Hit points shown as a bar, and a bag that lists what you carry, both read from state.',
    images: IMAGES,
    start: stages(BASE, DOORS, STATE, SAVING_START, SAVING, MENUS, BARS_START),
    steps: [
      { text: 'Add hp: 10, maxHp: 10 and bag: [] to newGame() in game.js. In hud.scene add a ProgressBar Hp (fill colour red, showText on); in the HUD script set its maxValue and value from state every frame.',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.2, setup: onMap('scenes/town.scene'), watch: (() => { let set = false; return (g: Game) => { const st = (g as G).state; if (!set && st.gold !== undefined) { set = true; st.hp = 4; st.maxHp = 12; } }; })() });
          noErrors(r);
          const bar = at<{ value: number; maxValue: number }>(r.game, 'HUD/Hp');
          if (!bar) return 'There is no ProgressBar called Hp in the HUD yet.';
          return (bar.value === 4 && bar.maxValue === 12) || `With state.hp 4 of 12 the bar shows ${bar.value} of ${bar.maxValue}: set value and maxValue from state every frame.`;
        } } },
      { text: 'The bag: in hud.scene add a Panel Bag with a VBoxContainer List in it. The HUD hides Bag at the start; the inventory action (I) shows and hides it. Each time it opens, empty List and add a Label for each item in state.bag (item.name and item.note).',
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
    solution: BARS,
    done: 'A HUD that shows state. Back in the lesson: how the bar fills, how the list lays itself out, and rebuilding a list from data.',
  },
  {
    id: 'qb-talk',
    chain: 'Quest Buddies',
    title: 'Dialogue and a quest',
    goal: 'A dialogue box that types its lines out, and a quest that moves through its stages as you play.',
    images: IMAGES,
    start: stages(BASE, DOORS, STATE, SAVING_START, SAVING, MENUS, BARS_START, BARS, TALK_START),
    steps: [
      { text: 'Give the HUD a method talk(name, lines, done): put the name in Dialogue/Name, keep the lines, show Dialogue, and type the first line out at 40 letters a second with Dialogue/Text’s visibleCharacters (−1 when it is all shown).',
        check: { kind: 'play', test: async (v) => {
          const r = await v.play({ seconds: 0.25, setup: onMap('scenes/town.scene'), watch: (() => { let said = false; return (g: Game) => { const h = g.root.find('HUD') as unknown as { talk?: (n: string, l: string[]) => void } | null; if (!said && h?.talk && g.time.frame >= 3) { said = true; h.talk('Test', ['Hello there, traveller, and welcome.']); } }; })() });
          noErrors(r);
          const box = at<{ visible: boolean }>(r.game, 'HUD/Dialogue'), text = at<{ visibleCharacters: number; text: string }>(r.game, 'HUD/Dialogue/Text');
          if (!(r.game.root.find('HUD') as unknown as { talk?: unknown })?.talk) return 'The HUD has no talk method yet.';
          if (!box?.visible) return 'After talk(), HUD/Dialogue should be visible.';
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
      { text: 'The quest: give the Ranger and the Amulet their scripts (scripts/ranger.js and amulet.js are a good start, from the finished starter). Talking to her moves state.quests.amulet from not started to started; picking up the amulet (only there while started) to found, with it in state.bag; talking again to done, with 50 gold.',
        hint: 'The player needs near: the Ranger sets body.near = this in bodyEntered; player.js calls this.near.talk() on E.',
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
    solution: TALK,
    done: 'A conversation and a quest. Back in the lesson: the typewriter, and a quest as a state machine.',
  },
  {
    id: 'qb-sounds',
    chain: 'Quest Buddies',
    title: 'Sound effects from numbers',
    goal: 'Make a coin sound and a whoosh from a few numbers each, and play them when they happen.',
    images: IMAGES,
    start: stages(BASE, DOORS, STATE, SAVING_START, SAVING, MENUS, BARS_START, BARS, TALK_START, TALK),
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
    solution: SOUNDS,
    done: 'Sounds made from numbers. Back in the lesson: what the numbers mean, from hertz and octaves to the shape of a wave.',
  },
];

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

/** Each task's steps as Scene API code: steps[k] is what step k + 1 adds to what came before. */
const QB_STEPS: Record<string, string[]> = {
  'qb-tour': [
    '',
    `project.writeScript('scripts/game.js', ${JSON.stringify(QB_SCRIPTS.game.replace('gold: 0,', 'gold: 25,'))})`,
    `project.writeScript('scripts/ranger.js', ${JSON.stringify(QB_SCRIPTS.ranger.replace('You there! I lost my amulet in the forest last night, running from the slimes.', 'Hello, traveller. Slimes chased me through the forest, and I dropped my amulet.'))})`,
  ],
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
  'qb-save': [
    `project.writeScript('scripts/campfire.js', ${JSON.stringify(CAMPFIRE_SCRIPT)})
project.scene('scenes/forest.scene').get('Campfire').script = 'scripts/campfire.js'`,
    `project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_CONTINUE_ALWAYS)})`,
    `project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_CONTINUES)})`,
  ],
  'qb-menus': [
    MENUS.slice(0, MENUS.indexOf("project.writeScript('scripts/title.js'")),
    `project.writeScript('scripts/title.js', ${JSON.stringify(TITLE_BUTTONS)})`,
    MENUS.slice(MENUS.indexOf("project.addAction('menu'")),
  ],
  'qb-bars': [
    `project.writeScript('scripts/game.js', ${JSON.stringify(GAME_BARS)})
project.scene('scenes/hud.scene').add('ProgressBar', { name: 'Hp', position: { x: 16, y: 48 }, size: { x: 200, y: 20 }, value: 10, maxValue: 10, fillColor: '#e03131', showText: true })
project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_HP)})`,
    `const hud = project.scene('scenes/hud.scene')
hud.add('Panel', { name: 'Bag', position: { x: 680, y: 70 }, size: { x: 260, y: 280 } })
hud.add('Label', { name: 'Title', parent: 'Bag', position: { x: 16, y: 12 }, fontSize: 20, text: 'Bag (I to close)' })
hud.add('VBoxContainer', { name: 'List', parent: 'Bag', position: { x: 16, y: 48 }, separation: 6 })
project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_BAG_ONLY)})`,
    `project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_BARS)})`,
  ],
  'qb-talk': [
    `project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_SAYS(HUD_TALKS).replace("    if (!input.isJustPressed('interact') || time.frame === this.openedOn) return;", '    return;   // E comes next\n    if (!input.isJustPressed(\'interact\') || time.frame === this.openedOn) return;'))})`,
    `project.writeScript('scripts/hud.js', ${JSON.stringify(HUD_SAYS(HUD_TALKS))})`,
    TALK.slice(TALK.indexOf("project.writeScript('scripts/game.js'")),
  ],
  'qb-sounds': [
    `project.writeSound('assets/sounds/coin.wav', { wave: 'square', from: 880, to: 1760, length: 0.15, attack: 0.005, volume: 0.35 })`,
    SOUNDS.replace(/project\.writeSound\('assets\/sounds\/arrive\.wav'[^\n]*\n/, '').replace(/hud\.add\('AudioStreamPlayer', \{ name: 'Arrive'[^\n]*\n/, '').replace(/project\.writeScript\('scripts\/player\.js'[\s\S]*$/, ''),
    `project.writeSound('assets/sounds/arrive.wav', { wave: 'noise', from: 1500, to: 300, length: 0.35, attack: 0.02, volume: 0.25, seed: 7 })
project.scene('scenes/hud.scene').add('AudioStreamPlayer', { name: 'Arrive', parent: 'Sounds', stream: 'assets/sounds/arrive.wav' })
${SOUNDS.slice(SOUNDS.indexOf("project.writeScript('scripts/player.js'"))}`,
  ],
};

/** Steps 1 to k + 1 of a Quest Buddies task as one piece of code, each step in its own block. */
export function qbStepCode(taskId: string, k: number): string {
  const steps = QB_STEPS[taskId];
  if (!steps) throw new Error(`No steps for ${taskId}`);
  return steps.slice(0, k + 1).filter(Boolean).map((c) => `{\n${c}\n}`).join('\n');
}

/** Step k + 1 of a Quest Buddies task on its own (for the step pictures, which do the steps one after another). */
export const qbStep = (taskId: string, k: number): string => QB_STEPS[taskId]?.[k] ?? '';
