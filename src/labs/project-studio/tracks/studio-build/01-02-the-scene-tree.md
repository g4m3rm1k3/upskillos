---
title: 1.2 — The Scene Tree
track: Build Your Own Game Studio
runtime: none
concepts: trees, references, exceptions, arrays
problem: A car in a game has a body, four wheels and a driver, and when the car moves they all move with it. A level holds cars, coins and walls. How does a game store what belongs to what?
---

Games are made of **objects**: the player, each enemy, each coin, the walls, the score on screen. Many objects are made of smaller ones. A car has wheels; a player has a sprite (its picture) and a sword. A level holds all of it.

Most engines store this as a **tree**, the **scene tree**:

```text
level
├── car
│   ├── body
│   │   └── driver
│   └── wheel
└── coin
```

- Each box in the tree is a **node**. In this engine, every game object is a node.
- A node's **children** are the nodes directly under it: `car`'s are `body` and `wheel`. Each node except the top one has exactly one **parent**, the node directly above it.
- The top node, with no parent, is the **root**. A whole level is one tree, so the level is its root.
- Belonging is the point: delete `car` and everything under it goes too. Lesson 1.3 makes children move with their parent.

This lesson builds the tree: a `Node` class that holds a name, a parent and a list of children.

## A node: tests

Create `src/engine/node.test.ts`:

```ts file=src/engine/node.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';

test('a new node has a name, no parent and no children', () => {
  const car = new Node('car');
  expect(car.name).toBe('car');
  expect(car.parent).toBe(null);
  expect(car.children).toEqual([]);
});
```

- `toEqual([])`: `children` will be an **array**, an ordered list of values, and a new node's list is empty. `[]` is an empty array.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './node'"
```

## A node

Create `src/engine/node.ts`:

```ts file=src/engine/node.ts
export class Node {
  name: string;
  parent: Node | null = null;
  children: Node[] = [];

  constructor(name: string) {
    this.name = name;
  }
}
```

- `parent: Node | null = null;` declares a field and gives it a starting value in one line. The type `Node | null` (a union, as in lesson 0.5) means it holds another node or `null`; a new node starts with `null`, *no parent*.
- `children: Node[] = [];` says `children` is an array of nodes, `Node[]`, and every new node gets its own new empty array.
- Fields with `= value` are filled in before the constructor body runs. So after `new Node('car')`, the object is `{ parent: null, children: [], name: 'car' }`.
- A class can mention itself in its own fields: a `Node` holds a `Node` (its parent) and a list of `Node`s. That's what makes a tree out of single objects.
- The browser already has a type called `Node`, for elements in a page's DOM. The `import { Node } from './node'` in each file that uses ours makes `Node` mean this class there.

```check
run "npx vitest run src" stdout="9 passed"
run "npx tsc"
```

## Adding a child: a test

```ts file=src/engine/node.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';

test('a new node has a name, no parent and no children', () => {
  const car = new Node('car');
  expect(car.name).toBe('car');
  expect(car.parent).toBe(null);
  expect(car.children).toEqual([]);
});

