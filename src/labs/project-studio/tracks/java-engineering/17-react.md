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

React needs a DOM container; it does not replace the HTML document. The module entry imports React and mounts an application into root. Keep document language, title and viewport even when a framework owns the visible content. The next lesson supplies that entry and its components.

Type this fragment yourself. Start an empty file at `frontend/index.html`:

```html edit=frontend/index.html mode=replace
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Common Ground</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```
