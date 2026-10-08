# Forge: audit, improvement plan and session handoff

Read this first in every Forge session. It's kept short on purpose: the series plan
(`docs/pygame-engine-series-plan.md`) holds the design; this file holds **what to do next** and **how to do it
cheaply**.

## Where things stand (2026-10-08)

- Chapters 0–8 are written (57 lessons). The walkthrough passes 0.1–7.8 (51/51) and Chapter 8 walked from the
  kept 7.8 project with every wrong answer (11/11).
- Kept projects: `C:/Users/g4m3r/fg75/end78` (after 7.8), `C:/Users/g4m3r/fg75/end87` (after 8.7). Chapter 9
  starts from `end87`.
- Commits: the user committed mid-Chapter 8 (`7cb0d23e`); everything after it is uncommitted. The user commits;
  agents never touch git.
- Audits: every chapter has had this audit (Chapter 8 on 2026-10-07, Chapters 0–7 on 2026-10-08; results in the
  log below). Chapters 1–7 also had the 2026-10-05 teaching review and the 2026-10-06 beginner audit.

## Next sessions, in order

1. The chapter audits are finished (Chapters 0–7 on 2026-10-08, Chapter 8 on 2026-10-07). Two promises found for
   unwritten chapters are in the log: squash merging in Chapter 16, a settings file in `%APPDATA%` in Chapter 55.
2. "Forge: write Chapter 9." (Starts from `end87`; see the series plan's status line.)

Chapter 8 doesn't need a session of its own: its audit was done on 2026-10-07. It gets an outside read when the
user goes through it in the app (improvement 3).

## Audit procedure (per chapter)

Keep the context small: that's what made the 2026-10-07 session expensive.

1. Read the review checklist in the series plan ("Teaching, not describing" and "Lesson review checklist") and that
   chapter's notes near the top of the plan. Nothing else from the plan.
2. Read the chapter's lessons **without their full code blocks**, which the walkthrough already proves run:

   ```bash
   awk '/^```[a-z]+ file=/{skip=1; print "    [file block: " $0 "]"; next} skip && /^```$/{skip=0; next} !skip' LESSON.md
   ```

   Open a code block only when the prose makes a claim about it.
3. Look for the four kinds of problem below. Verify each one before fixing it: open the cited lesson, run the
   arithmetic, or run the code in a scratch copy of a kept project (never in `end78`/`end87` themselves).
4. Fix the lessons. Wording-only fixes need no walk. If a check, a code block or a walkthrough entry changed, walk
   that chapter: `FORGE_UNTIL=<last lesson of the chapter>` walks from 0.1 (long); there is no kept project per
   chapter except `end78` and `end87`.
5. Add one line to the log below: chapter, date, what was fixed. Then go on to the next chapter.

### What to look for

1. **Accuracy.** Wrong claims about Python and the tools; quoted outputs the code can't print; numbers that don't
   add up; "lesson N.N" references that point to the wrong lesson (open it and confirm); test counts that don't
   follow from the tests added.
2. **Teaching.** The plan's checklist: real name and definition first, the mechanism, a trace with real values for
   anything multi-step, the why (with the failing version shown where cheap), a prediction and a Your turn with no
   code shown, Your turn answers in the next step's code, nothing a beginner at that point couldn't follow.
3. **Consistency.** Something used before it's taught (grep earlier chapters to be sure); names, commands or the
   definition of done contradicting earlier lessons; promises a later lesson doesn't keep.
4. **Checks that can't fail.** `git-message` keywords already in an earlier commit message (it searches all
   history, ignoring case, as a substring: "WAL" matched "wall", "any game" matched "how many games");
   `stdout=` substrings a wrong answer also prints ("bullets=3" matches "bullets=30"); `contains` already true
   before the step; `lacks` that was never there. Also checks that would fail a correct answer the lesson allows.
   Prefer `git-tracked <file>` over `git-message` when the step creates a file.

## Improvement plan: making the course better than "correct"

In priority order. Each is one session or less.

1. **A test for weak checks. Done (2026-10-08).** `forge.desktop.test.js` has "asks git-message for words no earlier
   commit already says": it replays the walkthrough's 64 commit messages in order, without running anything, and
   fails if a `git-message` keyword already appears in an earlier one. It passes now. Run it in seconds with
   `FORGE_UNTIL=forge-tools/00-01 npx vitest run src/labs/project-studio/forge.desktop.test.js -t git-message`.
