---
title: 1.3 — Writing and Reading Files: echo, >, >>, cat, less
runtime: none
---

Programs print text, and the shell can send that text into a file instead of onto the screen. That one idea, **redirection**, lets you write a file without opening an editor. In this lesson you write Shelf's README and its first data file from the command line, then read them back four different ways.

## echo prints its arguments

```zsh
echo Shelf keeps your bookmarks
```

- **`echo`** prints its arguments on one line, separated by single spaces, followed by a **newline** (the invisible character that ends a line).
- Each word is a separate argument; `echo` joins them back together with one space. `echo Shelf    keeps` prints `Shelf keeps`: the shell split the line at the spaces, and the extra spaces were never passed on.

**Quotes** make several words, spaces included, into **one** argument:

```zsh
echo "Shelf    keeps"
echo "My home folder is $HOME"
echo 'My home folder is $HOME'
```

- **Double quotes `"…"`** keep the spaces exactly. The shell still replaces **`$HOME`** inside them with the value of the `HOME` variable (your home folder's path). You'll meet variables properly in 1.5.
- **Single quotes `'…'`** keep *everything* exactly as typed: `$HOME` stays as the five characters `$HOME`. Use single quotes when the text contains characters the shell would otherwise act on.

## Send output into a file: >

```zsh
echo "# Shelf" > README.md
cat README.md
```

- **`>`** followed by a file name **redirects** the command's output: instead of going to the screen, it's written into that file. The shell handles `>` before the command runs; `echo` never knows its output went to a file.
- If the file doesn't exist, `>` creates it. **If it does exist, `>` empties it first.** There's no warning and no undo.
- **`cat`** (short for *concatenate*, joining files end to end) prints the contents of the files you name. With one file, it simply shows it.
- **`README.md`** is the conventional first file of a project, explaining what it is. `.md` means **Markdown**, a plain-text format where `# ` at the start of a line makes a heading.

```predict
question: README.md contains `# Shelf`. You run `echo "A bookmark manager" > README.md`. What does `cat README.md` print now?
choice: "# Shelf" then "A bookmark manager", on two lines
choice: Only "A bookmark manager"
choice: Only "# Shelf"
answer: Only "A bookmark manager"
explain: `>` empties the file before the command writes to it, so the heading is gone and only the new line remains.
verify: tmp=$(mktemp -d) && cd "$tmp" && echo "# Shelf" > R.md && echo "A bookmark manager" > R.md && [ "$(cat R.md)" = "A bookmark manager" ] && echo 'Only "A bookmark manager"'
```

Run it and see. That's the classic redirection accident, made on purpose: you've just lost the heading. The repair in the next step uses the other arrow.

## Add to the end: >>

**`>>`** **appends**: it adds the output to the end of the file and leaves what's already there.

Rebuild the README properly, line by line:

```zsh
echo "# Shelf" > README.md
echo "" >> README.md
echo "A bookmark manager with a Node backend and a plain HTML, CSS and JavaScript frontend." >> README.md
cat README.md
```

- The first line uses `>` deliberately, to start the file afresh.
- **`echo ""`** prints an empty argument, so its output is just a newline: a blank line in the file. Markdown needs a blank line between a heading and a paragraph.
- The last two use `>>`, so each adds a line.

The file now reads:

```text
# Shelf

A bookmark manager with a Node backend and a plain HTML, CSS and JavaScript frontend.
```

If yours differs, press ↑ to find the four commands and run them again in order: the first `>` wipes the slate clean, so repeating the whole sequence is always safe. Repeating only a `>>` line would add a second copy of that line.

```check
run "head -n 1 README.md | grep -qx '# Shelf'" label="README.md starts with the # Shelf heading" -- Start again with echo "# Shelf" > README.md, then append the other lines with >>.
run "sed -n 2p README.md | grep -qx ''" label="the second line is blank" -- The second command is echo "" >> README.md, which adds an empty line.
contains README.md "A bookmark manager with a Node backend" label="README.md describes Shelf" -- Append the description line with >>.
run "test $(wc -l < README.md) -eq 3" label="README.md has exactly three lines" -- Rebuild the file from the first command (the one with a single >), so nothing is doubled.
```

## Four ways to read a file

`cat` prints a whole file at once, which is fine for three lines and useless for three thousand. Other commands read part of a file:

```zsh
wc -l README.md
head -n 1 README.md
tail -n 1 README.md
```

- **`wc -l`** (*word count*, `-l` for *lines*) counts the lines. It prints the number and then the file name; a Mac pads the number with spaces.
- **`head -n 1`** prints the first 1 line. Without `-n`, `head` prints the first 10.
- **`tail -n 1`** prints the last line. Without `-n`, the last 10. Programs often write a growing log file, and `tail` shows its latest lines.

For a long file, use a **pager**, a program that shows one screen at a time:

```zsh
less README.md
```

| Key in `less` | Does |
|---|---|
| Space / b | Next page / back a page |
| ↓ ↑ (or j k) | One line down / up |
| `/word` then Enter | Search forward for "word"; `n` finds the next match |
| g / G | Start / end of the file |
| q | Quit, back to the prompt |

`man`, `git` and other commands show long output in `less` too, so these keys come up again. The `j`/`k` keys for down/up also work in the Vim and Neovim editors.

## Quote what the shell would act on

Some characters mean something to zsh even outside quotes: `$`, `*`, `?`, `[`, `]`, `{`, `}`, `<`, `>`, `|`, `&`, `;`, `(`, `)`, `!`, `#`, `~` and spaces. Here's what happens with square brackets, which JSON data is full of:

```zsh
echo []
```

```text
zsh: no matches found: []
```

- Unquoted **`[...]`** is a **pattern** to zsh: "any one of the characters between the brackets". The shell tries to match it against file names *before* running `echo`, finds none, and stops with an error. `echo` never ran. (bash prints the brackets instead; zsh's stricter rule catches mistakes earlier.)
- In quotes, it's just text: `echo '[]'` prints `[]`.

So the rule: **when text contains anything but letters, digits, `-`, `.`, `/` and `_`, put it in quotes.** Use single quotes unless you want `$variables` replaced.

## Your turn: Shelf's first bookmark

Shelf stores its bookmarks in `data/bookmarks.json` as **JSON** (*JavaScript Object Notation*), a text format for data. This is the file you need:

```text
[{"title":"Neovim","url":"https://neovim.io"}]
```

- **`[` … `]`** is a JSON **array**: an ordered list of values. This one has one item.
- **`{` … `}`** is a JSON **object**: named values. Each name and each text value is in **double quotes**, a colon separates a name from its value, and commas separate the pairs.
- This object has a `title` and a `url`. In 1.5 you'll ask a program to read it.

**Build, on your own:** create `data/bookmarks.json` containing exactly that one line, with a single `echo` and a redirection, then print it to check. The text contains `[`, `{` and `"`: decide how to quote it so the shell passes it to `echo` unchanged.

```hints
nudge: Try it without quotes first and read the error. Then think about which kind of quotes keep double quotes inside them untouched.
concept: Single quotes keep every character exactly as typed, including double quotes, brackets and braces. Double quotes would end at the first `"` in the JSON.
shape: `echo '<the JSON line>' > data/bookmarks.json`, then `cat data/bookmarks.json`.
```

```check
file data/bookmarks.json label="data/bookmarks.json exists" -- Redirect echo's output into data/bookmarks.json with >.
contains data/bookmarks.json "{\"title\":\"Neovim\",\"url\":\"https://neovim.io\"}" label="it holds the Neovim bookmark, double quotes included" -- Wrap the whole JSON in single quotes, so the double quotes inside reach echo.
run "head -c 1 data/bookmarks.json | grep -qF '['" label="it starts with [" -- The JSON starts with [ and ends with ]; keep them inside the quotes.
run "test $(wc -l < data/bookmarks.json) -eq 1" label="it is one line, written once" -- Use > (not >>) so the file holds only this line.
```

These checks establish that the text is right. They do not prove it's **valid** JSON, the kind a program can read, is a question for Node: you'll ask it in 1.5, once you know where Node lives.

### What you have

```text
shelf/
  README.md            heading and description
  data/bookmarks.json  one bookmark
  (and the folders and empty files from 1.1 and 1.2)
```

Next: copying, moving and deleting, and the one command in this chapter that can't be undone.
