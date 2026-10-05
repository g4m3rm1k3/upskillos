// Example: Quest Buddies, the RPG starter (docs/game-studio-starters-plan.md). Chapter 11 of the course builds it
// one feature at a time; this is the finished starter.
//
// What it shows, by lesson:
//   11.2  several maps and doors: scene.change, doors that say where they lead, named spawn points
//   11.3  game state that lasts: `state` holds the map, hit points, gold, the bag and the quests
//   11.4  saving and loading: the campfire saves into a slot; the title screen's Continue loads it
//   11.5  menus: the title screen and the pause menu are Panels with Buttons in a VBoxContainer
//   11.6  a health bar and an inventory list: a ProgressBar and a list that lays itself out
//   11.7  dialogue and a quest: a typewriter dialogue box, and a quest as a state machine
//   11.8  sound effects made from numbers, played by AudioStreamPlayers
//
// Built only with the real Scene API and the engine's real nodes and scripts: nothing here is special-cased (ADR 12).

import type { GameExample } from './types';

const SHEET = 'assets/tiny-dungeon/tilemap/tilemap_packed.png';   // Kenney Tiny Dungeon: 12 × 11 tiles of 16 px
const tile = (n: number) => `assets/tiny-dungeon/tiles/tile_${String(n).padStart(4, '0')}.png`;
const HERO = 98, RANGER = 112, DOOR = 45, FIRE = 29, AMULET = 101, WALL = 40;
const SAND = [48, 49, 51], DIRT = [0, 12, 24];

// ── scripts ─────────────────────────────────────────────────────────────

const game = `// What a new game starts with. Everything the game must remember, from map to map and in a saved game, is in
// state (lesson 11.3). Things that only matter for a moment (is a menu open?) stay on the nodes instead.
export function newGame() {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, {
    map: 'scenes/town.scene',     // where the player is
    arriveAt: 'Start',            // which spawn point of that map to stand on
    hp: 10, maxHp: 10,
    gold: 0,
    bag: [],                      // items: { name, note }
    quests: { amulet: 'not started' },   // not started → started → found → done (lesson 11.7)
  });
}
`;

const door = `// A door: walk into it and the game moves to another map (lesson 11.2). Each door is its own small script that
// extends this one and says where it leads: see door_to_forest.js.
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

const player = `import { newGame } from './game.js';

export default class Player extends CharacterBody2D {
  speed = 70;
  near = null;   // someone close enough to talk to (they set this when you walk up to them)

  ready() {
    // Run this scene on its own (F6) and there is no game yet: start one, so the map works.
    if (!state.quests) newGame();
    // Arriving through a door, or from a saved game: stand on the spawn point it names.
    const spawn = state.arriveAt && scene.find('Spawns/' + state.arriveAt);
    if (spawn) this.position = spawn.position;
    state.map = scene.path;
    scene.get('HUD/Sounds/Arrive').play();
  }

  physicsUpdate(dt) {
    // While a menu or a conversation is open, the hero stands still.
    if (scene.get('HUD').busy) { this.velocity = { x: 0, y: 0 }; return; }
    this.velocity = input.vector('move_left', 'move_right', 'move_up', 'move_down').scale(this.speed);
    this.moveAndSlide();
  }

  update(dt) {
    if (this.near && !scene.get('HUD').busy && input.isJustPressed('interact')) this.near.talk();
  }
}
`;

const ranger = `// The ranger gives the quest. What she says depends on where the quest has got to: a state machine (lesson 11.7).
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

const amulet = `// The quest's item. It is only in the forest while the quest is looking for it.
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

const campfire = `// A save point (lesson 11.4): rest here and the game is saved, with this campfire as where you will wake up.
export default class Campfire extends Area2D {
  bodyEntered(body) {
    if (body.name !== 'Player') return;
    state.hp = state.maxHp;
    state.arriveAt = 'Campfire';
    save.write('slot1');            // a copy of all of state
    scene.get('HUD/Sounds/Save').play();
    scene.get('HUD').say('Rested. Game saved.');
  }
}
`;

const hud = `// The HUD: health, gold, messages, the dialogue box, the pause menu and the bag. It is its own scene, put in every
// map as an instance, so every map has the same one.
export default class Hud extends CanvasLayer {
  lines = [];          // what is left to say
  shown = 0;           // letters of the current line shown so far
  done = null;         // what to do when the conversation ends
  messageFor = 0;

  // Whether the hero should stand still: a conversation, the pause menu or the bag is open.
  get busy() { return this.lines.length > 0 || this.get('Pause').visible || this.get('Bag').visible; }

