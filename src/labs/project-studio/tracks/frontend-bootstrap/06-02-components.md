---
title: 6.2 — Component behavior and accessibility contracts
track: Frontend Developer Bootcamp — Bootstrap Service Dashboard
trackOrder: 50.06
runtime: none
reference: optional
---

Outcome: integrate a disclosure with a button, an accessible state and a controlled panel. A library component is an interaction contract as well as a look. Learn what its JavaScript manages so you do not add a competing click handler.

## Wire the button to its panel

Before trying this step, make a prediction.

```predict
question: Does a visible control guarantee that its interaction behavior is connected?
choice: No
choice: Yes
answer: No
explain: Rendering and event behavior are different contracts and need different checks.
```

data-bs-target must identify the panel; aria-controls describes the relationship; aria-expanded exposes open/closed state. Bootstrap updates expanded state after its plugin is loaded. Use collapse for supplemental detail, not information essential to understand the page.

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
    <div class="row g-4">
      <section class="col-12 col-md-6" aria-labelledby="open-title"><div class="card h-100"><div class="card-body"><h2 id="open-title" class="h4">Open tickets</h2><p class="display-6">12</p><p>Needs a response from our team.</p></div></div></section>
      <section class="col-12 col-md-6" aria-labelledby="closed-title"><div class="card h-100"><div class="card-body"><h2 id="closed-title" class="h4">Resolved tickets</h2><p class="display-6">28</p><p>Confirmed resolved by the customer.</p></div></div></section>
    </div>
    <section class="mt-4" aria-labelledby="details-title">
      <h2 id="details-title" class="h4">Response policy</h2>
      <button class="btn btn-primary" type="button" data-bs-toggle="collapse" data-bs-target="#policy" aria-expanded="false" aria-controls="policy">Show response policy</button>
      <div class="collapse mt-2" id="policy"><p>We reply within two working days. Urgent accessibility issues are prioritized.</p></div>
    </section>
  </main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

```check
page dashboard/index.html "document.querySelector('[aria-controls]').getAttribute('aria-controls')" "policy" server=vite
```

## Import only the needed behavior

This loads Collapse instead of every Bootstrap plugin. It installs the documented data-attribute behavior. You do not need jQuery. Click the button and inspect aria-expanded; Tab and Enter must work too.

```javascript file=dashboard/app.js
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/js/dist/collapse';
```

```check
page dashboard/index.html "(async () => { const b=document.querySelector('[aria-controls]'); b.click(); await new Promise(r=>setTimeout(r,400)); return b.getAttribute('aria-expanded'); })()" "true" server=vite
```

## Your turn: switch the library theme

Add data-bs-theme="dark" to html. Verify that the page and card colors change, not just the text. Compare this library attribute with the handmade data-theme tokens. Record which one belongs to each system.

```check
page dashboard/index.html "document.documentElement.getAttribute('data-bs-theme')" "dark" server=vite
```

```hints
nudge: Bootstrap’s theme convention is part of its API.
concept: An attribute on html cascades to the whole document.
shape: Set data-bs-theme on the root and inspect cards and focus in the dark palette.
```

## Diagnose, explain and review

Misspell data-bs-target and observe a button that cannot find its panel; restore it. Avoid loading Bootstrap’s global CSS into the café or React app: resets and component rules can conflict. For dialogs, learn focus trapping, Escape, accessible naming and focus return before adding one. A styled box is not a modal.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
