---
title: Scripts and Safety
runtime: python
---

Kit has six check scripts and a linter, and 01-06-04 ran them all with a loop typed at the prompt. A loop you type is a loop you mistype, forget, or skip on the day it matters. Put it in a file and it becomes a **script**, one command that anyone can run and that always does the same thing. This lesson writes that script, and finds the bug almost everyone's first one has. Then it turns to the other side of running commands: some of them can't be undone. It covers the commands that destroy things, the habits that make them safe (dry runs, backups first, the least access you need), install scripts from the internet, and the basics of **SSH**, the way you'll run commands on computers that aren't yours.

**By the end you can:**

- Write a script that runs a series of commands and reports, through its exit status, whether all of them succeeded.
- Recognise destructive commands, and use dry runs, backups and narrow permissions before running one.
- Check a downloaded file against a published checksum, and say why piping a web page into a shell is risky.
- Explain what SSH keys are, which half you share, and what the first-connection fingerprint question is asking.

**You need:** 01-06-01 to 01-06-05, especially exit statuses through pipes (01-06-02) and the check loop and Ruff (01-06-04). Commands run inside `kit`.

## One command for every check

This script finds Kit's check scripts and runs each one, then Ruff, and reports each result:

- `glob.glob("check_*.py")` is the list of file names matching the pattern, as the shell's `check_*.py` was in 01-06-04's loop; `sorted` puts them in a fixed order.
- Each command is a list, `[sys.executable, name]`, run with `subprocess.run` (01-04-05), whose `returncode` is the child's exit status. `sys.executable -m ruff` runs Ruff through the same Python, so the script doesn't need to know where Ruff's launcher is.

It's called `run_checks.py`, and not `check_all.py`, on purpose. A script that runs every `check_*.py` must not itself match `check_*.py`, or it runs itself, which runs itself, and so on: each copy waits for the next, and new processes pile up until the machine runs out of memory. While this lesson was being written, a version called `check_all.py` did exactly that, and had started 3,046 copies of Python before it was stopped. When a script finds files by a pattern, check whether it matches itself.

**This version has one flaw. Don't fix it yet; the next step finds it.**

```python file=kit/run_checks.py
import glob
import subprocess
import sys

# Every check Kit has: each check_*.py script, then the linter. This file is
# called run_checks.py, not check_all.py, so that it isn't one of the scripts
# it runs: a check_*.py that ran every check_*.py would start itself forever.
COMMANDS = [[sys.executable, name] for name in sorted(glob.glob("check_*.py"))]
COMMANDS.append([sys.executable, "-m", "ruff", "check", "."])


def main():
    failed = []
    for command in COMMANDS:
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        name = " ".join(command[1:])
        if result.returncode == 0:
            print("pass", name)
        else:
            print("FAIL", name, "(exit " + str(result.returncode) + ")")
            failed.append(name)
    print(len(COMMANDS) - len(failed), "of", len(COMMANDS), "passed")


if __name__ == "__main__":
    main()
```

Save it and run `.venv/bin/python run_checks.py` (Windows: `.venv\Scripts\python run_checks.py`):

```
pass check_bases.py
pass check_can_match.py
pass check_counts.py
pass check_filter.py
pass check_pack.py
pass check_top.py
pass -m ruff check .
7 of 7 passed
```

```check
run "cd kit; .venv/Scripts/python run_checks.py" stdout="7 of 7 passed" -- run_checks.py should run the six check scripts and Ruff.
run "cd kit; .venv/Scripts/python run_checks.py" stdout="pass -m ruff check ." -- The linter is one of the checks.
```

## A failure the status hides

A script is often run by another program: a scheduled job, a hook before each commit (module 1.8), a build server. Those can't read "7 of 8 passed". They read the exit status. Make a check fail on purpose and see what the status says. This tiny script always fails:

```
import sys

# A check that always fails, to see what a failure looks like.
print("broken on purpose")
sys.exit(1)
```

Save it as `check_broken.py`, run `run_checks.py` again, and then ask for its status: `$LASTEXITCODE` in PowerShell, `echo $?` in bash or zsh.

```predict
question: run_checks.py prints "FAIL check_broken.py (exit 1)" and "7 of 8 passed". What exit status does run_checks.py itself end with?
choice: 1, because a check failed
choice: 0
answer: 0
explain: The script noticed the failure and printed it, but nothing tells Python to exit with anything but 0: a program that reaches its end normally has status 0. To anything that only reads the status, a failing run looks like a passing one. It's the pipe problem from 01-06-02 again, inside a single program.
```

