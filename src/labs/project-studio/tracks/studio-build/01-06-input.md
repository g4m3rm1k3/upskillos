---
title: 1.6 — Input: Keys, Actions and the Moment of a Press
track: Build Your Own Game Studio
runtime: none
concepts: events, polling, map, set, input-actions
problem: Key presses arrive whenever the player's fingers move, between frames, and a held key repeats by itself. Game code runs in fixed steps and wants simple answers: is jump held? was it pressed just now? which way is the player steering? How does the engine turn one into the other?
---

The browser tells a page about the keyboard with **events**: a message each time something happens. `keydown` arrives when a key goes down, `keyup` when it comes up. Events arrive at any moment, whenever the player's fingers move, not in step with the game.

Game code works the other way round. In each `update`, the player's code *asks*: "is the jump key down right now?" Asking for the current state, instead of waiting to be told, is called **polling**.

The engine's `Input` object sits between the two:

- It **listens** to the events and keeps a record of what's held down.
- It **answers** polling questions from that record, at any time.

It also lets game code talk about **actions**, not keys. The game asks about `'jump'`; a list says which keys mean jump (Space, the up arrow and W, say). Players can then change keys without anyone changing the game's code, and a typo in an action name can be caught at once.

Keys are named by their **code**, a name for the key's *position* on the keyboard: `'ArrowLeft'`, `'Space'`, `'KeyA'`. The code is the same whatever letter is printed on the key, so W-A-S-D works on a French keyboard, where those keys are labelled Z-Q-S-D.

## Held keys: tests

Create `src/engine/input.test.ts`:

```ts file=src/engine/input.test.ts
import { expect, test } from 'vitest';
import { Input } from './input';

test('an action is held while any of its keys is down', () => {
  const input = new Input();
  input.addAction('jump', ['Space', 'ArrowUp']);
  expect(input.isPressed('jump')).toBe(false);
  input.key('ArrowUp', true);
  expect(input.isPressed('jump')).toBe(true);
  input.key('ArrowUp', false);
  expect(input.isPressed('jump')).toBe(false);
});

test('asking about an action that does not exist is an error', () => {
  const input = new Input();
  expect(() => input.isPressed('jmup')).toThrow('There is no input action "jmup"');
});
```

- `input.key(code, down)` is how events will be fed in: `true` when the key goes down, `false` when it comes up. The test calls it directly, standing in for the keyboard, so no real keys or window are needed.
- `'jmup'` is a typo. Without an error it would quietly answer `false` for ever, and the player would never jump, with no clue why.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './input'"
```

## A map of actions, a set of keys

Create `src/engine/input.ts`:

```ts file=src/engine/input.ts
export class Input {
  private readonly actions = new Map<string, string[]>();
  private readonly held = new Set<string>();

  addAction(name: string, keys: string[]): void {
    this.actions.set(name, keys);
  }

  key(code: string, down: boolean): void {
    if (down) this.held.add(code);
    else this.held.delete(code);
  }

  isPressed(action: string): boolean {
    return this.keysOf(action).some((code) => this.held.has(code));
  }

  private keysOf(action: string): string[] {
    const keys = this.actions.get(action);
    if (!keys) throw new Error(`There is no input action "${action}"`);
    return keys;
  }
}
```

- A **`Map`** stores **key–value pairs**: give it a key and it gives back the value stored under it. `Map<string, string[]>` maps an action's name to its list of key codes: `'jump'` → `['Space', 'ArrowUp']`. (The *keys* of a Map are a different idea from keyboard keys, despite the name.)
- `this.actions.set(name, keys)` stores a pair, replacing any earlier one with that name. `this.actions.get(action)` returns the value, or `undefined` if there's no pair with that name.
- A **`Set`** stores values with no repeats and no order, and answers *is this in it?* very quickly. `held` is the set of key codes that are down right now.
- `add` puts a value in (adding one that's already there does nothing), `delete` takes it out, `has` asks whether it's in.
- `down: boolean` is a parameter of type **`boolean`**, the type whose only two values are `true` and `false`. `isPressed` returns one too: `: boolean`.
- `if (down) … else …`: `else` gives the statement to run when the condition is false.
- `keysOf(action).some(fn)` calls `fn` on each code in the list and returns `true` as soon as one call returns `true`; `false` if none does. So an action is pressed if *any* of its keys is held.
- Why a Set and not an array for `held`? `has` on a Set takes the same tiny time however many values it holds. Finding a value in an array means looking at every item until it turns up. It's also impossible for a Set to hold `'Space'` twice, which an array allows by mistake.
- `readonly` here stops the *field* being replaced by another Map or Set. The Map and Set themselves can still be changed. `keysOf` is `private`: a helper for the class's own methods, not part of what other code can call.

```check
run "npx vitest run src" stdout="24 passed"
run "npx tsc"
```

## Just pressed: a test

Holding jump shouldn't make the player jump again and again; a jump happens on the **press**, the moment the key goes down. So `Input` also needs `isJustPressed`: *did a key for this action go down since the last step?* Add a test:

```ts file=src/engine/input.test.ts
import { expect, test } from 'vitest';
import { Input } from './input';

