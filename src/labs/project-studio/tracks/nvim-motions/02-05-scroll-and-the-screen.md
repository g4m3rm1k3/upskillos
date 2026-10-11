---
title: 2.5 — Scroll and Place the Screen: Ctrl+D, Ctrl+U, H, M, L, zz, zt and zb
runtime: none
---

Every file so far fitted on one screen. Real files don't: a data file, a long module, a log. When you know where you're going, `G`, a line number or a find gets you there. When you **don't**, because you're reading, looking for something you'll recognise when you see it, you need to move a screen at a time and keep your place. That's this lesson: scrolling, jumping to what's on screen, and moving the screen around the cursor.

Shelf swaps its one bookmark for thirty sample bookmarks. Three of them have an address that isn't secure, and one is missing a comma, which stops Shelf from reading any of them. You'll find all four by reading through the file.

## Scroll by half a screen: Ctrl+D and Ctrl+U

| Keys | Does |
|---|---|
| Ctrl+D | scroll **down** half a screen; the cursor moves the same number of lines |
| Ctrl+U | scroll **up** half a screen |

- Half a screen, rather than a whole one, means the lines you were just reading are still in view after each press, so your eyes keep their place.
- How many lines that is depends on the height of the editor pane, which is why the drills in this lesson can't have an exact par.
- Neovim also has Ctrl+F and Ctrl+B (*forward* and *back* a whole screen). Most people settle on Ctrl+D and Ctrl+U.
- In VS Code, Page Down and Page Up do this. In a drill they count as arrow keys, like Home and End.

## Jump to what's on screen: H, M and L

| Key | Moves the cursor to |
|---|---|
| `H` | the top line on screen (*high*) |
| `M` | the middle line on screen |
| `L` | the bottom line on screen (*low*) |

- The screen doesn't move; only the cursor does.
- They're for "the thing I'm looking at is near the bottom": `L`, then a few `k`, beats counting lines.

## Move the screen, not the cursor: zz, zt and zb

| Keys | Scrolls so the cursor's line is at |
|---|---|
| `zz` | the middle of the screen |
| `zt` | the top (*top*) |
| `zb` | the bottom (*bottom*) |

- The cursor stays on its line; the text moves around it.
- `zz` is the one you'll use most: after a jump (`74G`, a search), the line you landed on may be at the very edge of the screen. `zz` brings it to the middle, with what's above and below it in view.
- `zt` is good for reading a function from its first line: everything after it is on screen.

## Sample data, too long for one screen

Click **Create provided data/sample-bookmarks.json**. It's a new file, beside Shelf's real `bookmarks.json`, with thirty bookmarks in the same format, each on four lines.

```json file=data/sample-bookmarks.json provided
[
  {
    "title": "Neovim",
    "url": "https://neovim.io"
  },
  {
    "title": "Vim",
    "url": "https://www.vim.org"
  },
  {
    "title": "Node.js",
    "url": "https://nodejs.org"
  },
  {
    "title": "MDN Web Docs",
    "url": "https://developer.mozilla.org"
  },
  {
    "title": "npm",
    "url": "https://www.npmjs.com"
  },
  {
    "title": "EditorConfig",
    "url": "https://editorconfig.org"
  },
  {
    "title": "JSON",
    "url": "https://www.json.org"
  },
  {
    "title": "HTTP status codes",
    "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status"
  },
  {
    "title": "Git",
    "url": "http://git-scm.com"
  },
  {
    "title": "GitHub",
    "url": "https://github.com"
  },
  {
    "title": "Stack Overflow",
    "url": "https://stackoverflow.com"
  },
  {
    "title": "Can I use",
    "url": "https://caniuse.com"
  },
  {
    "title": "web.dev",
    "url": "https://web.dev"
  },
  {
    "title": "CSS-Tricks",
    "url": "https://css-tricks.com"
  },
  {
    "title": "The Modern JavaScript Tutorial",
    "url": "https://javascript.info"
  },
  {
    "title": "Node.js API reference",
    "url": "https://nodejs.org/api/"
  },
  {
    "title": "ECMAScript specification",
    "url": "http://tc39.es/ecma262/"
  },
  {
    "title": "Vim Adventures",
    "url": "https://vim-adventures.com"
  }
  {
    "title": "Neovim documentation",
    "url": "https://neovim.io/doc/"
  },
  {
    "title": "Lua",
    "url": "https://www.lua.org"
  },
  {
    "title": "curl",
    "url": "https://curl.se"
  },
  {
    "title": "The Twelve-Factor App",
    "url": "https://12factor.net"
  },
  {
    "title": "Hacker News",
    "url": "https://news.ycombinator.com"
  },
  {
    "title": "regex101",
    "url": "https://regex101.com"
  },
  {
    "title": "Mozilla",
    "url": "http://www.mozilla.org"
  },
  {
    "title": "Wikipedia",
    "url": "https://www.wikipedia.org"
  },
  {
    "title": "Python",
    "url": "https://www.python.org"
  },
  {
    "title": "Rust",
    "url": "https://www.rust-lang.org"
  },
  {
    "title": "Deno",
    "url": "https://deno.com"
  },
  {
    "title": "Learn X in Y minutes",
    "url": "https://learnxinyminutes.com"
  }
]
```

