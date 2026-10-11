---
title: 1.3 — a, A, I and a Server That Answers
runtime: none
---

`server/server.js` prints one line and ends. In this lesson it becomes a **web server**: a program that keeps running, waits for requests, and answers each one. You'll ask it for a page from a second terminal with `curl` and from your browser, and stop it with Ctrl+C. The editing keys are the remaining ways into Insert mode, which differ only in *where* the cursor lands.

| Key | Starts inserting… |
|---|---|
| `i` | before the cursor |
| `a` | after the cursor (*append*) |
| `I` | at the start of the line's text (after its indentation) |
| `A` | at the end of the line |
| `o` / `O` | on a new line below / above |

Choosing the right one saves moving the cursor first, which is most of the time spent editing.

## Import Node's http module, with O

Open `server/server.js` (click it in the explorer, or `:e server/server.js`). The cursor is on line 1. Press **`O`** to open a line above it, type the import line, and press Esc. Then press **`o`** and Esc straight away, to leave a blank line under it. `:w`.

```javascript file=server/server.js
import http from 'node:http';

console.log('Shelf is starting');
```

- **`import http from 'node:http';`** loads Node's built-in **`http` module**, the code that speaks **HTTP** (*HyperText Transfer Protocol*), the language browsers and servers use to ask for and send web pages. The module is now available under the name `http`.
- **`'node:http'`**: the `node:` prefix means "built into Node", not a file of yours or a package from npm.
- `import` works because `package.json` says `"type": "module"` (1.2). Without that line, Node would refuse with `SyntaxError: Cannot use import statement outside a module`.
- The blank line separates imports from the rest of the program, a common convention.

`npm start` still prints `Shelf is starting`: importing a module changes nothing visible.

```check
run "npm start" stdout="Shelf is starting" label="npm start still runs" -- If you see "Cannot use import statement outside a module", check "type": "module" in package.json.
contains server/server.js "import http from 'node:http';" label="server.js imports node:http" -- Put the cursor on line 1, press O, type the import line, Esc.
```

## Create the server

Move to the last line with `j`. Press `o` to open a line below, press **Enter** once more for a blank line, and type the rest (no leading spaces; Neovim indents, and the closing `});` moves itself out). Esc, `:w`.

```javascript file=server/server.js
import http from 'node:http';

console.log('Shelf is starting');

const port = process.env.PORT || 3000;

const server = http.createServer((request, response) => {
  response.end('Shelf is running\n');
});
```

