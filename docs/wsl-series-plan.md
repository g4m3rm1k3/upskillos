# WSL and Containers series: plan and status

Two Project Studio series that use the desktop app on Windows with Linux running inside it through WSL (Windows Subsystem for Linux), plus the app work they need first. Read this file first when resuming, then [wsl-handoff.md](wsl-handoff.md) for where the last session stopped.

| Series | Key / prefix | trackOrder | Project |
|---|---|---|---|
| Linux on Windows — WSL from Zero | `wsl` / `wsl-` | 72, 72.01 … | **Workbench**: a Git repository that rebuilds the learner's development setup |
| Containers — Docker from Zero | `ctr` / `ctr-` | 73, 73.01 … | **Tally**: a small web API with a Postgres database, put into containers |

Both are separate series, independent of the Terminal (`term`) and Neovim (`nvim`) series. Neither reuses another series' lessons or project.

## Why

- Most professional development on Windows now happens partly inside Linux, through WSL. Learners need to know which side a file, program or port is on, and how to cross between them.
- The Terminal and Neovim series are written for zsh/bash. On Windows their lesson commands and `run` checks currently go to PowerShell and fail (found 2026-10-11; see [neovim-terminal-handoff.md](neovim-terminal-handoff.md)). Running those checks through WSL fixes that for every Linux-shell series at once.
- Containers run on Linux, so on Windows they run inside WSL. The WSL series is the natural prerequisite.

## Starting facts (measured on the author's machine, 2026-10-11)

- Windows 11 Home 10.0.26200. WSL 2 with **Ubuntu 24.04.1 LTS**, systemd enabled (PID 1 is `systemd`).
- Docker isn't installed in Ubuntu.
- Project Studio's terminal is PowerShell on Windows (`desktop/app/terminal.cjs`). Checks run through `powershell.exe -Command` on Windows and `$SHELL -l -c` elsewhere (`shellRun` in `desktop/app/project-checks.cjs`). A check can be limited to one OS with `os=windows|mac|linux`.
- `walkSeries({ unix: true })` skips the whole walkthrough on Windows.

## Phase 0: app work (before any lesson)

Each item ends in something runnable. A **spike** is a short experiment whose result decides the design; record its result in this file before building on it.

