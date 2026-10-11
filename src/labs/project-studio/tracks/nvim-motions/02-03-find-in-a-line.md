---
title: 2.3 — Jump to a Character: f, t, F, T, ; and ,
runtime: none
---

Word motions count their way along a line. Often you can **see** where you want to go: the `(`, the `}`, the quote. The keys in this lesson go straight there: you name the character, and the cursor jumps to it. They're the fastest way to move within a line, and with chapter 3's operators they become the most precise way to edit one ("change everything up to the comma").

Shelf's log gets timestamps, and its health check reports how long the server has been running.

## Find a character: f and t

In Normal mode:

| Keys | Moves to |
|---|---|
| `f` then a character | **onto** the next occurrence of that character on this line (*find*) |
| `t` then a character | to just **before** it (*till*) |
| `F` then a character | onto the previous occurrence, searching backwards |
| `T` then a character | to just after the previous occurrence |

- They search **only the current line**. If the character isn't there, the cursor doesn't move.
- The character can be anything you can type: `f(`, `f'`, `f ` (a space), `f,`.
- Aim for **rare** characters. On `server.listen(port, () => {`, `f(` reaches the first `(` in two keys; `fp` would stop at the `p` of `port`… or any earlier `p`.
- VS Code has no single key for this. It's closest to Ctrl+F, limited to one line, and you never leave the keyboard.

## Repeat the find: ; and ,

- **`;`** repeats the last `f`, `t`, `F` or `T` in the same direction.
- **`,`** repeats it in the **opposite** direction, for when you went one too far.

So on a line with several commas, `f,` reaches the first and each `;` the next one.

```predict
question: The cursor is on the c at the start of console.log(request.method, request.url);. You type f. and then ;. Where is the cursor?
choice: On the . between console and log
choice: On the . in request.method
choice: On the . in request.url
answer: On the . in request.method
explain: f. lands on the first . on the line, the one in console.log. ; repeats the same find from there, which reaches the next ., in request.method.
```

Try it on that line of `server/server.js` (line 9), then press `,` to go back one.

## Apply: timestamps in the log, with f( and a

When something goes wrong on a server, the first question is "when?". Make each log line start with the date and time.

On line 9, `console.log(request.method, request.url);`:

- `:9`, then `^`. A find only searches to the **right** of the cursor, and `:9` keeps the column the cursor had, so start from the beginning of the line.
- `f(`: the cursor is on the `(` after `log`.
- `a`, then `new Date().toISOString(), ` (ending with a comma and a space), Esc. `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { listBookmarks, health } from './routes.js';

// console.log('Shelf is starting');

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
  response.end(`Shelf is running on port ${port}\n`);
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`new Date()`** creates a **Date** object holding the current moment. `new` creates an object from a **class**, a blueprint for a kind of object; here it's enough that `new Date()` means "now".
- **`.toISOString()`** turns it into text in the **ISO 8601** format, such as `2026-10-11T14:04:33.941Z`: year, month, day, `T`, then hours, minutes, seconds and milliseconds. The `Z` means the time is in **UTC**, the same everywhere in the world, so logs from servers in different places line up. Text in this format also sorts in time order.

Restart the server and `curl http://localhost:3000/hello`: the log line reads like `2026-10-11T14:04:33.941Z GET /hello`.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/hello > /dev/null; sleep 0.3; kill $!); echo \"$out\"" stdout="Z GET /hello" label="each log line starts with an ISO timestamp" -- Put new Date().toISOString(), as the first thing inside console.log's parentheses.
```

## Apply: uptime, with t} and i

In `server/routes.js`, line 14 is `response.end(JSON.stringify({ ok: true, name: 'shelf' }));`. Add an `uptime` value:

- `:14`, `^`, then `t}`: the cursor stops on the space **before** the `}`.
- `i`, then `, uptime: process.uptime()`, Esc. `:w`.

Typing with `i` on that space puts the new text before it, so the space stays between your text and the `}`. With `f}` the cursor would be on the `}` itself, and `i` would put your text after the space.

```javascript file=server/routes.js
import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

export function listBookmarks(request, response) {
  const text = fs.readFileSync(DATA, 'utf8');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(text);
}

