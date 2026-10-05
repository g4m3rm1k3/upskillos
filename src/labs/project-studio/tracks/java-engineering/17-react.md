---
title: React and TypeScript — derive UI from state
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

Our DOM code coordinates state and elements manually. As interactions grow, React lets us describe a UI from state and reconcile changes. TypeScript checks relationships before execution; runtime validation remains necessary for network input. We introduce both after using the underlying browser mechanisms.

## Declare the frontend build without a generator

### Read JSON and the build command literally

JSON uses double-quoted property names, colons between names and values, and commas between entries. It does not allow comments or trailing commas. `private` is a boolean value true, not the string "true". npm reads scripts as commands associated with names.

`tsc --noEmit && vite build` is a shell command sequence. tsc runs the TypeScript compiler in checking mode without writing JavaScript. `&&` runs the second command only if the first succeeds. Vite then transforms and bundles the application. This differs from JavaScript's boolean && even though the symbols look the same: here the shell interprets them.

React describes UI; react-dom connects those descriptions to browser DOM operations. Packages beginning @types supply type declarations for the checker, not a second runtime implementation. The exact dependency declarations plus package-lock.json record resolution; npm ci uses the lockfile and rejects inconsistent manifest/lock inputs rather than silently updating the intended graph.

The frontend has its own dependency graph. Private prevents accidental package publication. Type module selects ECMAScript modules. The build first runs the TypeScript checker, then bundles; Vite alone transpiles types without establishing type correctness. React is a runtime dependency, while types and build tools are development dependencies.

Run `npm install --prefix frontend` after completing this lesson's configuration, and commit package-lock.json. Later `npm ci --prefix frontend` reproduces the lockfile. Node 22.14 satisfies this Vite baseline's runtime requirement.

Type this fragment yourself. Start an empty file at `frontend/package.json`:

```json edit=frontend/package.json mode=replace
{
  "name": "common-ground-ui",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc --noEmit && vite build" },
  "dependencies": { "react": "19.1.1", "react-dom": "19.1.1" },
  "devDependencies": {
    "@types/react": "19.1.13", "@types/react-dom": "19.1.9",
    "typescript": "5.9.2", "vite": "7.1.7"
  }
}
```

## Make type errors visible

### Keep checking separate from runtime capability

TypeScript adds annotations checked before JavaScript runs. The annotations are removed from emitted code. `target: ES2022` controls the output language baseline; lib includes declarations for ES2022 and browser DOM APIs. Declaring an API's type does not install that API in an old browser.

`module: ESNext` keeps modern module imports for the bundler. `moduleResolution: Bundler` tells TypeScript how to interpret imported paths in this toolchain. `jsx: react-jsx` selects the transform for JSX, the markup-like expression syntax in .tsx files. JSX is not a string of HTML pasted into the DOM; it becomes JavaScript descriptions React interprets.

`strict: true` enables stricter checking, including caution around null and implicit types. `include: ["src"]` limits which source tree forms this project. If a file is outside the checked tree, a green check says nothing about it. **Predict:** can the checker reject `revision: "first"` in a Task object while still accepting malformed JSON received at runtime? Yes. Static checking knows source types, not the actual bytes a server will send later.

Target and lib describe available language/runtime APIs; they do not install polyfills in browsers. Bundler resolution matches our toolchain. JSX transforms markup-like expressions into element creation. Strict makes implicit assumptions harder to miss; noEmit leaves output generation to Vite.

SkipLibCheck skips checking declaration-file internals for dependencies, not your application code. This reduces noise but is a deliberate verification limit.

Type this fragment yourself. Start an empty file at `frontend/tsconfig.json`:

```json edit=frontend/tsconfig.json mode=replace
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022", "DOM"],
    "module": "ESNext", "moduleResolution": "Bundler",
    "jsx": "react-jsx", "strict": true, "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

## Route development requests to the backend

### Distinguish browser routing from proxy routing

`import { defineConfig } from 'vite'` selects a named export from the package. `export default` provides this file's default exported configuration. defineConfig accepts the configuration object; it helps tooling understand the shape rather than starting the server at this line.

During development the browser connects to Vite. A request whose path starts /api is forwarded by Vite to the Java server at port 8080. The browser still sees its original origin, while the proxy performs the second hop. The login and logout entries forward those security routes as well. If Java is stopped, the frontend can still load while these requests fail.

`outDir` is relative to the frontend project: `..` moves to the parent, then the path enters Java's static resources. `emptyOutDir: true` permits clearing that generated output folder before rebuilding. Keep authored files outside it. `base: '/app/'` prefixes generated asset URLs; it does not create a Java route for /app/ by itself. The later controller supplies that route.

A development proxy forwards matching requests to Java, so browser code can keep relative URLs. This is development routing, not backend authorization. The production build writes into a dedicated app subdirectory served by Spring. EmptyOutDir clears only that generated subdirectory; our hand-written static prototype is outside it.

Base ensures generated asset URLs work under `/app/`. Two servers exist during development, while the packaged release can serve frontend and backend together.

Type this fragment yourself. Start an empty file at `frontend/vite.config.js`:

```javascript edit=frontend/vite.config.js mode=replace
import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/login': 'http://127.0.0.1:8080',
      '/logout': 'http://127.0.0.1:8080'
    }
  },
  build: { outDir: '../src/main/resources/static/app', emptyOutDir: true },
  base: '/app/'
});
```

## Mount into a deliberate document

### Preserve the browser's entry point beneath the framework

The div with id root is initially empty. The module script requests /src/main.tsx from Vite during development; Vite transforms TypeScript and JSX into JavaScript the browser can execute. A browser cannot directly execute arbitrary TypeScript annotations just because a file is named .tsx.

When building, Vite replaces the source module reference with generated asset URLs under the configured base. The resulting HTML is copied into Java's static/app directory. Keep the source HTML as authored input and inspect the built HTML as output; changing a generated asset manually will be lost on the next build.

React's later createRoot call takes ownership of the root subtree. It does not supply the surrounding document's lang, encoding or viewport metadata. Those remain HTML responsibilities. **Predict:** if the id changes here but main.tsx still requests root, mounting fails before Board renders, even though the component itself is valid.

React needs a DOM container; it does not replace the HTML document. The module entry imports React and mounts an application into root. Keep document language, title and viewport even when a framework owns the visible content. The next lesson supplies that entry and its components.

Type this fragment yourself. Start an empty file at `frontend/index.html`:

```html edit=frontend/index.html mode=replace
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Common Ground</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```
