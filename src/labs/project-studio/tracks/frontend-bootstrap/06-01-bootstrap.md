---
title: 6.1 — Use Bootstrap after understanding the CSS
track: Frontend Developer Bootcamp — Bootstrap Service Dashboard
trackOrder: 50.06
runtime: none
reference: optional
---

Outcome: build a dashboard using an established component system and explain its tradeoffs. Bootstrap supplies components, layout classes and variables. Tailwind (later) supplies utilities from which you compose your own components. Neither library replaces semantic HTML, accessibility testing or design judgment.

## Install a dependency deliberately

Before trying this step, make a prediction.

```predict
question: Does a Bootstrap heading-size class change the semantic heading level?
choice: No
choice: Yes
answer: No
explain: The HTML tag determines semantics; the class controls presentation.
```

Update package.json to add Bootstrap, then run npm install at the root. Keep package-lock.json. The repository hosting this course has its own dependencies: never install the learner app into that repository. The course uses Bootstrap 5.3’s color modes and component conventions; exact versions are recorded by the lockfile.

```json file=package.json
{
  "name": "frontend-portfolio",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "devDependencies": {
    "vite": "8.3.4"
  },
  "dependencies": {
    "bootstrap": "5.3.8"
  }
}
```

```check
contains package.json "\"bootstrap\": \"5.3.8\""
```

## Build the dashboard structure

container constrains width; row and col-* implement a responsive grid; g-3 adds gutters. col-12 occupies the full row until col-md-6 switches to half. h4 changes appearance without changing the heading’s semantic level. py-4 is vertical padding. Each class maps to real CSS you can inspect.

```html file=dashboard/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Service Desk</title>
</head>
<body>
  <main class="container py-4">
    <h1>Service Desk</h1>
    <p class="lead">A calm overview of this week's support work.</p>
    <div class="row g-3">
      <section class="col-12 col-md-6" aria-labelledby="open-title"><div class="card h-100"><div class="card-body"><h2 id="open-title" class="h4">Open tickets</h2><p class="display-6">12</p><p>Needs a response from our team.</p></div></div></section>
      <section class="col-12 col-md-6" aria-labelledby="closed-title"><div class="card h-100"><div class="card-body"><h2 id="closed-title" class="h4">Resolved tickets</h2><p class="display-6">28</p><p>Confirmed resolved by the customer.</p></div></div></section>
    </div>
  </main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

```check
page dashboard/index.html "document.querySelectorAll('section h2').length" "2" server=static
```

## Load library CSS through the bundler

A bare import names an installed package rather than a relative file. Vite resolves it from node_modules and includes its CSS. Open /dashboard/index.html through npm run dev; file:// cannot resolve package imports. This check uses the learner’s Vite server.

```javascript file=dashboard/app.js
import 'bootstrap/dist/css/bootstrap.min.css';
```

```check
page dashboard/index.html "getComputedStyle(document.querySelector('.row')).display" "flex" server=vite
```

## Your turn: use spacing consistently

Change row g-3 to row g-4. Compare the visual rhythm with the earlier handmade café page and explain the tradeoff between a fixed library scale and your own tokens.

```check
page dashboard/index.html "document.querySelector('.row').classList.contains('g-4')" "true" server=vite
```

```hints
nudge: Change the gutter on the grid, not margins on every card.
concept: The g-* utilities set both horizontal and vertical grid gutters.
shape: Replace the grid container’s spacing class and inspect the generated variable.
```

## Diagnose, explain and review

Temporarily remove the CSS import: semantic content remains, while layout and component styles disappear. Restore it. Resize across the md breakpoint and check reading order. Reference: https://getbootstrap.com/docs/5.3/ . Do not mix CDN and installed copies of the same library.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
