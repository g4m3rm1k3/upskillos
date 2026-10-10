---
title: 0.4 — Running Programs: Output, Errors and Exit Codes
runtime: none
---

You'll run thousands of programs from the terminal over this series: your own code, tests, build tools, servers. This lesson is about what happens when you do: what a program gives back besides its printed output, how to read it when it fails, and how to stop one that doesn't end.

You'll write the same small program in Python and in JavaScript, side by side.

## hello.py

This step opens a new file, `hello.py`. Type:

```python file=hello.py
name = "spreadsheet"
print("Hello from Python, building a", name)
```

Then run it in the terminal:

```powershell
python hello.py
```

```text
PS C:\Users\you\Documents\spreadsheet> python hello.py
Hello from Python, building a spreadsheet
```

Nothing new yet. That's the point: the next file does the same in JavaScript.

```check
run "python hello.py" stdout="Hello from Python, building a spreadsheet" os=windows -- Type the code into hello.py, then check again.
run "python3 hello.py" stdout="Hello from Python, building a spreadsheet" os=mac -- Type the code into hello.py, then check again.
run "python3 hello.py" stdout="Hello from Python, building a spreadsheet" os=linux -- Type the code into hello.py, then check again.
```

## hello.js

This step opens `hello.js`. Type:

```javascript file=hello.js
const name = "spreadsheet";
console.log("Hello from Node, building a", name);
```

### Line by line, next to Python

- **`const name = "spreadsheet";`** creates a variable. In Python you'd write `name = "spreadsheet"`. JavaScript wants a keyword in front the first time a variable appears: `const` means this variable will never be given a different value. (Sprint 3 shows `let`, for variables that change.)
- **`console.log(...)`** is JavaScript's `print(...)`. Like `print`, it puts a space between the values you give it.
- **`;`** ends a statement. Python uses the end of the line. JavaScript can usually work out where statements end without them, but the rules for when it can't are tricky, so this series always writes them.

Run it:

```powershell
node hello.js
```

```text
PS C:\Users\you\Documents\spreadsheet> node hello.js
Hello from Node, building a spreadsheet
```

`python` runs Python files, `node` runs JavaScript files. The pattern is the same: the program's name, then the file to give it.

```check
run "node hello.js" stdout="Hello from Node, building a spreadsheet" -- Type the code into hello.js, then check again.
```

## Exit codes

When a program ends, it hands the shell one more thing besides its output: a number called its **exit code**. `0` means "it worked". Anything else means something went wrong. PowerShell keeps the last one in `$LASTEXITCODE`:

```powershell
node hello.js
$LASTEXITCODE
```

```text
PS C:\Users\you\Documents\spreadsheet> $LASTEXITCODE
0
```

(On macOS: `echo $?`.)

You never see the exit code unless you ask, but other programs read it all the time. Later in this series, a robot will run your tests every time you push your code, and it will decide "passed" or "failed" from nothing but the test program's exit code.

## When a program fails

This step opens `broken.py`. Type it exactly, mistake included:

```python file=broken.py
print("starting")
print(1 / 0)
print("never printed")
```

Before running it, predict:

```predict
question: What exit code will `python broken.py` end with?
answer: 1
explain: Any uncaught error ends a Python program with exit code 1. The `starting` line has already been printed by then, so output and failure can both happen in one run: the exit code, not the output, says whether it worked.
verify: node -e "console.log(require('child_process').spawnSync('python', ['broken.py']).status)"
```

Run it, then ask for the exit code:

```powershell
python broken.py
$LASTEXITCODE
```

```text
PS C:\Users\you\Documents\spreadsheet> python broken.py
starting
Traceback (most recent call last):
  File "C:\Users\you\Documents\spreadsheet\broken.py", line 2, in <module>
    print(1 / 0)
          ~~^~~
ZeroDivisionError: division by zero
PS C:\Users\you\Documents\spreadsheet> $LASTEXITCODE
1
```

You've probably seen a traceback like this. Read it from the **bottom**: the last line says what went wrong (`ZeroDivisionError`). The lines above it say where: the file, line 2, and the code on that line, with `~~^~~` pointing at the exact operation. The program stopped there, so `never printed` never was, and the exit code is `1`.

```check
file broken.py
run "python broken.py" exit=1 stderr="ZeroDivisionError" os=windows label="broken.py fails with ZeroDivisionError"
run "python3 broken.py" exit=1 stderr="ZeroDivisionError" os=mac label="broken.py fails with ZeroDivisionError"
run "python3 broken.py" exit=1 stderr="ZeroDivisionError" os=linux label="broken.py fails with ZeroDivisionError"
```

