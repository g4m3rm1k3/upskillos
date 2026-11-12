# Part 4: Running SQLite in the Browser

Browsers don't include SQLite for web pages. You bring your own: the SQLite C code, compiled to **WebAssembly**, runs inside your page just like a normal script. After this part you'll understand what that means and which library to use.

## Concepts

### WebAssembly in two paragraphs

WebAssembly (WASM) is a compact binary format that browsers run at near-native speed. Languages like C can compile to it. SQLite is written in C, so someone compiled it to WASM and wrapped it in a JavaScript API. You load the `.wasm` file, and JavaScript calls into it.

Practical consequences: there is a `.wasm` file your page must load from somewhere (the library provides it); loading is **asynchronous**; and a page opened straight from disk (`file://`) often can't load it, so you need a tiny local web server during development.

### Your library options

| Library | Character |
| --- | --- |
| **sql.js** | The classic. SQLite compiled to WASM, a small and simple API, whole database lives in memory. Ideal for "load a file, edit, export a file". |
| **Official SQLite WASM** (`@sqlite.org/sqlite-wasm`) | Maintained by the SQLite project. More powerful (can persist in browser storage), but more setup, and some features need special server headers. |
| **wa-sqlite** | Community project with flexible storage backends. More advanced. |

**Use sql.js for the MVP.** It matches your design exactly: bytes in, bytes out. Read its documentation and examples before writing anything. Search for "sql.js" and read the project's README on GitHub.

### The concepts sql.js gives you

You'll want to find each of these in its docs. Don't memorize names yet; learn the roles:

- **Initialization.** You call an init function once. It loads the WASM and gives you the library object. It returns a promise; you must wait for it.
- **Creating a database from bytes.** You construct a `Database` object, passing a `Uint8Array` of file contents. No argument creates a new empty database.
- **Running SQL that returns rows.** A method that runs one or more statements and returns results as columns plus rows of values.
- **Running SQL that changes things.** A method for statements where you pass parameters to fill placeholders.
- **Prepared statements.** An object you bind parameters to, then step through row by row. Better for repeated or large queries.
- **Exporting.** A method that returns the entire database as a `Uint8Array`. This is the other half of the file round trip.
- **Closing.** Free the memory when you're done with a database.

### The database lifecycle in your app

Think of your app's life as a state machine:

1. **No database loaded.** The UI shows an upload prompt.
2. **Loaded.** You hold one `Database` object in a variable. The UI shows tables.
3. **Modified.** The user has made changes. The in-memory copy differs from the file on their computer.
4. **Exported.** The user downloaded a copy. You may track "saved" status.
5. **Replaced or closed.** The user opens another file. You must close the old database object first.

Where does that `Database` object live in your code? A single variable holding "the current database" is enough for the MVP. Keep it separate from your UI code so you can test it alone.

### Two kinds of results

When you run `SELECT`, you get rows back. When you run `INSERT`/`UPDATE`/`DELETE`, you get no rows, but you can ask how many rows changed. Treat these separately in your design. A query box should handle both: show a table for the first, and "3 rows changed" for the second.

### Errors

SQL can fail: bad syntax, a constraint violation, a missing table. Your library throws an error with a message. Every database call in your app needs a plan for failure, and for MVP, "catch it and show the message in the interface" is a good plan.

## Try it

Do all of this in a small standalone HTML page, with no editor UI yet. A scratch page is the best way to learn the library.

1. Set up a folder with an `index.html` and a script, and serve it locally. Search for how to start a quick local web server with Python or Node. Confirm the page loads.
2. Load sql.js (read how to load the library and its WASM file in the docs).
3. Create an empty database, create a table, insert two rows, select them, and print the result to the browser console. Inspect exactly what shape the result has.
4. Run an `UPDATE` and find out how to learn how many rows it changed.
5. Trigger an error on purpose (a typo, a constraint violation). See what the error looks like and where you'd catch it.
6. Export the database. Log the length and the first few bytes of the result. Do they match what you learned about the SQLite header in Part 3?

## Checkpoint

- What is WebAssembly, and why does SQLite need it in a browser?
- Why is initialization asynchronous, and what happens if you use the library too early?
- What does "in-memory" mean for a user who closes the tab?
- Which two library features form the file round trip?
- What are the two kinds of results SQL produces, and how will your interface treat each?
- What must you do before loading a second file?
