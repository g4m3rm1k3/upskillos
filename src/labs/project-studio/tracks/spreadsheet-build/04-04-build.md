---
title: 4.4 — Building for Release
runtime: none
experiments: Try the built version
teaches: building, bundling, minifying, content hashes, vite config, base paths
uses: npm scripts, web servers, relative paths
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

```predict
question: You change one line of `grid.js` and build again. Does the JavaScript file in `dist/assets` keep its name?
choice: Yes: it's still the same file
choice: No: the letters in its name change
answer: No: the letters in its name change
explain: The letters are a fingerprint of the file's content. Different content, different fingerprint, different name, so a browser holding the old file can never mistake it for the new one. `index.html` is rebuilt to point at the new name.
```

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

## Your turn: a build that works in a subfolder {#base}

There's a problem with the build that you'd only find after publishing it. Look in `dist/index.html`: the script and stylesheet are loaded from `/assets/…`, starting with `/`, which means "from the top of the website". That's fine at `https://example.com/`. But GitHub Pages (the next lesson) publishes a project at `https://you.github.io/spreadsheet/`, **in a subfolder**, and there `/assets/…` points at `https://you.github.io/assets/…`, which doesn't exist. The page would be blank.

Vite reads its settings from a file called **`vite.config.js`** at the top of the project, if there is one: a module that does `export default { … }` with the settings in it. The setting you need is **`base`**: the address the built files are loaded from, which should be `"./"`, meaning "next to the page, wherever the page is".

Create `vite.config.js` with that setting, build again, and check that `dist/index.html` now loads `./assets/…`. Then commit: `git add vite.config.js` (it's new), then `git commit -am "…"`, whose `-a` also takes the `.gitignore` change from the step before.

```check
file vite.config.js -- Create vite.config.js at the top of the project, next to package.json.
run "npm run build" stdout="built in" label="the build still works"
contains dist/index.html "./assets/" label="the built page loads its files relative to itself" -- Set base to "./" in vite.config.js, then build again.
git-tracked vite.config.js -- Commit it: git add vite.config.js, then git commit -am "your message".
git-clean
```

```hints
nudge: The config file is a tiny module: one `export default` and an object with one setting.
concept: `export default` marks the one main thing a module offers; Vite imports it to read your settings. `base: "./"` makes every address in the built page relative, like the `href="style.css"` you wrote in sprint 2.
shape: `export default { base: "./" };` in `vite.config.js`, then `npm run build`.
answer: ~~~javascript
export default {
  base: "./",
};
~~~
```

## Merge the sprint and push

Everything is committed, so bring the branch into `main`:

```powershell
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

First, though, one challenge: putting the spreadsheet on the internet, in lessons 4.5 and 4.6. Then the next sprint deals with the kind of bug you met in sprint 3, where the program runs happily and gives a wrong answer, by adding a tool that reads your code before it runs.
