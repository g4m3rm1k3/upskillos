// The Game API reference: every class, property, method and global a script can use,
// what it does, and what it is called in Godot. One source for three things:
//   - the Reference panel in the editor (Help › API reference, F1);
//   - the script editor's completion and hover (engineDts() below);
//   - apiReference.test.ts, which checks this against the real engine both ways: every
//     entry exists, and nothing a script can reach is missing (ADR 5).
//
// Properties shown in the Inspector are not written out here: they come from the node
// registry (registry.ts), with its help text, so the Inspector and the reference agree.

import { nodeTypes, propsOf, type PropDef } from './registry';

export interface ApiMember {
  name: string;
  /** A property holds a value; a method is called by you; a callback is called by the engine, and you write it. */
  kind: 'property' | 'method' | 'callback';
  /** Property: its type. Method or callback: everything after the name, e.g. "(path: string): Node". */
  type: string;
  doc: string;
  /** What Godot calls it, when that helps. */
  godot?: string;
  readonly?: boolean;
  /** A Vec2 property you can set with any { x, y }. */
  vec?: boolean;
  /** Shown in the Inspector too (from the registry). */
  inspector?: boolean;
}

export interface ApiEntry {
  name: string;
  kind: 'class' | 'global';
  extends?: string;
  doc: string;
  godot?: string;
  /** A short script using it, checked by the tests against these declarations. */
  example?: string;
  members: ApiMember[];
  /** JavaScript's own, not the engine's: listed because scripts use it. */
  builtin?: boolean;
  /** An index signature for a global with no fixed members, like state's "[name: string]: any". */
  index?: string;
}

const p = (name: string, type: string, doc: string, godot?: string, more: Partial<ApiMember> = {}): ApiMember => ({ name, kind: 'property', type, doc, godot, ...more });
const m = (name: string, type: string, doc: string, godot?: string): ApiMember => ({ name, kind: 'method', type, doc, godot });
const cb = (name: string, type: string, doc: string, godot?: string): ApiMember => ({ name, kind: 'callback', type, doc, godot });
const XY = '{ x: number; y: number }';

/** Godot's names for the Inspector properties, where they differ or need a note. */
const GODOT_PROPS: Record<string, string> = {
  'Node2D.position': 'position', 'Node2D.rotation': 'rotation', 'Node2D.scale': 'scale', 'Node2D.visible': 'visible', 'Node2D.zIndex': 'z_index',
  'Sprite2D.texture': 'texture (here a project path, not a loaded resource)', 'Sprite2D.flipX': 'flip_h', 'Sprite2D.flipY': 'flip_v', 'Sprite2D.opacity': 'modulate.a',
  'AnimatedSprite2D.frames': 'sprite_frames (a SpriteFrames resource)', 'AnimatedSprite2D.animation': 'animation', 'AnimatedSprite2D.playing': 'autoplay, is_playing()',
  'AnimatedSprite2D.speedScale': 'speed_scale', 'AnimatedSprite2D.frame': 'frame', 'AnimatedSprite2D.flipX': 'flip_h', 'AnimatedSprite2D.flipY': 'flip_v', 'AnimatedSprite2D.opacity': 'modulate.a',
  'AnimationPlayer.animations': 'the AnimationLibrary of Animation resources', 'AnimationPlayer.autoplay': 'autoplay', 'AnimationPlayer.speedScale': 'speed_scale',
  'TileMapLayer.tileset': 'tile_set (a TileSet resource)', 'TileMapLayer.cells': 'the tile_map_data (set_cell(), get_used_cells())', 'TileMapLayer.collisionLayer': "the TileSet's physics layer collision_layer",
  'Camera2D.current': 'enabled, make_current()', 'Camera2D.zoom': 'zoom (a Vector2 in Godot; one number here)', 'Camera2D.smoothing': 'position_smoothing_enabled and position_smoothing_speed',
  'Camera2D.limitTopLeft': 'limit_left, limit_top', 'Camera2D.limitBottomRight': 'limit_right, limit_bottom',
  'Label.text': 'text', 'Label.fontSize': 'theme_override_font_sizes/font_size', 'Label.color': 'theme_override_colors/font_color',
  'CanvasLayer.layer': 'layer',
  'CollisionShape2D.shape': 'shape (a RectangleShape2D or CircleShape2D resource)', 'CollisionShape2D.size': 'RectangleShape2D.size, or CircleShape2D.radius × 2',
  'PhysicsBody2D.collisionLayer': 'collision_layer', 'CharacterBody2D.collisionMask': 'collision_mask', 'RigidBody2D.collisionMask': 'collision_mask',
  'RigidBody2D.gravityScale': 'gravity_scale', 'RigidBody2D.bounce': 'physics_material_override.bounce', 'Area2D.collisionMask': 'collision_mask',
};

