---
title: 2.1 — Move by Words: w, b, e and ge
track: Neovim — Motions
trackOrder: 71.01
runtime: none
---

In chapter 1 the cursor moved one character or one line at a time, with `h j k l`. Code is made of words, though: names, numbers, operators. This chapter teaches **motions**, the keys that move the cursor by meaningful amounts: by word, to either end of a line, to a character you can see, to the top or bottom of the file, and to the bracket that matches the one you're on. This lesson starts with words.

In VS Code you move by word with Ctrl+Right and Ctrl+Left (Option+Right and Option+Left on a Mac). Neovim's word motions do the same job with your fingers on the letters, and they choose more precisely where to stop. In chapter 3 they become more than movement: every motion can follow an **operator** such as "delete" or "change", so learning where each one stops now is what makes those edits exact later.

Shelf gets its first real feature: a new file, `server/routes.js`, holding a **handler** that sends the bookmarks as JSON, and a route in `server.js` that uses it.

## Words: w, b, e and ge

Neovim splits a line into **words** in a particular way, and every word motion relies on it:

- A **word** is either a run of **letters, digits and underscores** (`process`, `PORT`, `3000`, `my_name`), or a run of **other non-blank characters**, i.e. punctuation (`.`, `||`, `('`, `);`).
- Spaces and tabs separate words but aren't words themselves.
- So `process.env.PORT` is **five** words: `process`, `.`, `env`, `.`, `PORT`.

The four word motions, all in Normal mode:

| Key | Moves to |
|---|---|
| `w` | the **start** of the next word (*word*) |
| `b` | the **start** of this word, or of the previous one if you're already at a start (*back*) |
| `e` | the **end** of this word, or of the next one if you're already at an end (*end*) |
| `ge` | the **end** of the previous word |

Here is where `w` stops on a line from `server.js`, starting from the `c` of `const` (each `^` is a stop):

```text
const port = process.env.PORT || 3000;
^     ^    ^ ^      ^^  ^^   ^  ^   ^
```

- Every punctuation run is a stop of its own: `=`, both `.`s, `||` and `;`.
- `w` at the end of a line carries on to the first word of the next line, and `b` goes back to the previous line the same way. Word motions never stop at the end of a line.

```predict
question: The cursor is on the c of const in the line above. How many times do you press w to reach the P of PORT?
answer: 7
explain: The stops after const are port, =, process, ., env, . and PORT: seven presses. Each . is a word of its own, so w stops on it.
verify: printf 'const port = process.env.PORT || 3000;\n' > .verify.txt && "$NVIM_BIN" --clean --headless .verify.txt -c "lua local n = 0; while vim.fn.col('.') ~= 26 do vim.cmd('normal! w'); n = n + 1 end; io.stdout:write(n .. '\n')" -c 'qa!'; rm -f .verify.txt
```

Try it. Open `server/server.js`, move to the `const port` line with `j`, and press `w` seven times. Then try `e` and `b` on the same line and watch where each stops. `ge` is the mirror image of `e`: it moves backwards to the **last** character of the previous word.

## A routes file for Shelf

A web app's server answers different paths differently: `/api/bookmarks` should give the bookmarks, `/` a page. A function that produces the answer for one kind of request is a **handler**, and a path together with the handler that answers it is a **route**. Shelf keeps its handlers in their own file, so that `server.js` only has to decide which one to call.

Open `server/routes.js` with `:e server/routes.js`. It's one of the empty files from the starter project. Press `i` and type this (no leading spaces; Neovim indents), then Esc and `:w`:

```javascript file=server/routes.js
import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

export function listBookmarks(request, response) {
  const text = fs.readFileSync(DATA, 'utf8');
  response.setHeader('Content-Type', 'application/json');
  response.end(text);
}
```

- **`import fs from 'node:fs';`** loads Node's built-in **file system** module, the code that reads and writes files, under the name `fs`.
- **`const DATA = new URL('../data/bookmarks.json', import.meta.url);`** works out where the data file is:
  - **`import.meta.url`** is this file's own location, written as an address: `file:///…/shelf/server/routes.js`.
  - **`new URL(relative, base)`** combines a relative path with a base address. `..` means "the folder above", so the result is `file:///…/shelf/data/bookmarks.json`.
  - Why not just `'data/bookmarks.json'`? A plain relative path is looked up from the folder the program was **started** in, so it would break if someone ran `node server.js` from inside `server/`. Combining with `import.meta.url` finds the file from **this file's** folder, wherever Node was started.
  - Writing the name in capitals is a common convention for a constant that is set once and used throughout a file.
