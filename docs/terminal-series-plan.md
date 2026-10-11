# The Terminal series: plan and status

Project Studio series key `term` (chapter folders `src/labs/project-studio/tracks/term-*`). Independent of the Neovim series (docs/neovim-series-plan.md): its own project folder, no shared lessons. Read this file first when resuming.

## Purpose and audience

The terminal taught from zero to someone who has only used a mouse: navigation, files, running programs, searching text, processes, Git, scripts and configuration. Every command and flag is explained at first use in bullet lists (what it does exactly, then why). Lessons work on a real project folder, **Shelf**: the layout of a small bookmark web app (server, public, data, test folders). The series organises, searches, runs and automates that folder; it does not teach writing its code.

## Platform

zsh on macOS; bash on Linux and WSL behave the same for everything taught. Checks use POSIX syntax; the walkthrough (`term.desktop.test.js`, `walkSeries({ unix: true })`) runs on macOS and Linux. A PowerShell edition is a separate future series, written on a Windows machine.

## Chapter map

| # | Folder | Title | Commands |
|---|---|---|---|
| 1 | term-basics | Find Your Way and Lay Out a Project | `pwd ls cd mkdir touch echo > >> cat less head tail wc cp mv rm rmdir *`, quoting, `which $PATH`, variables, `export`, `$(…)`, `man`, Ctrl+C, `$?`, line editing |
| 2 | term-text | Pipes and Text Tools | `| grep (-r -n -i -v -c) sort uniq cut tr find xargs tee`, `2>` `2>&1`, `/dev/null` |
| 3 | term-processes | Processes and Jobs | `& jobs fg bg` Ctrl+Z, `ps kill lsof -i`, signals, `&& || ;`, exit codes in practice |
| 4 | term-git | Git from the Terminal | `git init status add commit log diff restore branch switch merge`, `.gitignore` (promised in 1.1) |
| 5 | term-scripts | Shell Scripts | shebang, `chmod +x`, arguments `$1 $@`, `if test [ ]`, `for while`, functions, `set -e` |
| 6 | term-config | Make the Shell Yours | `~/.zshrc`, aliases, functions, PATH, prompt, history settings, `source` |
| 7 | term-remote | Other Computers | `ssh scp`, keys, `curl` in depth (`-X -d -H -i`) |

`trackOrder`: 70 for chapter 1, 70.01, 70.02 … for later chapters.

## Conventions

- `runtime: none`, no `run:`; commands are fenced ```` ```zsh ````.
- macOS file names are case-insensitive: never test a case mistake with `missing Foo`; use `ls -1 | grep -qx foo`.
- zsh aborts on an unmatched glob (`[]`, `*.zz`) with "no matches found"; checks and lessons quote such text.
- After each Your turn, say what the checks establish and what they do not prove (the audit looks for that wording).

## Where we stopped

2026-10-11: chapter 1 (term-basics, 5 lessons) written and walked (`npx vitest run src/labs/project-studio/term.desktop.test.js`). Split from the earlier combined Terminal-and-Neovim plan the same day. Next: chapter 2, term-text.