## The same failure in JavaScript

This step opens `broken.js`. It uses a variable that doesn't exist:

```javascript file=broken.js
console.log("starting");
console.log(missingName);
console.log("never printed");
```

```powershell
node broken.js
$LASTEXITCODE
```

```text
PS C:\Users\you\Documents\spreadsheet> node broken.js
starting
C:\Users\you\Documents\spreadsheet\broken.js:2
console.log(missingName);
            ^

ReferenceError: missingName is not defined
    at Object.<anonymous> (C:\Users\you\Documents\spreadsheet\broken.js:2:13)
    at Module._compile (node:internal/modules/cjs/loader:1761:14)
    at Object..js (node:internal/modules/cjs/loader:1893:10)
    at Module.load (node:internal/modules/cjs/loader:1481:32)
    at Module._load (node:internal/modules/cjs/loader:1300:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47

Node.js v24.12.0
PS C:\Users\you\Documents\spreadsheet> $LASTEXITCODE
1
```

Node prints the same information in a different order. **Read from the top** this time:

1. `broken.js:2`: the file and line.
2. The line itself, with `^` under the problem.
3. `ReferenceError: missingName is not defined`: what went wrong. In Python this would be a `NameError`.
4. The `at ...` lines are the **stack trace**: which function was running, and which function called that one, and so on. The first `at` line is your file again, `broken.js:2:13` (line 2, column 13). Every line after it starts with `node:internal`: that's Node's own machinery that loaded and ran your file. You can skip those.

The habit that matters: find the line that names **your** file, and look there first.

```check
file broken.js
run "node broken.js" exit=1 stderr="ReferenceError: missingName is not defined" label="broken.js fails with a ReferenceError"
```

## Stopping a program that doesn't end

Some programs run until you stop them: a server waits for visitors forever. This step opens `ticker.js`, which prints once a second and never finishes:

```javascript file=ticker.js
let seconds = 0;
setInterval(() => {
  seconds = seconds + 1;
  console.log("still running:", seconds, "seconds");
}, 1000);
```

You'll learn every part of that in sprint 3. For now: `setInterval` asks Node to call a function every 1000 milliseconds, forever.

Run it, watch a few lines appear, then press **Ctrl+C**:

```powershell
node ticker.js
```

```text
PS C:\Users\you\Documents\spreadsheet> node ticker.js
still running: 1 seconds
still running: 2 seconds
still running: 3 seconds
PS C:\Users\you\Documents\spreadsheet> $LASTEXITCODE
-1073741510
```

**Ctrl+C** in a terminal means "stop the program that's running", not "copy". (To copy text from the terminal, select it with the mouse first.) The prompt comes back, and the strange exit code is Windows' code for "stopped by Ctrl+C". It isn't 0, because the program didn't finish its work.

While a program runs, the shell is busy and there's no prompt. If you ever type a command and nothing happens, check whether the last program is still running.

```check
file ticker.js
```

## Your turn: choose your own exit code

Write a program `exit-code.js` that prints `checking the spreadsheet...` and then ends with exit code **3**.

You need one thing you haven't seen: `process.exit(3)` ends a Node program immediately with exit code 3. (In Python it's `sys.exit(3)`.)

Run it, and confirm with `$LASTEXITCODE` that the shell got 3.

```check
file exit-code.js -- Create a file named exit-code.js (use the + button above the file tree).
run "node exit-code.js" exit=3 stdout="checking the spreadsheet..." label="`node exit-code.js` prints the message and exits with code 3"
```

```hints
nudge: Two lines: one from `hello.js`, one from the sentence above.
concept: `process.exit` ends the program **immediately**: nothing after it runs. So the order of the two lines matters.
shape: Print first, then exit.
answer: ~~~javascript
console.log("checking the spreadsheet...");
process.exit(3);
~~~
```

## Clean up

Delete the two broken files and the ticker; they were only for this lesson. Keep `hello.py`, `hello.js`, `greet.py` and `exit-code.js`: the next lesson puts them into Git.

```powershell
Remove-Item broken.py, broken.js, ticker.js
```

`Remove-Item` accepts several names, separated by commas. (On macOS: `rm broken.py broken.js ticker.js`.)

```check
missing broken.py
missing broken.js
missing ticker.js
file hello.js -- Keep hello.js: the next lesson uses it.
```