- **`const port = …;`** creates a **constant**, a named value that can't be reassigned, called `port`.
- **`process.env.PORT`** reads the environment variable `PORT` (an **environment variable** is a setting a program inherits from the shell that started it; `PORT=4000 npm start` sets one for a single command). It's `undefined` unless you set one.
- **`||`** (*or*) gives the value on its left if that's usable, otherwise the value on its right. So `port` is `PORT`'s value if you set one, otherwise **3000**.
- **A port** is a number that picks out one program among the many on a computer that use the network. A web address can name it after a colon: `localhost:3000`. Numbers above 1024 are free for everyday programs to use.
- **`http.createServer(handler)`** creates a server object. It doesn't start listening yet.
- **`(request, response) => { … }`** is the **handler**, an **arrow function** (JavaScript's short way to write a function: parameters in parentheses, `=>`, then the body in braces) that the server calls **once for every request** it receives. `request` describes what was asked for; `response` is how you answer.
- **`response.end('Shelf is running\n')`** sends that text as the whole answer and finishes the response. **`\n`** inside a string is a newline character, so the terminal's prompt starts on a fresh line after `curl` prints it.

Running it now still just prints `Shelf is starting` and ends: the server exists but isn't listening for anything.

```check
contains server/server.js "http.createServer((request, response) => {" label="server.js creates the server" -- Type the createServer lines below the console.log line.
contains server/server.js "const port = process.env.PORT || 3000;" label="the port comes from PORT, or 3000" -- Type the const port line exactly, with || between the two choices.
run "npm start" stdout="Shelf is starting" label="the file still runs without errors" -- Read the error's first lines: Node names the file, the line number and what it expected.
```

## Listen, and ask for a page

Move to the last line (`j`), `o`, Enter, then type the last three lines. Esc, `:w`.

```javascript file=server/server.js
import http from 'node:http';

console.log('Shelf is starting');

const port = process.env.PORT || 3000;

const server = http.createServer((request, response) => {
  response.end('Shelf is running\n');
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`server.listen(port, callback)`** starts the server: it claims the port and waits for requests. When it's ready, Node calls `callback`, the arrow function, once.
- **`` `…` ``** (backticks) make a **template literal**, a string in which **`${…}`** is replaced by a value. Here `${port}` becomes `3000`. Plain `'…'` quotes would print `${port}` literally.
- **`localhost`** is the name every computer uses for itself. `http://localhost:3000` means "this computer, port 3000, over HTTP".

Start it in the Terminal tab:

```zsh
npm start
```

It prints `Shelf is starting`, then `Shelf is listening on http://localhost:3000`, and **doesn't end**. No prompt comes back: the server is waiting for requests, and this terminal is busy until you stop it.

Open a **second terminal** with the **+** button above the terminal (it starts in the project folder too) and ask for a page:

```zsh
curl http://localhost:3000
```

- **`curl`** (*client for URLs*) sends an HTTP request and prints the answer. It's on every Mac and nearly every Linux system.
- It prints **`Shelf is running`**: the handler ran for your request.

Open `http://localhost:3000` in your web browser too: the browser shows the same text. A browser and `curl` are both **HTTP clients**: programs that send requests.

```predict
question: The server is running in Terminal 1. In Terminal 2 you run `npm start` a second time. What happens?
choice: A second server starts and both answer
choice: The new one stops with an error, because port 3000 is already taken
choice: The first server stops and the new one takes over
answer: The new one stops with an error, because port 3000 is already taken
explain: Only one program can listen on a port at a time. The second server fails with "Error: listen EADDRINUSE: address already in use :::3000" and exits; the first keeps running.
```

Try it in Terminal 2. Among Node's error lines you'll find `Error: listen EADDRINUSE: address already in use :::3000`. **EADDRINUSE** (*error: address in use*) means another program already holds the port. Usually that other program is your own server, still running in another terminal. Remember this one: it's the most common surprise when working on servers.

Now stop the server: click Terminal 1 and press **Ctrl+C**. The prompt returns, and `curl http://localhost:3000` in Terminal 2 now fails with `Failed to connect`: nothing is listening.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917; kill $!); echo \"$out\"" stdout="Shelf is running" label="the server answers a request with Shelf is running" -- Start it with npm start and try curl http://localhost:3000 in a second terminal. If it doesn't answer, read the first terminal's error.
run "out=$(PORT=3917 node server/server.js & sleep 1; kill $!); echo \"$out\"" stdout="Shelf is listening on http://localhost:3917" label="it reports the port it's really listening on" -- Use backticks around the message, so ${port} is replaced by the number.
```

These checks establish that your own code answers: each one starts your server itself, on port 3917 via `PORT`, sends one request, and stops it. It doesn't use a server you left running, so a stale one can't fool it (and can't block it, since it's on a different port).

## Change the start or end of a line: I and A

Two small edits show `I` and `A`.

**`I`**: the `Shelf is starting` line is redundant now that the server says where it's listening. Rather than delete it (deleting lines is chapter 3), turn it into a **comment**: text the program ignores, written after **`//`**. Move onto that line with `k` or `j`, press **`I`** (the cursor jumps to the line's first character, wherever it was), type `// ` (two slashes and a space), Esc.

**`A`**: comments can also explain a line. Move onto the `const port` line, press **`A`** (the cursor jumps past the line's last character, the `;`), type ` // 3000 unless PORT is set` (with a leading space), Esc. `:w`.

```javascript file=server/server.js
import http from 'node:http';

// console.log('Shelf is starting');

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  response.end('Shelf is running\n');
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
```

- **`//`** starts a comment that runs to the end of the line. Code after `//` doesn't run, so `npm start` no longer prints `Shelf is starting`.
- Turning a line into a comment like this is called **commenting it out**. It's a quick way to disable a line while keeping it nearby.
- With `i` and `a` you'd have had to move to the exact spot first. `I` and `A` reach the ends of the line from anywhere on it.

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; kill $!); echo \"$out\"" without="Shelf is starting" label="the starting message is commented out" -- Put // at the start of the console.log('Shelf is starting') line, with I.
contains server/server.js "// 3000 unless PORT is set" label="the port line explains itself" -- On the const port line, press A and type the comment.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917; kill $!); echo \"$out\"" stdout="Shelf is running" label="the server still answers" -- If the server stopped working, check that the comment on the port line comes after the semicolon.
```

## Drill: add to the end of a line

Click **Fresh copy of practice/drills/04-end.txt**, open it, and add the missing semicolon.

```text file=practice/drills/04-end.txt provided
const port = 3000
```

Par 3: {{key:A}}, `;`, {{key:esc}}. The cursor can be anywhere on the line.

```check
run "sed -n 1p practice/drills/04-end.txt | grep -qx 'const port = 3000;'" label="line 1 reads const port = 3000;" -- Click Fresh copy of practice/drills/04-end.txt and try again.
run "test $(wc -l < practice/drills/04-end.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/04-end.txt and try again.
keys practice/drills/04-end.txt par=3
```

## Drill: comment out an indented line

Click **Fresh copy of practice/drills/05-start.txt**, open it, and comment out the second line, keeping its indentation: it should read `  // console.log(port);`.

