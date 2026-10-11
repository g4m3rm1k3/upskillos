---
title: 2.2 — WORDs and the Ends of a Line: W, B, E, 0, ^ and $
runtime: none
---

Word motions stop at every piece of punctuation, which is precise but slow on a line such as `response.setHeader('Content-Type', 'application/json');`. This lesson adds bigger steps, **WORDs**, which treat everything between spaces as one, and three keys for the two ends of a line. Shelf gets a second route, `/api/health`, which programs that watch a server use to ask "are you up?".

## WORDs: W, B and E

A **WORD** (written in capitals to tell it apart) is **any run of non-blank characters**. Only spaces and tabs separate WORDs; punctuation doesn't.

- `process.env.PORT` is five words but **one** WORD.
- `http://localhost:${port}` is one WORD.
- `'Content-Type',` (quote, name, quote, comma) is one WORD.

The WORD motions are the capital versions of the word motions:

| Key | Moves to |
|---|---|
| `W` | the start of the next WORD |
| `B` | back to the start of a WORD |
| `E` | the end of a WORD |

(`gE`, the WORD version of `ge`, exists too.) Here is where `W` stops on a line from `routes.js`, from its first character:

```text
response.setHeader('Content-Type', 'application/json');
^                                  ^
```

Two stops, where `w` would make thirteen. Use `W` to cross long stretches of punctuation-heavy code, and `w` when you need to land inside one.

```predict
question: The cursor is on the r at the start of the line above. How many times do you press E to reach the ; at the very end?
answer: 2
explain: The line has two WORDs, separated by the one space. The first E goes to the end of the first WORD (the comma after 'Content-Type'), the second to the end of the second, which is the ;.
verify: printf "response.setHeader('Content-Type', 'application/json');\n" > .verify.txt && "$NVIM_BIN" --clean --headless .verify.txt -c "lua local n = 0; while vim.fn.col('.') ~= vim.fn.col('$') - 1 do vim.cmd('normal! E'); n = n + 1 end; io.stdout:write(n .. '\n')" -c 'qa!'; rm -f .verify.txt
```

## The ends of a line: 0, ^ and $

| Key | Moves to |
|---|---|
| `0` | the first column of the line (zero) |
| `^` | the first non-blank character, after any indentation |
| `$` | the last character of the line |

- On an indented line such as `  response.end(text);`, `0` lands on the first space and `^` on the `r`. You almost always want `^`.
- In VS Code, Home and End do this job. Neovim accepts them, but they're away from the letters, so **a drill counts Home and End as arrow keys**, and fails.
- Compare chapter 1's {{key:I}} and {{key:A}}: they move to the start or end **and** enter Insert mode. `^` and `$` only move, so you can follow them with anything: `x` to delete the last character, `r` to replace the first, or `h` and then `i` to type just before the end.

## Apply: a charset, from the end of a line

The bookmarks are sent as `application/json`. JSON is always UTF-8 text, but a browser showing the response directly doesn't always assume so, and a title with an accent or an emoji in it then comes out garbled. Saying so explicitly is the safe habit: `application/json; charset=utf-8`.

Open `server/routes.js`. The `Content-Type` line is line 7 (`:set number` shows it). Then:

- `:7`, then `$`: the cursor is on the `;` at the end.
- {{key:motion-b}}: back to the start of the word `');`, which is the quote that closes the string.
- `i`, then `; charset=utf-8`, Esc. Typing before the closing quote puts the text inside the string. `:w`.

```javascript file=server/routes.js
import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

export function listBookmarks(request, response) {
  const text = fs.readFileSync(DATA, 'utf8');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(text);
}
```

- **`charset=utf-8`** is a **parameter** of the content type, after a `;`: the character set (*charset*) the text is encoded in.
- `curl -s -o /dev/null -w '%{content_type}\n' http://localhost:3000/api/bookmarks` prints just the content type: `-o /dev/null` throws the body away, and `-w` (*write out*) prints the named detail of the response. Restart the server first: Node reads `routes.js` only when it starts.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -o /dev/null -w '%{content_type}' http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="application/json; charset=utf-8" label="/api/bookmarks says its JSON is UTF-8" -- The type should read 'application/json; charset=utf-8', all inside one pair of quotes.
```

## A health handler

Monitoring tools, and the machines that run servers in production, regularly ask a server whether it's alive. By convention they ask a path such as `/api/health`, and expect a quick, small answer. Shelf's says `{"ok":true}`.

In `server/routes.js`, go to the last line (`:10`, the closing `}` of `listBookmarks`), press `o`, press Enter once more for a blank line, and type the new function. Esc, `:w`.

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
  response.end(JSON.stringify({ ok: true }));
}
```

- **`{ ok: true }`** is a JavaScript **object**: named values in braces, each name followed by a colon and its value. Unlike JSON, JavaScript doesn't need quotes around the names. **`true`** is a **boolean**, one of the two values `true` and `false`.
- **`JSON.stringify(value)`** turns a JavaScript value into JSON text: `{"ok":true}`, with the quotes JSON requires and no spaces. `response.end` sends text, not objects, so the object has to become text first.

