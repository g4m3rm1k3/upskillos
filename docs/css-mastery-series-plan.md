# CSS & Interface Engineering Mastery: Plan, Syllabus & Pattern Index

Project Studio series key: `ui-mastery` (chapter folders `src/labs/project-studio/tracks/ui-*`).
Shared workspace folder: `interface-studio/`.
Read this document when reviewing, extending the series, or looking up UI patterns and layout pivot strategies.

---

## Purpose and Audience

Most developers who struggle with CSS do not struggle because CSS syntax is difficult; they struggle because they were never taught:
1. **The Spatial Mental Model:** How the browser calculates layout, margin collapsing, stacking contexts, and flex/grid distribution.
2. **Visual Design Heuristics:** How to choose spacing, typography scales, contrast, and visual groupings systematically without "guessing and checking".
3. **The Root Causes of Ugly UI ("Box-itis"):** Relying on arbitrary borders, heavy boxes, neon colors, and uneven padding instead of whitespace, typographic hierarchy, and subtle elevation.
4. **Resilience to Requirement Pivots:** How to structure styles so that when product managers, clients, or user feedback demand format shifts (e.g. desktop multi-column to mobile; guided wizard to dense dashboard; table to cards), you pivot in CSS without rewriting the application.

This series teaches interface engineering from zero to production polish using modern standards: CSS custom property tokens, fluid typography with `clamp()`, modern CSS resets, Flexbox without guesswork, 2D CSS Grid with Subgrid, Container Queries (`@container`), perceptual color spaces (`oklch`), elevation physics, micro-interactions, WCAG 2.2 accessibility, dark mode tokens, 3D perspective transforms, and a complete playable DOM game.

Every property and value is explained at first use with causal models: what it does mathematically, why it is needed, what breaks without it, and how to verify it in browser developer tools.

---

## Complete Chapter & Lesson Curriculum (22 Lessons)

