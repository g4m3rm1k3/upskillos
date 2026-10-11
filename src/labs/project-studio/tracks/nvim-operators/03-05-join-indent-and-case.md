---
title: 3.5 — Join, Indent and Case: J, >>, <<, ~, gu and gU
runtime: none
---

Three small jobs come up all the time in code: joining a line that was split in two, moving lines in or out a level of indentation, and switching letters between capitals and small letters. Neovim has a key or an operator for each, and they work with motions, counts and `.` like everything else in this chapter.

Shelf has one weak spot left from chapter 2: one broken data file stops the whole server, so every route goes down, `/health` included. This lesson wraps the handler call so that an error becomes a **500** answer for that one request, and the server keeps running.

## Join lines: J

**`J`** joins the line below onto the end of this one.

- It removes the line break and the next line's indentation, and puts **one space** between the two.
- With a count it joins that many lines: `3J` makes three lines one.
- In VS Code this is Ctrl+J on Linux and Windows, or a run of Delete presses.

## Indent and outdent: >> and <<

| Keys | Does |
|---|---|
| `>>` | moves the line one level right |
| `<<` | moves it one level left |
| `3>>` | three lines, starting with this one |
| `>` or `<` and a motion | every line the motion touches: `>j`, `>}`, `<G` |

- One level is the file's indent size, 2 spaces in Shelf (from the `.editorconfig` you wrote in chapter 1).
- `>` and `<` are operators, so `>>` and `<<` are their "whole line" doubles, like `dd` and `cc`.
- In VS Code, Tab and Shift+Tab with lines selected do this.

## Change case: ~, gu and gU

| Keys | Does |
|---|---|
| `~` | switches the case of the character under the cursor and moves right: `a` becomes `A`, `A` becomes `a` |
| `3~` | three characters |
| `gu` and a motion | makes what the motion crosses lowercase: `guw`, `gu$` |
| `gU` and a motion | makes it UPPERCASE: `gUe`, `gU$` |
| `guu` / `gUU` | the whole line |

- `~` is the quick fix for one wrong letter. `gu` and `gU` are operators, for a word or more.
- VS Code has "Transform to Uppercase" in its command palette; here it's an operator you can repeat with `.`.

## Catch the error

Open `server/server.js`. Line 9, `handler(request, response);`, is where a handler runs, and where `countBookmarks`' `JSON.parse` threw in lesson 2.5, ending the process. Wrap it:

1. `9G`, then `O`, `try {`, Esc. The new line goes above the call.
2. `j` back down to the call, and `>>` indents it one level, inside the `try`.
3. `o`, and type the rest, Enter after each line, without leading spaces: `} catch (error) {`, `console.error(error);`, `response.statusCode = 500;`, `response.end('Something went wrong\n');` and `}`. Each `}` moves itself back out a level as you type it. Esc, `:w`.

```javascript file=server/server.js
import http from 'node:http';
import { routes, notFound } from './routes.js';

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  console.log(new Date().toISOString(), request.method, request.url);
  const handler = routes[`${request.method} ${request.url}`] || notFound;
  try {
    handler(request, response);
  } catch (error) {
    console.error(error);
    response.statusCode = 500;
    response.end('Something went wrong\n');
  }
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`try { … }`** runs the lines inside as usual. If one of them **throws** an error, as `JSON.parse` does with text that isn't JSON, the rest of the `try` is skipped and the `catch` runs instead. Without a `try`, an error nothing catches ends the program.
- **`catch (error) { … }`** receives the error as `error`.
- **`console.error(error)`** prints it, with the list of `at …` lines showing where it was thrown, to the server's terminal. The person running the server needs that to fix the problem; the client doesn't.
- **`500`** is the status code for Internal Server Error: the request was fine, the server failed. The client gets a short message, and the details stay in the server's log.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31" label="the count still answers with good data" -- The call inside the try is still handler(request, response);
run "cp data/bookmarks.json .bookmarks.bak && printf '[' > data/bookmarks.json; out=$(PORT=3917 node server/server.js 2>/dev/null & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' http://localhost:3917/api/bookmarks/count; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="500" label="with a broken data file, the count gets status 500" -- In the catch, set response.statusCode = 500; before response.end.
run "cp data/bookmarks.json .bookmarks.bak && printf '[' > data/bookmarks.json; out=$(PORT=3917 node server/server.js 2>/dev/null & sleep 1; curl -s -m 2 http://localhost:3917/api/bookmarks/count; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="Something went wrong" label="the answer says Something went wrong" -- The catch ends the response: response.end('Something went wrong\n');
run "cp data/bookmarks.json .bookmarks.bak && printf '[' > data/bookmarks.json; out=$(PORT=3917 node server/server.js 2>/dev/null & sleep 1; curl -s -m 2 -o /dev/null http://localhost:3917/api/bookmarks/count; curl -s -m 2 http://localhost:3917/health; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="\"ok\":true" label="after the error, the server still answers /health" -- The handler call must be inside try { … }, so the error is caught instead of ending the server.
```

