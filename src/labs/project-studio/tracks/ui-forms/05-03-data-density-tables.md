---
title: 5.3 — Data Density, Number Alignment and Sticky Headers
track: CSS & Interface Engineering — Form UX and Data Density
trackOrder: 45.43
runtime: none
---

When enterprise applications present dense tabular data, developers often create tables that are exhausting to read:
1. **Left-Aligned Numbers:** Quantities and currencies are left-aligned (`120.45` and `9.10`). Because decimal points do not line up vertically, the human eye cannot compare numbers at a glance.
2. **Jittering Digits (Proportional Numbers):** In standard fonts, the number `1` is narrower than the number `8`. When numbers update in real-time or stack vertically, columns wobble and jitter.
3. **Lost Context on Scroll:** Scrolling through 50 rows of data causes table headers to disappear, leaving users confused about which column is which.

In this lesson, you will master **data density engineering**, **`tabular-nums` font metrics**, column alignment rules, and **sticky table headers**.

Continue in `interface-studio/`, editing `settings-matrix/`.

### The story so far

You have mastered form inputs and custom accessible controls. Now, you will build dense, scannable data tables that handle enterprise volumes cleanly.

```text
Left-Aligned Text (Reading Flow) + Right-Aligned Numbers (Aligned Decimals) + Tabular Numerics = Clean Data Density
```

## Master column alignment and sticky tables

### 1. The Universal Alignment Rules

To make dense tables instantly scannable, follow these strict rules:
* **Text / Names / Titles:** **Left-aligned** (`text-align: left`). Eyes read left-to-right.
* **Numbers / Currencies / Latencies:** **Right-aligned** (`text-align: right`). This guarantees that ones, tens, hundreds, and decimal points align vertically!
* **Status Badges / Checkboxes:** **Centered** (`text-align: center`).

### 2. The Power of `tabular-nums`

By default, most fonts use **proportional numbers** (the number `1` is physically thinner than `8`).
In CSS, activate monospace numeric glyphs within proportional fonts:
```css
/* All numbers occupy the exact same horizontal width */
font-variant-numeric: tabular-nums;
```

### 3. Sticky Table Headers

To keep headers visible during vertical scrolling inside an application panel:
```css
.table-container {
  max-height: 24rem;
  overflow-y: auto;
}

th {
  position: sticky;
  top: 0;
  background-color: var(--color-surface);
  z-index: 10;
}
```

```predict
question: Why must numeric columns in financial or metrics tables always be right-aligned?
choice: So decimal places, ones, tens, and hundreds columns align vertically for instant comparison
choice: Because CSS table engines fail to render decimals on the left
answer: So decimal places, ones, tens, and hundreds columns align vertically for instant comparison
explain: Right-aligning numbers guarantees that decimal points and order-of-magnitude digits line up vertically, allowing the eye to scan and compare quantities effortlessly.
```

Update `settings-matrix/style.css` to add the dense data table rules:

```css file=settings-matrix/style.css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --color-canvas: #090d16;
  --color-surface: #131b2e;
  --color-surface-hover: #1c2640;
  --color-border: #263354;
  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-brand: #38bdf8;
  --color-brand-tint: rgba(56, 189, 248, 0.12);
  --color-success: #34d399;
  --color-success-tint: rgba(52, 211, 153, 0.12);

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;

  --font-family: system-ui, -apple-system, sans-serif;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
  line-height: 1.5;
  padding: var(--space-8) var(--space-4);
}

.table-card {
  max-width: 52rem;
  margin: 0 auto;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.table-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table-title {
  font-size: 1.125rem;
  font-weight: 700;
}

/* Scroll Container for Sticky Header */
.table-scroll {
  max-height: 20rem;
  overflow-y: auto;
}

/* 1. Base Table Architecture */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

/* 2. Sticky Header Styling */
.data-table th {
  position: sticky;
  top: 0;
  background-color: #172138;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.6875rem;
  letter-spacing: 0.05em;
  padding: var(--space-3) var(--space-4);
  z-index: 10;
}

.data-table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(38, 51, 84, 0.5);
  color: var(--color-text-primary);
}

.data-table tr:hover td {
  background-color: var(--color-surface-hover);
}

/* 3. Strict Column Alignments */
.col-text {
  text-align: left;
}

.col-number {
  text-align: right;
  font-variant-numeric: tabular-nums; /* Monospace digit widths */
  font-family: inherit;
}

.col-status {
  text-align: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background-color: var(--color-success-tint);
  color: var(--color-success);
}
```

