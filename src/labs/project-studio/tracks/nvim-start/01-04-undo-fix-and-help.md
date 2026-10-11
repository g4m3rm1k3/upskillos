---
title: 1.4 — Undo, Small Fixes, Line Numbers and :help
runtime: none
---

Mistakes are cheap in Neovim if you know four things: how to undo (and redo), how to fix one wrong character, how to jump straight to the line an error message names, and how to throw away everything since the last save. This lesson teaches all four, then Neovim's built-in manual, so you can look up any key yourself. You finish by making Shelf's server log every request it receives.

## Undo and redo: u and Ctrl+R

In Normal mode:

- **`u`** undoes the last change. Press it again to undo the one before, and so on, back to when you opened the file.
- **Ctrl+R** (*redo*) re-applies a change you undid.
- **A change** is everything from pressing an Insert key (`i`, `a`, `o`…) to pressing Esc, or one Normal-mode command such as `x`. So a whole line typed in one trip to Insert mode undoes in one `u`. That's another reason to press Esc after each piece of typing: it gives you undo points.
- Undo history survives `:w`. You can save, then undo past the save. It's lost when you quit Neovim.

Try it in `server/server.js`: press `o`, type `this is not JavaScript`, Esc. Press `u`: the line disappears. Ctrl+R: it's back. `u` again to remove it for good, and don't save the junk. (If you already saved it, `u` and `:w` again.)

```check
lacks server/server.js "this is not JavaScript" label="the practice line is gone" -- Undo it with u, then save with :w.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917; kill $!); echo \"$out\"" stdout="Shelf is running on port 3917" label="the server works as it did after 1.3" -- Undo until the file matches the end of 1.3, then :w.
```

## Replace one character: r

**`r`** followed by a character **replaces** the character under the cursor with it, without entering Insert mode. With `x` (delete) and `r` (replace) you can fix most typos without leaving Normal mode.

Click **Fresh copy of practice/typos.txt**, open it with `:e practice/typos.txt`, and fix it. Every typo can be fixed with `r` (a wrong letter) or `x` (an extra letter):

```text file=practice/typos.txt provided
Shelf lisnens on port 3000.
Each requsst gets an answer.
Prress Ctrl+C to stop it.
```

The fixed file reads:

```text
Shelf listens on port 3000.
Each request gets an answer.
Press Ctrl+C to stop it.
```

- Line 1: the `n` after `lis` should be a `t`: put the cursor on it, `rt`.
- Line 2: the first `s` in `requsst` should be an `e`: put the cursor on it, `re`.
- Line 3: `Prress` has one `r` too many: on either `r`, `x`.

Save with `:w`. Par is **23**, using only `h j k l`, `r` and `x`. Moving straight down with `j` keeps the cursor's column, which helps on line 2.

```check
run "sed -n 1p practice/typos.txt | grep -qx 'Shelf listens on port 3000.'" label="line 1 says listens" -- Put the cursor on the wrong n in lisnens and press r then t.
run "sed -n 2p practice/typos.txt | grep -qx 'Each request gets an answer.'" label="line 2 says request" -- Put the cursor on the first s in requsst and press r then e.
run "sed -n 3p practice/typos.txt | grep -qx 'Press Ctrl+C to stop it.'" label="line 3 says Press" -- Put the cursor on one of the two r's in Prress and press x.
keys practice/typos.txt par=23
```

## Jump to the line in an error message

When a program fails, the error names a file and a line number. Here's a real one, made on purpose.

In `server/server.js`, on the `response.end` line, delete the `o` from `response` with `x`, so it reads `respnse.end(…)`. `:w`. Start the server with `npm start` and run `curl http://localhost:3000` in the second terminal.

```predict
question: The server starts fine with the misspelling. What happens when curl sends it a request?
choice: curl prints Shelf is running as usual
choice: The server crashes with an error about respnse, and curl gets no proper answer
choice: The server refuses to start in the first place
answer: The server crashes with an error about respnse, and curl gets no proper answer
explain: The handler only runs when a request arrives, so the mistake goes unnoticed at startup. When curl's request arrives, the handler reaches respnse, which isn't defined anywhere, and Node stops the program with a ReferenceError.
```