It prints `FAIL check_broken.py (exit 1)` and `7 of 8 passed`, and the status is `0`. Fix it: at the end, `sys.exit(1)` if anything failed.

```python file=kit/run_checks.py
import glob
import subprocess
import sys

# Every check Kit has: each check_*.py script, then the linter. This file is
# called run_checks.py, not check_all.py, so that it isn't one of the scripts
# it runs: a check_*.py that ran every check_*.py would start itself forever.
COMMANDS = [[sys.executable, name] for name in sorted(glob.glob("check_*.py"))]
COMMANDS.append([sys.executable, "-m", "ruff", "check", "."])


# Run each command, report it, and exit with status 1 if any failed, so that
# a person, or another script, can tell from the status alone.
def main():
    failed = []
    for command in COMMANDS:
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        name = " ".join(command[1:])
        if result.returncode == 0:
            print("pass", name)
        else:
            print("FAIL", name, "(exit " + str(result.returncode) + ")")
            failed.append(name)
    print(len(COMMANDS) - len(failed), "of", len(COMMANDS), "passed")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
```

Save it and run it again with `check_broken.py` still there: `7 of 8 passed`, and now the status is `1`. Delete `check_broken.py` (`rm check_broken.py`), run it once more: `7 of 7 passed`, status `0`. A script's exit status is part of its output, and the most important part to anything that runs it.

```check
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; open('check_broken.py', 'w').write('import sys; sys.exit(1)'); r = subprocess.run([sys.executable, 'run_checks.py'], capture_output=True, text=True); import os; os.remove('check_broken.py'); print('exit', r.returncode, 'FAIL check_broken.py' in r.stdout)\"" stdout="exit 1 True" -- With a failing check, run_checks.py should report it and exit with status 1.
run "cd kit; .venv/Scripts/python run_checks.py" stdout="7 of 7 passed" -- With every check passing, it should exit with status 0.
```

## Commands that can't be undone

Some commands destroy things, and a terminal doesn't ask "are you sure?":

| Command | What it destroys |
|---|---|
| `rm -rf FOLDER` (Unix), `Remove-Item -Recurse -Force FOLDER` (PowerShell) | A folder and everything in it, with no bin |
| `> file` | The file's old contents, replaced before the program even starts |
| `git reset --hard`, `git clean -fdx` (module 1.8) | Uncommitted changes, and files Git doesn't track |
| `mv a b`, `cp a b` | Whatever `b` was, if it already existed |
| `chmod -R`, `icacls … /T` | Permissions on a whole tree, which can lock you out |
| Formatting a disk, `dd` to a device | Everything on it |

Three habits make them safe.

**Look before you leap: a dry run.** PowerShell's commands that change things take `-WhatIf`, which says what would happen and does nothing: `Remove-Item notes -Recurse -WhatIf` prints `What if: Performing the operation "Remove Directory" on target "…\kit\notes".` Many tools have one: `git clean -n`, `rsync --dry-run`. Without one, list first (`ls notes`), then delete what you listed.

**Mind empty variables.** In a script, `rm -rf "$DIR/"` deletes the folder named in `DIR`. If `DIR` is empty, because of a typo or a step that failed, the command becomes `rm -rf /`: everything the user may delete. See it safely, with `echo` instead of `rm`: in bash, `DIR=""; echo rm -rf "$DIR/"` prints `rm -rf /`. PowerShell does the same with `$dir = ""; Write-Output "Remove-Item -Recurse $dir\*"`, which prints `Remove-Item -Recurse \*`: the whole current drive. That's why bash scripts start with `set -u`, which makes an unset variable an error (`UNSET_DIR: unbound variable`) instead of an empty string, and why a script should check a path before deleting under it.

**Stop on the first error.** A script that carries on after a failed step does its later steps on the wrong assumptions: it cleans up a folder that was never created, or deletes the original after a copy that failed. `set -euo pipefail` at the top of a bash script stops on any error, unset variable, or failure inside a pipe (01-06-02). PowerShell's `$ErrorActionPreference = "Stop"` stops on PowerShell errors, though not on a native program's exit status, which you check with `$LASTEXITCODE`.

```check
run "cd kit; .venv/Scripts/python -c \"import os; folder = ''; print(repr(os.path.join(folder, 'data')), repr(os.path.abspath(os.path.join(folder, '.'))) == repr(os.getcwd()))\"" stdout="'data' True" -- In Python too, an empty folder name silently means "here": check a path before acting on it.
```

