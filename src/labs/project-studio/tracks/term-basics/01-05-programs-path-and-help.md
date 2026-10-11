---
title: 1.5 — Programs, PATH, Variables and Help
runtime: none
---

Every command so far, `ls`, `mkdir`, `cp`, has been a program stored somewhere on your disk. This lesson shows where, how the shell finds them, and how to ask any of them for help. Then you check that **Node**, the program that will run Shelf's server, is installed, and use it to confirm that your JSON file is valid. You also learn how to stop a program that won't end and how a program reports success or failure.

## Where commands live: which

```zsh
which ls
which mkdir
which cd
```

- **`which name`** prints the full path of the program the shell would run for `name`: `/bin/ls`, `/bin/mkdir`.
- So `ls` is just a short way to run the program `/bin/ls`; typing `/bin/ls` works too.
- **`cd`** is different: `which` says it's a **shell built-in**, a command handled by zsh itself. It has to be: a separate program can't change the shell's own working directory.

How does the shell know to look in `/bin`? It searches a list of folders stored in a **variable** called `PATH`:

```zsh
echo $PATH
```

- **A variable** is a name the shell stores a value under. **`$NAME`** is replaced by the value before the command runs; here `echo` receives the value of `PATH`.
- **`PATH`** is a list of folders separated by `:` (colons), such as `/usr/local/bin:/usr/bin:/bin:…`.
- When you type a command name, the shell looks for a program of that name in each `PATH` folder **in order** and runs the first one it finds. If no folder has it: `zsh: command not found`.
- This is why installing a program sometimes needs a new terminal: the installer adds a folder to `PATH` in a settings file that only new shells read.

## Is Node installed?

**Node** (Node.js) runs JavaScript programs outside a web browser. Shelf's backend is a JavaScript program, so it needs Node.

```zsh
which node
node --version
```

- If `which node` prints a path and `node --version` prints something like `v22.14.0`, Node is installed. The number is **major.minor.patch**; Shelf needs a major version of **18 or higher** (it uses `fetch` and the built-in test runner, both added by then).
- **`--version`** is a flag in the long style: two dashes and a whole word. Most programs accept `--version`.

**If you see `node not found`**, install it:

- **On a Mac:** go to [nodejs.org](https://nodejs.org), download the **LTS** (*long-term support*) installer, and run it. If you use Homebrew, `brew install node` works too.
- **On Linux:** use your distribution's package manager, or the instructions on nodejs.org.
- Then click **Restart** above the terminal. A new shell reads the updated `PATH`, and `node --version` works.

```check
run "node --version" stdout="v" label="node runs" -- Install Node LTS from nodejs.org, then press Restart above the terminal and try node --version again.
run "node -e \"process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)\"" label="Node is version 18 or newer" -- Shelf needs Node 18 or newer. Install the current LTS from nodejs.org.
```

## Ask Node whether the JSON is valid

The checks in 1.3 compared the text of `data/bookmarks.json`. A program reads it differently: it **parses** the text, and rejects it if a single quote or bracket is out of place. Node can do that in one line:

```zsh
node -e "JSON.parse(require('fs').readFileSync('data/bookmarks.json', 'utf8')); console.log('valid JSON')"
```

- **`node -e "…"`** (*evaluate*) runs the JavaScript in the quotes instead of a file. The whole program is in double quotes, so it's one argument; inside, JavaScript uses single quotes for its own text.
- **`require('fs')`** loads Node's built-in **file system** module, a collection of functions for files.
- **`.readFileSync('data/bookmarks.json', 'utf8')`** reads the whole file and returns its text. `'utf8'` names the **text encoding**, the rule for turning the file's bytes into characters. *Sync* means the program waits until the file has been read.
- **`JSON.parse(text)`** turns JSON text into JavaScript values: here, an array holding one object. If the text isn't valid JSON, it **throws an error**, which stops the program with a message.
- **`;`** separates two JavaScript statements. **`console.log('valid JSON')`** prints the text; it only runs if parsing succeeded.

If it prints `valid JSON`, your file is correct. If it prints a `SyntaxError`, read the message: it names the position of the first character it couldn't make sense of. Fix the file by re-running your 1.3 command.

```check
run "node -e \"JSON.parse(require('fs').readFileSync('data/bookmarks.json', 'utf8'))\"" label="data/bookmarks.json is valid JSON" -- Recreate it with echo and the JSON in single quotes, as in 1.3.
```

## Variables you set yourself

```zsh
GREETING="Hello from the shell"
echo $GREETING
node -e "console.log(process.env.GREETING)"
```

- **`NAME=value`**, with **no spaces around `=`**, sets a shell variable. (`GREETING = …` would run a command called `GREETING`.)
- `echo $GREETING` prints it.
- But Node prints **`undefined`**. **`process.env`** is how a Node program reads its **environment variables**, the variables a program inherits from the shell that started it. A plain shell variable isn't passed on to programs.

Two ways to pass it on:

```zsh
GREETING="Hello, Node" node -e "console.log(process.env.GREETING)"
export GREETING
node -e "console.log(process.env.GREETING)"
```

- **`NAME=value command`** on one line sets the variable **for that one command only**.
- **`export NAME`** marks a shell variable to be passed to every program this shell starts from now on.
- Servers commonly use this to choose their port: `PORT=4000 npm start` starts a server on port 4000 without changing its code.

**`$(command)`**, *command substitution*, goes further: the shell runs the command and puts its output in its place:

```zsh
echo "Today is $(date +%A)"
```

- **`date +%A`** prints the weekday's name; `$(…)` drops it into the sentence before `echo` runs.

## Getting help: man and --help

```zsh
man ls
```

- **`man`** shows a command's **manual page** in `less` (so Space, `/word`, `n` and `q` work as in 1.3). Search for `-a` with `/-a` and Enter to find what the flag means.
- Programs that aren't part of the system often skip `man` pages and print help with **`--help`**: try `node --help | head -n 20`. (The `|` sends one command's output into the next; here, only the first 20 lines show. Pipes get a whole chapter next.)
- The macOS `ls` doesn't understand `--help`. It prints `ls: unrecognized option '--help'` and a one-line usage summary. When one way doesn't work, try the other.