/** The classes and globals, in the order the reference lists them. `members` holds what the registry does not. */
const ENTRIES: ApiEntry[] = [
  {
    name: 'Node', kind: 'class', godot: 'Node',
    doc: 'The simplest node: a name in the tree, with children. Every node type extends it. A script is a class that extends the type of the node it is attached to, and the engine calls its ready, update and physicsUpdate.',
    example: `export default class Spawner extends Node {
  ready() {
    console.log('I am', this.path, 'with', this.children.length, 'children');
  }

  update(dt) {
    // Every frame: dt is the seconds since the last one.
  }
}`,
    members: [
      p('name', 'string', 'Its name in the tree. Names under one parent are unique.', 'name'),
      p('parent', 'AnyNode | null', 'The node above it; null for the scene root.', 'get_parent()', { readonly: true }),
      p('children', 'AnyNode[]', 'The nodes directly under it, in order (a copy: adding to it changes nothing). Each can be used as its own type: child.restart() calls its script\u2019s method.', 'get_children()', { readonly: true }),
      p('path', 'string', 'Its path from the scene root, like "Player/Sprite". The root is ".".', 'get_path() (from the scene root here)', { readonly: true }),
      m('get', '<T extends Node = AnyNode>(path: string): T', 'The node at a path relative to this one: "Sprite", "../Enemy", "HUD/Score". Throws, naming the path, if there is none.', 'get_node(), $Path'),
      m('find', '<T extends Node = AnyNode>(path: string): T | null', 'Like get, but null when there is no such node.', 'get_node_or_null()'),
      m('addChild', '(node: Node): Node', 'Add a node under this one while the game runs (a spawned bullet, say). It gets ready() straight away. A clashing name gets a number.', 'add_child()'),
      m('queueFree', '(): void', 'Remove this node and its children at the end of the frame; destroyed() runs then.', 'queue_free()'),
      p('groups', 'string[]', 'The groups it is in (set in the Inspector, or with addToGroup).', 'get_groups()', { readonly: true }),
      m('addToGroup', '(group: string): void', 'Put it in a group.', 'add_to_group()'),
      m('removeFromGroup', '(group: string): void', 'Take it out of a group.', 'remove_from_group()'),
      m('isInGroup', '(group: string): boolean', 'Whether it is in a group: if (body.isInGroup("enemies")) …', 'is_in_group()'),
      m('connect', '(signal: string, target: Node | ((...args: any[]) => void), method?: string): void', 'When this node emits the signal, call method on target (or call a function). Connections made in the Inspector are made like this when the game starts.', 'connect()'),
      m('disconnect', '(signal: string, target: Node | ((...args: any[]) => void), method?: string): void', 'Undo a connect.', 'disconnect()'),
      m('emit', '(signal: string, ...args: any[]): void', 'Send a signal: everything connected to it runs, with these arguments. Any name can be a signal; the engine also emits bodyEntered, bodyExited, animationFinished and onCollision when it calls those methods.', 'emit_signal(), signal.emit()'),
      cb('ready', '(): void', 'Runs once, when the node and all its children are in the game. Children are ready before their parent.', '_ready()'),
      cb('update', '(dt: number): void', 'Runs every frame. dt is the seconds since the last frame: move by speed × dt.', '_process(delta)'),
      cb('physicsUpdate', '(dt: number): void', 'Runs at a fixed 60 times a second (dt is always 1/60), before physics moves bodies. Move bodies here. In here input’s "just pressed" means since the last physics step.', '_physics_process(delta)'),
      cb('destroyed', '(): void', 'Runs once, when the node is removed by queueFree.', '_exit_tree(), roughly'),
    ],
  },
  {
    name: 'Node2D', kind: 'class', extends: 'Node', godot: 'Node2D',
    doc: 'A node with a place in 2D: position, rotation and scale, relative to its parent. +x is right and +y is down; positive rotation turns clockwise on screen.',
    example: `export default class Spinner extends Node2D {
  update(dt) {
    this.rotationDegrees += 90 * dt;                       // a quarter turn a second
    this.position = { x: this.position.x + 20 * dt, y: this.position.y };
  }
}`,
    members: [
      p('rotationDegrees', 'number', 'rotation in degrees, which is often easier to think in.', 'rotation_degrees'),
      p('globalPosition', 'Vec2', 'Where it is in the world, whatever its parents are. Setting it moves the node there.', 'global_position', { vec: true }),
    ],
  },
  {
    name: 'Sprite2D', kind: 'class', extends: 'Node2D', godot: 'Sprite2D',
    doc: 'Draws an image, centred on its position.',
    example: `export default class Blink extends Sprite2D {
  update(dt) {
    this.opacity = 0.5 + 0.5 * Math.sin(time.now * 6);
  }
}`,
    members: [],
  },
  {
    name: 'AnimatedSprite2D', kind: 'class', extends: 'Node2D', godot: 'AnimatedSprite2D',
    doc: 'Draws a picture that changes. It has named animations (walk, jump…), each a list of pictures shown in turn at its fps, looping or not. Build them in the Inspector; play them from a script.',
    example: `export default class Hero extends CharacterBody2D {
  ready() {
    this.sprite = this.get('Sprite');   // an AnimatedSprite2D with "idle" and "walk"
  }

  physicsUpdate(dt) {
    this.velocity = { x: input.axis('move_left', 'move_right') * 100, y: 0 };
    this.moveAndSlide();
    this.sprite.play(this.velocity.x === 0 ? 'idle' : 'walk');
    if (this.velocity.x !== 0) this.sprite.flipX = this.velocity.x < 0;
  }
}`,
    members: [
      m('play', '(name?: string): void', 'Play an animation by name, from its first picture; playing the one already playing carries on, so calling it every frame is fine. With no name, carry on with the current one. Throws, listing the names, if there is no such animation.', 'play()'),
      m('pause', '(): void', 'Stop on the current picture; play() carries on from it.', 'pause()'),
      m('stop', '(): void', 'Stop, and go back to the first picture.', 'stop()'),
      m('isPlaying', '(): boolean', 'Whether it is moving through its pictures.', 'is_playing()'),
      cb('animationFinished', '(name: string): void', 'Runs when an animation that does not loop reaches its last picture.', 'animation_finished signal'),
    ],
  },
  {
    name: 'AnimationPlayer', kind: 'class', extends: 'Node', godot: 'AnimationPlayer',
    doc: 'Changes other nodes\u2019 properties over time, from keyframes: numbers and vectors glide between keys, colours blend, and anything else (true/false, text, a picture) switches at each key. Track paths start at the player\u2019s parent. Make animations in the Animation panel; play them from a script, or with autoplay.',
    example: `export default class Door extends Area2D {
  bodyEntered(body) {
    // An AnimationPlayer beside this area, with an "open" animation that slides the door up.
    if (body.name === 'Player') this.get('../AnimationPlayer').play('open');
  }
}`,
    members: [
      p('currentAnimation', 'string', 'The name of the animation playing or last played; empty before any.', 'current_animation', { readonly: true }),
      p('currentTime', 'number', 'How far into it, in seconds.', 'current_animation_position', { readonly: true }),
      m('play', '(name?: string): void', 'Play an animation from its start; playing the one already playing carries on. With no name, carry on with the current one. Throws, listing the names, if there is no such animation.', 'play()'),
      m('pause', '(): void', 'Stop where it is; play() carries on from here.', 'pause()'),
      m('stop', '(): void', 'Stop, and go back to the start (the properties keep the values they have).', 'stop()'),
      m('seek', '(time: number): void', 'Jump to a time in the current animation, and set every track\u2019s property to its value there.', 'seek()'),
      m('isPlaying', '(): boolean', 'Whether it is playing.', 'is_playing()'),
      cb('animationFinished', '(name: string): void', 'Runs when an animation that does not loop reaches its end.', 'animation_finished signal'),
    ],
  },
  {
    name: 'TileMapLayer', kind: 'class', extends: 'Node2D', godot: 'TileMapLayer',
    doc: 'A grid of tiles from a tileset: floors, walls, platforms. Cells are counted in tiles from the layer\u2019s origin; tile numbers count across the tileset image, then down, from 0; −1 means none. Tiles the tileset marks solid stop bodies (a body hit by one is told this layer). Paint it in the viewport with the TileMap panel; change it from a script with setCell.',
    example: `export default class Digger extends CharacterBody2D {
  ready() {
    this.map = scene.get('Walls');      // a TileMapLayer
  }

  physicsUpdate(dt) {
    this.velocity = input.vector('move_left', 'move_right', 'move_up', 'move_down').scale(80);
    this.moveAndSlide();
    // Dig: remove the tile just ahead of us when Space is pressed.
    if (input.isJustPressed('jump')) {
      const ahead = this.map.localToMap(this.position.add(this.velocity.normalized().scale(16)));
      if (this.map.isCellSolid(ahead.x, ahead.y)) this.map.eraseCell(ahead.x, ahead.y);
    }
  }
}`,
    members: [
      m('findPath', '(from: { x: number; y: number }, to: { x: number; y: number }, options?: { diagonal?: boolean }): Vec2[] | null', 'The shortest way between two world points that avoids this layer\u2019s solid tiles (A*): one world point per cell centre, from the next cell to the goal\u2019s cell; [] when already there, null when there is no way. diagonal: true also steps diagonally (never cutting a corner). Walk the points in turn to go round walls.', 'AStarGrid2D.get_point_path()'),
      p('tileSize', 'Vec2', 'The size of one cell in pixels, from the tileset.', 'tile_set.tile_size', { readonly: true }),
      m('getCell', '(x: number, y: number): number', 'The tile in a cell, or −1 for none.', 'get_cell_atlas_coords(), get_cell_source_id()'),
      m('setCell', '(x: number, y: number, tile: number): void', 'Put a tile in a cell (−1 erases). Collision follows at once.', 'set_cell()'),
      m('eraseCell', '(x: number, y: number): void', 'Empty a cell.', 'erase_cell()'),
      m('getUsedCells', '(): Vec2[]', 'Every painted cell, as cell coordinates.', 'get_used_cells()'),
      m('localToMap', `(point: ${XY}): Vec2`, 'The cell a point (in the layer\u2019s own coordinates) is in. For a world point, the layer must be at the origin, or subtract its position first.', 'local_to_map()'),
      m('mapToLocal', `(cell: ${XY}): Vec2`, 'The centre of a cell, in the layer\u2019s own coordinates.', 'map_to_local()'),
      m('isCellSolid', '(x: number, y: number): boolean', 'Whether the tile in a cell is one the tileset marks solid: the test for "can I walk there?" in grid games.', 'get_cell_tile_data() and its collision polygons'),
    ],
  },
  {
    name: 'Camera2D', kind: 'class', extends: 'Node2D', godot: 'Camera2D',
    doc: 'What the player sees, centred on the camera. Put it under the player and it follows. The first current camera in the tree is the one used.',
    example: `export default class Shake extends Camera2D {
  update(dt) {
    // A small shake: move the camera a little each frame.
    this.position = { x: math.randRange(-2, 2), y: math.randRange(-2, 2) };
  }
}`,
    members: [],
  },
  {
    name: 'Label', kind: 'class', extends: 'Node2D', godot: 'Label (a Control in Godot; a Node2D here)',
    doc: 'Text. Its position is the top-left corner of the text. wrapWidth wraps it; visibleCharacters shows only its first letters, for typewriter dialogue.',
    example: `export default class Clock extends Label {
  update(dt) {
    this.text = \`Time: \${time.now.toFixed(1)}\`;
  }
}
// Typewriter dialogue: 30 letters a second.
export class Line extends Label {
  shown = 0;
  say(words) { this.text = words; this.shown = 0; }
  update(dt) {
    this.shown += 30 * dt;
    this.visibleCharacters = this.shown >= this.totalCharacters ? -1 : Math.floor(this.shown);
  }
}`,
    members: [
      p('totalCharacters', 'number', 'How many letters the text has: a typewriter has finished when it has shown them all.', 'get_total_character_count()', { readonly: true }),
    ],
  },
  {
    name: 'Panel', kind: 'class', extends: 'Node2D', godot: 'Panel (a Control in Godot; a Node2D here)',
    doc: 'A box with an edge: the background of a menu, a dialogue box or an inventory. Its position is its top-left corner. Put it under a CanvasLayer so it stays on the screen.',
    members: [],
  },
  {
    name: 'Button', kind: 'class', extends: 'Node2D', godot: 'Button (a Control in Godot; a Node2D here)',
    doc: 'A button. Clicking it (the mouse goes down and comes up on it) presses it. So does Enter or Space while it has the keyboard focus, and the arrow keys move the focus to the nearest button that way. Pressing calls its script\u2019s pressed() and emits the pressed signal, which a script elsewhere can connect to. Its position is its top-left corner.',
    example: `// On a VBoxContainer holding the buttons New game, Continue and Quit:
export default class Menu extends VBoxContainer {
  ready() {
    this.get('Continue').disabled = !save.has('slot1');
    this.get('New game').connect('pressed', this, 'newGame');
    this.get('Continue').connect('pressed', this, 'continueGame');
    this.get('New game').grabFocus();   // the arrow keys and Enter work at once
  }
  newGame() { scene.change('scenes/town.scene'); }
  continueGame() { save.load('slot1'); scene.change(state.map); }
}`,
    members: [
      cb('pressed', '(): void', 'Runs when it is pressed. It is also emitted as the pressed signal.', 'pressed signal'),
      p('hasFocus', 'boolean', 'Whether it has the keyboard focus.', 'has_focus()', { readonly: true }),
      m('grabFocus', '(): void', 'Take the keyboard focus, so the arrow keys and Enter work the menu. A disabled button cannot take it.', 'grab_focus()'),
      m('releaseFocus', '(): void', 'Give up the focus, so the arrow keys, Enter and Space go back to the game alone.', 'release_focus()'),
    ],
  },
  {
    name: 'ProgressBar', kind: 'class', extends: 'Node2D', godot: 'ProgressBar (a Control in Godot; a Node2D here)',
    doc: 'A bar that fills from left to right, value out of maxValue: health, experience, a cooldown. Its position is its top-left corner.',
    example: `export default class HealthBar extends ProgressBar {
  update() {
    this.maxValue = state.maxHp;
    this.value = state.hp;
  }
}`,
    members: [],
  },
  {
    name: 'BoxContainer', kind: 'class', extends: 'Node2D', godot: 'BoxContainer',
    doc: 'What VBoxContainer and HBoxContainer share: it places its visible 2D children one after another, separation pixels apart, every frame. A child\u2019s size is its size property, or a Label\u2019s text (estimated at 0.55 × fontSize per letter), or 0. Hide a child and the rest close up.',
    members: [
      p('vertical', 'boolean', 'True for a column (VBoxContainer), false for a row (HBoxContainer).', 'vertical', { readonly: true }),
    ],
  },
  {
    name: 'VBoxContainer', kind: 'class', extends: 'BoxContainer', godot: 'VBoxContainer',
    doc: 'Places its children in a column, top to bottom: a menu, a list. Add children from a script and they line up.',
    example: `export default class Inventory extends VBoxContainer {
  ready() {
    for (const item of state.bag ?? []) {
      const row = new Label();
      row.text = item.name;
      row.fontSize = 16;
      this.addChild(row);
    }
  }
}`,
    members: [],
  },
  {
    name: 'HBoxContainer', kind: 'class', extends: 'BoxContainer', godot: 'HBoxContainer',
    doc: 'Places its children in a row, left to right: a hotbar, a row of hearts.',
    members: [],
  },
  {
    name: 'Particles2D', kind: 'class', extends: 'Node2D', godot: 'GPUParticles2D / CPUParticles2D',
    doc: 'Particles: sparks, smoke, dust, a burst. emitting makes rate a second; burst() makes amount at once. Each flies out at about speed (between half and all of it) within spread either side of direction, falls with gravity, and fades out over lifetime. They stay in the world where they were made, so a moving emitter leaves a trail. The same seed makes the same particles.',
    example: `export default class Slime extends CharacterBody2D {
  hit() {
    const puff = this.get('Puff');   // a Particles2D child: green, gravity 200
    puff.burst(16);
  }
}`,
    members: [
      m('burst', '(n?: number): void', 'Make n particles at once (amount unless given).', 'restart() with one_shot'),
      m('clear', '(): void', 'Remove every particle now.', 'restart()'),
      p('count', 'number', 'How many particles are alive now.', '', { readonly: true }),
    ],
  },
  {
    name: 'AudioStreamPlayer', kind: 'class', extends: 'Node', godot: 'AudioStreamPlayer',
    doc: 'Plays a sound: an effect or music. Make sounds with Files › New sound… (project.writeSound). The browser starts sound only after the player has clicked or pressed a key in the game, so a sound before that is silent.',
    example: `export default class Coin extends Area2D {
  bodyEntered(body) {
    if (body.name !== 'Player') return;
    const ding = scene.get('Sounds/Coin');
    ding.pitchScale = math.randRange(0.9, 1.1);   // a little different each time
    ding.play();
    this.queueFree();
  }
}`,
    members: [
      p('playing', 'boolean', 'Whether a sound is playing now.', 'playing', { readonly: true }),
      m('play', '(): void', 'Play the stream from the start (again, if it was playing).', 'play()'),
      m('stop', '(): void', 'Stop playing.', 'stop()'),
      cb('finished', '(): void', 'Runs when a sound ends by itself: not when stopped, never while looping. Also emitted as the finished signal.', 'finished signal'),
    ],
  },
  {
    name: 'CanvasLayer', kind: 'class', extends: 'Node', godot: 'CanvasLayer',
    doc: 'Its children are drawn on the screen, not in the world: they stay put while the camera moves and zooms. Use it for a HUD.',
    members: [],
  },
  {
    name: 'CollisionShape2D', kind: 'class', extends: 'Node2D', godot: 'CollisionShape2D',
    doc: 'Gives the body or area directly above it a solid part: a rectangle or a circle. A body can have several. Rectangles do not turn with their body yet.',
    members: [],
  },
  {
    name: 'PhysicsBody2D', kind: 'class', extends: 'Node2D', godot: 'PhysicsBody2D',
    doc: 'What StaticBody2D, CharacterBody2D and RigidBody2D share. Not added on its own. Layers 1 to 16 are bits: layer n is 1 << (n − 1), so layers 1 and 3 are 1 | 4 = 5.',
    members: [],
  },
  {
    name: 'StaticBody2D', kind: 'class', extends: 'PhysicsBody2D', godot: 'StaticBody2D',
    doc: 'Solid and still: walls, floors and platforms. Other bodies stop against its shapes.',
    members: [],
  },
  {
    name: 'CharacterBody2D', kind: 'class', extends: 'PhysicsBody2D', godot: 'CharacterBody2D',
    doc: 'A body your script moves: set velocity, then call moveAndSlide() in physicsUpdate. It stops at solid bodies and slides along them. Nothing moves it otherwise, not even gravity: add gravity to velocity yourself.',
    example: `export default class Player extends CharacterBody2D {
  speed = 120;
  jumpSpeed = 360;

  physicsUpdate(dt) {
    const v = this.velocity;
    v.x = input.axis('move_left', 'move_right') * this.speed;
    v.y += physics.gravity * dt;
    if (input.isJustPressed('jump') && this.isOnFloor()) v.y = -this.jumpSpeed;
    this.velocity = v;
    this.moveAndSlide();
  }
}`,
    members: [
      p('velocity', 'Vec2', 'Pixels per second. moveAndSlide() moves by it, and removes the part going into anything it hits.', 'velocity', { vec: true }),
      m('moveAndSlide', '(): void', 'Move by velocity × 1/60 s, stopping at solid bodies on its mask’s layers and sliding along them. It moves in steps of at most 4 pixels, so it cannot pass through thin walls.', 'move_and_slide()'),
      m('isOnFloor', '(): boolean', 'Whether the last moveAndSlide() stopped it on a surface facing up. The usual test before a jump.', 'is_on_floor()'),
      m('isOnWall', '(): boolean', 'Whether the last moveAndSlide() stopped it against a surface facing sideways.', 'is_on_wall()'),
      m('isOnCeiling', '(): boolean', 'Whether the last moveAndSlide() stopped it on a surface facing down.', 'is_on_ceiling()'),
      m('getSlideCollisions', '(): { body: AnyNode; normal: Vec2 }[]', 'What the last moveAndSlide() touched, and each surface’s normal (pointing away from it).', 'get_slide_collision(i), get_slide_collision_count()'),
    ],
  },
  {
    name: 'RigidBody2D', kind: 'class', extends: 'PhysicsBody2D', godot: 'RigidBody2D',
    doc: 'A body that moves by itself: gravity pulls it (times gravityScale), it keeps its velocity, and it bounces off solid bodies. Give it a velocity to start it moving.',
    example: `export default class Ball extends RigidBody2D {
  ready() {
    this.velocity = { x: 150, y: -200 };
  }

  onCollision(body, normal) {
    if (body.name.startsWith('Brick')) body.queueFree();
  }
}`,
    members: [
      p('velocity', 'Vec2', 'Pixels per second. Physics changes it: gravity, and bounces.', 'linear_velocity', { vec: true }),
      cb('onCollision', '(body: AnyNode, normal: Vec2): void', 'Runs when it hits a solid body. normal points away from what it hit.', 'body_entered signal, with contact_monitor on'),
    ],
  },
  {
    name: 'Area2D', kind: 'class', extends: 'Node2D', godot: 'Area2D',
    doc: 'A region that notices bodies coming in and going out, without stopping them: pickups, triggers, danger zones. It notices only bodies on its mask’s layers.',
    example: `export default class Coin extends Area2D {
  bodyEntered(body) {
    if (body.name !== 'Player') return;
    body.collect(this);        // a method on the player's own script
    this.queueFree();
  }
}`,
    members: [
      m('getOverlappingBodies', '(): AnyNode[]', 'The bodies inside it now.', 'get_overlapping_bodies()'),
      cb('bodyEntered', '(body: AnyNode): void', 'Runs when a body comes in.', 'body_entered signal'),
      cb('bodyExited', '(body: AnyNode): void', 'Runs when a body goes out, or is freed while inside.', 'body_exited signal'),
    ],
  },
  {
    name: 'Vec2', kind: 'class', godot: 'Vector2',
    doc: 'A 2D vector: a position, a velocity or a direction. Change .x and .y directly; the methods return new vectors and leave this one alone. Anywhere a vector is wanted, a plain { x, y } works too.',
    example: `export default class Chaser extends Node2D {
  update(dt) {
    const target = scene.get('Player').globalPosition;
    const toward = new Vec2(target.x, target.y).sub(this.position).normalized();
    this.position = this.position.add(toward.scale(50 * dt));
  }
}`,
    members: [
      m('constructor', '(x?: number, y?: number)', 'new Vec2(3, 4). Both default to 0.', 'Vector2(x, y)'),
      p('x', 'number', 'Across: + is right.', 'x'),
      p('y', 'number', 'Down: + is down.', 'y'),
      m('add', `(v: ${XY}): Vec2`, 'This plus v.', 'a + b'),
      m('sub', `(v: ${XY}): Vec2`, 'This minus v: the vector from v to this.', 'a - b'),
      m('scale', '(k: number): Vec2', 'This times a number.', 'a * k'),
      m('dot', `(v: ${XY}): number`, 'x·v.x + y·v.y: positive when they point the same way, 0 when square to each other.', 'dot()'),
      m('length', '(): number', 'How long it is: √(x² + y²).', 'length()'),
      m('normalized', '(): Vec2', 'The same direction with length 1. A zero vector stays zero.', 'normalized()'),
      m('distanceTo', `(v: ${XY}): number`, 'The distance between two points.', 'distance_to()'),
      m('angle', '(): number', 'Its direction in radians from +x, clockwise on screen.', 'angle()'),
      m('lerp', `(v: ${XY}, t: number): Vec2`, 'Partway to v: t = 0 is this, 1 is v, 0.5 halfway.', 'lerp()'),
      m('set', '(x: number, y: number): this', 'Change both at once; returns this vector.', 'x = …; y = …'),
      m('copy', '(): Vec2', 'A new vector with the same x and y. Keep a copy of a position before it changes.', '(Vector2 is a value in Godot, copied anyway)'),
    ],
  },
  {
    name: 'input', kind: 'global', godot: 'Input',
    doc: 'The keyboard and mouse, as named actions from Project › Input map (move_left, jump…). Ask about actions, not keys, so the keys can change without changing scripts. Mouse buttons are the keys MouseLeft, MouseMiddle and MouseRight, so a click is an action too: project.addAction("select", ["MouseLeft"]).',
    example: `export default class Mover extends Node2D {
  update(dt) {
    const dir = input.vector('move_left', 'move_right', 'move_up', 'move_down');
    this.position = this.position.add(dir.scale(100 * dt));
    if (input.isJustPressed('jump')) console.log('jump!');
  }
}`,
    members: [
      m('isPressed', '(action: string): boolean', 'Held down now.', 'is_action_pressed()'),
      m('isJustPressed', '(action: string): boolean', 'Went down since the last frame; in physicsUpdate, since the last physics step. True once per press.', 'is_action_just_pressed()'),
      m('isJustReleased', '(action: string): boolean', 'Came up since the last frame (in physicsUpdate, since the last physics step).', 'is_action_just_released()'),
      m('axis', '(negative: string, positive: string): number', '−1, 0 or 1: for example axis("move_left", "move_right").', 'get_axis()'),
      m('vector', '(left: string, right: string, up: string, down: string): Vec2', 'A direction from four actions, with length at most 1, so going diagonally is not faster.', 'get_vector()'),
      p('actionNames', 'string[]', 'The names of every action in the input map.', 'InputMap.get_actions()', { readonly: true }),
      p('mouse', 'Vec2', 'Where the pointer is in the world: compare it with a node\'s position to see what it is over (through the camera, if there is one).', 'get_global_mouse_position()', { readonly: true }),
      p('mouseScreen', 'Vec2', 'Where the pointer is on the screen, in the game\'s pixels: compare it with the position of a node under a CanvasLayer.', 'get_viewport().get_mouse_position()', { readonly: true }),
    ],
  },
  {
    name: 'scene', kind: 'global', godot: 'get_tree().current_scene',
    doc: 'The running scene. scene.get("HUD/Score") finds a node by its path from the root, from any script.',
    members: [
      p('root', 'AnyNode', 'The scene’s root node, with its script’s methods: scene.root.gameOver().', 'get_tree().current_scene', { readonly: true }),
      m('get', '<T extends Node = AnyNode>(path: string): T', 'The node at a path from the root. Throws if there is none.', 'get_node("/root/…")'),
      m('find', '<T extends Node = AnyNode>(path: string): T | null', 'Like get, but null when there is none.', 'get_node_or_null()'),
      p('path', 'string', 'The running scene\u2019s file, like "scenes/level1.scene".', 'get_tree().current_scene.scene_file_path', { readonly: true }),
      m('getNodesInGroup', '(group: string): AnyNode[]', 'Every node in a group, in tree order.', 'get_tree().get_nodes_in_group()'),
      m('callGroup', '(group: string, method: string, ...args: any[]): void', 'Call a method on every node in a group that has it: callGroup("enemies", "freeze").', 'get_tree().call_group()'),
      m('instantiate', '(scene: string): AnyNode', 'A new copy of a scene\u2019s nodes (with its scripts), not yet in the game: add it with addChild. How bullets, enemies and pickups are made while the game runs.', 'load("res://….tscn").instantiate()'),
      m('change', '(scene: string): void', 'Switch to another scene at the end of this frame: the next level, a title screen, game over.', 'get_tree().change_scene_to_file()'),
    ],
  },
  {
    name: 'time', kind: 'global', godot: 'Time, Engine.get_process_frames()',
    doc: 'The game’s clock.',
    members: [
      p('now', 'number', 'Seconds since the game started. Math.sin(time.now) makes smooth back-and-forth motion.', 'Time.get_ticks_msec() / 1000', { readonly: true }),
      p('frame', 'number', 'How many frames have been drawn.', 'Engine.get_process_frames()', { readonly: true }),
    ],
  },
  {
    name: 'state', kind: 'global', godot: 'an autoload (singleton) script',
    doc: 'The game\u2019s own data, shared by every script and kept when scene.change() moves to another scene: the gold, the party, the quests. Add anything to it: state.gold = 10. It starts empty each time the game starts. Change its fields; don\u2019t replace it (state = … would make a new object no other script sees).',
    example: `export default class Door extends Area2D {
  target = 'scenes/forest.scene';

  bodyEntered(body) {
    if (body.name !== 'Player') return;
    state.arriveAt = 'FromTown';   // the next map reads this to place the player
    scene.change(this.target);
  }
}`,
    index: '[name: string]: any',
    members: [],
  },
  {
    name: 'save', kind: 'global', godot: 'FileAccess with user://, ConfigFile',
    doc: 'Saved games: copies of data kept in named slots after the game stops, until you save over them or empty them (Run › Clear saved games). A save is a copy, so changing state afterwards does not change it. Save plain values (numbers, strings, true/false, lists, objects), not nodes. Every slot name defaults to "main".',
    example: `export default class SavePoint extends Area2D {
  bodyEntered(body) {
    if (body.name === 'Player') save.write('slot1');   // all of state
  }
}
// On the title screen:  if (save.load('slot1')) scene.change(state.map);`,
    members: [
      m('write', '(slot?: string, data?: any): void', 'Save a copy of data in a slot, replacing what was there. Without data, all of state is saved.', 'FileAccess.store_var()'),
      m('read', '(slot?: string): any', 'A copy of what a slot holds, or null if it is empty.', 'FileAccess.get_var()'),
      m('load', '(slot?: string): boolean', 'Replace everything in state with what a slot holds (it must hold an object). False, with state untouched, if the slot is empty.'),
      m('has', '(slot?: string): boolean', 'Whether a slot has something saved in it.', 'FileAccess.file_exists()'),
      m('remove', '(slot?: string): void', 'Empty a slot.', 'DirAccess.remove_absolute()'),
      m('slots', '(): string[]', 'The names of the slots with something saved, in order: for a "Continue" menu.'),
    ],
  },
  {
    name: 'tween', kind: 'global', godot: 'create_tween().tween_property()',
    doc: 'Change a node\u2019s properties smoothly over time: a slide, a fade, a pop, a flash. Numbers, { x, y } and colours ("#rrggbb") can be tweened. Each starts from where the property is when the tween starts. An easing curve shapes the motion: linear, inQuad (slow, then fast), outQuad (fast, then slow; the default), inOutQuad, outCubic, outBack (overshoots and settles: a pop), outBounce. A tween on a node that is freed simply stops, and changing scene stops them all.',
    example: `export default class Chest extends Area2D {
  bodyEntered(body) {
    if (body.name !== 'Player') return;
    const lid = this.get('Sprite');
    tween.to(lid, { scale: { x: 1.3, y: 1.3 } }, 0.15, { ease: 'outBack', yoyo: true });   // a pop
    tween.to(lid, { opacity: 0 }, 0.4, { delay: 0.3, then: () => this.queueFree() });     // then fade away
  }
}`,
    members: [
      m('to', '(node: Node, props: { [name: string]: number | { x: number; y: number } | string }, seconds: number, options?: { ease?: string; delay?: number; then?: () => void; yoyo?: boolean; repeat?: number }): { stop(): void; readonly finished: boolean }', 'Tween these properties of a node to these values over seconds. Options: ease (the curve), delay (seconds before it starts), then (run when it finishes), yoyo (come back again), repeat (more runs; −1 for ever). Returns the tween: stop() stops it where it is.', 'Tween.tween_property()'),
      m('stopAll', '(node?: Node): void', 'Stop every tween on a node, or every tween at all.', 'Tween.kill()'),
      p('eases', 'string[]', 'The easing curves\u2019 names.', 'Tween.TransitionType', { readonly: true }),
    ],
  },
  {
    name: 'debug', kind: 'global', godot: 'an editor plugin, or Dear ImGui',
    doc: 'Controls for tuning a running game, shown in the editor\u2019s Debug tab, in the style of Dear ImGui: ask for a control every frame, and use what it returns. The first value is where a slider starts; once you move it in the Debug tab, the call returns the slider\u2019s value. Outside the editor (an exported game, training) every call returns the script\u2019s own value, so the game plays the same.',
    example: `export default class Player extends CharacterBody2D {
  speed = 70;

  physicsUpdate(dt) {
    this.speed = debug.slider('speed', this.speed, 0, 200);   // drag it while the game runs
    debug.watch('position', this.position);
    if (debug.button('back to start')) this.position = { x: 56, y: 96 };
    this.velocity = input.vector('move_left', 'move_right', 'move_up', 'move_down').scale(this.speed);
    this.moveAndSlide();
  }
}`,
    members: [
      m('slider', '(name: string, value: number, min: number, max: number, step?: number): number', 'A number to tune between min and max: returns the slider\u2019s value once moved, value until then.', ''),
      m('toggle', '(name: string, value: boolean): boolean', 'A switch: returns the panel\u2019s once flipped, value until then.', ''),
      m('button', '(name: string): boolean', 'A button: true on the one call after it is pressed in the Debug tab.', ''),
      m('watch', '(name: string, value: any): void', 'Show a value (numbers to 4 significant figures).', ''),
    ],
  },
  {
    name: 'physics', kind: 'global', godot: 'ProjectSettings physics/2d/default_gravity',
    doc: 'The project’s physics settings (Project › Settings).',
    members: [
      p('gravity', 'number', 'Downward pull in pixels per second per second (980 unless changed). RigidBody2D uses it; a CharacterBody2D adds it to its velocity itself.', 'default_gravity', { readonly: true }),
    ],
  },
  {
    name: 'math', kind: 'global', godot: '@GlobalScope functions',
    doc: 'Small maths helpers. JavaScript’s own Math (Math.sin, Math.PI…) works too.',
    members: [
      m('vec', '(x?: number, y?: number): Vec2', 'A new Vec2, like new Vec2(x, y).', 'Vector2(x, y)'),
      m('clamp', '(v: number, lo: number, hi: number): number', 'v kept between lo and hi.', 'clamp()'),
      m('lerp', '(a: number, b: number, t: number): number', 'Partway from a to b: t = 0 is a, 1 is b.', 'lerp()'),
      m('degToRad', '(d: number): number', 'Degrees to radians.', 'deg_to_rad()'),
      m('radToDeg', '(r: number): number', 'Radians to degrees.', 'rad_to_deg()'),
      m('randRange', '(lo: number, hi: number): number', 'A random number from lo up to (not including) hi.', 'randf_range()'),
      m('rng', '(seed?: number): { next(): number; range(lo: number, hi: number): number; int(lo: number, hi: number): number; chance(p: number): boolean; pick<T>(items: T[]): T; weighted(table: any[][]): any; shuffle<T>(items: T[]): T[]; readonly state: number }', 'A random-number generator of its own, from a seed: the same seed always gives the same numbers, so loot and maps can be repeated (and tested). next() is 0 to 1; range(lo, hi); int(lo, hi) includes both; chance(p); pick(list); weighted([[item, weight], …]); shuffle(list) returns a new list; state lets a saved game carry on: math.rng(saved.state).', 'RandomNumberGenerator (seed, randf, randi_range)'),
    ],
  },
  {
    name: 'ai', kind: 'global', godot: '(none: Godot has no built-in learning agents)',
    doc: 'Trained agents (Run › Train an agent…). A node whose script has observe() and act(action) is an agent; give it brain = \'brains/name.json\' and the engine asks the brain what to do every decideEvery frames (4 unless the script says). Training drives the same two methods, so the agent behaves the same in training and in the game. Optional: actions (names, in order), observations (names), reward() (earned since the last decision) and done() (the episode is over). A turn-based agent (a card game\'s player) adds legalActions(), the moves it may make now ([] when it is not its turn): the brain chooses only among them, and in training a step plays on to its next turn. features(action) describes a move as numbers for a linear Q brain (featureNames names them), and temperature (0 unless set) makes the brain choose by softmax, a difficulty setting.',
    members: [
      p('training', 'boolean', 'True while an agent is being trained: a player script can play itself then (flee, wander), so an NPC can learn before anyone plays.', '', { readonly: true }),
      m('has', '(path: string): boolean', 'Whether the project has a brain at this path.', ''),
      m('act', '(path: string, observation: number[]): number', 'What that brain does for these numbers: the number of an action. For asking a brain directly, instead of the brain field.', ''),
      m('values', '(path: string, features: number[][]): number[]', 'A linear Q brain\'s value for each move, given each move\'s features: Q = w · features. For a developer view that shows why the AI chose, or a practice partner that plays with a saved brain.', ''),
      m('weights', '(path: string): number[]', 'A linear Q brain\'s weights, one per feature, in the order of its features. Each weight × feature is one term of a move\'s Q: the biggest terms say why it chose that move.', ''),
      m('choose', '(path: string, features: number[][], temperature?: number): number', 'Which of these moves a linear Q brain picks: an index into the list. A temperature above 0 picks by softmax, so a move worth 1 less is e^(−1/temperature) as likely: a difficulty setting.', ''),
    ],
  },
  {
    name: 'console', kind: 'global', builtin: true, godot: 'print(), push_warning(), push_error()',
    doc: 'JavaScript’s console. While the game runs, what you log appears in the Output panel below the viewport.',
    members: [
      m('log', '(...values: any[]): void', 'Write a line to Output: console.log("score", score).', 'print()'),
      m('info', '(...values: any[]): void', 'The same as log.', 'print()'),
      m('warn', '(...values: any[]): void', 'A line marked as a warning.', 'push_warning()'),
      m('error', '(...values: any[]): void', 'A line marked as an error.', 'push_error()'),
    ],
  },
];

