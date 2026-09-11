# Lesson 13 — Capstone: Ship One App, One Game

There's no new concept here — this lesson is a checklist and a set of
decisions, not a teaching lesson like 1-12. The goal is applying everything
already built, once, without a lesson holding your hand through the syntax.

## What you'll build
One app and one game from this series (your choice), each polished past its
lesson version, combined into a single small multi-page site.

## Step 1 — Pick your two projects

Suggested pairings, from least to most ambitious:

- **Todo (Lesson 9, React version) + Number Guessing Game (Lesson 2, vanilla)**
  Lowest lift — mostly styling and small feature additions.
- **Weather Dashboard (Lesson 11, React/useEffect) + Snake (Lesson 7, vanilla/OOP)**
  Good middle ground — shows off both your fetch/hooks work and your OOP work.
- **Weather Dashboard (Lesson 11) + Pong (Lesson 12, canvas-in-React)**
  Most ambitious, and the most "impressive to show someone" combination,
  since both are already in React and can share one codebase directly.

There's no wrong choice — pick whichever two you personally enjoyed most.
If a project only exists in its vanilla form (e.g. you didn't rebuild it in
React), you can either port it now using Lessons 9-12's patterns, or keep it
as a standalone vanilla page linked from the same site — both are legitimate.

## Step 2 — Polish checklist

Go through this for **each** of your two chosen projects. None of these are
new concepts — each is a small, targeted application of something already
covered.

- [ ] **Edge cases from that lesson's Exercise section** — did you actually
      do the "Repair" exercise for your chosen projects back when you first
      built them? If not, do it now — most of them fix a real, named bug.
- [ ] **Empty/error states look intentional, not broken** — e.g. Snake's
      game-over screen, the weather dashboard's error message, the todo
      list with zero items — style these deliberately rather than leaving
      browser-default text sitting alone on a blank page.
- [ ] **Basic responsive sizing** — does your canvas or layout completely
      break on a narrower window? You don't need full mobile support, just
      "doesn't look obviously broken at a few different widths."
- [ ] **One README per project** (or one for the whole site) — a few
      sentences on what it is and which lesson's concepts it demonstrates.
      This is for future-you, six months from now, as much as anyone else.
- [ ] **Remove leftover console.logs and commented-out experiment code**
      from earlier lessons' exercises, unless you're intentionally keeping
      them as a "here's what I tried" note.

## Step 3 — Combine into one site

The simplest version: one `index.html` landing page with links to each
project's own folder (each keeps its own `index.html`/`script.js` from
whichever lesson it came from — nothing needs to be merged into one file).

```html
<!DOCTYPE html>
<html>
<head><title>My Frontend Projects</title></head>
<body>
  <h1>Frontend Curriculum — Capstone</h1>
  <ul>
    <li><a href="weather-dashboard/index.html">Weather Dashboard</a></li>
    <li><a href="pong/index.html">Pong</a></li>
  </ul>
</body>
</html>
```

If both chosen projects are already React (e.g. Weather Dashboard + Pong
from Lessons 11-12), a more integrated version is reasonable too — a single
React app with simple tab/route switching between them, reusing what you
already know about components and state (no new routing library needed for
just two pages; a `useState` holding "which page is active," and
conditionally rendering one component or the other, is enough).

## Step 4 — Deploy (optional, but recommended)

You don't need a backend for any of these — everything in this series is
static HTML/CSS/JS (with external API calls made directly from the browser).
Any static hosting works: GitHub Pages, Netlify, Vercel, or similar are all
reasonable choices, in no particular order of preference — pick whichever
you're already familiar with, or whichever's free tier fits.

## Reflection — worth doing even informally

Before considering this finished, look back across all 12 lessons and ask
yourself, in your own words, without checking back:

- What's the difference between a method changing state and a function
  rendering it — and why did every single lesson insist on keeping those
  separate?
- Why did state updates need to avoid mutation in React, when Lessons 1-8
  mutated freely?
- Where does `useRef` fit that neither `useState` nor a plain variable does?

If any of these feel shaky, that's a real, useful signal — not a failure.
Go back to that lesson's file and redo one of its exercises before calling
the capstone done. The whole point of the typing-it-yourself approach this
series was built around is that it's fine, and expected, to revisit
something a second time once you've seen where it was headed.

## What's next

This is the end of the planned curriculum. If you want to keep going from
here, reasonable next directions — not part of this series, but natural
follow-ons — include: a proper build tool (Vite) instead of the CDN+Babel
setup used throughout Phase C, TypeScript on top of what you've already
built, or a backend of your own instead of only calling public third-party
APIs. None of these require unlearning anything here — they build directly
on it.
