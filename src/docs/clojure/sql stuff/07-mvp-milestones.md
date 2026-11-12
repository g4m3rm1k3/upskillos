# Part 7: MVP Milestones

Build in this order. Each milestone ends with something you can run and test, so a bug always points at the last thing you added. Don't start a milestone until the previous test passes.

## Definition of done for the MVP

A user opens your page, picks a `.db` file from their computer, sees its tables, browses rows, edits cells, adds and deletes rows, and downloads a file that opens correctly in another SQLite tool.

## The milestones

### M0: Project skeleton

- A folder with `index.html`, a stylesheet and a script, served by a local web server.
- **Test:** the page loads, and a message from your script appears in the console.

### M1: Load the SQLite engine

- Initialize sql.js and create an empty database in memory.
- **Test:** create a table, insert a row, select it, and log the result.

### M2: Open a file

- File input, read to a `Uint8Array`, header validation, create a database from it.
- **Test:** open your practice bookshop `.db` and log the table names from `sqlite_master`. Open a PNG and confirm you get a friendly error.

### M3: List tables

- Render the table names in a sidebar. Hide internal `sqlite_` names.
- **Test:** the list matches what DB Browser for SQLite shows for the same file.

### M4: View a table

- Click a table, fetch its columns (`PRAGMA table_info`) and the first page of rows, render a grid.
- Show `NULL` distinctly, blobs as placeholders, and treat cell text safely.
- **Test:** compare row counts and values against DB Browser for SQLite for every table in the practice file.

### M5: Pagination

- Fetch the total count, page forward and backward, show "rows 1–50 of 312".
- **Test:** a table with more rows than one page. First and last page behave correctly, including a last page with fewer rows.

### M6: Export (the round trip)

- Export the bytes, wrap in a Blob, trigger a download.
- **Test:** open the downloaded file in DB Browser for SQLite. Identical data, no errors. Do this *before* adding editing, so you know the pipeline is sound.

### M7: Edit a cell

- Double-click to edit, save with an `UPDATE` using placeholders, keyed by primary key or `rowid`.
- Convert values by a rule you chose. Show errors and restore the old value on failure.
- **Test:** edit a price and re-open the exported file to see it changed. Try a negative price, and read the constraint error in your interface.

### M8: Unsaved-changes tracking

- A dirty flag, a visible indicator, a `beforeunload` warning, cleared after download.
- **Test:** edit, see the indicator, try to close the tab, download, see it clear.

### M9: Insert and delete rows

- An add-row form or row, a delete button with confirmation.
- **Test:** insert a valid row, an invalid row (missing a `NOT NULL` value), a row violating a foreign key, and delete a row referenced elsewhere. All produce sensible messages.

### M10: Query box

- A text area, a run button, results as a grid or a "N rows changed" message, errors shown.
- **Test:** run a join across three tables. Run an `UPDATE`. Run a typo.

### M11: Polish

- Drag-and-drop file open, a "new empty database" button, filename carried through to the download, loading and error states, basic styling.
- **Test:** hand it to someone else without instructions and watch where they hesitate.

## Habits that will save you time

- **Commit to Git after every working milestone.** If you break something, you can go back.
- **Test with awkward files**, not only your tidy practice file: an empty database, a table with no primary key, a table with thousands of rows, a column holding mixed types, a table named with spaces, a database with views and triggers.
- **Keep a log of decisions** (how you convert types, how you show NULL). Writing it down stops you from re-deciding.
- **Build the smallest thing first**, then improve it. Resist adding features before M6 passes.
- **Read errors completely.** Most are specific about what went wrong.
- **When stuck for more than 30 minutes**, write down what you expected, what happened and what you've tried. Then ask me. Often the act of writing it reveals the answer.

## Suggested self-review at the end

- Can a user lose data silently? Where?
- What happens with a 200 MB file?
- What happens when two operations overlap, such as clicking "Open" during a save?
- Does any code insert user data into HTML as markup?
- Could any SQL in your code be built by pasting user text into the query?
