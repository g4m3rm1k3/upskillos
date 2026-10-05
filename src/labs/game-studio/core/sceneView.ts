// Where every node of a scene is, from the saved data: world transforms and drawing
// order, computed exactly as the engine computes them (engine/game.ts), so the editor
// viewport shows what Run will show.

import type { NodeData, SceneData, SpriteAnimation, Vec2 } from './types';
import { isA, propValue } from './registry';
import { IDENTITY, local, multiply, type Mat2D } from './math2d';
import { boxLayout, CONTAINER_TYPES, nodeSize } from './widgets';

const get = (n: NodeData) => (name: string) => propValue(n.type, n.props, name);
const isContainer = (n: NodeData) => CONTAINER_TYPES.has(n.type);

/** A node's size for a container's layout: a container's is what its children take up (as the engine's layout()). */
function layoutSize(n: NodeData): { w: number; h: number } {
  if (!isContainer(n)) return nodeSize(n.type, get(n)) ?? { w: 0, h: 0 };
  const vertical = n.type === 'VBoxContainer', sep = propValue(n.type, n.props, 'separation') as number;
  const sizes = shownChildren(n).map(layoutSize);
  const along = sizes.reduce((t, s) => t + (vertical ? s.h : s.w), 0) + sep * Math.max(0, sizes.length - 1);
  const across = sizes.reduce((m, s) => Math.max(m, vertical ? s.w : s.h), 0);
  return vertical ? { w: across, h: along } : { w: along, h: across };
}

/** A container's children that it places: the visible 2D ones. */
const shownChildren = (n: NodeData) => n.children.filter((c) => isA(c.type, 'Node2D') && (propValue(c.type, c.props, 'visible') as boolean));

/** Where a container puts each of its children, by id. */
function containerPlaces(n: NodeData): Map<string, Vec2> {
  const vertical = n.type === 'VBoxContainer', kids = shownChildren(n);
  const at = boxLayout(vertical, propValue(n.type, n.props, 'separation') as number, kids.map(layoutSize));
  return new Map(kids.map((c, i) => [c.id, at[i]!]));
}

export interface PlacedNode {
  node: NodeData;
  /** Parent's world transform times its local one (identity for non-2D nodes). */
  world: Mat2D;
  /** Its parent's world transform: what its position is relative to. */
  parentWorld: Mat2D;
  /** It and all its ancestors are visible. */
  visible: boolean;
  /** Drawing order, as the engine: the sum of zIndex down the tree (a CanvasLayer starts its layer's band), then tree order. */
  depth: number;
  is2D: boolean;
  /** Under a CanvasLayer: placed on the screen, not in the world. */
  screen: boolean;
}

/** Every node, in tree order, with where it is and whether it is drawn. */
export function placeNodes(scene: SceneData): PlacedNode[] {
  const out: PlacedNode[] = [];
  let order = 0;
  const visit = (n: NodeData, parent: Mat2D, visible: boolean, z: number, screen: boolean, placedAt?: Vec2) => {
    const is2D = isA(n.type, 'Node2D');
    let world = parent, vis = visible, zz = z, scr = screen;
    // A CanvasLayer's children are placed on the screen: their transforms start again from the origin.
    if (n.type === 'CanvasLayer') { world = IDENTITY; scr = true; zz = 1e6 * (propValue(n.type, n.props, 'layer') as number); }
    if (is2D) {
      // Inside a container, the container decides the position (as it does in the game).
      world = multiply(parent, local(placedAt ?? (propValue(n.type, n.props, 'position') as Vec2), propValue(n.type, n.props, 'rotation') as number, propValue(n.type, n.props, 'scale') as Vec2));
      vis = visible && (propValue(n.type, n.props, 'visible') as boolean);
      zz = z + (propValue(n.type, n.props, 'zIndex') as number);
    }
    out.push({ node: n, world, parentWorld: n.type === 'CanvasLayer' ? IDENTITY : parent, visible: vis, depth: zz + (order++) * 1e-6, is2D, screen: scr });
    const places = isContainer(n) ? containerPlaces(n) : null;
    for (const c of n.children) visit(c, world, vis, zz, scr, places?.get(c.id));
  };
  visit(scene.root, IDENTITY, true, 0, false);
  return out;
}

/** How a node that shows a picture looks in the editor: the same picture the game would show first. */
export interface SpriteLook { texture: string | null; flipX: boolean; flipY: boolean; opacity: number }

/**
 * The picture a Sprite2D or AnimatedSprite2D shows, or null for any other node. An
 * AnimatedSprite2D shows picture `frame` of its current animation, as the engine does
 * (engine/nodes.ts, AnimatedSprite2D._texture); no such animation shows nothing.
 */
export function spriteLook(n: NodeData): SpriteLook | null {
  const get = (k: string) => propValue(n.type, n.props, k);
  if (n.type === 'Sprite2D') return { texture: get('texture') as string | null, flipX: !!get('flipX'), flipY: !!get('flipY'), opacity: get('opacity') as number };
  if (n.type !== 'AnimatedSprite2D') return null;
  const a = (get('frames') as SpriteAnimation[]).find((x) => x.name === get('animation'));
  const texture = a && a.frames.length ? a.frames[Math.min(Math.max(0, Math.floor(get('frame') as number)), a.frames.length - 1)] : null;
  return { texture, flipX: !!get('flipX'), flipY: !!get('flipY'), opacity: get('opacity') as number };
}
