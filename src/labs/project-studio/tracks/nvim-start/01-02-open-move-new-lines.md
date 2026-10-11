---
title: 1.2 — Open Files, Move with h j k l, Open Lines with o and O
runtime: none
---

This lesson writes two settings files that every Node project like Shelf has. `.editorconfig` tells Neovim (and most other editors) how to indent. `package.json` tells Node and **npm** what the project is and how to start it. Along the way you learn to open any file from inside Neovim, to move without the arrow keys, and two of the most-used ways into Insert mode.

## Open or create a file by name: :e

In Neovim's Normal mode, type:

```text
:e .editorconfig
```

and press Enter.

- **`:e path`** (*edit*) opens a file in Neovim. If the file doesn't exist, you get an empty buffer for it and the bottom line says `[New]`; the file is created when you first save it.
- Paths are relative to Neovim's working directory, which is your project folder, just as in the shell. Tab completes file names after `:e ` too.

Press `i` and type the file. Press Enter at the end of each line, including after `root = true` to leave a blank line. Then Esc and `:w`:

```ini file=.editorconfig
root = true

[*]
indent_style = space
indent_size = 2
insert_final_newline = true
```

- **EditorConfig** is a standard settings file that many editors read: Neovim reads it without any setup, and so do JetBrains IDEs and GitHub's code view; VS Code reads it with an extension. It keeps a whole team's files indented the same way, whatever editor each person uses.
- **`root = true`**: stop looking. Editors search upward from a file's folder for `.editorconfig` files; this one is the last word for the project.
- **`[*]`**: the settings below apply to every file (`*` matches any name, as in the shell).
- **`indent_style = space`**: indent with space characters, not tab characters.
- **`indent_size = 2`**: two spaces per level. Out of the box Neovim indents with a tab character shown 8 columns wide, which doesn't match the code in these lessons.
- **`insert_final_newline = true`**: always end the file with a newline. Many tools expect it, and some (Git, for one) warn when it's missing.

Neovim reads `.editorconfig` when it opens a file, so the setting takes effect for each file you open from now on.

From here on, **Neovim indents new lines for you**. When you type code from a lesson, type each line **without its leading spaces**: press Enter and Neovim places the cursor at the right depth, and a closing `}` moves itself back out. If you type the spaces as well, you'll get double indentation.

```check
file .editorconfig label=".editorconfig exists in the project folder" -- :e .editorconfig in Neovim, type the settings, then :w.
contains .editorconfig "indent_style = space" label="it asks for spaces" -- Add the line indent_style = space under [*].
contains .editorconfig "indent_size = 2" label="it asks for 2-space indents" -- Add the line indent_size = 2 under [*].
contains .editorconfig "[*]" label="the settings are under [*]" -- Put a line with [*] above the settings, so they apply to every file.
```

## Move with h j k l, and delete a character with x

The arrow keys work in Normal mode, but they're far from where your fingers rest. Vi was written on a terminal whose arrow keys *were* `h`, `j`, `k` and `l`, and the habit stuck because it keeps your hands on the letters:

| Key | Moves | Memory aid |
|---|---|---|
| `h` | left | leftmost of the four |
| `j` | down | `j` hangs below the line |
| `k` | up | `k` reaches up |
| `l` | right | rightmost of the four |

- These work only in **Normal mode**. In Insert mode they type letters, so if you see `jjjj` appear in your file, you forgot Esc (press it, then `u` will undo the typing; more on `u` in 1.4).
- **`x`** deletes the character under the cursor. It's Normal-mode only too.

This step provides a practice file. Click **Fresh copy of practice/maze.txt**, then open it with `:e practice/maze.txt`:

```text file=practice/maze.txt provided
#############
#     #     #
# ### # ### #
# #       # #
# # ##### # #
#   #   #   #
### # * # ###
#     #     #
#############
```

Using **only `h`, `j`, `k` and `l`**, move the cursor onto the `*` (the cursor can go through the walls; they're just characters). Then press **`x`** to delete it and save with `:w`. Par is **13**: six moves down, six right, and `x`. A detour costs keystrokes; click **Fresh copy** and try again until you're at par.

```check
lacks practice/maze.txt "*" label="the * is gone" -- Move onto the * with h j k l, press x in Normal mode, then :w.
run "sed -n 7p practice/maze.txt | grep -qx '### #  # ###'" label="nothing else on that line was deleted" -- x deletes the character under the cursor only. Press u to undo extra deletions (or click Create provided again for a fresh maze), then try again.
run "test $(wc -l < practice/maze.txt) -eq 9" label="the maze still has 9 lines" -- A line was added or removed. Click Fresh copy of practice/maze.txt for a fresh copy.
keys practice/maze.txt par=13
```

## package.json: what npm reads

**npm** (*Node package manager*) installed itself alongside Node. It runs a project's scripts, and installs code written by other people (Shelf won't need any). It learns about a project from a file named **`package.json`** in the project folder.