| # | Chapter / Folder | Title | Project & Observable Outcome | Core Concepts & Properties |
|---|---|---|---|---|
| **01** | `ui-foundations` | **The Design Eye — Spacing, Typography and Visual Rhythm** | High-Converting SaaS Showcase (`saas-showcase/`) | 4px/8px spatial scale, CSS variables, killing box-itis with whitespace, modular typographic scale, optical line-height, 65ch measure, modern reset, `clamp()`. |
| 1.1 | `ui-foundations` | 1.1 — The Spatial Grid and Killing Box-itis | Baseline Reset & Spatial Tokens | `box-sizing: border-box`, 4px/8px rhythm, Gestalt proximity, killing random margins. |
| 1.2 | `ui-foundations` | 1.2 — Typographic Hierarchy, Measure and Line-Height | SaaS Marketing Showcase | Modular type scale, optical line-height (1.15 for headings vs 1.6 for body), `max-width: 65ch`. |
| 1.3 | `ui-foundations` | 1.3 — Fluid Sizing and Viewport Interpolation with clamp() | Fluid Dynamic Shell | Mathematical slope derivation for `clamp(min, preferred, max)`, WCAG 200% zoom preservation. |
| **02** | `ui-layouts` | **Layout Intuition — Flexbox, Grid, Subgrid and Scrollytelling** | Application Workspace & Dashboard (`workspace-app/`) | Flexbox distribution, `min-width: 0` overflow trap, `flex: 1 1 0%`, 2D CSS Grid, `auto-fit` with `minmax()`, `subgrid` card alignment, `@container` queries, sticky scrollytelling. |
| 2.1 | `ui-layouts` | 2.1 — Flexbox Mechanics and the min-width: 0 Trap | Workspace Navigation & Toolbar | Main/cross axes, `flex-grow`/`flex-shrink`/`flex-basis`, solving the `min-width: 0` overflow blowout. |
| 2.2 | `ui-layouts` | 2.2 — 2D Grid Systems and Asymmetric Layouts | Studio 2D Grid Frame | `grid-template-areas`, `repeat(auto-fit, minmax())`, responsive reflow without media query clutter. |
| 2.3 | `ui-layouts` | 2.3 — Subgrid Alignment and Container Queries | Pixel-Locked Card Deck | `grid-template-rows: subgrid`, aligning card action baselines, `container-type: inline-size`. |
| 2.4 | `ui-layouts` | 2.4 — Sticky Scrollytelling, Overflow Traps and Responsive Pivots | Coordinate-Synced Scrollytelling Showcase | `position: sticky; top: ...`, solving the silent `overflow: hidden` trap, card cross-fading, mobile layout pivot. |
| **03** | `ui-tokens` | **Color Systems, Depth and Dark Mode** | Analytics Cards & Theme Engine (`analytics-cards/`) | Semantic palettes, `oklch()`, `color-mix()`, APCA/WCAG contrast, multi-layered diffuse shadows, nested border-radius geometry, dark mode surface elevation lighting. |
| 3.1 | `ui-tokens` | 3.1 — Perceptual Color, Semantic Tokens and Contrast | Perceptual Color Palette | `oklch()` perceptual uniformity vs broken HSL, semantic abstraction, `color-mix()`, WCAG 4.5:1. |
| 3.2 | `ui-tokens` | 3.2 — Elevation, Diffuse Shadows and Concentric Radii | Elevated Glass/Shadow Cards | Multi-layer key + ambient shadows, concentric corner radius formula ($R_{\text{inner}} = R_{\text{outer}} - P$). |
| 3.3 | `ui-tokens` | 3.3 — Systematic Dark Mode and Surface Luminance | Dual-Theme Engine | Surface elevation via perceptual lightness stepping, zero-class duplication, high-contrast dark tokens. |
| **04** | `ui-interactions` | **Interaction Design, Motion and Micro-States** | Interactive Component Kit (`component-kit/`) | 7 UI states, `:focus-visible` & `outline-offset`, 150ms-250ms reaction windows, cubic-bezier easing physics, GPU transforms vs layout thrashing, `:has()`, native `<dialog>` & popovers, 3D tilt, skeleton shimmers. |
| 4.1 | `ui-interactions` | 4.1 — The Complete State Matrix, :focus-visible and Focus Rings | Complete 7-State Component Kit | Default, Hover, Focus-Visible, Active, Disabled, Loading, Error; 44px touch targets, zero-offset rings. |
| 4.2 | `ui-interactions` | 4.2 — Motion Physics, Compositor Acceleration and Easing | Kinetic Button & Panel Motion | Compositor acceleration (`transform`, `opacity`), `cubic-bezier(0.16, 1, 0.3, 1)`, avoiding `top`/`width` thrash. |
| 4.3 | `ui-interactions` | 4.3 — Native Popovers, Dialogs and the :has() Selector | Native Top-Layer Modal & Dynamic Forms | Native `<dialog>` and `::backdrop`, parent highlighting via `:has(:focus-visible)` and `:has(:checked)`. |
| 4.4 | `ui-interactions` | 4.4 — Advanced Animations, 3D Tilt, Shimmer and Conic Gradients | 3D Perspective & Physics Studio | 3D cursor tilt with dynamic glare, skeleton loader shimmer (`@keyframes`), typed `@property --border-angle` conic borders. |
| **05** | `ui-forms` | **Form UX, Data Density and Accessible Controls** | Enterprise Settings & Data Matrix (`settings-matrix/`) | Top-aligned labels, input optical balance, zero-shift inline validation, accessible custom checkboxes/switches (`:checked`), data table density, number alignment, multi-step wizards. |
| 5.1 | `ui-forms` | 5.1 — Form Optical Alignment and Zero-Shift Validation | Configuration Form & Error Matrix | Optical top-aligned labels, 44px min targets, zero-shift error containers (`aria-live="polite"`). |
| 5.2 | `ui-forms` | 5.2 — Accessible Custom Controls: Toggles and Radio Groups | Custom Switches & Segmented Controls | Native checkbox-driven custom toggle switches, keyboard Spacebar support, high-contrast states. |
| 5.3 | `ui-forms` | 5.3 — Data Density, Number Alignment and Sticky Headers | Dense Enterprise Telemetry Table | Right-aligned tabular numbers (`tabular-nums`), sticky column headers, alternating row balance. |
| 5.4 | `ui-forms` | 5.4 — Universal Multi-Step Form Wizard and Structured Data Collection | Universal Multi-Step Collector | 3-step progress stepper, accessible radio cards, live JSON serialization, `localStorage` persistence, dense view pivot. |
| **06** | `ui-capstone` | **Capstone — "Aura" Production Workspace** | "Aura" Studio Productivity App (`aura-app/`) | Full desktop + mobile responsive app, collapsible sidebar, subgrid Kanban board, complete theme engine, 100% keyboard navigation, zero layout shift. |
| 6.1 | `ui-capstone` | 6.1 — The "Aura" Responsive Workspace Shell | Master Application Shell | Responsive 2D grid, spring-animated collapsible sidebar, status toolbar. |
| 6.2 | `ui-capstone` | 6.2 — Multi-Column Kanban Board with Subgrid Alignment | Interactive Drag-Ready Kanban Board | Multi-column horizontal flow, subgrid card alignment, tag badges, slide-over task inspector. |
| 6.3 | `ui-capstone` | 6.3 — Production Polish, Theme Engine and Accessibility Audit | Audited Production Release | OKLCH light/dark theme switcher, 100% keyboard accessibility audit, WCAG AAA compliance checks. |
| **07** | `ui-game` | **Playable CSS & DOM Game — 3D Perspective and Grid Matrix** | Aura Memory Matrix Game (`game-arcade/`) | Full interactive 3D card flip game, responsive `aspect-ratio: 1` square grid, move counter & stopwatch with `tabular-nums`, match success pulse, victory modal, difficulty pivot. |
| 7.1 | `ui-game` | 7.1 — Playable CSS & DOM Game: 3D Card Matrix and Coordinate Physics | Complete Playable 3D Card Game | `perspective: 1000px`, `transform-style: preserve-3d`, `backface-visibility: hidden`, game state loop, victory dialog, responsive difficulty reflow. |

