---
title: 4.1 — A Tree and an Editor
track: MiniDesk — The Editor
trackOrder: 60.03
runtime: none
---

Now the page gets something to show. This chapter is ordinary web development, with one rule from chapter 2 to keep in mind: **the page only knows `window.desk`**. It has no idea it's running on your computer; it just calls functions and gets promises back. That separation is what makes the page testable and the door auditable.

You'll build three things: a header with Open and Save buttons, a file tree, and a text area.

## The page

```html file=index.html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>MiniDesk</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <header>
      <strong id="title">MiniDesk</strong> <span id="info"></span>
      <button id="open">Open folder</button>
      <button id="save" disabled>Save</button>
      <span id="status"></span>
    </header>
    <main>
      <ul id="tree"></ul>
      <textarea id="editor" spellcheck="false" disabled></textarea>
    </main>
    <script src="renderer.js"></script>
  </body>
</html>
```

```check
contains index.html "id=\"editor\""
contains index.html "id=\"tree\""
```

## Its styles

```css file=styles.css
body { margin: 0; display: grid; grid-template-rows: auto 1fr; height: 100vh; font: 14px system-ui; }
header { padding: 6px 10px; background: #eee; }
main { display: grid; grid-template-columns: 220px 1fr; min-height: 0; }
#tree { margin: 0; padding: 4px; list-style: none; overflow: auto; border-right: 1px solid #ccc; }
#tree li { cursor: pointer; padding: 2px 4px; }
#tree li.dir { font-weight: 600; }
#editor { border: 0; padding: 8px; font: 13px ui-monospace, Consolas, monospace; resize: none; }
```

`min-height: 0` on `main` looks odd but matters: without it a grid child won't shrink below its content, and a long file stretches the whole window instead of scrolling inside the editor.

```check
file styles.css
```

## The behaviour

```js file=renderer.js
const $ = (sel) => document.querySelector(sel)
let current = null

async function showTree(rel = '.') {
  const items = await window.desk.project.list(rel)
  const ul = $('#tree')
  ul.replaceChildren()
  if (rel !== '.') {
    const up = document.createElement('li')
    up.className = 'dir'
    up.textContent = '..'
    up.onclick = () => showTree(rel.split('/').slice(0, -1).join('/') || '.')
    ul.append(up)
  }
  for (const item of items) {
    const li = document.createElement('li')
    li.className = item.dir ? 'dir' : 'file'
    li.textContent = item.name
    const child = rel === '.' ? item.name : `${rel}/${item.name}`
    li.onclick = () => (item.dir ? showTree(child) : openFile(child))
    ul.append(li)
  }
}

async function openFile(rel) {
  $('#editor').value = await window.desk.project.read(rel)
  $('#editor').disabled = false
  $('#save').disabled = false
  current = rel
  $('#status').textContent = rel
}

async function save() {
  await window.desk.project.write(current, $('#editor').value)
  $('#status').textContent = `${current} saved`
}

async function openProject() {
  const root = await window.desk.project.open()
  if (!root) return
  await showTree()
}

$('#open').onclick = openProject
$('#save').onclick = save
window.desk.info().then((i) => {
  $('#info').textContent = `Electron ${i.electron} on ${i.platform}${i.packaged ? ' (packaged)' : ''}`
  if (i.project) openProject()
})
```

- Paths sent to the main process always use `/`, even on Windows; `path.resolve` in the main process accepts both. The page builds `child` itself, but it is only ever a *request*: `resolveInside` still has the final say.
- Names go into the page with **`textContent`**, never `innerHTML`. A file called `<img src=x onerror=...>` is a legal filename; written as HTML it would run script *in your window*. Treat every filename, file content and shell output as untrusted text.
- `replaceChildren()` empties the tree before redrawing.
- `if (i.project) openProject()` is the test hook from chapter 3: if the main process already has a project, open it without a click.

```check
contains renderer.js "window.desk.project.list"
contains renderer.js "textContent = item.name" label="names are shown with textContent, not innerHTML"
lacks renderer.js "innerHTML" label="no innerHTML anywhere" -- Use textContent for anything that came from the computer.
run "node --check renderer.js" label="renderer.js has no syntax errors"
```

Run `npm start`, click **Open folder**, choose your MiniDesk folder, click `package.json` in the tree, and edit it. Don't save over something you care about; try a new file in a scratch folder first.

```predict
question: You click Save with a file open. Which process actually writes it to disk?
choice: The renderer process, in renderer.js
choice: The main process, in lib/project-fs.cjs
answer: The main process, in lib/project-fs.cjs
explain: renderer.js only calls window.desk.project.write. That sends the text to the main process, which resolves the path inside the project folder and writes the file with Node's fs. The page never touches the disk.
```

## Your turn: save with the keyboard

**Build, on your own:** make **Ctrl+S** (and **Cmd+S** on a Mac) save the open file, without the browser's own "save page" behaviour getting in the way. Do nothing if no file is open.

```hints
nudge: Listen for a `keydown` event on `window`. The event tells you whether Ctrl or Cmd is held, and which key was pressed.
concept: `event.ctrlKey` is true for Ctrl, `event.metaKey` for Cmd. `event.preventDefault()` stops the default action. `current` is null until a file is opened.
answer: Add to the end of `renderer.js`:
~~~js
window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    if (current) save()
  }
})
~~~
```

```check
contains renderer.js "keydown" -- Add a keydown listener on window.
contains renderer.js "event.ctrlKey || event.metaKey" -- Handle both Ctrl and Cmd.
contains renderer.js "preventDefault()" -- Stop the default action.
run "node --check renderer.js" label="renderer.js has no syntax errors"
```

### What you have

An editor that can open, edit and save files in a folder it can't escape. Next: the part that makes it feel like a studio, a real terminal.