- **`export function listBookmarks(request, response) { … }`** defines a **function** named `listBookmarks` with two parameters, the same `request` and `response` the server's handler receives. **`export`** makes it available to other files that `import` it.
- **`fs.readFileSync(DATA, 'utf8')`** reads the whole file and returns its contents. `'utf8'` says to decode the bytes as **UTF-8** text; without it you'd get the raw bytes. *Sync* means the program waits until the reading is done, which is fine for a small file.
- **`response.setHeader('Content-Type', 'application/json');`** sets a **header**: a line of information sent before the answer itself (the **body**). **`Content-Type`** tells the client what kind of data the body is, and **`application/json`** is the standard name for JSON.
- **`response.end(text);`** sends the file's text as the body and finishes the response.

Nothing calls `listBookmarks` yet, so `npm start` behaves exactly as before. The checks below call it directly, with a stand-in for `response` that prints what it receives.

```check
run "node --input-type=module -e \"const { listBookmarks } = await import('./server/routes.js'); listBookmarks({}, { setHeader() {}, end(s) { console.log(s); } });\"" stdout="https://neovim.io" label="listBookmarks sends the bookmarks file" -- Check the path: '../data/bookmarks.json', with import.meta.url as the second argument.
run "node --input-type=module -e \"const { listBookmarks } = await import('./server/routes.js'); listBookmarks({}, { setHeader(k, v) { console.log(k + ': ' + v); }, end() {} });\"" stdout="Content-Type: application/json" label="it says the body is JSON" -- The header line is response.setHeader('Content-Type', 'application/json');
```

## Route /api/bookmarks to it

Open `server/server.js` (`:e server/server.js`). Two additions:

1. With the cursor on line 1, press `o` and type the import line. Esc.
2. Move down (`j`) onto the `console.log(request.method, request.url);` line inside the handler. Press `o` and type the `if` block: Enter at the end of each line, no leading spaces. The closing `}` moves itself back out. Esc, `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { listBookmarks } from './routes.js';

// console.log('Shelf is starting');

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  console.log(request.method, request.url);
  if (request.url === '/api/bookmarks') {
    listBookmarks(request, response);
    return;
  }
  response.end(`Shelf is running on port ${port}\n`);
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`import { listBookmarks } from './routes.js';`** imports one exported function by name. The **braces** pick names out of the file's exports. **`./`** means "in the same folder as this file", and in an ES module the `.js` extension must be written out.
- **`if (condition) { … }`** runs the lines in its braces only when the condition is true.
- **`request.url === '/api/bookmarks'`** is true when the path asked for is exactly `/api/bookmarks`. **`===`** compares two values and is true only when they're the same type and the same value. (JavaScript also has `==`, which converts types before comparing and so gives surprises such as `0 == ''` being true; this series always uses `===`.)
- **`listBookmarks(request, response);`** **calls** the function, handing on the request and response.
- **`return;`** ends the handler there, so the line below it, which would send the plain-text answer, doesn't run for this path.

Start the server with `npm start`, and in the second terminal:

```zsh
curl -i http://localhost:3000/api/bookmarks
```

- **`-i`** (*include*) makes `curl` print the response's headers before the body. Among them is `Content-Type: application/json`, then a blank line, then the bookmarks: `[{"title":"Neovim","url":"https://neovim.io"}]`.
- `curl http://localhost:3000/hello` still gets the plain text: any other path skips the `if`.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="https://neovim.io" label="/api/bookmarks answers with the bookmarks" -- Check the import line, and that the path in the if is exactly '/api/bookmarks'.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/hello; kill $!); echo \"$out\"" stdout="Shelf is running on port 3917" label="other paths still get the plain-text answer" -- Keep the response.end line below the if block.
```

## What return is for

Each request may be answered **once**. Here's what happens without the `return`.

Put the cursor on the `return;` line and comment it out: {{key:I}}, `// `, {{key:esc}}, `:w`. Restart the server: Ctrl+C in its terminal, then `npm start`.

