---
title: 7.2 — State, controlled inputs and one-way data flow
track: Frontend Developer Bootcamp — React Reading List
trackOrder: 50.07
runtime: none
reference: optional
---

Outcome: let people add and remove books through React state. useState returns the current value and a setter that requests a render. Call Hooks at the component’s top level in the same order, never conditionally or inside a loop. A plain variable assignment does not ask React to update.

## Lift shared data to its owner

Before trying this step, make a prediction.

```predict
question: Will changing an ordinary local variable request a React render?
choice: No
choice: Yes
answer: No
explain: A state setter schedules an update; an ordinary assignment does not.
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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