```text file=practice/drills/05-start.txt provided
const port = 3000;
  console.log(port);
```

Par 6: one move down ({{key:j}}), then {{key:I}}, `// ` and {{key:esc}}. Moving down keeps the cursor in the first column, before the spaces, so {{key:i}} would put the slashes in the wrong place; {{key:I}} skips the indentation.

```check
run "sed -n 1p practice/drills/05-start.txt | grep -qx 'const port = 3000;'" label="line 1 reads const port = 3000;" -- Click Fresh copy of practice/drills/05-start.txt and try again.
run "sed -n 2p practice/drills/05-start.txt | grep -qx '  // console.log(port);'" label="line 2 reads   // console.log(port);" -- Click Fresh copy of practice/drills/05-start.txt and try again.
run "test $(wc -l < practice/drills/05-start.txt) -eq 2" label="it has 2 lines" -- A line was added or removed. Click Fresh copy of practice/drills/05-start.txt and try again.
keys practice/drills/05-start.txt par=6
```

## Drill: insert after a character

Click **Fresh copy of practice/drills/06-after.txt**, open it, and put a space between `Shelf` and `keeps`.

```text file=practice/drills/06-after.txt provided
Shelfkeeps bookmarks.
```

Par 7: move right onto the `f` ({{key:l}} four times), then {{key:a}} to insert after it, a space, {{key:esc}}.

```check
run "sed -n 1p practice/drills/06-after.txt | grep -qx 'Shelf keeps bookmarks.'" label="line 1 reads Shelf keeps bookmarks." -- Click Fresh copy of practice/drills/06-after.txt and try again.
run "test $(wc -l < practice/drills/06-after.txt) -eq 1" label="it has 1 line" -- A line was added or removed. Click Fresh copy of practice/drills/06-after.txt and try again.
keys practice/drills/06-after.txt par=7
```

## Review: a new line, and a stray letter

Click **Fresh copy of practice/review/01-03.txt**. Remove the extra `l` from `Shellf`, then add `middle line` between the two lines. Recall the keys before hovering.

```text file=practice/review/01-03.txt provided
Shellf
last line
```

Par 17: move right onto the first of the two `l`s and {{key:x}} it (4), then {{key:o}}, `middle line` and {{key:esc}} (13).

```check
run "sed -n 1p practice/review/01-03.txt | grep -qx 'Shelf'" label="line 1 reads Shelf" -- Click Fresh copy of practice/review/01-03.txt and try again.
run "sed -n 2p practice/review/01-03.txt | grep -qx 'middle line'" label="line 2 reads middle line" -- Click Fresh copy of practice/review/01-03.txt and try again.
run "sed -n 3p practice/review/01-03.txt | grep -qx 'last line'" label="line 3 reads last line" -- Click Fresh copy of practice/review/01-03.txt and try again.
run "test $(wc -l < practice/review/01-03.txt) -eq 3" label="it has 3 lines" -- A line was added or removed. Click Fresh copy of practice/review/01-03.txt and try again.
keys practice/review/01-03.txt par=17
```

## Your turn: say which port

When several servers are running, it helps if each says where it is.

**Build, on your own:** change the server's answer from `Shelf is running` to `Shelf is running on port ` followed by the port number, still ending with a newline. With `PORT=3917` it should answer `Shelf is running on port 3917`. Start the server and check with `curl`. Pick the Insert-mode key that gets you closest to the place you need to type, and decide what kind of string makes `${port}` work.

```hints
nudge: The listen message already puts the port number inside a sentence. Compare its string with the one in response.end.
concept: Only a template literal (backticks) replaces `${port}` with the value. A string in single quotes keeps the characters `${port}` as written. Changing the quotes means editing both ends of the string.
shape: The response line should become `` response.end(`Shelf is running on port ${port}\n`); ``. Use `x` on each `'` and `i` or `a` to type a backtick in its place, and `i` to insert the new words before `\n`.
```

```check
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917; kill $!); echo \"$out\"" stdout="Shelf is running on port 3917" label="the server answers Shelf is running on port 3917 when PORT=3917" -- Use backticks around the response text and ${port} for the number.
run "out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917; kill $!); echo \"$out\"" without="${port}" label="the number is filled in, not ${port} as text" -- Single quotes keep ${port} as text. Use backticks.
run "out=$(PORT=3917 node server/server.js & sleep 1; kill $!); echo \"$out\"" stdout="Shelf is listening on http://localhost:3917" label="the listen message is unchanged" -- Leave the server.listen lines as they were.
```

### What you have

```text
package.json       npm start runs the server
server/server.js   a web server on PORT (or 3000) that answers every request
```

Next: undoing and fixing mistakes (`u`, Ctrl+R, `x`, `r`), jumping to a line by number when Node reports an error, and Neovim's built-in manual.