test('an action is held while any of its keys is down', () => {
  const input = new Input();
  input.addAction('jump', ['Space', 'ArrowUp']);
  expect(input.isPressed('jump')).toBe(false);
  input.key('ArrowUp', true);
  expect(input.isPressed('jump')).toBe(true);
  input.key('ArrowUp', false);
  expect(input.isPressed('jump')).toBe(false);
});

test('asking about an action that does not exist is an error', () => {
  const input = new Input();
  expect(() => input.isPressed('jmup')).toThrow('There is no input action "jmup"');
});

test('a press counts once, until the end of the step, however long the key is held', () => {
  const input = new Input();
  input.addAction('jump', ['Space']);
  input.key('Space', true);
  expect(input.isJustPressed('jump')).toBe(true);
  input.endStep();
  expect(input.isJustPressed('jump')).toBe(false);
  input.key('Space', true);
  expect(input.isJustPressed('jump')).toBe(false);
  expect(input.isPressed('jump')).toBe(true);
});
```

- `endStep()` will be called by the engine after each fixed step, to forget the presses that step has seen.
- The second `input.key('Space', true)`, with no `keyup` in between, is what a held key does. Hold a key down in any text box and after a moment the letter repeats: the operating system sends `keydown` again and again, about 30 times a second, while the key stays down. Those repeats aren't new presses.

```check
run "npx vitest run src" exit=1 stderr="input.isJustPressed is not a function"
```

## The moment of a press

```ts file=src/engine/input.ts
export class Input {
  private readonly actions = new Map<string, string[]>();
  private readonly held = new Set<string>();
  private readonly pressedThisStep = new Set<string>();

  addAction(name: string, keys: string[]): void {
    this.actions.set(name, keys);
  }

  key(code: string, down: boolean): void {
    if (down && !this.held.has(code)) this.pressedThisStep.add(code);
    if (down) this.held.add(code);
    else this.held.delete(code);
  }

  isPressed(action: string): boolean {
    return this.keysOf(action).some((code) => this.held.has(code));
  }

  isJustPressed(action: string): boolean {
    return this.keysOf(action).some((code) => this.pressedThisStep.has(code));
  }

  endStep(): void {
    this.pressedThisStep.clear();
  }

  private keysOf(action: string): string[] {
    const keys = this.actions.get(action);
    if (!keys) throw new Error(`There is no input action "${action}"`);
    return keys;
  }
}
```

- `pressedThisStep` is a second Set: the keys that went down since the last `endStep`.
- `if (down && !this.held.has(code))`: a `keydown` for a key that *wasn't* already held is a real press. A repeat finds the key already in `held` and is ignored. The check runs before the line that adds to `held`, so it sees the state from before this event.
- `isJustPressed` asks the same question as `isPressed`, of the other Set.
- `endStep` empties it with `clear()`.
- Why *since the last step* and not *since the last frame*? At 144 frames a second and 60 steps, many frames have no step at all (lesson 1.5). A press forgotten at the end of a frame with no step would never be seen by any `update`, and the jump would be lost. Forgetting only after a step has run means every press is seen by exactly one step.

```check
run "npx vitest run src" stdout="25 passed"
run "npx tsc"
```

## Steering: tests

Movement asks a different question: *which way?* Left and right arrows together make an **axis**: −1 for left, +1 for right, 0 for neither, or both at once. Two axes make a direction vector. Add the tests:

```ts file=src/engine/input.test.ts
import { expect, test } from 'vitest';
import { Input } from './input';
import { Vec2 } from './vec2';

test('an action is held while any of its keys is down', () => {
  const input = new Input();
  input.addAction('jump', ['Space', 'ArrowUp']);
  expect(input.isPressed('jump')).toBe(false);
  input.key('ArrowUp', true);
  expect(input.isPressed('jump')).toBe(true);
  input.key('ArrowUp', false);
  expect(input.isPressed('jump')).toBe(false);
});

test('asking about an action that does not exist is an error', () => {
  const input = new Input();
  expect(() => input.isPressed('jmup')).toThrow('There is no input action "jmup"');
});