```check
page settings-matrix/index.html "getComputedStyle(document.querySelector('.col-number')).textAlign" "right" server=static
page settings-matrix/index.html "getComputedStyle(document.querySelector('.col-number')).fontVariantNumeric" "tabular-nums" server=static
```

## Structure the data table markup

Update `settings-matrix/index.html` to add the dense data table:

```html file=settings-matrix/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Settings · Data Density Table</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="table-card">
    <header class="table-header">
      <div>
        <h1 class="table-title">Cluster Endpoint Latency</h1>
        <p style="font-size: 0.75rem; color: var(--color-text-muted);">
          Right-aligned tabular-nums metrics with sticky table headers.
        </p>
      </div>
    </header>

    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-text">Endpoint Node</th>
            <th class="col-status">Status</th>
            <th class="col-number">Req / Sec</th>
            <th class="col-number">p99 Latency</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="col-text">us-east-core.aura.io</td>
            <td class="col-status"><span class="status-badge">Operational</span></td>
            <td class="col-number">48,291</td>
            <td class="col-number">14.2 ms</td>
          </tr>
          <tr>
            <td class="col-text">eu-central-ingress.aura.io</td>
            <td class="col-status"><span class="status-badge">Operational</span></td>
            <td class="col-number">31,040</td>
            <td class="col-number">18.7 ms</td>
          </tr>
          <tr>
            <td class="col-text">ap-northeast-cluster.aura.io</td>
            <td class="col-status"><span class="status-badge">Operational</span></td>
            <td class="col-number">9,182</td>
            <td class="col-number">112.4 ms</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
```

### Inspect the Numeric Vertical Rhythm

Look down the **p99 Latency** and **Req / Sec** columns:
* Notice how the commas and decimal points (`14.2`, `18.7`, `112.4`) align vertically down the right edge.
* Because `tabular-nums` is active, digits stack with uniform monospace spacing. The columns never wobble or misalign!

```check
page settings-matrix/index.html "document.querySelectorAll('tbody tr').length" "3" server=static
page settings-matrix/index.html "getComputedStyle(document.querySelector('th')).position" "sticky" server=static
```

## Your turn: add a fourth regional cluster row

Add a fourth row to `<tbody>` for `sa-east-edge.aura.io`.
Inside it:
1. Set the node text to `sa-east-edge.aura.io` (class `col-text`).
2. Add a status cell (class `col-status`) with a `<span class="status-badge">Operational</span>`.
3. Add a throughput cell (class `col-number`) with `14,820`.
4. Add a latency cell (class `col-number`) with `48.9 ms`.

Save both files and reload. Confirm that the numbers align with the existing rows.

```check
page settings-matrix/index.html "document.querySelectorAll('tbody tr').length" "4" server=static
page settings-matrix/index.html "document.querySelectorAll('.col-number').length" "10" server=static
```

```hints
nudge: Add a tr element inside tbody with four td elements.
concept: Sibling table rows inherit the column text-alignment and tabular-nums rules from their td classes.
shape: Add tr containing td class="col-text", td class="col-status", and two td class="col-number".
```

## Diagnose, explain and review

Open Developer Tools and inspect `.col-number`.
In the Styles panel, change `text-align: right` to `text-align: left`.
Observe the result:
* In `112.4 ms` vs `14.2 ms`, the `112` pushes the decimal far to the right, while `14.2` keeps the decimal on the left.
* Scanning the column to find the fastest and slowest nodes becomes slow and frustrating.
* Restore `text-align: right`: the largest numbers immediately reveal their magnitude visually!

Write in your learning journal:
1. Why must numbers always be right-aligned in tables?
2. What does `font-variant-numeric: tabular-nums` do to prevent numeric jitter?
3. What CSS properties make a `<th>` element sticky during scrolling?

These checks establish that table cell alignment, tabular-nums font variants, and sticky th positions are active, but do not prove that screen readers navigate cell headers using ARIA column scopes without voiceover testing.

### Explain it without the reference

Close this tab and explain:
* The 3 column alignment rules for text, numbers, and status badges.
* How `tabular-nums` ensures numbers stack cleanly.
* How `position: sticky; top: 0;` works on table headers.