  ready() {
    for (const name of ['Dialogue', 'Pause', 'Bag']) this.get(name).visible = false;
    const buttons = this.get('Pause/Buttons');
    buttons.get('Resume').connect('pressed', this, 'closePause');
    buttons.get('Title screen').connect('pressed', this, 'toTitle');
    for (const b of buttons.children) b.connect('pressed', () => this.get('Sounds/Click').play());
  }

  update(dt) {
    // The bars and numbers show what is in state, every frame.
    this.get('Status/Hp').maxValue = state.maxHp;
    this.get('Status/Hp').value = state.hp;
    this.get('Status/Gold').text = 'Gold: ' + state.gold;

    if (this.messageFor > 0) { this.messageFor -= dt; if (this.messageFor <= 0) this.get('Message').text = ''; }
    if (this.lines.length) { this.typewrite(dt); return; }
    if (input.isJustPressed('menu')) { if (this.get('Pause').visible) this.closePause(); else if (!this.get('Bag').visible) this.openPause(); }
    if (input.isJustPressed('inventory') && !this.get('Pause').visible) this.toggleBag();
  }

  // ── messages ──
  say(text) { this.get('Message').text = text; this.messageFor = 2.5; }
  hint(text) { this.get('Hint').text = text; }

  // ── dialogue (lesson 11.7) ──
  talk(name, lines, done = null) {
    this.get('Dialogue/Name').text = name;
    this.lines = [...lines];
    this.done = done;
    this.startLine();
    this.get('Dialogue').visible = true;
    this.openedOn = time.frame;   // the key press that opened it must not also skip the first line
  }

  startLine() {
    const text = this.get('Dialogue/Text');
    text.text = this.lines[0];
    this.shown = 0;
    text.visibleCharacters = 0;
  }

  typewrite(dt) {
    const text = this.get('Dialogue/Text');
    const before = Math.floor(this.shown);
    this.shown = Math.min(text.totalCharacters, this.shown + 40 * dt);   // 40 letters a second
    text.visibleCharacters = this.shown >= text.totalCharacters ? -1 : Math.floor(this.shown);   // −1: all of it
    if (Math.floor(this.shown) > before && Math.floor(this.shown) % 3 === 0) this.get('Sounds/Blip').play();
    if (!input.isJustPressed('interact') || time.frame === this.openedOn) return;
    // E finishes the line if it is still appearing, or goes on to the next.
    if (this.shown < text.totalCharacters) { this.shown = text.totalCharacters; text.visibleCharacters = -1; return; }
    this.lines.shift();
    if (this.lines.length) { this.startLine(); return; }
    this.get('Dialogue').visible = false;
    const done = this.done;
    this.done = null;
    if (done) done();
  }

  // ── the pause menu (lesson 11.5) ──
  openPause() {
    this.get('Pause').visible = true;
    this.get('Pause/Buttons/Resume').grabFocus();   // the arrow keys and Enter work at once
  }
  closePause() {
    this.get('Pause').visible = false;
    this.get('Pause/Buttons/Resume').releaseFocus();
  }
  toTitle() { scene.change('scenes/title.scene'); }

  // ── the bag (lesson 11.6): a list rebuilt from state each time it opens ──
  toggleBag() {
    const bag = this.get('Bag');
    bag.visible = !bag.visible;
    if (!bag.visible) return;
    const list = this.get('Bag/List');
    for (const row of list.children) row.queueFree();
    if (!state.bag.length) list.addChild(this.row('(empty)', '#8899aa'));
    for (const item of state.bag) list.addChild(this.row(item.name + ': ' + item.note, '#ffffff'));
  }
  row(text, color) {
    const label = new Label();
    label.text = text; label.fontSize = 16; label.color = color; label.wrapWidth = 230;
    return label;
  }
}
`;

const title = `import { newGame } from './game.js';

// The title screen (lesson 11.5): New game, Continue (only when there is a saved game), and How to play.
export default class Title extends Node2D {
  ready() {
    const buttons = this.get('Menu/Box/Buttons');
    buttons.get('Continue').disabled = !save.has('slot1');
    buttons.get('New game').connect('pressed', this, 'newGame');
    buttons.get('Continue').connect('pressed', this, 'continueGame');
    buttons.get('How to play').connect('pressed', this, 'howToPlay');
    buttons.get('New game').grabFocus();
    this.get('Menu/Box/Help').visible = false;
  }

  newGame() {
    newGame();
    scene.change(state.map);
  }

  continueGame() {
    save.load('slot1');        // everything in state, as it was saved
    scene.change(state.map);
  }