## Back up first

Before an operation you can't undo, make it undoable: copy what it touches. For a folder, the copy can be beside it. Back up `notes` before you change it:

```
cp -r notes notes-backup
```

That works in both shells (PowerShell's `cp` is `Copy-Item`, and `-r` is short for its `-Recurse`). Check it worked before relying on it: `ls notes-backup` lists the same files. Now a mistake in `notes` costs a copy back, not the files. For code, the better backup is a **commit**: module 1.8's Git records every version, so any change can be undone. For whole computers, backups are automatic, kept somewhere else, and *tested*: a backup nobody has ever restored from is a hope, not a backup.

```check
file kit/notes-backup/hello.txt -- Copy notes to notes-backup, and check the copy has the files.
```

## The least access you need

A command can only destroy what its user is allowed to change. So work with as little access as the job needs:

- **Don't work as an administrator.** On Windows, don't open your terminal "as administrator" for everyday work; on macOS and Linux, don't put `sudo` in front of commands to make an error go away. `sudo pip install …` installs into the system's Python, the opposite of 01-06-05's environments. If a command really needs more access, find out why, run that one command with it, and stop.
- **Give tools narrow keys.** An access token for a service (a code host, a cloud account, an AI agent's tools) should allow what that tool needs and nothing else: read-only if it only reads, one project rather than all of them, an expiry date.
- **Keep secrets out of code and out of shared folders.** A password or token in a file gets copied, committed and shared along with the file. Module 1.8 covers removing one that's been committed; module 1.12 covers what to give an AI agent.

**Scripts from the internet.** Many tools tell you to install them with one line that downloads a script and runs it at once: `curl -fsSL https://example.com/install.sh | sh`, or in PowerShell `iwr https://example.com/install.ps1 | iex`. That runs whatever the server sends, with all your access, unread. If the site is compromised, or you mistype the address, or the download stops halfway through a line, you run that instead. Safer: download the script to a file, read it, and check that it's the file its authors published. Projects publish a **checksum**: a hash of the file (01-01-01's bytes, condensed into a fingerprint), which changes completely if a single byte changes. Compute the file's own:

| Shell | Command |
|---|---|
| PowerShell | `Get-FileHash samples/hello.txt` (SHA-256 by default, in capitals) |
| macOS, Linux | `shasum -a 256 samples/hello.txt` or `sha256sum samples/hello.txt` |
| Python, anywhere | `.venv/bin/python -c "import hashlib; print(hashlib.sha256(open('samples/hello.txt', 'rb').read()).hexdigest())"` |

All three give `b95becd154aa095f76c4ca47a5aeb8350d6dfcb838404edfc9dae06628de938d` for `samples/hello.txt` (PowerShell in capitals). Compare the result with the published one, all of it. A checksum proves the file is the one the publisher hashed; it can't prove the publisher is honest, which is why the source matters too.

```check
run "cd kit; .venv/Scripts/python -c \"import hashlib; print(hashlib.sha256(open('samples/hello.txt', 'rb').read()).hexdigest())\"" stdout="b95becd154aa095f76c4ca47a5aeb8350d6dfcb838404edfc9dae06628de938d" -- The SHA-256 checksum of hello.txt's seven bytes.
run "cd kit; .venv/Scripts/python -c \"import hashlib; print(hashlib.sha256(open('samples/latin1.txt', 'rb').read()).hexdigest()[:12])\"" without="b95becd154aa" -- latin1.txt holds the same word in another encoding, and its checksum is completely different.
```

## SSH

Sooner or later you'll run commands on a computer you can't sit at: a server, a cloud machine, a Raspberry Pi. **SSH**, the Secure Shell, gives you a terminal on it over the network, encrypted: `ssh user@host` connects, and from then on, everything you type runs there. `scp` and `sftp` copy files over the same connection, and Git uses SSH to talk to code hosts. The client comes with macOS, Linux and Windows 10 or later, and with Git for Windows. `ssh -V` prints its version: `OpenSSH_9.7p1, OpenSSL 3.2.1 30 Jan 2024` on one machine.

Instead of typing a password every time, SSH uses a **key pair**: two files made together. The **private key** stays on your computer and is never sent anywhere. The **public key** (the `.pub` file) goes to every server you want to log in to. A server holding your public key can check that you hold the private one, without the private key ever crossing the network. Make a demonstration pair in `notes`. Use a throwaway file name, never your real `~/.ssh` keys, which other programs depend on:

```
ssh-keygen -t ed25519 -f notes/demo_key -C "course demo key"
```

It asks for a passphrase twice. For this demonstration only, press Enter both times for none; a real key's passphrase protects it if your computer is stolen. (On the command line, `-N ""` sets an empty passphrase without asking, but Windows PowerShell 5.1 drops empty arguments before the program sees them, and `ssh-keygen` then fails with `Too many arguments`. Answering the prompt works in every shell.) It prints the key's fingerprint and a small picture made from it, and writes `notes/demo_key` and `notes/demo_key.pub`. Look at the public one, `cat notes/demo_key.pub`: one line starting `ssh-ed25519`, then the key, then your comment. That line is what you'd paste into a server's `authorized_keys` file, or a code host's settings.

The first time you connect to a server, SSH shows the server's own key fingerprint and asks whether to trust it. It's asking whether this is really the machine you meant, rather than someone in between pretending to be it. The right answer comes from checking the fingerprint against one the server's owner gave you some other way; typing `yes` without looking defeats the point. After that, SSH remembers the server (in `~/.ssh/known_hosts`) and warns loudly if its key ever changes.

When you've looked at them and this step's check has passed, delete the demo keys: `rm notes/demo_key notes/demo_key.pub`. A private key in a project folder is one copy or commit away from being public. (No SSH server is used in this course, so the connection itself is described, not run.)

```check
contains kit/notes/demo_key.pub "ssh-ed25519" -- Make the demo key pair with ssh-keygen in notes; delete it once this check has passed.
```

**What else, and why not.** Ways to run a series of commands, and what each costs:

| Way | Cost |
|---|---|
| A Python script, as `run_checks.py` | Runs the same on every system, with real error handling; needs Python, and is wordier than a shell for simple sequences |
| A PowerShell script (`.ps1`) | Native on Windows; blocked by the default execution policy on many machines ("running scripts is disabled on this system"), needing `-ExecutionPolicy Bypass -File` or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| A bash script (`.sh`) | The common language of servers and of macOS and Linux tutorials; needs `bash` (Git Bash on Windows), and its quoting rules catch everyone |
| A task runner (`make`, `just`, npm scripts) | Names each task, and runs only what changed; one more tool and file format (module 5.1 uses `make`) |

## Your turn: the same script in your shell

Write `run_checks.py`'s job as a shell script for the shell you use: `run_checks.ps1` if you're on Windows, `run_checks.sh` (bash) on macOS or Linux. It runs every `check_*.py` and then `ruff check .`, prints `pass NAME` or `FAIL NAME` for each, prints how many failed, and exits with status 1 if any did, 0 if none did. Run it with `powershell -ExecutionPolicy Bypass -File run_checks.ps1`, or `bash run_checks.sh`.

There's no file to compare with; the checks run your script, once as it is and once with a failing check added.

```hints
nudge: You already have the loop from 01-06-04's table. What does the script need to remember from one check to the next, and what's the last thing it must do?
concept: A counter that starts at 0 and goes up by one for each failure; a check of each program's exit status straight after it runs ($LASTEXITCODE in PowerShell; in bash, if command; then … else … fi tests the status directly); and at the end, exit 1 if the counter is above 0. Discard each check's own output (| Out-Null, or > /dev/null) so that only the pass and FAIL lines show.
shape: PowerShell: $failed = 0; foreach ($check in Get-ChildItem check_*.py | Sort-Object Name) { .venv\Scripts\python $check.Name | Out-Null; if ($LASTEXITCODE -eq 0) { "pass " + $check.Name } else { "FAIL " + $check.Name; $failed = $failed + 1 } }, the same for ruff, "$failed failed", if ($failed -gt 0) { exit 1 }. bash: failed=0; for check in check_*.py; do if .venv/bin/python "$check" > /dev/null; then echo "pass $check"; else echo "FAIL $check"; failed=$((failed + 1)); fi; done, the same for ruff, echo "$failed failed", [ "$failed" -gt 0 ] && exit 1.
answer: run_checks.ps1:
~~~powershell
# Run every check Kit has, then the linter. Exit with status 1 if any failed.
$failed = 0
foreach ($check in Get-ChildItem check_*.py | Sort-Object Name) {
    .venv\Scripts\python $check.Name | Out-Null
    if ($LASTEXITCODE -eq 0) {
        "pass " + $check.Name
    } else {
        "FAIL " + $check.Name
        $failed = $failed + 1
    }
}
.venv\Scripts\ruff check . | Out-Null
if ($LASTEXITCODE -eq 0) {
    "pass ruff check ."
} else {
    "FAIL ruff check ."
    $failed = $failed + 1
}
"$failed failed"
if ($failed -gt 0) {
    exit 1
}
~~~
run_checks.sh:
~~~bash
#!/usr/bin/env bash
# Run every check Kit has, then the linter. Exit with status 1 if any failed.
failed=0
for check in check_*.py; do
    if .venv/bin/python "$check" > /dev/null; then
        echo "pass $check"
    else
        echo "FAIL $check"
        failed=$((failed + 1))
    fi
done
if .venv/bin/ruff check . > /dev/null; then
    echo "pass ruff check ."
else
    echo "FAIL ruff check ."
    failed=$((failed + 1))
fi
echo "$failed failed"
if [ "$failed" -gt 0 ]; then
    exit 1
fi
~~~
The tempting slip is the one this lesson started with: printing FAIL but never exiting with 1, so the script always reports success. In PowerShell, another is testing $? instead of $LASTEXITCODE: after a native program, $? is only whether PowerShell thought it succeeded, which isn't always the same. In bash, set -e would stop the script at the first failing check instead of counting them all, which is why the if form is used here.
```

```check
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; cmd = ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'run_checks.ps1'] if os.name == 'nt' else ['bash', 'run_checks.sh']; r = subprocess.run(cmd, capture_output=True, text=True); print('exit', r.returncode, 'passes', r.stdout.count('pass '))\"" stdout="exit 0 passes 7" -- Your script should run all seven checks, report each as pass, and exit with 0.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; open('check_broken.py', 'w').write('import sys; sys.exit(1)'); cmd = ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'run_checks.ps1'] if os.name == 'nt' else ['bash', 'run_checks.sh']; r = subprocess.run(cmd, capture_output=True, text=True); os.remove('check_broken.py'); print('exit', r.returncode, 'FAIL check_broken.py' in r.stdout)\"" stdout="exit 1 True" -- With a failing check, it should report FAIL and exit with 1.
```

**What these checks establish, and what they don't.** They run your script for your system's shell, once with everything passing and once with a failing check added (and removed again), and read its output and its status. They don't run the other shell's version, so if you wrote both, run the other one yourself, in Git Bash or PowerShell. They don't check that your script stops on errors in its own steps, or what it does if `.venv` is missing (try renaming it for a moment, and decide what the script ought to say). And none of this lesson's safety habits can be checked by a program: they're habits.

## What you can do now

- A **script** is commands in a file: the same every time, for anyone. Its **exit status** is its most important output: exit 1 when anything failed.
- A script that runs files by a pattern must not match its own name.
- **Destructive commands** (`rm -rf`, `Remove-Item -Recurse -Force`, `>`, `git reset --hard`) don't ask. Use a **dry run** (`-WhatIf`, `-n`), guard against empty variables (`set -u`), stop on errors (`set -euo pipefail`), and **back up first**: a copy, a commit, a tested backup.
- Work with the **least access** you need: no administrator terminal, no `sudo` to silence errors, narrow tokens, secrets out of code. Don't pipe a downloaded script into a shell; download it, read it, and compare its **checksum**.
- **SSH** gives you a terminal on another computer. Its **key pair** has a private half that never leaves you and a public half you give to servers; check a new server's fingerprint before you say yes.

```predict
question: A deployment script runs: cd $BUILD_DIR; rm -rf *. One day the build step that sets BUILD_DIR fails silently. What happens, and what two lines would have prevented it?
explain: With BUILD_DIR empty, cd with no argument goes to the home folder (in bash), and rm -rf * deletes everything in it. Prevent it with set -euo pipefail at the top, so the failed build step stops the script and an unset variable is an error, and by checking the cd itself: cd "$BUILD_DIR" || exit 1 (with quotes, so an empty value is an error, not "no argument"). Better still, delete a named path inside a known parent ("$BUILD_DIR/output"), after checking BUILD_DIR isn't empty.
```

**Next:** module 1.7 is about reading what other people have written about code: documentation, references, standards and sources. 01-07-01 starts with documentation: guides against references, changelogs, and making sure the page you're reading describes the version you have.