test('a press counts once, until the end of the step, however long the key is held', () => {
  const input = new Input();
  input.addAction('jump', ['Space']);
  input.key('Space', true);
  expect(input.isJustPressed('jump')).toBe(true);
  input.endStep();
  expect(input.isJustPressed('jump')).toBe(false);
  input.key('Space', true);
  expect(input.isJustPressed('jump')).toBe(false);
  expect(input.isPressed('jump')).toBe(true);
});

function arrows(): Input {
  const input = new Input();
  input.addAction('left', ['ArrowLeft']);
  input.addAction('right', ['ArrowRight']);
  input.addAction('up', ['ArrowUp']);
  input.addAction('down', ['ArrowDown']);
  return input;
}

test('an axis is -1, 0 or 1', () => {
  const input = arrows();
  expect(input.axis('left', 'right')).toBe(0);
  input.key('ArrowLeft', true);
  expect(input.axis('left', 'right')).toBe(-1);
  input.key('ArrowRight', true);
  expect(input.axis('left', 'right')).toBe(0);
});

test('a diagonal is no faster than a straight line', () => {
  const input = arrows();
  input.key('ArrowRight', true);
  expect(input.vector('left', 'right', 'up', 'down')).toEqual(new Vec2(1, 0));
  input.key('ArrowDown', true);
  const diagonal = input.vector('left', 'right', 'up', 'down');
  expect(diagonal.length()).toBeCloseTo(1);
  expect(diagonal.x).toBeCloseTo(0.707);
});
```

- `function arrows(): Input { … }` is a **helper**: setup the steering tests share, written once. Each call returns a new `Input`, so the tests don't share state.
- Why must a diagonal be normalized? Right and down together are the vector `(1, 1)`, and its length is `√(1² + 1²) = √2 ≈ 1.41`. Multiplied by a speed, a player moving diagonally would go 41% faster than one moving straight. Players notice, and use it. Normalized, it's `(0.707, 0.707)`, length 1.

```check
run "npx vitest run src" exit=1 stderr="input.axis is not a function"
```

## axis and vector

```ts file=src/engine/input.ts
import { Vec2 } from './vec2';

export class Input {
  private readonly actions = new Map<string, string[]>();
  private readonly held = new Set<string>();
  private readonly pressedThisStep = new Set<string>();

  addAction(name: string, keys: string[]): void {
    this.actions.set(name, keys);
  }

  key(code: string, down: boolean): void {
    if (down && !this.held.has(code)) this.pressedThisStep.add(code);
    if (down) this.held.add(code);
    else this.held.delete(code);
  }

  isPressed(action: string): boolean {
    return this.keysOf(action).some((code) => this.held.has(code));
  }

  isJustPressed(action: string): boolean {
    return this.keysOf(action).some((code) => this.pressedThisStep.has(code));
  }

  axis(negative: string, positive: string): number {
    return Number(this.isPressed(positive)) - Number(this.isPressed(negative));
  }

  vector(left: string, right: string, up: string, down: string): Vec2 {
    return new Vec2(this.axis(left, right), this.axis(up, down)).normalized();
  }

  endStep(): void {
    this.pressedThisStep.clear();
  }

  private keysOf(action: string): string[] {
    const keys = this.actions.get(action);
    if (!keys) throw new Error(`There is no input action "${action}"`);
    return keys;
  }
}
```

- `Number(true)` is 1 and `Number(false)` is 0. So `axis` is (1 if positive is held) − (1 if negative is held): right alone 1 − 0 = 1, left alone 0 − 1 = −1, both 1 − 1 = 0, neither 0.
- `vector` makes the x axis from left and right and the y axis from up and down. Up is −y on screens (lesson 1.1), so `up` is the negative action.
- `.normalized()` from lesson 1.1 does the rest: `(1, 1)` becomes `(0.707, 0.707)`, and `(0, 0)` stays `(0, 0)` thanks to the zero-vector guard. That test is paying off: with no key held, a NaN here would make the player vanish.

```check
run "npx vitest run src" stdout="27 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "Input: actions, held keys, presses counted once per step, axes and directions"
```

```check
git-clean
git-tracked src/engine/input.ts
```

## Challenge: just released

**Optional, ★★.** Some actions happen when a key comes *up*: a bow that fires when you let go. Add `isJustReleased(action)`, true for one step after any of the action's keys came up. Test first, including that a key that was never down can't be released.

```hints
nudge: It's the mirror of isJustPressed: a third Set, filled in key() when down is false, emptied in endStep().
concept: A key that comes up was a real release only if it was held. Check held before you delete from it, as key() checks before it adds.
shape: if (!down && this.held.has(code)) this.releasedThisStep.add(code); — and this.releasedThisStep.clear() in endStep
```