```check
run "node --input-type=module -e \"const { health } = await import('./server/routes.js'); health({}, { setHeader() {}, end(s) { console.log(s); } });\"" stdout="{\"ok\":true}" label="health sends {\"ok\":true}" -- Check the line response.end(JSON.stringify({ ok: true }));
```

## Route /api/health, and a missing import

Open `server/server.js`. Put the cursor on the `}` that closes the `/api/bookmarks` block (line 13), press `o`, and type the new block. Esc, `:w`.

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
  if (request.url === '/api/health') {
    health(request, response);
    return;
  }
  response.end(`Shelf is running on port ${port}\n`);
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

Something is missing on purpose. Restart the server (Ctrl+C, `npm start`).

```predict
question: The server starts. What happens when you run curl http://localhost:3000/api/health?
choice: curl prints {"ok":true}
choice: The server stops with ReferenceError: health is not defined
choice: The server refused to start in the first place
answer: The server stops with ReferenceError: health is not defined
explain: health is exported from routes.js, but server.js imports only listBookmarks. The name health doesn't exist in server.js, and, as with respnse in 1.4, that is discovered only when the line runs, which is when the request arrives.
```

Run the `curl`. The server's terminal shows `ReferenceError: health is not defined`, at `server.js:15`. An export only offers a name; each file that uses it has to import it.

## Apply: fix the import with W and E

Line 2 reads `import { listBookmarks } from './routes.js';`. Add `, health` after `listBookmarks`:

