# Part 6: Building the Interface

You now know how to get a database into the browser. This part covers what the interface needs: the JavaScript and DOM ideas, how to turn query results into an editable grid, and how to organise your code so it doesn't turn into spaghetti.

## Concepts

### The DOM and rendering

The browser turns HTML into a tree of elements called the DOM. JavaScript can create, change and remove elements. Everything your interface does is one of these:

- **Render**: build elements from data (a table from rows).
- **Listen**: attach event handlers (a click, a change, a keypress).
- **Update**: change elements when data changes.

You'll use `document.createElement`, `appendChild`, `addEventListener`, and `textContent`.

**Security rule, important:** cells in an uploaded file can contain anything, including text that looks like HTML or script. Always display cell values with `textContent`, never `innerHTML`. Otherwise a malicious database file could run code in your page.

### Frameworks: not yet

React, Vue and others make rendering easier, but they hide the ideas underneath. Build the MVP with plain JavaScript first. You'll learn what frameworks solve, and you'll know when you actually need one. A single HTML file, a CSS file and one or two JavaScript modules is enough.

### Keep data and display apart

This is the single most useful design decision. Split your code into layers, even if they are just separate files or groups of functions:

| Layer | Job | Knows about |
| --- | --- | --- |
| **Database layer** | Load bytes, run SQL, export bytes, describe schema | sql.js only |
| **State** | What's loaded, which table is selected, unsaved changes, current page | Plain data |
| **Interface** | Render and react to the user | Calls the layers above |

The database layer should have no idea there is a page. Then you can test it in the console, and swap sql.js for something else later. Functions you might want in it (names are suggestions): list tables, get columns of a table, fetch rows of a table with a limit and offset, update one cell by key, insert a row, delete a row, run arbitrary SQL, export.

### From query result to table

A result gives you column names and rows of values. Rendering that is a loop: one header cell per column, one table row per row. Think about every kind of value you might get: `NULL` (show it differently from an empty string), numbers, text, and blobs (show a placeholder like "BLOB, 2 KB", not the bytes).

Large tables will freeze the page if you render all rows. Design for **pagination** from the start: fetch with `LIMIT` and `OFFSET`, show a page at a time, and fetch the total count separately.

### Editing a cell

Common pattern: the user double-clicks a cell, it turns into an input, and on Enter or blur the new value is saved; on Escape it's cancelled. The save is an `UPDATE` with placeholders that targets one row by key:

```sql
UPDATE "books" SET "price" = ? WHERE "id" = ?;
```

Questions you have to answer in your design:

- **Which key identifies the row?** The primary key if the table has one, otherwise `rowid`. Fetch it along with the displayed columns, and keep it with each rendered row.
- **What if the database refuses the edit?** Show the error, and restore the old value in the cell.
- **What type should the new value be?** Everything you read from an input is a string. Decide a rule: for example, if the column's declared type is `INTEGER` and the text looks like an integer, convert it. And how does the user enter a `NULL`?
- **Is the table editable at all?** Views and some other objects aren't.

### Inserting and deleting

- **Insert:** a row of empty inputs, or a form built from the column list; columns with defaults or auto-assigned keys can be left blank.
- **Delete:** needs confirmation, since there's no undo in an MVP. Foreign keys may block a delete; show that error clearly.

### Tracking unsaved changes

After any successful write, set a "dirty" flag in your state. Show it in the interface. Consider warning the user with the browser's `beforeunload` event if they try to close the tab with unsaved changes. Clear the flag after a download.

### A query box

A text area and a "Run" button, using the arbitrary-SQL function of your database layer. Decide how to show results (a grid for rows, a message for changes) and errors. Remember that this box lets the user run anything, including `DROP TABLE`. That's fine on their own copy, as long as the interface makes the in-memory copy clear.

### Visual design basics

- Plain CSS is enough. A sidebar of table names, a main grid, a toolbar with "Open", "Save/Download", and a status line.
- Give clear feedback for every action: loading, success, error.
- Make states obvious: nothing loaded, loaded, unsaved changes.
- Think about keyboard use and readable fonts (a monospace font for SQL and data).

### JavaScript skills you'll need

Check that you're comfortable with these. If not, practise each in isolation:

- Arrays and objects, and looping over them (`for...of`, `map`).
- Functions and arrow functions.
- `async` and `await`, and promises.
- `try` and `catch`.
- ES modules (`import` and `export`) so you can split code across files.
- Template literals for building strings.
- Event handling and event delegation (one handler on the table instead of one per cell).

## Try it

Before connecting to the database, build the interface with fake data:

1. Write a function that takes an array of column names and an array of rows and renders an HTML table. Test it with hand-written data, including `null` values and strings with `<b>` in them. The `<b>` must appear literally.
2. Add pagination controls (previous, next, a page indicator) over a big fake array.
3. Make cells editable: double-click to edit, Enter to save, Escape to cancel. Log what would be saved.
4. Make a sidebar that lists "tables" and switches the grid when clicked.
5. Add a status bar with an "unsaved changes" indicator, driven by a state variable.
6. Refactor so rendering is a function of your state object, and you change the screen by changing state and re-rendering.

## Checkpoint

- Why use `textContent` instead of `innerHTML` for cell values?
- Which three layers does the guide recommend, and why keep the database layer free of page code?
- How does your editor know which row an edit applies to?
- What does `NULL` look like in your grid, and how can a user enter it?
- Why paginate, and how do `LIMIT` and `OFFSET` help?
- What makes the "unsaved changes" state trustworthy?
