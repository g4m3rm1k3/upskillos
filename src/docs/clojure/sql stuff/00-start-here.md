# Build a Browser SQLite Editor: A Learning Path

You will learn three things in order: how to design a database, how to talk to it with SQL, and how a browser can open, edit and save a SQLite file. Then you build the MVP yourself, one small step at a time, using these files as the map.

## The files

| File | What it covers |
| --- | --- |
| `00-start-here.md` | This page: how to work through the guide, and the big picture |
| `01-database-design.md` | Tables, keys, relationships, normalization |
| `02-sql.md` | SELECT, joins, aggregates, changing data, changing schema |
| `03-sqlite-specifics.md` | How SQLite differs from other databases, and how to inspect a file |
| `04-sqlite-in-the-browser.md` | WebAssembly, sql.js, the in-memory database |
| `05-files-in-the-browser.md` | Upload, bytes, Blobs, download |
| `06-building-the-ui.md` | DOM, rendering tables, editing cells, state |
| `07-mvp-milestones.md` | The build order, with a test for every step |
| `08-beyond-the-mvp.md` | Feature ideas, pitfalls, security, resources |

## How each part works

- **Concepts** in plain words, so you know why before how.
- **Try it**: exercises you run in a free SQLite tool before moving on.
- **Checkpoint**: questions you should be able to answer without looking anything up. If you can't, reread before continuing.

## Ground rules

- There is no MVP code in these files. They name the browser features and libraries to look up, explain what each does, and show only small isolated SQL examples. When you get stuck, ask me for a hint first, then for more if you need it.
- Follow the order in `07-mvp-milestones.md`. Every milestone works on its own, so you always have something running.
- Experiment outside your app first. Anything you can try in a desktop SQLite tool is faster to understand than anything you debug in a browser.

## What you need

- A modern browser and a code editor such as VS Code.
- [DB Browser for SQLite](https://sqlitebrowser.org/) (free desktop app) or the `sqlite3` command-line tool, for practising on real `.db` files.
- Basic HTML and JavaScript: variables, functions, arrays, objects. If those are new, do a short beginner JavaScript course first. `06-building-the-ui.md` covers only what this project needs.

## The running example

Every exercise uses a tiny bookshop: authors write books, customers place orders, orders contain books. It is small enough to hold in your head, and it contains every relationship type you will meet.

## The big picture

Your MVP needs no server. Everything happens inside the browser tab:

```
  Your computer                       The browser tab
  -------------                       ----------------------------------------------

  mydata.db  --- you pick it --->  1. Read the file into bytes
                                   2. Hand the bytes to a SQLite engine
                                      (SQLite compiled to WebAssembly)
                                   3. The engine holds the database in memory
                                          ^                       |
                                          | SQL in                | rows out
                                          |                       v
                                   4. Your interface: show tables, run queries,
                                      edit cells, insert and delete rows
                                          |
  mydata.db  <--- you save it ---  5. Ask the engine to export its bytes,
  (edited copy)                       wrap them in a downloadable file
```

Five jobs, and each has a part of this guide:

1. **Get bytes from a file** → `05-files-in-the-browser.md`
2. **Run SQLite in the browser** → `04-sqlite-in-the-browser.md`
3. **Know what to ask the database** → `01`, `02` and `03`
4. **Show and edit the results** → `06-building-the-ui.md`
5. **Get bytes back to a file** → `05-files-in-the-browser.md`

Two consequences are worth remembering now:

- The user's file never leaves their computer. That is a feature you can promise in your interface.
- The browser edits an **in-memory copy**. Nothing changes on disk until the user downloads the result. Your interface must make that obvious ("unsaved changes").

## Suggested pace

Parts 1 to 3 are the foundation and are worth doing thoroughly. Parts 4 and 5 are short but fiddly. Part 6 is where most of your build time goes. Do one part per sitting; the exercises matter more than the reading.
