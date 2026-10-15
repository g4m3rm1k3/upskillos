---
title: 5.4 — Universal Multi-Step Form Wizard and Structured Data Collection
track: CSS & Interface Engineering — Form UX and Data Density
trackOrder: 45.44
runtime: none
---

Forms are the primary engine through which web applications collect information: customer onboarding, infrastructure provisioning, checkout funnels, and survey data.

Yet, most forms fail basic UX engineering:
1. **The Wall of Inputs (Cognitive Overload):** Dumping 15 fields onto a single scrollable page causes user fatigue, resulting in high abandonment rates.
2. **Fragile Radio Controls:** Forcing users to click tiny 14px radio circles instead of generous, accessible "Radio Cards" with tactile visual boundaries.
3. **Lost User Progress:** When a user accidentally refreshes the page or navigates away, all entered data vanishes, destroying trust.
4. **The "Format Change" Dilemma:** Product requirements frequently pivot: your product team wants a guided step-by-step wizard for new users, but enterprise power users demand a compact single-page dense view. How do you design the CSS so the layout can pivot between guided wizard mode and dense grid mode with a single class change?

In this lesson, you will build a **Universal Multi-Step Form Wizard** with accessible radio cards, live structured JSON data collection, auto-saving local persistence, and a CSS layout pivot engine.

Continue in `interface-studio/`, editing `settings-matrix/`.

### The story so far

You have mastered form optical alignment, accessible switches, and dense numeric tables. Now, you will integrate these into a multi-step data collection architecture.

```text
Visual Stepper Indicator → Accessible Fieldsets → Real-Time Form Serialization → Structured JSON Export
```

### The Cognitive Engineering of Steppers

A multi-step form succeeds because of the **Zeigarnik Effect** and **chunking**:
* Users are significantly more likely to complete a task when it is broken into discrete, bite-sized stages with visible progress indicators.
* The Stepper bar visually communicates:
  1. **Completed Steps:** Green checkmark badge or solid accent background.
  2. **Active Step:** High-contrast brand highlight with focus ring.
  3. **Upcoming Steps:** Subdued, muted text and outline.

### Decoupling Logic from Layout: The Pivot Pattern

In modern design systems, we build the form structure so that layout is completely controlled by the parent container:
* In `.step-view`: only the active step (`.form-step.is-active`) is displayed, creating a focused, zero-distraction wizard.
* In `.dense-view`: all `.form-step` elements display simultaneously in a multi-column CSS Grid.
The data collection script remains 100% identical. That means when user research or product feedback requests a layout change, **you pivot the layout in CSS in 5 seconds rather than rewriting the app!**

---

## Build the multi-step stepper, radio cards and layout pivot in CSS

To make custom radio cards fully accessible, we place a native `<input type="radio">` inside each card, visually hide the default radio button using standard accessibility clipping, and use the CSS `:checked` pseudo-class to illuminate the entire card boundary:

```css
.radio-card:has(input[type="radio"]:checked) {
  border-color: var(--color-brand);
  background-color: var(--color-surface-hover);
  box-shadow: 0 0 0 2px var(--color-brand-tint);
}
```

```predict
question: Why is visually hiding the radio input superior to display: none when building custom radio cards?
choice: display: none removes the input from the browser accessibility tree and disables keyboard Tab/Arrow navigation
choice: display: none prevents the browser GPU from applying hardware acceleration
answer: display: none removes the input from the browser accessibility tree and disables keyboard Tab/Arrow navigation
explain: Setting display: none completely removes the element from assistive technology. By keeping the input in the DOM with accessible clipping, screen readers and keyboard arrows continue to function perfectly.
```

Update `settings-matrix/style.css` to add the multi-step wizard and data collection design system:

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
  --color-surface-card: #182239;
  --color-border: #263354;
  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-brand: #38bdf8;
  --color-brand-tint: rgba(56, 189, 248, 0.15);
  --color-success: #34d399;
  --color-accent: #818cf8;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  --font-family: system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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
  -webkit-font-smoothing: antialiased;
}

.wizard-container {
  max-width: 54rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.wizard-header {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.wizard-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.wizard-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

/* -------------------------------------------------------------
   STEPPER PROGRESS BAR
   ------------------------------------------------------------- */
.stepper-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-2);
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  opacity: 0.5;
  transition: all 0.25s ease;
}

.step-indicator.is-active {
  opacity: 1;
  border-color: var(--color-brand);
  background: var(--color-surface-card);
  box-shadow: 0 4px 16px var(--color-brand-tint);
}

.step-indicator.is-completed {
  opacity: 0.9;
  border-color: var(--color-success);
}

