# Open with the thing the learner wants to build

**Status: opening-lesson specifications for the curriculum draft.** Return to the [learning path](../../cpp-games-learning-path.md).

Every series begins with a **project showcase**: show the finished target, let the learner understand and try it, and establish the reason for learning the implementation. These are A00, B00, C00 and D00, before installation instructions. They are full lesson briefs, not promotional blurbs.

The target sketches below are **conceptual screen layouts**, not screenshots of completed SDL/GPU/Vulkan applications. Before a series is published, replace its sketch with actual captured behavior from the verified project. A demo is used to observe behavior, not to provide source for copying. No learner files are prefilled by the showcase.

## A00 — Can you beat an opponent that learned to play?

### Learner-facing opening

You are four points into a race to twelve. There are five more points in this turn's pot. Bank them and your score becomes nine. Roll again and a three could win immediately—but a one loses the pot. Your opponent is waiting at seven.

This is **Dice Duel**, the game you will build in C++. First you will make a terminal game with a simple rule-based opponent. Then you will make an opponent learn from the outcomes of many games, save what it learned, and play against it. You will also test whether it improved: a win in the demo is not proof that learning worked.

You only need to be able to write a small Python script. The course teaches the C++, the project tools, the game rules and the learning algorithm. You will type small pieces, investigate what they do, and solve challenges where the implementation is yours to work out.

### Show it

Conceptual terminal view:

```text
DICE DUEL — first to 12
You: 4       Opponent: 7       Pot: 5
Your turn: [r]oll or [b]ank

Bank: keep 5, reach 9, pass the turn.
Roll: 1 loses the pot; 2–6 adds to it.
      Reach 12 with score + pot to win now.
```

Required demonstration, captured from a verified finished terminal build:

1. Show a normal roll and the pot increasing. Keep the terminal large enough to read.
2. Pause at the state above. Ask the learner to choose before showing a result.
3. Branch the demonstration: bank produces score 9 and passes; a scripted roll of 1 keeps score 4 and clears the pot; a scripted roll of 3 wins. Label scripted outcomes as teaching examples rather than live random luck.
4. Show the saved opponent making a decision, then a short evaluation report with baseline, sample count and uncertainty. Do not imply one action or match proves superiority.
5. Close and reopen the program, load the same model and play again. Explain that the learned values persisted in a file the learner will implement.

A short captioned recording is sufficient when a runnable demo is unavailable in the lesson host. A read-only playable preview is better if it is faithful and accessible. It must not require the learner to install a compiler before understanding the destination. A browser reimplementation must be labelled as a rule preview and checked against the C++ rules; it must not impersonate a verified trained agent.

### Give the learner a reason and a first task

“By the end, you can change a rule, find the tests affected, retrain an opponent and explain what its numbers mean. Your game will be a project you can run outside the lesson.”

First task, no code: trace score/pot/turn for a bank and a bust, then write down one rule or display feature they would like to change. Show hints on the rules, not C++ syntax. Returning to that chosen feature at A30 is the learner's personal finish line.

Milestone strip: **print a score → defend the rules → play a complete match → learn from matches → test the opponent → save and play**. Link the milestones to real lessons only when those lessons exist.

Exit evidence: the learner can describe the game objective, bank/bust behavior and the difference between building the game and training its opponent. No programming knowledge is tested in the opener.

## B00 — Turn your terminal game into a game you can see

### Learner-facing opening

The same risky decision now has a rolling die, a highlighted player, a score board and buttons you can use with the mouse or keyboard. Resize the window: the layout and controls still line up. Close the game and open it again: it can still load your saved opponent.

You will build this graphical version using **SDL3**, a library for windows, input, graphics and audio. Your existing C++ game remains responsible for the rules. You will learn how an application listens to events, draws frames, animates a result and cleans up the resources it owns.

### Show it

Conceptual frame:

```text
┌────────────────────── DICE DUEL ──────────────────────┐
│ YOU 4                         OPPONENT 7              │
│                 ┌──────────┐                         │
│                 │  •    •  │      TURN POT: 5         │
│                 │     •    │                         │
│                 │  •    •  │                         │
│                 └──────────┘                         │
│          [ Roll · R ]            [ Bank · B ]         │
│ Your turn. Banking keeps five; a one loses the pot.   │
└──────────────────────────────────────────────────────┘
```

Required demonstration from the actual SDL build:

1. Put a terminal replay and the graphical replay beside each other; show identical scores after the same moves.
2. Make one keyboard action and one mouse action. Attempt bank at an empty pot and show it unavailable.
3. Slow a roll animation: the final result is already chosen. Show that changing animation speed does not change it.
4. Resize, minimize/restore and close. These ordinary actions belong in the success demonstration, not only in a bug checklist.
5. Show the independent feature selected at the end of B, such as an alternative layout or the small second game.

Provide captioned video plus a static labelled frame and text description. The demonstration must remain understandable without sound, and controls must not be explained solely by color.

### Give the learner a reason and a first task

“You will understand the parts a game engine normally provides for you. You will be able to turn tested rules into an application someone else can open and play.”

First task: classify a bank button click, a die animation and a score change as input, presentation or rules. Predict whether drawing the same frame twice should change the score. Let the learner choose a visual customization to build later.

Milestone strip: **open and close a window → draw the state → accept requests → animate without blocking → load the agent → package the game**.

