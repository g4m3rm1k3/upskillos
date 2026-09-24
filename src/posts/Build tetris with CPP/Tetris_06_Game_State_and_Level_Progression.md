# Tetris Module 6: Game State & Level Progression

## Why this module matters

So far the game only knows one "mode": playing. There's no menu, no pause, no game-over handling — the loop just runs forever until you kill the process. This module adds a proper state machine, and closes out the level-progression logic that Module 5's `GameStats` deliberately left incomplete.

---

## 1. Level progression: closing the loop from Module 5

Standard Tetris levels up every 10 lines cleared, and each level increases fall speed. This is simple enough not to need its own class — it belongs as behavior on `GameStats`, now that the "when do we level up" policy is being decided:

```cpp
class GameStats {
private:
    int score;
    int level;
    int linesCleared;
    static const int LINES_PER_LEVEL = 10;

public:
    GameStats() : score(0), level(0), linesCleared(0) {}

    void applyClear(int rowsCleared) {
        score += scoreForClear(rowsCleared, level);
        linesCleared += rowsCleared;

        int newLevel = linesCleared / LINES_PER_LEVEL;
        if (newLevel > level) {
            level = newLevel;
        }
    }

    int getScore() const { return score; }
    int getLevel() const { return level; }
    int getLinesCleared() const { return linesCleared; }
};
```

```cpp
std::chrono::milliseconds gravityIntervalForLevel(int level) {
    int ms = 800 - (level * 60);   // roughly matches the real Tetris Guideline curve's shape
    if (ms < 100) ms = 100;         // floor it -- don't let the game become literally unplayable
    return std::chrono::milliseconds(ms);
}
```

