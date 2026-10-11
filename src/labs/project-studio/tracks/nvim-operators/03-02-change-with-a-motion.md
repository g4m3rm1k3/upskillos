---
title: 3.2 — Change with a Motion: c, cc and C
runtime: none
---

Most edits aren't pure deletes. You remove something and type its replacement: a better name, a different number, new wording. The **change** operator, `c`, does both in one command: it deletes what the motion crosses, exactly as `d` would, and leaves you in Insert mode to type the new text.

- In VS Code you'd double-click a word (or select it with Shift and the arrows) and start typing. `c` with a motion is that, without the selecting.
- Everything you learned about `d` carries over: the same motions, the same counts, the same rule about which characters a motion takes.

Shelf answers every path it doesn't know with "Shelf is running on port 3000", which tells a browser the page exists. This lesson makes unknown paths answer **404 Not Found**.

## The change operator: c and a motion

Type `c`, then a motion. The text goes, and you're in Insert mode where it was. Type the replacement, then Esc.

| Keys | Changes |
|---|---|
| `cw` | to the end of this word (see below) |
| `ce` | to the end of this word |
| `cb` | back to the start of the word |
| `c$` | to the end of the line |
| `ct'` | up to the next `'`, which stays |
| `cf)` | up to and including the next `)` |
| `c2w` | two words |

- **`cw` is a special case.** It behaves like `ce`: it changes to the end of the word and keeps the space after it. (`dw` takes the space.) When you change a word you almost always want a space before the next one, so Vim has always worked this way.
- A change, the typing included, is **one** step for `u`: undo takes back the whole replacement at once, and the old text returns.

## Whole lines: cc and C

| Keys | Changes |
|---|---|
| `cc` | the whole line, keeping its indentation |
| `C` | from the cursor to the end of the line: a shorter `c$` |

- `cc` is "retype this line". Because it keeps the indentation, what you type lines up with the code around it.
- `C` is for "the start of this line is right, the rest is wrong".

## Apply: not found, with c and a count

A web server's answer begins with a **status code**: a three-digit number saying how the request went, before any headers or body.

- **`200`** means OK. Node sends it unless the code says otherwise, which is why every Shelf answer so far has been 200.
- **`404`** means Not Found: there's nothing at this path.
- The practice file in lesson 2.4 had a list of others. `curl -i` shows the code on its first line: `HTTP/1.1 200 OK`.

Open `server/server.js`. Line 20 is the answer for every path no `if` matched. Change its wording first:

- `20G`, then `^`: after a line jump the cursor keeps its column, so `^` puts it at a known place, the `r` of `response`.
- `fS` lands on the `S` of `Shelf`.
- `c2t$` changes up to just before the **second** `$` on the line. The first is the `$` of `${port}`; the second is the `$` of `${request.url}`, which stays. Type `Not found: ` (with the space), Esc.