- `:2`, then `0`: Neovim keeps the cursor's column when it changes lines, so start from the first column.
- {{key:motion-W}} twice: the first stops on `{`, the second on `listBookmarks`.
- {{key:motion-E}}: the end of that WORD, the `s`.
- `a`, `, health`, Esc, `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { listBookmarks, health } from './routes.js';

// console.log('Shelf is starting');

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  console.log(request.method, request.url);
  if (request.url === '/api/bookmarks') {
    listBookmarks(request, response);
    return;
  }
  if (request.url === '/api/health') {
    health(request, response);
    return;
  }
  response.end(`Shelf is running on port ${port}\n`);
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`{ listBookmarks, health }`**: several names are imported in one pair of braces, separated by commas.

Restart the server; `curl http://localhost:3000/api/health` prints `{"ok":true}`.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="{\"ok\":true}" label="/api/health answers {\"ok\":true}" -- Import health next to listBookmarks: import { listBookmarks, health } from './routes.js';
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/bookmarks; kill $!); echo \"$out\"" stdout="https://neovim.io" label="/api/bookmarks still works" -- Keep listBookmarks in the import, with a comma between the two names.
```

## Apply: name the service with W, E and a

When several services answer health checks, it helps to know which one replied. Make Shelf's health answer `{"ok":true,"name":"shelf"}`.

In `server/routes.js`, on the `response.end(JSON.stringify({ ok: true }));` line (line 14):

- {{key:first-char}}, then {{key:motion-W}} twice: past `response.end(JSON.stringify({` to `ok:`, then to `true`.
- {{key:motion-E}} to the `e` of `true`, then `a`, `, name: 'shelf'`, Esc, `:w`.

Going from the end instead, with `$` and {{key:motion-B}}, lands on the `}`, and typing there with `i` would leave the space on the wrong side of your comma. Pick the end of the WORD you want to follow.

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
  response.end(JSON.stringify({ ok: true, name: 'shelf' }));
}
```

- Each name-and-value pair in an object is separated from the next by a comma, as in JSON. `'shelf'` is a string, so it's quoted; JSON.stringify turns its single quotes into JSON's double quotes.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="{\"ok\":true,\"name\":\"shelf\"}" label="/api/health answers {\"ok\":true,\"name\":\"shelf\"}" -- The object should read { ok: true, name: 'shelf' }, with a comma between the pairs.
```

## Drill: across WORDs

Click **Fresh copy of practice/drills/11-word.txt**, open it, and add `-i ` before the address so that the command reads `curl -s -i http://localhost:3000/api/bookmarks`.

```text file=practice/drills/11-word.txt provided
curl -s http://localhost:3000/api/bookmarks
```

Par 7: {{key:motion-W}} twice reaches the `h` of `http`, then {{key:i}}, `-i ` and {{key:esc}}. With {{key:motion-w}} it takes three presses, because `-` and `s` are separate words.

```check
run "sed -n 1p practice/drills/11-word.txt | grep -Fqx 'curl -s -i http://localhost:3000/api/bookmarks'" label="line 1 reads curl -s -i http://localhost:3000/api/bookmarks" -- Click Fresh copy of practice/drills/11-word.txt and try again.
run "test $(wc -l < practice/drills/11-word.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/11-word.txt and try again.
keys practice/drills/11-word.txt par=7
```

## Drill: just before the end

Click **Fresh copy of practice/drills/12-before-end.txt**, open it, and add a third port, so that the line reads `const ports = [3000, 3001, 3002];`

```text file=practice/drills/12-before-end.txt provided
const ports = [3000, 3001];
```

Par 10: {{key:line-end}} goes to the `;`, {{key:h}} steps back onto the `]`, then {{key:i}}, `, 3002` and {{key:esc}}. Using {{key:A}} would put you after the `;`, and backing up in Insert mode costs more.

```check
run "sed -n 1p practice/drills/12-before-end.txt | grep -Fqx 'const ports = [3000, 3001, 3002];'" label="line 1 reads const ports = [3000, 3001, 3002];" -- Click Fresh copy of practice/drills/12-before-end.txt and try again.
run "test $(wc -l < practice/drills/12-before-end.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/12-before-end.txt and try again.
keys practice/drills/12-before-end.txt par=10
```

## Drill: the first character, from the end

Click **Fresh copy of practice/drills/13-first.txt**, open it, and fix both lines: line 1 needs its `;`, and line 2 needs its `;` **and** a lowercase `c`, keeping its indentation.

```text file=practice/drills/13-first.txt provided
const name = 'Shelf'
  Console.log(name)
```

The fixed file reads:

```text
const name = 'Shelf';
  console.log(name);
```

Par 10: {{key:A}}, `;`, {{key:esc}} on line 1. Then {{key:j}}: moving down keeps the cursor's column as far as the shorter line allows, so it lands on the last character, the `)`. So {{key:a}}, `;`, {{key:esc}}; then {{key:first-char}} to the `C`, and {{key:r}} with `c`.

```check
run "sed -n 1p practice/drills/13-first.txt | grep -Fqx \"const name = 'Shelf';\"" label="line 1 reads const name = 'Shelf';" -- Click Fresh copy of practice/drills/13-first.txt and try again.
run "sed -n 2p practice/drills/13-first.txt | grep -Fqx '  console.log(name);'" label="line 2 reads   console.log(name);" -- Click Fresh copy of practice/drills/13-first.txt and try again.
run "test $(wc -l < practice/drills/13-first.txt) -eq 2" label="it has 2 lines" -- A line was added or removed. Click Fresh copy of practice/drills/13-first.txt and try again.
keys practice/drills/13-first.txt par=10
```

## Review: a word in the middle, and the end

Click **Fresh copy of practice/review/02-02.txt**. Make the line read `const server = http.createServer(handler);` Recall the keys before hovering.

```text file=practice/review/02-02.txt provided
const server = createServer(handler)
```

Par 13: {{key:motion-w}} three times to `createServer`, {{key:i}}, `http.`, {{key:esc}} (10); then {{key:A}}, `;`, {{key:esc}} (3).

```check
run "sed -n 1p practice/review/02-02.txt | grep -Fqx 'const server = http.createServer(handler);'" label="line 1 reads const server = http.createServer(handler);" -- Click Fresh copy of practice/review/02-02.txt and try again.
run "test $(wc -l < practice/review/02-02.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/review/02-02.txt and try again.
keys practice/review/02-02.txt par=13
```

## Your turn: a second path for health

Some monitoring tools only ever ask for `/health`, without the `/api` in front.

**Build, on your own:** make Shelf answer the health check at **both** `/api/health` and `/health`, with one `if`, not two. Chapter 1 used the operator you need in `const port = process.env.PORT || 3000;`. Use the end-of-line and WORD motions to get to where you type.

```hints
nudge: The condition in the health if is true for one path. You want it to be true when either of two comparisons is true.
concept: `a || b` is true when a is true or b is true. Each side must be a whole comparison: request.url === '/health', not just '/health'.
shape: The condition becomes request.url === '/api/health' || request.url === '/health'. Get there with `$` (onto the `{`), `h` twice (onto the `)`), and type before it with `i`.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/health; kill $!); echo \"$out\"" stdout="{\"ok\":true,\"name\":\"shelf\"}" label="/health answers the health check" -- Add a second comparison to the health if: request.url === '/health', joined to the first with ||.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/api/health; kill $!); echo \"$out\"" stdout="{\"ok\":true,\"name\":\"shelf\"}" label="/api/health still answers it" -- Keep the first comparison; add the second with ||.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/hello; kill $!); echo \"$out\"" stdout="Shelf is running on port 3917" label="other paths still get the plain-text answer" -- Each side of || must be a full comparison. '/health' on its own is always true, so every path would get the health answer.
```

The checks establish that both paths answer and other paths don't. They do not prove you used one `if`: two blocks pass too. Read your handler; the point is one condition that says "either of these".

### What you have

```text
server/routes.js   listBookmarks and health
server/server.js   /api/bookmarks, /api/health and /health
```

| Keys | Moves to |
|---|---|
| `W` / `B` / `E` | next WORD / back a WORD / end of a WORD |
| `0` / `^` / `$` | first column / first non-blank / last character |

Next: jumping straight to a character you can see on the line.