**Why floor it at 100ms rather than letting the formula run unbounded?** At high enough levels the linear formula would eventually hit zero or go negative — a `std::chrono::milliseconds(0)` or negative tick interval would either spin the gravity tick nonsensically fast or produce undefined/nonsensical timing behavior. Clamping to a sane minimum is a small but real defensive-programming habit: formulas derived for a "normal" input range often need an explicit bound once you consider the edges (this is the same instinct as Series 1 Module 8's load-factor bound-checking, or Module 2's overflow awareness — know where your formula's assumptions stop holding).

---

## 2. Designing the state machine: two real approaches

The game needs distinct modes — a menu, active play, paused, game-over — each responding differently to input and rendering differently. There are two standard ways to build this, and (matching this series' habit of showing real trade-offs rather than picking silently) both are worth seeing before choosing.

### Approach A: `enum class` + `switch` (simpler)

```cpp
enum class GameState { MENU, PLAYING, PAUSED, GAME_OVER };

class Game {
private:
    GameState state;
    Board board;
    GameStats stats;
    // ... piece queue, current piece, etc. ...

public:
    void handleInput(char key) {
        switch (state) {
            case GameState::MENU:
                if (key == ' ') state = GameState::PLAYING;
                break;
            case GameState::PLAYING:
                if (key == 'p') state = GameState::PAUSED;
                else handlePlayingInput(key);   // movement, rotation, etc.
                break;
            case GameState::PAUSED:
                if (key == 'p') state = GameState::PLAYING;
                break;
            case GameState::GAME_OVER:
                if (key == 'r') resetGame();
                break;
        }
    }

    void update() {
        if (state == GameState::PLAYING) {
            // gravity tick, collision, locking, line-clear logic all go here
        }
        // MENU, PAUSED, GAME_OVER: no per-tick game logic needed
    }

    void render() {
        switch (state) {
            case GameState::MENU:      renderMenu(); break;
            case GameState::PLAYING:   renderGameplay(); break;
            case GameState::PAUSED:    renderPaused(); break;
            case GameState::GAME_OVER: renderGameOver(); break;
        }
    }
};
```

### Approach B: polymorphic states (the "State pattern")

```cpp
class GameState_Base {
public:
    virtual ~GameState_Base() {}
    virtual void handleInput(Game& game, char key) = 0;
    virtual void update(Game& game) = 0;
    virtual void render(const Game& game) = 0;
};

class PlayingState : public GameState_Base {
public:
    void handleInput(Game& game, char key) override { /* movement, rotation, pause key */ }
    void update(Game& game) override { /* gravity, collision, locking, line clears */ }
    void render(const Game& game) override { /* draw the board and current piece */ }
};

class PausedState : public GameState_Base {
public:
    void handleInput(Game& game, char key) override { /* only unpause key does anything */ }
    void update(Game& game) override { /* deliberately empty -- nothing advances while paused */ }
    void render(const Game& game) override { /* draw the board frozen, plus a "PAUSED" overlay */ }
};

// Game now holds: std::unique_ptr<GameState_Base> currentState;
// transitioning states = currentState = std::make_unique<PausedState>();
```

### Trade-off: which approach fits here?

| | `enum` + `switch` | Polymorphic states |
|---|---|---|
| Code organization | All states' logic lives together in one class's methods, in switch blocks | Each state is its own small, self-contained class |
| Adding a new state | Add an enum value + a new case in every switch (`handleInput`, `update`, `render`) | Add a new class implementing the interface — nothing existing needs editing |
| Risk of forgetting a case | Real — miss a case in one switch and the compiler won't always warn you (though `-Wswitch` helps for exhaustive enum handling) | Structurally impossible to "forget a case" — every state class is forced to implement the full interface (pure virtual functions, Series 1 Module 4) |
| Overhead | None | Small — one `unique_ptr` indirection and virtual calls per state transition/tick (genuinely negligible here, same conclusion as Module 2 section 4's vtable-cost exercise) |
| Appropriate for this project's scale (4 simple states)? | Yes — arguably the more proportionate choice for something this small | Also fine, but somewhat more ceremony than 4 simple states strictly need |

**Honest recommendation for a project this size**: the `switch`-based approach is genuinely reasonable here — 4 states with fairly simple, related logic is close to the sweet spot for a switch, and Series 1 Module 4's core lesson (don't reach for inheritance/virtual dispatch just because you can) applies again. The polymorphic version earns its complexity once you have many states with substantially divergent, complex per-state logic (a real game engine's state machine, for instance, might have a dozen+ states). We're building **Approach A** for the actual project, but Approach B is fully sketched above and practice problem 5 has you build it, specifically so you have hands-on experience with both before deciding for yourself which you'd reach for in a different project.

---

## 3. Game-over detection, wired for real

Module 4 practice problem 6 flagged the detection mechanism (a freshly spawned piece immediately failing `isValidPosition`); this module is where it actually gets wired into the state machine:

```cpp
void Game::spawnNextPiece() {
    currentPiece = pieceFactory.createPiece(pieceQueue.spawnNext(), spawnX, spawnY);

    if (!isValidPosition(board, *currentPiece)) {
        state = GameState::GAME_OVER;
    }
}
```

This is a clean, small illustration of why keeping `isValidPosition` (Module 3) as one small, pure, heavily-reused function paid off: game-over detection needed zero new collision logic — it's just "call the same function you already trust, and route a `false` result into a new consequence."

---

## Practice Problems

1. **Build the `enum`+`switch` state machine**: Implement `GameState`, wire `handleInput`/`update`/`render` as sketched in Approach A, and confirm you can navigate MENU -> PLAYING -> PAUSED -> PLAYING with the appropriate key presses, with rendering changing correctly at each transition.

2. **Level-up verification**: Manually trigger enough line clears (via `GameStats::applyClear` calls in a test, or by actually playing) to cross a `LINES_PER_LEVEL` boundary, and confirm `getLevel()` increments exactly once at the boundary, not multiple times, and not early.

3. **Speed curve sanity check**: Call `gravityIntervalForLevel` for levels 0 through 15 and print the results. Confirm it decreases as expected and correctly floors at 100ms rather than going lower or negative at high levels.

4. **Wire level into the actual gravity tick**: Update your Module 1 game loop's fixed `tickInterval` to instead be `gravityIntervalForLevel(stats.getLevel())`, re-read every tick (or every time the level changes) rather than being a fixed constant. Confirm pieces visibly fall faster as you level up during actual play.

5. **Build the polymorphic alternative**: Implement Approach B fully (all four state classes), swap it in for Approach A, and confirm identical externally-visible behavior. Write a short comment stating which approach you'd choose for this specific project and why, using this module's trade-off table as your basis — the goal is a reasoned choice, not necessarily agreeing with the module's own recommendation.

6. **Game over -> reset flow**: Implement `resetGame()` (fresh `Board`, fresh `GameStats`, fresh `PieceQueue`) and confirm pressing 'r' from the `GAME_OVER` state correctly returns you to a clean `PLAYING` state, not a state carrying over stale data (an old score, old board contents) from the previous game.

---

## Files for this module

```
GameStats.h / .cpp   — update: add level-up logic inside applyClear, per section 1
Difficulty.h / .cpp  — gravityIntervalForLevel
GameState.h          — the GameState enum (Approach A) -- and/or GameState_Base + subclasses (Approach B)
Game.h / Game.cpp    — the Game class: owns Board, GameStats, PieceQueue, current piece, state;
                        implements handleInput/update/render, spawnNextPiece, resetGame
main.cpp             — update: now just constructs a Game and drives it through the Module 1 loop,
                        delegating input/update/render to Game instead of inlining logic directly
```

Updated compile command:
```bash
g++ -std=c++17 -fsanitize=address,undefined -g \
    main.cpp TerminalIO.cpp Tetromino.cpp TPiece.cpp IPiece.cpp OPiece.cpp \
    SPiece.cpp ZPiece.cpp JPiece.cpp LPiece.cpp PieceFactory.cpp \
    Collision.cpp SevenBagRandomizer.cpp PieceQueue.cpp \
    LineClear.cpp GameStats.cpp Difficulty.cpp Game.cpp \
    -o tetris
```

**Checkpoint**: after this module, you should have a genuinely complete game loop — a menu screen, playable Tetris with correctly increasing speed as you level up, a working pause, and a game-over screen that lets you restart cleanly. This is the first point where the project feels like a finished game rather than a tech demo, even before Modules 7-8's extra features.

---

**Next: Module 7 — Hold Piece, Ghost Piece & Extras**, where you'll add the quality-of-life features expected of any modern Tetris implementation, and revisit ownership questions around where the "held" piece actually lives. Say "next module" when ready.