```predict
question: With return; commented out, you run curl http://localhost:3000/api/bookmarks. What happens?
choice: curl gets the bookmarks, and the server keeps running
choice: curl gets the bookmarks, then the server stops with an error
choice: curl gets the plain-text answer instead of the bookmarks
answer: curl gets the bookmarks, then the server stops with an error
explain: listBookmarks finishes the response, then the handler carries on to the response.end line below the if and tries to answer a second time. Node raises an error for that, nothing handles it, and the process ends.
```

Run the `curl`. The bookmarks arrive, and the server's terminal shows:

```text
Error [ERR_STREAM_WRITE_AFTER_END]: write after end
    at ServerResponse.end (node:_http_outgoing:…)
    at Server.<anonymous> (file:///…/shelf/server/server.js:14:12)
```

- **`write after end`**: something was sent on a response that had already ended.
- The first `at` line that names **your** file points at `server.js:14`, the plain-text `response.end` line: the second answer.
- The server has stopped, so the next `curl` fails with `Failed to connect`.

Restore the line with word motions: `:12` takes you to the `return` line (check with `:set number`), keeping the cursor's column. Press {{key:motion-b}} or {{key:motion-w}} until the cursor is on the first `/`: a word motion skips the indentation in one step. Then `x` three times deletes `// `. `:w`, then restart the server.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks > /dev/null; sleep 0.3; curl -s http://localhost:3917/hello; kill $!); echo \"$out\"" stdout="Shelf is running on port 3917" label="the server survives a request for /api/bookmarks" -- Uncomment the return; line inside the if block, so the handler stops after listBookmarks.
lacks server/server.js "// return;" label="return; is no longer commented out" -- Delete the // and the space in front of return; with x.
```

## Apply: rewrite the README by words

Shelf now has an API, so its description should say so. Open `README.md` and make line 3 read:

```markdown file=README.md
# Shelf

A small bookmark manager with a Node backend, a JSON API and a plain HTML, CSS and JavaScript frontend.
```

Move only with word motions (and `j` to reach the line):

- `jj` to line 3, {{key:motion-w}} to `bookmark`, then `i`, `small ` (with the space), Esc. The cursor is now on the space you typed.
- {{key:motion-e}} six times: `bookmark`, `manager`, `with`, `a`, `Node`, `backend`. The cursor is on the `d` of `backend`.
- `a`, `, a JSON API` (starting with the comma), Esc, `:w`.

With `l` alone the second move would have taken 36 presses.

```check
run "sed -n 3p README.md | grep -Fqx 'A small bookmark manager with a Node backend, a JSON API and a plain HTML, CSS and JavaScript frontend.'" label="README line 3 describes the API" -- Compare your line 3 with the one in the lesson, character by character: commas and spaces included.
run "head -n 1 README.md | grep -qx '# Shelf'" label="the heading is unchanged" -- Line 1 should still be # Shelf.
```

## Drill: forward by words

Click **Fresh copy of practice/drills/08-words.txt**, open it, and add `own ` so that the line reads `Shelf keeps your own bookmarks.`

```text file=practice/drills/08-words.txt provided
Shelf keeps your bookmarks.
```

Par 9: {{key:motion-w}} three times lands on `bookmarks`, then {{key:i}}, `own ` and {{key:esc}}. (Reaching the end of `your` and appending with {{key:a}} also makes 9.)

```check
run "sed -n 1p practice/drills/08-words.txt | grep -Fqx 'Shelf keeps your own bookmarks.'" label="line 1 reads Shelf keeps your own bookmarks." -- Click Fresh copy of practice/drills/08-words.txt and try again.
run "test $(wc -l < practice/drills/08-words.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/08-words.txt and try again.
keys practice/drills/08-words.txt par=9
```

## Drill: to the end of a word

Click **Fresh copy of practice/drills/09-end.txt**, open it, and make `bookmark` plural.

```text file=practice/drills/09-end.txt provided
Shelf keeps bookmark safe.
```

Par 6: {{key:motion-e}} three times reaches the last letter of `bookmark`; then {{key:a}}, `s`, {{key:esc}}.

```check
run "sed -n 1p practice/drills/09-end.txt | grep -Fqx 'Shelf keeps bookmarks safe.'" label="line 1 reads Shelf keeps bookmarks safe." -- Click Fresh copy of practice/drills/09-end.txt and try again.
run "test $(wc -l < practice/drills/09-end.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/09-end.txt and try again.
keys practice/drills/09-end.txt par=6
```

## Drill: back by words

Click **Fresh copy of practice/drills/10-back.txt**, open it, and make it valid JavaScript: `const name = 'Shelf';`

```text file=practice/drills/10-back.txt provided
const name = Shelf
```

Par 9. Do the end first: {{key:A}}, `';`, {{key:esc}} leaves the cursor on the `;`. Then {{key:motion-b}} twice: once to the start of the punctuation word `';`, once to the `S` of `Shelf`. Finish with {{key:i}}, `'`, {{key:esc}}. Doing the front first costs one more, because reaching `Shelf` from the start of the line takes three {{key:motion-w}} presses.

