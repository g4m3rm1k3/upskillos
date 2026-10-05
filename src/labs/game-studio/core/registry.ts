// The node registry: every node type, defined once.
//
// The Inspector, the save format, the Game API reference and the runtime are all
// generated from this (ADR 6). A property listed here that the runtime never reads
// fails a test, which is the "no fake controls" rule made checkable.

import type { PropValue } from './types';

/**
 * 'enum' is one of `options`; 'layers' is a set of collision layers 1–16, stored as bits (layer n is bit n − 1);
 * 'spriteFrames' is a list of named animations, each a list of pictures (SpriteAnimation[]);
 * 'animations' is a list of AnimationPlayer animations, each tracks of keyframes (AnimationClip[]);
 * 'sound' is a sound asset's project path, or null; 'tileset' is a tileset's project path, or null; 'cells' is a TileMapLayer's painted cells (core/tiles.ts).
 */
export type PropType = 'number' | 'angle' | 'vec2' | 'bool' | 'string' | 'color' | 'texture' | 'sound' | 'enum' | 'layers' | 'spriteFrames' | 'animations' | 'tileset' | 'cells';

export interface PropDef {
  name: string;
  type: PropType;
  default: PropValue;
  /** Shown in the Inspector and the API reference. Plain words: what it does. */
  help: string;
  min?: number;
  max?: number;
  step?: number;
  /** For 'enum': the allowed values. */
  options?: string[];
}

export interface NodeTypeDef {
  type: string;
  /** The type this one extends: it has all of that type's properties too. */
  base: string | null;
  icon: string;
  help: string;
  /** Only the properties this type adds. */
  props: PropDef[];
  /** False for types only used as bases. */
  addable: boolean;
}

