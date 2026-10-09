---
title: Play Circuit Clash — the game you will learn to build
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: none
pedagogy: typed
typedDiff: true
---

This standalone series teaches software engineering by building **Circuit Clash**, a third-person kart combat racer. Play the browser reference first, then build your own native desktop implementation with C#, .NET 10, and Raylib-cs. The guided path includes low-poly geometry and lighting, driving, combat, menus, persistent upgrades, tactical Q-learning, tests, and packaging. The native build is verified on Apple silicon macOS; other desktop platforms and beginner pacing still need learner testing.

You do not need to have taken the Java, Python or game-engine series. The guided path begins with execution, values, types and logic before combining them into classes, collections and game systems. You will type and understand your own implementation. Playing this sample does not copy source files into your project.

The code panels use the same live diff as the other Project Studio series: green lines need adding, red lines need removing, and amber lines need indentation changes. They compare your file with the code built up through the current step. You still type every line yourself. A matching file confirms transcription; run the lesson’s tests to check behavior. Neither comparison nor a failed challenge blocks moving forward.

## Play the destination first

[**Launch Circuit Clash — play the reference game**](#/game/circuit-clash)

This is a playable game, not a trailer. Open Race, pick rival tactics and start. Drive through the yellow checkpoint posts in order and finish two laps. The chase camera follows behind your kart around a winding, elevated mountain circuit. Mint crystals replenish equipment. Running off the road slows you down; Recover returns you to the last checkpoint.

Use **WASD or the arrow keys** to accelerate, brake and steer. **1** selects a rocket, **2** selects a mine, and **Space** fires the selected weapon. **Shift** spends energy on a boost; **E** spends it on a shield. **R** recovers your kart. **Escape** pauses; changing focus also pauses the race. Touch driving controls appear on small screens and touch devices.

Start by concentrating on driving. You can also select **Watch a demo race** to see a complete race with a computer driver before taking the controls; demonstrations award no garage credits. A rocket travels forward and can steer toward a rival ahead; a mine stays behind you until someone hits it or it expires. A shield blocks a hit while active. Energy is shared by boost and shield, so boosting has a defensive opportunity cost: the energy you spend now cannot immediately protect you. Equipment cooldowns prevent unlimited firing.

You begin with a rally chassis and enough credits to unlock one other package. In the Garage, compare turbo speed with its slower steering, and impact protection with its lower top speed. Finishing races earns additional credits. Purchases and your equipped package are saved locally on this device when browser storage is available. Race position itself is not a saved game.

You can close the game and continue this introduction at any time. Winning, finishing a race, or passing a challenge never unlocks the teaching material.

## Choose a starting point and a working method {#learning-contract}

This course is for Python scripters who can make programs run but want stronger control over types, structure, and failure. You need no prior C#, graphics, machine-learning, or Java course. If names such as “invariant” or “vector” are unfamiliar, follow the guided foundations; they are teaching material, not entrance requirements.

The order is deliberate: computer execution → numeric types and conversion → logic and calls → objects and contracts → data structures and algorithms → repositories → vectors and geometry → rendering and race systems → probability and reinforcement learning → evaluation and concurrency → application integration and release. Small independent Scratch experiments precede the larger uses. The browser sample is available throughout as a concrete destination.

For each fragment: predict a value or failure, type it yourself, run the stated experiment, explain what changed, and review the result. A green output is evidence about a requirement only if the experiment would reject a plausible wrong implementation. Use the return-later challenges for independent practice; they never unlock later lessons. Struggling with a challenge means you have a useful topic to revisit, not that you lose access to the course.

This is an applied foundation in software engineering, graphics, and tabular reinforcement learning. It is not every topic in a computer-science degree, every kind of game engine, or every machine-learning method. Later domains still require new study; the aim here is transferable reasoning and a substantial program you can explain, test, and change.

## Notice behavior before naming the code

A **requirement** describes behavior someone can observe. “Use a class” is an implementation choice. “Buying a package once lets me equip it again without paying” is an observable requirement.

Try the garage: unlock an upgrade, select another owned package, then equip the upgrade again. The credits should decrease only at the unlock, not when re-equipping it. The future test needs to inspect both ownership and credits. Checking only that the name appears on screen could miss a bug that charges twice.

Next, pause while driving. Your kart, opponents, projectiles and race time should all stop. If only your kart stopped, the pause menu would look correct while the game continued unfairly. That is why testing a visible button is different from testing the behavior the button promises.

A **state** is the information a system currently holds. For a kart that includes location, speed, ammunition, energy and active effects. A **state transition** changes that information in response to an input or elapsed time. Firing a rocket changes ammunition and creates a projectile; it does not merely play an animation. Later we will trace that transition, write examples for it, and decide which object owns each responsibility.

You do not need to know how to implement these examples yet. For now, identify the input, the starting state and the result you expect. Those three pieces are the beginning of a useful specification.

## See exactly what the opponents learn

Open **Learning rivals** in the sample menu. It reports actual training runs and evaluation results. You may rerun the reproducible training experiment in the browser. Training runs separately from rendering so it can simulate races quickly without moving your current game forward.

There are two different decisions inside each opponent. A waypoint controller calculates steering toward the next part of the track; that controller is programmed, not learned. A Q-table estimates the future reward of choosing **race, rocket, mine, shield or boost** in an observed situation. Learning updates those estimates using the outcomes of simulated play.

For example, “a rival ahead, a projectile nearby, and enough energy” presents a tactical choice: fire to delay the rival, shield to avoid a hit, or boost to advance. The learning state records coarse facts about nearby rivals, threats and available equipment, along with the chosen upgrade. It does not understand every detail on the screen. Different situations can therefore look identical to the table. We must teach that limitation, not assume the word AI removes it.

Training alternates scripted opponents and frozen copies of earlier learned policies. A frozen copy keeps its estimates unchanged during a training race. This makes the opponent more consistent while the learner experiments. In a playable race, all Q-tables stay frozen; the game does **not** claim to learn from your personal driving. Opponents still choose actions based on your current position and equipment-related observations, and can attack one another.

Evaluation runs against scripted opponents on seeds unused by training. The displayed comparison is evidence about that experiment, not proof that a learned policy is universally better. A **seed** is a starting value that makes a pseudorandom sequence repeatable. Repeating an experiment with the same seeds helps distinguish a code change from a different sequence of random choices. Later lessons will explain the update equation numerically and test it before adding it to a race.

## Connect the game to transferable engineering

The reference uses the browser renderer already available inside UpSkillOS. Your C# build uses Raylib-cs and opens a native desktop window. The implementations share gameplay requirements, not identical source or rendering. You need a local .NET SDK and graphics-capable desktop for execution; browser-only Project Studio can display the lessons but cannot run the native game. The setup lesson explains the tools from the beginning.

The course teaches the underlying ideas before relying on them:

| Behavior you just tried | Concepts in the guided build |
| --- | --- |
| A kart accelerates and turns | Values, types, expressions, branching, functions, units and vectors |
| Four karts have separate ammunition | Classes, object identity, instance state and invariants |
| Human and computer racers use the same equipment | Interfaces, composition, contracts and shared rules |
| Checkpoints must be visited in order | Lists, indexing, iteration, state machines and boundary tests |
| A rocket finds a target | Search, distance calculations, algorithm cost and alternatives |
| A garage purchase survives reopening | Data models, validation, persistence and versioning |
| Menus stop and resume a race | Explicit transitions, ownership and separation of simulation from presentation |
| Opponents learn tactics | Tables, probability, rewards, numerical updates and controlled evaluation |

Patterns will be introduced when a concrete design problem warrants them. Having separate human and computer controls creates a reason for a shared interface; naming a pattern alone does not justify adding layers. Collections will be compared by the operations the game needs, not taught as an isolated vocabulary list.

The engineering outcome is the ability to explain, test, change and debug a substantial program. That reasoning transfers to Java and other languages; their syntax, libraries and tools still need to be learned. Completing guided fragments is not the same evidence as independently choosing a design.

## Challenge — write a behavior report

This challenge is **optional** and may be deferred. It does not supply a prerequisite for any later lesson.

Choose one interaction: pausing, re-equipping an upgrade, shielding a projectile, or recovering off the road. Write the starting state, your input and the observed result. Then describe one broken implementation that could still look correct in a screenshot, and an experiment that would expose it.

For instance, a pause screen could appear while a mine's timer continues counting down. Compare the mine before pausing and after resuming; a screenshot of the menu cannot establish whether time stopped. Your report should explain what the observation establishes and what remains untested.

There is no automatic pass for an open-ended explanation. Keep it in your learning notes and revisit it when the implementation lessons reach that system.