.step-bubble {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-border);
  color: var(--color-text-muted);
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.step-indicator.is-active .step-bubble {
  background: var(--color-brand);
  color: #000;
}

.step-indicator.is-completed .step-bubble {
  background: var(--color-success);
  color: #000;
}

.step-text {
  display: flex;
  flex-direction: column;
}

.step-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 600;
}

.step-name {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

/* -------------------------------------------------------------
   FORM BODY & LAYOUT MODES
   ------------------------------------------------------------- */
.wizard-form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
}

/* Mode 1: Step-by-Step Wizard View (Default) */
.wizard-mode .form-step {
  display: none;
  flex-direction: column;
  gap: var(--space-6);
  animation: fadeIn 0.3s ease-out;
}

.wizard-mode .form-step.is-active {
  display: flex;
}

/* Mode 2: Dense Multi-Column Dashboard View */
.dense-mode.wizard-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
}

.dense-mode .form-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.dense-mode .wizard-actions {
  grid-column: 1 / -1;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Field Layouts */
.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.field-input, .field-select {
  width: 100%;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-input:focus-visible, .field-select:focus-visible {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 2px var(--color-brand-tint);
}

/* -------------------------------------------------------------
   ACCESSIBLE RADIO CARDS
   ------------------------------------------------------------- */
.radio-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
}

.radio-card {
  position: relative;
  background: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Accessible Native Radio Off-Screen Clipping */
.radio-card input[type="radio"] {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

/* Reacting to :checked State via :has() */
.radio-card:has(input[type="radio"]:checked) {
  border-color: var(--color-brand);
  background: #1c2a47;
  box-shadow: 0 0 0 2px var(--color-brand-tint);
}

.radio-card:has(input[type="radio"]:focus-visible) {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

.radio-card-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.radio-card-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* -------------------------------------------------------------
   WIZARD BUTTONS & JSON EXPORT
   ------------------------------------------------------------- */
.wizard-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border);
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: var(--color-brand);
  border: none;
  color: #000;
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.btn-primary:active {
  transform: scale(0.98);
}

.json-preview-box {
  background: #060910;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-brand);
  max-height: 200px;
  overflow-y: auto;
}
```

```check
page settings-matrix/index.html "getComputedStyle(document.querySelector('.step-indicator')).display" "flex" server=static
page settings-matrix/index.html "document.querySelectorAll('.radio-card').length" "3" server=static
```

---

## Wire the accessible wizard, data collector and JSON export engine

Now update `settings-matrix/index.html`. We implement:
1. The 3-stage visual Stepper.
2. Step 1: Project Metadata & Target Deployment.
3. Step 2: Architecture Tier (accessible Radio Cards) & Auto-Scaling.
4. Step 3: Telemetry Review & Real-Time JSON Export with Copy to Clipboard.
5. Automatic `localStorage` saving so user input is preserved across refreshes.

```html file=settings-matrix/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Studio · Universal Multi-Step Form Wizard</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="wizard-container">
    <header class="wizard-header">
      <div>
        <h1 class="wizard-title">Infrastructure Deployment Wizard</h1>
        <p class="wizard-subtitle">Collects structured cluster configurations with live validation and local persistence.</p>
      </div>
      <button class="btn-secondary" id="toggle-dense-btn" style="font-size: 0.75rem;">
        ⚡ Toggle Dense View
      </button>
    </header>

    <!-- Stepper Navigation -->
    <nav class="stepper-nav" aria-label="Form Progress">
      <div class="step-indicator is-active" id="step-nav-1">
        <div class="step-bubble">1</div>
        <div class="step-text">
          <span class="step-label">Step 01</span>
          <span class="step-name">Metadata</span>
        </div>
      </div>
      <div class="step-indicator" id="step-nav-2">
        <div class="step-bubble">2</div>
        <div class="step-text">
          <span class="step-label">Step 02</span>
          <span class="step-name">Architecture</span>
        </div>
      </div>
      <div class="step-indicator" id="step-nav-3">
        <div class="step-bubble">3</div>
        <div class="step-text">
          <span class="step-label">Step 03</span>
          <span class="step-name">Review & Export</span>
        </div>
      </div>
    </nav>

    <!-- Main Wizard Form -->
    <form class="wizard-form wizard-mode" id="cluster-form">
      <!-- Step 1: Project Metadata -->
      <fieldset class="form-step is-active" id="step-panel-1" style="border: none;">
        <legend style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;">1. Cluster Identity & Region</legend>
        
        <div class="field-group">
          <label class="field-label" for="project-name">Cluster Name</label>
          <input type="text" id="project-name" name="projectName" class="field-input" placeholder="e.g. aura-core-ingress" required>
        </div>

        <div class="field-group">
          <label class="field-label" for="region-select">Primary Cloud Region</label>
          <select id="region-select" name="region" class="field-select">
            <option value="us-east-1">US East (N. Virginia)</option>
            <option value="eu-central-1">EU Central (Frankfurt)</option>
            <option value="ap-northeast-1">AP Northeast (Tokyo)</option>
          </select>
        </div>
      </fieldset>

      <!-- Step 2: Architecture & Tier -->
      <fieldset class="form-step" id="step-panel-2" style="border: none;">
        <legend style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem;">2. Architecture Tier</legend>
        
        <div class="field-group">
          <span class="field-label">Select Deployment Profile</span>
          <div class="radio-card-grid">
            <label class="radio-card">
              <input type="radio" name="tier" value="starter" checked>
              <span class="radio-card-title">Starter</span>
              <span class="radio-card-desc">Single zone · 2 vCPU · 4GB RAM</span>
            </label>

            <label class="radio-card">
              <input type="radio" name="tier" value="production">
              <span class="radio-card-title">Production</span>
              <span class="radio-card-desc">Multi zone · 8 vCPU · 16GB RAM</span>
            </label>

            <label class="radio-card">
              <input type="radio" name="tier" value="enterprise">
              <span class="radio-card-title">Enterprise</span>
              <span class="radio-card-desc">Global mesh · 32 vCPU · 64GB RAM</span>
            </label>
          </div>
        </div>

        <div class="field-group" style="margin-top: 1rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem;">
            <input type="checkbox" name="autoScale" id="auto-scale" checked> Enable Automated Predictive Autoscaling
          </label>
        </div>
      </fieldset>

      <!-- Step 3: Review & Export -->
      <fieldset class="form-step" id="step-panel-3" style="border: none;">
        <legend style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">3. Review & Structured Payload</legend>
        <p style="font-size: 0.8125rem; color: var(--color-text-muted); margin-bottom: 1rem;">
          The payload below is serialized live from your inputs. It is ready for API ingestion or local file export.
        </p>

        <pre class="json-preview-box" id="json-output">{}</pre>
      </fieldset>

      <!-- Wizard Navigation Actions -->
      <div class="wizard-actions">
        <button type="button" class="btn-secondary" id="prev-btn" style="visibility: hidden;">
          ← Previous
        </button>

        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn-primary" id="next-btn">
            Continue →
          </button>
          <button type="button" class="btn-primary" id="export-btn" style="display: none; background: var(--color-success);">
            Copy JSON Payload
          </button>
        </div>
      </div>
    </form>
  </div>

  <script>
    let currentStep = 1;
    const totalSteps = 3;
    const form = document.getElementById('cluster-form');
    const jsonOutput = document.getElementById('json-output');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const exportBtn = document.getElementById('export-btn');

    // 1. Collect and serialize state
    function collectFormData() {
      const fd = new FormData(form);
      return {
        projectName: fd.get('projectName') || 'unnamed-cluster',
        region: fd.get('region'),
        tier: fd.get('tier'),
        autoScale: fd.get('autoScale') === 'on',
        timestamp: new Date().toISOString()
      };
    }

    function updateJsonPreview() {
      const data = collectFormData();
      jsonOutput.textContent = JSON.stringify(data, null, 2);
      localStorage.setItem('aura_cluster_data', JSON.stringify(data));
    }

    // 2. Step Navigation
    function goToStep(step) {
      if (step < 1 || step > totalSteps) return;
      currentStep = step;

      // Update Panels
      for (let i = 1; i <= totalSteps; i++) {
        const panel = document.getElementById('step-panel-' + i);
        const nav = document.getElementById('step-nav-' + i);
        if (panel) panel.classList.toggle('is-active', i === currentStep);
        if (nav) {
          nav.classList.toggle('is-active', i === currentStep);
          nav.classList.toggle('is-completed', i < currentStep);
        }
      }

      // Update Buttons
      prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
      if (currentStep === totalSteps) {
        nextBtn.style.display = 'none';
        exportBtn.style.display = 'inline-block';
        updateJsonPreview();
      } else {
        nextBtn.style.display = 'inline-block';
        exportBtn.style.display = 'none';
      }
    }

    nextBtn.addEventListener('click', () => {
      // Validate inputs in active step
      const currentPanel = document.getElementById('step-panel-' + currentStep);
      const inputs = currentPanel.querySelectorAll('input[required]');
      let valid = true;
      inputs.forEach(input => {
        if (!input.checkValidity()) {
          input.reportValidity();
          valid = false;
        }
      });
      if (valid) goToStep(currentStep + 1);
    });

    prevBtn.addEventListener('click', () => goToStep(currentStep - 1));

    form.addEventListener('input', updateJsonPreview);

    exportBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(jsonOutput.textContent);
      exportBtn.textContent = 'Copied to Clipboard! ✓';
      setTimeout(() => { exportBtn.textContent = 'Copy JSON Payload'; }, 2000);
    });

    // 3. Layout Pivot: Wizard View vs Dense Dashboard View
    const toggleDenseBtn = document.getElementById('toggle-dense-btn');
    toggleDenseBtn.addEventListener('click', () => {
      form.classList.toggle('dense-mode');
      form.classList.toggle('wizard-mode');
      const isDense = form.classList.contains('dense-mode');
      toggleDenseBtn.textContent = isDense ? '⚡ Toggle Wizard View' : '⚡ Toggle Dense View';
      updateJsonPreview();
    });

    // Restore saved state
    const saved = localStorage.getItem('aura_cluster_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectName) document.getElementById('project-name').value = parsed.projectName;
      } catch (e) {}
    }
    updateJsonPreview();
  </script>