Open it with `:e data/sample-bookmarks.json`. Then read through it, all the way to the end and back, using only Ctrl+D, Ctrl+U, `H`, `M`, `L` and the `zz`, `zt` and `zb` keys. Get a feel for how far each one moves.

Three of the addresses start with `http://` instead of `https://`. **Without the `s`**, a browser sends the request unencrypted, so anyone on the same network can read it. Fix all three:

- When you're ready to do it for real, `:e!` reloads the file, which also starts your keystroke count again. Then `gg` back to the top.
- Scroll with Ctrl+D until you spot a `"url": "http:` line. Get onto it with `H`, `M` or `L` and a few `j` or `k`.
- `^`, then `fp`: the cursor lands on the `p` of `http` (there's no earlier `p` on that line). Then `a`, `s`, Esc.
- Carry on down for the next one. Save with `:w` when all three are fixed.

```check
lacks data/sample-bookmarks.json "http://" label="every address starts with https://" -- Three url lines start with http:// — scroll through with Ctrl+D and add the s to each.
run "test $(grep -c '\"url\": \"https://' data/sample-bookmarks.json) -eq 30" label="all 30 addresses are still there, each with https://" -- If an address was damaged, delete the file with rm data/sample-bookmarks.json, then click Create provided data/sample-bookmarks.json for a fresh copy.
keys data/sample-bookmarks.json par=80
```

Par here is generous: 80 keystrokes since you last opened or reloaded the file. Screen keys move by an amount that depends on your window's height, so no single number is right for everyone. Arrow keys, Page Down, Page Up and the mouse still fail it.

## Give Shelf the sample data

In the Terminal tab, copy the sample over Shelf's real data file, replacing it:

```zsh
cp data/sample-bookmarks.json data/bookmarks.json
```

- **`cp source destination`** copies a file. If the destination exists, it's replaced without asking. Shelf's first bookmark, Neovim, is also the first in the sample, so nothing is lost.

Restart the server and ask how many bookmarks there are now: `curl http://localhost:3000/api/bookmarks/count`.

```predict
question: The data file now holds thirty bookmarks, one of them followed by no comma. What does curl http://localhost:3000/api/bookmarks/count get?
choice: {"count":30,"empty":false}
choice: {"count":29,"empty":false}, skipping the broken one
choice: Nothing: the server stops with a SyntaxError from JSON.parse
answer: Nothing: the server stops with a SyntaxError from JSON.parse
explain: JSON.parse reads the whole file or nothing. One missing comma makes the text not JSON, so it throws an error, nothing in the handler catches it, and the server process ends. curl prints `curl: (52) Empty reply from server`: the connection closed with no answer.
```

The server's terminal shows:

```text
SyntaxError: Expected ',' or ']' after array element in JSON at position 1341 (line 74 column 3)
    at JSON.parse (<anonymous>)
    at countBookmarks (file:///…/shelf/server/routes.js:19:26)
```

- **`after array element`**: between two items of the array, the reader expected a comma, or the `]` that ends it.
- **`line 74 column 3`** is where it gave up: the `{` that starts a bookmark. (Node versions before 22 give only the `position`, a count of characters from the start of the file.) As with the comma in 1.2, the mistake is just **before** the place the error names.
- The second `at` line shows it was `countBookmarks` that called `JSON.parse`. `listBookmarks` sends the file without parsing it, so `/api/bookmarks` would have "worked", passing the broken JSON on to whoever asked.

Fix it in `data/bookmarks.json`:

- `:e data/bookmarks.json`, then `74G`. The cursor may be on the bottom line of the screen; `zz` brings it to the middle, so you can see the bookmark above.
- `k` onto the `}` that ends the previous bookmark, then `A`, `,`, Esc, `:w`.

Restart the server and run the `curl` again: `{"count":30,"empty":false}`.

```check
run "node -e \"JSON.parse(require('fs').readFileSync('data/bookmarks.json', 'utf8'))\"" label="data/bookmarks.json is valid JSON" -- Go to the line Node names, look at the line above it, and add the missing comma after the }.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":30,\"empty\":false}" label="Shelf counts thirty bookmarks" -- Copy the sample with cp data/sample-bookmarks.json data/bookmarks.json, then fix the missing comma in data/bookmarks.json.
lacks data/bookmarks.json "http://" label="the copy has your https fixes" -- Fix the sample's three addresses first, then copy it again.
```

## Review: the end of the last line

Click **Fresh copy of practice/review/02-05.txt**. Remove the comma at the end of the last line, then add a new last line, `done`. Recall the keys before hovering.

```text file=practice/review/02-05.txt provided
one,
two,
three,
four,
five,
six,
seven,
eight,
nine,
ten,
eleven,
twelve,
```

Par 9: {{key:G}} to the last line, {{key:line-end}} onto the comma, {{key:x}}; then {{key:o}}, `done`, {{key:esc}}.

```check
run "sed -n 12p practice/review/02-05.txt | grep -qx 'twelve'" label="line 12 reads twelve" -- Click Fresh copy of practice/review/02-05.txt and try again.
run "sed -n 13p practice/review/02-05.txt | grep -qx 'done'" label="line 13 reads done" -- Click Fresh copy of practice/review/02-05.txt and try again.
run "sed -n 11p practice/review/02-05.txt | grep -qx 'eleven,'" label="line 11 still ends with a comma" -- Click Fresh copy of practice/review/02-05.txt and try again.
run "test $(wc -l < practice/review/02-05.txt) -eq 13" label="it has 13 lines" -- A line was added or removed. Click Fresh copy of practice/review/02-05.txt and try again.
keys practice/review/02-05.txt par=9
```

## Your turn: a bookmark of your own

**Build, on your own:** add one more bookmark, a site you use, as the **last** one in `data/bookmarks.json`, in the same four-line format, with an address that starts with `https://`. Shelf should then count 31.

Decide how to get to the end of the file, which line the new one goes after, and what the bookmark that used to be last now needs.

```hints
nudge: The last bookmark is just above the ] that ends the array. A new item after it means the array needs one more comma.
concept: In a JSON array every item except the last is followed by a comma. Adding an item at the end gives the old last item a comma. `G` reaches the `]`; `k` the `}` above it.
shape: `G`, `k`, then `A`, `,`, Esc to add the comma, and `o` to open the new bookmark below it: `{`, then the "title" and "url" lines, then `}` (no comma after it). Type without leading spaces, and Neovim indents.
```

