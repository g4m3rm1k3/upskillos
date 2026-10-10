---
title: 4.5 — Challenge: Publish It
runtime: none
teaches: github pages, reading documentation
uses: building, base paths, branches, git push, npm, supply chain
---

So far the spreadsheet runs on your computer only. This challenge puts it on the internet, at an address anyone can open: **`https://<your-user-name>.github.io/spreadsheet/`**. It's how most developers publish a project's front end for free, and it's the kind of task a team hands you with a goal and a couple of pointers, expecting you to read the documentation for the rest.

## The brief

> **Goal:** the built spreadsheet, served by **GitHub Pages** from your repository.
>
> **How GitHub Pages works:** it serves the files of one branch of a repository as a website. By convention that branch is called **`gh-pages`**, and it holds only the built files (what's in `dist`), never the source.
>
> **The tool:** the npm package **`gh-pages`**, version **6.3.0**, publishes a folder to that branch with one command. You don't need to install it: `npx gh-pages@6.3.0 …` downloads that exact version and runs its command (press **y** if it asks to). Its documentation is on its page at npmjs.com, under *Command Line Utility*: read it to find the option that names the folder to publish.
>
> **Requirements:**
>
> 1. GitHub has a `gh-pages` branch containing the build, whose page loads its files relative to itself (lesson 4.4's `base`).
> 2. **Only** the built files are published: no source code, no `node_modules`.
> 3. **No secrets are published.** `.env` must never appear on the website: anything in a public repository's branches can be read by anyone.
> 4. `main` is unchanged: `dist` is still ignored there, and never committed.
> 5. GitHub Pages is switched on for the branch, and the page works at its address.

## Your turn: publish it

When the build is published, switch Pages on: on your repository's page on GitHub, open **Settings → Pages**, choose **Deploy from a branch**, pick **`gh-pages`** and **/ (root)**, and save. After a minute, the address appears at the top of that page. Open it: your spreadsheet, on the internet.

```check
run "git ls-remote --heads origin gh-pages" stdout="gh-pages" label="1. GitHub has a gh-pages branch" -- Build, then publish dist with the gh-pages command.
run "git fetch -q origin gh-pages; git show FETCH_HEAD:index.html" stdout="./assets/" label="1. the published page is the build, loading its files relative to itself"
run "git fetch -q origin gh-pages; git ls-tree -r --name-only FETCH_HEAD" without="grid.js" label="2. no source code was published" -- Publish the dist folder, not the project folder.
run "git fetch -q origin gh-pages; git ls-tree -r --name-only FETCH_HEAD" without="node_modules" label="2. no node_modules were published"
run "git fetch -q origin gh-pages; git ls-tree -r --name-only FETCH_HEAD" without=".env" label="3. no secrets were published"
git-ignored dist label="4. dist is still ignored on main"
git-untracked dist/index.html label="4. the build was never committed to main" -- The build belongs on gh-pages only. Remove it from main: git rm -r --cached dist, then commit.
git-clean
```

The checks look at the `gh-pages` branch on GitHub. They can't see whether Pages is switched on, or open your page on the internet: requirement 5 is yours to confirm, in a browser.

```hints
nudge: Two commands: one makes the files to publish, the other publishes a folder of them to a branch.
concept: `npm run build` puts the site in `dist`. The `gh-pages` command takes the folder to publish as an option, and pushes its contents to the `gh-pages` branch of your repository's `origin`. Publishing `dist` is what keeps the source, `node_modules` and `.env` out.
shape: `npm run build`, then `npx gh-pages@6.3.0` with the option that names a directory, followed by `dist`.
```
