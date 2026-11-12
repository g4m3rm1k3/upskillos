# Part 5: Files in the Browser

This part covers the two ends of your pipeline: getting a file's bytes into JavaScript, and turning bytes back into a file the user can save. Neither involves a server.

## Concepts

### Why a page can't just read a file

For security, a web page can't read arbitrary files from a user's computer. It can only read files the user explicitly hands over: by choosing one in a file dialog or by dragging it onto the page. Remember that: it means every file access begins with a user action.

### Getting a file in

There are two common routes.

**Route 1: the file input.** An HTML `<input type="file">` element opens the operating system's file picker. When the user chooses a file, the element fires a `change` event, and the element's `files` list holds `File` objects. A `File` knows its name, size and type, and can hand over its contents. The `accept` attribute can suggest extensions such as `.db` and `.sqlite` but the user can override it.

**Route 2: drag and drop.** A page can listen for `dragover` and `drop` events; the drop event carries the files. You must cancel the default behaviour on `dragover` and `drop` or the browser will navigate away to display the file.

Build Route 1 first. Add Route 2 as polish.

### Reading the bytes

A `File` is a kind of `Blob`: an opaque chunk of binary data. To use the bytes you need a method that returns them asynchronously. Look up `Blob.arrayBuffer()`, which returns a promise of an `ArrayBuffer`. (The older alternative is `FileReader`, which you'll see in tutorials.)

Then the type chain:

- **ArrayBuffer**: raw memory. You can't read it directly.
- **Uint8Array**: a *view* over an ArrayBuffer where each element is one byte (0 to 255). This is what sql.js wants.

So: `File` → ArrayBuffer → `Uint8Array` → database. Make sure you understand each arrow before moving on. Log the first 16 bytes and convert them to text; do you see `SQLite format 3`?

### Validating before you trust

Before handing bytes to SQLite, check them: Is the file empty? Does it start with the SQLite header? Is the size reasonable? A friendly error is far better than a cryptic library exception. Even after validation, wrap loading in error handling; a file can have a valid header and still be corrupt.

### Getting a file out

To let the user save a file you need: the bytes, a Blob wrapping them, a temporary URL for that Blob, and a link that triggers a download.

1. Take the `Uint8Array` from the export.
2. Wrap it in a `Blob`. The Blob constructor takes an array of parts and an options object with a `type`. Use a generic binary type such as `application/octet-stream` (the proper registered type for SQLite is `application/vnd.sqlite3`).
3. Make a temporary URL for the Blob with `URL.createObjectURL`.
4. Create an `<a>` element, set its `href` to that URL and its `download` attribute to the filename you want, and click it programmatically.
5. Release the URL with `URL.revokeObjectURL` afterwards.

Think about the filename: reuse the original name, perhaps with a suffix, so the user doesn't accidentally overwrite the original without noticing.

### A newer alternative: the File System Access API

Chromium-based browsers (Chrome, Edge) support `showOpenFilePicker` and `showSaveFilePicker`. These let a page **save back to the same file** after the user grants permission, which feels much better than repeated downloads. Firefox and Safari don't support them fully, so treat them as an optional enhancement for after the MVP: build the file input and download link first, which work everywhere.

### Download behaviour you can't control

Browsers decide where a download goes and whether to ask. You can't force "save as". If a user needs to choose a location, that is a browser setting. Put a note in your interface.

## Try it

Again in a scratch page, separate from the sql.js work:

1. Add a file input. On selection, log the file's name, size and type.
2. Read it into an ArrayBuffer and then a `Uint8Array`. Log its length and compare it with the file size on disk.
3. Convert the first 16 bytes to a string (look up `TextDecoder`) and check them against the SQLite header. Try it with a non-SQLite file such as a PNG too.
4. Write a function that decides whether bytes look like a SQLite file. Return a result and a reason, not just true or false.
5. Make a button that generates a small text file in memory and downloads it. Then change it to a binary file made from a hand-built `Uint8Array`.
6. Add drag and drop for the same input.
7. **Round trip test:** read a file, export without changes, and download. Open the downloaded file in DB Browser for SQLite. It should open and show the same data.

## Checkpoint

- Why can't a page read a file without the user's involvement?
- What is the difference between a `File`, a `Blob`, an `ArrayBuffer` and a `Uint8Array`?
- Why is reading a file asynchronous?
- What are the steps to turn bytes into a downloaded file?
- Why do you revoke the object URL afterwards?
- What does the File System Access API give you that the download link doesn't, and why isn't it your first choice?
