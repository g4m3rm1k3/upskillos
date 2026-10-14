---
title: 3.2 — Layered Diffuse Shadows and Nested Radius Geometry
track: CSS & Interface Engineering — Color Systems and Tokens
trackOrder: 45.22
runtime: none
---

Two visual flaws immediately signal that an interface was built by an amateur:
1. **Harsh Single Shadows:** A dark, muddy black smudge (`box-shadow: 0 4px 10px rgba(0,0,0,0.5)`). In the physical world, light does not create sharp black halos; light bounces off walls and floors, creating soft, multi-layered diffusion.
2. **Awkward Nested Corners:** An inner element (an avatar, badge, or image) placed inside a card with padding, where both use the same `border-radius`. The corners visually collide and look deformed.

In this lesson, you will learn the **multi-layer diffuse shadow technique** and the **nested radius geometry formula**.

Continue in `interface-studio/`, editing `analytics-cards/`.

### The story so far

You have an OKLCH semantic color palette. Now, you will introduce physical depth, realistic elevation layers, and geometric corner harmony.

```text
Physical Lighting (Key Light + Ambient Bounce) → Multi-Layer CSS Shadows → Concentric Nested Radius
```

## Master realistic shadows and concentric radii

### 1. The Physics of Realistic Shadows

In reality, an object sitting on a desk is illuminated by two distinct light sources:
* **Direct Key Light:** A directional overhead light casting a small, crisp shadow directly underneath the card.
* **Ambient Bounce Light:** Diffuse indirect light bouncing from the surrounding room, casting a broad, soft, low-contrast shadow.

To recreate physical reality in CSS, **never use a single shadow**. Always layer two shadows:
```css
/* Real-world elevation */
box-shadow:
  0 1px 2px 0 rgba(0, 0, 0, 0.05),      /* 1. Direct key light (crisp) */
  0 10px 15px -3px rgba(0, 0, 0, 0.08);  /* 2. Ambient bounce light (diffuse) */
```

### 2. The Concentric Nested Radius Formula

When one rounded container is nested inside another with padding, their curves must share the same center point (concentric circles).

The mathematical formula is:
$$\text{Inner Radius} = \text{Outer Radius} - \text{Padding}$$

* If your outer card has `border-radius: 16px` and `padding: 12px`:
$$\text{Inner Radius} = 16\text{px} - 12\text{px} = 4\text{px}$$
* If $\text{Padding} \ge \text{Outer Radius}$, the inner element should have `border-radius: 0` (or `2px` micro-radius), because the corner has already flattened out!

```predict
question: If an outer container has border-radius: 20px and padding: 12px, what must the inner child's border-radius be for their curves to look harmonious and concentric?
choice: 20px (both elements should always match)
choice: 8px (20px minus 12px)
answer: 8px (20px minus 12px)
explain: According to concentric geometry, the inner radius must equal the outer radius minus the intervening padding. Setting inner radius to 8px keeps the rounded corners perfectly parallel.
```

Update `analytics-cards/style.css` to add elevation levels and concentric preview cards:

```css file=analytics-cards/style.css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Elevation Shadows (Layered Key Light + Ambient Light) */
  --shadow-sm:
    0 1px 2px 0 rgba(15, 23, 42, 0.05);

  --shadow-md:
    0 2px 4px -1px rgba(15, 23, 42, 0.06),
    0 6px 12px -2px rgba(15, 23, 42, 0.08);

  --shadow-lg:
    0 4px 6px -2px rgba(15, 23, 42, 0.05),
    0 12px 24px -4px rgba(15, 23, 42, 0.12);

  --shadow-modal:
    0 8px 10px -4px rgba(15, 23, 42, 0.06),
    0 24px 38px -6px rgba(15, 23, 42, 0.16);

  /* OKLCH Perceptual Colors */
  --color-canvas: oklch(98% 0.005 240);
  --color-surface: oklch(100% 0 0);
  --color-surface-raised: oklch(99% 0.003 240);
  --color-border: oklch(92% 0.01 240);
  --color-border-subtle: oklch(95% 0.005 240);

  --color-text-primary: oklch(20% 0.02 240);
  --color-text-secondary: oklch(45% 0.02 240);
  --color-text-tertiary: oklch(65% 0.015 240);

  --color-brand: oklch(58% 0.22 250);
  --color-brand-tint: color-mix(in oklch, var(--color-brand) 10%, transparent);

  /* Concentric Geometric Radii */
  --radius-outer: 1rem;     /* 16px */
  --card-padding: 0.75rem;  /* 12px */
  /* Formula: 16px - 12px = 4px */
  --radius-inner: calc(var(--radius-outer) - var(--card-padding));

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

.container {
  max-width: 54rem;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.dashboard-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.dashboard-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* Elevation Showcase Matrix */
.elevation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

/* Elevated Card: Concentric nested geometry */
.elevated-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-outer);
  padding: var(--card-padding);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.elevated-card.level-1 {
  box-shadow: var(--shadow-sm);
}

.elevated-card.level-2 {
  box-shadow: var(--shadow-md);
}

.elevated-card.level-3 {
  box-shadow: var(--shadow-lg);
}

.elevated-card.level-3:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-modal);
}

/* Inner Thumbnail: Satisfies Inner Radius = Outer Radius - Padding */
.card-inner-box {
  background-color: var(--color-brand-tint);
  border-radius: var(--radius-inner);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-brand);
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.card-description {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}
```

