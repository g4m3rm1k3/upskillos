---
title: 7.2 — State, controlled inputs and one-way data flow
track: Frontend Developer Bootcamp — React Reading List
trackOrder: 50.07
runtime: none
---

Outcome: let people add and remove books through React state. useState returns the current value and a setter that requests a render. Call Hooks at the component’s top level in the same order, never conditionally or inside a loop. A plain variable assignment does not ask React to update.

### The story so far

The first React page displayed fixed data. Now a person will change that data. React needs to know when an update should produce a new render, so a component uses state rather than an ordinary local variable for information that persists between renders.

You already understand immutable arrays and callbacks from the planner. React reuses those ideas and gives them an explicit owner: App holds the shelf; BookCard reports removal intent.

## Lift shared data to its owner

### See a state change in isolation

This small worked example isolates the mechanism before the reading-list form combines it with arrays and validation:

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(previous => previous + 1)}>
      Books read: {count}
    </button>
  );
}
```

On the first render the button says **Books read: 0**. Clicking calls the arrow function supplied to onClick. Its setter queues an update: take the previous count and add one. React runs the component again with count equal to 1, and the button says **Books read: 1**. The setter does not append another button; React updates the existing UI.

Read `previous => previous + 1` as “given the previous value, return the next value.” We pass a function as the event handler so it runs on a click. Calling the setter directly while rendering would request another render immediately. A plain `count = count + 1` is neither a valid assignment to this const nor React's update mechanism.

The complete App below uses the same pattern: books replaces count, and appending a new book replaces adding one. This snippet is for understanding; continue editing the reading app in the named file below.

### Render is a snapshot, not a live spreadsheet cell

`const [books, setBooks] = useState([])` uses array destructuring: the first returned item is the current value, and the second is the setter. An empty array is the initial value. On later renders React supplies the state associated with this component rather than starting from scratch.

Think of each render as a photograph of the component’s state. Event handlers created in that render see the values captured in that photograph. A setter requests a later photograph; it does not rewrite every variable in the current function call.

The analogy has a limit: React schedules and batches updates rather than producing physical snapshots. Its purpose here is to remind you that reading books immediately after calling setBooks does not magically give a new local binding.

Before trying this step, make a prediction.

```predict
question: The empty shelf receives one valid Add submit. How many cards should render?
choice: 1
choice: 0 because the old array was empty
choice: 2 because both state setters add a card
answer: 1
explain: Only the books updater appends a record. Clearing title updates a different state value and does not add another book.
verify: page react/index.html "(async () => { const i=document.querySelector('#title'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Trace'); i.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,20)); i.form.requestSubmit(); await new Promise(r=>setTimeout(r,20)); return document.querySelectorAll('article').length; })()" server=vite
```

App owns the list and passes onRemove down. BookCard reports intent by calling it. A controlled input gets its value from state and reports edits via onChange. The functional updater receives the latest queued state, avoiding stale arrays. && conditionally renders the empty message. This step intentionally replaces the static fixture with an empty interactive shelf.

```jsx file=react/App.jsx
import React, { useState } from 'react';
function BookCard({ book, onRemove }) {
  return <article><h2>{book.title}</h2><p>{book.author}</p><button onClick={() => onRemove(book.id)}>Remove {book.title}</button></article>;
}
export function App() {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  function add(event) {
    event.preventDefault();
    if (!title.trim()) { setError('Write a title first.'); return; }
    setBooks(previous => [...previous, { id: crypto.randomUUID(), title: title.trim(), author: 'Your selection' }]);
    setTitle('');
    setError('');
  }
  function remove(id) { setBooks(previous => previous.filter(book => book.id !== id)); }
  return <main>
    <h1>Reading Room</h1>
    <form onSubmit={add}><label htmlFor="title">Book title</label><input id="title" value={title} onChange={event => setTitle(event.target.value)} /><button>Add book</button></form>
    <p role="status">{error || `${books.length} books saved`}</p>
    {books.length === 0 && <p>Your shelf is empty. Add a book you want to read.</p>}
    {books.map(book => <BookCard key={book.id} book={book} onRemove={remove} />)}
  </main>;
}
```

### Follow an Add operation

| Stage | What happens |
|---|---|
| Typing | onChange reads event.target.value and calls setTitle. |
| Render | input value is taken from the current title state. |
| Submit | add prevents navigation and validates title.trim(). |
| Update | setBooks receives a function producing a new array. |
| Render | The map describes a card for each record in the new array. |
| Reset | setTitle('') makes the controlled input display an empty value. |

A **controlled input** has its displayed value owned by React state. Without onChange updating that state, typing would not be reflected in the value React renders. Avoid mixing value and defaultValue as if they were interchangeable policies.

`setBooks(previous => [...previous, newBook])` asks React to use the latest queued previous state when processing the update. That is safer than building from an older captured books value when multiple updates can be queued.

### Why the child receives a callback

BookCard does not own the whole shelf, so it does not decide how to replace the array. It receives onRemove and calls it with an id. This is one-way data flow: data goes down through props; intent is communicated up through callbacks; the owner changes state and renders new props.

**Rule of thumb:** put state in the nearest component that needs to coordinate all of its consumers. Do not immediately put everything in global state. Do not keep a separate saved count when books.length already contains the answer; duplicated facts can disagree.

The status wording is derived from the same state. This is a small example of a broad principle: calculate what you can from authoritative data instead of saving another copy that needs synchronization.

```check
page react/index.html "(async () => { const input=document.querySelector('#title'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Design Book'); input.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,20)); input.form.requestSubmit(); await new Promise(r=>setTimeout(r,20)); return document.querySelectorAll('article').length; })()" "1" server=vite
```

## Your turn: derive a useful shelf summary

Change the success status to exactly 1 book saved for a single book, keeping 0 books saved and plural wording otherwise. Do not store a separate count: derive it from books.length so it cannot drift.

```check
page react/index.html "(async () => { const input=document.querySelector('#title'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Design Book'); input.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,20)); input.form.requestSubmit(); await new Promise(r=>setTimeout(r,20)); return document.querySelector('[role=status]').textContent; })()" "1 book saved" server=vite
```

```hints
nudge: State should contain the smallest facts needed to render.
concept: A singular/plural label is a derived value.
shape: Choose book or books from the array length in the template string.
```

## Diagnose, explain and review

Replace setBooks with books.push temporarily and try adding. The UI no longer follows a valid immutable update path. Restore the setter. Add two identical titles: unique ids must let you remove only one. After removing by keyboard, inspect where focus lands; design a focus-return policy before calling this production-ready.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

After two queued Add operations, explain why an updater function is safer than using a captured array. Then classify title, books, book count and filtered books as source state or derived data. Justify each classification using how it can change.
