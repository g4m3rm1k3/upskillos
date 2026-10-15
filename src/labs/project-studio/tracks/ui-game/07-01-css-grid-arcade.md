---
title: 7.1 — Playable CSS & DOM Game: 3D Card Matrix and Coordinate Physics
track: CSS & Interface Engineering — Playable 3D DOM Game
trackOrder: 45.61
runtime: none
---

Building a real interactive game is the ultimate proving ground for interface engineering.

In business applications, small layout glitches or sluggish transitions might go unnoticed. But in a game, every frame, coordinate, and state transition is scrutinized:
1. **3D Card Flips Without Jitter:** Flipping a card in 3D requires `perspective`, `transform-style: preserve-3d`, and `backface-visibility: hidden`. If any property is misconfigured, the text flickers through the back of the card, the card clips through adjacent elements, or the animation stutters.
2. **True Geometric Square Grids:** Game boards must maintain square aspect ratios regardless of viewport resize. If you use fixed pixels (`width: 100px; height: 100px`), the board overflows mobile screens. Modern CSS solves this with `aspect-ratio: 1` and fluid Grid tracks.
3. **Telemetric Stability:** Move counters and millisecond timers that jitter horizontally because of proportional fonts look amateur. We enforce `font-variant-numeric: tabular-nums` for rock-solid stability.
4. **The "Format & Difficulty" Pivot:** What happens when player feedback says: *"The board is too big on mobile, and beginners want an Easy 8-card mode while veterans want Hard 16-card mode"*? How do you engineer the CSS grid so changing the card count automatically reflows into a balanced, centered board without hardcoded row numbers?

In this lesson, you will build **Aura Memory Matrix**: a fully playable 3D card-matching game featuring GPU-accelerated flips, match pulse animations, tactile audio-visual feedback, and responsive difficulty pivoting.

You will build the game inside `game-arcade/`.

### The story so far

You have mastered spatial rhythm, typography, responsive layouts, color systems, micro-interactions, and forms. Now, you synthesize these tools into a high-performance interactive game.

```text
Game Loop State → 3D Transform (rotateY 180deg) → aspect-ratio: 1 Grid → Victory Modal
```

### The Mathematics of 3D Card Flipping

A 3D card consists of three nested layers:
1. **The Card Container (`.matrix-card`):** Holds `perspective: 1000px`. This establishes the 3D vanishing point for that specific card.
2. **The 3D Rotator (`.card-inner`):** Has `transform-style: preserve-3d` and `transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)`. When the `.is-flipped` class is added, it executes `transform: rotateY(180deg)`.
3. **The Two Faces (`.card-front` and `.card-back`):**
   - Both have `position: absolute; inset: 0;` and `backface-visibility: hidden`.
   - The `.card-front` (the icon side) has `transform: rotateY(180deg)`.
   - The `.card-back` (the card pattern cover) has `transform: rotateY(0deg)`.
   - Because `backface-visibility: hidden` is active, when `.card-inner` rotates $180^\circ$, the back face vanishes into thin air while the front face rotates into view seamlessly!

---

## Build the 3D card flip matrix and game arcade stylesheet

```predict
question: What visual artifact occurs if backface-visibility: hidden is omitted from 3D flipping card faces?
choice: The front face appears backwards and mirrored through the back of the card during the rotation
choice: The card automatically collapses to zero width
answer: The front face appears backwards and mirrored through the back of the card during the rotation
explain: By default, HTML elements render both their front and reverse sides. Without backface-visibility: hidden, the rear element's content remains visible in reverse when rotated 180 degrees.
```

Create `game-arcade/style.css` to build the game engine:

