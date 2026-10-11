---
title: 11.2 — React: Describing the Page
runtime: none
experiments: An element is a description
teaches: react, jsx, react elements, components, props, keys, fragments, vite plugins
uses: keeping the page in step, rendering from state, npm, dependencies, semver, tsconfig, vite config, functions, arrays, object entries, record types, destructuring, git switch, playground
---

### The story so far

Lesson 11.1 showed the problem with keeping a page in step by hand: every event has to update every copy of the state on the page, and a forgotten one leaves a page that quietly disagrees with the program, as the order list's count did after a removal. The other way, a `render()` that rebuilds the whole page from the state, can't forget anything, but throws away and rebuilds everything on every change.

### What this lesson builds

React, installed and set up, and the order list again, this time *described* rather than built: components that say what the page should look like for the state they're given.

```text
 <OrderList items={["flour", "butter", "eggs"]} />
        │
        ├── <h1>Order list</h1>
        ├── <p id="count">3 items</p>
        └── <ul id="list">
              ├── <Item name="flour" />   →  <li>flour</li>
              ├── <Item name="butter" />  →  <li>butter</li>
              └── <Item name="eggs" />    →  <li>eggs</li>
```

## A branch for the sprint {#branch}

This sprint replaces the spreadsheet's page, so it happens on a branch, merged when it's finished:

```powershell
git switch -c react
```

```check
git-branch react -- Run git switch -c react
```

## Installing React {#install}

React is two packages, plus three that only matter while you develop:

```powershell
npm install react@19 react-dom@19
npm install -D @vitejs/plugin-react@6 @types/react@19 @types/react-dom@19
```

| package | what it is | in |
|---|---|---|
| `react` | components, state, and how a page is described | `dependencies`: it runs in the user's browser |
| `react-dom` | turns those descriptions into real DOM elements, and keeps them in step | `dependencies` |
| `@vitejs/plugin-react` | teaches Vite the JSX syntax, and to swap an edited component in without reloading the page | `devDependencies` (`-D`): used only while building |
| `@types/react`, `@types/react-dom` | TypeScript's types for the two | `devDependencies` |