Open it with `:e package.json`, press `i`, and type this (remember: no leading spaces; Neovim indents). Esc, `:w`:

```json file=package.json
{
  "name": "shelf",
  "scripts": {
    "start": "node server/server.js"
  }
}
```

- The whole file is one **JSON object** (`{` … `}`), **JSON** (*JavaScript Object Notation*), a text format for data: names and text values in double quotes, a colon between a name and its value, commas between pairs.
- **`"name": "shelf"`**: the project's name. npm requires lowercase, with no spaces.
- **`"scripts"`**: an object of named commands. Each name is something you can run with npm; each value is the shell command it stands for.
- **`"start": "node server/server.js"`**: `npm start` will run `node server/server.js`. Every Node developer knows to try `npm start` in an unfamiliar project, so this is the conventional way to say "here's how to run it".

In the Terminal tab:

```zsh
npm start
```

- npm first prints which script it's running and the command it stands for (`> start` and `> node server/server.js`), then the program's own output: `Shelf is starting`.

```check
run "node -e \"JSON.parse(require('fs').readFileSync('package.json', 'utf8'))\"" label="package.json is valid JSON" -- Look for a missing or extra comma, quote or brace. Every name and text value needs double quotes.
run "npm pkg get name" stdout="\"shelf\"" label="its name is shelf" -- "name": "shelf" goes inside the outer braces.
run "npm start" stdout="Shelf is starting" label="npm start runs server/server.js" -- "start": "node server/server.js" goes inside "scripts".
```

## Open a new line: o and O

Adding a line between two others is so common that Neovim has keys for it. Both open a new, empty line, indent it to match, and switch to Insert mode:

- **`o`** opens a line **below** the cursor's line.
- **`O`** (capital) opens a line **above**.

Shelf needs two more facts in `package.json`. With the cursor anywhere on the `"name": "shelf",` line, press `o`, type `"version": "0.1.0",` and press Esc. Press `o` again, type `"type": "module",` and Esc. Save with `:w`.

```json file=package.json
{
  "name": "shelf",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "node server/server.js"
  }
}
```

- **`"version": "0.1.0"`**: the project's version, in the same *major.minor.patch* form as Node's. `0.x` signals "not finished yet".
- **`"type": "module"`**: Node should treat the project's `.js` files as **ES modules**, JavaScript's standard way of splitting a program into files that `import` from each other. Shelf's server starts using `import` in the next lesson.
- **The commas**: in a JSON object, a comma goes **between** pairs, so each new line ends with one. That's why `"name": "shelf"` ended with a comma even before you added anything below it.

Now a deliberate mistake. Put the cursor on the `,` at the end of the `"type": "module",` line (move there with `j` and `l`), press `x` to delete it, `:w`.

```predict
question: package.json now has no comma between "type": "module" and "scripts". What does `npm start` do?
choice: It runs as before, because the comma is optional
choice: It stops with an error, because package.json is no longer valid JSON
choice: It runs, but ignores the scripts section
answer: It stops with an error, because package.json is no longer valid JSON
explain: JSON has no optional commas: two pairs side by side without one aren't valid, so npm can't read the file at all and stops before running anything.
verify: tmp=$(mktemp -d) && cd "$tmp" && printf '{\n  "name": "shelf",\n  "type": "module"\n  "scripts": {\n    "start": "node -e 0"\n  }\n}\n' > package.json && if npm start > /dev/null 2>&1; then echo "It runs as before, because the comma is optional"; else echo "It stops with an error, because package.json is no longer valid JSON"; fi
```

Run `npm start` and see.

- npm can't read the file. It stops with `npm error code EJSONPARSE` and a line containing `Expected ',' or '}' after property value in JSON at position 64 (line 5 column 3)`. The **line and column** say where the reader gave up: at the start of `"scripts"`, because the line above it should have ended with a comma. Errors in data files usually point just *after* the mistake.
- Restore it: move onto the end of that line, press `a`, type `,`, Esc, `:w`. (**`a`**, *append*, is like `i` but inserts **after** the cursor's character. You'll meet it properly next lesson.) `npm start` works again.

```check
run "npm pkg get version" stdout="\"0.1.0\"" label="the version is 0.1.0" -- Add "version": "0.1.0", on its own line below the name.
run "npm pkg get type" stdout="\"module\"" label="the type is module" -- Add "type": "module", on its own line below the version.
run "npm start" stdout="Shelf is starting" label="npm start still works" -- Check the commas: every pair except the last needs one at the end of its line.
```

## Drill: a line below

Click **Fresh copy of practice/drills/02-below.txt** and open it. Put `second` on a new line between the two.