---

## How to Pivot When Formats, Feedback, or Requirements Change

A frequent pain point for developers is building a layout that looks good initially, only for a stakeholder or client to give feedback like:
* *"This table is unreadable on mobile phones."*
* *"This 3-step wizard is too slow for power users; make it a 1-page dense form."*
* *"We rebranded from corporate blue to neon purple."*
* *"The marketing team wants cards stacked vertically instead of horizontally."*

Here is the design engineering methodology to make your styles immune to requirement churn:

### 1. The Token Shield (Decouple Semantics from Raw Values)
Never use raw hex colors or arbitrary pixel values in component rules.
* **Bad:** `.card { background: #1e293b; border: 1px solid #334155; }`
* **Good:** `.card { background: var(--color-surface); border: 1px solid var(--color-border); }`
* **When Feedback Strikes:** When branding changes from slate blue to emerald green, you update **3 variables in `:root`** (`--color-canvas`, `--color-surface`, `--color-brand`), and every single card, button, modal, and input in your entire product re-skins automatically in 30 seconds.

### 2. The Container Query Shield (Component-Owned Responsiveness)
Avoid relying exclusively on `@media (min-width: ...)`. Media queries bind component layouts to the global window width, which breaks whenever components are moved into sidebars, dialogs, or drawers.
* Declare `container-type: inline-size` on card wrappers.
* Use `@container (min-width: 450px)` to mutate cards into horizontal rows.
* **When Feedback Strikes:** When product managers ask to move a feed from the main page into a 300px flyout drawer, the cards automatically adapt into compact vertical cards with zero media query modifications.

### 3. The Layout Mode Switch (Wizard vs Dense Dashboard)
Never duplicate DOM inputs when changing presentation formats.
* In Lesson 5.4, all inputs live inside semantic `<fieldset class="form-step">` elements.
* The parent container toggles between `.wizard-mode` and `.dense-mode`:
  ```css
  /* Wizard: Show one step at a time */
  .wizard-mode .form-step { display: none; }
  .wizard-mode .form-step.is-active { display: flex; }

  /* Dense: Show all steps simultaneously in 3-column grid */
  .dense-mode.wizard-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
  .dense-mode .form-step { display: flex; }
  ```
* **When Feedback Strikes:** Toggling a single class changes the entire user experience from a step-by-step onboarding wizard to a dense enterprise settings dashboard.

### 4. The Sticky Scrollytelling Mobile Pivot
In Lesson 2.4, scrollytelling uses a 2-column grid on desktop (`scrolly-cards` on left, `scrolly-stage` on right).
* On mobile screens (`max-width: 860px`), the layout gracefully pivots:
  ```css
  @media (max-width: 860px) {
    .scrolly-grid { grid-template-columns: 1fr; }
    .scrolly-stage {
      position: sticky;
      top: 0;
      z-index: 20;
      height: 220px;
    }
  }
  ```
* The stage pins to the top header while cards scroll smoothly beneath it, keeping the interactive visual synchronized without overflowing horizontally.

---

## Instant Jump-To-Pattern Index (How to Style Any Custom Site)

When you have a raw HTML page or legacy app and need to implement a specific pattern immediately, jump directly to these tested recipes:

### 1. The "10-Minute Emergency Modernizer" (Clean Up Any Ugly Page)
If you have a raw, messy HTML page, paste this baseline reset and token block into your stylesheet:
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --color-canvas: #090d16;
  --color-surface: #131b2e;
  --color-border: #263354;
  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-brand: #38bdf8;
  --radius: 0.5rem;
}
body {
  font-family: var(--font-sans);
  background: var(--color-canvas);
  color: var(--color-text-primary);
  line-height: 1.6;
  padding: 2rem 1rem;
}
main { max-width: 65ch; margin: 0 auto; }
h1, h2, h3 { line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
p { color: var(--color-text-muted); margin-bottom: 1.25rem; }
button, input, select {
  font: inherit;
  color: inherit;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 0.5rem 1rem;
}
button { cursor: pointer; background: var(--color-brand); color: #000; font-weight: 700; border: none; }
```
*(Reference: Lessons 1.1, 1.2, 1.3)*

### 2. Pattern: Sticky Scrollytelling (Cards on Side + Updating Pinned Visual)
* **Goal:** Narrative cards scroll down one column; an interactive graphic or diagram stays pinned in the other column and updates smoothly.
* **Critical CSS:**
  ```css
  .scrolly-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start; /* CRITICAL: prevents sticky child from stretching */
  }
  .scrolly-cards { display: flex; flex-direction: column; gap: 30vh; }
  .scrolly-stage {
    position: sticky;
    top: 2rem;
    height: 400px;
    background: var(--color-surface);
  }
  ```
* **Coordinate Script:** Use an `IntersectionObserver` with `rootMargin: '-25% 0px -25% 0px'` to detect the active card and cross-fade the corresponding graphic.
*(Reference: Lesson 2.4)*

### 3. Pattern: Multi-Column Kanban Board with Subgrid Alignment
* **Goal:** Drag-ready cards across columns with perfectly aligned headers, tags, and action buttons regardless of card description length.
* **Critical CSS:**
  ```css
  .kanban-board {
    display: flex;
    gap: 1.5rem;
    overflow-x: auto;
  }
  .kanban-column {
    flex: 0 0 320px;
    display: grid;
    grid-template-rows: auto 1fr;
  }
  .kanban-card {
    display: grid;
    grid-template-rows: subgrid;
    grid-row: span 3; /* Title, Body, Action Bar */
  }
  ```
*(Reference: Lessons 2.3, 6.2)*

### 4. Pattern: Universal Multi-Step Form with Data Collection & JSON Export
* **Goal:** A guided onboarding or provisioning funnel with accessible radio cards, live validation, auto-saving `localStorage`, and live JSON payload export.
* **Critical CSS:**
  ```css
  .radio-card:has(input[type="radio"]:checked) {
    border-color: var(--color-brand);
    background: #1c2a47;
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
  }
  ```
*(Reference: Lessons 5.1, 5.2, 5.4)*

### 5. Pattern: Advanced Micro-Interactions, 3D Tilt & Skeleton Shimmers
* **Goal:** 3D cursor-tracking card tilt with optical glare, zero-CLS skeleton loaders, and rotating conic-gradient borders.
* **Critical CSS:**
  ```css
  @property --border-angle {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }
  .skeleton-bar {
    background: linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%);
    background-size: 200% 100%;
    animation: shimmer 1.8s infinite linear;
  }
  ```
*(Reference: Lessons 4.1, 4.2, 4.4)*

### 6. Pattern: High-Performance CSS/DOM 3D Game Board
* **Goal:** A playable interactive card matrix or puzzle board with 3D card flips, square aspect ratios, move counters, and victory celebration modals.
* **Critical CSS:**
  ```css
  .game-board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  .matrix-card {
    perspective: 1000px;
    aspect-ratio: 1; /* Guaranteed square tiles */
  }
  .card-inner {
    transform-style: preserve-3d;
    transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .matrix-card.is-flipped .card-inner {
    transform: rotateY(180deg);
  }
  .card-front, .card-back {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
  }
  ```
*(Reference: Lesson 7.1)*

---

## Status & Changelog

- **2026-10-13:** Initial architecture established with Chapters 1-6 (18 lessons). Core pedagogy and initial vitest suite verified.
- **2026-10-14:** Expanded to 7 Chapters and 22 Lessons based on mastery exploration requirements:
  - Added Lesson 2.4: Sticky Scrollytelling, silent overflow traps, coordinate sync, and mobile layout pivots.
  - Added Lesson 4.4: Advanced animations, 3D perspective card tilt physics, skeleton shimmers, and typed `@property` conic-gradient borders.
  - Added Lesson 5.4: Universal multi-step form wizard, accessible radio cards, live JSON serialization, `localStorage` persistence, and dense dashboard view pivots.
  - Added Chapter 7 (`ui-game` Track) with Lesson 7.1: Playable 3D DOM Memory Matrix Game with `aspect-ratio: 1`, `preserve-3d`, `tabular-nums` HUD, and victory dialogs.
  - Added the comprehensive "How to Pivot When Requirements Change" design engineering masterclass.
  - Added the "Instant Jump-To-Pattern Index" for styling any website on demand.