const PROP_TYPE: Record<PropDef['type'], (d: PropDef) => string> = {
  vec2: () => 'Vec2', number: () => 'number', angle: () => 'number', bool: () => 'boolean', string: () => 'string', color: () => 'string',
  texture: () => 'string | null', sound: () => 'string | null', tileset: () => 'string | null', cells: () => 'number[]', animations: () => '{ name: string; length: number; loop: boolean; tracks: { path: string; property: string; keys: { time: number; value: any }[] }[] }[]', spriteFrames: () => '{ name: string; fps: number; loop: boolean; frames: string[] }[]', enum: (d) => (d.options ?? []).map((o) => `'${o}'`).join(' | '), layers: () => 'number',
};

/** The Inspector properties a class adds: its registry properties not already declared by a class it extends. */
function registryMembers(e: ApiEntry): ApiMember[] {
  if (e.kind !== 'class') return [];
  const inherited = new Set(chain(ENTRIES, e).flatMap((a) => (a === e ? [] : allOwn(a).map((x) => x.name))));
  const type = e.name === 'PhysicsBody2D' ? 'StaticBody2D' : e.name;          // PhysicsBody2D is not addable; its layer is StaticBody2D's
  if (!nodeTypes().some((t) => t.type === type)) return [];
  const own = new Set(e.members.map((x) => x.name));
  return propsOf(type).filter((d) => !inherited.has(d.name) && !own.has(d.name)).map((d) => ({
    name: d.name, kind: 'property' as const, type: PROP_TYPE[d.type](d), doc: d.help, godot: GODOT_PROPS[`${e.name}.${d.name}`], vec: d.type === 'vec2', inspector: true,
  }));
}