  howToPlay() {
    const help = this.get('Menu/Box/Help');
    help.visible = !help.visible;
  }
}
`;

// ── building it ─────────────────────────────────────────────────────────

/** Its scripts' text, for the chapter's tasks (tasks/questBuddies.ts) and for chapter 12's example, which changes some. */
export const QB_SCRIPTS = { game, door, player, ranger, amulet, campfire, hud, title };

/** The build code, with these scripts, and more code at the end (chapter 12's Adventure adds its own). */
export function questBuddiesCode(s: typeof QB_SCRIPTS = QB_SCRIPTS, more = ''): string {
  return `// Quest Buddies: an RPG starter. A title screen, two maps joined by doors, a quest, a save point and a HUD.
project.setSettings({ background: '#141018', pixelArt: true, gravity: 0 })
project.addAction('interact', ['KeyE', 'Space'])
project.addAction('menu', ['Escape'])
project.addAction('inventory', ['KeyI'])
project.createTileset('tilesets/dungeon.tileset', { image: '${SHEET}', tileWidth: 16, tileHeight: 16, solid: [${WALL}] })

// Sound effects, each made from a few numbers (lesson 11.8).
project.writeSound('assets/sounds/coin.wav', { wave: 'square', from: 880, to: 1760, length: 0.15, attack: 0.005, volume: 0.35 })
project.writeSound('assets/sounds/pickup.wav', { wave: 'triangle', from: 440, to: 880, length: 0.2, volume: 0.5 })
project.writeSound('assets/sounds/save.wav', { wave: 'sine', from: 523, to: 1046, length: 0.6, attack: 0.02, volume: 0.45 })
project.writeSound('assets/sounds/arrive.wav', { wave: 'noise', from: 1500, to: 300, length: 0.35, attack: 0.02, volume: 0.25, seed: 7 })
project.writeSound('assets/sounds/blip.wav', { wave: 'square', from: 700, to: 700, length: 0.03, attack: 0.002, volume: 0.12 })
project.writeSound('assets/sounds/click.wav', { wave: 'triangle', from: 600, to: 400, length: 0.06, volume: 0.4 })

// Scripts.
project.writeScript('scripts/game.js', ${JSON.stringify(s.game)})
project.writeScript('scripts/door.js', ${JSON.stringify(s.door)})
project.writeScript('scripts/door_to_forest.js', ${JSON.stringify(doorTo('scenes/forest.scene', 'FromTown'))})
project.writeScript('scripts/door_to_town.js', ${JSON.stringify(doorTo('scenes/town.scene', 'FromForest'))})
project.writeScript('scripts/player.js', ${JSON.stringify(s.player)})
project.writeScript('scripts/ranger.js', ${JSON.stringify(s.ranger)})
project.writeScript('scripts/amulet.js', ${JSON.stringify(s.amulet)})
project.writeScript('scripts/campfire.js', ${JSON.stringify(s.campfire)})
project.writeScript('scripts/hud.js', ${JSON.stringify(s.hud)})
project.writeScript('scripts/title.js', ${JSON.stringify(s.title)})

