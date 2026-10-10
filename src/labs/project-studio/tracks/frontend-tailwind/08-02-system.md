---
title: 8.2 — Build a small design system with component contracts
track: Frontend Developer Bootcamp — Tailwind and a Component System
trackOrder: 50.08
runtime: none
reference: optional
---

Outcome: express repeated behavior and design choices in a reusable component. A design system combines tokens, components, content rules and usage guidance. It is more than a folder of buttons. Start with real repeated needs; avoid creating dozens of variants before a product needs them.

## Make safe defaults explicit

Before trying this step, make a prediction.

```predict
question: Is a gray button automatically disabled?
choice: No
choice: Yes
answer: No
explain: Appearance does not prevent events; native disabled establishes that behavior.
```

children is the nested button content. ...props forwards event handlers, disabled and accessible labels. Default type="button" avoids accidentally submitting a surrounding form. Map named variants to complete literal class strings so Tailwind can discover them. Native disabled prevents interaction; aria-disabled alone would not.

```jsx file=react/Button.jsx
import React from 'react';
const variants = {
  primary: 'bg-brand-700 text-white dark:bg-brand-200 dark:text-slate-950',
  secondary: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
};
export function Button({ variant = 'primary', type = 'button', children, ...props }) {
  return <button {...props} type={type} className={`min-h-11 rounded-lg px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] ?? variants.primary}`}>{children}</button>;
}
```

```check
contains react/Button.jsx "type = 'button'"
```

## Use the quieter action variant

Removing a book should not visually overpower adding or searching. Reuse Button for removal with secondary styling. Decide hierarchy by importance and frequency, not by giving every action the strongest color. The native button still has a descriptive accessible name.

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
    <BookSearch onSave={book => setBooks(previous => previous.some(item => item.id === book.id) ? previous : [...previous, book])} />
    {storageError && <p role="alert">{storageError}</p>}
    <form onSubmit={add}><label htmlFor="title">Book title</label><input id="title" value={title} onChange={event => setTitle(event.target.value)} /><button>Add book</button></form>
    <p role="status">{error || `${books.length} ${books.length === 1 ? 'book' : 'books'} saved`}</p>
    {books.length === 0 && <p>Your shelf is empty. Add a book you want to read.</p>}
    {books.map(book => <BookCard key={book.id} book={book} onRemove={remove} />)}
  </main>;
}
```

```check
page react/index.html "(async () => { const input=document.querySelector('#title'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Design Book'); input.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,20)); input.form.requestSubmit(); await new Promise(r=>setTimeout(r,20)); return document.querySelector('article button').type; })()" "button" server=vite
```

## Your turn: document when to use each variant

Create design/components.txt with Primary:, Secondary:, Focus:, and Disabled: guidance. State that there should be one clear primary action per task region, secondary actions must remain readable, focus must be visible, and disabled actions need an explanation. Include one screenshot reference from your own app if useful.

```check
contains design/components.txt "Focus:"
contains design/components.txt "Disabled:"
```

```hints
nudge: A style needs usage rules to be a system.
concept: Include interaction states, not only default colors.
shape: Explain intent, visible focus and recovery from disabled actions.
```

## Diagnose, explain and review

Place a temporary Button inside a form with no type prop and confirm it does not submit; a plain button defaults to submit. Remove the experiment. Review pointer, keyboard, touch, hover, active, focus and disabled appearances. Test the actual disabled attribute rather than a gray appearance alone.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