```check
run "sed -n 1p practice/drills/10-back.txt | grep -Fqx \"const name = 'Shelf';\"" label="line 1 reads const name = 'Shelf';" -- Click Fresh copy of practice/drills/10-back.txt and try again.
run "test $(wc -l < practice/drills/10-back.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/10-back.txt and try again.
keys practice/drills/10-back.txt par=9
```

## Review: a line above, a wrong letter

Click **Fresh copy of practice/review/02-01.txt**. Add `one` as a new first line, and fix the last letter of `threa`. Recall the keys before hovering.

```text file=practice/review/02-01.txt provided
two
threa
```

Par 11: {{key:O}}, `one`, {{key:esc}} (5); then {{key:j}} twice. Moving down keeps the cursor's column, which leaves it two characters from the `a`, so {{key:l}} twice, and {{key:r}} with `e` (6).

```check
run "sed -n 1p practice/review/02-01.txt | grep -qx 'one'" label="line 1 reads one" -- Click Fresh copy of practice/review/02-01.txt and try again.
run "sed -n 2p practice/review/02-01.txt | grep -qx 'two'" label="line 2 reads two" -- Click Fresh copy of practice/review/02-01.txt and try again.
run "sed -n 3p practice/review/02-01.txt | grep -qx 'three'" label="line 3 reads three" -- Click Fresh copy of practice/review/02-01.txt and try again.
run "test $(wc -l < practice/review/02-01.txt) -eq 3" label="it has 3 lines" -- A line was added or removed. Click Fresh copy of practice/review/02-01.txt and try again.
keys practice/review/02-01.txt par=11
```

## Your turn: don't keep a stale copy

Browsers, and some machines between a browser and a server, may keep a copy of a response (**cache** it) and reuse that copy instead of asking again. For a bookmark list that changes whenever someone adds a bookmark, a stale copy is wrong. A header tells every client not to keep one:

```text
Cache-Control: no-store
```

**Build, on your own:** make `/api/bookmarks` send that header as well as `Content-Type`, with the same capital letters. Decide which file and which line it belongs next to, and open the new line without moving first if you can. Confirm with `curl -i http://localhost:3000/api/bookmarks`.

```hints
nudge: Headers are set in the handler, before the body is sent. The handler for this path is listBookmarks, in server/routes.js.
concept: response.setHeader(name, value) sets one header and can be called several times. Every header must be set before response.end, which sends the headers and then the body.
shape: One new line in listBookmarks, opened with o on the Content-Type line: a second setHeader call with 'Cache-Control' and 'no-store'.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -D - -o /dev/null http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="Cache-Control: no-store" label="/api/bookmarks sends Cache-Control: no-store" -- Add response.setHeader('Cache-Control', 'no-store'); inside listBookmarks, above response.end.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -D - -o /dev/null http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="Content-Type: application/json" label="it still says the body is JSON" -- Add the new header on a line of its own; keep the Content-Type line.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="https://neovim.io" label="the bookmarks still arrive" -- A header set after response.end makes Node throw an error. Set it before.
```

The checks establish that the header arrives, the old one is kept and the body still comes. They do not prove that any browser obeys it; for a server you write, sending the right header is the part you control.

### What you have

```text
server/routes.js   listBookmarks: the bookmarks file as JSON, never cached
server/server.js   /api/bookmarks goes to listBookmarks; other paths get plain text
README.md          mentions the JSON API
```

| Keys | Moves to |
|---|---|
| `w` / `b` | start of the next word / back to a word's start |
| `e` / `ge` | end of the word / end of the previous word |

Next: bigger steps (WORDs, which ignore punctuation) and the two ends of a line.