test('addChild links the child and its parent both ways', () => {
  const car = new Node('car');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(car.children).toEqual([wheel]);
  expect(wheel.parent).toBe(car);
});
```

- `expect(wheel.parent).toBe(car)`: `toBe` asks whether they're the **same object**, not two equal ones. The wheel's parent must be the car itself.

```check
run "npx vitest run src" exit=1 stderr="car.addChild is not a function"
```

## Adding a child

```ts file=src/engine/node.ts
export class Node {
  name: string;
  parent: Node | null = null;
  children: Node[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addChild(child: Node): void {
    child.parent = this;
    this.children.push(child);
  }
}
```

- `: void` says the method returns nothing.
- `child.parent = this` stores, in the child, a **reference** to the parent. A variable or field holding an object doesn't hold a copy of it; it holds a way to reach that one object. So `wheel.parent` and the variable `car` lead to the same object, and a change made through one is seen through the other.
- `this.children.push(child)` adds the child to the end of the parent's array. `push` changes the array in place.
- After `car.addChild(wheel)`: `car.children` is `[wheel]`, and `wheel.parent` is `car`. The two links point opposite ways, so the tree can be walked downwards (parent to children) and upwards (child to parent).

```check
run "npx vitest run src" stdout="10 passed"
```

## Two parents: a test

What if a node that already has a parent is added somewhere else?

```ts file=src/engine/node.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';

test('a new node has a name, no parent and no children', () => {
  const car = new Node('car');
  expect(car.name).toBe('car');
  expect(car.parent).toBe(null);
  expect(car.children).toEqual([]);
});

test('addChild links the child and its parent both ways', () => {
  const car = new Node('car');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(car.children).toEqual([wheel]);
  expect(wheel.parent).toBe(car);
});

test('a node with a parent cannot be added to another', () => {
  const car = new Node('car');
  const truck = new Node('truck');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(() => truck.addChild(wheel)).toThrow('"wheel" already has a parent');
  expect(truck.children).toEqual([]);
});
```

```predict
question: With addChild as it is, what happens to the wheel after truck.addChild(wheel)?
choice: It moves: it's in the truck's children and no longer in the car's
choice: It's in both lists, but its parent is only the truck
choice: Nothing: addChild sees it already has a parent
answer: It's in both lists, but its parent is only the truck
explain: addChild overwrites wheel.parent with the truck and pushes the wheel onto the truck's children, but nothing removes it from the car's array. The car still lists it as a child, while the wheel says its parent is the truck. The two links disagree, and the tree is broken without any error.
```

- `expect(() => truck.addChild(wheel)).toThrow(…)`: the code that should fail is wrapped in an arrow function, so `expect` can call it and catch what it **throws**. Calling `truck.addChild(wheel)` directly would stop the test before `expect` could look.

```check
run "npx vitest run src" exit=1 stderr="expected [Function] to throw an error" label="the test fails: addChild accepts the wheel twice"
```

## Refusing a second parent

```ts file=src/engine/node.ts
export class Node {
  name: string;
  parent: Node | null = null;
  children: Node[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addChild(child: Node): void {
    if (child.parent) throw new Error(`"${child.name}" already has a parent`);
    child.parent = this;
    this.children.push(child);
  }
}
```

- `if (child.parent)`: an object is truthy and `null` is falsy (lesson 0.4), so this asks "does it have a parent?".
- `throw new Error(message)` makes an **error** object holding the message and **throws** it. The method stops at once: the two lines after it never run, so the tree is left as it was.
- A thrown error goes up through every function call until something **catches** it. Nothing here does, so it stops the program and the message is shown. In the test, `toThrow` catches it and compares the message.
- Why throw instead of quietly moving the node? Doing something surprising silently is how the broken tree in the last step happened. A clear error at the line with the mistake is much easier to fix. To move a node, remove it first (the next step), then add it.

```check
run "npx vitest run src" stdout="11 passed"
```

## Removing a child: a test

A coin is picked up; an enemy is defeated. Its node has to leave the tree.

```ts file=src/engine/node.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';

test('a new node has a name, no parent and no children', () => {
  const car = new Node('car');
  expect(car.name).toBe('car');
  expect(car.parent).toBe(null);
  expect(car.children).toEqual([]);
});

test('addChild links the child and its parent both ways', () => {
  const car = new Node('car');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(car.children).toEqual([wheel]);
  expect(wheel.parent).toBe(car);
});

test('a node with a parent cannot be added to another', () => {
  const car = new Node('car');
  const truck = new Node('truck');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(() => truck.addChild(wheel)).toThrow('"wheel" already has a parent');
  expect(truck.children).toEqual([]);
});

test('removeChild unlinks both ways, and the node can be added again', () => {
  const car = new Node('car');
  const truck = new Node('truck');
  const wheel = new Node('wheel');
  const body = new Node('body');
  car.addChild(wheel);
  car.addChild(body);
  car.removeChild(wheel);
  expect(car.children).toEqual([body]);
  expect(wheel.parent).toBe(null);
  truck.addChild(wheel);
  expect(wheel.parent).toBe(truck);
});
```

```check
run "npx vitest run src" exit=1 stderr="car.removeChild is not a function"
```

## Removing a child

```ts file=src/engine/node.ts
export class Node {
  name: string;
  parent: Node | null = null;
  children: Node[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addChild(child: Node): void {
    if (child.parent) throw new Error(`"${child.name}" already has a parent`);
    child.parent = this;
    this.children.push(child);
  }

  removeChild(child: Node): void {
    const index = this.children.indexOf(child);
    if (index === -1) throw new Error(`"${child.name}" is not a child of "${this.name}"`);
    this.children.splice(index, 1);
    child.parent = null;
  }
}
```

- Array items are numbered from 0, their **index**. In `[wheel, body]`, `wheel` is at 0 and `body` at 1.
- `indexOf(child)` searches the array from the start and returns the index of the first item that is that same object, or `-1` if it's not there.
- `splice(index, 1)` removes 1 item at `index` and closes the gap, changing the array in place: `[wheel, body]` becomes `[body]`.
- Then `child.parent = null` undoes the other link. Both links go together, so the tree never disagrees with itself.
- Removing a node that isn't a child is a mistake in the calling code, so it throws, like `addChild`.

```check
run "npx vitest run src" stdout="12 passed"
run "npx tsc"
```

## Finding a node by its path: a test

A game's code often needs a particular node: *the car's driver*. In a tree, every node can be reached from above by a **path**: the names on the way down, joined with `/`. From `car`, the driver is `body/driver`.

```ts file=src/engine/node.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';

test('a new node has a name, no parent and no children', () => {
  const car = new Node('car');
  expect(car.name).toBe('car');
  expect(car.parent).toBe(null);
  expect(car.children).toEqual([]);
});

test('addChild links the child and its parent both ways', () => {
  const car = new Node('car');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(car.children).toEqual([wheel]);
  expect(wheel.parent).toBe(car);
});

test('a node with a parent cannot be added to another', () => {
  const car = new Node('car');
  const truck = new Node('truck');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(() => truck.addChild(wheel)).toThrow('"wheel" already has a parent');
  expect(truck.children).toEqual([]);
});

test('removeChild unlinks both ways, and the node can be added again', () => {
  const car = new Node('car');
  const truck = new Node('truck');
  const wheel = new Node('wheel');
  const body = new Node('body');
  car.addChild(wheel);
  car.addChild(body);
  car.removeChild(wheel);
  expect(car.children).toEqual([body]);
  expect(wheel.parent).toBe(null);
  truck.addChild(wheel);
  expect(wheel.parent).toBe(truck);
});

test('get finds a node by the path of names down to it', () => {
  const car = new Node('car');
  const body = new Node('body');
  const driver = new Node('driver');
  car.addChild(body);
  body.addChild(driver);
  expect(car.get('body')).toBe(body);
  expect(car.get('body/driver')).toBe(driver);
  expect(() => car.get('body/wheel')).toThrow('"car" has no node at "body/wheel"');
});
```

```check
run "npx vitest run src" exit=1 stderr="car.get is not a function"
```

## Finding a node by its path

```ts file=src/engine/node.ts
export class Node {
  name: string;
  parent: Node | null = null;
  children: Node[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addChild(child: Node): void {
    if (child.parent) throw new Error(`"${child.name}" already has a parent`);
    child.parent = this;
    this.children.push(child);
  }

  removeChild(child: Node): void {
    const index = this.children.indexOf(child);
    if (index === -1) throw new Error(`"${child.name}" is not a child of "${this.name}"`);
    this.children.splice(index, 1);
    child.parent = null;
  }

  get(path: string): Node {
    let node: Node = this;
    for (const name of path.split('/')) {
      const child = node.children.find((c) => c.name === name);
      if (!child) throw new Error(`"${this.name}" has no node at "${path}"`);
      node = child;
    }
    return node;
  }
}
```

- `path.split('/')` cuts the string at each `/` and returns the pieces as an array: `'body/driver'` becomes `['body', 'driver']`.
- `for (const name of array) { … }` is a **for…of loop**: it runs the block once for each item, with `name` set to that item.
- `let node: Node = this` starts at this node. `let` (unlike `const`) can be given a new value later, and it is: each pass moves `node` one level down.
- `node.children.find((c) => c.name === name)` calls the arrow function on each child in turn and returns the first child it returns `true` for, or `undefined` if none did. So `child` has the type `Node | undefined`.
- `!` means **not**: it turns a truthy value into `false` and a falsy one into `true`. `undefined` is falsy, so `!child` is `true` when nothing was found.
- `if (!child) throw …`: no child of that name, so the path is wrong. The message names the whole path, so the mistake is easy to find.
- Trace `car.get('body/driver')`: `node` starts as `car`; the first pass finds `body` in `car.children` and moves to it; the second finds `driver` in `body.children`; the loop ends and returns `driver`.

```check
run "npx vitest run src" stdout="13 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "Node: the scene tree, with addChild, removeChild and get"
```

```check
git-clean
git-tracked src/engine/node.ts
```

## Challenge: no node inside itself

**Optional, ★★★.** `car.addChild(car)` is accepted, and so is adding a node under its own grandchild. Either makes a loop: walking down the tree from the car would go round for ever. Write a test that `addChild` throws for both, watch it fail, then make it pass.

```hints
nudge: Before adding, walk up from this node to the root, through each parent. If you meet the child on the way, adding it would make a loop.
concept: A tree has no loops: going up from any node always ends at the root. A for loop that follows parent links until it reaches null visits every node above.
shape: for (let n: Node | null = this; n; n = n.parent) if (n === child) throw new Error(`"${child.name}" cannot be inside itself`);
```