```css file=game-arcade/style.css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --color-canvas: #090d16;
  --color-surface: #131b2e;
  --color-surface-card: #1c2640;
  --color-surface-hover: #263354;
  --color-border: #263354;
  --color-text-primary: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-brand: #38bdf8;
  --color-brand-glow: rgba(56, 189, 248, 0.25);
  --color-success: #34d399;
  --color-success-glow: rgba(52, 211, 153, 0.3);
  --color-danger: #f87171;

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
  padding: var(--space-6) var(--space-4);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  -webkit-font-smoothing: antialiased;
}

.game-container {
  width: 100%;
  max-width: 44rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* -------------------------------------------------------------
   GAME TELEMETRY HUD (HEADS-UP DISPLAY)
   ------------------------------------------------------------- */
.game-hud {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.hud-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.hud-badge {
  background: linear-gradient(135deg, var(--color-brand), #818cf8);
  color: #000;
  font-size: 0.6875rem;
  font-weight: 800;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.hud-stats {
  display: flex;
  gap: var(--space-6);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 600;
}

/* Tabular nums ensure digits never jump or wobble as counts update */
.stat-val {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-brand);
  font-variant-numeric: tabular-nums;
}

/* -------------------------------------------------------------
   RESPONSIVE GAME BOARD (ASPECT-RATIO: 1)
   ------------------------------------------------------------- */
.game-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  width: 100%;
}

/* When board adapts to 8 cards (2 rows x 4 cols) or 16 cards (4x4) */
.game-board.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* -------------------------------------------------------------
   3D CARD FLIP ARCHITECTURE
   ------------------------------------------------------------- */
.matrix-card {
  perspective: 1000px;
  /* aspect-ratio: 1 guarantees perfectly square tiles at every screen size */
  aspect-ratio: 1;
  cursor: pointer;
  user-select: none;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: var(--radius-md);
}

/* Flipped state */
.matrix-card.is-flipped .card-inner {
  transform: rotateY(180deg);
}

/* Matched Pair Success Pulse */
.matrix-card.is-matched .card-inner {
  transform: rotateY(180deg) scale(0.96);
  box-shadow: 0 0 20px var(--color-success-glow);
  animation: matchPulse 0.4s ease-out;
}

/* Mismatch Shake */
.matrix-card.is-mismatched .card-inner {
  animation: mismatchShake 0.4s ease;
}

@keyframes matchPulse {
  0% { transform: rotateY(180deg) scale(0.9); }
  50% { transform: rotateY(180deg) scale(1.08); }
  100% { transform: rotateY(180deg) scale(0.96); }
}

@keyframes mismatchShake {
  0%, 100% { transform: rotateY(180deg) translateX(0); }
  25% { transform: rotateY(180deg) translateX(-6px); }
  75% { transform: rotateY(180deg) translateX(6px); }
}

/* Card Faces */
.card-front, .card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  border: 1px solid var(--color-border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

/* Card Cover (Back of the physical card) */
.card-back {
  background: linear-gradient(135deg, var(--color-surface), #1e293b);
  color: var(--color-brand);
  transform: rotateY(0deg);
}

.matrix-card:hover:not(.is-flipped):not(.is-matched) .card-back {
  border-color: var(--color-brand);
  box-shadow: 0 4px 16px var(--color-brand-glow);
  transform: translateY(-2px);
}

.matrix-card:active:not(.is-flipped):not(.is-matched) .card-back {
  transform: translateY(1px) scale(0.98);
}

/* Card Symbol (Front of the physical card) */
.card-front {
  background: var(--color-surface-card);
  border-color: var(--color-brand);
  transform: rotateY(180deg);
}

.matrix-card.is-matched .card-front {
  border-color: var(--color-success);
  background: #122b28;
}

/* -------------------------------------------------------------
   VICTORY DIALOG MODAL (TOP LAYER)
   ------------------------------------------------------------- */
.victory-modal {
  margin: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-brand);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  max-width: 24rem;
  width: 90%;
  color: var(--color-text-primary);
  text-align: center;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7);
}

.victory-modal::backdrop {
  background: rgba(9, 13, 22, 0.85);
  backdrop-filter: blur(8px);
}

.btn-arcade {
  background: var(--color-brand);
  border: none;
  color: #000;
  font-size: 0.875rem;
  font-weight: 700;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-top: var(--space-4);
  transition: transform 0.1s ease;
}

.btn-arcade:hover {
  transform: translateY(-1px);
}

.btn-arcade:active {
  transform: scale(0.97);
}

/* Responsive Pivot for Mobile Screens */
@media (max-width: 500px) {
  .game-board {
    gap: var(--space-2);
  }
  .card-front, .card-back {
    font-size: 1.5rem;
  }
}
```

```check
page game-arcade/index.html "getComputedStyle(document.querySelector('.game-board')).display" "grid" server=static
page game-arcade/index.html "getComputedStyle(document.querySelector('.matrix-card')).perspective" "1000px" server=static
```

---

## Assemble the playable grid, stopwatch timer and victory engine

Now create `game-arcade/index.html`. We implement:
1. The Telemetry HUD displaying live elapsed time (mm:ss) and total move count with tabular numerals.
2. The 12-card matching grid (6 pairs of tech symbols: 🚀, ⚛️, ⚡, 🛡️, 💎, 🧠).
3. The card flip pairing engine in vanilla JavaScript.
4. Native `<dialog>` victory modal that triggers when all pairs are matched.

