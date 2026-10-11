---
title: 8.3 — Carry theme and accessibility through the system
track: Frontend Developer Bootcamp — Tailwind and a Component System
trackOrder: 50.08
runtime: none
---

Outcome: apply dark-mode tokens to the real component tree and persist the choice. This React version reads the operating system on first use, then saves a choice; unlike the café extension it does not keep following later system changes. State the policy so behavior is predictable.

### The story so far

The handmade café theme gave you the underlying mechanics: choose a recognized value, update a root attribute, and let CSS consume tokens. This React version keeps the same mechanism but makes the chosen value component state.

The important design decision is the policy: this app reads the system on first use and then persists a choice. It does not yet implement a separate “follow system forever” mode. A product should name that limitation rather than hiding it.

## Synchronize the root attribute

### Two systems, one source of truth

```text
React theme state
  ├─ render → aria-pressed on the button
  └─ Effect → html data-theme → Tailwind dark variants
            → best-effort localStorage write
```

React owns the decision. The effect synchronizes the browser attribute and storage. CSS owns the presentation. Keeping those roles separate prevents a component from maintaining a second contradictory flag such as isDarkButtonPressed.

The theme is like a named lighting preset shared by multiple rooms. Every room can interpret the preset using its own appropriate surface roles, but all must agree on which preset is active. The analogy does not justify applying a blanket invert filter: images, brand colors and contrast pairs need intentional choices.

Before trying this step, make a prediction.

```predict
question: Does a CSS dark variant choose the theme by itself?
choice: No
choice: Yes
answer: No
explain: The variant defines conditional styles; state and the root attribute select them.
```

The theme state drives an Effect that updates html. aria-pressed stays derived from theme. The functional setter toggles the latest value. localStorage failures leave the current session usable. Because effects run after paint, a production app may need an early theme initializer to avoid a light flash; measure that before adding more complexity.

```jsx file=react/App.jsx
import React, { useState, useEffect } from 'react';
import { BookSearch } from './BookSearch.jsx';
import { Button } from './Button.jsx';
function BookCard({ book, onRemove }) {
  return <article><h2>{book.title}</h2><p>{book.author}</p><Button variant="secondary" onClick={() => onRemove(book.id)}>Remove {book.title}</Button></article>;
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
  const [theme, setTheme] = useState(() => {
    try { const saved = localStorage.getItem('reading-theme'); if (saved === 'dark' || saved === 'light') return saved; } catch {}
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('reading-theme', theme); } catch {}
  }, [theme]);
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
    <Button aria-pressed={theme === 'dark'} onClick={() => setTheme(previous => previous === 'dark' ? 'light' : 'dark')}>Dark theme</Button>
    <BookSearch onSave={book => setBooks(previous => previous.some(item => item.id === book.id) ? previous : [...previous, book])} />
    {storageError && <p role="alert">{storageError}</p>}
    <form onSubmit={add}><label htmlFor="title">Book title</label><input id="title" value={title} onChange={event => setTitle(event.target.value)} /><button>Add book</button></form>
    <p role="status">{error || `${books.length} ${books.length === 1 ? 'book' : 'books'} saved`}</p>
    {books.length === 0 && <p>Your shelf is empty. Add a book you want to read.</p>}
    {books.map(book => <BookCard key={book.id} book={book} onRemove={remove} />)}
  </main>;
}
```

### Trace the first render and a click

The initializer tries the saved value first, accepting only light or dark. Otherwise it reads matchMedia. The render describes the button’s pressed state. After commit, the effect sets the root attribute and attempts to save.

On click, the updater receives the previous theme and chooses the opposite one. React renders again, and the effect synchronizes again. Storage failure must not prevent the in-memory switch. It may mean the next reload falls back to an earlier preference or the system default.

Because this synchronization happens after paint, a production page can briefly display the wrong palette. An early initializer can address that, but it must use the same policy as the React code. Two different policies create a flash or mismatch of their own. Measure and explain the actual issue before adding a complicated solution.

**Rule of thumb:** review a theme by roles and states, not only the page background. Check card surfaces, borders, input text, placeholders, buttons, disabled actions, links and focus indicators. A theme that makes the page dark while leaving an unreadable input is not finished.

Long content is part of that review. The independent task adds wrapping because a good palette cannot rescue a card that overflows on a narrow screen.

```check
page react/index.html "(async () => { const before=document.documentElement.dataset.theme; document.querySelector('button[aria-pressed]').click(); await new Promise(r=>setTimeout(r,30)); return document.documentElement.dataset.theme !== before && localStorage.getItem('reading-theme') === document.documentElement.dataset.theme; })()" "true" server=vite
```

## Your turn: protect long book titles

Add break-words to the BookCard article’s className. Use a book title containing a long uninterrupted word and verify the card stays within a narrow viewport. Keep title, author and Remove button in a logical reading order.

```check
page react/index.html "(async () => { const input=document.querySelector('#title'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Design Book'); input.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,20)); input.form.requestSubmit(); await new Promise(r=>setTimeout(r,20)); return getComputedStyle(document.querySelector('article')).overflowWrap; })()" "break-word" server=vite
```

```hints
nudge: A responsive shell does not guarantee responsive content.
concept: The word-wrapping utility must apply to the text container.
shape: Add a literal class to the article and test a pathological title.
```

## Diagnose, explain and review

Inspect dark mode in grayscale and keyboard-only mode. Is primary action still distinguishable by placement and wording? Zoom to 200%, emulate reduced motion, and test the longest title. Toggle back and reload. Record one design adjustment from this review rather than treating a green theme check as aesthetic approval.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Draw the path from a theme button click to the final background color and identify what React, the Effect and CSS each do. Then explain how you would add a genuine system mode without letting later operating-system changes override an explicit manual light or dark choice.