const cache = new Map<string, ApiMember[]>();
function allOwn(e: ApiEntry): ApiMember[] {
  let v = cache.get(e.name);
  if (!v) { v = [...registryMembers(e), ...e.members]; cache.set(e.name, v); }
  return v;
}

function chain(list: ApiEntry[], e: ApiEntry): ApiEntry[] {
  const out: ApiEntry[] = [];
  for (let c: ApiEntry | undefined = e; c; c = c.extends ? list.find((x) => x.name === c!.extends) : undefined) out.push(c);
  return out;
}

/** Every entry, with its Inspector properties filled in from the registry. */
export const API_REFERENCE: ApiEntry[] = ENTRIES.map((e) => ({ ...e, members: allOwn(e) }));

/** The class and the classes it extends, nearest first. */
export function ancestors(e: ApiEntry): ApiEntry[] { return chain(API_REFERENCE, API_REFERENCE.find((x) => x.name === e.name) ?? e); }

export function apiEntry(name: string): ApiEntry | undefined { return API_REFERENCE.find((e) => e.name === name); }

/** How a member reads in the reference: "position: Vec2", "get(path: string): T". */
export function signature(x: ApiMember): string {
  const t = x.type.replace(/AnyNode/g, 'Node');
  return x.kind === 'property' ? `${x.readonly ? 'readonly ' : ''}${x.name}: ${t}` : `${x.name === 'constructor' ? 'new Vec2' : x.name}${t}`;
}

