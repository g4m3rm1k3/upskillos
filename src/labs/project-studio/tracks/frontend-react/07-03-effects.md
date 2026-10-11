---
title: 7.3 — Effects synchronize with things outside React
track: Frontend Developer Bootcamp — React Reading List
trackOrder: 50.07
runtime: none
---

Outcome: persist the shelf without performing side effects during rendering. Rendering should calculate UI. An Effect runs after React commits an update and synchronizes with an external system such as storage, a subscription or a network connection. Dependencies say which values trigger that synchronization.

### The story so far

The React shelf works during one page session. Persistence requires synchronization with a browser system outside React. The distinction to learn is not “useEffect runs after code”; it is “render calculates UI, while an Effect coordinates with an external system.”

You already built and validated storage functions in the planner. Here the same boundary is attached to the component lifecycle.

## Initialize once and save after changes

### Calculate versus synchronize

| Operation | Where it belongs in this app | Why |
|---|---|---|
| Count books | During render | It is a direct calculation from current state. |
| Filter books for display | During render | It derives a view without changing an external system. |
| Save shelf to localStorage | Effect | It writes to a browser system outside React. |
| React to a submit | Event handler | A specific user action caused it. |

An Effect is like keeping a wall display synchronized with a record book. The record is the source; the external display must be updated when relevant facts change. The analogy stops at scheduling details: React controls when effects run after a committed render.

The dependency array describes which reactive values the effect reads. It is not an arbitrary frequency dial. In this example books is the fact the storage write depends on.

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

### Why pass a function to useState?

`useState(loadShelf)` passes an initializer function for React to call when initializing state. `useState(loadShelf())` would call loadShelf while evaluating every render, even though React only needs the initial result once for that state initialization. Lazy initialization avoids unnecessary repeated reads.

Development Strict Mode can intentionally repeat initialization or effect setup to expose unsafe behavior. Initializers should be pure reads; effect setup should tolerate its documented lifecycle. Do not put an irreversible purchase or message send in an effect merely because you want it to happen “once.”

### Dependency failures have recognizable symptoms

With no dependency array, this effect would run after every committed render. With [], it would not follow later book changes. With [books], it follows the shelf. Mutating the same array object would undermine the intended change signal, which is another reason to use the immutable updates you learned earlier.

The effect also sets storageError. That variable communicates a different concern from error, which holds input validation feedback. Combining them into one string would let a successful form edit hide an unresolved storage problem.

**Rule of thumb:** before adding an Effect, ask “Which external system am I synchronizing?” If the answer is “I want to calculate a value from other state,” try calculating it during rendering first. When you do need an Effect, include the actual dependencies rather than suppressing warnings to force a preferred timing.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain why filtering a shelf in an Effect and saving another array creates unnecessary synchronization work. Then diagnose a shelf that updates on screen but restores the old contents after reload: identify the effect dependency, storage write and origin checks you would make before changing the card component.
