# Tetris Module 4: The Piece Queue & 7-Bag Randomizer

## Why this module matters

Right now, nothing decides *which* piece spawns next. Naive random selection (just pick a random number 0-6 every time) is a real, well-documented problem in Tetris: it can produce brutal droughts (going 20+ pieces without an I-piece, for instance) purely by bad luck, which feels unfair to a player even though it's "correctly" random. This module builds the industry-standard fix — the **7-bag randomizer** — and wires it through a `Queue<T>`, giving Series 1's `Queue` a genuine, motivated job for the first time in this project.

---

## 1. Why naive randomness feels bad

```cpp
#include <random>

int naiveRandomPiece(std::mt19937& rng) {
    std::uniform_int_distribution<int> dist(0, 6);
    return dist(rng);   // uniformly random 0-6, every call independent of every previous call
}
```

This is *correctly* random — but "correctly random" and "feels fair to a human" are different things. With true independence, there's nothing stopping the same piece appearing 5 times in a row, or a specific piece (say, the I-piece, which is disproportionately useful for clearing multiple lines at once) simply not showing up for a long stretch by chance. Over a long enough game this evens out statistically, but a human player experiences the short-term streaks as "the game is being unfair," not as "this is what randomness looks like."

---

## 2. The 7-bag algorithm

The fix: instead of picking independently each time, put all 7 piece types into a "bag," shuffle it, and hand out pieces from the bag one at a time. Once the bag is empty, refill it with all 7 types again and reshuffle. This guarantees every 7-piece stretch contains exactly one of each piece — droughts are structurally impossible, while the *order* within each bag is still genuinely random.

```cpp
#include <vector>
#include <random>
#include <algorithm>

class SevenBagRandomizer {
private:
    std::vector<int> bag;    // holds remaining piece-type indices (0-6) for the current bag
    std::mt19937 rng;

    void refillBag() {
        bag = {0, 1, 2, 3, 4, 5, 6};   // one of each piece type
        std::shuffle(bag.begin(), bag.end(), rng);
    }

public:
    SevenBagRandomizer() : rng(std::random_device{}()) {
        refillBag();
    }

    int next() {
        if (bag.empty()) {
            refillBag();
        }
        int piece = bag.back();
        bag.pop_back();
        return piece;
    }
};
```

```
Bag lifecycle:

refillBag(): bag = shuffled [3, 0, 6, 1, 4, 2, 5]   (one of each, random order)

next() -> 5, bag = [3, 0, 6, 1, 4, 2]
next() -> 2, bag = [3, 0, 6, 1, 4]
... (5 more calls drain the bag completely) ...
next() -> bag is empty, refillBag() runs again -> new shuffled bag of 7
```