```html file=game-arcade/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Arcade · 3D Memory Matrix</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="game-container">
    <header class="game-hud">
      <div class="hud-title-group">
        <span class="hud-badge">Aura Arcade</span>
        <h1 style="font-size: 1.125rem; font-weight: 800;">Memory Matrix</h1>
      </div>

      <div class="hud-stats">
        <div class="stat-item">
          <span class="stat-label">Time</span>
          <span class="stat-val" id="timer-val">00:00</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Moves</span>
          <span class="stat-val" id="moves-val">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Matches</span>
          <span class="stat-val" id="matches-val">0 / 6</span>
        </div>
      </div>
    </header>

    <main class="game-board" id="game-board" aria-label="Card Grid">
      <!-- 12 matrix cards will be populated here -->
    </main>
  </div>

  <!-- Victory Top Layer Modal -->
  <dialog class="victory-modal" id="victory-dialog">
    <div style="font-size: 3rem; margin-bottom: 0.5rem;">🏆</div>
    <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">Matrix Cleared!</h2>
    <p style="font-size: 0.875rem; color: #94a3b8; margin-bottom: 1.5rem;">
      You matched all 6 pairs in <strong id="final-moves" style="color: #38bdf8;">0</strong> moves and <strong id="final-time" style="color: #38bdf8;">00:00</strong>.
    </p>
    <button class="btn-arcade" id="play-again-btn">Play Again</button>
  </dialog>

  <script>
    const SYMBOLS = ['🚀', '⚛️', '⚡', '🛡️', '💎', '🧠'];
    let deck = [...SYMBOLS, ...SYMBOLS];
    let flippedCards = [];
    let matchedCount = 0;
    let moves = 0;
    let timerSeconds = 0;
    let timerInterval = null;
    let isLocked = false;

    const board = document.getElementById('game-board');
    const movesVal = document.getElementById('moves-val');
    const matchesVal = document.getElementById('matches-val');
    const timerVal = document.getElementById('timer-val');
    const victoryDialog = document.getElementById('victory-dialog');
    const playAgainBtn = document.getElementById('play-again-btn');

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function formatTime(totalSec) {
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      return `${mins}:${secs}`;
    }

    function startTimer() {
      if (timerInterval) return;
      timerInterval = setInterval(() => {
        timerSeconds++;
        timerVal.textContent = formatTime(timerSeconds);
      }, 1000);
    }

    function initGame() {
      board.innerHTML = '';
      flippedCards = [];
      matchedCount = 0;
      moves = 0;
      timerSeconds = 0;
      clearInterval(timerInterval);
      timerInterval = null;
      isLocked = false;

      movesVal.textContent = '0';
      matchesVal.textContent = '0 / ' + SYMBOLS.length;
      timerVal.textContent = '00:00';

      shuffle(deck).forEach((symbol) => {
        const card = document.createElement('article');
        card.className = 'matrix-card';
        card.dataset.symbol = symbol;
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Hidden card');

        card.innerHTML = `
          <div class="card-inner">
            <div class="card-back">❖</div>
            <div class="card-front">${symbol}</div>
          </div>
        `;

        card.addEventListener('click', () => handleCardClick(card));
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(card);
          }
        });

        board.appendChild(card);
      });
    }

    function handleCardClick(card) {
      if (isLocked || card.classList.contains('is-flipped') || card.classList.contains('is-matched')) return;

      startTimer();
      card.classList.add('is-flipped');
      card.setAttribute('aria-label', card.dataset.symbol);
      flippedCards.push(card);

      if (flippedCards.length === 2) {
        moves++;
        movesVal.textContent = moves;
        checkMatch();
      }
    }

    function checkMatch() {
      isLocked = true;
      const [cardA, cardB] = flippedCards;
      const isMatch = cardA.dataset.symbol === cardB.dataset.symbol;

      if (isMatch) {
        setTimeout(() => {
          cardA.classList.add('is-matched');
          cardB.classList.add('is-matched');
          flippedCards = [];
          matchedCount++;
          matchesVal.textContent = `${matchedCount} / ${SYMBOLS.length}`;
          isLocked = false;

          if (matchedCount === SYMBOLS.length) {
            clearInterval(timerInterval);
            document.getElementById('final-moves').textContent = moves;
            document.getElementById('final-time').textContent = formatTime(timerSeconds);
            setTimeout(() => victoryDialog.showModal(), 300);
          }
        }, 350);
      } else {
        cardA.classList.add('is-mismatched');
        cardB.classList.add('is-mismatched');
        setTimeout(() => {
          cardA.classList.remove('is-flipped', 'is-mismatched');
          cardB.classList.remove('is-flipped', 'is-mismatched');
          cardA.setAttribute('aria-label', 'Hidden card');
          cardB.setAttribute('aria-label', 'Hidden card');
          flippedCards = [];
          isLocked = false;
        }, 900);
      }
    }

    playAgainBtn.addEventListener('click', () => {
      victoryDialog.close();
      initGame();
    });

    initGame();
  </script>
</body>
</html>
```