// The HUD scene: put into every map as an instance.
const hud = project.createScene('scenes/hud.scene', 'CanvasLayer', 'HUD')
hud.root.script = 'scripts/hud.js'
hud.add('Panel', { name: 'Status', position: { x: 10, y: 8 }, size: { x: 224, y: 70 }, color: '#141018', borderWidth: 0 })
hud.add('ProgressBar', { name: 'Hp', parent: 'Status', position: { x: 12, y: 10 }, size: { x: 200, y: 20 }, value: 10, maxValue: 10, fillColor: '#e03131', showText: true })
hud.add('Label', { name: 'Gold', parent: 'Status', position: { x: 12, y: 38 }, fontSize: 20, color: '#ffd43b', text: 'Gold: 0' })
hud.add('Label', { name: 'Message', position: { x: 360, y: 16 }, fontSize: 24, color: '#ffffff', text: '' })
hud.add('Label', { name: 'Hint', position: { x: 440, y: 500 }, fontSize: 18, color: '#c5f6fa', text: '' })
hud.add('Panel', { name: 'Dialogue', position: { x: 80, y: 370 }, size: { x: 800, y: 150 } })
hud.add('Label', { name: 'Name', parent: 'Dialogue', position: { x: 20, y: 12 }, fontSize: 20, color: '#ffd43b', text: 'Name' })
hud.add('Label', { name: 'Text', parent: 'Dialogue', position: { x: 20, y: 44 }, fontSize: 22, wrapWidth: 760, text: '' })
hud.add('Label', { name: 'Next', parent: 'Dialogue', position: { x: 700, y: 118 }, fontSize: 14, color: '#8899bb', text: 'E: next' })
hud.add('Panel', { name: 'Pause', position: { x: 330, y: 150 }, size: { x: 300, y: 200 } })
hud.add('Label', { name: 'Title', parent: 'Pause', position: { x: 105, y: 16 }, fontSize: 24, text: 'Paused' })
hud.add('VBoxContainer', { name: 'Buttons', parent: 'Pause', position: { x: 30, y: 64 }, separation: 12 })
hud.add('Button', { name: 'Resume', parent: 'Pause/Buttons', text: 'Resume', size: { x: 240, y: 44 } })
hud.add('Button', { name: 'Title screen', parent: 'Pause/Buttons', text: 'Title screen', size: { x: 240, y: 44 } })
hud.add('Panel', { name: 'Bag', position: { x: 680, y: 70 }, size: { x: 260, y: 280 } })
hud.add('Label', { name: 'Title', parent: 'Bag', position: { x: 16, y: 12 }, fontSize: 20, text: 'Bag (I to close)' })
hud.add('VBoxContainer', { name: 'List', parent: 'Bag', position: { x: 16, y: 48 }, separation: 6 })
hud.add('Node', { name: 'Sounds' })
for (const name of ['Coin', 'Pickup', 'Save', 'Arrive', 'Blip', 'Click']) hud.add('AudioStreamPlayer', { name, parent: 'Sounds', stream: 'assets/sounds/' + name.toLowerCase() + '.wav' })

// The hero, its own scene too, so both maps use the same one.
const hero = project.createScene('scenes/player.scene', 'CharacterBody2D', 'Player')
hero.root.script = 'scripts/player.js'
hero.add('Sprite2D', { name: 'Sprite', texture: '${tile(HERO)}' })
hero.add('CollisionShape2D', { name: 'Shape', size: { x: 10, y: 10 } })
hero.add('Camera2D', { name: 'Camera', zoom: 3, smoothing: 8, limitTopLeft: { x: 0, y: 0 }, limitBottomRight: { x: 320, y: 192 } })

// A map: floor, a ring of wall with a gap for each door, and named spawn points.
function map(path, name, floorTiles, gaps) {
  const s = project.createScene(path, 'Node2D', name)
  const floor = s.add('TileMapLayer', { name: 'Floor', tileset: 'tilesets/dungeon.tileset' })
  floor.fill(0, 0, 20, 12, floorTiles[0])
  for (let row = 1; row < 11; row++) for (let col = 1; col < 19; col++) if ((row * 7 + col * 3) % 5 === 0) floor.setCell(col, row, floorTiles[1 + (col % 2)])
  const walls = s.add('TileMapLayer', { name: 'Walls', tileset: 'tilesets/dungeon.tileset' })
  for (let col = 0; col < 20; col++) { walls.setCell(col, 0, ${WALL}); walls.setCell(col, 11, ${WALL}) }
  for (let row = 1; row < 11; row++) for (const col of [0, 19]) if (!gaps.some(([c, r]) => c === col && r === row)) walls.setCell(col, row, ${WALL})
  s.add('Node2D', { name: 'Spawns' })
  return s
}
function doorway(s, name, col, row, script) {
  const d = s.add('Area2D', { name, position: { x: 8 + 16 * col, y: 8 + 16 * row }, script })
  s.add('Sprite2D', { name: 'Sprite', parent: d.path, texture: '${tile(DOOR)}' })
  s.add('CollisionShape2D', { name: 'Shape', parent: d.path, size: { x: 12, y: 14 } })
}

// The town: the ranger, and a door east to the forest.
const town = map('scenes/town.scene', 'Town', [${SAND.join(', ')}], [[19, 5]])
town.add('Node2D', { name: 'Start', parent: 'Spawns', position: { x: 56, y: 96 } })
town.add('Node2D', { name: 'FromForest', parent: 'Spawns', position: { x: 280, y: 88 } })
doorway(town, 'Door to forest', 19, 5, 'scripts/door_to_forest.js')
town.add('Area2D', { name: 'Ranger', position: { x: 168, y: 72 }, script: 'scripts/ranger.js' })
town.add('Sprite2D', { name: 'Sprite', parent: 'Ranger', texture: '${tile(RANGER)}' })
town.add('CollisionShape2D', { name: 'Shape', parent: 'Ranger', shape: 'circle', size: { x: 40, y: 40 } })
town.instance('scenes/player.scene', { name: 'Player', position: { x: 56, y: 96 }, zIndex: 2 })
town.instance('scenes/hud.scene', { name: 'HUD' })

