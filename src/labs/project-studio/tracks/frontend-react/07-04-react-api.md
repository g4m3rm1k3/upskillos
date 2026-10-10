---
title: 7.4 — Combine React with the API boundary
track: Frontend Developer Bootcamp — React Reading List
trackOrder: 50.07
runtime: none
reference: optional
---

Outcome: search the catalog and save results into the same shelf. Keep the API client independent of React and reuse its validation. The search component owns transient request state; App owns the persistent shelf. A callback connects them without sharing mutable global data.

## Clean up obsolete work

Before trying this step, make a prediction.

```predict
question: Should changing the raw input text necessarily request the API immediately?
choice: No
choice: Yes
answer: No
explain: This app submits explicitly; the committed query triggers the Effect.
```

Changing query reruns the Effect after its cleanup. The active flag rejects stale responses even if abort is ignored; abort releases network work. query is an object so submitting the same text can intentionally retry. The raw input text does not trigger a request on every keystroke. This is a small app; larger apps may use a server-state library for caching and deduplication instead of growing custom effects.

```jsx file=react/BookSearch.jsx
import React, { useEffect, useState } from 'react';
import { searchBooks } from '../books/api.mjs';
export function BookSearch({ onSave }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState(null);
  const [result, setResult] = useState({ state: 'idle', books: [] });
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    let active = true;
    setResult({ state: 'loading', books: [] });
    searchBooks(query.text, fetch, controller.signal).then(books => {
      if (active) setResult({ state: 'success', books });
    }).catch(error => {
      if (active && error.name !== 'AbortError') setResult({ state: 'error', books: [] });
    });
    return () => { active = false; controller.abort(); };
  }, [query]);
  return <section aria-labelledby="search-title">
    <h2 id="search-title">Find your next book</h2>
    <form onSubmit={event => { event.preventDefault(); setQuery({ text: text.trim() }); }}>
      <label htmlFor="book-query">Title or author</label><input id="book-query" required value={text} onChange={event => setText(event.target.value)} /><button>Search catalog</button>
    </form>
    <p role="status">{result.state === 'loading' ? 'Searching…' : result.state === 'error' ? 'Search failed. Submit again to retry.' : result.state === 'success' ? `${result.books.length} results` : 'Search Open Library.'}</p>
    <ul>{result.books.map(book => <li key={book.id}>{book.title} — {book.author} <button onClick={() => onSave(book)}>Save {book.title}</button></li>)}</ul>
  </section>;
}
```

```check
contains react/BookSearch.jsx "controller.abort()"
```

## Save by stable API identity

Import the child and pass a callback. some asks whether any saved id matches; if so return the existing array, otherwise append the new book. This prevents repeated saving of one API result. Manually added books use generated ids, so matching titles are not treated as identity.

```jsx file=react/App.jsx
import React, { useState, useEffect } from 'react';
import { BookSearch } from './BookSearch.jsx';
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
page react/index.html "document.querySelector('#book-query').labels[0].textContent" "Title or author" server=vite
```

## Your turn: explain an empty catalog result

When a successful query returns an empty list, show No matches. Try fewer words. beneath the status. Do not show it in the initial idle state or while loading. Test both an empty fixture and a real search.

```check
page react/index.html "(async () => { window.fetch=async()=>({ok:true,json:async()=>({docs:[]})}); const i=document.querySelector('#book-query'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'none'); i.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,20)); i.form.requestSubmit(); await new Promise(r=>setTimeout(r,40)); return document.body.textContent.includes('No matches. Try fewer words.'); })()" "true" server=vite
```

```hints
nudge: An empty list has different meanings at different stages.
concept: Render only when success and zero length are both true.
shape: Combine the two conditions with && before the explanatory paragraph.
```

## Diagnose, explain and review

Use an offline fixture and submit twice with the same text; retry must remain possible. Add an API result twice and confirm only one saved card. Change query quickly and verify cleanup prevents stale results. Compare the React and DOM implementations: which logic belongs in the reusable API module and which belongs in UI state?

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