function declare(x: ApiMember, indent: string): string {
  const docs = `${indent}/** ${x.doc.replace(/\*\//g, '*\\/')}${x.godot ? ` Godot: ${x.godot}.` : ''} */\n`;
  if (x.kind !== 'property') return `${docs}${indent}${x.name}${x.type};`;
  if (x.vec) return `${docs}${indent}get ${x.name}(): Vec2; set ${x.name}(v: ${XY});`;
  return `${docs}${indent}${x.readonly ? 'readonly ' : ''}${x.name}: ${x.type};`;
}

/** The API as TypeScript declarations, for the script editor's completion and hover. */
export function engineDts(): string {
  const out = [
    '// Generated from core/apiReference.ts: the Game API scripts can use.',
    '/** A node found by path. Its own type is not known until the game runs, so any property can be used. */',
    'type AnyNode = Node & { [name: string]: any };',
  ];
  for (const e of API_REFERENCE) {
    const body = [...e.members.map((x) => declare(x, '  ')), ...(e.index ? [`  ${e.index};`] : [])].join('\n');
    const head = `/** ${e.doc}${e.godot ? ` Godot: ${e.godot}.` : ''} */`;
    if (e.kind === 'class') out.push(head, `declare class ${e.name}${e.extends ? ` extends ${e.extends}` : ''} {\n${body}\n}`);
    else out.push(head, `declare const ${e.name}: {\n${body}\n};`);
  }
  return `${out.join('\n')}\n`;
}

