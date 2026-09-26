# Your first change

One small change, from finding the code to opening a pull request. It assumes you've done [setup.md](setup.md).

The example fixes a typo in a lesson, but the steps are the same for any small change.

## 1. Start from an up-to-date branch

```bash
git checkout main
git fetch upstream
git merge --ff-only upstream/main
git checkout -b fix-lesson-typo
```

Always branch before editing. Your `main` then stays identical to the project's, which keeps syncing simple.

## 2. Find the code

Open the page in the app and look at the address bar. A lesson's address looks like this:

```text
#/chapter/calculus-3/chain-rule
          ───┬──── │ ────┬─────
          course   │   lesson slug
               chapter number
```

The file is `src/courses/calculus/3-<chapter-name>/<NNN>-chain-rule.js`: the course folder, the chapter folder starting with `3-`, and the file ending in `-chain-rule.js`. To search instead, find the exact text you want to change in your editor (in VS Code, Ctrl+Shift+F across the `src/` folder).

For anything other than a lesson, [repository-tour.md](repository-tour.md) says where each part of the app lives.

## 3. Change it and look

Edit the text and save. With `npm run dev` running, the page updates on its own. Check the result in the app, not just in the file.

## 4. Check it

For a lesson file:

```bash
node scripts/validate-lesson-schema.mjs src/courses/calculus/3-<chapter-name>/<NNN>-chain-rule.js
```

It opens the lesson the same way the in-app Lesson Builder does and reports anything that would break it. [CONTRIBUTING.md](../../CONTRIBUTING.md#checks) lists the checks for other kinds of change.

## 5. Commit and push

```bash
git status                  # only the files you meant to change
git add <the file>
git commit -m "Fix typo in the chain rule lesson"
git push -u origin fix-lesson-typo
```

Write the message as what the commit does. Add a line on why if it isn't obvious.

## 6. Open the pull request

GitHub shows a **Compare & pull request** button on your fork after you push. Describe the change, list the check you ran, and add a screenshot if the change is visible. A maintainer will review it; if they ask for changes, commit to the same branch and push again.

## Next

- A bigger change: pick a row in the table in [CONTRIBUTING.md](../../CONTRIBUTING.md#what-do-you-want-to-do).
- Understand the app's structure: [repository-tour.md](repository-tour.md).