The server's terminal shows:

```text
file:///…/shelf/server/server.js:8
  respnse.end(`Shelf is running on port ${port}
  ^

ReferenceError: respnse is not defined
    at Server.<anonymous> (file:///…/shelf/server/server.js:8:3)
```

- **`server.js:8`** names the file and **line 8**. `8:3` in the last line adds the **column**: the 3rd character.
- **`ReferenceError: respnse is not defined`**: the program used a name nothing had created.
- The lines starting with `at` are the **stack trace**: which function was running, and what called it. The first `at` line is the one in your code.
- The server process has ended: a mistake that isn't handled stops the whole program. Your prompt is back in that terminal.

Neovim can show line numbers and jump to one:

- **`:set number`** shows line numbers down the left side. (It lasts until you quit Neovim; chapter 10 makes settings permanent.)
- **`:8`** and Enter moves the cursor to line 8. Any number works: `:1` is the first line.

Type `:set number`, then `:8`. The cursor is on the broken line. Fix it: with the cursor on the `n` of `respnse`, press `i`, type `o`, Esc. (Or press `u` until the file is back, if the `x` was your last change.) `:w`, `npm start`, and `curl` works again. Stop the server with Ctrl+C.

```check
contains server/server.js "response.end(" label="response is spelled correctly again" -- Jump to line 8 with :8 and put the o back in response.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917; kill $!); echo \"$out\"" stdout="Shelf is running on port 3917" label="the server answers again" -- Save the fix with :w.
```

## Throw away everything since the last save: :e!

Sometimes it's quicker to start again than to undo twenty changes.

- **`:e!`** reloads the file from disk, **discarding every unsaved change** in the buffer. Like `:q!`, the `!` means "I know I'll lose changes".
- It only goes back to the last `:w`. Changes you've already saved need `u` (or Git, later).

Try it: make a few changes anywhere in `server/server.js` (`x` a few times, an `o` with some text), **don't save**, then `:e!`. The file is back as it was.

## Neovim's own manual: :help

Neovim comes with a complete manual, readable inside the editor:

| Command | Opens |
|---|---|
| `:help` | The manual's front page |
| `:help u` | What the `u` key does |
| `:help :w` | What the `:w` command does (note the colon) |
| `:help i_CTRL-W` | What Ctrl+W does **in Insert mode** (`i_` prefix) |
| `:help E37` | What error E37 means |
| `:Tutor` | An interactive 30-minute lesson built into Neovim |

- Help opens in a **window** above your file (chapter 7 covers windows). Scroll with `j`, `k`, Ctrl+D and Ctrl+U.
- Words in a different colour are **links**. Put the cursor on one and press **Ctrl+]** to follow it. **Ctrl+O** goes back.
- **`:q`** closes the help window and leaves your file open.
- Tab completes help topics: `:help set` then Tab cycles through matches.

Look up the two keys you learned in this lesson: `:help r`, then `:q`; `:help CTRL-R`, then `:q`.

## Drill: jump to a line

Click **Fresh copy of practice/drills/07-jump.txt** and open it. It has 30 lines; line 23 has a stray `!` at the end. Remove it.

```text file=practice/drills/07-jump.txt provided
line 1
line 2
line 3
line 4
line 5
line 6
line 7
line 8
line 9
line 10
line 11
line 12
line 13
line 14
line 15
line 16
line 17
line 18
line 19
line 20
line 21
line 22
line 23!
line 24
line 25
line 26
line 27
line 28
line 29
line 30
```

Par 7: {{key:line}} with 23 (that's `:`, `2`, `3`, Enter), then {{key:A}}, Backspace, {{key:esc}}. Backspace in Insert mode deletes the character before the cursor.

```check
run "sed -n 23p practice/drills/07-jump.txt | grep -qx 'line 23'" label="line 23 reads line 23" -- Click Fresh copy of practice/drills/07-jump.txt and try again.
run "test $(wc -l < practice/drills/07-jump.txt) -eq 30" label="it has 30 lines" -- A line was added or removed. Click Fresh copy of practice/drills/07-jump.txt and try again.
keys practice/drills/07-jump.txt par=7
```

## Review: comment out, add to the end

Click **Fresh copy of practice/review/01-04.txt**. On the middle line, add the missing semicolon and comment the line out, keeping its indentation. Recall the keys first.

```text file=practice/review/01-04.txt provided
function start() {
  listen()
}
```

Par 9: down one, {{key:A}} `;` {{key:esc}}, then {{key:I}} `// ` {{key:esc}}.