const TYPES: NodeTypeDef[] = [
  {
    type: 'Node', base: null, icon: '○', addable: true,
    help: 'The simplest node: a name in the tree, with children. Use it to group things or to hold a script.',
    props: [],
  },
  {
    type: 'Node2D', base: 'Node', icon: '✥', addable: true,
    help: 'A node with a place in 2D: position, rotation and scale. Its children move with it.',
    props: [
      { name: 'position', type: 'vec2', default: { x: 0, y: 0 }, help: 'Where it is, in pixels from its parent’s origin. +x is right, +y is down.', step: 1 },
      { name: 'rotation', type: 'angle', default: 0, help: 'How far it is turned, in radians (the Inspector shows degrees). Positive turns clockwise on screen.' },
      { name: 'scale', type: 'vec2', default: { x: 1, y: 1 }, help: 'How much it is stretched. 1 is normal size; negative flips it.', step: 0.1 },
      { name: 'visible', type: 'bool', default: true, help: 'Whether it and its children are drawn.' },
      { name: 'zIndex', type: 'number', default: 0, help: 'Drawing order: higher is drawn on top.', step: 1 },
    ],
  },
  {
    type: 'Sprite2D', base: 'Node2D', icon: '🖼', addable: true,
    help: 'Draws an image, centred on its position.',
    props: [
      { name: 'texture', type: 'texture', default: null, help: 'The image to draw (a project path, e.g. assets/player.png).' },
      { name: 'flipX', type: 'bool', default: false, help: 'Mirror the image left to right.' },
      { name: 'flipY', type: 'bool', default: false, help: 'Mirror the image top to bottom.' },
      { name: 'opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.05, help: '1 is solid, 0 is invisible.' },
    ],
  },
  {
    type: 'AnimatedSprite2D', base: 'Node2D', icon: '🎞', addable: true,
    help: 'Draws a picture that changes: named animations (walk, jump…), each a list of pictures shown in turn.',
    props: [
      { name: 'frames', type: 'spriteFrames', default: [], help: 'The animations: each has a name, pictures, a speed in frames per second, and whether it loops.' },
      { name: 'animation', type: 'string', default: 'default', help: 'The animation shown, by name. A script changes it with play("walk").' },
      { name: 'playing', type: 'bool', default: true, help: 'Whether it moves through its pictures. On: it plays from the start of the game.' },
      { name: 'speedScale', type: 'number', default: 1, min: 0, max: 10, step: 0.1, help: 'How fast it plays: 2 is twice as fast, 0.5 half.' },
      { name: 'frame', type: 'number', default: 0, min: 0, step: 1, help: 'Which picture of the animation is showing, counting from 0.' },
      { name: 'flipX', type: 'bool', default: false, help: 'Mirror the pictures left to right.' },
      { name: 'flipY', type: 'bool', default: false, help: 'Mirror the pictures top to bottom.' },
      { name: 'opacity', type: 'number', default: 1, min: 0, max: 1, step: 0.05, help: '1 is solid, 0 is invisible.' },
    ],
  },
  {
    type: 'AnimationPlayer', base: 'Node', icon: '⏯', addable: true,
    help: 'Changes other nodes\u2019 properties over time, from keyframes on a timeline: a door sliding, a coin bobbing, a flash when hit.',
    props: [
      { name: 'animations', type: 'animations', default: [], help: 'The animations: each has a length in seconds, whether it loops, and tracks. A track is one property of one node (a path from this player\u2019s parent) with keyframes. Edit them in the Animation panel.' },
      { name: 'autoplay', type: 'string', default: '', help: 'The animation to play when the game starts, by name. Empty: none, until a script calls play().' },
      { name: 'speedScale', type: 'number', default: 1, min: 0, max: 10, step: 0.1, help: 'How fast it plays: 2 is twice as fast, 0.5 half.' },
    ],
  },
  {
    type: 'TileMapLayer', base: 'Node2D', icon: '▦', addable: true,
    help: 'A grid of tiles from a tileset: floors, walls, platforms. Paint it in the viewport. Tiles the tileset marks solid stop bodies. Use several layers for things in front of or behind each other.',
    props: [
      { name: 'tileset', type: 'tileset', default: null, help: 'The tileset its tiles come from (a file in tilesets/).' },
      { name: 'cells', type: 'cells', default: [], help: 'The painted cells: for each, its x and y in cells and its tile number. Paint them in the viewport with the TileMap panel.' },
      { name: 'collisionLayer', type: 'layers', default: 1, help: 'The layers its solid tiles are on. Bodies stop at them if their mask includes one of these layers.' },
    ],
  },
  {
    type: 'Camera2D', base: 'Node2D', icon: '🎥', addable: true,
    help: 'What the player sees. Put it under the player and it follows. The first camera with current on is used.',
    props: [
      { name: 'current', type: 'bool', default: true, help: 'Whether this camera is the one used. The first current camera in the tree wins.' },
      { name: 'zoom', type: 'number', default: 1, min: 0.1, max: 10, step: 0.1, help: 'How close it is. 2 shows everything twice as big (half as much of the world).' },
      { name: 'smoothing', type: 'number', default: 0, min: 0, max: 30, step: 0.5, help: 'How gently it catches up: 0 follows exactly; around 5 lags a little behind, which feels smooth.' },
      { name: 'limitTopLeft', type: 'vec2', default: { x: -10000000, y: -10000000 }, step: 16, help: 'The camera never shows anything left of or above this point: set it to the level\u2019s top-left corner.' },
      { name: 'limitBottomRight', type: 'vec2', default: { x: 10000000, y: 10000000 }, step: 16, help: 'The camera never shows anything right of or below this point: set it to the level\u2019s bottom-right corner.' },
    ],
  },
  {
    type: 'Label', base: 'Node2D', icon: '🔤', addable: true,
    help: 'Text: a score, a message, a title. Its position is its top-left corner.',
    props: [
      { name: 'text', type: 'string', default: 'Label', help: 'The words shown. A script can change it: this.text = `Score: ${score}`.' },
      { name: 'fontSize', type: 'number', default: 24, min: 4, max: 256, step: 1, help: 'The height of the letters, in pixels.' },
      { name: 'color', type: 'color', default: '#ffffff', help: 'The colour of the text.' },
      { name: 'wrapWidth', type: 'number', default: 0, min: 0, step: 1, help: 'Wrap the text onto new lines at this width in pixels: for dialogue and descriptions. 0 does not wrap.' },
      { name: 'visibleCharacters', type: 'number', default: -1, min: -1, step: 1, help: 'How many letters are shown: −1 shows them all. Raise it a few letters at a time for typewriter dialogue. The text wraps as if it were all shown, so words do not jump lines as they appear.' },
    ],
  },
  {
    type: 'Panel', base: 'Node2D', icon: '▢', addable: true,
    help: 'A box: the background of a menu, a dialogue box or an inventory. Its position is its top-left corner. Put it under a CanvasLayer to keep it on the screen.',
    props: [
      { name: 'size', type: 'vec2', default: { x: 200, y: 120 }, step: 1, help: 'Width and height in pixels.' },
      { name: 'color', type: 'color', default: '#1e2433', help: 'The colour inside.' },
      { name: 'borderColor', type: 'color', default: '#8899bb', help: 'The colour of its edge.' },
      { name: 'borderWidth', type: 'number', default: 2, min: 0, max: 32, step: 1, help: 'How thick its edge is, in pixels. 0 has no edge.' },
    ],
  },
  {
    type: 'Button', base: 'Node2D', icon: '🔘', addable: true,
    help: 'A button: click it, or give it the focus (grabFocus()) and use the arrow keys and Enter. It emits pressed, and calls its script\u2019s pressed(). Its position is its top-left corner.',
    props: [
      { name: 'text', type: 'string', default: 'Button', help: 'The words on it.' },
      { name: 'size', type: 'vec2', default: { x: 140, y: 40 }, step: 1, help: 'Width and height in pixels: the area you can click.' },
      { name: 'fontSize', type: 'number', default: 18, min: 4, max: 128, step: 1, help: 'The height of its letters, in pixels.' },
      { name: 'color', type: 'color', default: '#3b5bdb', help: 'Its colour. It lightens under the pointer and darkens while pressed.' },
      { name: 'textColor', type: 'color', default: '#ffffff', help: 'The colour of its words.' },
      { name: 'disabled', type: 'bool', default: false, help: 'Greyed out: it cannot be pressed or given the focus. A script can turn this on and off (not enough gold, say).' },
    ],
  },
  {
    type: 'ProgressBar', base: 'Node2D', icon: '▬', addable: true,
    help: 'A bar that fills from left to right: health, experience, a cooldown. Set value from a script. Its position is its top-left corner.',
    props: [
      { name: 'size', type: 'vec2', default: { x: 160, y: 16 }, step: 1, help: 'Width and height in pixels.' },
      { name: 'value', type: 'number', default: 50, step: 1, help: 'How full it is, from 0 to maxValue.' },
      { name: 'maxValue', type: 'number', default: 100, min: 0, step: 1, help: 'The value that fills it.' },
      { name: 'fillColor', type: 'color', default: '#40c057', help: 'The colour of the filled part.' },
      { name: 'backColor', type: 'color', default: '#2b2f3a', help: 'The colour of the empty part.' },
      { name: 'showText', type: 'bool', default: false, help: 'Show "value / maxValue" on the bar.' },
    ],
  },
  {
    type: 'BoxContainer', base: 'Node2D', icon: '☰', addable: false,
    help: 'Places its children one after another. Use VBoxContainer or HBoxContainer.',
    props: [
      { name: 'separation', type: 'number', default: 8, min: 0, step: 1, help: 'The gap between one child and the next, in pixels.' },
    ],
  },
  {
    type: 'VBoxContainer', base: 'BoxContainer', icon: '☰', addable: true,
    help: 'Places its children in a column, top to bottom: a menu of buttons, an inventory list. It sets their positions, so add, remove or hide children and the rest move up.',
    props: [],
  },
  {
    type: 'HBoxContainer', base: 'BoxContainer', icon: '⫼', addable: true,
    help: 'Places its children in a row, left to right: a hotbar, a row of hearts. It sets their positions, so add, remove or hide children and the rest move along.',
    props: [],
  },
  {
    type: 'AudioStreamPlayer', base: 'Node', icon: '🔊', addable: true,
    help: 'Plays a sound: an effect or music. Call play() from a script (this.get("Coin sound").play()), or turn on autoplay. It emits finished when a sound ends.',
    props: [
      { name: 'stream', type: 'sound', default: null, help: 'The sound it plays: one made with Files › New sound… (project.writeSound).' },
      { name: 'volume', type: 'number', default: 1, min: 0, max: 1, step: 0.05, help: 'How loud: 0 is silent, 1 is as recorded. (Godot measures this in decibels, volume_db.)' },
      { name: 'pitchScale', type: 'number', default: 1, min: 0.25, max: 4, step: 0.05, help: 'Faster and higher, or slower and lower: 2 is an octave up and half as long. A little random pitch on each play keeps a repeated sound from tiring the ear.' },
      { name: 'autoplay', type: 'bool', default: false, help: 'Start playing when the scene starts: music, or a sound that should play once at the beginning.' },
      { name: 'loop', type: 'bool', default: false, help: 'Play again from the start each time it ends, until stop(): music and engine hums.' },
    ],
  },
  {
    type: 'CanvasLayer', base: 'Node', icon: '🗔', addable: true,
    help: 'Draws its children on the screen, not in the world: they stay put when the camera moves or zooms. Use it for a HUD.',
    props: [
      { name: 'layer', type: 'number', default: 1, min: -100, max: 100, step: 1, help: 'Which layer: higher layers are drawn on top of lower ones, and every layer is over the world.' },
    ],
  },
  {
    type: 'CollisionShape2D', base: 'Node2D', icon: '▭', addable: true,
    help: 'The solid part of a body or area: a rectangle or a circle, centred on its position. Put it under a StaticBody2D, CharacterBody2D, RigidBody2D or Area2D.',
    props: [
      { name: 'shape', type: 'enum', default: 'rectangle', options: ['rectangle', 'circle'], help: 'A rectangle, or a circle as wide as the size.' },
      { name: 'size', type: 'vec2', default: { x: 16, y: 16 }, step: 1, help: 'Width and height in pixels. A circle uses the width as its diameter.' },
    ],
  },
  {
    type: 'StaticBody2D', base: 'Node2D', icon: '🧱', addable: true,
    help: 'Something solid that does not move by itself: walls, floors, platforms. Other bodies stop against its collision shapes.',
    props: [
      { name: 'collisionLayer', type: 'layers', default: 1, help: 'The layers this body is on. Other bodies and areas only notice it if their mask includes one of these layers.' },
    ],
  },
  {
    type: 'CharacterBody2D', base: 'Node2D', icon: '🏃', addable: true,
    help: 'A body you move from a script: set velocity, then call moveAndSlide() in physicsUpdate. It stops at solid bodies, slides along them, and knows isOnFloor().',
    props: [
      { name: 'collisionLayer', type: 'layers', default: 1, help: 'The layers this body is on.' },
      { name: 'collisionMask', type: 'layers', default: 1, help: 'The layers it collides with: it stops only at bodies on one of these layers.' },
    ],
  },
  {
    type: 'RigidBody2D', base: 'Node2D', icon: '⚽', addable: true,
    help: 'A body that moves by itself: gravity pulls it, it keeps its velocity, and it bounces off solid bodies. Set its velocity from a script to throw it.',
    props: [
      { name: 'collisionLayer', type: 'layers', default: 1, help: 'The layers this body is on.' },
      { name: 'collisionMask', type: 'layers', default: 1, help: 'The layers it collides with.' },
      { name: 'gravityScale', type: 'number', default: 1, step: 0.1, help: 'How much gravity pulls it: 1 is normal, 0 floats (a Breakout ball), −1 falls up.' },
      { name: 'bounce', type: 'number', default: 0, min: 0, max: 1, step: 0.05, help: 'How much speed it keeps when it hits something: 0 stops dead against it, 1 bounces back as fast as it came.' },
    ],
  },
  {
    type: 'Area2D', base: 'Node2D', icon: '◌', addable: true,
    help: 'A region that notices bodies coming in and going out (its script\u2019s bodyEntered and bodyExited), without stopping them: pickups, goals, danger zones.',
    props: [
      { name: 'collisionMask', type: 'layers', default: 1, help: 'The layers of the bodies it notices.' },
    ],
  },
];

const BY_TYPE = new Map(TYPES.map((t) => [t.type, t]));

export function nodeType(type: string): NodeTypeDef {
  const t = BY_TYPE.get(type);
  if (!t) throw new Error(`Unknown node type "${type}"`);
  return t;
}

export const isNodeType = (type: string): boolean => BY_TYPE.has(type);

/** Every type, base types first. */
export const nodeTypes = (): NodeTypeDef[] => [...TYPES];

/** The chain from the root type down to this one: Node, Node2D, Sprite2D. */
export function lineage(type: string): NodeTypeDef[] {
  const out: NodeTypeDef[] = [];
  for (let t: NodeTypeDef | undefined = nodeType(type); t; t = t.base ? BY_TYPE.get(t.base) : undefined) out.unshift(t);
  return out;
}

/** All properties of a type, its bases' first. */
export function propsOf(type: string): PropDef[] {
  return lineage(type).flatMap((t) => t.props);
}

export function propDef(type: string, name: string): PropDef | undefined {
  return propsOf(type).find((p) => p.name === name);
}

/** Whether a type is (or extends) another: isA('Sprite2D', 'Node2D') is true. */
export function isA(type: string, base: string): boolean {
  return lineage(type).some((t) => t.type === base);
}

/** A property's value on a node: stored if set, else the default. Vectors and lists are copied, so changing the result changes nothing. */
export function propValue(type: string, props: Record<string, PropValue>, name: string): PropValue {
  const def = propDef(type, name);
  if (!def) throw new Error(`${type} has no property "${name}"`);
  const v = name in props ? props[name] : def.default;
  return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) as PropValue : v;
}

