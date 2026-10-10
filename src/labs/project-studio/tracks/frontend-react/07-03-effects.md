---
title: 7.3 — Effects synchronize with things outside React
track: Frontend Developer Bootcamp — React Reading List
trackOrder: 50.07
runtime: none
reference: optional
---

Outcome: persist the shelf without performing side effects during rendering. Rendering should calculate UI. An Effect runs after React commits an update and synchronizes with an external system such as storage, a subscription or a network connection. Dependencies say which values trigger that synchronization.

## Initialize once and save after changes

Before trying this step, make a prediction.

```predict
question: Does a shelf length need its own Effect and state variable?
choice: No
choice: Yes
answer: No
explain: The length is directly derived from existing state during rendering.
```

Passing loadShelf rather than loadShelf() provides a lazy initializer. [books] makes the Effect run when the array changes, not every time title changes. A storage error is separate from form validation so typing cannot hide a persistence failure. Development Strict Mode may repeat setup to reveal bugs: effects need correct cleanup when they subscribe or start work. This storage write is safe to repeat.

```jsx file=react/App.jsx
import React, { useState, useEffect } from 'react';
function BookCard({ book, onRemove }) {
  return <article><h2>{book.title}</h2><p>{book.author}</p><button onClick={() => onRemove(book.id)}>Remove {book.title}</button></article>;
}
function loadShelf() {
  try {
    const value = JSON.parse(localStorage.getItem('reading-room-v1') ?? '[]');
    if (!Array.isArray(value) || !value.every(book => book && typeof book.id === 'string' && typeof book.title === 'string' && typeof book.author === 'string')) return [];
    return new Set(value.map(book => book.id)).size === value.length ? value : [];
  } catch { return []; }
}
export function App() {
  const [books, setBooks] = useState(loadShelf);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try { localStorage.setItem('reading-room-v1', JSON.stringify(books)); setStorageError(''); }
    catch { setStorageError('Storage unavailable; changes will not survive reload.'); }
  }, [books]);
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
    {storageError && <p role="alert">{storageError}</p>}
    <form onSubmit={add}><label htmlFor="title">Book title</label><input id="title" value={title} onChange={event => setTitle(event.target.value)} /><button>Add book</button></form>
    <p role="status">{error || `${books.length} ${books.length === 1 ? 'book' : 'books'} saved`}</p>
    {books.length === 0 && <p>Your shelf is empty. Add a book you want to read.</p>}
    {books.map(book => <BookCard key={book.id} book={book} onRemove={remove} />)}
  </main>;
}
```

```check
page react/index.html "(async () => { const input=document.querySelector('#title'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Design Book'); input.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,20)); input.form.requestSubmit(); await new Promise(r=>setTimeout(r,20)); return JSON.parse(localStorage.getItem('reading-room-v1'))[0].title; })()" "Design Book" server=vite
```

## Your turn: record why this is an effect

Create design/react-state.txt with Source: books, Derived: books.length, and External: localStorage. Add a sentence explaining why filtering the array for display does not require an Effect. Run the app with corrupt reading-room-v1 data and verify recovery.

```check
contains design/react-state.txt "Derived: books.length"
contains design/react-state.txt "External: localStorage"
```

```hints
nudge: Ask whether the operation changes something outside the render calculation.
concept: Derived UI can be calculated directly from state.
shape: Name the source, a derived fact and the external system separately.
```

## Diagnose, explain and review

Temporarily use [] instead of [books] and add a book: the UI changes but storage no longer follows later edits. Restore the dependency. Reload and compare. Do not silence dependency warnings to hide stale closures. Test storage blocked and corrupted; a successful reload is only one case.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