`@19` and `@6` ask for those **major** versions (lesson 4.2's semver): the newest 19.x, which this sprint was written against, rather than whatever is newest on the day you install.

```check
contains package.json "\"react\": \"^19" -- Run npm install react@19 react-dom@19
contains package.json "@vitejs/plugin-react" -- Run npm install -D @vitejs/plugin-react@6 @types/react@19 @types/react-dom@19
```

## Vite learns JSX {#vite}

A **plugin** adds to what Vite can do. This step adds React's, in `vite.config.js`:

```javascript file=vite.config.js
import react from "@vitejs/plugin-react";

export default {
  base: "./",
  plugins: [react()],
};
```

`plugins` is a list, so more can be added later. `react()` calls the plugin's function, which returns the plugin itself: settings could go in the brackets.

```check
contains vite.config.js "plugins: [react()]"
```

## TypeScript learns JSX {#tsconfig}

TypeScript needs to be told what JSX means too. This step adds one line to `tsconfig.json`'s `compilerOptions`:

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022", "dom"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

`"jsx": "react-jsx"` says: JSX in `.tsx` files is React's, so check it against React's types. (The comma at the end of the line before is needed too: JSON separates the entries of an object with commas, and allows none after the last.) Files with JSX in them end in **`.tsx`**, as files with types end in `.ts`.

```check
run "npx tsc" label="the project still type-checks"
```

## An element is a description {#experiment}

JSX looks like HTML inside JavaScript, `<li className="item">flour</li>`, but it isn't HTML. The JSX plugin turns each tag into a function call, and you can make that call yourself. This step opens `playground/react/elements.mjs`:

```javascript file=playground/react/elements.mjs
import { createElement } from "react";

const item = createElement("li", { className: "item" }, "flour");
console.log(item.type, item.props);
console.log(typeof item, "nodeType" in item);
```

**`createElement`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `type` | a tag name, or a component | `"li"` |
| input `props` | the attributes, as an object | `{ className: "item" }` |
| input `children` | what goes inside | `"flour"` |
| returns | a **React element** | `{ type: "li", props: { className: "item", children: "flour" } }` |

Before you run it, predict:

```predict
question: Does `createElement` put an `<li>` on a page?
choice: Yes, a real <li>
choice: No, a plain object describing one
answer: No, a plain object describing one
verify: node -e "import('react').then(({ createElement }) => console.log('nodeType' in createElement('li', null, 'x') ? 'Yes, a real <li>' : 'No, a plain object describing one'))"
explain: It runs in Node, where there is no page at all, and it still works. A React element is a description: "an `li`, with this class, holding this text". Making the real `<li>`, or changing an existing one to match, is `react-dom`'s job. That split is what lets React compare the description you return now with the one you returned last time, and change only what differs.
```

Run it: `node playground/react/elements.mjs`.

```text
li { className: 'item', children: 'flour' }
object false
```

`class` is written **`className`** in JSX, because JSX becomes JavaScript, where `class` already means something (lesson 6.4's classes). DOM elements have a `nodeType`; this object doesn't.

```check
run "node playground/react/elements.mjs" stdout="object false" label="a React element is a plain object, not a DOM node"
```

## A page for the list {#html}

The page is almost empty: React fills `#root`. This step creates `playground/react/list.html`:

```html file=playground/react/list.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Order list, in React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./list.tsx"></script>
  </body>
</html>
```

The script is `list.tsx`, JSX and types: Vite and its plugin turn it into JavaScript the browser can run.

```check
file playground/react/list.html
```

## A component {#component}

A **component** is a function that returns elements, written with a capital letter. This step creates `playground/react/list.tsx` with one, `OrderList`:

```tsx file=playground/react/list.tsx
import { createRoot } from "react-dom/client";

function OrderList({ items }: { items: string[] }) {
  return (
    <>
      <h1>Order list</h1>
      <p id="count">{items.length} items</p>
    </>
  );
}

const root = document.querySelector("#root");
if (root !== null) {
  createRoot(root).render(<OrderList items={["flour", "butter", "eggs"]} />);
}
```

**`OrderList`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `props` | one object holding everything it's given; here, destructured to `items` | `{ items: ["flour", "butter", "eggs"] }` |
| returns | the elements for that list | a heading, and *3 items* |

- **`{items.length}`**: curly braces in JSX hold any JavaScript expression; its value goes on the page.
- **`<>` … `</>`** is a **fragment**: a component returns one thing, and a fragment groups several without adding an element to the page.
- **`<OrderList items={[…]} />`** uses the component like a tag. Its attributes become the props object.
- **`createRoot(root).render(…)`** hands the description to `react-dom`, which builds the real elements inside `#root`.

```check
page playground/react/list.html "[document.querySelector('#count').textContent, [...document.querySelectorAll('#list li')].map((li) => li.textContent).join(',')].join('|')" "3 items|" server=vite errors=none label="React draws the heading and the count from the items it was given"
```

## Components inside components {#items}

Each item becomes an `Item` component, one per name. This step adds it, and uses it for every item with `map`:

```tsx file=playground/react/list.tsx
import { createRoot } from "react-dom/client";

function Item({ name }: { name: string }) {
  return <li>{name}</li>;
}

function OrderList({ items }: { items: string[] }) {
  return (
    <>
      <h1>Order list</h1>
      <p id="count">{items.length} items</p>
      <ul id="list">
        {items.map((name) => (
          <Item key={name} name={name} />
        ))}
      </ul>
    </>
  );
}

const root = document.querySelector("#root");
if (root !== null) {
  createRoot(root).render(<OrderList items={["flour", "butter", "eggs"]} />);
}
```

**`Item`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `props` | one item's `name` | `{ name: "butter" }` |
| returns | a list item showing it | `<li>butter</li>` |

- **`items.map((name) => <Item … />)`** turns the array of names into an array of elements. JSX shows an array as its elements, in order.
- **`key={name}`** gives each element in a list an identity. When the list changes, React matches old and new elements by key, so it can tell "butter was removed" from "butter became eggs and eggs disappeared". Keys must be unique among their siblings.
- **`{ name }: { name: string }`**: `Item`'s props have one field, typed like any other parameter.

```check
page playground/react/list.html "[document.querySelector('#count').textContent, [...document.querySelectorAll('#list li')].map((li) => li.textContent).join(',')].join('|')" "3 items|flour,butter,eggs" server=vite errors=none label="an Item for every name, in order"
```

## Commit

```powershell
git add .
git commit -m "React, and the order list as components"
```

```check
git-clean
```

## Your turn: a recipe card

Priya's recipes will need showing too. In the playground, make `recipe.html` (like `list.html`, loading `./recipe.tsx`) and `recipe.tsx`, with a `RecipeCard` component that takes a recipe's `name`, how many it `makes`, and its `ingredients` (an object of names and amounts), and shows a heading *Brioche, makes 12* and a list item per ingredient, *flour (g): 1000*. Render it for the brioche from 10.1. Commit.

```hints
nudge: The shape is `OrderList` again: a heading, then a list made with `map`, one `<li>` per ingredient, with a key.
concept: Type the props with an interface: `name: string`, `makes: number`, `ingredients: Record<string, number>`. `Object.entries(ingredients)` gives `[ingredient, amount]` pairs to map over; the ingredient's name is a good key, since it's unique in a recipe.
shape: `function RecipeCard({ name, makes, ingredients }: RecipeCardProps) { return (<section><h2>{name}, makes {makes}</h2><ul>{Object.entries(ingredients).map(([ingredient, amount]) => <li key={ingredient}>…</li>)}</ul></section>); }`
answer: ~~~tsx
import { createRoot } from "react-dom/client";

interface RecipeCardProps {
  name: string;
  makes: number;
  ingredients: Record<string, number>;
}

function RecipeCard({ name, makes, ingredients }: RecipeCardProps) {
  return (
    <section>
      <h2>
        {name}, makes {makes}
      </h2>
      <ul>
        {Object.entries(ingredients).map(([ingredient, amount]) => (
          <li key={ingredient}>
            {ingredient}: {amount}
          </li>
        ))}
      </ul>
    </section>
  );
}

const brioche = { "flour (g)": 1000, "butter (g)": 500, eggs: 7, "sugar (g)": 100 };
const root = document.querySelector("#root");
if (root !== null) {
  createRoot(root).render(<RecipeCard name="Brioche" makes={12} ingredients={brioche} />);
}
~~~
```

```check
page playground/react/recipe.html "[document.querySelector('h2').textContent, document.querySelectorAll('li').length, document.querySelector('li').textContent].join('|')" "Brioche, makes 12|4|flour (g): 1000" server=vite errors=none label="the brioche's card: its heading, and a line per ingredient" -- An h2 with the name and how many it makes, and an li per ingredient written ingredient: amount.
git-clean -- Commit it: git add playground, then git commit.
```