The checks break the data file for a moment (they write `[` into it, then put your file back), because that's the only way to make the error happen.

## Break the data on purpose

See it for yourself. Open `data/bookmarks.json`: `:e data/bookmarks.json`. Line 5 is `},`, the end of the first bookmark. `5G`, `$` onto the comma, `x`, `:w`. Restart the server and `curl -i http://localhost:3000/api/bookmarks/count`.

```predict
question: The data file is broken in the same way as in lesson 2.5. What happens now?
choice: The server stops, as it did in lesson 2.5
choice: curl gets 500 and Something went wrong, and the server keeps running
choice: curl gets 404, because the count can't be found
answer: curl gets 500 and Something went wrong, and the server keeps running
explain: JSON.parse still throws, but now inside the try. The catch logs the error and answers 500, and the request is over. The server process was never in danger, so the next request is handled as usual.
```

- `curl http://localhost:3000/health` still answers: only the routes that read the data fail.
- The server's terminal shows `SyntaxError: Expected ',' or ']' after array element in JSON at position 66 (line 6 column 3)`, the same error as in lesson 2.5, followed by its `at` lines. The second, `at countBookmarks`, is the first one in Shelf's own code.
- **How to find the cause** from a 500: read the server's log, not the answer. The first `at` line in Shelf's own files names the function and line that failed, and the message says what was wrong with the data.

Put the comma back: `u`, `:w`. The count answers `{"count":31,"empty":false}` again.

```check
run "node -e \"JSON.parse(require('fs').readFileSync('data/bookmarks.json', 'utf8'))\"" label="data/bookmarks.json is valid JSON again" -- Press u until the comma after the first bookmark is back, then :w.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s -m 2 http://localhost:3917/api/bookmarks/count; kill $!); echo \"$out\"" stdout="{\"count\":31,\"empty\":false}" label="the count answers again" -- The data file needs all 31 bookmarks, each followed by a comma except the last.
```

## Drill: join lines

Click **Fresh copy of practice/drills/36-join.txt**, open it, and make the first two lines one line, and the `list` lines one line, as below.

```text file=practice/drills/36-join.txt provided
server.listen(port,
  () => console.log('ready'));
const list = [
  'a',
  'b',
];
```

The result:

```text
server.listen(port, () => console.log('ready'));
const list = [ 'a', 'b', ];
```

Par 4: {{key:J}} joins line 2 onto line 1; {{key:j}} goes to the `const list` line, and {{key:J}} with a count of 4 joins all four.

```check
run "sed -n 1p practice/drills/36-join.txt | grep -Fqx \"server.listen(port, () => console.log('ready'));\"" label="line 1 reads server.listen(port, () => console.log('ready'));" -- Click Fresh copy of practice/drills/36-join.txt and try again.
run "sed -n 2p practice/drills/36-join.txt | grep -Fqx \"const list = [ 'a', 'b', ];\"" label="line 2 reads const list = [ 'a', 'b', ];" -- Click Fresh copy of practice/drills/36-join.txt and try again.
run "test $(wc -l < practice/drills/36-join.txt) -eq 2" label="it has 2 lines" -- Click Fresh copy of practice/drills/36-join.txt and try again.
keys practice/drills/36-join.txt par=4
```

## Drill: fix the indentation