### Observe the Interactive Game Win

Open `game-arcade/index.html` in your browser:
* Notice the 12 geometric cards arranged in a responsive grid.
* Click on a card:
  * Watch the 3D flip rotation: `.card-inner` rotates $180^\circ$ smoothly via `cubic-bezier(0.16, 1, 0.3, 1)`.
  * The timer starts ticking up (`00:01`, `00:02`). Notice the numbers never jitter because of `tabular-nums`.
* Click a second card:
  * If they match, both cards illuminate with a vibrant green success glow and trigger a satisfying `matchPulse` animation!
  * If they don't match, both cards execute a subtle horizontal shake animation and flip back face-down.
* Test keyboard navigation:
  * Press **Tab** to navigate across the cards.
  * Press **Enter** or **Spacebar** to flip the focused card!

```check
page game-arcade/index.html "document.querySelectorAll('.matrix-card').length" "12" server=static
page game-arcade/index.html "document.getElementById('timer-val') !== null" "true" server=static
page game-arcade/index.html "document.getElementById('moves-val') !== null" "true" server=static
```

---

## Your turn: add a difficulty mode selector and reset button

Extend the HUD to allow players to select their difficulty mode and manually reset the board:
1. In `game-arcade/index.html`, add a `<div class="hud-controls">` inside `.game-hud` (between the title group and the stats):
   - Add a `<select id="difficulty-select" style="background: #090d16; border: 1px solid var(--color-border); color: #f8fafc; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">`:
     * Option 1: `value="6"` labeled `Casual (6 Pairs)`.
     * Option 2: `value="4"` labeled `Quick (4 Pairs)`.
   - Add a reset button `<button id="reset-game-btn" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: transparent; border: 1px solid var(--color-border); color: #94a3b8; border-radius: 4px; cursor: pointer;">Reset Board</button>`.
2. Connect `reset-game-btn` in JavaScript to trigger `initGame()`.
3. Save `game-arcade/index.html` and verify that both elements appear and function in the browser.

```check
page game-arcade/index.html "document.getElementById('difficulty-select') !== null" "true" server=static
page game-arcade/index.html "document.getElementById('reset-game-btn') !== null" "true" server=static
```

```hints
nudge: Add a select with id="difficulty-select" and a button with id="reset-game-btn" inside game-hud.
concept: Games decouple game loop initialization from the DOM so user controls can trigger a board reset at any point.
shape: Add div class="hud-controls" containing select id="difficulty-select" and button id="reset-game-btn".
```

---

## Diagnose, explain and review

### 🔬 Try This Experiment: 3D Layers in DevTools

1. Open DevTools.
2. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on macOS) and type `Show Layers`.
3. Inspect the 3D visual scene:
   - Notice how each flipping card is automatically promoted to its own compositing layer on the GPU.
   - Because we animate strictly `transform: rotateY(180deg)`, the browser performs **zero layout calculations and zero repaints** during card flips!
4. In the Elements panel, temporarily remove `transform-style: preserve-3d` from `.card-inner`:
   - Notice how the card collapses into a flat 2D plane and the flip illusion completely breaks.
5. Re-enable `preserve-3d` to restore the true 3D spatial depth.

Write in your journal:
1. Why does `aspect-ratio: 1` guarantee square tiles without needing fixed pixel heights?
2. What role does `backface-visibility: hidden` play on `.card-front` and `.card-back`?
3. Why is `font-variant-numeric: tabular-nums` essential for stopwatch timers and score counters in gaming interfaces?

These checks establish that 3D card flip transformations, CSS aspect-ratio square constraints, and game state mechanics operate in the DOM, but do not prove that high-frequency audio synchronization or touch gesture latency match native mobile game engines without specialized performance profiling.

### Explain it without the reference

Close this tab and explain:
* The 3-layer hierarchy of a 3D flipping card (`perspective` container, `preserve-3d` rotator, `backface-visibility: hidden` front/back faces).
* Why `rotateY(180deg)` executed on the GPU does not trigger layout recalculation.
* How tabular numbers prevent optical jitter in game HUDs and data feeds.