```check
run "sed -n 1p practice/review/01-04.txt | grep -qx 'function start() {'" label="line 1 reads function start() {" -- Click Fresh copy of practice/review/01-04.txt and try again.
run "sed -n 2p practice/review/01-04.txt | grep -qx '  // listen();'" label="line 2 reads   // listen();" -- Click Fresh copy of practice/review/01-04.txt and try again.
run "sed -n 3p practice/review/01-04.txt | grep -qx '}'" label="line 3 reads }" -- Click Fresh copy of practice/review/01-04.txt and try again.
run "test $(wc -l < practice/review/01-04.txt) -eq 3" label="it has 3 lines" -- A line was added or removed. Click Fresh copy of practice/review/01-04.txt and try again.
keys practice/review/01-04.txt par=9
```

## Your turn: log every request

A server that writes a line for each request it receives lets you see what's happening while it runs. That's how you'll spot the browser asking for files you didn't expect.

Two facts about the `request` object the handler receives:

- **`request.method`** is the kind of request, as text: `'GET'` when something asks for a page, which is what `curl` and your browser's address bar do. (Other methods, such as `'POST'` for sending data, come in chapter 4.)
- **`request.url`** is the path that was asked for: `'/'` for `http://localhost:3000`, `'/hello'` for `http://localhost:3000/hello`.

**Build, on your own:** make the server print the method and the path, separated by a space, for every request it receives, **before** it sends the answer. A `GET` for `/hello` should print `GET /hello` in the server's terminal. Use a key that opens a line in the right place without moving first, if you can. Then test it: start the server, `curl http://localhost:3000/hello` from the other terminal, and look at the first terminal. Also open `http://localhost:3000` in your browser and see what it asks for besides `/`.

```hints
nudge: The code that runs once per request is inside the handler, between the `=> {` line and the `});` line. Printing is console.log.
concept: `console.log(a, b)` prints its arguments separated by a space. `o` on the `http.createServer(…) => {` line opens a line inside the handler, already indented.
shape: One new line inside the handler, above `response.end(…)`: `console.log(request.method, request.url);`
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/hello > /dev/null; sleep 0.3; kill $!); echo \"$out\"" stdout="GET /hello" label="a GET for /hello prints GET /hello" -- Inside the handler, print request.method and request.url with console.log.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917; kill $!); echo \"$out\"" stdout="Shelf is running on port 3917" label="every request still gets its answer" -- Keep the response.end line, and put the new line above it inside the handler.
run "out=$(PORT=3917 node server/server.js & sleep 1; kill $!); echo \"$out\"" without="GET" label="nothing is logged until a request arrives" -- The log line belongs inside the handler, not at the top level of the file.
```

The checks establish that each request is logged and still answered. They do not prove the log line comes **before** `response.end`, as asked: read your handler to confirm.

Your browser probably asked for **`/favicon.ico`** as well as `/`. That's the little icon browsers show in a tab. Every browser asks for it, and right now Shelf answers it with the same text. Chapter 3 gives Shelf proper routes, so each path gets the right answer, and unknown paths a "not found".

### What you have

```text
server/server.js   answers every request on PORT (or 3000) and logs it
practice/typos.txt (practice)
```

| Keys | Does |
|---|---|
| `u` / Ctrl+R | Undo / redo |
| `r<char>` | Replace the character under the cursor |
| `:set number` | Show line numbers |
| `:<number>` | Go to that line |
| `:e!` | Discard unsaved changes |
| `:help <topic>` | The manual; Ctrl+] follows a link, `:q` closes it |

That completes chapter 1: modes, saving, quitting, opening files, every way into Insert mode, undo and quick fixes, and a running server. Chapter 2 covers moving fast: words, line ends, searching within a line, and jumping through a file. You'll need that speed as `server.js` grows into a router for Shelf's API.