Click **Fresh copy of practice/drills/37-indent.txt**, open it, and indent both lines inside the function by exactly two spaces.

```text file=practice/drills/37-indent.txt provided
function start() {
listen();
      ready();
}
```

Par 7: {{key:j}}, {{key:indent}} (3). {{key:j}}, then {{key:outdent}} takes `ready();` from six spaces to four, and {{key:dot}} to two (4).

```check
run "sed -n 2p practice/drills/37-indent.txt | grep -Fqx '  listen();'" label="line 2 reads   listen(); with two spaces" -- Click Fresh copy of practice/drills/37-indent.txt and try again.
run "sed -n 3p practice/drills/37-indent.txt | grep -Fqx '  ready();'" label="line 3 reads   ready(); with two spaces" -- Click Fresh copy of practice/drills/37-indent.txt and try again.
run "test $(wc -l < practice/drills/37-indent.txt) -eq 4" label="it has 4 lines" -- Click Fresh copy of practice/drills/37-indent.txt and try again.
keys practice/drills/37-indent.txt par=7
```

## Drill: switch case

Click **Fresh copy of practice/drills/38-case.txt**, open it, and fix the capitals: methods in capitals, paths in small letters.

```text file=practice/drills/38-case.txt provided
get /api/health
POST /API/BOOKMARKS
```

The result:

```text
GET /api/health
POST /api/bookmarks
```

Par 7: {{key:tilde}} with a count of 3 fixes `get` (2). {{key:j}} keeps the column, which leaves the cursor on the `T` of `POST`; {{key:motion-W}} jumps to the path, and {{key:gu}} with {{key:line-end}} lowercases it to the end of the line (5).

```check
run "sed -n 1p practice/drills/38-case.txt | grep -Fqx 'GET /api/health'" label="line 1 reads GET /api/health" -- Click Fresh copy of practice/drills/38-case.txt and try again.
run "sed -n 2p practice/drills/38-case.txt | grep -Fqx 'POST /api/bookmarks'" label="line 2 reads POST /api/bookmarks" -- Click Fresh copy of practice/drills/38-case.txt and try again.
run "test $(wc -l < practice/drills/38-case.txt) -eq 2" label="it has 2 lines" -- Click Fresh copy of practice/drills/38-case.txt and try again.
keys practice/drills/38-case.txt par=7
```

## Drill: capital constants, with dot

Click **Fresh copy of practice/drills/39-constants.txt**, open it, and write both constants' names in capitals: `DATA` and `LIMIT`.

```text file=practice/drills/39-constants.txt provided
const data = 'bookmarks.json';
const limit = 100;
```

Par 6: {{key:motion-w}}, then {{key:gU}} with {{key:motion-e}}. The cursor stays at the start of the word, and `limit` starts in the same column, so {{key:j}} and {{key:dot}}.

```check
run "sed -n 1p practice/drills/39-constants.txt | grep -Fqx \"const DATA = 'bookmarks.json';\"" label="line 1 reads const DATA = 'bookmarks.json';" -- Click Fresh copy of practice/drills/39-constants.txt and try again.
run "sed -n 2p practice/drills/39-constants.txt | grep -Fqx 'const LIMIT = 100;'" label="line 2 reads const LIMIT = 100;" -- Click Fresh copy of practice/drills/39-constants.txt and try again.
run "test $(wc -l < practice/drills/39-constants.txt) -eq 2" label="it has 2 lines" -- Click Fresh copy of practice/drills/39-constants.txt and try again.
keys practice/drills/39-constants.txt par=6
```

## Review: three switches

Click **Fresh copy of practice/review/03-05.txt**, open it, and turn every `off` to `on`. Recall the keys before hovering.

```text file=practice/review/03-05.txt provided
cors: off, cache: off, log: off
```

Par 13: {{key:motion-w}} twice reaches the first `off`; {{key:change}} with {{key:motion-w}}, `on`, {{key:esc}} (7). Then {{key:motion-W}} twice and {{key:dot}}, twice (6). ({{key:find}} with `o` and {{key:repeat-find}} cost the same: work out why one more {{key:repeat-find}} is needed for the last.)