/** The first example on the reference's contents page. */
export const FIRST_SCRIPT = `export default class Player extends CharacterBody2D {
  speed = 120;

  physicsUpdate(dt) {
    this.velocity = input.vector('move_left', 'move_right', 'move_up', 'move_down').scale(this.speed);
    this.moveAndSlide();
  }
}`;

// ── the Scene API: the code GUI → code writes, and examples are built with ──────────

export interface SceneApiEntry { name: string; doc: string; members: { name: string; type: string; doc: string }[] }

/** Not for scripts in a running game: this builds and changes the project, in the editor. */
export const SCENE_API: SceneApiEntry[] = [
  {
    name: 'project',
    doc: 'The project being edited. Every editor action writes one of these calls to GUI → code, and running that code rebuilds the project exactly.',
    members: [
      { name: 'name', type: 'string', doc: 'The project’s name.' },
      { name: 'setSettings', type: '({ width?, height?, background?, pixelArt?, gravity? }): void', doc: 'The game’s size in pixels, background colour ("#rrggbb"), hard-edged pixel art, and gravity.' },
      { name: 'createScene', type: '(path: string, rootType?: string, rootName?: string): SceneHandle', doc: 'A new scene file in scenes/, with a root node (Node2D unless you say). The first scene becomes the main scene.' },
      { name: 'scene', type: '(path: string): SceneHandle', doc: 'An existing scene.' },
      { name: 'setMainScene', type: '(path: string): void', doc: 'The scene ▶ Run starts.' },
      { name: 'writeScript', type: '(path: string, source: string): void', doc: 'Create or replace a script in scripts/.' },
      { name: 'writeSvg', type: '(path: string, source: string): string', doc: 'Create or replace an image in assets/ from SVG source text: code draws the picture, no image file needed. The <svg> needs xmlns="http://www.w3.org/2000/svg" and a width and height in pixels: writeSvg("assets/card.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140"><rect width="100" height="140" rx="8" fill="white"/></svg>`). Use it as a texture like any image.' },
      { name: 'writeSound', type: '(path: string, recipe: { wave, from, to, length, attack?, volume?, seed? }): string', doc: 'Create or replace a sound effect in assets/ from a recipe: no sound file needed. wave is "square", "triangle", "sine", "saw" or "noise"; from and to are the pitch at the start and end in hertz (it slides between them); length and attack are in seconds; volume is 0 to 1; seed picks which noise. writeSound("assets/coin.wav", { wave: "square", from: 880, to: 1760, length: 0.15 }). Play it with an AudioStreamPlayer.' },
      { name: 'runTool', type: '(path: string): void', doc: 'Run a tool: a script in scripts/tools/ whose default export is a function of the project, like a Godot EditorScript. It builds what is too repetitive to click, such as 52 card pictures in a loop: export default function (project) { for (const suit of ["S", "H"]) project.writeSvg(`assets/${suit}.svg`, …); }. Files › New tool… makes one, and ▶ Run tool at the top of the script runs it as one undoable step. A tool cannot import other scripts. The game imports it like any script, which only defines the function, so it does nothing while the game runs.' },
      { name: 'saveBrain', type: '(path: string, brain: { actions, observation, method, policy, trained }): void', doc: 'Save a trained agent\'s brain in brains/ (Run › Train an agent… does this). A node whose script is an agent and names it in its brain field is driven by it.' },
      { name: 'removeBrain', type: '(path: string): void', doc: 'Delete a brain from brains/.' },
      { name: 'addAction', type: '(name: string, keys: string[]): void', doc: 'A new input action, with KeyboardEvent.code key names ("Space", "KeyA", "ArrowLeft").' },
      { name: 'setActionKeys', type: '(name: string, keys: string[]): void', doc: 'Change an action’s keys.' },
      { name: 'removeAction', type: '(name: string): void', doc: 'Remove an action.' },
      { name: 'importAsset', type: '(path: string, info: { mime, width, height, origin? }): string', doc: 'Record an imported image. The editor does this when you import or drag in art; the bytes are stored separately. origin says which lab made it ("sprite-forge:<id>"), so Edit in Sprite Forge opens the original.' },
      { name: 'replaceAsset', type: '(path: string, info: { mime, width, height, origin? }): string', doc: 'New bytes for an image at the same path: the editor does this when a picture edited in Sprite Forge comes back. Every node using the path shows the new picture; undo brings back the old one.' },
      { name: 'createTileset', type: '(path: string, { image, tileWidth, tileHeight, margin?, spacing?, solid? }): TilesetHandle', doc: 'A new tileset file in tilesets/: an image (already in the project) cut into tiles of this size. solid lists the tile numbers bodies stop against.' },
      { name: 'tileset', type: '(path: string): TilesetHandle', doc: 'An existing tileset.' },
    ],
  },
  {
    name: 'TilesetHandle',
    doc: 'A tileset, from project.createTileset or project.tileset. Set a field to change it: project.tileset("tilesets/a.tileset").solid = [0, 1, 5].',
    members: [
      { name: 'path', type: 'string', doc: 'Its file path.' },
      { name: 'image', type: 'string', doc: 'The image it cuts into tiles.' },
      { name: 'tileWidth', type: 'number', doc: 'Tile width in pixels.' },
      { name: 'tileHeight', type: 'number', doc: 'Tile height in pixels.' },
      { name: 'margin', type: 'number', doc: 'Pixels round the whole image before the first tile.' },
      { name: 'spacing', type: 'number', doc: 'Pixels between tiles.' },
      { name: 'solid', type: 'number[]', doc: 'The tile numbers with collision: whole-tile squares bodies stop against.' },
    ],
  },
  {
    name: 'SceneHandle',
    doc: 'A scene, from project.createScene or project.scene. In GUI → code the current one is called scene.',
    members: [
      { name: 'path', type: 'string', doc: 'Its file path, like "scenes/main.scene".' },
      { name: 'root', type: 'NodeHandle', doc: 'Its root node.' },
      { name: 'get', type: '(path: string): NodeHandle', doc: 'A node by its path from the root.' },
      { name: 'add', type: '(type: string, { name?, parent?, index?, script?, ...properties }): NodeHandle', doc: 'Add a node: add("Sprite2D", { parent: "Player", texture: "assets/p.png", position: { x: 0, y: -8 } }). Any Inspector property can be given.' },
      { name: 'instance', type: '(scene: string, { name?, parent?, index?, ...properties }): NodeHandle', doc: 'Put an instance of another scene here: instance("scenes/coin.scene", { position: { x: 40, y: 80 } }). Its contents come from that scene, so changing the scene changes every instance.' },
    ],
  },
  {
    name: 'NodeHandle',
    doc: 'A node in the project (not in a running game). Every Inspector property can be read and set by name: node.position = { x: 10, y: 20 }.',
    members: [
      { name: 'id', type: 'string', doc: 'Its permanent id.' },
      { name: 'type', type: 'string', doc: 'Its node type, like "Sprite2D".' },
      { name: 'path', type: 'string', doc: 'Its path from the scene root.' },
      { name: 'name', type: 'string', doc: 'Its name; setting it renames it (a clash gets a number).' },
      { name: 'script', type: 'string | null', doc: 'The script attached to it.' },
      { name: 'children', type: 'NodeHandle[]', doc: 'The nodes under it.' },
      { name: 'get', type: '(path: string): NodeHandle', doc: 'A node by a path relative to this one.' },
      { name: 'reparent', type: '(parentPath: string, index?: number): void', doc: 'Move it under another node. The GUI keeps it where it is on screen by also setting its position.' },
      { name: 'delete', type: '(): void', doc: 'Delete it and everything under it.' },
      { name: 'duplicate', type: '(): NodeHandle', doc: 'A copy next to it, with a new name.' },
      { name: 'instance', type: 'string | null', doc: 'The scene it is an instance of, or null.' },
      { name: 'groups', type: 'string[]', doc: 'The groups it is in: groups = ["enemies", "damageable"].' },
      { name: 'connect', type: '(signal: string, targetPath: string, method: string): void', doc: 'When this node emits the signal, call the method on the target: connect("bodyEntered", "Player", "collect"). Saved in the scene.' },
      { name: 'disconnect', type: '(signal: string, targetPath: string, method: string): void', doc: 'Remove a connection.' },
    ],
  },
  {
    name: 'TileMapLayer handle',
    doc: 'A TileMapLayer\u2019s node handle has these as well. The editor\u2019s brush strokes are logged as paint calls.',
    members: [
      { name: 'getCell', type: '(x: number, y: number): number', doc: 'The tile in a cell, or −1.' },
      { name: 'setCell', type: '(x: number, y: number, tile: number): void', doc: 'One cell (−1 erases).' },
      { name: 'paint', type: '(cells: [x, y, tile][]): void', doc: 'Several cells at once: one brush stroke.' },
      { name: 'fill', type: '(x: number, y: number, width: number, height: number, tile: number): void', doc: 'A rectangle of cells, from its top-left cell.' },
      { name: 'fromText', type: '(rows: string[], legend: { [character]: tile }, at?: { x, y }): void', doc: 'A map drawn as text: each character a cell, the legend saying which tile it is. A character not in the legend (a space) leaves its cell alone.' },
    ],
  },
];
