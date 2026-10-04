// The project model: everything a game is, as plain data. No React, no Phaser.
//
// This is the single source of truth (docs/game-studio-architecture.md, ADR 2).
// The editor changes it only through commands; the runtime receives a copy.

export const FORMAT_VERSION = 4;

export interface Vec2 { x: number; y: number }

/** One named animation of an AnimatedSprite2D: pictures (project paths) shown in turn, fps times a second. */
export interface SpriteAnimation { name: string; fps: number; loop: boolean; frames: string[] }

/** A property's value at a moment of an AnimationPlayer animation. */
export interface AnimationKey { time: number; value: KeyValue }
export type KeyValue = number | string | boolean | Vec2 | null;
/** One property of one node, changing over time. `path` is from the AnimationPlayer's parent: "Player/Sprite", or "." for the parent itself. */
export interface AnimationTrack { path: string; property: string; keys: AnimationKey[] }
/** One named AnimationPlayer animation: tracks over `length` seconds, looping or not. */
export interface AnimationClip { name: string; length: number; loop: boolean; tracks: AnimationTrack[] }

/** A value a node property can hold. Vectors are {x, y}; textures and scripts are project paths. */
export type PropValue = number | string | boolean | Vec2 | SpriteAnimation[] | AnimationClip[] | number[] | null;

export interface NodeData {
  /** Stable, never shown, never reused within the project. */
  id: string;
  /** A registered node type (core/registry.ts). */
  type: string;
  /** Unique among its siblings, so paths like "Player/Sprite" are unambiguous. */
  name: string;
  /** Only the properties that differ from the type's defaults are stored. */
  props: Record<string, PropValue>;
  /** Project path of the attached script, if any. */
  script: string | null;
  children: NodeData[];
  /** An instance of this scene (core/instances.ts): its contents come from there. Added in format 3. */
  instance?: string;
  /** Changed properties of nodes inside the instance, by their path from it ("Sprite", "Body/Shape"). */
  overrides?: Record<string, Record<string, PropValue>>;
  /** Groups it is in (names), for scripts to find nodes by group. */
  groups?: string[];
  /** Signals connected to other nodes' methods: when this node emits `signal`, `target`'s `method` runs. */
  connections?: Connection[];
  /** Only in an expanded scene, never saved: this node comes from an instance (which, and its path in it). */
  inherited?: { instance: string; path: string };
}

/** A signal connection. `target` is the id of a node in the same scene. */
export interface Connection { signal: string; target: string; method: string }

export interface SceneData {
  id: string;
  /** Project path, e.g. "scenes/main.scene". */
  path: string;
  root: NodeData;
}

export interface ScriptFile {
  /** Project path, e.g. "scripts/player.js". */
  path: string;
  source: string;
}

/**
 * A tileset: an image cut into a grid of tiles (core/tiles.ts), and which tiles are solid. A
 * project file, like a script, shared by every TileMapLayer that uses it.
 */
export interface TilesetData {
  /** Project path, e.g. "tilesets/dungeon.tileset". */
  path: string;
  /** The image, a project asset path. */
  image: string;
  tileWidth: number;
  tileHeight: number;
  /** Pixels round the whole image before the first tile. */
  margin: number;
  /** Pixels between tiles. */
  spacing: number;
  /** Tile ids with collision: each is a whole-tile square that bodies stop against. */
  solid: number[];
}

export type AssetKind = 'image';

/** An imported file. Its bytes live outside the model (storage), keyed by id. */
export interface AssetData {
  id: string;
  /** Project path, e.g. "assets/player.png". */
  path: string;
  kind: AssetKind;
  mime: string;
  width: number;
  height: number;
  /** Where the picture was made, so it can be opened there again: "sprite-forge:<sprite id>". */
  origin?: string;
  /** An SVG image written as text (project.writeSvg): the picture is this source, kept in the project, not separate bytes. */
  svg?: string;
}

/** A named input action and the keys bound to it (KeyboardEvent.code values, e.g. "ArrowLeft", "KeyA"). */
export interface InputAction { name: string; keys: string[] }

export interface ProjectSettings {
  width: number;
  height: number;
  background: string;
  mainScene: string | null;
  /** Scale images with hard edges (pixel art stays crisp when zoomed). Missing means true. */
  pixelArt?: boolean;
  /** Gravity for rigid bodies, and physics.gravity for scripts: pixels per second per second, downward. Missing means 980. */
  gravity?: number;
}

export interface Project {
  formatVersion: number;
  name: string;
  /** Counter for ids: deterministic, so replaying the code log rebuilds the same ids. */
  nextId: number;
  settings: ProjectSettings;
  input: InputAction[];
  scenes: SceneData[];
  scripts: ScriptFile[];
  /** Added in format 2. */
  tilesets: TilesetData[];
  assets: AssetData[];
  /** Trained agents (ml/): what an NPC's script asks what to do. Added in format 4. */
  brains: BrainData[];
}

/**
 * A trained agent's brain, saved in the project and exported with the game: a node whose script is an agent
 * (observe() and act(action)) and names it in its `brain` field is driven by it while the game runs.
 */
export interface BrainData {
  /** brains/<name>.json */
  path: string;
  /** The agent's actions and what it sees, by name, in order (for reading the brain; the policy uses positions). */
  actions: string[];
  observation: string[];
  method: 'q' | 'cem';
  /** A Q table over binned states, or a linear policy's weights (ml/brain.ts). */
  policy: { kind: 'q'; bins: number[][]; table: number[][]; visits?: number[] } | { weights: number[][] };
  /** How it was trained: the episodes (or generations), and its score against random play's. */
  trained: { steps: number; score: number; random: number };
}