**`std::random_device{}()`** provides a genuinely random seed (pulling from the OS's entropy source, not a predictable value like the current time) to seed `std::mt19937` (a well-regarded pseudorandom number generator — not cryptographically secure, but more than sufficient for game randomness). **Seed once, in the constructor** — reseeding on every call would be both wasteful and would actually make the sequence *less* well-distributed, not more random, since `mt19937`'s statistical guarantees depend on advancing one long sequence, not restarting repeatedly from fresh (often correlated) seeds.

### Trade-off: 7-bag vs. pure random vs. other schemes

| | Pure random (naive) | 7-bag | "Random, but reject repeats of the last piece" |
|---|---|---|---|
| Can produce long droughts of one piece type? | Yes, by chance | No — structurally impossible beyond a 12-piece window (worst case: end of one bag, start of next) | Reduces but doesn't eliminate droughts |
| Feels fair to players | Often doesn't | Generally does — this is the real-world standard used by modern official Tetris | Better than naive, worse than 7-bag |
| Implementation complexity | Trivial | Small (a shuffle + a stack-like drain) | Trivial, but statistically messier to reason about (biases the distribution in ways that are easy to get subtly wrong) |
| What real Tetris games use | Very old/naive implementations only | The modern standard (this is literally what "Guideline Tetris" specifies) | Rare, mostly historical |

---

## 3. The next-piece preview queue

Players expect to see upcoming pieces (usually the next 1-5), not just be surprised by whatever spawns. This is where `Queue<T>` (Series 1 Module 5) finally does real work: maintain a queue of upcoming piece-type indices, always keeping it topped up from the `SevenBagRandomizer`, and `pop()` from the front whenever the current piece locks and a new one needs to spawn.

```cpp
#include "Queue.h"   // Series 1's generic Queue<T>

class PieceQueue {
private:
    SevenBagRandomizer randomizer;
    Queue<int> upcoming;
    static const int PREVIEW_COUNT = 3;   // show the next 3 pieces

    void refillPreview() {
        while (upcoming.size() < PREVIEW_COUNT) {
            upcoming.push(randomizer.next());
        }
    }

public:
    PieceQueue() {
        refillPreview();
    }

    int spawnNext() {
        int piece = upcoming.front();
        upcoming.pop();
        refillPreview();
        return piece;
    }

    // for rendering the preview -- Series 1's Queue doesn't expose iteration by default,
    // so this either needs a small extension to Queue<T>, or a different approach (see below)
    std::vector<int> peekUpcoming() const;
};
```

**A genuine design snag, worth sitting with**: Series 1's `Queue<T>` (Module 5) only exposed `push`/`pop`/`front`/`empty`/`size` — deliberately minimal, matching a real queue's restricted interface. But a next-piece *preview* needs to look at several upcoming items *without* removing them, which a strict queue interface doesn't support. You have a real design choice here:

1. **Extend `Queue<T>`** with a non-owning peek/iteration capability, accepting that it's no longer a "pure" queue abstraction.
2. **Use `std::deque<int>`** instead for `upcoming`, which supports indexed access alongside push/pop-front — sacrificing the "custom structure from Series 1" angle for a standard container that already fits the need.
3. **Keep `Queue<T>` as the source of truth for actual gameplay logic** (what piece spawns next, strictly FIFO), but maintain a **separate small `std::vector<int>` purely for rendering the preview**, kept in sync whenever the queue changes.

There's no single right answer — option 3 is arguably the cleanest (it keeps `Queue<T>`'s interface honest and un-compromised, at the cost of a small amount of duplicated bookkeeping), but option 2 is the pragmatic real-world choice (nobody hand-rolls a queue in production C++ when `std::deque` already does the job). Practice problem 4 has you implement whichever you find most defensible, and explain why.

---

## Practice Problems

1. **Verify bag fairness**: Run `SevenBagRandomizer::next()` 700 times (100 full bags), tally how many times each piece type (0-6) appeared, and confirm every type appears exactly 100 times — a strong, deterministic guarantee that pure randomness could never give you.

2. **Confirm no long droughts**: Track the number of `next()` calls between consecutive appearances of piece type 0 (say) across many bags. Confirm the maximum gap never exceeds 12 (worst case: type 0 is the *first* piece in one bag, then the *last* piece in the next bag — 6 other pieces, then 6 more, minus double counting the boundary — work out the exact bound yourself as part of this problem).

3. **Naive-vs-bag drought comparison**: Implement `naiveRandomPiece` from section 1 alongside the bag randomizer, run both for, say, 1000 calls, and measure the longest drought (calls between consecutive appearances) of a single piece type for each. Confirm the naive version can produce noticeably longer droughts than the bag version's mathematical maximum.

4. **Build the preview queue**: Implement `PieceQueue` using whichever of the three approaches from section 3 you find most defensible, and write a short justification comment for your choice. Confirm `spawnNext()` correctly returns pieces in the order the bag generated them, and that the preview always shows the correct upcoming 3 pieces.

5. **Integration with Module 3**: Wire `PieceQueue::spawnNext()` into your `gravityTick`/locking logic from Module 3 — when a piece locks, immediately spawn the next one from `PieceQueue` at the board's spawn position. Confirm a full sequence of several pieces locking in a row spawns pieces matching the expected 7-bag order.

6. **Spawn collision (a real edge case)**: If the board is nearly full near the top, a newly spawned piece might immediately fail `isValidPosition` (Module 3) — this is actually the real Tetris "game over" condition (called "block out" or "top out"). Write a check for this: after spawning, if the new piece is immediately in an invalid position, treat it as a game-over signal rather than allowing an overlapping piece to exist. You won't wire this into full game-state handling until Module 6, but write the detection now while it's fresh.

---

**Next: Module 5 — Line Clearing & Scoring**, where full rows get detected and removed, and everything above correctly shifts down — the same "shift and compact" logic as Series 1's array-based structures, applied to a 2D grid. Say "next module" when ready.
