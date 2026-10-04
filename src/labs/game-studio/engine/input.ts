// Input as named actions (ADR 7). Scripts ask about actions, never keys:
//
//   input.isPressed('jump')        held down this frame
//   input.isJustPressed('jump')    went down since the last frame
//   input.isJustReleased('jump')   came up since the last frame
//
// "Since the last frame" means since the last update() when asked in update(), and since
// the last physics step when asked in physicsUpdate(). The two run at different rates (a
// 144 Hz screen draws two or three frames per physics step, some with no step at all),
// so one shared "just" would lose presses that fell in a frame with no physics step.
//   input.axis('move_left', 'move_right')          −1, 0 or 1
//   input.vector('move_left', 'move_right', 'move_up', 'move_down')   length at most 1
//
// Keys are KeyboardEvent.code values ("ArrowLeft", "KeyA", "Space"), so they mean
// the same key whatever the keyboard layout. Mouse buttons are keys too, "MouseLeft" and "MouseRight", so an action
// can be a click: addAction('select', ['MouseLeft']).
//
//   input.mouse          where the pointer is, in the world (where a node's position would be)
//   input.mouseScreen    where it is on the screen, in the game's pixels (as a CanvasLayer's children are placed)

import { Vec2 } from './vec2';
import type { InputAction } from '../core/types';

export class Input {
  private held = new Set<string>();
  private down = new Set<string>();
  private up = new Set<string>();
  private physicsDown = new Set<string>();
  private physicsUp = new Set<string>();
  /** True while physicsUpdate runs: "just" then means since the last physics step. */
  inPhysics = false;
  private actions = new Map<string, string[]>();
  private _pointer = new Vec2(0, 0);
  /** Screen to world, through the camera (the game sets it). */
  _toWorld: (screen: Vec2) => Vec2 = (p) => p;

  constructor(actions: InputAction[]) {
    for (const a of actions) this.actions.set(a.name, [...a.keys]);
  }

  /** Feed a key event (from the page). */
  key(code: string, pressed: boolean): void {
    if (pressed && !this.held.has(code)) { this.held.add(code); this.down.add(code); this.physicsDown.add(code); }
    if (!pressed && this.held.has(code)) { this.held.delete(code); this.up.add(code); this.physicsUp.add(code); }
  }

  /** Feed the pointer's position on the screen, in the game's pixels (from the page). */
  _move(x: number, y: number): void { this._pointer = new Vec2(x, y); }

  get mouseScreen(): Vec2 { return this._pointer; }
  get mouse(): Vec2 { return this._toWorld(this._pointer); }

  /** Forget "just" presses and releases: called once at the end of each frame. */
  endFrame(): void { this.down.clear(); this.up.clear(); }

  /** The same for physicsUpdate: called after each physics step. */
  endPhysicsStep(): void { this.physicsDown.clear(); this.physicsUp.clear(); }

  /** Release everything (the game lost focus, so keys would otherwise stick). */
  releaseAll(): void { for (const k of this.held) { this.up.add(k); this.physicsUp.add(k); } this.held.clear(); }

  private keys(action: string): string[] {
    const k = this.actions.get(action);
    if (!k) throw new Error(`There is no input action "${action}". Add it in Project › Input map.`);
    return k;
  }

  isPressed(action: string): boolean { return this.keys(action).some((k) => this.held.has(k)); }
  isJustPressed(action: string): boolean { const d = this.inPhysics ? this.physicsDown : this.down; return this.keys(action).some((k) => d.has(k)); }
  isJustReleased(action: string): boolean { const u = this.inPhysics ? this.physicsUp : this.up; return this.keys(action).some((k) => u.has(k)); }

  axis(negative: string, positive: string): number {
    return Number(this.isPressed(positive)) - Number(this.isPressed(negative));
  }

  /** A direction from four actions, normalized so diagonals are not faster. */
  vector(left: string, right: string, up: string, down: string): Vec2 {
    return new Vec2(this.axis(left, right), this.axis(up, down)).normalized();
  }

  get actionNames(): string[] { return [...this.actions.keys()]; }
}