/** Check a value against its property type; returns a message, or null if it fits. */
export function checkProp(def: PropDef, v: unknown): string | null {
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  switch (def.type) {
    case 'number': case 'angle':
      if (!num(v)) return `${def.name} must be a number`;
      if (def.min !== undefined && (v as number) < def.min) return `${def.name} must be at least ${def.min}`;
      if (def.max !== undefined && (v as number) > def.max) return `${def.name} must be at most ${def.max}`;
      return null;
    case 'vec2':
      return v && typeof v === 'object' && num((v as { x: unknown }).x) && num((v as { y: unknown }).y) ? null : `${def.name} must be { x, y } with numbers`;
    case 'bool':
      return typeof v === 'boolean' ? null : `${def.name} must be true or false`;
    case 'string':
      return typeof v === 'string' ? null : `${def.name} must be text`;
    case 'color':
      return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? null : `${def.name} must be a colour like "#ff8800"`;
    case 'texture':
      return v === null || typeof v === 'string' ? null : `${def.name} must be an image path, or null`;
    case 'sound':
      return v === null || typeof v === 'string' ? null : `${def.name} must be a sound path, or null`;
    case 'enum':
      return typeof v === 'string' && def.options!.includes(v) ? null : `${def.name} must be one of ${def.options!.map((o) => `"${o}"`).join(', ')}`;
    case 'layers':
      return Number.isInteger(v) && (v as number) >= 0 && (v as number) < 2 ** 16 ? null : `${def.name} must be a set of layers 1–16 (a whole number of bits, 0 to 65535)`;
    case 'tileset':
      return v === null || (typeof v === 'string' && /^tilesets\/.+\.tileset$/.test(v)) ? null : `${def.name} must be a tileset path (tilesets/….tileset), or null`;
    case 'cells': {
      if (!Array.isArray(v) || v.length % 3 !== 0 || v.some((x) => !Number.isInteger(x))) return `${def.name} must be a list of whole numbers, three per cell: x, y, tile`;
      const seen = new Set<string>();
      for (let i = 0; i < v.length; i += 3) {
        if (v[i + 2] < 0 || v[i + 2] >= 2 ** 32) return `${def.name}: tile numbers start at 0 (cell ${v[i]}, ${v[i + 1]} has ${v[i + 2]}); flip flags are the top three of 32 bits`;
        if (Math.abs(v[i]) > 100000 || Math.abs(v[i + 1]) > 100000) return `${def.name}: cell ${v[i]}, ${v[i + 1]} is too far out (at most 100000 cells)`;
        const k = `${v[i]},${v[i + 1]}`;
        if (seen.has(k)) return `${def.name}: cell ${k} is painted twice`;
        seen.add(k);
      }
      return null;
    }
    case 'animations': {
      const shape = 'a list of { name, length, loop, tracks: [{ path, property, keys: [{ time, value }] }] }';
      if (!Array.isArray(v)) return `${def.name} must be ${shape}`;
      const names = new Set<string>();
      const isValue = (x: unknown) => x === null || typeof x === 'string' || typeof x === 'boolean' || num(x)
        || (!!x && typeof x === 'object' && num((x as { x: unknown }).x) && num((x as { y: unknown }).y) && Object.keys(x).length === 2);
      for (const c of v as unknown[]) {
        const a = c as Record<string, unknown>;
        if (!a || typeof a !== 'object' || typeof a.name !== 'string' || !a.name.trim()) return `${def.name}: every animation needs a name (${shape})`;
        if (names.has(a.name)) return `${def.name}: two animations are both called "${a.name}"`;
        names.add(a.name);
        if (!num(a.length) || (a.length as number) <= 0 || (a.length as number) > 3600) return `${def.name}: "${a.name}" needs a length in seconds, above 0`;
        if (typeof a.loop !== 'boolean') return `${def.name}: "${a.name}" needs loop: true or false`;
        if (!Array.isArray(a.tracks)) return `${def.name}: "${a.name}" needs tracks: a list`;
        if (Object.keys(a).some((k) => !['name', 'length', 'loop', 'tracks'].includes(k))) return `${def.name}: "${a.name}" has something other than name, length, loop and tracks`;
        const seen = new Set<string>();
        for (const tr of a.tracks as Record<string, unknown>[]) {
          if (!tr || typeof tr.path !== 'string' || !tr.path || typeof tr.property !== 'string' || !tr.property) return `${def.name}: "${a.name}" has a track without a path and a property`;
          const id = `${tr.path}.${tr.property}`;
          if (seen.has(id)) return `${def.name}: "${a.name}" has two tracks for ${id}`;
          seen.add(id);
          if (!Array.isArray(tr.keys)) return `${def.name}: "${a.name}", ${id} needs keys: a list of { time, value }`;
          let last = -Infinity;
          for (const k of tr.keys as Record<string, unknown>[]) {
            if (!k || !num(k.time) || !('value' in k) || !isValue(k.value)) return `${def.name}: "${a.name}", ${id}: every key needs a time and a value`;
            if ((k.time as number) < 0 || (k.time as number) > (a.length as number)) return `${def.name}: "${a.name}", ${id}: a key at ${k.time} s is outside 0 to ${a.length} s`;
            if ((k.time as number) <= last) return `${def.name}: "${a.name}", ${id}: keys must be in time order, one per time`;
            last = k.time as number;
          }
        }
      }
      return null;
    }
    case 'spriteFrames': {
      const shape = 'a list of { name, fps, loop, frames: [image paths] }';
      if (!Array.isArray(v)) return `${def.name} must be ${shape}`;
      const names = new Set<string>();
      for (const a of v as unknown[]) {
        const x = a as Record<string, unknown>;
        if (!x || typeof x !== 'object' || typeof x.name !== 'string' || !x.name.trim()) return `${def.name}: every animation needs a name (${shape})`;
        if (names.has(x.name)) return `${def.name}: two animations are both called "${x.name}"`;
        names.add(x.name);
        if (!num(x.fps) || (x.fps as number) <= 0 || (x.fps as number) > 120) return `${def.name}: "${x.name}" needs fps, frames per second, above 0 and at most 120`;
        if (typeof x.loop !== 'boolean') return `${def.name}: "${x.name}" needs loop: true or false`;
        if (!Array.isArray(x.frames) || x.frames.some((f) => typeof f !== 'string')) return `${def.name}: "${x.name}" needs frames: a list of image paths`;
        if (Object.keys(x).some((k) => !['name', 'fps', 'loop', 'frames'].includes(k))) return `${def.name}: "${x.name}" has something other than name, fps, loop and frames`;
      }
      return null;
    }
  }
}