export function health(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ ok: true, name: 'shelf', uptime: process.uptime() }));
}
```

- **`process.uptime()`** returns how many seconds the Node process has been running, as a number with a fraction, such as `12.48`. A monitoring tool can tell from it that a server restarted: the number goes back down.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="\"uptime\":" label="/api/health reports the uptime" -- Add , uptime: process.uptime() just before the } of the object.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="{\"ok\":true,\"name\":\"shelf\"," label="ok and name are still there" -- Insert the new pair after name: 'shelf', with a comma in between.
```

## A method that isn't called

`process.uptime()` ends with `()`. Here's what happens without them.

On line 14: `$` goes to the end, then `F(` searches **backwards** for a `(` and finds the last one on the line, the `(` of `uptime()`. Press `x` twice to delete `()`. `:w`, and restart the server.

```predict
question: The object now has uptime: process.uptime, with no parentheses. What does curl http://localhost:3000/api/health print?
choice: {"ok":true,"name":"shelf","uptime":12.48} as before
choice: {"ok":true,"name":"shelf"} with no uptime at all
choice: An error, because uptime is not a number
answer: {"ok":true,"name":"shelf"} with no uptime at all
explain: Without (), process.uptime is the function itself, not the number it returns. JSON has no way to write a function, so JSON.stringify leaves that pair out, silently.
```

Run the `curl`. The `uptime` is gone, and nothing reported an error. A **function** is a value too: `process.uptime` names it, and **`()`** calls it. That makes this mistake easy to make, and you only find it by reading the output.

Put the parentheses back with `u` twice (each `x` was one change), `:w`, and restart.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="\"uptime\":" label="the uptime is back" -- Undo the two x's with u, or type () after process.uptime again.
```

## Drill: find a character

Click **Fresh copy of practice/drills/14-find.txt**, open it, and put the missing `:` after `http`, so that the address reads `http://localhost:3000`.

```text file=practice/drills/14-find.txt provided
const url = 'http//localhost:3000';
```

Par 5: {{key:find}} with `/` lands on the first slash, then {{key:i}}, `:`, {{key:esc}}.

```check
run "sed -n 1p practice/drills/14-find.txt | grep -Fqx \"const url = 'http://localhost:3000';\"" label="line 1 reads const url = 'http://localhost:3000';" -- Click Fresh copy of practice/drills/14-find.txt and try again.
run "test $(wc -l < practice/drills/14-find.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/14-find.txt and try again.
keys practice/drills/14-find.txt par=5
```

## Drill: find, and find again

Click **Fresh copy of practice/drills/15-again.txt**, open it, and replace both semicolons with commas.

```text file=practice/drills/15-again.txt provided
{ name: 'Shelf'; port: 3000; debug: false }
```

Par 7: {{key:find}} with `;`, then {{key:r}} with `,`; then {{key:repeat-find}} reaches the second semicolon, and {{key:r}} with `,` again.

```check
run "sed -n 1p practice/drills/15-again.txt | grep -Fqx \"{ name: 'Shelf', port: 3000, debug: false }\"" label="line 1 reads { name: 'Shelf', port: 3000, debug: false }" -- Click Fresh copy of practice/drills/15-again.txt and try again.
run "test $(wc -l < practice/drills/15-again.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/15-again.txt and try again.
keys practice/drills/15-again.txt par=7
```

## Drill: just before a character

Click **Fresh copy of practice/drills/16-till.txt**, open it, and delete the stray space before the comma.

```text file=practice/drills/16-till.txt provided
{ health: true , bookmarks: true }
```

Par 3: {{key:till}} with `,` stops on the space just before the comma, and {{key:x}} deletes it. With {{key:find}} you'd land on the comma and need a step back.

```check
run "sed -n 1p practice/drills/16-till.txt | grep -Fqx '{ health: true, bookmarks: true }'" label="line 1 reads { health: true, bookmarks: true }" -- Click Fresh copy of practice/drills/16-till.txt and try again.
run "test $(wc -l < practice/drills/16-till.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/16-till.txt and try again.
keys practice/drills/16-till.txt par=3
```

## Drill: find backwards

Click **Fresh copy of practice/drills/17-back.txt**, open it, and fix both lines: each needs a `;` at the end, and the address on line 2 shouldn't end with a `/`.

```text file=practice/drills/17-back.txt provided
const port = process.env.PORT || 3000
fetch('/api/bookmarks/')
```

The fixed file reads:

```text
const port = process.env.PORT || 3000;
fetch('/api/bookmarks');
```