Then the status code, on a new line above it: `O`, `response.statusCode = 404;`, Esc. `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { listBookmarks, health, countBookmarks } from './routes.js';

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  console.log(new Date().toISOString(), request.method, request.url);
  if (request.url === '/api/bookmarks') {
    listBookmarks(request, response);
    return;
  }
  if (request.url === '/api/health' || request.url === '/health') {
    health(request, response);
    return;
  }
  if (request.url === '/api/bookmarks/count') {
    countBookmarks(request, response);
    return;
  }
  response.statusCode = 404;
  response.end(`Not found: ${request.url}\n`);
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`response.statusCode = 404;`** sets the code this response will send. It has to come **before** `response.end`, because the status line goes out first.
- **`` `Not found: ${request.url}\n` ``** still puts the path that was asked for into the answer, so whoever reads it can see which path was wrong.
- `cc` would also have worked on line 20, but you'd have retyped the whole line. `c2t$` kept the parts that were still right.

Restart the server and `curl -i http://localhost:3000/nope`. The first line is `HTTP/1.1 404 Not Found`, and the body `Not found: /nope`.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -o /dev/null -w '%{http_code}' http://localhost:3917/nope; kill $!); echo \"$out\"" stdout="404" label="an unknown path gets status 404" -- Add response.statusCode = 404; on its own line, above the response.end line.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/nope; kill $!); echo \"$out\"" stdout="Not found: /nope" label="the answer says Not found: /nope" -- From the S of Shelf, c2t$ changes up to the ${request.url}, which stays. Type Not found: and a space.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -o /dev/null -w '%{http_code}' http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="200" label="/api/health still gets status 200" -- The status line belongs just above the last response.end, after every if block, so it only applies to paths none of them matched.
```

```predict
question: Now curl -i http://localhost:3000/ — the plain address, with nothing after the slash. What comes back?
choice: HTTP/1.1 200 OK and Shelf is running on port 3000
choice: HTTP/1.1 404 Not Found and Not found: /
choice: Nothing: the server stops
answer: HTTP/1.1 404 Not Found and Not found: /
explain: No if block checks for /, so it falls through to the end of the handler like any unknown path. / used to get the "Shelf is running" answer only because every path got it. You'll give it its own answer at the end of this lesson.
```

## A change from the middle of a word

`cw` changes from the **cursor** to the end of the word, not the whole word. Started from the middle, it keeps the first half. Try it on purpose:

- On line 2, the import, `fB` lands on the `B` in the middle of `listBookmarks`.
- `cw`, then type `listBookmarks`, Esc. The line reads `import { listlistBookmarks, health, countBookmarks } from './routes.js';`.
- `:w`, then restart the server.

Node refuses to start:

```text
SyntaxError: The requested module './routes.js' does not provide an export named 'listlistBookmarks'
```

- **The symptom**: a name that's almost right, with part of it doubled.
- **The cause**: `cw` started from the `B`, so `list` stayed and the typed name went after it.
- **The fix** for next time: get to the start of the word first (`b`, or a find), then `cw`. Chapter 4 adds a change that takes the whole word wherever the cursor is in it.

Press `u` once. The whole change goes, the typing included, and `listBookmarks` is back. `:w`, and start the server again.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31" label="the server starts and answers again" -- Line 2 should import listBookmarks, health and countBookmarks. Press u until it does, then :w.
```

## Drill: change a word

Click **Fresh copy of practice/drills/25-change-word.txt**, open it, and change `port` to `3000`.

```text file=practice/drills/25-change-word.txt provided
server.listen(port, () => {
```