</body>
</html>
```

### Observe the Visual Win

Open `settings-matrix/index.html` in your browser:
* Notice the clean Stepper bar at the top indicating Step 01 is active.
* Fill in **Cluster Name** (`aura-core-ingress`) and click **Continue →**.
* Step 01 turns green with a completed state; Step 02 activates.
* Click the **Enterprise** radio card: notice the entire card lights up with an active border and subtle brand glow!
* Click **Continue →**: Step 3 displays the structured JSON payload containing all your answers cleanly formatted.
* Now, click **⚡ Toggle Dense View** in the top right:
  * **Observe the layout pivot:** Instead of a multi-step sequence, the entire form transforms into a dense 3-column dashboard where power users can inspect and edit every field simultaneously!

```check
page settings-matrix/index.html "document.querySelectorAll('.form-step').length" "3" server=static
page settings-matrix/index.html "document.getElementById('json-output') !== null" "true" server=static
page settings-matrix/index.html "document.getElementById('toggle-dense-btn') !== null" "true" server=static
```

---

## Your turn: add a backup retention radio selector to step 2

Add a new field inside `<fieldset id="step-panel-2">`:
1. Add a `<div class="field-group" style="margin-top: 1rem;">`.
2. Give it a `<span class="field-label">Backup Retention Policy</span>`.
3. Inside, add a `.radio-card-grid` containing two `.radio-card` options:
   - Option A: Radio with `name="backupRetention"` value `7-days` (checked by default), title `7-Day Rolling Snapshots`.
   - Option B: Radio with `name="backupRetention"` value `30-days`, title `30-Day Immutable Vault`.
4. Save `settings-matrix/index.html` and reload. Verify that changing the backup retention updates the live JSON preview on step 3.

```check
page settings-matrix/index.html "document.querySelectorAll('input[name=\"backupRetention\"]').length" "2" server=static
page settings-matrix/index.html "document.querySelector('input[value=\"30-days\"]') !== null" "true" server=static
```

```hints
nudge: Add a field-group with a radio-card-grid containing two radio-card labels inside step-panel-2.
concept: Sibling radio inputs sharing the same name attribute switch mutually exclusively while maintaining accessible keyboard arrows.
shape: Add div class="field-group" containing radio-card-grid with two label class="radio-card" elements.
```

---

## Diagnose, explain and review

### 🔬 Try This Experiment: Inspecting the Layout Pivot

1. Open DevTools.
2. Select `.wizard-form`.
3. In the Styles panel, toggle off `.wizard-mode` and toggle on `.dense-mode`.
4. Observe how CSS Grid rearranges the fieldsets into an enterprise multi-column layout without reloading the page or losing any form data.
5. In DevTools Application panel, inspect **Local Storage**: observe how `aura_cluster_data` stores your live entries in real-time.

Write in your journal:
1. Why does using `.radio-card:has(input:checked)` eliminate the need for JavaScript click listeners on custom radio cards?
2. What makes `FormData` superior to manual DOM input querying (`document.getElementById('...').value`)?
3. How does decoupling layout mode (`wizard-mode` vs `dense-mode`) empower you to pivot when requirements change?

These checks establish that multi-step wizard navigation, structured JSON serialization, and radio card accessibility bindings function in the browser, but do not prove that high-latency backend network failures or server-side CSRF validation are handled without end-to-end integration testing.

### Explain it without the reference

Close this tab and explain:
* How the visual stepper conveys completed vs active vs upcoming states.
* Why accessible radio clipping keeps keyboard arrows functional while allowing full visual card styling.
* How the layout pivot pattern allows an interface to switch between guided wizard and dense dashboard with zero DOM restructuring.