```text file=practice/drills/02-below.txt provided
first
third
```

Par 8: from the first line, open a line below with {{key:o}}, type `second`, {{key:esc}}. No moving needed.

```check
run "sed -n 1p practice/drills/02-below.txt | grep -qx 'first'" label="line 1 reads first" -- Click Fresh copy of practice/drills/02-below.txt and try again.
run "sed -n 2p practice/drills/02-below.txt | grep -qx 'second'" label="line 2 reads second" -- Click Fresh copy of practice/drills/02-below.txt and try again.
run "sed -n 3p practice/drills/02-below.txt | grep -qx 'third'" label="line 3 reads third" -- Click Fresh copy of practice/drills/02-below.txt and try again.
run "test $(wc -l < practice/drills/02-below.txt) -eq 3" label="it has 3 lines" -- A line was added or removed. Click Fresh copy of practice/drills/02-below.txt and try again.
keys practice/drills/02-below.txt par=8
```

## Drill: a line above

Click **Fresh copy of practice/drills/03-above.txt** and open it. Add `one` as a new first line.

```text file=practice/drills/03-above.txt provided
two
three
```

Par 5: {{key:O}} opens a line above the cursor's line, then `one` and {{key:esc}}.

```check
run "sed -n 1p practice/drills/03-above.txt | grep -qx 'one'" label="line 1 reads one" -- Click Fresh copy of practice/drills/03-above.txt and try again.
run "sed -n 2p practice/drills/03-above.txt | grep -qx 'two'" label="line 2 reads two" -- Click Fresh copy of practice/drills/03-above.txt and try again.
run "sed -n 3p practice/drills/03-above.txt | grep -qx 'three'" label="line 3 reads three" -- Click Fresh copy of practice/drills/03-above.txt and try again.
run "test $(wc -l < practice/drills/03-above.txt) -eq 3" label="it has 3 lines" -- A line was added or removed. Click Fresh copy of practice/drills/03-above.txt and try again.
keys practice/drills/03-above.txt par=5
```

## Review: insert before the cursor

Review drills bring back keys from earlier lessons, so they stay in your fingers. Their instructions name the action, not the key: try to recall it, and hover over the underlined name only if you're stuck.

Click **Fresh copy of practice/review/01-02.txt** and make the line read `a bookmark manager`.

```text file=practice/review/01-02.txt provided
bookmark manager
```

Par 4: {{key:i}}, then the two characters, then {{key:esc}}.

```check
run "sed -n 1p practice/review/01-02.txt | grep -qx 'a bookmark manager'" label="line 1 reads a bookmark manager" -- Click Fresh copy of practice/review/01-02.txt and try again.
run "test $(wc -l < practice/review/01-02.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/review/01-02.txt and try again.
keys practice/review/01-02.txt par=4
```

## Your turn: describe the project

npm lets a project describe itself in a `"description"` field, shown by `npm pkg get description` and on the npm website when a package is published.

**Build, on your own:** add this pair to `package.json`, on its own line **directly above** `"scripts"`:

```text
"description": "A bookmark manager with a Node backend and a plain HTML frontend",
```

Choose the key that opens the line in the right place without moving first, if you can, and decide whether the line needs a comma. Then confirm with `npm pkg get description` and `npm start`.

```hints
nudge: You can open a new line above the line you're on, or below it. Which line is the cursor nearest to?
concept: `O` opens a line above the cursor's line; `o` below. In a JSON object, every pair except the last ends with a comma.
shape: Put the cursor on the "scripts" line, press O, type the pair with a comma at the end, Esc, :w.
```

```check
run "npm pkg get description" stdout="A bookmark manager with a Node backend" label="package.json has the description" -- Add the "description" pair inside the outer braces, with double quotes around both name and value.
run "node -e \"const k = Object.keys(JSON.parse(require('fs').readFileSync('package.json', 'utf8'))); process.exit(k.indexOf('description') === k.indexOf('scripts') - 1 ? 0 : 1)\"" label="it sits directly above scripts" -- Open the line with O while the cursor is on the "scripts" line.
run "npm start" stdout="Shelf is starting" label="npm start still works" -- The new line needs a comma at its end, because "scripts" follows it.
```

The checks establish where the pair sits and that npm can still read the file. They do not prove which key you used to open the line; the fewer keys, the better.

### What you have

```text
.editorconfig        2-space indents for every editor
package.json         name, version, type, description, start script
practice/maze.txt    (practice)
server/server.js     console.log('Shelf is starting');
```

| Keys | Does |
|---|---|
| `:e path` | Open (or start) a file |
| `h j k l` | Left, down, up, right |
| `x` | Delete the character under the cursor |
| `o` / `O` | New line below / above, in Insert mode |

Next: the rest of the ways into Insert mode, and a server that answers your browser.
