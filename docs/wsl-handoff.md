# Handoff: WSL and Containers series

Start every session on this work by reading [wsl-series-plan.md](wsl-series-plan.md), then this file. At the end of each session, rewrite the sections below (don't add to them) so they describe where things stand now.

## Last session

2026-10-11: plan written, then P1 and P2 built.

- **P1, WSL detection:** `desktop/app/runtimes/wsl.cjs` (`getStatus`, `parseList`, `decode`; `wsl -l -v` output is UTF-16). Tests: `npx vitest run desktop/app/runtimes/wsl.test.mjs` (3 pass). On this machine it reports Ubuntu, WSL 2, default.
- **P2, shell choice:** `terminal:shells` IPC and `opts.shell = 'wsl:<distro>'` in `terminal:start` (`main.cjs`, `preload.cjs`); a Shell selector in the Terminal tab strip (`TerminalPanel.jsx`), per tab, remembered per project in localStorage; a "Linux (WSL): not installed" button opening Microsoft's instructions when WSL is missing. Test: `npx vitest run src/labs/project-studio/TerminalPanel.test.jsx` (2 pass). Verified outside the app: node-pty starting `wsl.exe -d Ubuntu --cd <folder with a space>` opens bash in `/mnt/c/…/My Shelf`, `uname -s` prints Linux.
- **Confirmed in the real app** (2026-10-11): the user picked Ubuntu (WSL) in the Shell selector and used `ls` and `cd` in the project folder.
- `npm run typecheck`: 6 errors, all in OpenMAT, Image Lab and Math OS files this work didn't touch.

## Next

**P3, spike: where the project folder lives.** A Windows-side folder opens in WSL as `/mnt/c/…` (P2 confirmed this works). Test a Linux-side folder (`\\wsl.localhost\Ubuntu\home\<user>\…`) picked as the project folder: file tree, Monaco save, file watching, Check my work (`file`, `contains`, `run`), the Neovim pane, and `wsl.exe --cd` with that UNC path. Write the results table into the plan's P3 row and decide the default location.

## Open questions

- P3 decides where projects live. Don't build P4 or P5 on an assumption about it.

## Rules for this work

- Never run git (add, commit, push or anything else). The user commits.
- One heavy run at a time: no walkthrough or full vitest run alongside another. Close any Electron or Playwright process you start, and leave the user's own `npm run desktop:dev` app alone.
- Don't run `wsl --unregister`, `wsl --install` or anything else that changes the user's WSL setup without asking first. Read-only commands (`wsl -l -v`, `wsl -d Ubuntu -e …` that only reads) are fine.
- After changing main-process files (`desktop/app/*.cjs`), the desktop app has to be restarted to see the change.
- Checks after changes: `npx vitest run <folder>` for what changed; `npm run docs:check` after editing docs; `npm run typecheck`.