```check
run "sed -n 1p practice/review/03-05.txt | grep -Fqx 'cors: on, cache: on, log: on'" label="line 1 reads cors: on, cache: on, log: on" -- Click Fresh copy of practice/review/03-05.txt and try again.
run "test $(wc -l < practice/review/03-05.txt) -eq 1" label="it has 1 line" -- Click Fresh copy of practice/review/03-05.txt and try again.
keys practice/review/03-05.txt par=13
```

## Your turn: a JSON 500

**Build, on your own:** every other answer from Shelf's API is JSON, so a server error should be too. With a broken data file, `/api/bookmarks/count` should answer `{"error":"server error"}`, with status 500 and the JSON `Content-Type`. The error still goes to the server's log.

Decide where the code that builds the answer belongs. `sendJson` is in `routes.js` and isn't exported, and `notFound` is a handler that's used the same way.

```hints
nudge: notFound is the model: a handler in routes.js that sets a status code and calls sendJson. The catch can call a handler the same way the server calls notFound.
concept: A new exported function in routes.js can use sendJson, and server.js can import it next to routes and notFound. The catch then calls it with request and response.
shape: In routes.js, copy notFound (`4yy`, then `p` below a blank line), rename the copy `serverError` with `cw`, make its status 500 and its object `{ error: 'server error' }`. In server.js, add `serverError` to the import, and in the catch replace the two response lines with `serverError(request, response);`.
```

```check
run "cp data/bookmarks.json .bookmarks.bak && printf '[' > data/bookmarks.json; out=$(PORT=3917 node server/server.js 2>/dev/null & sleep 1; curl -s -m 2 http://localhost:3917/api/bookmarks/count; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="{\"error\":\"server error\"}" label="a broken data file gives {\"error\":\"server error\"}" -- The catch should send { error: 'server error' } through sendJson, for example from a serverError handler in routes.js.
run "cp data/bookmarks.json .bookmarks.bak && printf '[' > data/bookmarks.json; out=$(PORT=3917 node server/server.js 2>/dev/null & sleep 1; curl -s -m 2 -o /dev/null -w '%{http_code}' http://localhost:3917/api/bookmarks/count; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="500" label="with status 500" -- Set response.statusCode = 500; before sending.
run "cp data/bookmarks.json .bookmarks.bak && printf '[' > data/bookmarks.json; out=$(PORT=3917 node server/server.js 2>/dev/null & sleep 1; curl -s -m 2 -i http://localhost:3917/api/bookmarks/count; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="Content-Type: application/json; charset=utf-8" label="and the JSON Content-Type" -- sendJson sets the header; response.end alone doesn't.
run "cp data/bookmarks.json .bookmarks.bak && printf '[' > data/bookmarks.json; out=$(PORT=3917 node server/server.js 2>&1 >/dev/null & sleep 1; curl -s -m 2 -o /dev/null http://localhost:3917/api/bookmarks/count; sleep 0.2; kill $!); mv .bookmarks.bak data/bookmarks.json; echo \"$out\"" stdout="SyntaxError" label="the error is still logged" -- Keep console.error(error); in the catch.
```

The checks establish the 500 answer's body, status and header, and that the error is still logged. They don't check what happens when a handler fails **after** it has started answering. Look at `sendJson`: if `JSON.stringify` threw, which line would already have run, and could the catch still set a status code?

### What you have

```text
server/server.js   a handler that throws gets a 500; the server keeps running
server/routes.js   (your turn) a serverError handler, or another way to send JSON
```

| Keys | Does |
|---|---|
| `J` / `3J` | join the next line / three lines into one |
| `>>` / `<<` | indent / outdent the line; `>` and `<` take a motion |
| `~` | switch the case of a character |
| `gu` / `gU` and a motion | lowercase / uppercase; `guu` and `gUU` for the line |

That completes chapter 3. You can now delete, change and copy anything a motion reaches, repeat it with `.`, and you've used them to turn Shelf's chain of `if` blocks into a routing table with a 404 and a 500. Chapter 4 adds **text objects**: `iw`, `i"`, `i(`, `i{`, which select a whole word, string or bracketed block wherever the cursor is inside it, so `ci'` changes a string without finding its start first. Shelf gets a data store and its first `POST` and `DELETE` routes.