Exit evidence: the learner knows what SDL adds, what their existing code keeps doing and what the finished application should survive. No SDL calls are shown yet.

## C00 — Build the picture behind the game

### Learner-facing opening

Now the dice sit on a small tabletop. Move the camera and the same scene changes shape on screen. Turn on wireframe or normal-color inspection and see the information used to draw it. Freeze a frame and follow one point from game geometry to the picture.

You will build a small renderer: the part of a program that turns scene data into an image. You will first write pixels and transformations yourself, then write shaders—small programs that run on the graphics processor—using SDL's GPU API. No graphics mathematics is assumed beyond the arithmetic you already used.

### Show it

The real demonstration must show the **same board** in successive representations: a tiny CPU-generated image, colored triangles, a textured board and the final tabletop with camera movement. Labels identify each representation. Do not use unrelated photorealistic footage to promise an outcome this renderer will not deliver.

Storyboard:

1. Play one familiar turn in the final scene so the target still feels like a game.
2. Pause. Highlight one die vertex and show its numeric position at each coordinate-space stage.
3. Toggle vertex colors, texture, depth and the simple light one at a time. The scene changes for an explainable reason.
4. Rotate the camera while leaving the game state frozen. Show the scores and chosen die result remain unchanged.
5. Show a tiny learner-authored shader edit changing a visible property, accompanied by the purpose of that edit rather than a wall of code.

Before capture exists, the draft uses this labelled scene requirement:

```text
TARGET: tabletop Dice Duel
Main view: board, dice, score/action overlay
Inspection: selected vertex → transform → screen position
Toggles: vertex colors / texture / depth / light
Game state: frozen while the camera moves
```

### Give the learner a reason and a first task

“You will stop treating drawing as a mysterious call. You will be able to explain where a pixel came from and change how your game looks by changing the data and calculations that create it.”

First task: predict which object looks smaller as the camera moves away, then explain why moving the camera should not retrain the opponent. The learner selects a camera or material experiment as their capstone goal.

Milestone strip: **write pixels → transform points → understand depth → compile shaders → upload geometry → draw the game**.

Exit evidence: the learner distinguishes game state, scene description and rendered image. A hardware capability check follows the showcase; it must not be the first explanation of why the course exists.

## D00 — Build the machinery that makes the frame happen

### Learner-facing opening

Here is the same game rendered by Vulkan. The goal is not that switching APIs magically makes it prettier or faster. The new achievement is control: you will understand which resources exist, where their data lives, what work the graphics processor receives and when that work has finished.

The demonstration can pause between recording a frame, submitting it and presenting it. It can show a resource being retired only after its last use. You will build those mechanisms and use them to run the familiar scene safely through resizing and shutdown.

### Show it

Use the real SDL GPU and Vulkan builds with the same camera, scene and replay. Label the backend visibly. An inspection overlay is a teaching aid, not invented driver timing data.

Storyboard:

1. Show both backends playing the same turn. Emphasize matching behavior; do not claim a speedup without measurements.
2. Freeze a frame and highlight the flow **CPU data → device resources → recorded commands → submitted work → presented image**.
3. In a separate annotated timeline, distinguish a frame's submission completion from presentation completion. Clearly label simulated timelines versus captured events.
4. Resize and minimize/restore the real window; inspect the old/new resource sets and their release conditions.
5. Show a documented diagnostic from a controlled fault and the repaired result. Establish that learning to debug this system is part of the reward.

Conceptual layout:

```text
SAME GAME VIEW                 EXPLAIN THIS FRAME
Board + dice + scores          Acquired image: ...
                              Recorded commands: ...
Backend: Vulkan               Submitted frame: ...
                              Completion/retirement: ...
```

### Give the learner a reason and a first task

“You will be able to read graphics API documentation, reason about ownership and synchronization, and explain a small renderer you built yourself. You will also know when a higher-level library is the better tool.”

First task: arrange the frame stages in order, then predict whether a C++ function returning means the GPU finished its work. Refer back to C's submission experiment for recovery. Choose a diagnostic or rendering feature to implement independently at the end.

Milestone strip: **query support → create resources → present a clear → draw geometry → bind data → retire safely → integrate and measure**.

Exit evidence: the learner understands the purpose of using Vulkan and can distinguish it from learning game rules or increasing visual complexity. The next lesson reports hardware requirements and explains unsupported-machine options honestly.

## Every later chapter starts with a smaller payoff

Before a chapter's first syntax edit, show its specific result in the running project: safe banking, a tested class, an animating die, a correctly sampled texture or a window surviving resize. Connect it to the course showcase with “we can already do this; now we are making this behavior possible.” Keep the demonstration short and reproducible.

The chapter introduction must include:

- what the learner's project currently does;
- the observable behavior they will add;
- why a player or developer would want it;
- which new idea makes it possible;
- the independent task that will prove they can use that idea.

## Publishing acceptance criteria

Each opener has actual media from its verified target, captions/text alternatives, understandable game rules, a personal goal and a route into the first small task. Media never auto-launches an installer, reveals a complete source solution or fills the learner's editor. A demonstration labelled “trained” must use an actual saved trained policy; a scripted or fixed-policy preview is labelled accordingly.

Store media provenance and the source revision/build used for capture with the authoring materials. Verify it in the rendered lesson, including small-screen layout and keyboard access. A missing or broken demonstration is an incomplete first lesson, even if its prose and code compile. No part of this draft claims these recordings have already been produced.