Par 10: {{key:A}}, `;`, {{key:esc}} on line 1, then {{key:j}}, which keeps the column as far as line 2 allows, so the cursor lands on its last character. Then {{key:a}}, `;`, {{key:esc}}; the cursor is on the new `;`. {{key:find-back}} with `/` finds the last slash, and {{key:x}} deletes it.

```check
run "sed -n 1p practice/drills/17-back.txt | grep -Fqx 'const port = process.env.PORT || 3000;'" label="line 1 reads const port = process.env.PORT || 3000;" -- Click Fresh copy of practice/drills/17-back.txt and try again.
run "sed -n 2p practice/drills/17-back.txt | grep -Fqx \"fetch('/api/bookmarks');\"" label="line 2 reads fetch('/api/bookmarks');" -- Click Fresh copy of practice/drills/17-back.txt and try again.
run "test $(wc -l < practice/drills/17-back.txt) -eq 2" label="it has 2 lines" -- A line was added or removed. Click Fresh copy of practice/drills/17-back.txt and try again.
keys practice/drills/17-back.txt par=10
```

## Review: a line by number, both ends

Click **Fresh copy of practice/review/02-03.txt**. On line 12, replace the capital `P` with a lowercase `p` and the `:` at the end with a `;`, keeping the indentation. Recall the keys before hovering.

```text file=practice/review/02-03.txt provided
# Shelf settings
name = shelf
version = 0.1.0
host = localhost
log = true
color = auto
timeout = 30
retries = 3
cache = off
theme = light
lang = en
  Port = 3000:
mode = dev
```

Par 10: {{key:line}} with 12 (4 keys, Enter included). Neovim keeps the cursor in the first column, before the spaces, so {{key:first-char}}, then {{key:r}} with `p`; {{key:line-end}}, then {{key:r}} with `;`.

```check
run "sed -n 12p practice/review/02-03.txt | grep -Fqx '  port = 3000;'" label="line 12 reads   port = 3000;" -- Click Fresh copy of practice/review/02-03.txt and try again.
run "sed -n 11p practice/review/02-03.txt | grep -Fqx 'lang = en'" label="line 11 is unchanged" -- Click Fresh copy of practice/review/02-03.txt and try again.
run "test $(wc -l < practice/review/02-03.txt) -eq 13" label="it has 13 lines" -- A line was added or removed. Click Fresh copy of practice/review/02-03.txt and try again.
keys practice/review/02-03.txt par=10
```

## Your turn: say what was asked for

Any path Shelf has no route for gets `Shelf is running on port 3000`. That doesn't tell someone who mistyped a path what went wrong.

**Build, on your own:** make that answer also name the path that was asked for. A request for `/hello` should get:

```text
Shelf is running on port 3000. You asked for /hello
```

still ending with a newline. Decide which character on that line to jump to with a find, and whether to land on it or just before it.

```hints
nudge: The plain-text answer is the response.end line near the end of the handler. The new words go between the port number and the newline.
concept: The string is a template literal, so `${request.url}` inside it is replaced by the path, as `${port}` is. `\n` is two characters, a backslash and an n, and `f\` jumps to the backslash.
shape: On the response.end line, `f\` then `i`, and type `. You asked for ${request.url}`, so the string becomes `Shelf is running on port ${port}. You asked for ${request.url}\n`.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/hello; kill $!); echo \"$out\"" stdout="Shelf is running on port 3917. You asked for /hello" label="a request for /hello is told what it asked for" -- Insert . You asked for ${request.url} before the \n in the response text.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/somewhere/else; kill $!); echo \"$out\"" stdout="You asked for /somewhere/else" label="the path comes from the request, not typed in" -- Use ${request.url}, not the text /hello, so every path is named.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" without="You asked for" label="routes that have a handler are unaffected" -- Only change the last response.end, below the if blocks.
```

The checks establish the message for two paths and that real routes skip it. They do not show the newline is still there: run `curl http://localhost:3000/hello` and check that your prompt starts on a line of its own.

### What you have

```text
server/server.js   timestamped log lines; unknown paths are told what they asked for
server/routes.js   health reports ok, name and uptime
```

| Keys | Moves to |
|---|---|
| `f`/`F` + character | onto the next / previous one on the line |
| `t`/`T` + character | just before / just after it |
| `;` / `,` | the next match / back the other way |

Next: jumping through a whole file: top and bottom, blocks of lines, matching brackets, and counts.
