---
title: 4.4 — Building for Release
runtime: none
---

The dev server is for you, while you work. When the spreadsheet is put on a real website, there won't be a Vite dev server running: the website just hands out files. **Building** turns your project into those files, ready to publish.

## Build

```powershell
npm run build
```

```text
PS C:\Users\you\Documents\spreadsheet> npm run build

> spreadsheet@0.1.0 build
> vite build

vite v8.3.2 building client environment for production...
✓ 6 modules transformed.
computing gzip size...
dist/index.html                 0.46 kB │ gzip: 0.28 kB
dist/assets/index-BZf2s2lK.css  0.58 kB │ gzip: 0.33 kB
dist/assets/index-CgMwfGAl.js   1.75 kB │ gzip: 0.80 kB

✓ built in 194ms
```

Vite read `index.html`, followed every `<link>`, `<script>` and `import` from it, and wrote the result to a new folder, **`dist`** (short for *distribution*):

- **One JavaScript file** instead of two. `grid.js` and `columns.js` were combined, a step called **bundling**: one request to the server is faster than many. Your modules are still separate in your source code, where they help you; the browser gets the fast version.
- **Smaller files**: the code was **minified**: spaces, line breaks and long names removed, which the browser doesn't need. (`gzip` is the size after the compression web servers apply on the way to the browser.)
- **Names like `index-CgMwfGAl.js`**: the letters are a fingerprint of the file's content. Change the code and the name changes, so a browser that kept an old copy can never mistake it for the new one.

Open `dist/assets/` in the file tree and look at the JavaScript file: one long line, hard to read. It's a product, not source code.

```check
run "npm run build" stdout="built in" label="`npm run build` succeeds"
file dist/index.html
```

## Try the built version

```powershell
npm run preview
```

```text
PS C:\Users\you\Documents\spreadsheet> npm run preview

> spreadsheet@0.1.0 preview
> vite preview

  ➜  Local:   http://localhost:4173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

`preview` serves the `dist` folder, the way a real website would. Open `http://localhost:4173` (a different port from the dev server, so both can run at once) and check that the grid works exactly as in development. Stop it with **Ctrl+C**.

## Keep dist out of Git

`dist` is made from your source, as `node_modules` is made from `package.json`. Anything that can be regenerated stays out of the repository. Add it to `.gitignore`:

```text file=.gitignore
.env
*.log
node_modules
dist
```

```check
git-ignored dist -- Add the line dist to .gitignore.
git-ignored node_modules
```

## Merge the sprint and push

```powershell
git commit -am "Build with Vite; never commit dist"
git switch main
git merge modules-and-vite
git push
git branch -d modules-and-vite
```

```check
git-branch main
git-no-branch modules-and-vite -- After merging, delete the branch.
git-tracked columns.js label="main has columns.js"
git-pushed
git-clean
```

## Sprint 4 is done

The code is split into modules, packages come from npm, Vite serves the page while you work and builds it for release. Your project now has the same shape as most JavaScript projects you'll ever open: a `package.json`, a lock file, a `node_modules` that isn't committed, and `dev` and `build` scripts.

Next sprint deals with the kind of bug you met in sprint 3, where the program runs happily and gives a wrong answer, by adding a tool that reads your code before it runs.
