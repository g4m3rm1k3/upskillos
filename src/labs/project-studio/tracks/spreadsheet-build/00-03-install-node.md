---
title: 0.3 — Install Node.js
runtime: none
experiments: A number that surprises everyone; Your turn: experiment in the REPL
teaches: node, npm, repl, floating point
uses: path variable
---

### The story so far

The project folder exists, with a `playground` inside it (0.1). Lesson 0.2 showed how the shell finds a program when you type its name: it looks through the folders listed in the **PATH** environment variable, in order, and runs the first match. Installing a tool means putting it in a folder and adding that folder to PATH. And a terminal that started *before* the install still has the old PATH, so it can't find the new tool until it's restarted.

### What this lesson builds

Node.js, installed and found by the shell, and your first lines of JavaScript, typed into Node's interactive prompt:

```text
> 1 + 2
3
> 7 / 2
3.5
> 0.1 + 0.2
0.30000000000000004
```

The spreadsheet will run in a web browser, and browsers run one programming language: **JavaScript**. You'll learn JavaScript from Python starting in sprint 3. Before that, you need a way to run JavaScript outside a browser, the way `python` runs Python files. That program is **Node.js** (usually just called Node).

Node also brings **npm**, which installs JavaScript libraries the way `pip` installs Python ones. The spreadsheet's build tools and test tools all come through npm.

## Is Node already installed?

Ask for its version:

```powershell
node --version
```

If Node is installed, you get a version number, like `v24.12.0`. Skip to the step **Check both programs**.

If it isn't, you get the error from lesson 0.1, now with `node` in it: *The term 'node' is not recognized…* You know what that means now: no folder on your PATH holds a `node.exe`. Installing Node fixes that.

## Install Node

1. Open **https://nodejs.org** in your web browser.
2. Download the version marked **LTS**. LTS means "long-term support": the version that gets fixes for the longest, which is what you want for real work. The other choice is the newest version, which is for trying new features.
3. Run the installer (a `.msi` file on Windows, `.pkg` on macOS) and accept the defaults. If the Windows installer offers to install "Tools for Native Modules", leave that box unchecked: this series doesn't need them.

The installer copies `node.exe` into a folder (on Windows, usually `C:\Program Files\nodejs`) and adds that folder to PATH.

## Check both programs

The terminal below started before Node was installed, so its PATH is out of date (lesson 0.2 explained why). Press **Restart** above the terminal to get a new one, then type:

```powershell
node --version
npm --version
```

```text
PS C:\Users\you\Documents\spreadsheet> node --version
v24.12.0
PS C:\Users\you\Documents\spreadsheet> npm --version
11.6.2
```

Your numbers may be newer. Any version 24 or higher works for this series.

`node --version` printing a number means the shell found Node. It's the same test you did for Python with `python --version`.

(If you use another editor's terminal, such as VS Code's, it has the same out-of-date PATH. Close the editor completely and open it again.)

```check
run "node --version" stdout="v" label="`node --version` prints a version" -- Install Node from nodejs.org, then press Restart above the terminal.
run "npm --version" label="`npm --version` works"
```

## Node's interactive prompt

Python has an interactive prompt (`>>>`) where you type a line and see the answer immediately. Node has one too. Type `node` on its own:

```powershell
node
```

The prompt changes to `>`. Type each of these lines and press Enter after each:

```text
PS C:\Users\you\Documents\spreadsheet> node
Welcome to Node.js v24.12.0.
Type ".help" for more information.
> 1 + 2
3
> "spread" + "sheet"
'spreadsheet'
> 7 / 2
3.5
> Math.floor(7 / 2)
3
> .exit
PS C:\Users\you\Documents\spreadsheet>
```

That's JavaScript, and it looks a lot like Python: `+` adds numbers and joins strings. One difference already: JavaScript has no `//` operator for whole-number division, because in JavaScript `//` starts a comment. `Math.floor(7 / 2)` rounds down instead, giving `3` like Python's `7 // 2`.

`.exit` leaves Node's prompt and returns you to PowerShell; the `PS` prompt comes back. (Pressing **Ctrl+C** twice does the same.)

## A number that surprises everyone

Start `node` again. Before you type the next line, predict:

```predict
question: What does Node print for `0.1 + 0.2`?
choice: 0.3
choice: 0.30000000000000004
choice: An error
answer: 0.30000000000000004
explain: Computers store numbers like 0.1 in binary, and 0.1 has no exact binary form, just as 1/3 has no exact decimal form (0.333…). Each is stored as the nearest value that fits, and the tiny errors show when they're added. Python prints exactly the same thing: this is how almost every language stores decimals. It's why a spreadsheet, or any program that handles money, has to think about rounding.
verify: node -p "0.1 + 0.2"
```

Type `0.1 + 0.2`, then `.exit`.

**Where the extra digits come from.** You can ask Node to show more of each number than it normally prints: `(0.1).toFixed(20)` writes it with 20 digits after the point. Here is what's really stored:

| you typed | what's stored, to 20 places |
|---|---|
| `0.1` | 0.100000000000000005**55** |
| `0.2` | 0.200000000000000011**10** |
| `0.1 + 0.2` | 0.300000000000000044**41** |
| `0.3` | 0.299999999999999988**90** |

`0.1` is stored a tiny bit too big, and so is `0.2`. Added, the two errors add up, and the sum lands on a different stored number from the one `0.3` is stored as, slightly above it instead of slightly below. Node prints each number with just enough digits to tell it apart from every other stored number. For the stored `0.3`, that's `0.3`; for the sum, it takes all the digits of `0.30000000000000004`. Try `(0.1 + 0.2).toFixed(20)` yourself, and `0.1 + 0.2 === 0.3`, which is `false`.

## Your turn: experiment in the REPL

The REPL (the prompt you've been typing into: *read*, *evaluate*, *print*, *loop*) is for exactly this: trying something you've never seen and looking at what comes back.

Create `playground/node-answers.txt` in the editor. Ask Node for each of these three, and write what it prints on its own line of the file, in this order:

```text
2 ** 10
"5" * "2"
[1, 2] + [3]
```

You haven't been taught any of them. That's the point: find out by trying. The last two would be errors or different answers in Python. You'll learn why JavaScript answers the way it does in sprint 3.

```check
file playground/node-answers.txt -- Create node-answers.txt inside playground, in the editor.
matches playground/node-answers.txt "^1024$" label="line 1: what 2 ** 10 gives" -- Run 2 ** 10 in node and copy exactly what it prints.
matches playground/node-answers.txt "^10$" label="line 2: what \"5\" * \"2\" gives" -- Run "5" * "2" in node. Is the answer a string or a number?
matches playground/node-answers.txt "^'?1,23'?$" label="line 3: what [1, 2] + [3] gives" -- Run [1, 2] + [3] in node and copy what it prints. It isn't a list.
```

These checks know the answers, so all they prove is that you found them. What matters is that you saw each one happen.

```hints
nudge: Type `node`, then each line exactly as written, pressing Enter after each one. Copy what comes back.
concept: The REPL prints the value of whatever you type. `**` is the power operator, as in Python. For the other two, JavaScript converts the values into something it can use instead of stopping with an error.
shape: The file has three lines: a number, a number, then something with a comma in it.
answer: ~~~text
1024
10
'1,23'
~~~
```