```check
run "node -e \"JSON.parse(require('fs').readFileSync('data/bookmarks.json', 'utf8'))\"" label="data/bookmarks.json is still valid JSON" -- Check the commas: one after the bookmark that used to be last, none after the new one.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31,\"empty\":false}" label="Shelf counts 31 bookmarks" -- Add exactly one bookmark, inside the [ ], after the last one.
run "node -e \"const b = JSON.parse(require('fs').readFileSync('data/bookmarks.json', 'utf8')); const last = b[b.length - 1]; process.exit(typeof last.title === 'string' && last.title.length > 0 && typeof last.url === 'string' && last.url.startsWith('https://') ? 0 : 1)\"" label="the last bookmark has a title and an https:// address" -- The new bookmark needs \"title\" and \"url\" keys, and the address must start with https://.
```

The checks establish that the file is valid, there are 31 bookmarks, and the last one has a title and a secure address. They do not prove the address works: open it in your browser.

### What you have

```text
data/bookmarks.json         31 bookmarks, all https
data/sample-bookmarks.json  the sample, with your three fixes
server/                     unchanged in this lesson
```

| Keys | Does |
|---|---|
| Ctrl+D / Ctrl+U | scroll down / up half a screen |
| `H` / `M` / `L` | cursor to the top / middle / bottom of the screen |
| `zz` / `zt` / `zb` | scroll so the cursor's line is in the middle / at the top / at the bottom |

That completes chapter 2: words and WORDs, the ends of a line, finding a character, jumping through a file, counts, matching brackets and scrolling. Every motion you've learned becomes an editing tool in chapter 3, where an **operator** before a motion acts on everything the motion crosses: `dw` deletes a word, `c$` changes to the end of the line, and `.` repeats the whole edit. Shelf's growing chain of `if` blocks becomes a proper router.
