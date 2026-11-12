# Beyond the MVP

Once the round trip works, you'll have a lot of choices. This page is a menu, not a to-do list, so pick by what you'd actually use.

## Feature ideas, roughly from easiest to hardest

**Quality of life**

- Sorting by clicking a column header (using `ORDER BY` with a quoted column name).
- A search or filter box per table (using `LIKE` with placeholders).
- Column resizing, row numbers, sticky headers.
- Copy a cell or row to the clipboard.
- Export a table or query result as CSV or JSON.
- Remember the last-used settings in `localStorage`.
- A dark mode.

**Working with the schema**

- Show a table's `CREATE TABLE` statement and its indexes.
- Add a column, rename a table, create a new table through a form.
- Show foreign keys as clickable links to the related row.
- Draw an entity-relationship diagram from `PRAGMA foreign_key_list`.

**Data work**

- Import a CSV into a new or existing table.
- Undo and redo (transactions, or a log of changes you can reverse).
- A change history panel showing every edit since opening the file.
- Saved queries, with a history of the ones you've run.
- Simple charts from query results.
- Compare two database files and list the differences.

**Bigger ideas**

- Save back to the same file with the File System Access API on Chromium browsers.
- Keep the database in the browser's own storage so a refresh doesn't lose work (look up OPFS and the official SQLite WASM build).
- Run SQL in a Web Worker so big queries don't freeze the interface.
- Make it an installable app (a PWA) that works offline.
- Several databases open at once, with tabs.

## Pitfalls you will meet

- **Freezing on large data.** Rendering thousands of DOM rows is slow. Pagination or virtual scrolling fixes it. Long-running queries block the page unless they run in a worker.
- **Memory.** The whole file sits in memory, and an export makes another copy. Large files can exhaust the tab.
- **Type conversions.** Everything from an input is text. Decide how to convert it, and be consistent.
- **Tables without keys.** Use `rowid`, and remember `WITHOUT ROWID` tables don't have it.
- **Quoting names.** Test with strange table and column names early.
- **Foreign keys silently off.** Decide on purpose.
- **Journals and WAL.** A file from a live application may have changes in a separate file.
- **Forgetting that the copy is in memory.** The most common user complaint will be "I edited it and nothing changed", because they didn't download.
- **Browser differences.** Test in at least two browsers, particularly for the file features.

## Security and privacy

- **Never put cell values into HTML as markup.** Use `textContent`.
- **Always pass values as parameters.** Quote identifiers.
- **Treat uploaded files as untrusted input.** A malicious database can have surprising contents, huge sizes or odd structures.
- **Say what's true about privacy.** If nothing is uploaded to a server, say so. If you later add any server feature, make that explicit.
- **If you ever host this**, a Content Security Policy header is a good defensive layer. It needs allowances for WebAssembly.

## Where to go to learn more

Search for these by name rather than trusting any link in this file to stay alive:

- **SQLite documentation** (sqlite.org). The pages on datatypes, `PRAGMA`, and "Appropriate uses for SQLite" are all readable and worth your time.
- **sql.js** on GitHub: the README and the API documentation.
- **MDN Web Docs**: pages on `File`, `Blob`, `ArrayBuffer`, `Uint8Array`, `URL.createObjectURL`, the DOM, events, and `async` functions. MDN is the best reference for browser APIs.
- **SQLBolt** and **SQLZoo**: interactive SQL practice.
- **"Database design" and "normalization" tutorials**, particularly any that use entity-relationship diagrams.
- **DB Browser for SQLite**: use it as your reference implementation. Whenever you wonder how something should behave, see what it does.

## When you're ready for the next step

Come back with what you built, or the part you're stuck on, and we can go further: reviewing your code, restructuring it, adding a feature from the list above, or designing something bigger on top of it.