2. **The chapter audits** above, Chapters 0–7. **Done (2026-10-08).**
3. **The learner's view.** Only lesson 0.1 has been opened in the app and approved by the user. The user goes through
   one chapter in Project Studio as a learner and notes anything confusing, slow or broken (one line each, in this
   file); a session then fixes the list. This is the one review no agent can do.
4. **Mark chapters reviewed.** `src/labs/project-studio/learningProfile.js` labels a chapter unreviewed until it's in
   `REVIEWED_CHAPTERS`. Add `forge-second-game` once the user has been through it (step 3).
5. **Chapter 9 onward.** Write each new chapter with the Chapter 8 workflow: code states in `fg75/chN/s/`, lesson
   templates with `{{STATE}}` placeholders, `assemble.py`, a `walkN.py` that builds walkthrough entries from the
   same states, then `FORGE_START=<kept project> FORGE_FROM=<track>` to walk only the new chapter and
   `FORGE_KEEP` to save the result for the next one.

## Session hygiene (what made 2026-10-07 expensive, and the fix)

- **Keep each turn small.** The 2026-10-07 session wrote, verified and audited a whole chapter and then started a
  series-wide audit in the same context; every turn re-sent hundreds of thousands of tokens. The user prefers one
  long audit session to clearing every chapter, so keep reads lean instead: prose only, one lesson at a time.
- **Read lessons without their code blocks** (the `awk` above) unless the code is the question.
- **Long walks run in the background** and are waited on once, not polled.
- **No subagents for audits.** Nine at once used up the user's usage and returned nothing, because each was told to report only at the end. Audit inline.
- **Save findings as you go.** Write each verified finding into the audit log below the moment it's confirmed, so running out of usage mid-session loses nothing.
- **This file is the handoff.** Update "Where things stand" and "Next sessions" at the end of every session.

## Audit log