| # | Item | Done when |
|---|---|---|
| P1 | **WSL detection.** `desktop/app/runtimes/wsl.cjs`: is WSL installed, which distros exist, which is the default, WSL version. No auto-install and no install lesson: installing differs between machines (Windows version, virtualization settings, a restart), so learners follow Microsoft's own instructions. When WSL is missing, the app says so and links to them. | A unit test of the `wsl -l -v` parser (its output is UTF-16), and a status call that prints the real distros here. |
| P2 | **Terminal shell choice.** A selector in the Terminal tab: PowerShell, or a WSL distro (`wsl.exe -d <distro> --cd <project folder>`). Remembered per project. | The Terminal tab opens Ubuntu in the project folder; `pwd` prints the Linux path of it. |
| P3 | **Spike: where the project folder lives.** A folder under `C:\` is reached from Linux as `/mnt/c/…` (slow for many small files, Windows permissions). A folder in the Linux home is reached from Windows as `\\wsl.localhost\Ubuntu\home\…`. Test the app on the second: the file tree, Monaco save, file watching, Check my work, Neovim. | A table of what works where, and a decision: one default location, and what the lessons say about the other. |
| P4 | **Checks through WSL.** A lesson front-matter key `shell: unix`: its `run` checks go to `$SHELL -l -c` on macOS/Linux and to `wsl.exe -d <distro> --cd <folder> -- bash -lc` on Windows. A per-check `shell=powershell\|unix` option overrides it, because WSL lessons need both kinds in one step (`wsl -l -v` runs on Windows, `uname` runs in Linux). Other check kinds (`file`, `contains`, `git-*`, `keys`) read files directly and need no change, if P3 shows the path works. | Unit tests for the command built on each platform, and one real `run "uname -s" stdout="Linux"` check passing on Windows. |
| P5 | **Neovim with WSL.** Follows from P3: either Windows `nvim.exe` edits the files in place, or the editor pane runs Neovim inside WSL (`--listen` on a Unix socket there, `--remote-expr` through `wsl.exe`). | Lesson 1.2's maze drill done in the real editor pane on Windows, passing its `keys` check. |
| P6 | **Walkthroughs through WSL.** `walkSeries({ unix: true })` runs on Windows by sending commands through WSL instead of skipping. | `term.desktop.test.js` and `nvim.desktop.test.js` pass on Windows. |
| P7 | **Terminal and Neovim series on Windows.** Add `shell: unix` to their lessons; update their plans and `series.js` descriptions to say Windows works through WSL. | Both walkthroughs pass on Windows; the platform matrix (`docs/project-studio-platform-matrix.md`) records it. |

P1–P2 come first because every later item needs them. P7 is the proof that P4–P6 work for content that already exists, before new lessons depend on them.

## Series 1: Linux on Windows — WSL from Zero (`wsl`)

**Audience:** a Windows user who can use the terminal basics (Terminal series chapter 1, or the same material elsewhere) and wants to develop the way professionals do on Windows. No Linux experience assumed. WSL 2 with a distro (Ubuntu) must already be installed: the series doesn't teach installing it, because the process differs between machines. The series description and lesson 1.1 link to Microsoft's instructions.

**Project: Workbench.** A Git repository the learner builds up through the series: a `setup.sh` that installs their Linux development tools, a PowerShell `start.ps1` that starts their work from the Windows side, their `.wslconfig` and `wsl.conf` settings, and a tiny web server used to test networking. By the end, running `setup.sh` in a fresh distro rebuilds their environment, and chapter 6 proves it in a second distro.

| # | Folder | Title | Topics |
|---|---|---|---|
| 1 | wsl-setup | Meet the Linux Inside Windows | what WSL is (a real Linux kernel in a lightweight virtual machine), checking the installed setup (`wsl -l -v`, `wsl --status`, `wsl --version`), the Linux user and `sudo`, `apt update` / `apt upgrade`, opening Ubuntu in the Project Studio terminal and in Windows Terminal, starting Workbench |
| 2 | wsl-two-sides | Files on Both Sides | the Linux filesystem and `/mnt/c`, `\\wsl.localhost` in Explorer, `wslpath`, `explorer.exe .`, why projects belong on the Linux side (speed), line endings (CRLF and LF, `.gitattributes`), permissions and case sensitivity on each side |
| 3 | wsl-interop | Programs Across the Line | running Windows programs from Linux (`notepad.exe`, `clip.exe`, `cmd.exe /c`), running Linux commands from PowerShell (`wsl ls`, pipes in both directions), PATH sharing, `WSLENV`, writing `start.ps1` |
| 4 | wsl-dev | A Development Setup in Linux | `apt` and `build-essential`, Git in WSL with the Windows credential manager, Node with nvm, Python with venv, VS Code connected to WSL (`code .`), Neovim in WSL, writing `setup.sh` |
| 5 | wsl-network | Servers and Ports | running a server in Linux and opening it in a Windows browser, `localhost` forwarding, mirrored networking mode, ports already in use (`ss -ltnp`), reaching Windows from Linux |
| 6 | wsl-manage | Running and Maintaining WSL | `.wslconfig` (memory and CPU limits), `wsl --shutdown` / `--terminate`, `/etc/wsl.conf`, systemd and services (`systemctl`), export and import (backups), a second distro to test `setup.sh`, `wsl --unregister` (and why it's dangerous) |

Possible later chapter: GUI Linux programs through WSLg.

## Series 2: Containers — Docker from Zero (`ctr`)

**Audience:** someone who has done WSL chapters 1–2 (on Windows) or uses macOS/Linux, and can work in a bash terminal.

**Engine: Docker Engine installed in Ubuntu from Docker's own apt repository, not Docker Desktop.** Docker Engine is free for every use, needs no extra Windows program, and is what runs on Linux servers. It needs systemd, which this Ubuntu already has. A learner on macOS would need Docker Desktop or Colima; the series is written and verified for WSL and Linux first, and macOS notes are added only after testing there.

**Project: Tally.** A small counter and notes web API with a Postgres database. Its code is supplied (`support/`) and explained briefly: the series teaches containers, not the app's language.

| # | Folder | Title | Topics |
|---|---|---|---|
| 1 | ctr-start | Your First Containers | what a container is (and isn't: not a virtual machine), installing Docker Engine, the `docker` group, `docker run hello-world`, images and containers, `ps`, `logs`, `stop`, `rm`, `exec` |
| 2 | ctr-images | Building an Image | a `Dockerfile` for Tally, layers and the build cache, `.dockerignore`, tags, `docker image ls`, rebuilding after a change |
| 3 | ctr-data | Data That Survives | why a container's files disappear, volumes, bind mounts (and why the project should be on the Linux side), environment variables and secrets |
| 4 | ctr-network | Containers Talking | publishing ports, user-defined networks, container names as host names, Tally reaching Postgres |
| 5 | ctr-compose | Compose | a `compose.yaml` for Tally and Postgres, `up` / `down` / `logs`, health checks and start order, a database admin page |
| 6 | ctr-dev | Developing Inside Containers | code changes without rebuilding (bind mounts and reload), VS Code dev containers, running tests in a container |
| 7 | ctr-ship | Smaller, Safer Images | multi-stage builds, slim base images, running as a non-root user, pushing to a registry (GitHub Container Registry) |

## Conventions (both series)

- The lesson standard ([project-studio-lesson-standard.md](project-studio-lesson-standard.md)) and the series guide ([contributing/project-studio-series.md](contributing/project-studio-series.md)) apply.
- Smallest runnable steps. Every command, flag and setting is explained at first use, in bullet lists (what it does exactly, then why).
- Fences say which side a command runs on: ```` ```powershell ```` for Windows and ```` ```bash ```` for Linux. The prose names the side too, since mixing them up is the commonest WSL mistake.
- Commands that change the machine (installing Docker, `--unregister`, `.wslconfig`) are explained before they're run, with how to undo them.
- After each Your turn, say what the checks establish and what they don't prove (the audit looks for that wording).
- Checks: `shell=powershell` for Windows-side facts, `shell=unix` for Linux-side ones (Phase 0, P4). A check that only makes sense on Windows also gets `os=windows`.
- Walkthroughs need a real, already installed WSL distro. Lesson 1.1's first check confirms the learner has one (`wsl -l -v` lists a version 2 distro) before anything else depends on it.

## Order of work

1. Phase 0, P1 → P7, in order.
2. WSL chapters 1–6.
3. Containers chapters 1–7.

Each session does one Phase 0 item or one chapter, then updates [wsl-handoff.md](wsl-handoff.md) and the status below, so the next session can start after a `/clear`.

## Status

2026-10-11: plan written; P1 (WSL detection) and P2 (Shell selector in the Terminal tab) built, tested, and P2 confirmed in the real app. Next: P3 (where the project folder lives).