Par 9: {{key:find}} with `p` lands on `port` (there's no earlier `p`); {{key:change}} with {{key:motion-w}} changes the word and keeps the comma; then `3000` and {{key:esc}}.

```check
run "sed -n 1p practice/drills/25-change-word.txt | grep -Fqx 'server.listen(3000, () => {'" label="line 1 reads server.listen(3000, () => {" -- Click Fresh copy of practice/drills/25-change-word.txt and try again.
run "test $(wc -l < practice/drills/25-change-word.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/25-change-word.txt and try again.
keys practice/drills/25-change-word.txt par=9
```

## Drill: change to the end of the line

Click **Fresh copy of practice/drills/26-change-to-end.txt**, open it, and make it `const port = 8080;`.

```text file=practice/drills/26-change-to-end.txt provided
const port = process.env.PORT || 3000;
```

Par 9: {{key:motion-w}} with a count of 3 lands on `process`, {{key:C}} changes from there to the end, then `8080;` and {{key:esc}}. (A find with `p` would stop on the `p` of `port`.)

```check
run "sed -n 1p practice/drills/26-change-to-end.txt | grep -Fqx 'const port = 8080;'" label="line 1 reads const port = 8080;" -- Click Fresh copy of practice/drills/26-change-to-end.txt and try again.
run "test $(wc -l < practice/drills/26-change-to-end.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/26-change-to-end.txt and try again.
keys practice/drills/26-change-to-end.txt par=9
```

## Drill: change a whole line

Click **Fresh copy of practice/drills/27-change-line.txt**, open it, and replace line 2 with `listen();`, keeping its indentation.

```text file=practice/drills/27-change-line.txt provided
function start() {
  console.log('starting')
}
```

Par 13: {{key:j}}, then {{key:cc}}: the line empties but keeps its two spaces. `listen();` and {{key:esc}}.

```check
run "sed -n 2p practice/drills/27-change-line.txt | grep -Fqx '  listen();'" label="line 2 reads   listen(); with two spaces in front" -- Click Fresh copy of practice/drills/27-change-line.txt and try again.
run "test $(wc -l < practice/drills/27-change-line.txt) -eq 3" label="it has 3 lines" -- A line was added or removed. Click Fresh copy of practice/drills/27-change-line.txt and try again.
keys practice/drills/27-change-line.txt par=13
```

## Drill: change up to a character

Click **Fresh copy of practice/drills/28-change-till.txt**, open it, and make it `response.end('Not found');`.

```text file=practice/drills/28-change-till.txt provided
response.end('Shelf is running');
```

Par 15: {{key:find}} with `S`, then {{key:change}} with {{key:till}} and `'`: `ct'` changes the three words and keeps the closing quote. Then `Not found` and {{key:esc}}.

```check
run "sed -n 1p practice/drills/28-change-till.txt | grep -Fqx \"response.end('Not found');\"" label="line 1 reads response.end('Not found');" -- Click Fresh copy of practice/drills/28-change-till.txt and try again.
run "test $(wc -l < practice/drills/28-change-till.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/28-change-till.txt and try again.
keys practice/drills/28-change-till.txt par=15
```

## Review: a duplicate call and a wrong number

Click **Fresh copy of practice/review/03-02.txt**. Delete the second `start();`, and make line 3 log `3` instead of `2`. Recall the keys before hovering.

```text file=practice/review/03-02.txt provided
function start() {
  console.log(1);
  console.log(2);
}
start();
start();
```

Par 9: {{key:G}}, then {{key:dd}} (3). Then {{key:G}} with a count, `3G`, or {{key:k}} twice: either way the cursor stays in the first column. {{key:find}} with `2`, and {{key:r}} with `3` (6).

```check
run "sed -n 3p practice/review/03-02.txt | grep -Fqx '  console.log(3);'" label="line 3 reads   console.log(3);" -- Click Fresh copy of practice/review/03-02.txt and try again.
run "sed -n 5p practice/review/03-02.txt | grep -Fqx 'start();'" label="line 5 is still start();" -- Click Fresh copy of practice/review/03-02.txt and try again.
run "test $(wc -l < practice/review/03-02.txt) -eq 5" label="it has 5 lines" -- One line should go. Click Fresh copy of practice/review/03-02.txt and try again.
keys practice/review/03-02.txt par=9
```

## Your turn: an answer for /

**Build, on your own:** give `/` its own answer again: status 200 and `Shelf is running on port 3000` (with the real port, from `port`), followed by a newline. Every other unknown path must still get the 404.

Decide where the new check goes, so that `/` never reaches the 404 lines, and how the handler stops after answering.

```hints
nudge: `/` needs an `if` block of its own, like the three above it.
concept: The handler runs from top to bottom. An `if` block that answers and then returns stops it there, so the 404 lines below never run for that path. The 404 must stay last.
shape: Above the `response.statusCode` line (`O` opens a line above): an `if` block testing `request.url === '/'`, whose body is `response.end` with a template string using `${port}` and `\n`, then `return;`.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -o /dev/null -w '%{http_code}' http://localhost:3917/; kill $!); echo \"$out\"" stdout="200" label="/ gets status 200" -- The if block for / must come before response.statusCode = 404;, and end with return;
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/; kill $!); echo \"$out\"" stdout="Shelf is running on port 3917" label="/ answers Shelf is running on port 3917" -- Use a template string with ${port}, so that the real port appears.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -o /dev/null -w '%{http_code}' http://localhost:3917/nope; kill $!); echo \"$out\"" stdout="404" label="/nope still gets status 404" -- Keep the 404 lines at the end of the handler, after every if block.
```

The checks establish the status code and the text for `/` and for one unknown path. They don't check that the answer ends with a newline: run `curl http://localhost:3000/` and see whether your shell's prompt starts on a new line after it.

### What you have

```text
server/server.js   / answers "Shelf is running"; unknown paths get 404 Not found
```

| Keys | Changes |
|---|---|
| `c` and a motion | from the cursor to where the motion goes, then Insert mode: `cw`, `ct'`, `c2t$` |
| `cc` | the whole line, keeping its indentation |
| `C` | to the end of the line |

Next: copying and pasting, Neovim's way. Shelf's chain of `if` blocks becomes a table.