| Chapter | Date | Result |
|---|---|---|
| 0 | 2026-10-08 | 5 wording fixes, no walk needed: 0.1 said git comes "later in this chapter" (it's Chapter 1); 0.2 defined *package* twice with different meanings (now both senses are named); 0.3 said `None` is met "two steps on" (it's the next step), promised that Chapter 2 reshapes `leaderboard.py` (it never returns; the better shape is now stated directly), and said Chapter 4's type checker first catches `None` misuse (it's lesson 2.5). Verified correct: traceback line numbers and the call-stack table against the code, and the references to 1.2 (`.venv\.gitignore`), 1.4 (debugger), 2.1 (pytest's dependencies), 2.4 (`try`), 4.1 (`sys.path`) and 5.1/5.2 (`__file__`, `LevelError`). Accepted: 0.1's `missing err.txt` passes without the redirect ever being run; it's a cleanup check, not a test of the step. |
| 1 | 2026-10-08 | 3 wording fixes, no walk needed. 1.1: said test-run mode becomes unnecessary after Chapter 2 (checks use it through 7.8); reworded. 1.2: `git log` and `git cat-file` showed a first-commit message different from the one the lesson commits; fixed. 1.3: clean. 1.4: promised Chapter 3 teaches pdb step-into/out (no later lesson uses pdb); `s` and `r` now stated in place. Quoted outputs re-run from the lesson's own code (lives=1/-2, inside=False, the pdb values): correct. 1.5: clean (uncovered outputs paddle_x=218, lives=-2 bricks=29 and the font sizes re-run: correct). 1.6: clean (every count re-measured on the final 143-line file). Accepted: 1.2's `lacks "Breakout!!!"` and 1.4's `lacks breakpoint()` pass if the learner skipped the step; both are cleanup checks. |
| 2 | 2026-10-08 | 1 wording fix, no walk needed. 2.1: clean (the BALL_SPEED 310 failure and "3 of 6 fail" re-run: correct). 2.2: the scope predict's explanation named `faster` for the failing function, which is `faster_broken`; fixed. 2.3–2.6: clean. Re-run from the lessons' own code: 2.4's "3 failed, 23 passed" with 1.4's bug restored, 2.5's pyright outputs (line 184:28, 18 missing-hint errors, `maybe.py` positions, 7 failed/26 passed), 2.6's seeded sequences, 8 failed/25 passed and the 17 seeds whose speed isn't exactly 300. |
| 3 | 2026-10-08 | Clean: no fixes. Re-run from the lessons' own code: 3.1's two first-class error messages, 3.2's dataclass errors (3.14 wording), 3.4's pyright messages, 3.5's replay counts (7, 41) and `RectBall` output, 3.6's ruff findings (SIM114 at 254:13, `lint_me.py`). Forward references all kept (3.3 breaks command-query on purpose, 3.5's Game and challenge, Part 4's dot product, Ch4 argparse, Ch5 pydantic). |
| 4 | 2026-10-08 | 3 wording fixes in 4.4, no walk needed. 4.1–4.3: clean (4.3's argparse help and error text re-run on 3.14: correct). 4.4: "In `make_bricks`:" printed twice; claimed strict mode reports unused ignore comments (it doesn't: `reportUnnecessaryTypeIgnoreComment` is off in strict, as 4.4's own challenge says; checked with pyright 1.1.414); said 4.5's ignore comment is there "for a good reason" (4.5 presents it as a warning sign). All three fixed. 4.5–4.7: clean (4.5's `sys.meta_path` order checked on an editable install). Promise for an unwritten chapter: 4.6 says Chapter 16 shows **squash merging**; the plan's Chapter 16 row doesn't list it, so whoever writes Chapter 16 must include it. |
| 5 | 2026-10-08 | 2 wording fixes, no walk needed; 5.6 clean. 5.1: named "a level editor (Chapter 21)", but Chapter 21 is the read-only first editor and no level editor is planned; now "the Forge editor (Part 3, from Chapter 21)". 5.2: same kind, "(an editor, Chapter 21) can put the cursor on the problem" about level files; now "(an editor, say)". Re-run: 5.2's `Bad` exception outputs with and without `super().__init__`. 5.3–5.5: clean (5.4's pydantic demo output re-run: exact). Promise for an unwritten chapter: 5.5 says Chapter 55 reads a player settings file from `%APPDATA%` without being told; the plan's Chapter 55 row doesn't list it. |
| 6 | 2026-10-08 | 1 fix, no walk needed. 6.1–6.3: clean (re-run: DTZ005 by default, 6.2's pickletools offsets and JSON error position, `TzInfo(0)`, 6.3's sqlite3 shell errors incl. "(unknown)"). 6.4: the `EXPLAIN` demo quoted "a dozen instructions, one of them `(10, 'Variable', 1)`"; measured on SQLite 3.50.4 with the lesson's table: 15 instructions, `(13, 'Variable', 1)`; fixed. 6.5: clean (bug hunt's `vanish.py` re-run on 3.14: 2 / 0 / 0). |
| 7 | 2026-10-08 | 3 fixes, no walk needed. 7.1: the bug hunt's answer was given away in the step body: a "What a pragma is" paragraph after the hints showed `PRAGMA foreign_keys = ON` fixing both failures. Moved the demonstration into the hint ladder's answer rung (the concept rung already defines a pragma). Hints text only: the walkthrough's structure tests pass (`-t "Your turn step|walkthrough entry|verify command|git-message"`, 4 passed). 7.2–7.5: clean (re-run: 7.2's BEGIN/ROLLBACK shell demo). 7.6: said `scratch/` is ignored "(lesson 1.1)"; it's lesson 1.2's `.gitignore`; fixed. Its million-row numbers re-run: 30,879,744 bytes, (9992, 999), 8973, 100581, 48 MB and 68 MB with the indexes. 7.7: clean (its three REPL locking demos re-run as a script: every output matches). 7.8: "changed design seven times in one chapter"; Chapter 7 has six (7.1's design and migrations 2–6); fixed. |
| 8 | 2026-10-07 | Self-audit: 9 wording fixes (8.1 count, 8.3 bug-hunt reading, 8.5 two hints, 8.6 two claims, 8.7 two); 8.7's commit check replaced with `git-tracked`; 7.7's "WAL" check changed to "write-ahead log". |
