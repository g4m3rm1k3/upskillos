---
title: 6.2 — Component behavior and accessibility contracts
track: Frontend Developer Bootcamp — Bootstrap Service Dashboard
trackOrder: 50.06
runtime: none
---

Outcome: integrate a disclosure with a button, an accessible state and a controlled panel. A library component is an interaction contract as well as a look. Learn what its JavaScript manages so you do not add a competing click handler.

### The story so far

The dashboard now uses Bootstrap’s CSS. A disclosure also needs behavior: it must expand and collapse a panel and expose that state. CSS can draw an open-looking box without connecting any interaction.

This lesson makes the HTML-to-JavaScript contract explicit. The lesson title says component behavior because that contract is part of the component, not an optional finishing step.

## Wire the button to its panel

### A control needs a relationship and a state

Think of a light switch with a room label. The label identifies what it controls; the switch position communicates its current setting. A button’s aria-controls identifies the panel, and aria-expanded communicates whether the panel is open.

The analogy is imperfect: aria-controls does not physically wire anything. Bootstrap’s data-bs-target tells its JavaScript which element to operate on. Accessible description and implementation wiring must agree, but neither substitutes for the other.

```text
button data-bs-target="#policy" → plugin finds id="policy"
plugin changes panel visibility → plugin updates button aria-expanded
```

If the target id is misspelled, the intended relationship breaks even though the button can still look correct.

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

### Native behavior reduces the work you inherit

A button supports keyboard activation and exposes its role. type="button" prevents it from becoming an accidental submit control if the layout later places it inside a form. The plugin supplies disclosure state changes; your content still supplies a meaningful name and an appropriate reason to hide or show information.

**Rule of thumb:** use disclosure for secondary detail that people can choose to inspect, not to conceal information everyone needs for the next decision. A return policy can be supplementary; the price of the item being purchased should not require a guessing game.

```check
page dashboard/index.html "document.querySelector('[aria-controls]').getAttribute('aria-controls')" "policy" server=vite
```

## Import only the needed behavior

Predict the observable result before opening the reference.

```predict
question: The policy starts collapsed. After one activation, what should aria-expanded report?
choice: true
choice: false
choice: The attribute disappears
answer: true
explain: The plugin opens the controlled panel and updates the expanded state on its trigger.
verify: page dashboard/index.html "(async () => { const b=document.querySelector('[aria-controls]'); b.click(); await new Promise(r=>setTimeout(r,400)); return b.getAttribute('aria-expanded'); })()" server=vite
```

This loads Collapse instead of every Bootstrap plugin. It installs the documented data-attribute behavior. You do not need jQuery. Click the button and inspect aria-expanded; Tab and Enter must work too.

```javascript file=dashboard/app.js
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/js/dist/collapse';
```

### Avoid two competing owners

The plugin recognizes Bootstrap’s data attributes and attaches behavior. If you also add a custom click handler that independently flips classes and aria-expanded, the two systems can disagree or toggle twice. Choose one owner for that state.

This idea transfers to React later: do not let a framework and a DOM plugin both freely mutate the same subtree without a deliberate integration boundary.

### Import size is a tradeoff you can measure

Importing only Collapse can avoid shipping unrelated behavior. Do not assume a particular savings without inspecting the built output; bundlers and package structure determine what is included. First choose the needed behavior, then measure the production artifact.

A modal dialog is a more demanding component than a disclosure. It typically needs focus placement, containment, Escape behavior, accessible naming and return focus. A library may supply some of this, but you still need to test the actual integration. “It opens” is only one part of the contract.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Describe what aria-expanded tells a screen reader and what data-bs-target tells the plugin. Then explain why a CSS-only screenshot cannot prove the disclosure works. Test open, closed and keyboard activation states, and verify the relationship survives a change to the visible button wording.
