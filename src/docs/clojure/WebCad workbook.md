# WebCAD Workbook (v2: explanation first)
### Build a SolidWorks-style CAD app in the browser with OpenCascade, understanding every line

**How this workbook works.** Every chapter does the same thing: explain the idea, show a *small* piece of code, then say exactly what just happened and where it bites. Type the code yourself. If you can't explain a line afterward, stop and ask me about it. That's a bug in this workbook, not in you.

Each chapter has these parts:

- **Idea**: what we're doing and why, before any code
- **Code in small pieces**: with the reasoning before and a "what just happened" after
- **Gotchas**: the traps that cost people an evening
- **Predict / Try**: questions to answer *before* you test, then experiments
- **Checkpoint**: what you should see before moving on

> **Honest status note.** I couldn't run this code while writing it. The structure, HTML/CSS/JavaScript and Three.js are standard and safe. OpenCascade.js is the delicate part: it names C++ overloads with numbers (`BRepBuilderAPI_MakeEdge_3`), and those numbers and some method names shift between versions. I mark those places **Verify**, and Chapter 5 teaches you how to settle them yourself. If anything breaks, paste me the exact console error. That is a normal part of working with this kernel.

---

## Contents

0. The map: what a CAD program is made of
1. The shell: HTML, CSS, JavaScript, tabs
2. The viewport: modules, Three.js, a Z-up world
3. Sketching: data first, drawing second
4. The ribbon: tools as a registry
5. The kernel: OpenCascade, topology, meshing
6. Sketch to solid: chaining and extrude
7. The feature tree: parametric modeling
8. Booleans and fillets
9. Constraints: a baby solver
10. Where to go next

---

# Chapter 0: The map

## Idea

A CAD program is four layers. Keep them separate in your head and in your code:

```
 sketch data ──► KERNEL (OpenCascade) ──► B-rep solid ──► mesh ──► Three.js ──► pixels
      ▲                                                                            │
      └──────────────────────────  your mouse clicks  ◄────────────────────────────┘
```

