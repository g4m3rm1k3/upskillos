---
title: 4.6 — Solution: Publish It
runtime: none
experiments: What gh-pages does
teaches: npx, deployment, publishing branches
uses: github pages, supply chain, building, branches
---

This lesson goes through one way to meet the brief, and why each part is there. **If your page is live and every check passed, keep yours**: read this to compare. The Your turn at the end republishes after a change, which every published project does again and again.

## The two commands

```powershell
npm run build
npx gh-pages@6.3.0 -d dist
```

- **`npm run build`** makes the site in `dist`, with relative paths thanks to `base: "./"` from lesson 4.4. Always build immediately before publishing: publishing an old `dist` publishes old code.
- **`-d dist`** is the option the documentation calls `--dist`: the directory to publish. The command copies **only that folder's contents** onto the `gh-pages` branch, which is why requirements 2 and 3 hold: the source, `node_modules` and `.env` are outside `dist`, so they can't be published by accident.

## A tool from npm, run once

**`npx`** comes with npm. Given a package name, it downloads the package into a cache (not into your project) and runs its command. Nothing changes in `package.json`, so a tool you run once a week doesn't become a dependency of the app.

`npx` runs code from the internet on your computer, with your permissions, so the supply-chain habits from lesson 4.2 apply even more:

- **Pin the version**: `gh-pages@6.3.0`, not `gh-pages`. Without a version, `npx` runs whatever is newest today, which could differ tomorrow, or have been tampered with.
- **Check the name.** A typo in a package name runs someone else's package.
- **Look before running**: the package's page shows its publisher, how widely it's used, and its source repository.

## What gh-pages does {#what-gh-pages-does}

Under the hood the tool does nothing you couldn't do by hand with Sprint 1's commands. It clones your repository's `gh-pages` branch into a cache folder (`node_modules/.cache/gh-pages`), replaces its files with the contents of `dist`, commits, and pushes the branch to `origin`. Your own folder and your `main` branch are never touched. Predict:

```predict
question: You just published with `npx gh-pages@6.3.0 -d dist`. What does `git status` say about your project folder?
choice: Nothing to commit: gh-pages worked in its own copy
choice: dist is staged on main
choice: You're on the gh-pages branch now
answer: Nothing to commit: gh-pages worked in its own copy
explain: All the branch work happened in a separate clone of your repository, in a cache folder. Your folder is still on `main`, `dist` is still ignored, and nothing changed.
verify: if (-not (git status --porcelain)) { 'Nothing to commit: gh-pages worked in its own copy' }
```

Look at what was published, from your own folder:

```powershell
git fetch origin gh-pages
git ls-tree -r --name-only FETCH_HEAD
```

`git fetch` downloads a branch from GitHub without changing anything of yours, and `FETCH_HEAD` names what it just fetched. `git ls-tree -r --name-only` lists every file in that commit: `index.html` and `assets/…`, nothing else. This is exactly how the challenge's checks looked.

```check
run "git fetch -q origin gh-pages; git ls-tree -r --name-only FETCH_HEAD" stdout="index.html" label="the published branch holds the built page"
git-clean
```

## When the page doesn't work

Three things go wrong, and they look different:

- **A 404 from GitHub:** Pages isn't switched on for `gh-pages`, or hasn't finished: it takes a minute or two after each publish.
- **A blank page, and errors in the Console about `/assets/…`:** the build was made without `base: "./"`.
- **The old version:** your browser kept a copy. A hard refresh (**Ctrl+F5**) fetches everything again.

## Your turn: publish a change

Make a visible change, then publish again: set the `--header-bg` token in `style.css` to `#eef2f7`, a slightly cooler grey. Commit it and push `main` (the source of truth), then build and publish.

```check
run "git fetch -q origin gh-pages; $css = git ls-tree -r --name-only FETCH_HEAD | Where-Object { $_ -like '*.css' }; git show \"FETCH_HEAD:$css\"" stdout="#eef2f7" label="the published stylesheet has the new colour" -- Build again before publishing: publishing an old dist publishes the old colour.
contains style.css "#eef2f7" label="the change is in the source too"
git-pushed -- Push main as well: the source of truth is main, not the website.
git-clean
```

```hints
nudge: Three things change: the source, GitHub's `main`, and GitHub's `gh-pages`. Each has its own command.
concept: Committing and pushing updates `main`; only building and publishing updates the website, and publishing always takes whatever is in `dist` at that moment.
shape: Edit the token, `git commit -am`, `git push`, `npm run build`, `npx gh-pages@6.3.0 -d dist`.
answer: ~~~powershell
git commit -am "Use a cooler grey for the headers"
git push
npm run build
npx gh-pages@6.3.0 -d dist
~~~
```