## Stop a program, and read its exit code

Some programs run until you stop them, and a server is one of them. Practise stopping one:

```zsh
node -e "setInterval(() => console.log('tick'), 500)"
```

- **`setInterval(fn, 500)`** calls the function `fn` every 500 milliseconds. **`() => console.log('tick')`** is a small function written in JavaScript's arrow style: it takes no arguments and prints `tick`.
- The program never ends by itself, and the prompt doesn't come back.
- Press **Ctrl+C**. The shell sends the program an **interrupt signal**, a request to stop, and Node stops. You get the prompt back.

Every program, when it ends, hands the shell a number called its **exit code** (or *exit status*): **0 means success**, anything else means a failure. **`$?`** holds the exit code of the last command:

```zsh
ls README.md
echo $?
```

```predict
question: You run `ls no-such-file`, which prints an error. What does `echo $?` print right afterwards?
choice: 0
choice: A number other than 0
answer: A number other than 0
explain: ls couldn't list the file, so it ends with a failure exit code. On a Mac it's 1, on Linux 2. Only 0 means success, and that's the convention scripts and checks rely on.
verify: ls no-such-file 2>/dev/null; if [ $? -ne 0 ]; then echo "A number other than 0"; else echo 0; fi
```

```zsh
ls no-such-file
echo $?
```

- Every **Check my work** button in this series uses exit codes: a `run` check passes when the command exits with 0.
- A program stopped with Ctrl+C typically exits with 130. You'll see that number again when you stop Shelf's server.

## Your turn: record the Node version in the README

A README often says which version of each tool a project was built with, so the next person can match it.

**Build, on your own:** append one line to `README.md` that reads `Built with Node` followed by a space and your Node version, for example `Built with Node v22.14.0`. Don't type the version number yourself: have the shell put the real one in. Then print the README to see it.

```hints
nudge: You've seen a way to put a command's output inside a sentence, and a way to add a line to the end of a file.
concept: `$(command)` is replaced by the command's output, and it works inside double quotes. `>>` appends; `>` would wipe the README.
shape: `echo "Built with Node $(…)" >> README.md`, with the command that prints Node's version inside the parentheses.
```

```check
run "grep -qx \"Built with Node $(node --version)\" README.md" label="README.md has the line Built with Node and your exact version" -- Append it with echo "Built with Node $(node --version)" >> README.md
contains README.md "# Shelf" label="the heading is still there" -- Use >> to append. A single > replaced the whole README; rebuild it with the commands from 1.3, then append this line.
run "test $(grep -c 'Built with Node' README.md) -eq 1" label="the line appears once" -- You appended it more than once. Rebuild the README from 1.3's commands and append this line once.
```

The checks establish that the line matches the Node you have: they run `node --version` themselves and compare it with your line, so a version typed by hand would pass only until Node is updated. The command substitution keeps the line correct.

### What you have

```text
shelf/
  README.md            heading, description, Node version
  data/bookmarks.json  one bookmark, valid JSON
  practice/
  public/  app.js  index.html  style.css      (empty)
  server/  routes.js  server.js  store.js     (empty)
  test/fixtures/bookmarks.json
```

That's the terminal you need to get started. Next chapter: **pipes and text tools**: chaining commands with `|`, and searching, sorting and counting text with `grep`, `sort`, `uniq`, `cut` and `find`.
