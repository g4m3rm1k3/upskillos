export default {
  chapter: 'making-games-12',
  order: 3,
  id: 'mg12-003',
  nextLesson: null,
  slug: 'combat',
  title: 'Combat',
  subtitle: 'An attack with a reach and a cooldown, damage from stats, hit flashes, knockback and particles, and slimes that chase round walls.',
  tags: ['game-studio', 'rpg', 'combat', 'game-feel', 'tweens', 'particles', 'pathfinding', 'enemies'],
  aliases: 'combat attack melee hit damage cooldown reach hitbox knockback invulnerability i-frames hit flash juice game feel tween modulate particles enemy ai chase pathfinding a star findpath slime death respawn',
  timeToComplete: 60,
  coreConcept: 'A hit is arithmetic and geometry: damage = attack + weapon bonus; it lands on every enemy within 16 pixels of a point 14 pixels ahead of where the hero faces, at most once per 0.4 s cooldown. Feedback makes it feel like a hit: a red flash (a tween on the sprite\'s modulate), a knockback (a velocity away from the hit for 0.15 s), a burst of particles and a sound. Enemies chase along a path round the walls (TileMapLayer.findPath, A*), found again twice a second, and hurt the hero on touch, after which it is safe for 0.8 s. Beaten enemies give experience and roll loot; a beaten hero wakes at the campfire.',
  prerequisites: ['mg12-002'],
  hook: {
    question: 'Two games with the same rules: in one, a hit just takes a number off; in the other the enemy flashes, is knocked back, bursts into sparks and squelches. Which feels like a fight? And how does a slime find its way round a wall to you?',
    realWorldContext: 'Action games are built from exactly these pieces: hitboxes and reaches, cooldowns, invulnerability frames, knockback, hit flashes and particles ("game feel" or "juice"), and pathfinding enemies. A* is the pathfinding in nearly every game with a grid or navigation mesh.',
  },
  intuition: {
    prose: [
      '**Depth: build it, and go deep.** The Try it task gives the slimes their script and the hero its attack.',
      '**Damage is arithmetic.** A hit does state.attack plus the weapon\'s bonus. A slime has 4 hit points, so hits to beat it are 4 over the damage, rounded up. A cooldown of 0.4 s between swings makes damage per second the damage over 0.4 (cell 1). A Sword (+3) more than doubles a Ranger\'s damage (+150%) but adds only 75% to a Mage\'s: a flat bonus matters most to the weak.',
      '**Where a hit lands.** The hero remembers the way it last walked, facing. A swing hits every enemy within 16 pixels of a point 14 pixels ahead (cell 3): in front and a little to each side, never behind. Measuring from the hero instead would hit things behind it too.',
      '**Feedback: game feel.** A hit that only changes a number feels like nothing. So hurt() does four more things: sets the sprite\'s modulate to red and tweens it back to white over a quarter of a second (the flash); sets a velocity away from the attacker and lets moveAndSlide carry it for 0.15 s (knockback); bursts its Puff particles; plays a sound. The hero gets the same when hurt, so slimes cannot stick to it.',
      '**Being hurt.** A slime within 12 pixels hurts the hero 1 point. Without a pause, three slimes touching every frame would take 180 a second (cell 2). So after a hit the hero is safe for 0.8 s (often called invulnerability frames): a Mage\'s 8 hit points last at least 6.4 s even in a crowd. At 0 the hero is beaten: it wakes at the campfire, healed, with half its gold.',
      '**Enemies that find their way.** A slime that walks straight at the hero gets stuck on walls. scene.get(\'Walls\').findPath(from, to) returns the cell centres of the shortest way round the solid tiles (A*, the cousin of the breadth-first search in Maze Chase, which looks towards the goal first). The slime walks to the first point, drops it when it arrives, and finds the way again twice a second, because pathfinding costs more than moving and the hero keeps moving. It chases only within 90 pixels: further away it waits.',
      '**The reward.** A beaten slime calls the hero\'s gainXp(4), rolls the loot table and frees itself. Slimes come back each time the forest is built: they are not in state.taken.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a fight',
        body: 'Step 1. The attack: a cooldown, a reach point ahead of the facing, every enemy in the group enemies near it is hurt for attack + bonus. Step 2. hurt(damage, from): take the damage, flash, knock back, particles, sound; die at 0. Step 3. Enemies: chase along findPath within sight; hurt on touch. Step 4. The hero: a safe time after each hit, and what happens at 0.',
      },
      {
        type: 'warning',
        title: 'Path every frame, and it slows',
        body: 'findPath searches the map. Twenty slimes doing it 60 times a second is 1,200 searches a second; twice a second each is 40.',
      },
      {
        type: 'insight',
        title: 'Feel is a feature',
        body: 'Flash, knockback, particles and sound change nothing in the rules, and everything in how the game feels. Tweens and particles (this chapter\'s engine features) exist for this.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Damage, safety and reach',
        caption: 'The numbers the game uses.',
        props: {
          lesson: {
            title: 'Damage, safety and reach',
            subtitle: 'The arithmetic and the geometry of a hit.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Damage per second\nPredict first: who gains most from a Sword?',
                startCode: '// Damage per second: a hit\'s damage divided by the time between hits (the cooldown). Predict first: does a Sword (+3)\n// matter more to a Ranger or to a Mage?\nconst cooldown = 0.4\nfor (const [name, attack] of [[\'Warrior\', 3], [\'Ranger\', 2], [\'Mage\', 4]]) {\n  for (const [weapon, bonus] of [[\'no weapon\', 0], [\'Sword\', 3]]) {\n    const damage = attack + bonus\n    console.log(name.padEnd(8), weapon.padEnd(10), \'damage\', damage, \' per second\', (damage / cooldown).toFixed(1), \' hits for a slime\', Math.ceil(4 / damage), \' increase\', bonus ? Math.round(100 * bonus / attack) + \'%\' : \'\')\n  }\n}',
              },
              {
                type: 'js',
                instruction: '### 2. Safe after a hit\nPredict first: a Mage in a crowd.',
                startCode: '// Being hurt: a slime\'s touch takes 1 hit point, then the hero is safe for 0.8 s, so it loses at most 1 every 0.8 s\n// however many slimes touch it. Predict first: how long does a Mage (8 hp) last in a crowd?\nconst safe = 0.8\nfor (const [name, hp] of [[\'Warrior\', 14], [\'Ranger\', 10], [\'Mage\', 8]]) console.log(name.padEnd(8), hp, \'hp lasts at least\', (hp * safe).toFixed(1), \'s of touching (the last hit at\', ((hp - 1) * safe).toFixed(1), \'s)\')\n// Without the safe time, three slimes touching every frame (60 a second) would take 180 hit points a second.\nconsole.log(\'without it: 3 slimes × 60 frames =\', 3 * 60, \'hp a second\')',
              },
              {
                type: 'js',
                instruction: '### 3. Where a swing lands\nPredict first: which slimes are hit.',
                startCode: '// The reach: an attack hits every enemy within 16 pixels of a point 14 pixels ahead of the hero. Predict first: which\n// of these slimes does a swing to the right hit?\nconst hero = { x: 100, y: 100 }, facing = { x: 1, y: 0 }\nconst point = { x: hero.x + 14 * facing.x, y: hero.y + 14 * facing.y }\nconst slimes = { \'right, close\': { x: 112, y: 100 }, \'right, far\': { x: 140, y: 100 }, \'just above\': { x: 104, y: 86 }, \'behind\': { x: 88, y: 100 }, \'diagonal\': { x: 122, y: 112 } }\nfor (const [name, s] of Object.entries(slimes)) {\n  const d = Math.hypot(s.x - point.x, s.y - point.y)\n  console.log(name.padEnd(13), \'is\', d.toFixed(1), \'pixels from the point:\', d < 16 ? \'hit\' : \'missed\')\n}',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: inReach()\nThe check tries six slimes.',
                startCode: '// Challenge: inReach(hero, facing, enemy) is whether a swing hits: the enemy is less than 16 pixels from the point 14\n// pixels ahead of the hero (facing is a direction of length 1).\nfunction inReach(hero, facing, enemy) {\n  return Math.hypot(enemy.x - hero.x, enemy.y - hero.y) < 16   // measured from the hero: change it\n}\nconst h = { x: 100, y: 100 }, right = { x: 1, y: 0 }, up = { x: 0, y: -1 }\nconst cases = [[right, { x: 112, y: 100 }, true], [right, { x: 88, y: 100 }, false], [right, { x: 140, y: 100 }, false], [right, { x: 122, y: 112 }, true], [up, { x: 100, y: 80 }, true], [up, { x: 100, y: 115 }, false]]\nconst bad = cases.find(([f, e, want]) => inReach(h, f, e) !== want)\nconsole.log(bad ? \'Facing (\' + bad[0].x + \', \' + bad[0].y + \'), an enemy at (\' + bad[1].x + \', \' + bad[1].y + \') should be \' + (bad[2] ? \'hit\' : \'missed\') + \'.\' : \'✓ Hits in front, misses behind: the reach is measured from the point ahead.\')',
                solutionCode: '// Challenge: inReach(hero, facing, enemy) is whether a swing hits: the enemy is less than 16 pixels from the point 14\n// pixels ahead of the hero (facing is a direction of length 1).\nfunction inReach(hero, facing, enemy) {\n  const point = { x: hero.x + 14 * facing.x, y: hero.y + 14 * facing.y }\n  return Math.hypot(enemy.x - point.x, enemy.y - point.y) < 16\n}\nconst h = { x: 100, y: 100 }, right = { x: 1, y: 0 }, up = { x: 0, y: -1 }\nconst cases = [[right, { x: 112, y: 100 }, true], [right, { x: 88, y: 100 }, false], [right, { x: 140, y: 100 }, false], [right, { x: 122, y: 112 }, true], [up, { x: 100, y: 80 }, true], [up, { x: 100, y: 115 }, false]]\nconst bad = cases.find(([f, e, want]) => inReach(h, f, e) !== want)\nconsole.log(bad ? \'Facing (\' + bad[0].x + \', \' + bad[0].y + \'), an enemy at (\' + bad[1].x + \', \' + bad[1].y + \') should be \' + (bad[2] ? \'hit\' : \'missed\') + \'.\' : \'✓ Hits in front, misses behind: the reach is measured from the point ahead.\')',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Combat',
        props: {
          task: 'qa-combat',
          lesson: 'mg12-003',
          checkpoint: 'cp-mg12-003-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**Hits and damage per second, decoded.** $n = \\lceil H / d \\rceil$, read "the enemy\'s hit points over the damage, rounded up": you cannot hit two-thirds of a time. $\\text{DPS} = d / c$, read "damage over the cooldown". For a Warrior with a Sword, $d = 3 + 3 = 6$ and $\\text{DPS} = 6 / 0.4 = 15$.',
      '**The reach, decoded.** With the hero at $h$ facing the unit direction $u$, the swing\'s point is $q = h + 14u$, read "14 pixels ahead". An enemy at $e$ is hit when $\\lVert e - q \\rVert < 16$, read "its distance from that point is under 16". In code: reach, facing.normalized().scale(14) and distanceTo.',
      '**Surviving.** With hit points $P$ and a safe time $s$ after each hit, the hero lasts at least $(P - 1)\\,s$ seconds of touching before the last hit: $(8 - 1) \\times 0.8 = 5.6$ s for a Mage.',
    ],
    equations: [
      {
        label: 'Hits to beat an enemy',
        latex: 'n = \\lceil H / d \\rceil,\\quad d = \\text{attack} + \\text{bonus}',
      },
      {
        label: 'Damage per second',
        latex: '\\text{DPS} = \\frac{d}{c}',
      },
      {
        label: 'Is it in reach?',
        latex: '\\lVert e - (h + 14u) \\rVert < 16',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'A* with an admissible guess (one that never overestimates, like the Manhattan distance on a 4-way grid) always finds a shortest path, and usually looks at far fewer cells than breadth-first search; the engine\'s tests check both against 200 random mazes.',
      'Where it goes: 12.4 adds a buddy who fights alongside you, and learns how.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg12-003-ex1',
      title: 'Hits to beat',
      difficulty: 'easy',
      problem: 'A Ranger with a Dagger (+2) against a 9-point enemy?',
      steps: [
        {
          expression: '\\lceil 9 / 4 \\rceil = 3',
          annotation: 'Damage 2 + 2.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '3 hits.',
    },
    {
      id: 'mg12-003-ex2',
      title: 'Just above',
      difficulty: 'medium',
      problem: 'In cell 3, why is the slime just above (104, 86) missed while the diagonal one (122, 112) is hit?',
      steps: [
        {
          expression: '\\lVert (104, 86) - (114, 100) \\rVert = 17.2',
          annotation: 'Just over 16.',
          strategyTitle: 'Step 1',
        },
        {
          expression: '\\lVert (122, 112) - (114, 100) \\rVert = 14.4',
          annotation: 'Under.',
          strategyTitle: 'Step 2',
        },
      ],
      answer: 'Distance is from the point 14 ahead, not the hero: the diagonal one is closer to it.',
    },
    {
      id: 'mg12-003-ex3',
      title: 'A crowd',
      difficulty: 'hard',
      problem: 'Why does the safe time make three slimes no more dangerous than one, while they all touch?',
      steps: [
        {
          expression: '\\text{one hit per } 0.8\\text{ s}',
          annotation: 'Whoever touches.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'The hero can be hurt at most once per 0.8 s, so extra slimes add nothing while it is safe; they matter by keeping it from getting away.',
    },
  ],
  challenges: [
    {
      id: 'mg12-003-ch1',
      title: 'A slower swing',
      difficulty: 'easy',
      problem: 'Give the Warrior a 0.6 s cooldown but 2 more damage. Is it better?',
      hint: 'DPS.',
      answer: '(3 + 2) / 0.6 ≈ 8.3 against 3 / 0.4 = 7.5: a little more damage per second, and one hit for a slime.',
      walkthrough: [],
    },
    {
      id: 'mg12-003-ch2',
      title: 'A second enemy',
      difficulty: 'medium',
      problem: 'Add a bat that flies straight at you (over walls) and has 2 hit points.',
      hint: 'No findPath.',
      answer: 'A scene like the slime\'s, its own script: no findPath (it flies), hp 2, in the group enemies, so the hero\'s attack hits it already.',
      walkthrough: [],
    },
    {
      id: 'mg12-003-ch3',
      title: 'Critical hits',
      difficulty: 'hard',
      problem: 'Add a 10% chance of double damage, seeded so tests can repeat it.',
      hint: 'math.rng and state.',
      answer: 'In attack(): const r = math.rng(state.critSeed); const crit = r.chance(0.1); state.critSeed = r.state; damage *= crit ? 2 : 1; show it with a bigger flash.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'cooldown',
        meaning: 'Seconds before the next attack.',
      },
      {
        symbol: 'reach',
        meaning: 'The point 14 pixels ahead; hits within 16 of it.',
      },
      {
        symbol: 'modulate',
        meaning: 'A sprite\'s tint: red, then tweened back, is a flash.',
      },
      {
        symbol: 'knockback',
        meaning: 'A velocity away from the hit, for a moment.',
      },
      {
        symbol: 'safe time',
        meaning: 'After a hit, a moment the hero cannot be hurt.',
      },
      {
        symbol: 'findPath',
        meaning: 'A* round the walls: the cell centres to walk.',
      },
    ],
    rulesOfThumb: [
      'Every hit gets feedback.',
      'Measure reach from a point ahead.',
      'A safe time after each hit.',
      'Find paths a few times a second, not every frame.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'More slimes means damage piles up.',
      whyStudentsThinkIt: 'Each touches.',
      correctionExample: 'Cell 2: the safe time allows one hit per 0.8 s.',
      contrastCase: 'Without it, 180 a second.',
    },
    {
      falseBelief: 'Flashes and particles are decoration to add last.',
      whyStudentsThinkIt: 'They change no rules.',
      correctionExample: 'Without them a hit is not felt; players cannot tell what happened.',
      contrastCase: 'They should never hide the rules (a flash must not cover the enemy).',
    },
  ],
  transferPrompts: [
    {
      situation: 'A platformer enemy that patrols a ledge.',
      competingTechniques: [
        'findPath',
        'A simple walk that turns at edges',
      ],
      whyThisTechniqueWins: 'Pathfinding is for getting somewhere round obstacles; a patrol does not need it.',
    },
    {
      situation: 'Many enemies chasing at once.',
      competingTechniques: [
        'Each finds its path every frame',
        'Each a few times a second, or one shared flow field',
      ],
      whyThisTechniqueWins: 'The work grows with enemies × searches per second.',
    },
  ],
  debugging: [
    {
      commonError: 'Attacks miss enemies right in front.',
      symptom: 'Nothing happens on J.',
      whyItHappened: 'facing was never set (the hero has not moved), or enemies are not in the group enemies.',
      repairStrategy: 'Start facing as a direction; put enemies in the group.',
    },
    {
      commonError: 'Enemies stuck on walls.',
      symptom: 'They push into a wall forever.',
      whyItHappened: 'They walk straight at the hero.',
      repairStrategy: 'Walk the points findPath returns.',
    },
    {
      commonError: 'A named field called path.',
      symptom: 'Cannot set property path … which has only a getter.',
      whyItHappened: 'path is a node\'s own path in the tree.',
      repairStrategy: 'Call it route.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Build an attack, an enemy that chases, and the feedback for both.',
    explainVerbally: 'Explain damage, reach, safe time and A* chasing.',
    detectIncorrectApplication: 'Spot reach measured from the hero, and pathfinding every frame.',
    transferToUnfamiliar: 'Build combat for another kind of game.',
  },
  assessment: {
    questions: [
      {
        id: 'mg12-003-assess-1',
        type: 'choice',
        text: 'A Warrior with a Sword does how much damage per second?',
        options: ['15', '6', '7.5', '2.4'],
        answer: '15',
        hint: 'Cell 1.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg12-003-quiz-1',
      type: 'choice',
      text: 'In cell 1, a Sword raises a Ranger\'s damage by',
      options: ['150%', '75%', '100%', '3%'],
      answer: '150%',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg12-003-quiz-2',
      type: 'choice',
      text: 'In cell 2, a Mage lasts at least',
      options: ['6.4 s', '8 s', '5.6 s', '0.8 s'],
      answer: '6.4 s',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg12-003-quiz-3',
      type: 'choice',
      text: 'In cell 3, the slime behind the hero is',
      options: ['Missed', 'Hit', 'Knocked back', 'Beaten'],
      answer: 'Missed',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg12-003-quiz-4',
      type: 'choice',
      text: 'A hit flash is',
      options: [
        'modulate set red, then tweened back to white',
        'A new sprite',
        'Particles',
        'A sound',
      ],
      answer: 'modulate set red, then tweened back to white',
      hints: ['Feedback.'],
      reviewSection: 'Intuition — feedback',
    },
    {
      id: 'mg12-003-quiz-5',
      type: 'choice',
      text: 'Slimes find their way again',
      options: ['Twice a second', 'Every frame', 'Once', 'Never'],
      answer: 'Twice a second',
      hints: ['Enemies that find their way.'],
      reviewSection: 'Intuition — enemies',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg12-003-1',
      label: 'Read damage, reach and cooldowns',
      type: 'read',
    },
    {
      id: 'cp-mg12-003-2',
      label: 'Read feedback, being hurt, and pathfinding',
      type: 'read',
    },
    {
      id: 'cp-mg12-003-3',
      label: 'Run the notebook: damage, safety and reach',
      type: 'read',
    },
    {
      id: 'cp-mg12-003-4',
      label: 'Complete "Combat" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg12-003-5',
      label: 'Work through "Just above"',
      type: 'example',
    },
    {
      id: 'cp-mg12-003-6',
      label: 'Pass the inReach() challenge',
      type: 'challenge',
    },
  ],
}