```check
page analytics-cards/index.html "getComputedStyle(document.documentElement).getPropertyValue('--radius-inner').includes('calc')" "true" server=static
page analytics-cards/index.html "document.querySelectorAll('.elevated-card').length" "3" server=static
```

## Structure the concentric depth HTML

Update `analytics-cards/index.html` to render the elevation levels:

```html file=analytics-cards/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Telemetry · Shadows & Elevation</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <header class="dashboard-header">
      <h1 class="dashboard-title">Depth Physics & Concentric Radii</h1>
      <p class="dashboard-subtitle">
        Diffuse layered shadows simulate physical light bounces while nested radius math eliminates corner pinch.
      </p>
    </header>

    <main>
      <section class="elevation-grid">
        <!-- Level 1: Flat/Subtle -->
        <article class="elevated-card level-1">
          <div class="card-inner-box">Elevation · 01</div>
          <h2 class="card-title">Resting Surface</h2>
          <p class="card-description">
            Subtle 1px key shadow for base cards sitting directly on the canvas background.
          </p>
        </article>

        <!-- Level 2: Raised -->
        <article class="elevated-card level-2">
          <div class="card-inner-box">Elevation · 02</div>
          <h2 class="card-title">Floating Widget</h2>
          <p class="card-description">
            Dual-layer diffuse shadow with ambient spread for active panels and dropdown menus.
          </p>
        </article>

        <!-- Level 3: Overlay with Hover Lift -->
        <article class="elevated-card level-3">
          <div class="card-inner-box">Elevation · 03</div>
          <h2 class="card-title">Interactive Modal</h2>
          <p class="card-description">
            High ambient diffusion. Hovering gently lifts the card on the Y-axis using hardware-accelerated transforms.
          </p>
        </article>
      </section>
    </main>
  </div>
</body>
</html>
```

### Inspect the Corner Curves

Look closely at `.elevated-card` and `.card-inner-box`:
* The outer card has `border-radius: 16px` with `padding: 12px`.
* The inner box has `border-radius: 4px` (`calc(16px - 12px)`).
* Notice how the rounded corner of the inner box flows **flawlessly parallel** to the rounded corner of the outer card! There is zero awkward pinching or bulging.

```check
page analytics-cards/index.html "document.querySelectorAll('.card-inner-box').length" "3" server=static
page analytics-cards/index.html "document.querySelector('.level-3') !== null" "true" server=static
```

## Your turn: create an unboxed floating inspector

Add a floating inspector card right below `.elevation-grid`.
Give it the class `elevated-card level-2 inspector-panel`.
Inside it:
1. Include a `.card-inner-box` with text `Concentric Validation`.
2. A `<h2 class="card-title">` stating `Concentric Math Verified`.
3. A `<p class="card-description">` explaining that calculating radius dynamically prevents visual artifacts across different theme padding variations.

Save both files and reload.

```check
page analytics-cards/index.html "document.querySelectorAll('.elevated-card').length" "4" server=static
page analytics-cards/index.html "document.querySelector('.inspector-panel') !== null" "true" server=static
```

```hints
nudge: Add a fourth article with class elevated-card level-2 inspector-panel.
concept: Sibling cards reusing the level-2 elevation token inherit the exact same diffuse shadow.
shape: Add article class="elevated-card level-2 inspector-panel" with card-inner-box, card-title, and card-description.
```

## Diagnose, explain and review

Open Developer Tools and inspect `.elevated-card.level-2`.
In the Styles panel, change `box-shadow` to a single harsh 2005-style shadow:
`box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);`
Observe the difference:
* The card instantly looks muddy, harsh, and cheap.
* Restore the dual-layer shadow: the card immediately feels lightweight, modern, and naturally suspended in space.

Next, inspect `.card-inner-box` and change `border-radius: var(--radius-inner)` to `border-radius: 16px` (matching the outer card).
Notice how the inner corners bulge outwards against the outer corner, looking broken and unaligned.

Write in your learning journal:
1. What are the two distinct shadow layers required to simulate realistic physical light?
2. What is the mathematical formula for concentric nested radii?
3. Why does single-layer black drop-shadow look cheap?

These checks establish that CSS custom properties calculate calc expressions and elevation classes, but do not prove that high-DPI displays or browser hardware compositor layers render blur filters without performance degradation on low-end devices.

### Explain it without the reference

Close this tab and explain:
* Why realistic shadows must combine a key light with an ambient light bounce.
* The concentric radius formula: $\text{inner} = \text{outer} - \text{padding}$.
* Why hovering cards should combine `transform: translateY(-2px)` with shadow elevation.