// The forest: a door west back to town, the campfire that saves, and (during the quest) the amulet.
const forest = map('scenes/forest.scene', 'Forest', [${DIRT.join(', ')}], [[0, 5]])
forest.add('Node2D', { name: 'FromTown', parent: 'Spawns', position: { x: 32, y: 88 } })
forest.add('Node2D', { name: 'Campfire', parent: 'Spawns', position: { x: 160, y: 132 } })
doorway(forest, 'Door to town', 0, 5, 'scripts/door_to_town.js')
forest.add('Area2D', { name: 'Campfire', position: { x: 160, y: 152 }, script: 'scripts/campfire.js' })
forest.add('Sprite2D', { name: 'Sprite', parent: 'Campfire', texture: '${tile(FIRE)}' })
forest.add('CollisionShape2D', { name: 'Shape', parent: 'Campfire', size: { x: 14, y: 14 } })
forest.add('Area2D', { name: 'Amulet', position: { x: 280, y: 40 }, script: 'scripts/amulet.js' })
forest.add('Sprite2D', { name: 'Sprite', parent: 'Amulet', texture: '${tile(AMULET)}' })
forest.add('CollisionShape2D', { name: 'Shape', parent: 'Amulet', size: { x: 10, y: 10 } })
forest.instance('scenes/player.scene', { name: 'Player', position: { x: 32, y: 88 }, zIndex: 2 })   // where it stands when the forest is run on its own (F6)
forest.instance('scenes/hud.scene', { name: 'HUD' })

// The title screen: where the game starts.
const titleScreen = project.createScene('scenes/title.scene', 'Node2D', 'Title')
titleScreen.root.script = 'scripts/title.js'
titleScreen.add('CanvasLayer', { name: 'Menu' })
titleScreen.add('Panel', { name: 'Box', parent: 'Menu', position: { x: 290, y: 60 }, size: { x: 380, y: 420 } })
titleScreen.add('Label', { name: 'Name', parent: 'Menu/Box', position: { x: 70, y: 24 }, fontSize: 40, color: '#ffd43b', text: 'Quest Buddies' })
titleScreen.add('VBoxContainer', { name: 'Buttons', parent: 'Menu/Box', position: { x: 40, y: 110 }, separation: 14 })
for (const name of ['New game', 'Continue', 'How to play']) titleScreen.add('Button', { name, parent: 'Menu/Box/Buttons', text: name, size: { x: 300, y: 48 } })
titleScreen.add('Label', { name: 'Help', parent: 'Menu/Box', position: { x: 40, y: 300 }, fontSize: 16, wrapWidth: 300, text: 'Arrow keys or WASD: walk. E: talk and read on. I: your bag. Esc: pause. Rest at a campfire to save.' })
project.setMainScene('scenes/title.scene')
${more}`;
}

const code = questBuddiesCode();

export const questBuddies: GameExample = {
  id: 'quest-buddies',
  title: 'Quest Buddies',
  blurb: 'The RPG starter: a title screen, two maps joined by doors, a quest from a ranger, a campfire that saves the game, a HUD with a health bar, a bag, a pause menu and typewriter dialogue, and sound effects made from numbers. Chapter 11 builds it a feature at a time.',
  art: 'Kenney Tiny Dungeon (CC0)',
  images: [SHEET, ...[HERO, RANGER, DOOR, FIRE, AMULET].map(tile)],
  code,
  guide: [
    'Press ▶ Run (F5). On the title screen the arrow keys and Enter work the menu (or click). Choose New game.',
    'Walk with the arrow keys or WASD. Go up to the ranger and press E to talk; E again reads on. She gives you a quest.',
    'The door on the east wall leads to the forest: scripts/door_to_forest.js says where, and which spawn point (Spawns/FromTown) to stand on there. The game remembers everything in state (scripts/game.js lists it), so the quest is still started when you arrive.',
    'Find the amulet in the forest, then rest at the campfire: it saves the game (Output says "Saved to slot \\"slot1\\""). Stop, run again, and choose Continue: you wake at the campfire with the amulet in your bag (press I).',
    'Esc opens the pause menu: Panel, Buttons in a VBoxContainer, and the focus on Resume so the keys work. Open scenes/hud.scene to see the whole HUD; it is put into both maps as an instance.',
    'Open assets/sounds/coin.wav in Files: a sound made from a few numbers, beside its waveform. Change "to" and press ▶ Hear it.',
    'Run › Clear saved games starts you fresh.',
  ],
};