| Layer | Job | Mastercam equivalent |
|---|---|---|
| Sketch | 2D points, lines, circles, constraints | Wireframe geometry on a construction plane |
| Feature tree | The recipe: "Sketch1, Extrude1, Fillet1" | Solids Manager history |
| Kernel | Exact geometry: extrudes, booleans, fillets | Parasolid (Mastercam's kernel) |
| Display | Turn exact geometry into triangles, draw them | The graphics window |

**The one rule that runs through the entire book: the data is the truth, and the screen is a picture of it.** Your app never edits the picture. It edits the *data* (sketch points, the feature list), then re-derives the picture. That is why SolidWorks can change a dimension from 20 to 30 and the whole part updates: it isn't moving geometry, it's re-running the recipe.

## B-rep versus mesh

A **B-rep** (boundary representation) solid is a set of **faces** bounded by **edges** that meet at **vertices**. A hole is stored as "a cylindrical surface of radius 5", exactly. A **mesh** is just a pile of triangles approximating that surface. We only make a mesh to *draw* the part, and we throw it away and remake it whenever the part changes. In Mastercam terms: the solid is the real thing, and the shaded view is a disposable rendering of it.

## Predict

When you change a hole's diameter, which changes first: the sketch data, the kernel solid, or the mesh? Which last?

<details><summary>Answer</summary>
Data first, then the kernel solid is rebuilt, then the mesh, then pixels. Always that direction, never backwards. If you ever catch yourself editing the mesh to change the part, stop. The mesh is a throwaway.
</details>

---

# Chapter 1: The shell

## Idea: a web page is a tree

A web page is a **tree of nested objects**, like the Solids Manager or Toolpath Manager in Mastercam. Each object (a **node**) has properties. This tree is called the **DOM** (Document Object Model). Three languages touch it, each with one job:

| Language | Job | Think of it as |
|---|---|---|
| **HTML** | Builds the tree: what exists | The objects |
| **CSS** | Sets properties on nodes: look and position | The properties |
| **JavaScript** | Edits the tree while it's running | Macros that react to events |

Hold on to that table. Almost everything in this chapter is one of those three jobs.

## 1.1 Setup: what the tools are

You'll run four commands. Here is what each one does and why we need it.

```bash
npm create vite@latest webcad -- --template vanilla
cd webcad
npm install three opencascade.js@beta
npm run dev
```

- **Node.js** is JavaScript running on your computer instead of in a browser. We need it only as a *toolbox runner*. **`npm`** is its package manager, the same job `pip` does for Python.
- **Vite** is a *dev server*. It serves your files at `http://localhost:5173` (or similar) and refreshes the page every time you save. It is also doing something essential in the background: letting you write `import * as THREE from "three"`. A browser on its own cannot find a package named "three", but Vite looks inside `node_modules` and resolves it for you. That's why we can't just double-click `index.html` for this project.
- `npm install three opencascade.js@beta` downloads those two libraries into a `node_modules` folder and records them in `package.json`. (`@beta` picks the beta release, which is the one tracking current OpenCascade.)
- `npm run dev` starts the server. Leave it running in its own terminal and open the URL it prints.

You'll see this project layout. These are your files from now on:

```
webcad/
  index.html          <- the page structure
  vite.config.js      <- one small config file (below)
  package.json        <- what the project depends on (npm manages this)
  src/
    main.js           <- program entry point
    style.css, ui.js, viewport.js, ...   <- we'll create these chapter by chapter
```

Delete Vite's sample content in `index.html`, the sample JavaScript in `src/main.js`, and the sample CSS. Create `vite.config.js` in the project root:

```js
import { defineConfig } from "vite";
export default defineConfig({
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: { exclude: ["opencascade.js"] },
});
```

**What this does:** it tells Vite "treat `.wasm` files as downloadable assets, and don't try to pre-process the OpenCascade package." We need this in Chapter 5, because OpenCascade ships as a large WebAssembly file. Setting it now means we won't have to stop later.

## 1.2 Step one: only the objects, no looks

Start `index.html` with the bare structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>WebCAD</title>
</head>
<body>
  <div id="viewport"></div>
  <div id="ribbon">Ribbon</div>
  <div id="tree">Tree</div>
  <div id="status">Status</div>
</body>
</html>
```

### What each piece means

- `<!DOCTYPE html>`: tells the browser "this is modern HTML." Without it, browsers fall into a legacy "quirks mode" that renders things differently. Always the first line.
- `<html lang="en">`: the root of the tree. Everything lives inside it. `lang` is a hint for screen readers and translation tools.
- `<head>`: **information about the page** (not shown in the window): the title, character encoding, links to stylesheets.
- `<meta charset="UTF-8" />`: how to read the text bytes. Without it, characters like `°` or `Ø` can turn to garbage. The `/>` at the end is just a "no closing tag needed" style for tags that hold nothing.
- `<title>`: the browser tab's text.
- `<body>`: **everything you can see.**
- `<div>`: a plain rectangular box with no built-in meaning, a **container**. Most layout is divs inside divs.
- `id="ribbon"`: a **unique name** for one element, so CSS and JavaScript can say "that one."

### The tag grammar, once

```html
<tagname attribute="value" another="value">content or other tags</tagname>
```

You open a tag, put content inside, and close it with a slash. Tags **nest**, like parentheses: inside `<body>`, the divs are its **children**, and `<body>` is their **parent**. That parent/child structure *is* the tree. When you hear "the parent element," it just means "the tag this one is written inside."

### What just happened

Save and look at the page. You see "Ribbon", "Tree" and "Status" stacked in a column, with the (empty) viewport taking no space. That's the browser's default layout, called **normal flow**: boxes stack top to bottom, each one pushing the next down. A CAD window can't work that way, so the rest of the chapter is about taking boxes *out* of normal flow.

## 1.3 Step two: CSS, and taking boxes out of the flow

Create `src/style.css` and link it by adding this line inside `<head>`:

```html
<link rel="stylesheet" href="/src/style.css" />
```

(The leading `/` means "from the project root." That's how Vite wants it.)

### How a CSS rule reads

```css
selector { property: value; property: value; }
```

The **selector** says *which elements*. The braces hold properties to set on them. A few selector forms you'll use constantly:

| Selector | Meaning |
|---|---|
| `#viewport` | the element with `id="viewport"` (ids are unique) |
| `.tab-panel` | every element carrying class `tab-panel` (classes are reusable labels) |
| `.tab-panel.active` | elements that have **both** classes (no space between) |
| `#tree button` | any `button` somewhere **inside** `#tree` (the space means "inside") |

Now the first rule:

```css
#viewport { position: fixed; inset: 0; background: #2b2f36; }
```

- **`position: fixed`** means "take me out of normal flow and place me relative to the *window*." The box stops taking up space, so the others stop being pushed down by it.
- **`inset: 0`** is shorthand for `top: 0; right: 0; bottom: 0; left: 0`: distance from each window edge. Pin all four edges and the box stretches to fill the window. That's the entire "full-screen viewport" trick.
- **`background: #2b2f36`**: a color written in hex (red, green, blue as two hex digits each). This one is a dark gray.

Save. The page should turn dark gray. Now change `0` to `50px` and watch a margin appear on every side, then put it back. That's `inset` made visible.

Next, the panels. Add these:

```css
* { box-sizing: border-box; }
body { margin: 0; font: 13px system-ui, sans-serif; color: #222; overflow: hidden; }

#ribbon { position: fixed; top: 0; left: 0; right: 0; height: 96px;
          background: #f0f0f0; border-bottom: 1px solid #bbb; }
#tree   { position: fixed; top: 96px; left: 0; bottom: 26px; width: 240px;
          background: rgba(248,248,248,.96); border-right: 1px solid #bbb; overflow: auto; }
#status { position: fixed; left: 0; right: 0; bottom: 0; height: 26px; line-height: 26px;
          padding: 0 10px; background: #dcdcdc; border-top: 1px solid #bbb; }
```

### What just happened, rule by rule

- `* { box-sizing: border-box; }`: `*` matches everything. By default, when you set `width: 240px` and then add padding or a border, the *total* box becomes wider than 240. With `border-box`, the width **includes** padding and border, so numbers do what you'd expect. Nearly every modern project sets this first.
- `body { margin: 0; ... overflow: hidden; }`: browsers give `<body>` an 8px margin by default, which would show a thin light gap around the viewport. `overflow: hidden` says "never show scrollbars on the page itself." Our CAD window is exactly window-sized, so any scrollbar would be a bug.
- `#ribbon`: three edges pinned (`top`, `left`, `right`) so it stretches across the width, and height set by hand: 96 pixels.
- `#tree`: starts below the ribbon (`top: 96px`), ends above the status bar (`bottom: 26px`), and has a fixed `width`. So its height is *calculated* from the two pinned edges. `overflow: auto` adds a scrollbar inside the panel only when its content gets too long.
- `#status`: pinned to the bottom and sides. `line-height` equal to `height` is a small trick that vertically centers a single line of text.
- `rgba(248,248,248,.96)`: red, green, blue, **alpha** (opacity). `.96` is 96% opaque. We'll see a hint of the viewport through it.

### Gotchas

- **Stacking order.** All four boxes are `fixed`. When boxes overlap, the one written **later in the HTML** is drawn on top. Your viewport is first in the HTML on purpose: it's the bottom layer, and the panels float above it. If you moved `<div id="viewport">` to the end of the body, it would cover everything and you'd see only a dark rectangle. Try it.
- **Why panels float instead of sitting beside the viewport.** The viewport never changes size when a panel opens or closes, because it doesn't know the panels exist. They just sit on top. That's how Onshape and Fusion are built.

## 1.4 Step three: tabs, starting from the question "what does a tab remember?"

Before writing any tab code, ask the design question: **what does a tab control have to remember?** Exactly one fact: *which tab is selected right now*. The cheapest place to keep that fact is on the elements themselves, as a **class**, which is a label you can stick on or peel off.

So the plan is:

1. Every panel is hidden by default.
2. The panel carrying the label `active` is visible.
3. Clicking a button moves the label.

Plan step 1 and 2 in CSS (append to `style.css`):

```css
.tab-buttons { display: flex; }
.tab-buttons button { border: 0; background: transparent; padding: 6px 14px; cursor: pointer; }
.tab-buttons button.active { background: #fff; font-weight: 600; }

.tab-panel        { display: none; padding: 6px 8px; }
.tab-panel.active { display: block; }
```

- `display: none` removes an element from the page entirely (no space, no drawing). `display: block` puts it back.
- `.tab-panel.active` (no space between the two classes) means "has both." It is **more specific** than `.tab-panel` alone, so when both rules apply to a panel, the more specific one wins. That's the whole mechanism of **specificity**: when two rules disagree, the one with the more specific selector beats the one written earlier or later. (If specificity is equal, the later rule wins.)
- `display: flex` on `.tab-buttons` puts its children (the buttons) in a row instead of a column. Flexbox is the standard tool for "line these up."

Now the HTML. Replace the ribbon and tree divs in `index.html`:

```html
<div id="ribbon" class="tabset">
  <div class="tab-buttons">
    <button data-tab="sketch" class="active">Sketch</button>
    <button data-tab="solid">Solid</button>
  </div>
  <div class="tab-panel active" data-panel="sketch"></div>
  <div class="tab-panel" data-panel="solid"></div>
</div>

<div id="tree" class="tabset">
  <div class="tab-buttons">
    <button data-tab="features" class="active">Features</button>
    <button data-tab="props">Properties</button>
  </div>
  <div class="tab-panel active" data-panel="features"><ul id="feature-list"></ul></div>
  <div class="tab-panel" data-panel="props" id="props-panel">Select a feature.</div>
</div>
```

### New tags and attributes

- `<button>`: a clickable button. Nothing happens on click until JavaScript listens for it.
- `<ul>`: an unordered list. Its children are `<li>` items. We'll fill it with the feature list in Chapter 7.
- **`class="tab-panel active"`**: an element can carry several classes, separated by spaces. Here both the `tab-panel` label and the `active` label. (An element has only one `id` but any number of classes. Use `id` for "this one thing", class for "everything of this kind.")
- **`data-tab="sketch"` and `data-panel="sketch"`**: any attribute whose name starts with `data-` is *yours to invent*. The browser ignores it. We use it as a **matching key**, like a dictionary key in Python: the button says `sketch`, the panel says `sketch`, and JavaScript will connect the two.
- We use the **same structure** for the ribbon *and* the tree (`class="tabset"`). That lets us write the tab code once and apply it to both.

Save and look. All the panels are empty except the tree's, and the tabs don't do anything yet. Clicking is JavaScript's job.

## 1.5 Step four: JavaScript, one idea per line

Create `src/ui.js`. First, a vocabulary check for people coming from Python:

| Python | JavaScript |
|---|---|
| `x = 5` | `let x = 5;` (changeable) or `const x = 5;` (can't be reassigned) |
| `def f(a): ...` | `function f(a) { ... }` or `const f = (a) => { ... }` |
| `f"hi {name}"` | `` `hi ${name}` `` (backticks, called a template string) |
| `for b in buttons:` | `buttons.forEach((b) => { ... })` |
| `d["key"]` | `obj.key` or `obj["key"]` |
| `None` | `null` (or `undefined`) |

Use `const` by default. It's not that the value can never change inside (a `const` list can still be edited), only that the *name* can't be pointed somewhere else. It catches accidents.

### Grab the elements

```js
export function setupTabs(tabset) {
  const buttons = tabset.querySelectorAll(":scope > .tab-buttons > button");
  const panels  = tabset.querySelectorAll(":scope > .tab-panel");
```

- `export function` makes this function available to other files (more on that in Chapter 2).
- It takes **one `tabset` element as an argument**, so the same function can run on the ribbon and on the tree.
- `querySelectorAll` takes a **CSS selector**, the same language you used in the stylesheet, and returns every matching element *inside* `tabset`.
- `:scope` means "the element I called this on." `>` means "direct child only, not deeper." Why bother? If you ever nest one tab set inside another, you don't want the outer buttons to also grab the inner ones. This keeps each set self-contained.

### React to clicks

```js
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // this code runs every time THIS button is clicked
    });
  });
}
```

This is the part that surprises people from Python. `addEventListener` takes **a function as an argument**. You are *not* running the code now. You are handing the browser a function and saying "call this later, whenever this button is clicked." It is the same idea as a callback registered with a GUI toolkit. `() => { ... }` is a function with no name, written inline. The `=>` is called an **arrow function**.

### The three steps from the exercise

Put this inside the click function:

```js
      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      tabset
        .querySelector(`:scope > .tab-panel[data-panel="${btn.dataset.tab}"]`)
        .classList.add("active");
```

Line by line:

1. **Reset the buttons:** peel the `active` label off every button.
2. **Reset the panels:** same for every panel. Without these two lines, every tab you ever clicked would stay selected.
3. **Label the clicked button:** `btn` is the button this click came from.
4. **Find and label its panel.** `btn.dataset.tab` reads the button's `data-tab` value, for example `"sketch"`. (`dataset` is how JavaScript sees every `data-` attribute on an element.) The backtick string with `${...}` builds the selector `:scope > .tab-panel[data-panel="sketch"]`, which finds the matching panel. Then `.classList.add("active")` labels it.

**Why reset *before* labeling:** each line changes the state the next one sees. If you reset after labeling, you'd erase the label you just added and nothing would be selected.

Also add a status helper, which we'll use from every chapter:

```js
export function setStatus(text) {
  document.getElementById("status").textContent = text;
}
```

`document` is the root of the tree. `getElementById` finds the one element with that id. `textContent` is the text inside it; assigning to it changes what's on screen immediately.

### Connect it: `src/main.js`

```js
import { setupTabs } from "./ui.js";
document.querySelectorAll(".tabset").forEach(setupTabs);
```

And in `index.html`, right before `</body>`, add the line that loads your program:

```html
<script type="module" src="/src/main.js"></script>
```

### What just happened

`main.js` finds every element with `class="tabset"` (both the ribbon and the tree) and calls `setupTabs` on each one. `forEach(setupTabs)` passes each element to the function automatically.

### Gotchas on this chapter

- **`type="module"`** is what lets a file use `import` and `export`. It also makes the browser run the script *after* the page is parsed, so the elements already exist when `querySelectorAll` looks for them. A plain `<script>` at the top of `<head>` runs *before* the body exists and finds nothing, which is a classic first bug.
- **Wrong or missing ids return `null`**, and then you get the famous error `Cannot read properties of null`. It almost always means "the selector didn't match anything." Check spelling first.
- **Open the browser console** (F12, Console tab) and leave it open. Every JavaScript error appears there with a file and line number. It's the closest thing to a Python traceback.

## Predict / Try

1. Delete the two "reset" lines, then click Sketch, Solid, Sketch. What do you see, and why?
2. Change one panel's `data-panel` so it doesn't match any button. What happens when you click the button, and what does the console say? Read the message and trace it to the line it names.
3. Move `<div id="viewport">` to the end of the body. What happens, and which rule from 1.3 explains it? Put it back.

## Checkpoint

Dark viewport behind a light ribbon at top, a tree panel at left, a status bar at bottom. Both sets of tabs switch their panels. The console shows no errors.

---

# Chapter 2: The viewport

## Idea

We need a 3D drawing surface inside the dark `#viewport` div. We'll use **Three.js**, a library that draws 3D scenes in the browser using the graphics card. It doesn't know anything about CAD. It just draws triangles and lines. We'll make it a CAD window by choosing the right camera, controls, and coordinate system.

Three.js needs four things, and it's worth knowing them by their jobs:

| Thing | Job | CAD analogy |
|---|---|---|
| **Scene** | The container for everything that exists | The model database |
| **Camera** | Where you're looking from and with what lens | The view you've rotated to |
| **Renderer** | Draws the scene as seen by the camera onto a `<canvas>` | The graphics window |
| **Render loop** | Redraws every frame (about 60 times a second) | A refresh |

## 2.1 Detour: how files talk to each other (modules)

Starting here your code is split across several files, so you need to know how JavaScript lets files share things. Each file is a **module** with its own private scope. Nothing leaks out unless you `export` it, and nothing comes in unless you `import` it:

```js
// viewport.js
export const scene = new THREE.Scene();      // published: other files can import it

// sketch.js
import { scene } from "./viewport.js";       // "the scene that viewport.js exported"
```

Two details that matter later:

- `./` means "relative to this file." `import ... from "three"` (no `./`) means "a package from node_modules" (that's the part Vite resolves for you).
- **A module runs once, and every importer gets the same objects.** If `sketch.js`, `tools.js` and `commands.js` all import `sketch` from the same file, they're looking at the *same* list, not copies. This is how we get shared state without global variables.

## 2.2 The one trap: Y-up versus Z-up

Three.js assumes **Y is up**. CAD, OpenCascade and Mastercam all treat **Z as up**, with the sketch plane being XY. If you ignore this, your sketches stand up like a wall and every angle feels wrong. The fix is to declare once that Three.js's "up" direction is Z. It must happen **before the camera is created**, because a camera copies the default "up" at the moment it's born.

Create `src/viewport.js`, starting with the imports and that fix:

```js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

THREE.Object3D.DEFAULT_UP.set(0, 0, 1);   // Z-up. Must run BEFORE the camera is created.
```

- `import * as THREE from "three"` means "import everything Three.js exports and let me call it `THREE`." That's why you'll see `THREE.Scene`, `THREE.Color`, and so on.
- `OrbitControls` is an add-on (it lives in the `addons` folder) that gives you orbit, pan and zoom with the mouse.

## 2.3 Scene, camera, renderer

```js
const container = document.getElementById("viewport");

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b2f36);

export const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
camera.position.set(120, -160, 100);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);
```

What each line means:

- `getElementById("viewport")` grabs the dark div from Chapter 1. That's where the canvas will go.
- **`PerspectiveCamera(45, 1, 0.1, 5000)`**: four numbers.
  - `45` is the **field of view** in degrees (vertical). Smaller is more telephoto, larger is wide-angle.
  - `1` is the **aspect ratio** (width / height). It's a placeholder here, and we fix it in `resize()` below.
  - `0.1` and `5000` are the **near and far clipping distances**. Anything closer than 0.1 or farther than 5000 isn't drawn at all. Our units are millimeters, so that range covers 0.1 mm to 5 meters.
- `camera.position.set(120, -160, 100)`: the camera sits to the front-right and above, looking toward the origin by default. (With Z up, negative Y is "toward you" for the usual front view.)
- `WebGLRenderer({ antialias: true })` creates the thing that draws. `antialias` smooths jagged edges.
- `setPixelRatio`: on a high-density screen (a laptop with 2x scaling), the screen has more physical pixels than CSS "pixels." Rendering at the full ratio looks crisp but costs more, so we cap it at 2.
- `renderer.domElement` is the `<canvas>` element the renderer created. `appendChild` adds it inside the `#viewport` div. That's you building the DOM tree with JavaScript instead of HTML.

### Gotchas

- **`near` too small or `far` too large makes drawings flicker** (the depth buffer runs out of precision). Don't use `0.0001` and `1000000` just to be safe.
- **Units are whatever you decide.** Three.js has no "millimeters." We're *choosing* 1 unit = 1 mm, and OpenCascade will agree because it also doesn't care. As long as everyone uses the same convention, it works.

## 2.4 Controls, lights, grid

```js
export const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN };
```

`OrbitControls` listens for mouse events on the canvas and moves the camera. We reassign the buttons because **the left button belongs to drawing tools**: setting `LEFT: null` disables its orbit behavior. Middle rotates, right pans, and the wheel zooms by default. This is close to SolidWorks and Mastercam.

```js
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(100, -80, 200);
scene.add(sun);
```

**Why lights at all?** The material we'll use for solids (`MeshStandardMaterial`) is *physically shaded*: with no light, it renders as pure black. Ambient light lifts all surfaces equally (so shadows aren't pitch black). The directional light is like the sun: parallel rays from a direction, which gives faces different brightness depending on their angle. That angle contrast is what makes a solid look three-dimensional.

```js
const grid = new THREE.GridHelper(400, 40, 0x5a6270, 0x3c424c);
grid.rotation.x = Math.PI / 2;
scene.add(grid);
scene.add(new THREE.AxesHelper(50));
```

- `GridHelper(400, 40, ...)` is a 400-unit grid with 40 divisions, so lines every 10 mm. Two colors: the center lines and the others.
- `grid.rotation.x = Math.PI / 2`: `GridHelper` is built flat in the XZ plane (because it assumes Y-up). Rotating it 90 degrees about the X axis lays it flat in XY, our floor.
- `AxesHelper(50)` draws 50-unit lines from the origin: **red = X, green = Y, blue = Z**. Memorize that (RGB = XYZ). It's the fastest way to know which way you're looking.

Finally, a place for everything the kernel will produce:

```js
export const bodyGroup = new THREE.Group();
scene.add(bodyGroup);
```

A `Group` is an empty container node. Chapter 5 will put the solid's meshes in it, and clearing it will wipe the old body in one call.

## 2.5 The canvas has two sizes (and why resizing is a real issue)

A canvas has a **CSS size** (how big it looks on the page, handled by the browser) and a **drawing-buffer size** (how many pixels it actually renders). The buffer does **not** follow automatically. If the window changes size and you ignore it, you'll get a blurry or stretched image. So we handle it:

```js
function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
```

- `clientWidth/Height`: the current size of the container div in CSS pixels.
- `renderer.setSize(w, h)` updates the drawing buffer *and* the canvas's CSS size.
- `camera.aspect` must match the new shape, or the picture is stretched. **`updateProjectionMatrix()` is mandatory after changing any camera lens property.** The camera caches a matrix and won't notice the change unless you tell it. Forgetting this call is one of the most common Three.js bugs.
- We call `resize()` once at startup, so the first frame has the right size. We also register it for future window resizes. Note that you almost never resize a CAD window while working. This is mainly for the first load and for opening the dev tools.

## 2.6 The render loop

```js
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
```

`setAnimationLoop` calls your function once per screen refresh (usually 60 times a second). Each call re-renders the scene from the current camera position. It looks like that would waste work when nothing is moving, and it does, a little. Real CAD apps render only when something changes. We'll keep it simple, and you can optimize later (Chapter 10).

## 2.7 Raycasting: from a mouse pixel to a point on the sketch plane

Your mouse is a 2D point on the screen. A sketch lives on a 3D plane. To connect them, shoot an invisible **ray** from the camera *through* the mouse point and ask where it hits the plane `z = 0`. That hit is where the user "clicked" in model space. It's the same idea as clicking on your construction plane in Mastercam.

```js
const raycaster = new THREE.Raycaster();
const sketchPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

export function pointOnPlane(event) {
  const r = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - r.left) / r.width) * 2 - 1,
    -((event.clientY - r.top) / r.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  return raycaster.ray.intersectPlane(sketchPlane, hit) ? hit : null;
}
```

Taking it apart:

- `new THREE.Plane(normal, constant)`: a plane defined by the direction it faces (its **normal**, here straight up the Z axis) and its distance from the origin along that direction (0). So it's the plane z = 0.
- `getBoundingClientRect()` gives the canvas's position and size on the screen. We need this because mouse coordinates (`clientX/Y`) are measured from the window's top-left corner, but the canvas may not be at the corner.
- **NDC (normalized device coordinates)** is Three.js's screen coordinate system: x and y both run from **-1 to +1**, with (0, 0) at the center. The two lines convert pixels to that range. The `-` on the y line is because screen y grows *downward* while NDC y grows *upward*. That sign flip is easy to forget and produces "my drawing is mirrored" bugs.
- `setFromCamera` builds the ray from the camera through that NDC point.
- `intersectPlane` returns the hit point, or `null` if the ray never meets the plane (looking exactly parallel, or the plane is behind the camera). We return `null` in that case, so callers must check.

## 2.8 Temporary test: prove the world is alive

At the bottom of `viewport.js`, add a **temporary** box (we'll delete it in Chapter 5):

```js
const test = new THREE.Mesh(
  new THREE.BoxGeometry(40, 30, 20),
  new THREE.MeshStandardMaterial({ color: 0x8ab4f8 })
);
test.position.set(0, 0, 10);
scene.add(test);
```

A **Mesh = geometry + material**: the shape (a 40 x 30 x 20 box) plus the surface appearance (a light blue shaded material). `BoxGeometry` is centered on its own origin, so it'd be half-buried in the floor. `position.set(0, 0, 10)` lifts it by half its height so it sits on the grid.

Update `main.js` to load the viewport:

```js
import { setupTabs } from "./ui.js";
import "./viewport.js";

document.querySelectorAll(".tabset").forEach(setupTabs);
```

`import "./viewport.js"` (no names) just means "run that file for its side effects", here, building the scene and starting the loop.

## Predict / Try

1. Remove the `DEFAULT_UP` line and reload. What's wrong, and why? Put it back.
2. Why is the box at `z = 10` and not `z = 0`? Predict, then change it and check.
3. Comment out `camera.updateProjectionMatrix()`, then resize the browser window. What do you see? Put it back.
4. Comment out the lights. Why is the box black?
5. In the console, type nothing yet, but think: why couldn't you test `pointOnPlane` until you have a click event? (We build that in Chapter 3.)

## Checkpoint

A blue box sits on a grid with red/green/blue axes at the origin. Middle-drag orbits, right-drag pans, the wheel zooms. The blue axis points up. Resizing the window keeps the picture sharp.

---

# Chapter 3: Sketching, data first

## Idea

A sketch is **data**, not drawing. The drawing is a picture of the data that we regenerate whenever it changes. This is the Chapter 0 rule at small scale, and it's the design decision that makes everything later possible: constraints, extrusion, saving, undo.

The data model:

```js
points:   [ {id:1, x:0, y:0}, {id:2, x:50, y:0}, {id:3, x:50, y:30} ]
entities: [ {type:"line", p1:1, p2:2}, {type:"line", p1:2, p2:3}, {type:"circle", c:1, r:10} ]
```

Notice that **lines don't store coordinates. They store which points.** This one decision pays for three things later:

1. Two lines that share an endpoint *literally share the same point*, so they can never separate. "Coincident" is free.
2. **Chaining**: to find a closed profile, follow shared point ids. (You've chained in Mastercam. This is what it does underneath.)
3. **Constraints**: "make this line horizontal" just says "make these two points have equal y," and moving a point automatically moves every line attached to it.

If lines stored raw coordinates instead, you'd have to compare floating-point numbers for "almost equal" everywhere, which is fragile.

## 3.1 The data and its small functions: `src/sketch.js`

```js
import * as THREE from "three";
import { scene, camera, controls } from "./viewport.js";

export const sketch = { points: [], entities: [] };
let nextId = 1;

export const getPoint = (id) => sketch.points.find((p) => p.id === id);
```

- `sketch` is **one object shared by the whole app**. Because of how modules work (2.1), everyone who imports it sees the same one.
- `nextId` is a counter that hands out unique ids. It's `let` (not `const`) because it changes. It's not exported, so only this file can touch it.
- `getPoint` is a lookup: "find the point whose id matches." `.find(callback)` returns the first element for which the callback is true, like `next(p for p in points if p.id == id)` in Python.

```js
export function addPoint(x, y) {
  const p = { id: nextId++, x, y };
  sketch.points.push(p);
  return p;
}
```

`nextId++` means "use the current value, then add one." `{ id: ..., x, y }` uses a shorthand: when the key and the variable have the same name, `{ x, y }` means `{ x: x, y: y }`.

```js
export function addLine(a, b) {
  sketch.entities.push({ type: "line", p1: a.id, p2: b.id });
  redraw();
}
export function addCircle(center, r) {
  sketch.entities.push({ type: "circle", c: center.id, r });
  redraw();
}
```

Each stores the **ids** of its points (not copies of the points), then calls `redraw()` so the picture catches up with the data.

```js
export function resetSketch() {
  sketch.points.length = 0;
  sketch.entities.length = 0;
  redraw();
}
```

**Gotcha: why `.length = 0` and not `sketch.points = []`?** Other files hold a reference to the *same array object*. Assigning a new array to `sketch.points` would be fine here (since `sketch` itself is the shared object), but setting `length = 0` empties the existing array in place, which is the safest habit when the array may be referenced elsewhere. Keep that thought, because it comes back as a real bug in Chapter 7.

## 3.2 Snapping

When you click near an existing point, you want to *reuse* it rather than create a duplicate on top of it. That's what makes closing a loop produce a loop:

```js
export function pickTolerance() {
  return camera.position.distanceTo(controls.target) * 0.02;
}

export function snapOrCreate(x, y) {
  const tol = pickTolerance();
  for (const p of sketch.points) {
    if (Math.hypot(p.x - x, p.y - y) < tol) return p;
  }
  return addPoint(x, y);
}
```

- **"Close enough" depends on zoom.** 2 mm is huge when zoomed way in and invisible when zoomed way out. So tolerance is 2% of the distance from camera to its target (`controls.target`, the point you orbit around). Zoom in, tolerance shrinks. This is a cheap approximation of "a few pixels."
- `Math.hypot(dx, dy)` is the distance formula, `sqrt(dx² + dy²)`.
- `for (const p of list)` is Python's `for p in list`. (Don't confuse it with `for...in`, which loops over *keys*, not values. That one bites everybody once.)
- The function **returns an existing point if one is near, otherwise makes a new one**. Callers don't have to care which happened.

## 3.3 Drawing: turning data into a picture

```js
const group = new THREE.Group();
scene.add(group);
const lineMat  = new THREE.LineBasicMaterial({ color: 0xffd54a });
const pointMat = new THREE.PointsMaterial({ color: 0xffffff, size: 6, sizeAttenuation: false });
const previewMat = new THREE.LineBasicMaterial({ color: 0x7fd1ff });
const Z = 0.01;
let preview = null;
```

- `group` holds the current picture of the sketch. Clearing it and rebuilding is how we redraw.
- **Materials** describe appearance: `LineBasicMaterial` for lines (unlit, flat color), `PointsMaterial` for dots. `sizeAttenuation: false` means dots stay 6 *screen pixels* regardless of zoom. Otherwise they'd shrink as you zoom out and vanish.
- `Z = 0.01`: we draw the sketch a hair above the grid. Two things at exactly the same height fight for the pixel and flicker ("z-fighting"). A 0.01 mm lift settles it.

How Three.js actually stores a shape. This is worth understanding once: a **`BufferGeometry`** holds raw numbers in flat arrays. For lines drawn as `LineSegments`, you give a flat list of numbers, **three per point (x, y, z), and every two points make one segment**:

```
[ x1,y1,z1,  x2,y2,z2,     x3,y3,z3,  x4,y4,z4,  ... ]
  \_ segment 1 _____/       \_ segment 2 _____/
```

Now the function:

```js
export function redraw() {
  group.children.forEach((o) => o.geometry.dispose());
  group.clear();
```

First, wipe the old picture. **`dispose()` frees the graphics-card memory** that Three.js allocated for that geometry. JavaScript's garbage collector can't free GPU memory, so forgetting `dispose()` is a slow memory leak: fine for ten redraws, a crash after thousands. `group.clear()` removes the (now empty) objects from the group.

```js
  const seg = [];
  for (const e of sketch.entities) {
    if (e.type === "line") {
      const a = getPoint(e.p1), b = getPoint(e.p2);
      seg.push(a.x, a.y, Z, b.x, b.y, Z);
    } else if (e.type === "circle") {
      const c = getPoint(e.c), n = 64;
      for (let i = 0; i < n; i++) {
        const t0 = (i / n) * Math.PI * 2, t1 = ((i + 1) / n) * Math.PI * 2;
        seg.push(c.x + e.r * Math.cos(t0), c.y + e.r * Math.sin(t0), Z,
                 c.x + e.r * Math.cos(t1), c.y + e.r * Math.sin(t1), Z);
      }
    }
  }
```

Each entity is converted to segments. A line is one segment between its two points (looked up by id). A circle is approximated by 64 short segments around the center using `cos` and `sin`. Remember this: **the picture of a circle is 64 straight lines, but the data is "center + radius".** The kernel will later get the exact circle from the data, not from these segments. That's B-rep versus mesh again, in miniature.

```js
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
  group.add(new THREE.LineSegments(lg, lineMat));

  const pts = [];
  sketch.points.forEach((p) => pts.push(p.x, p.y, Z));
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.Points(pg, pointMat));
}
```

- `setAttribute("position", ...)` stores a list of numbers under the name `position`. The `3` means "three numbers per point."
- `Float32BufferAttribute`: the graphics card wants compact 32-bit floats, not JavaScript's usual 64-bit numbers.
- `LineSegments(geometry, material)` and `Points(geometry, material)` are drawable objects (like `Mesh`, but for lines and dots).

Finally, the **rubber-band preview** (the blue line that follows your mouse while drawing):

```js
export function setPreview(segments) {
  if (preview) { scene.remove(preview); preview.geometry.dispose(); preview = null; }
  if (!segments || segments.length === 0) return;
  const v = [];
  for (let i = 0; i < segments.length; i += 2) v.push(segments[i], segments[i + 1], Z);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  preview = new THREE.LineSegments(g, previewMat);
  scene.add(preview);
}
```

It takes a flat list `[x1, y1, x2, y2, ...]` (every four numbers is one segment), builds a temporary object, and replaces the previous preview. Calling `setPreview(null)` just clears it. The preview is **not part of the sketch data**. It's UI feedback, thrown away on every mouse move.

## 3.4 Tools: small state machines

A drawing tool is just "what should the next click do, given what I've clicked so far?" The line tool has two states: **no start point yet** and **have a start point**. We give every tool the same shape, so the rest of the app can treat all tools alike:

```js
{ name, onClick(x, y), onMove(x, y), onUp(), cancel() }
```

Create `src/tools.js`. First, a small **dispatcher** that routes mouse events to whichever tool is active:

```js
import { renderer, pointOnPlane } from "./viewport.js";
import { snapOrCreate, addLine, addCircle, setPreview } from "./sketch.js";
import { setStatus } from "./ui.js";

let active = null;
export const getActiveTool = () => active;

export function setTool(tool) {
  active?.cancel?.();
  active = tool;
  setStatus(tool ? `${tool.name}: click in the viewport (Esc to stop)` : "Ready");
  document.dispatchEvent(new CustomEvent("toolchange"));
}
```

- `active?.cancel?.()`: the `?.` ("optional chaining") means "if `active` exists, and if it has a `cancel`, call it; otherwise do nothing." When you switch tools, the old one gets a chance to clean up (clear its preview, forget its start point).
- `document.dispatchEvent(new CustomEvent("toolchange"))` **broadcasts a message** that the ribbon will listen for (Chapter 4) to highlight the active button. This is how two parts of the program stay in sync without importing each other: one shouts, the other listens.

```js
const el = renderer.domElement;
el.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || !active) return;
  const p = pointOnPlane(e);
  if (p) active.onClick?.(p.x, p.y);
});
el.addEventListener("pointermove", (e) => {
  if (!active) return;
  const p = pointOnPlane(e);
  if (p) active.onMove?.(p.x, p.y);
});
el.addEventListener("pointerup", () => active?.onUp?.());
window.addEventListener("keydown", (e) => { if (e.key === "Escape") setTool(null); });
```

- **`pointerdown`, not `mousedown`.** Pointer events cover mouse, touch and pen with one API. `e.button === 0` is the left button (1 is middle, 2 is right). We ignore the others, since they belong to the orbit controls.
- We convert the click to a plane point with Chapter 2's `pointOnPlane`, check that it isn't `null`, then give the tool plain `x, y` numbers. Tools never see mouse events, only model coordinates. That keeps them simple and testable.
- `onUp` isn't used until Chapter 9 (dragging), but we wire it now so the interface is complete.
- `keydown` is on `window` (not the canvas) because a canvas can't receive keyboard focus by default.

Now the **line tool**:

```js
export const lineTool = {
  name: "Line",
  start: null,
  onClick(x, y) {
    const p = snapOrCreate(x, y);
    if (this.start && this.start !== p) addLine(this.start, p);
    this.start = p;
  },
  onMove(x, y) {
    if (this.start) setPreview([this.start.x, this.start.y, x, y]);
  },
  cancel() { this.start = null; setPreview(null); },
};
```

Walk through the states:

- **Click 1:** `this.start` is `null`, so no line is made. We remember the point as the start.
- **Move:** with a start point, show a rubber band from start to the mouse.
- **Click 2:** a line is made from start to the new point, and *that point becomes the next start*, so lines chain.
- **Esc:** `cancel()` forgets the start and clears the preview.

Three things worth knowing:

- **`this`**: inside an object's method, `this` means "the object the method was called on." `active.onClick(...)` makes `this` equal `active`, so `this.start` is the line tool's own memory. **Gotcha:** if you write these as arrow functions (`onClick: (x, y) => { ... }`), `this` does *not* refer to the object, and `this.start` breaks silently. Use the method form shown above for anything that uses `this`.
- **`this.start !== p`**: this guard stops zero-length lines. If you double-click, the second click snaps to the first point and would create a line from a point to itself. Kernels hate zero-length edges, so we prevent them at the source.
- **State lives on the tool object.** `start` isn't a global or a parameter: the tool carries its own memory between clicks.

Add the **rectangle** and **circle** tools (they use the same pattern):

```js
export const rectTool = {
  name: "Rectangle",
  c1: null,
  onClick(x, y) {
    if (!this.c1) { this.c1 = { x, y }; return; }
    const { x: x1, y: y1 } = this.c1;
    if (Math.abs(x - x1) < 1e-6 || Math.abs(y - y1) < 1e-6) return;
    const a = snapOrCreate(x1, y1), b = snapOrCreate(x, y1);
    const c = snapOrCreate(x, y),   d = snapOrCreate(x1, y);
    addLine(a, b); addLine(b, c); addLine(c, d); addLine(d, a);
    this.cancel();
  },
  onMove(x, y) {
    if (!this.c1) return;
    const { x: x1, y: y1 } = this.c1;
    setPreview([x1,y1,x,y1,  x,y1,x,y,  x,y,x1,y,  x1,y,x1,y1]);
  },
  cancel() { this.c1 = null; setPreview(null); },
};

export const circleTool = {
  name: "Circle",
  center: null,
  onClick(x, y) {
    if (!this.center) { this.center = snapOrCreate(x, y); return; }
    const r = Math.hypot(x - this.center.x, y - this.center.y);
    if (r > 1e-6) addCircle(this.center, r);
    this.cancel();
  },
  onMove(x, y) {
    if (!this.center) return;
    const r = Math.hypot(x - this.center.x, y - this.center.y), n = 48, s = [];
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * Math.PI * 2, t1 = ((i + 1) / n) * Math.PI * 2;
      s.push(this.center.x + r*Math.cos(t0), this.center.y + r*Math.sin(t0),
             this.center.x + r*Math.cos(t1), this.center.y + r*Math.sin(t1));
    }
    setPreview(s);
  },
  cancel() { this.center = null; setPreview(null); },
};
```

Notes: the rectangle creates **four points and four lines**, going around the corners `a → b → c → d → a`. Each line reuses the shared corner points (that's the data model paying off): the rectangle is automatically a closed loop. `const { x: x1, y: y1 } = this.c1` is **destructuring**: pull `x` and `y` out of the object and name them `x1`, `y1`. The `< 1e-6` checks reject a rectangle with zero width or height.

## 3.5 Temporary wiring (replaced in Chapter 4)

In `main.js`:

```js
import { setupTabs } from "./ui.js";
import "./viewport.js";
import "./sketch.js";
import { setTool, lineTool } from "./tools.js";

document.querySelectorAll(".tabset").forEach(setupTabs);
window.addEventListener("keydown", (e) => { if (e.key === "l") setTool(lineTool); });
```

Remove the test cube from `viewport.js` if you want a clean floor, or leave it. We delete it in Chapter 5.

## Gotchas for the chapter

- **Nothing draws until you've called `redraw()`.** The data and the picture are separate. If you add a line to `sketch.entities` directly (without `addLine`), you won't see it. That separation is deliberate, and it's also the source of "my data is right but the screen is stale" bugs.
- **Orbiting while drawing.** Left button draws, middle orbits. If a click seems to do nothing, check you're clicking the *canvas* and not a panel floating over it.
- **A click above the horizon** (when the camera looks nearly parallel to the plane) can return a point very far away, or `null`. Real CAD apps snap the camera to a top view when you start a sketch. That's a feature for Chapter 10.

## Predict / Try

1. You click A, B, C, then A again to close a triangle. Which function makes the last line end at the *original* point A, and why does that matter for Chapter 6?
2. Draw a triangle, then add `console.log(JSON.stringify(sketch))` somewhere and read the data. Does it match the shape in the Idea section? How many points does a closed triangle have? How many does a rectangle have?
3. Remove the `this.start !== p` guard, double-click, and read the sketch data. What got created?
4. Zoom far in, then far out, and try to close a loop each time. What changes, and which function is responsible?
5. Change `Z` to `0` and rotate the view. What do you see?

<details><summary>Answers</summary>
1. <code>snapOrCreate</code>. It returns the existing point near the click. The closing line and the first line then share one point id, which is how chaining will recognize the loop as closed.<br>
2. A triangle has 3 points and 3 lines, a rectangle has 4 and 4. If you see extra points, a click near a corner created a duplicate instead of snapping.<br>
3. A line whose two ends are the same point (zero length).<br>
4. The snap tolerance scales with zoom (<code>pickTolerance</code>).<br>
5. The sketch flickers against the grid where they overlap (z-fighting).
</details>

## Checkpoint

Press `l`, then click-click-click: connected yellow lines appear with a blue rubber band following the mouse. Esc stops. Closing back on the start point reuses that point (you see one white dot, not two).

---

# Chapter 4: The ribbon: tools as a registry

## Idea

The obvious way to make a ribbon is to write a `<button>` in HTML for every command and hook each one up by hand. That works for three buttons and turns into a mess at thirty. The better way is the **registry pattern**:

1. Write a **list of command objects** (data).
2. Write **one function** that reads the list and builds the ribbon (code).

Now the ribbon knows nothing about CAD. Adding a feature later means adding one object to the list, with no HTML edits and no new wiring. This is the Chapter 0 rule applied to your own user interface: *data is the truth, the UI is a picture of it.*

Each command is one of two kinds:

- a **tool**: it stays active and takes clicks (Line, Rectangle, Circle)
- a **one-shot**: it runs once and finishes (Clear sketch)

## 4.1 The list

Create `src/commands.js`:

```js
import { setTool, getActiveTool, lineTool, rectTool, circleTool } from "./tools.js";
import { resetSketch } from "./sketch.js";

export const commands = [
  { id: "line",   label: "Line",         tab: "sketch", group: "Draw", tool: lineTool },
  { id: "rect",   label: "Rectangle",    tab: "sketch", group: "Draw", tool: rectTool },
  { id: "circle", label: "Circle",       tab: "sketch", group: "Draw", tool: circleTool },
  { id: "clear",  label: "Clear sketch", tab: "sketch", group: "Edit", run: () => resetSketch() },
];
```

Each object answers four questions: *what's it called* (`label`), *which ribbon tab* (`tab`, which must match a `data-panel` from Chapter 1), *which group box within the tab* (`group`), and *what does it do*: either `tool` (an object to activate) or `run` (a function to call).

## 4.2 The function that builds the ribbon

This is the longest function so far, so we'll take it in pieces. The goal is to turn the flat list into this structure for every tab:

```
panel (data-panel="sketch")
  ├─ group "Draw"  → [Line] [Rectangle] [Circle]    label under it: "Draw"
  └─ group "Edit"  → [Clear sketch]                 label under it: "Edit"
```

**Piece 1: sort the commands into groups.**

```js
export function buildRibbon() {
  for (const panel of document.querySelectorAll("#ribbon .tab-panel")) {
    const tab = panel.dataset.panel;
    const groups = {};
    for (const cmd of commands.filter((c) => c.tab === tab)) {
      (groups[cmd.group] ??= []).push(cmd);
    }
```

- For each ribbon panel, find which tab it is (`dataset.panel`, which you set in the HTML).
- `commands.filter(...)` keeps only the commands for this tab.
- `groups` is a dictionary from group name to a list of commands. The line `(groups[cmd.group] ??= []).push(cmd)` is a compact trick. **`??=` means "if this is empty, set it to something new first."** So the first time we see group "Draw", it creates the empty list, and then `.push(cmd)` adds to it. It's Python's `groups.setdefault(cmd.group, []).append(cmd)`.

**Piece 2: build the HTML elements for each group.**

```js
    panel.innerHTML = "";
    for (const [name, cmds] of Object.entries(groups)) {
      const g = document.createElement("div");
      g.className = "group";
      const row = document.createElement("div");
      row.className = "buttons";
```

- `panel.innerHTML = ""` empties the panel first, so calling `buildRibbon()` twice doesn't duplicate buttons.
- `Object.entries(groups)` turns a dictionary into a list of `[key, value]` pairs, like Python's `.items()`. `const [name, cmds]` unpacks each pair.
- `document.createElement("div")` makes a new tag, *not yet on the page*. `className` sets its `class="..."`. This is the JavaScript equivalent of writing `<div class="group">` in HTML.

**Piece 3: make a button for every command, and wire it.**

```js
      for (const cmd of cmds) {
        const b = document.createElement("button");
        b.textContent = cmd.label;
        b.dataset.cmd = cmd.id;
        b.addEventListener("click", () => (cmd.tool ? setTool(cmd.tool) : cmd.run()));
        row.appendChild(b);
      }
```

- `textContent` is the visible label.
- `b.dataset.cmd = cmd.id` stamps the command's id onto the button (it becomes `data-cmd="line"` in the HTML), so we can find the button's command later.
- The click handler is the whole point. **If the command has a `tool`, activate it, otherwise call `run()`.** `a ? b : c` is the ternary operator (Python's `b if a else c`).
- `appendChild` attaches the button to the row. Until that moment, the button existed only in memory.

**Piece 4: add the group label and attach everything.**

```js
      const label = document.createElement("div");
      label.className = "group-label";
      label.textContent = name;
      g.append(row, label);
      panel.appendChild(g);
    }
  }
}
```

The label sits under the buttons (as in SolidWorks and Mastercam ribbons). `g.append(row, label)` puts both inside the group, and `panel.appendChild(g)` puts the group on the page.

## 4.3 Highlight the active tool

Remember Chapter 3's `setTool` broadcast a `"toolchange"` message. Here is the listener:

```js
document.addEventListener("toolchange", () => {
  for (const b of document.querySelectorAll("#ribbon .buttons button")) {
    const cmd = commands.find((c) => c.id === b.dataset.cmd);
    b.classList.toggle("on", !!cmd.tool && cmd.tool === getActiveTool());
  }
});
```

- For every button, look up its command from the id stamped on it.
- `classList.toggle("on", condition)` adds the class if the condition is true, and removes it otherwise. It replaces the "remove everywhere, then add" dance from Chapter 1 with one call.
- `!!cmd.tool` means "this command *has* a tool" (the double `!!` forces any value to true or false). We need that check, because a one-shot command has no tool, and comparing `undefined === getActiveTool()` could accidentally be true when no tool is active.
- **Why an event and not a direct call?** `tools.js` doesn't import `commands.js`, and the ribbon doesn't tell the tools anything. If they imported each other you'd get a **circular import**, which causes confusing "undefined at load time" bugs. Events are how you decouple two modules. We'll use this trick again.

## 4.4 Styling the ribbon

Append to `style.css`:

```css
.group { display: inline-block; vertical-align: top; padding: 0 10px; border-right: 1px solid #ccc; }
.group-label { font-size: 11px; color: #666; text-align: center; margin-top: 4px; }
.buttons button { height: 34px; margin-right: 4px; padding: 0 10px; cursor: pointer; }
.buttons button.on { background: #cfe3ff; }
```

`inline-block` makes groups sit side by side but still behave like boxes (with padding and borders). `vertical-align: top` stops them from lining up by their text baselines. The `.on` rule is the "active tool" highlight, and it's just a label whose look we defined, like the tab `active` in Chapter 1.

## 4.5 Connect it

`main.js` now looks like this (replace the temporary `l` key code):

```js
import { setupTabs } from "./ui.js";
import "./viewport.js";
import "./sketch.js";
import { buildRibbon } from "./commands.js";

document.querySelectorAll(".tabset").forEach(setupTabs);
buildRibbon();
```

## Gotchas

- **Buttons built in JavaScript lose their listeners if you replace their parent's `innerHTML`.** Setting `innerHTML` destroys the old child elements, and their event handlers die with them. That's why `buildRibbon()` rebuilds *everything* each time rather than editing in place. If you ever want to update just one button, keep a reference and edit it directly.
- **`tab:` must match a `data-panel` value exactly.** A typo (`"sktech"`) silently creates no buttons for that command because no panel matches. Check this first if a button doesn't appear.
- **Import order can matter.** `tools.js` runs code at the moment it's imported (it registers mouse listeners on the canvas). It imports `viewport.js` first, so the canvas exists by then. If you ever import things in a different order and get "cannot read properties of undefined", suspect load order.

## Predict / Try

1. Rename `group: "Draw"` to `group: "Shapes"` on just the circle command. What happens to the ribbon? Predict first.
2. Add a fourth tool: a **Centerline** that behaves like the line tool but draws in a different color. Which files do you touch? (Hint: you need a new tool object and one new list entry. Do you need to edit the HTML?)
3. Add a command with the wrong `tab:` spelling. What do you see, and does the console complain?
4. Click Rectangle, then Circle, then Line. Why does only one button highlight at a time? Trace which code makes that happen.

## Checkpoint

The Sketch tab shows Line / Rectangle / Circle buttons and a Clear button. The active tool's button is highlighted. You can draw a rectangle with a circle inside it.

---

# Chapter 5: The kernel

## Idea

So far everything was Three.js: drawing. Now we add the part that makes this a CAD program. OpenCascade (**OCCT**) is a C++ library of exact geometry and modeling operations, used in FreeCAD and many other programs. OpenCascade.js is OCCT compiled to **WebAssembly (WASM)** so your browser can run it.

Four facts about it shape everything in this chapter and the next ones:

1. **It's big and loads asynchronously.** The WASM file is tens of megabytes. You can't call the kernel until it has finished loading.
2. **The API has numbered overloads.** C++ lets many constructors share a name. JavaScript doesn't, so you get `BRepPrimAPI_MakeBox_1`, `_2`, `_3`, and so on. The number picks which version.
3. **Objects live in WASM memory, not JavaScript memory.** JavaScript's garbage collector can't free them. Long-running apps call `.delete()` on objects they're done with.
4. **Names and numbers shift between versions.** So you need the skill of *looking up the real API*, which this chapter teaches.

## 5.1 Detour: async and await (loading the kernel)

Loading takes seconds, and we can't freeze the page while it happens. JavaScript's answer is a **Promise**: *a value that will arrive later*. `await` pauses *your* function until the promise delivers, without freezing everything else:

```js
async function boot() {
  const oc = await initOpenCascade();   // "wait here for the kernel; the page stays alive"
  // ...everything below runs only AFTER it has loaded
}
```

This is the same as Python's `async def` / `await`. Two rules to keep in mind:

- **`await` only works inside an `async` function.**
- **Anything that needs the kernel must come after the `await`.** If you try to use `oc` earlier, it's `null`, and you get `Cannot read properties of null`.

## 5.2 Loading it: `src/kernel.js`

```js
import * as THREE from "three";
import initOpenCascade from "opencascade.js";
import ocWasm from "opencascade.js/dist/opencascade.full.wasm?url";

export let oc = null;

export async function loadKernel() {
  oc = await initOpenCascade({ mainWasm: ocWasm });
  return oc;
}
```

- `import initOpenCascade from "opencascade.js"`: no braces means a **default export**: the package's one main function.
- The `?url` ending is Vite syntax: "don't try to run this file as code, just give me the URL where it's served." That URL is handed to OpenCascade so it knows where to download the WASM from.
- `export let oc = null` is a **live binding**. Other files that `import { oc }` always see the *current* value of the variable, so when `loadKernel()` later assigns it, every importer sees the loaded kernel. This is why `oc` is `null` before loading and a real kernel afterward. Every command that needs the kernel will begin with `if (!oc) return` for exactly this reason.

**Verify:** the way you pass the WASM location depends on the package version. If this call fails, see "If it won't load" at the end of this chapter.

## 5.3 Learn to read the API (do this now)

Open `node_modules/opencascade.js/dist/` and find the `.d.ts` file (the name varies, often `opencascade.full.d.ts`). It's a **TypeScript definition** file: a list of every class with its constructor parameters.

Search for `class BRepPrimAPI_MakeBox_` and you'll see something like (from memory, so check yours):

```
BRepPrimAPI_MakeBox_1()                          // no arguments
BRepPrimAPI_MakeBox_2(dx, dy, dz)                // a box of these sizes
BRepPrimAPI_MakeBox_3(P: gp_Pnt, dx, dy, dz)     // same, with a corner point
...
```

**This is the single most important skill in this chapter.** Whenever you see a numbered constructor in this book and it fails, the fix is: find the class in the `.d.ts`, read the numbered constructors, and pick the one whose parameters match what you have. When I wrote `_3` for a two-point edge in later chapters, that's from the same lookup. The numbers can differ in your version.

## 5.4 What a shape *is*: topology

You need the vocabulary, because OpenCascade's functions are organized around it. A solid is a hierarchy:

```
Solid
 └─ Shell          (closed skin: the set of all faces)
     └─ Face       (a piece of surface, such as one side of a box)
         └─ Wire   (a closed loop of edges: a face's outline, or a hole's)
             └─ Edge    (a curve segment, such as a line or arc)
                 └─ Vertex   (a point)
```

A box has 1 solid, 1 shell, **6 faces**, 12 edges and 8 vertices. This is exactly what you click on in Mastercam when you select a face or edge of a solid. **Topology** says *what's connected to what*, and **geometry** says *the actual surface or curve*. A face is "bounded by these wires, lying on this plane (or cylinder, or...)."

Every one of these is a **shape** in OpenCascade (`TopoDS_Shape` is the base class). That's why one function can take "a shape" whether it's a face, a solid, or a whole assembly.

## 5.5 Meshing: from exact to triangles

Three.js only draws triangles. So we ask OpenCascade to approximate every face with triangles:

```js
new oc.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.5, false);
```

The arguments are *(shape, linear deflection, relative?, angular deflection, parallel?)*:

- **Linear deflection, 0.1:** the triangles may deviate from the true surface by at most 0.1 mm. Smaller means a smoother cylinder and more triangles.
- **Angular deflection, 0.5:** the angle between neighboring triangles on a curve stays under 0.5 radians (about 29°). Both limits apply, and whichever is tighter wins.
- The last two flags we leave as `false`.

**This call doesn't return the mesh.** It *attaches* a triangulation to each face inside the shape object. That's surprising the first time. You then read each face's triangulation back out, which is the next function.

## 5.6 Extracting triangles: the function, piece by piece

```js
export function shapeToGeometry(shape) {
  new oc.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.5, false);
  const positions = [], indices = [];
```

We'll collect vertex positions and triangle indices into two flat arrays. **Indexed geometry** means we list each vertex once in `positions`, then describe triangles as *triples of indices* into that list. A vertex shared by six triangles is stored once. It's smaller, and it's what lets normals smooth correctly.

Walk over every face:

```js
  const explorer = new oc.TopExp_Explorer_2(
    shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE
  );
  for (; explorer.More(); explorer.Next()) {
    const face = oc.TopoDS.Face_1(explorer.Current());
```

`TopExp_Explorer` walks a shape's sub-shapes of one type. Here: "from this shape, give me every FACE." It's an old-style iterator: `More()` asks "is there another?", `Next()` advances, `Current()` returns the current one. (The `for (; ...; ...)` loop with an empty first part is just JavaScript's way of writing that.) `TopoDS.Face_1(...)` **casts** the generic shape to a face. OpenCascade is strict about types.

Read this face's triangles:

```js
    const loc = new oc.TopLoc_Location_1();
    const handle = oc.BRep_Tool.Triangulation(face, loc, 0);
    if (handle.IsNull()) continue;
    const tri = handle.get();
    const trsf = loc.Transformation();
```

- `BRep_Tool.Triangulation(face, loc, 0)` fetches the triangulation we attached, and fills in `loc` with a **location**: a transform. A face's triangles may be stored in local coordinates with a transform telling you where they really sit (this happens with moved or instanced shapes). If you ignore it, parts appear at the wrong place, often piled up at the origin.
- A **handle** is OpenCascade's smart pointer. `IsNull()` checks that a triangulation really exists. `.get()` unwraps it.
- **Verify:** how the handle is unwrapped differs between versions. If `tri.NbNodes` isn't a function, try using `handle` directly instead of `handle.get()`.

```js
    const flip = face.Orientation_1() === oc.TopAbs_Orientation.TopAbs_REVERSE;
```

A face has an **orientation** (which side is "outside"). Some faces in a solid are stored reversed, so their triangles come out wound the wrong way round. Three.js uses **winding order** (clockwise or counter-clockwise as seen from the viewer) to decide which side of a triangle is its front, and it **skips drawing back sides** (backface culling). A reversed face would simply disappear. So we check the orientation and flip.

Copy the vertices and triangles:

```js
    const base = positions.length / 3;
    for (let i = 1; i <= tri.NbNodes(); i++) {
      const p = tri.Node(i).Transformed(trsf);
      positions.push(p.X(), p.Y(), p.Z());
    }
    for (let i = 1; i <= tri.NbTriangles(); i++) {
      const t = tri.Triangle(i);
      const a = t.Value(1), b = t.Value(2), c = t.Value(3);
      if (flip) indices.push(base + a - 1, base + c - 1, base + b - 1);
      else      indices.push(base + a - 1, base + b - 1, base + c - 1);
    }
  }
```

- **OpenCascade counts from 1.** Loops run `1..N`, not `0..N-1`. The `- 1` on the indices converts to Three.js's 0-based numbering. Forgetting that is the classic "my mesh looks like spaghetti" bug.
- `Node(i)` is the i-th vertex (a `gp_Pnt`, OCCT's point class). `.Transformed(trsf)` applies the face's location. `X()`, `Y()`, `Z()` read the coordinates.
- `base` is how many vertices we've already stored from *earlier faces*. Each face's triangle indices are offsets from there. Faces don't share vertices, because each is meshed separately.
- If `flip`, we swap two indices of each triangle, which reverses its winding.

Hand it to Three.js:

```js
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
```

`setIndex` supplies the triangle list. `computeVertexNormals()` calculates the shading directions. Because vertices aren't shared **across** faces, the edge between two box faces stays crisp, while the inside of a cylinder face shades smoothly. That behavior comes for free from B-rep structure.

## 5.7 Showing it: `src/model.js` (first version)

```js
import * as THREE from "three";
import { bodyGroup } from "./viewport.js";
import { shapeToGeometry } from "./kernel.js";

export function showShape(shape) {
  for (const o of bodyGroup.children) o.geometry.dispose();
  bodyGroup.clear();
  if (!shape) return;

  const geom = shapeToGeometry(shape);
  bodyGroup.add(new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
    color: 0x8ab4f8, metalness: 0.1, roughness: 0.6,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  })));
  bodyGroup.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(geom, 30), new THREE.LineBasicMaterial({ color: 0x0b1d33 })
  ));
}
```

- It follows the same pattern as the sketch's `redraw`: clear the old, build the new. **The mesh is rebuilt from the shape every time, never edited.**
- `polygonOffset` nudges the solid's surface back slightly in depth, so the dark edge lines drawn on top don't flicker through it.
- `EdgesGeometry(geom, 30)` draws an outline wherever neighboring triangles meet at more than 30°. **Honest note:** that's a cheap trick that finds edges from the *mesh*. A real CAD program draws the *B-rep's actual edges*, which is how edge selection works. We'll upgrade this in Chapter 10.

## 5.8 Run it

Delete the test cube from `viewport.js`, then change `main.js`:

```js
import { setupTabs, setStatus } from "./ui.js";
import "./viewport.js";
import "./sketch.js";
import { buildRibbon } from "./commands.js";
import { loadKernel, oc } from "./kernel.js";
import { showShape } from "./model.js";

document.querySelectorAll(".tabset").forEach(setupTabs);
buildRibbon();

async function boot() {
  setStatus("Loading OpenCascade (first load is slow)...");
  await loadKernel();
  setStatus("Kernel ready");

  const box = new oc.BRepPrimAPI_MakeBox_2(40, 30, 20);
  showShape(box.Shape());
}
boot();
```

What happens: the page loads and shows "Loading..." while the WASM downloads and compiles (several seconds the first time, faster after caching). Then `await` returns, `oc` is a real kernel, and we make a box. `box` is the *builder object*, and `box.Shape()` asks it for the finished solid.

## 5.9 If it won't load

The roughest part of the whole project is the bundler and the `.wasm` file. Common failures:

- **Vite complains about `.wasm`:** check that `vite.config.js` from Chapter 1 is in the project root, then restart `npm run dev`.
- **An error mentioning `mainWasm`, `buffer`, or `instantiate`:** your version expects a different way of passing the WASM location. Open `node_modules/opencascade.js/package.json` and the files in `dist/` to see how it loads. The docs also say you can use the raw Emscripten files directly (`dist/opencascade.full.js` plus the `.wasm`) and give them a `locateFile` function that returns the WASM URL. **Send me the exact error and your version number**, and I'll adapt `kernel.js`. This is a normal problem, so don't spend an evening on it alone.

## Gotchas

- **Don't call the kernel before it loads.** `oc` is `null` until `await loadKernel()` finishes.
- **1-based versus 0-based indices.** OpenCascade counts from 1.
- **Skipping the `Location`** makes moved shapes land in the wrong place.
- **Skipping the orientation flip** makes some faces vanish. You can check this in Try 3.
- **Memory.** `new oc.Something()` allocates WASM memory that JavaScript can't reclaim. For a few shapes, ignore it. For something rebuilt on every edit (Chapter 7), you'll want to `.delete()` what you replace.

## Predict / Try

1. Open the `.d.ts` file and find `BRepPrimAPI_MakeBox_` constructors. Which one takes a corner point? Use it to move the box to start at (10, 10, 0).
2. In the browser console, run `Object.keys(oc).filter(k => k.startsWith("BRepPrimAPI_Make"))`. What primitives does the kernel offer? Pick the cylinder maker, find its constructors in the `.d.ts`, and put a cylinder on screen. What do you notice about how the curved wall shades compared with the flat ends?
3. In `showShape`, add `side: THREE.DoubleSide` to the material, then remove it and also remove the `flip` logic. Predict what happens to each.
4. Change linear deflection from `0.1` to `5`. What happens to the cylinder? What does that tell you about "exact" versus "drawn"?

## Checkpoint

After a short loading wait you see a shaded box with dark edges. It came from an exact B-rep solid made by OpenCascade, and you know how to look up any API call in it.

---

# Chapter 6: Sketch to solid: chaining and extrude

## Idea

An extrude needs a **face**. A face needs a **closed wire**. A wire is an *ordered* chain of edges that connect end to end. Your sketch is an *unordered pile* of lines. So the real work of "sketch to solid" is **chaining**: start at one line, then repeatedly find another line that shares the current end point, until you arrive back at the start.

If you can't get back to the start, the profile is open. Real CAD tells you ("open contour"), and so will ours.

Chaining only works because Chapter 3 made lines share points **by id**. Had we stored raw coordinates, we'd be comparing floating-point numbers for near-equality, which is the road to subtle bugs.

## 6.1 Chaining by hand (before reading the code)

Four lines of a square, in *shuffled* order, with corner points 1, 2, 3, 4:

```
L1: 1-2     L2: 3-4     L3: 2-3     L4: 4-1
```

Do it on paper:

- Start with L1. Chain = `[1]`, current end = `2`.
- Look for an unused line touching `2`: that's L3 (2-3). Move to `3`. Chain = `[1, 2]`.
- Look for an unused line touching `3`: L2 (3-4). Move to `4`. Chain = `[1, 2, 3]`.
- Look for an unused line touching `4`: L4 (4-1). Move to `1`. Chain = `[1, 2, 3, 4]`.
- The end is `1`, which is where we started. **Closed.**

If L4 hadn't existed, step 4 would find no line touching 4, and the chain would be a dead end: an open profile.

## 6.2 The code: `findLoops`

Create `src/cad.js`:

```js
import { oc } from "./kernel.js";

const pointById = (sk, id) => sk.points.find((p) => p.id === id);

export function findLoops(sk) {
  const lines = sk.entities.filter((e) => e.type === "line");
  const used = new Set();
  const loops = [];
```

- We take the sketch as a **parameter** (`sk`) instead of using the global one. In Chapter 7, sketches get stored inside the feature tree, and this function will be called on stored copies, not just the live sketch. Designing for that now costs nothing.
- `used` is a **Set**: a collection that remembers which lines we've already placed in a chain, with fast "is it in there?" checks (`used.has(line)`).

```js
  for (const first of lines) {
    if (used.has(first)) continue;
    used.add(first);
    const chain = [first.p1];
    let tail = first.p2;
    let closed = false;
```

For every line not yet used, start a new chain. `chain` collects point ids in order. `tail` is the point we're currently standing on. We've walked along `first` from `p1` to `p2`.

```js
    while (true) {
      if (tail === first.p1) { closed = true; break; }
      chain.push(tail);
      const next = lines.find((l) => !used.has(l) && (l.p1 === tail || l.p2 === tail));
      if (!next) break;
      used.add(next);
      tail = next.p1 === tail ? next.p2 : next.p1;
    }
```

The loop is exactly your paper walk:

1. **If we're back at the start point, the loop is closed. Stop.**
2. Otherwise record the current point in the chain.
3. Find an *unused* line touching the current point (`l.p1 === tail || l.p2 === tail`: the line can be stored in either direction).
4. If there isn't one, it's a dead end, so we stop with `closed` still `false`.
5. Otherwise mark it used and step to **its other end**: `next.p1 === tail ? next.p2 : next.p1`.

```js
    if (closed && chain.length >= 3) loops.push(chain.map((id) => pointById(sk, id)));
  }
  return loops;
}
```

Keep only closed loops (at least three points: two lines can't enclose anything), converting ids to the actual points. The function returns a list of loops, each an ordered list of `{x, y}` points. **Open chains are silently dropped.** That's what gives you "no closed profile" later.

**Gotcha:** this simple chainer fails on T-junctions and a point shared by *three or more* lines (a figure-eight, for instance), because it just takes the first line it finds. Real CAD resolves those cases. Ours handles clean closed shapes, which is what most sketches are.

## 6.3 Area: which loop is the outside?

```js
const polyArea = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
};
```

This is the **shoelace formula** for the area of a polygon given its corners in order. For each pair of neighboring points it adds `x1*y2 - x2*y1`, and half the absolute total is the area. `(i + 1) % pts.length` wraps the last point back to the first. You don't need to derive it. What matters is the use: **a loop with a hole inside has an outer loop and an inner loop, and the outer one has the larger area.** We'll treat the biggest loop as the outline and all others as holes. (Real CAD tests containment instead, so islands inside holes work. That's a Chapter 10 exercise.)

## 6.4 Kernel builders: edge, wire, face, prism

To make a solid from a loop of points:

1. make an **edge** between each pair of neighboring points,
2. join the edges into a **wire**,
3. make a **face** from the wire (the flat surface it encloses),
4. **extrude** the face with a prism operation.

```js
function polygonFace(pts, z) {
  const wire = new oc.BRepBuilderAPI_MakeWire_1();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const edge = new oc.BRepBuilderAPI_MakeEdge_3(
      new oc.gp_Pnt_3(a.x, a.y, z), new oc.gp_Pnt_3(b.x, b.y, z)
    );
    wire.Add_1(edge.Edge());
  }
  return new oc.BRepBuilderAPI_MakeFace_15(wire.Wire(), false).Face();
}
```

- `gp_Pnt_3(x, y, z)` is OpenCascade's 3D point class (the `gp_` prefix stands for "geometric processor," its basic geometry types).
- `BRepBuilderAPI_MakeEdge_3(p1, p2)` makes a straight edge between two points. **Verify the overload number.**
- `BRepBuilderAPI_MakeWire` starts empty (`_1`) and you `Add_1` edges **in order, each touching the last**. This is why we needed chaining: the wire builder refuses edges that don't connect to what's already there. The `% pts.length` makes the last edge return to the first point, closing the wire.
- `MakeFace_15(wire, onlyPlane)` builds the flat face inside a closed wire. **Verify this overload too.** The `false` means "the wire doesn't have to be planar." We know it is.
- The builder objects (`MakeEdge`, `MakeWire`, `MakeFace`) are **workers**: you set them up, then ask for the result with `.Edge()`, `.Wire()`, `.Face()`. This pattern repeats across the whole API.

A circle is a single curved edge, so it skips the corner walk:

```js
function circleFace(c, r, z) {
  const axis = new oc.gp_Ax2_3(new oc.gp_Pnt_3(c.x, c.y, z), new oc.gp_Dir_4(0, 0, 1));
  const edge = new oc.BRepBuilderAPI_MakeEdge_8(new oc.gp_Circ_2(axis, r)).Edge();
  const wire = new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
  return new oc.BRepBuilderAPI_MakeFace_15(wire, false).Face();
}
```

- `gp_Ax2` is a **coordinate system**: an origin point plus a direction (here +Z, so the circle lies in the XY plane). `gp_Dir_4(0, 0, 1)` is a unit direction.
- `gp_Circ_2(axis, r)` is an exact mathematical circle: *center, plane, radius*. No segments, no triangles.
- **Verify all the overload numbers** (`_2`, `_4`, `_8`) against the `.d.ts`.

This is where you see the B-rep payoff: the data's `{center, r: 10}` becomes an *exact circular edge* in the kernel. The 64-segment polygon from Chapter 3 was only a picture.

Extrusion and booleans:

```js
const prism = (face, dz) =>
  new oc.BRepPrimAPI_MakePrism_1(face, new oc.gp_Vec_4(0, 0, dz), false, true).Shape();

export function cut(a, b) {
  return new oc.BRepAlgoAPI_Cut_3(a, b, new oc.Message_ProgressRange_1()).Shape();
}
export function fuse(a, b) {
  return new oc.BRepAlgoAPI_Fuse_3(a, b, new oc.Message_ProgressRange_1()).Shape();
}
```

- **`MakePrism`** sweeps a face along a vector to make a solid. `gp_Vec_4(0, 0, dz)` is a straight-up vector of length `dz`. That *is* an extrude. (The last two `false, true` flags are copy and canonize options. Leave them.)
- **`Cut`** subtracts shape `b` from `a`. **`Fuse`** unions them. Both are *boolean operations*. `Message_ProgressRange_1()` is a required argument for progress reporting. We pass an empty one.

## 6.5 Putting it together: `sketchToSolid`

```js
export function sketchToSolid(sk, depth) {
  const profiles = [];
  for (const pts of findLoops(sk)) {
    profiles.push({ area: polyArea(pts), make: (z) => polygonFace(pts, z) });
  }
  for (const e of sk.entities) {
    if (e.type !== "circle") continue;
    const c = pointById(sk, e.c);
    profiles.push({ area: Math.PI * e.r * e.r, make: (z) => circleFace(c, e.r, z) });
  }
  if (profiles.length === 0) return null;

  profiles.sort((p, q) => q.area - p.area);
  let solid = prism(profiles[0].make(0), depth);
  for (const hole of profiles.slice(1)) {
    solid = cut(solid, prism(hole.make(-1), depth + 2));
  }
  return solid;
}
```

Read it as a recipe:

1. **Gather every closed profile**, both polygon loops and circles. Each stores its area and a `make(z)` function that can build its face on demand at height `z`. (`make` is a **closure**: a function that remembers `pts` or `c` from where it was created.)
2. If there is nothing closed, return `null`, so callers can report "no closed profile".
3. **Sort by area, biggest first.** The biggest is the outline: extrude it.
4. Every other profile is a hole: extrude it and **cut** it out of the solid.

**Why `-1` and `depth + 2` for the holes?** Boolean operations are most reliable when faces cross cleanly. If the tool's top and bottom faces sit *exactly* on the part's top and bottom (coplanar), the kernel has to decide what to do with perfectly overlapping faces, and that's where booleans produce slivers or fail. So the cutting tool starts 1 mm below the part and runs 1 mm past the top. A machinist does the same: the tool starts above the stock, not exactly on its surface.

## 6.6 A temporary test button

In `commands.js`, add these imports at the top:

```js
import { sketch } from "./sketch.js";
import { oc } from "./kernel.js";
import { sketchToSolid } from "./cad.js";
import { showShape } from "./model.js";
import { setStatus } from "./ui.js";
```

and add this command to the `commands` array:

```js
{ id: "extrude-test", label: "Extrude 20", tab: "solid", group: "Test", run: () => {
    if (!oc) return setStatus("Kernel still loading");
    const solid = sketchToSolid(sketch, 20);
    if (!solid) return setStatus("No closed profile found");
    showShape(solid);
}},
```

(Also change the existing `import { resetSketch } from "./sketch.js";` into the combined import above, so you don't import from the same file twice.)

## Gotchas

- **Booleans are the most failure-prone thing a kernel does.** Coplanar faces, near-tangent surfaces and tiny gaps cause most of the trouble. The overshoot habit in 6.5 avoids the first.
- **A wire builder silently fails if edges don't connect.** That usually means your chain is broken, or the points differ by floating-point noise. Using shared ids avoids it.
- **Nested loops beyond one level aren't handled.** An island inside a hole would be treated as another hole.
- **Memory.** Every `new oc.Something()` in these builders leaks a little. Fine for now. We'll deal with it in Chapter 7.

## Predict / Try

1. Draw a rectangle and press **Extrude 20** on the Solid tab. Draw a rectangle with a circle inside it and extrude. Where did the hole's *cylinder* come from, and is it made of triangles in the kernel?
2. Draw a triangle but leave the last corner a little off the start, so it doesn't snap. Predict what the status bar says, and which function made that decision. Then try it.
3. Draw two lines forming a "V" and nothing else. What happens, and why?
4. Change `-1` to `0` and `depth + 2` to `depth` for the holes. Does the extrude still work? What happens when you view the hole from the top? (Booleans may still work here, but this is the pattern that fails on harder shapes.)

<details><summary>Answers</summary>
1. The kernel stores an exact circular edge and an exact cylindrical face. Triangles exist only after meshing for display.<br>
2. "No closed profile found". <code>findLoops</code> dropped the open chain, so <code>sketchToSolid</code> had nothing to extrude.<br>
3. Same result: the V is a dead-end chain, never closed.
</details>

## Checkpoint

You can draw a closed shape (optionally with circular holes), press Extrude, and get an exact solid whose holes are true cylindrical faces.

---

# Chapter 7: The feature tree: parametric modeling

## Idea

Right now, Extrude is a one-way action. The solid exists, but the *reason* it exists is gone. You can't change the depth, because nothing remembers that it was 20. A **feature tree** keeps the reason. Instead of storing *a solid*, you store the **recipe**:

```js
features = [
  { id:1, type:"sketch",  name:"Sketch 1",  data:{ points, entities } },
  { id:2, type:"extrude", name:"Extrude 1", sketchId:1, depth:20, op:"add" },
]
```

The solid you see is just the result of **replaying the recipe from the top**. Change `depth` from 20 to 35, replay, and you get a different solid. That's all "parametric" means, and it's the whole trick behind SolidWorks. You know it from Mastercam: edit an operation's parameters, hit **Regenerate**, and the result updates. Same architecture, different payload (solids instead of toolpaths).

It also gives you three things nearly for free: a **save file** (the list is just JSON), **undo/redo** (keep older copies of the list), and **error isolation** (one broken feature doesn't have to kill the rest).

## 7.1 Dispatch table: one handler per feature type

Every feature type needs a function that takes "the body built so far" and returns "the new body." We keep those functions in an object, keyed by type name:

```js
const handlers = {
  extrude(f, body) {
    const sk = features.find((x) => x.id === f.sketchId);
    const solid = sketchToSolid(sk.data, f.depth);
    if (!solid) throw new Error("sketch has no closed profile");
    if (!body) return solid;
    return f.op === "cut" ? cut(body, solid) : fuse(body, solid);
  },
};
```

This is a **dispatch table**, the same as a Python dictionary mapping names to functions. To add Fillet in Chapter 8, we add one entry here. We never write a big `if type === "extrude" ... else if type === "fillet" ...` chain.

Reading `extrude`:

- Find the sketch this extrude refers to **by id** (`f.sketchId`): the same reference-by-id idea as the points in Chapter 3. Features point at other features, not copies of them.
- Build the solid from the sketch's stored data. If nothing closed is found, **throw an error** (explained below).
- If there's no body yet, this solid *is* the body. Otherwise, **combine**: `cut` subtracts it, anything else unions it (`fuse`).

## 7.2 `regenerate`: the heart of the program

```js
export function regenerate() {
  let body = null;
  for (const f of features) {
    const handler = handlers[f.type];
    if (!handler) continue;
    try {
      body = handler(f, body);
      f.error = null;
    } catch (err) {
      f.error = err.message;
      console.error(f.name, err);
    }
  }
  showShape(body);
  renderTree();
  const failed = features.filter((f) => f.error).length;
  setStatus(failed ? `${failed} feature(s) failed` : "Regenerated");
}
```

Walk through it:

- Start with no body. For each feature in order, find its handler and run it, **feeding in the body so far and keeping what comes out**. It's a fold: each feature transforms the result of the one before. This is why order matters in a feature tree.
- `if (!handler) continue;`: sketch features have no handler, because they don't change the body directly. They exist as *inputs* for others.
- **`try { ... } catch (err) { ... }`**: Python's `try/except`. If a handler throws, we record the message on the feature (`f.error`), print the full error to the console, and **keep going**. That's the error isolation: one broken feature turns red in the tree instead of crashing the app. (The failed feature leaves `body` unchanged, so later features act on the last good body.)
- Finally, rebuild the picture (`showShape`, `renderTree`) and report in the status bar.

**The mental model to keep:** `regenerate()` throws away the picture and rebuilds it from the data. It's the Chapter 0 rule as a single function.

## 7.3 The tree on screen

The list in the left panel is also just a picture of the data:

```js
let selectedId = null;

export function renderTree() {
  const ul = document.getElementById("feature-list");
  ul.innerHTML = "";
  for (const f of features) {
    const li = document.createElement("li");
    li.textContent = f.name + (f.error ? "  (!)" : "");
    li.style.cssText = "cursor:pointer;padding:3px 4px;list-style:none;" +
      (f.id === selectedId ? "background:#cfe3ff;" : "") + (f.error ? "color:#b00020;" : "");
    li.title = f.error || "";
    li.addEventListener("click", () => { selectedId = f.id; showProps(f); renderTree(); });
    ul.appendChild(li);
  }
}
```

- It follows the pattern from Chapter 4: wipe the list, rebuild it from the data.
- `li.style.cssText = "..."` sets inline CSS directly on one element, which is handy for small dynamic things like "selected" and "error" colors. For anything bigger, use classes.
- `li.title = f.error || ""` sets the hover tooltip. `a || b` means "a if it's truthy, otherwise b." Here: the error message if there is one, otherwise an empty string.
- **The click handler is a closure**: each `li`'s handler remembers *its own* `f`, even though the loop has moved on. That's why clicking the third item selects the third feature, not the last one. (This is a thing worth pausing on, because in older JavaScript the same code with `var` instead of `const` was a famous bug.)

The Properties panel, where parameter editing lives:

```js
function showProps(f) {
  const panel = document.getElementById("props-panel");
  panel.innerHTML = `<b>${f.name}</b><br><br>`;
  const numberField = (label, key) => {
    const row = document.createElement("div");
    row.innerHTML = `${label} <input type="number" value="${f[key]}" step="any" style="width:80px">`;
    row.querySelector("input").addEventListener("change", (e) => {
      f[key] = Number(e.target.value);
      regenerate();
    });
    panel.appendChild(row);
  };
  if (f.type === "extrude") {
    numberField("Depth", "depth");
    const row = document.createElement("div");
    row.innerHTML = `Operation <select><option value="add">Add</option><option value="cut">Cut</option></select>`;
    const sel = row.querySelector("select");
    sel.value = f.op;
    sel.addEventListener("change", () => { f.op = sel.value; regenerate(); });
    panel.appendChild(row);
  }
  document.querySelector('#tree .tab-buttons button[data-tab="props"]').click();
}
```

Key points:

- `numberField(label, key)` is a **reusable helper**: `key` is the *name of the property* to edit (`"depth"`), and `f[key]` reads or writes it dynamically. One function serves every numeric parameter of every feature.
- `<input type="number">` is a numeric text box. Its `change` event fires when the user finishes editing (not on every keystroke). `e.target.value` is the new text, and `Number(...)` converts it, since inputs always give strings. **Forgetting `Number()` makes `"20" + 5` equal `"205"`.**
- **The single most important line is `f[key] = ...; regenerate();`.** Edit the *data*, then replay the recipe. Nothing else changes anything.
- `<select>` is a dropdown. Its `value` is whichever `<option value>` is chosen.
- The last line **clicks the Properties tab for the user**, by finding that button and calling its `.click()`, so your own tab code from Chapter 1 does the switching. Reusing the code you already wrote beats duplicating it.
- Warning: setting `innerHTML` with a template string is fine for text *you* control. If you ever put user-typed text into `innerHTML`, it can inject HTML. We don't here, but remember it for later.

## 7.4 The plumbing

Here's the top of the new `src/model.js` (this replaces the old file; keep `showShape` from Chapter 5 in it):

```js
import * as THREE from "three";
import { bodyGroup } from "./viewport.js";
import { oc, shapeToGeometry } from "./kernel.js";
import { sketchToSolid, cut, fuse } from "./cad.js";
import { setStatus } from "./ui.js";

export const features = [];
let nextFeatureId = 1;

export function addFeature(f) {
  f.id = nextFeatureId++;
  features.push(f);
  return f;
}
```

Then the `handlers`, `regenerate`, `showShape`, `renderTree`, and `showProps` from above.

### Saving the sketch into the tree

Add to `sketch.js`:

```js
export function snapshotSketch() {
  return structuredClone({ points: sketch.points, entities: sketch.entities });
}
```

**This is a real bug waiting to happen, so read this slowly.** When you finish a sketch, you store its data in a feature, then call `resetSketch()` to clear the working sketch. `resetSketch` empties the arrays *in place* (remember 3.1: `length = 0`). If the feature stored the **same arrays**, they would be emptied too, and your finished sketch would vanish. This is **aliasing**: two names pointing at one object. `structuredClone` makes a **deep copy**, with new, independent arrays, so the feature keeps its own data. Whenever you "save a snapshot of something that will change later", copy it.

### The two commands

In `commands.js`, import `addFeature, regenerate, features, renderTree` from `./model.js` and `snapshotSketch, resetSketch, sketch` from `./sketch.js`. Remove the temporary `extrude-test` command and add:

```js
{ id: "finish", label: "Finish sketch", tab: "sketch", group: "Edit", run: () => {
    if (sketch.entities.length === 0) return setStatus("Sketch is empty");
    const n = features.filter((f) => f.type === "sketch").length + 1;
    addFeature({ type: "sketch", name: `Sketch ${n}`, data: snapshotSketch() });
    resetSketch();
    setStatus(`Sketch ${n} saved`);
    renderTree();
}},
{ id: "extrude", label: "Extrude", tab: "solid", group: "Features", run: () => {
    if (!oc) return setStatus("Kernel still loading");
    const sketches = features.filter((f) => f.type === "sketch");
    const sk = sketches[sketches.length - 1];
    if (!sk) return setStatus("Finish a sketch first");
    const depth = Number(prompt("Depth", "20"));
    if (!depth) return;
    const n = features.filter((f) => f.type === "extrude").length + 1;
    addFeature({ type: "extrude", name: `Extrude ${n}`, sketchId: sk.id, depth, op: "add" });
    regenerate();
}},
```

`prompt()` is a throwaway browser dialog for typing a value. The Properties tab is the real editor. Also call `renderTree()` once at the end of `boot()` in `main.js` (import it from `./model.js`).

**Gotcha: the first extrude can't be a "cut".** There's nothing to cut from yet. `handlers.extrude` handles that case by returning the solid itself when `body` is `null`.

## 7.5 Freeing memory (a first try)

Each `regenerate` leaves the previous solid sitting in WASM memory. After hundreds of edits, that adds up. A first improvement: keep a module-level `let lastBody = null;` in `model.js`, and in `regenerate` call `lastBody?.delete?.()` just before replacing it, then store the new `body`. **Test this carefully.** Some kernel shapes share parts internally, and deleting the wrong thing can crash. If you get a crash, remove the delete and tell me what you saw. Leaking a bit is far better than a broken app, and leaks only matter after long sessions.

## Gotchas

- **The feature list is the source of truth. Never edit the displayed mesh.** If a change doesn't appear, you edited a picture instead of the data, or forgot `regenerate()`.
- **Aliasing.** If an edit to one thing unexpectedly changes another, two names point at the same object. Copy with `structuredClone`.
- **Order is meaning.** Moving a feature earlier or later changes the result, and can break features that depended on earlier ones. That's why SolidWorks has "rollback."
- **Errors don't stop the loop** by design, so look at the red items in the tree and at the console.

## Predict / Try

You've made Sketch 1 and Extrude 1 with depth 20. You change the depth to 50 in the Properties tab.

1. Walk through, step by step, which functions run, and which do *not* run. Does the sketch get redrawn? Does the mesh get edited?
2. Draw a rectangle, Finish, Extrude 20. Then change Depth to 60. Watch it grow, and notice you never touched the sketch.
3. Draw a second sketch (a circle), Finish, Extrude it, then set its Operation to **Cut**. A hole appears. Switch to **Add** and it becomes a boss.
4. Break something on purpose: Finish a sketch with an open "V", then Extrude it. The tree item turns red. Does the rest of the model survive? Why?
5. Remove `structuredClone` from `snapshotSketch` and Finish a sketch. What happens to the saved sketch? Explain it using the word "aliasing."

<details><summary>Answers</summary>
1. The input's change handler sets <code>f.depth</code> and calls <code>regenerate()</code>. It loops the feature list, rebuilds the solid from the stored sketch, then <code>showShape</code> throws away the old mesh and builds a new one. The sketch isn't redrawn, because its data didn't change, and nothing is edited in place.<br>
4. The handler throws, <code>regenerate</code> catches it, records <code>f.error</code> and continues. The body stays as it was before the failed feature.<br>
5. The feature's data points at the same arrays that <code>resetSketch</code> empties, so the "saved" sketch becomes empty too.
</details>

## Checkpoint

You have a working feature tree. Editing a number changes the part. This is the chapter where it starts to feel like real CAD.

---

# Chapter 8: Booleans and fillets

## Idea

You've already used booleans: `cut` and `fuse` made holes, bosses and the Add/Cut toggle. A **fillet** rounds an edge. In B-rep terms, it replaces the sharp edge with a new curved face tangent to its two neighboring faces.

Fillets are among the most failure-prone operations in any kernel, because the geometry has to physically *fit*. A 15 mm fillet on an edge of a 10 mm-wide face simply cannot exist. So the kernel call can fail, and your code must check for it. (Your feature tree already survives failures from Chapter 7.)

## 8.1 Getting the edges, without duplicates

To fillet, we need the shape's edges. But think back to topology: a box edge is shared by **two** faces. A walk over faces would meet each edge twice. We want each edge once, so we use a **map**, a collection that stores each shape only once:

```js
const edges = new oc.TopTools_IndexedMapOfShape_1();
oc.TopExp.MapShapes_1(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, edges);
```

- `TopTools_IndexedMapOfShape` stores unique shapes, **numbered from 1**.
- `TopExp.MapShapes_1(shape, type, map)` fills the map with every sub-shape of that type (here, every EDGE). **Verify** the overload name.
- `edges.Extent()` is the count, and `edges.FindKey(i)` returns the i-th edge.

Because the map gives each shape a **stable index**, that same trick is how, in Chapter 10, you'll connect "the triangle I clicked" to "the face it belongs to."

## 8.2 The fillet function

Add to `cad.js`:

```js
export function filletAll(shape, radius) {
  const edges = new oc.TopTools_IndexedMapOfShape_1();
  oc.TopExp.MapShapes_1(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, edges);

  const fillet = new oc.BRepFilletAPI_MakeFillet(shape, oc.ChFi3d_FilletShape.ChFi3d_Rational);
  for (let i = 1; i <= edges.Extent(); i++) {
    fillet.Add_2(radius, oc.TopoDS.Edge_1(edges.FindKey(i)));
  }
  fillet.Build(new oc.Message_ProgressRange_1());
  if (!fillet.IsDone()) throw new Error("fillet failed (radius too large?)");
  return fillet.Shape();
}
```

- `MakeFillet(shape, shapeType)` is another **builder**: you set it up, then ask for the result. `ChFi3d_Rational` selects the usual circular-profile fillet.
- `Add_2(radius, edge)` says "round this edge with this radius." **Verify** the overload (`_2` is *radius, edge* in the versions I know). `TopoDS.Edge_1(...)` casts a generic shape to an edge.
- `Build()` does the work. **`IsDone()` tells you whether it succeeded**, and you must check it. A kernel will not throw an exception on a geometry failure. It just reports "not done." We turn that into a JavaScript error, so Chapter 7's `try/catch` marks the feature red.

## 8.3 Plugging it in

In `model.js`, import `filletAll` and add a handler:

```js
import { sketchToSolid, cut, fuse, filletAll } from "./cad.js";

// inside `handlers`:
fillet(f, body) {
  if (!body) throw new Error("nothing to fillet");
  return filletAll(body, f.radius);
},
```

In `showProps`, add one line to edit its radius:

```js
if (f.type === "fillet") numberField("Radius", "radius");
```

And a ribbon command in the list:

```js
{ id: "fillet", label: "Fillet all", tab: "solid", group: "Features", run: () => {
    if (!oc) return setStatus("Kernel still loading");
    const n = features.filter((f) => f.type === "fillet").length + 1;
    addFeature({ type: "fillet", name: `Fillet ${n}`, radius: 2 });
    regenerate();
}},
```

Notice what you did **not** have to touch: the tab code, the tree code, the regenerate loop. The registry and dispatch table from Chapters 4 and 7 meant a new feature touched four small places. That's the architecture paying for itself.

## The honest limitation

"Fillet all edges" is a toy. A real fillet tool lets you *click an edge*. That needs a mapping from **what you clicked** (a triangle in the mesh) to **the B-rep face or edge it came from**. The standard approach is the map from 8.1: while building the mesh, tag every triangle with the index of its face, store the tags in a geometry attribute, and on click raycast, read the triangle's index, then look up the face. That's the first item in Chapter 10.

## Gotchas

- **Always check `IsDone()`** after builder operations. Kernels report failure through return values, not exceptions.
- **Order matters.** A fillet placed *before* a cut can behave differently from one placed after. If you "rollback" a tree, the later features may no longer make sense.
- **Radius limits:** a fillet needs room on both adjacent faces.

## Predict / Try

1. Extrude a 40 x 30 rectangle by 20 mm, add a fillet of 2, then drag the radius through 5, 10, 14, 16 in Properties. At roughly what value does it fail? Why does that number make sense for a 30 mm-wide part?
2. Put a hole through the part (a cut extrude) *then* add the fillet. Does the hole's edge get rounded too? What does that tell you about which edges "fillet all" picks up?
3. What happens in the tree and the status bar when the fillet fails, and which line of code caused each?
4. Why can't a fillet feature come *before* the extrude it rounds, and what would you have to build to let a user drag features up and down? (Hint: it's just reordering the list, then `regenerate()`. What would break?)

## Checkpoint

You can fillet the body, change the radius live, and trigger a failure on purpose and watch the tree report it.

---

# Chapter 9: Constraints: a baby solver

## Idea

A **constraint** is a *rule* about the sketch: "this line is horizontal", "these two points are 50 apart." You don't move points by hand to satisfy a rule. You state the rule, and a **solver** moves the points. When you drag one point afterward, the solver adjusts the others so every rule still holds. That is the SolidWorks feel.

Each constraint is an equation that should equal zero:

| Constraint | Equation | Means |
|---|---|---|
| horizontal | `p2.y - p1.y = 0` | the two points have equal y |
| vertical | `p2.x - p1.x = 0` | the two points have equal x |
| distance d | `length(p1, p2) - d = 0` | the points are exactly d apart |

Real solvers (SolidWorks, FreeCAD) solve all the equations *at once* with Newton-style numerical math. We'll use something much easier to read, called **relaxation**:

> Loop over all the constraints, many times. On each visit, nudge the points involved *just enough* to satisfy that **one** constraint. Fixing one may slightly disturb another, but repeating the loop makes the whole set settle.

Think of pulling a cluster of springs into place by adjusting each one in turn.

## 9.1 A worked example before any code

Two free points: `a = (0, 0)` and `b = (10, 6)`, with the constraint **horizontal**. We need equal y values.

- The error is `b.y - a.y = 6`.
- If both points are free, each moves *half* the error toward the other: `a.y` becomes 3, `b.y` becomes 3. Equal. Done in one step.
- If `a` is **pinned** (it can't move, perhaps because you're dragging it), then `b` takes the *whole* error: `b.y` becomes 0.

Now the trick that makes this work generally: each point gets a **weight**. A free point has weight 1. A pinned or fixed point has weight 0. Each point moves by `error × (its weight) / (sum of weights)`. With weights `(1, 1)` each moves half. With `(0, 1)` the free one moves all of it. With `(0, 0)` nothing can move, so we skip.

## 9.2 The code: `src/solver.js`

```js
export function solve(sk, pinned = new Set(), iterations = 80) {
  const P = (id) => sk.points.find((p) => p.id === id);

  for (let it = 0; it < iterations; it++) {
    for (const c of sk.constraints) {
      const a = P(c.p1), b = P(c.p2);
      const wa = a.fixed || pinned.has(a.id) ? 0 : 1;
      const wb = b.fixed || pinned.has(b.id) ? 0 : 1;
      const w = wa + wb;
      if (w === 0) continue;
```

- `solve` takes the sketch, plus a **set of pinned ids** (the point you're dragging), and an iteration count. The `= new Set()` and `= 80` are **default parameters**, used when the caller doesn't pass them.
- The outer loop repeats the whole pass 80 times, so the settling happens. The inner loop visits every constraint.
- For each constraint's two points, compute weights: **0 if the point is permanently `fixed` or currently pinned, otherwise 1.** Then skip the constraint if both are frozen.

```js
      if (c.type === "horizontal") {
        const err = b.y - a.y;
        a.y += (err * wa) / w;
        b.y -= (err * wb) / w;
      } else if (c.type === "vertical") {
        const err = b.x - a.x;
        a.x += (err * wa) / w;
        b.x -= (err * wb) / w;
      }
```

This is exactly the worked example: `a` moves *toward* `b` by its share of the error, and `b` moves toward `a` by its share. With equal weights each moves half. Check the signs: if `err` is positive (b is above a), `a.y` increases and `b.y` decreases, so they meet in the middle.

```js
      else if (c.type === "distance") {
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1e-9;
        const err = len - c.value;
        const ux = dx / len, uy = dy / len;
        a.x += (ux * err * wa) / w;  a.y += (uy * err * wa) / w;
        b.x -= (ux * err * wb) / w;  b.y -= (uy * err * wb) / w;
      }
    }
  }
}
```

Distance is the same idea along the line joining the points. `(ux, uy)` is the **unit vector** from `a` to `b` (the direction, with length 1). `err = len - target` is positive when the points are too far apart, so `a` moves *toward* `b` and `b` toward `a` along that direction, each by their share. `|| 1e-9` stops a divide-by-zero if both points sit exactly on top of each other.

**Why it converges:** satisfying one constraint can disturb a neighbor, but each pass leaves the total error smaller. After enough passes the set settles. (It doesn't always. See "Gotchas.")

## 9.3 Plumbing, in four small pieces

**1. The sketch needs a constraint list.** In `sketch.js`:

```js
export const sketch = { points: [], entities: [], constraints: [] };
// in resetSketch():     sketch.constraints.length = 0;
// in snapshotSketch():  structuredClone({ points: sketch.points, entities: sketch.entities, constraints: sketch.constraints })
```

Each constraint stores the **ids** of its points (and a value if it has one): `{ type: "distance", p1: 1, p2: 2, value: 50 }`. Same reference-by-id idea, and it means constraints automatically follow their points around.

**2. Picking helpers.** To click a line or point, we need "what's under the cursor?":

```js
function distToSegment(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
}
export function pickLine(x, y) {
  const tol = pickTolerance();
  return sketch.entities.find((e) => e.type === "line" &&
    distToSegment(x, y, getPoint(e.p1), getPoint(e.p2)) < tol) || null;
}
export function pickPoint(x, y) {
  const tol = pickTolerance();
  return sketch.points.find((p) => Math.hypot(p.x - x, p.y - y) < tol) || null;
}
```

`distToSegment` finds the closest point on a line segment to the cursor. `t` says how far along the segment the closest point lies (0 = start, 1 = end), and `Math.max(0, Math.min(1, ...))` **clamps** it to the segment, so we measure distance to the segment and not to the infinite line through it. `pickLine` and `pickPoint` use the same zoom-aware tolerance as snapping.

**3. Two kinds of new tool**, in `tools.js` (import `sketch, redraw, pickLine, pickPoint` from `./sketch.js` and `solve` from `./solver.js`):

```js
export const selectTool = {
  name: "Select / drag",
  grabbed: null,
  onClick(x, y) { this.grabbed = pickPoint(x, y); },
  onMove(x, y) {
    if (!this.grabbed) return;
    this.grabbed.x = x; this.grabbed.y = y;
    solve(sketch, new Set([this.grabbed.id]));
    redraw();
  },
  onUp() { this.grabbed = null; },
  cancel() { this.grabbed = null; },
};
```

This is why the tool interface had an `onUp` since Chapter 3. **Click** grabs the nearest point, **move** places it under the cursor, and then runs the solver with that point **pinned** so it stays where your mouse is while everything else adjusts. **Release** lets go. A drag is just a three-state machine: not holding, holding, released.

```js
const constraintTool = (type, name) => ({
  name,
  onClick(x, y) {
    const line = pickLine(x, y);
    if (!line) return;
    const c = { type, p1: line.p1, p2: line.p2 };
    if (type === "distance") {
      const v = Number(prompt("Length", "50"));
      if (!v) return;
      c.value = v;
    }
    sketch.constraints.push(c);
    solve(sketch);
    redraw();
  },
  cancel() {},
});
export const horizontalTool = constraintTool("horizontal", "Horizontal");
export const verticalTool   = constraintTool("vertical", "Vertical");
export const distanceTool   = constraintTool("distance", "Distance");
```

`constraintTool` is a **factory**: a function that *returns* a tool object. It's three tools from one piece of code, differing only by `type`. (The parentheses around `{ ... }` after `=>` tell JavaScript "this is an object, not a function body.") Clicking a line adds a constraint between its two points, immediately solves, and redraws.

**4. Register them** in the commands list (group `Constrain`, plus Select/drag under `Edit`):

```js
{ id: "horizontal", label: "Horizontal", tab: "sketch", group: "Constrain", tool: horizontalTool },
{ id: "vertical",   label: "Vertical",   tab: "sketch", group: "Constrain", tool: verticalTool },
{ id: "distance",   label: "Distance",   tab: "sketch", group: "Constrain", tool: distanceTool },
{ id: "select",     label: "Select / drag", tab: "sketch", group: "Edit",    tool: selectTool },
```

## Gotchas

- **Over-constraining.** Give one line two different distances (50 and 80). No arrangement satisfies both, so the points jitter or settle in between. A real solver detects this by counting **degrees of freedom** and finding conflicting equations, and tells you. Ours doesn't.
- **Relaxation isn't guaranteed to converge** for every set of constraints, and it's slower than Newton methods. It's a teaching solver. Real ones solve everything simultaneously.
- **Drag speed.** 80 iterations per mouse move is cheap for ten constraints and slow for a thousand.
- **Constraints are stored in the snapshot**, but editing a finished sketch isn't supported yet. What would you add to reopen one? (The same loop as always: change the data, re-solve, regenerate.)

## Predict / Try

1. Draw a triangle. Apply **Horizontal** to the bottom line, then **Distance 60** to the same line. Use **Select / drag** to drag the apex. What stays true, and what moves?
2. Draw a rectangle. Make the top and bottom **Horizontal**, the left and right **Vertical**, and give the bottom a **Distance**. Drag a corner. What can and can't it do? You've built a parametric rectangle.
3. Give one line two conflicting distances. What happens when you drag? How would a real solver notice?
4. Extrude a constrained sketch, then think: if you could edit a distance after finishing the sketch, what chain of events would update the 3D part? (Hint: Chapter 7.)
5. Why does the drag tool pass the grabbed point as **pinned** instead of letting the solver move it too?

<details><summary>Answers</summary>
1. The bottom line stays horizontal and exactly 60 long. The apex follows your mouse, and the bottom points shift only as needed.<br>
5. Without pinning, the solver would treat your dragged point as free and pull it away from the cursor to satisfy the rules, so the point would resist you. Pinned (weight 0) means "this one is where the user put it. Move everything else."
</details>

## Checkpoint

You can constrain a few lines, drag points, and watch the rest of the sketch follow your rules. Finish the sketch, extrude it, and the solid reflects the constrained shape.

---

# Chapter 10: Where to go next

You now own every layer: sketch data, tools, a registry-driven ribbon, a kernel pipeline, a feature tree with parametric regeneration, booleans, fillets, and a constraint solver. These are the next steps, ordered by how much each improves the app. I describe the approach but haven't tested the specific API names, so verify them in the `.d.ts` as you learned in Chapter 5.

1. **Picking faces and edges.** While building the mesh, tag each triangle with its face's index (using the map from Chapter 8) and store it in a geometry attribute. On click, raycast, read the triangle index, and look up the face. This unlocks "fillet this edge," "shell this face," and "sketch on this face." It's the most important missing piece.
2. **Real B-rep edge display.** Replace the cheap `EdgesGeometry` trick with edges taken from the kernel itself, so edges are selectable and exact.
3. **Sketch on any plane.** Today everything is on `z = 0`. A sketch needs a plane (an origin and axes, `gp_Ax3`), a transform from sketch space to world space (`gp_Trsf`), and a raycast plane that matches.
4. **Proper profile containment.** Replace "biggest is outer, the rest are holes" with a point-in-polygon nesting test.
5. **Arcs and splines** as sketch entities, with matching kernel edges (`GC_MakeArcOfCircle`, and curve classes).
6. **More features:** revolve (`BRepPrimAPI_MakeRevol`), sweep and loft (`BRepOffsetAPI_*`), shell, chamfer, patterns.
7. **Undo/redo.** The feature list is already JSON. Keep a stack of `structuredClone(features)` snapshots and restore one, then `regenerate()`.
8. **Save/load and export.** Save the feature list as a `.json` file. That *is* your native file format. Export STEP and STL through OpenCascade's writers (`STEPControl_Writer`, `StlAPI_Writer`) using its in-memory virtual file system.
9. **A Web Worker** for the kernel, so big rebuilds don't freeze the UI. The open source library Replicad, built on this same kernel, is worth reading for how it structures this.
10. **A real constraint solver** (the WebAssembly build of FreeCAD's solver, PlaneGCS) and a **degrees-of-freedom display**.
11. **Render on demand** instead of 60 times a second, **hover highlights**, **dimension annotations**, and a real parameter dialog instead of `prompt()`.

---

# Quick reference

## Mastercam to WebCAD

| Mastercam | Here |
|---|---|
| Wireframe geometry | Sketch points and entities |
| Construction plane / WCS | Sketch plane (`z = 0` for now) |
| Chaining | `findLoops()` |
| Solids Manager | The feature list and tree |
| Regenerate | `regenerate()` |
| Parasolid | OpenCascade (OCCT) |
| Operation parameters | Feature properties (`depth`, `radius`, `op`) |

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Nothing appears, console says `Cannot read properties of null` | A selector didn't match, or you used `oc` before `await loadKernel()` |
| Scene is on its side, sketch looks like a wall | `DEFAULT_UP` was set after the camera was created |
| Blurry or stretched image after resizing | `renderer.setSize` or `camera.updateProjectionMatrix()` missing |
| Clicks do nothing in the viewport | A panel is covering the spot, or you're not using the left button |
| My data is right but the screen is stale | You forgot to call `redraw()` or `regenerate()` |
| `X is not a constructor` from `oc` | Wrong overload number. Check the `.d.ts` |
| `NbNodes is not a function` | Your version's triangulation handle works differently. Try `handle` instead of `handle.get()` |
| Part invisible or missing faces | Face orientation. Check the `flip` logic and toggle `DoubleSide` to diagnose |
| Mesh looks like spaghetti | 1-based vs 0-based indexing |
| Boolean fails or leaves slivers | Coplanar faces. Overshoot the tool |
| Fillet fails | Radius too large for the neighboring faces |
| Saved sketch becomes empty | Aliasing. Use `structuredClone` |
| Page slows down after many edits | WASM memory. Add `.delete()` discipline |

## Glossary

- **DOM:** the tree of page elements that JavaScript can edit.
- **Module:** a JavaScript file with private scope that shares things via `export` and `import`.
- **Promise / async / await:** a value that arrives later, and the syntax for waiting for it.
- **B-rep:** exact boundary representation: faces, edges, vertices.
- **Topology vs geometry:** what's connected to what, versus the actual curve or surface shapes.
- **Tessellation / meshing:** converting exact surfaces to triangles for display.
- **Wire:** an ordered, connected chain of edges forming a loop.
- **Chaining:** finding closed loops in a pile of connected lines.
- **Feature:** one step in the modeling recipe.
- **Regenerate:** replay the feature list from the top.
- **Aliasing:** two names pointing at the same object, so changing one changes the other.
- **DOF (degrees of freedom):** how many ways a sketch can still move. Zero means fully defined.