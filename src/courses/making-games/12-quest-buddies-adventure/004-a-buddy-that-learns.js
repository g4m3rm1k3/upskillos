export default {
  chapter: 'making-games-12',
  order: 4,
  id: 'mg12-004',
  nextLesson: 'mg12-005',
  slug: 'a-buddy-that-learns',
  title: 'A Buddy That Learns',
  subtitle: 'A companion who learns to fight beside you while you play, by Q-learning in its own script, and skill points that make it better at learning.',
  tags: ['game-studio', 'rpg', 'q-learning', 'reinforcement-learning', 'npc', 'companion', 'online-learning'],
  aliases: 'buddy companion ally npc learns q learning online learning in game reinforcement learning state action reward epsilon greedy exploration senses state design action space skill points table saved learning while playing',
  timeToComplete: 70,
  coreConcept: 'The buddy is a Q-learning agent written in its own script, learning while you play (online). Its state is what it notices, named as words (\'slime near, hero far\'); its actions are moves it can do (follow, fight, guard, rest); its rewards are what it earns (+1 a hit, +3 a slime beaten, −1 hurt, −0.5 far from you). Every 0.25 s it updates the last decision\'s value, Q(s, a) ← Q(s, a) + α (r + γ max Q(s′, ·) − Q(s, a)), and picks the next move ε-greedily. Its table lives in state, so it is saved. Skill points buy senses (more states it can tell apart), moves (more actions) and focus (lower ε): design choices of any learning agent, made into a game.',
  prerequisites: ['mg12-003', 'mg9-004'],
  hook: {
    question: 'Chapter 9 trained agents before the game, in a dialog. What if the companion learned while you played, so the buddy you finish with depends on the fights you shared, and the points you spent on it?',
    realWorldContext: 'Most game AI is scripted, because learned behaviour is hard to test. But companions that adapt, creatures that learn (Black & White, Creatures) and opponents that study you are learning agents. The design questions here, what the agent sees, what it can do, what it is rewarded for, how much it explores, are the questions of every reinforcement learning system.',
  },
  intuition: {
    prose: [
      '**Depth: build it, and go deep.** The Try it task builds the buddy\'s scene and writes it from following to learning, then the Skills menu that spends your skill points on it. The notebook models its world small enough to watch it learn in a moment.',
      '**Out of the way: collision layers.** scenes/buddy.scene is a CharacterBody2D with a picture (tile 99) and a shape, put into both maps. If it collided with the hero they would shove each other in doorways, so it uses collision layers. Every body is on some layers and scans some layers (its mask); it only bumps into bodies on a layer it scans. Layers are bits of a number: layer n is 2 to the power n − 1, so layer 1 is 1, layer 2 is 2, layer 5 is 16, and being on layers 1 and 5 is 1 + 16 = 17. The walls are set to 17, the buddy to layer 2 with mask 16: it scans only layer 5, so walls stop it, but the hero and the slimes (layer 1 only) pass through it. Nothing scans layer 2, so nothing bumps into the buddy either.',
      '**An agent in a script.** Chapter 9\'s agents were trained by the editor before the game ran. The buddy learns while you play: its script holds the Q-learning itself. That is online learning, and it means the buddy you end with is shaped by the game you played.',
      '**State: what it notices.** see() names the situation in words from what its senses notice: with one sense, \'slime near\' or \'no slime\'; with two, also \'hero near\' or \'hero far\'; with three, also \'healthy\' or \'hurt\'. Each different name is a different state, and values(key) is that state\'s row in state.buddy.q, one number per move, starting at 0.',
      '**Actions: what it can do.** MOVES = [\'follow\', \'fight\', \'guard\', \'rest\']: walk to the hero; walk to the nearest slime and hit it; stand between the hero and the slime; stand still and heal. With 2 moves it has only follow and fight.',
      '**Rewards: what it earns.** A hit +1, a slime beaten +3, being hurt −1, knocked out −2, and −0.5 for each decision made far from the hero. The last is reward shaping: without it, the buddy that learned fighting is everything would chase slimes across the map and leave you. Rewards say what you want, and the agent finds a way to get it, so they must say all of it.',
      '**The update.** Every 0.25 s decide() does two things. First it learns from the last decision: Q(s, a) ← Q(s, a) + 0.2 (r + 0.9 max Q(s′, ·) − Q(s, a)), where s and a are the last situation and move, r what was earned since, and s′ the situation now. Then it chooses: usually the move with the biggest value, sometimes (with chance ε) a random one, to find out. Cell 1 runs this on a small model of the buddy\'s world: after 10 decisions fighting is already ahead near a slime, and it stays ahead.',
      '**Values add up.** Values climb to about 7, not 1 or 3, because γ = 0.9 makes each value the reward now plus 0.9 of what follows, plus 0.81 of what follows that, and so on: a buddy near a slime can expect many rewards to come. Comparing values, not their size, is what decides.',
      '**Skill points buy learning.** In the HUD\'s Skills menu (a hidden Panel Skills with three Buttons, opened by a new input action, skills, on K): **senses** (1 to 3) let it tell more situations apart. In cell 2 the second sense earns a little more, 556 against 536 in its last thousand decisions, because it can learn to follow when you are far. More states also means more to learn, so the gain comes later. **Moves** (2 to 4) give it more to choose from. **Focus** (0 to 3) halves ε each time: cell 3 earns most at focus 2. Less randomness helps, until it stops finding out about the moves it rarely tries.',
      '**Saved.** state.buddy holds the table, the senses, moves, focus and counts, so a saved game keeps what the buddy learned.',
      '**Watching it think: the debug panel.** A learning agent is hard to follow from outside, so the game shows its mind. The debug global, in the style of the Dear ImGui library, puts controls in the editor\'s Debug tab while the game runs. Ask for one every frame and it appears: debug.watch(\'buddy values\', …) in decide() shows its values for the situation it is in, live; debug.watch(\'buddy sees\', key) the situation. debug.slider(\'epsilon\', this.epsilon, 0, 1) would return the slider\'s value once you drag it: tune ε or a reward while you play, and see the buddy change. Outside the editor every call just returns your own value, so the game plays the same.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a learning agent in a game',
        body: 'Step 1. State: a few things it notices, named. Step 2. Actions: what it can do, in a list. Step 3. Rewards: what you want, all of it (including staying near). Step 4. Every decision: update the last value with the Q-learning formula, then choose ε-greedily. Step 5. Keep the table in state, and watch it with debug.watch.',
      },
      {
        type: 'warning',
        title: 'Rewards say exactly what you asked',
        body: 'Reward only hits, and it learns to hit, anywhere, alone. Every behaviour you want must be in the rewards, and every one you do not want must cost something.',
      },
      {
        type: 'insight',
        title: 'The same three choices everywhere',
        body: 'Senses (state design), moves (action design) and focus (exploration) are what you choose for any reinforcement learning agent, from a game buddy to a robot. Here they are skill points.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Watching it learn',
        caption: 'Q-learning exactly as buddy.js does it.',
        props: {
          lesson: {
            title: 'Watching it learn',
            subtitle: 'A small model of the buddy\'s world.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Q-learning on the buddy\'s world\nPredict first: follow or fight, near a slime.',
                startCode: '// A small model of the buddy\'s world, so learning can be watched quickly. Two situations: a slime near, or none.\n// Fighting a near slime: 60% a hit (+1), 20% the slime is beaten (+3, and then no slime), 20% the buddy is hurt (−1).\n// Following: nothing happens (0). With no slime, a slime turns up 30% of the time.\nfunction rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }\nconst random = rng(1)\nfunction step(s, a) {   // s: \'slime near\' or \'no slime\'; a: 0 follow, 1 fight. Returns [reward, next situation].\n  if (s === \'no slime\') return [0, random() < 0.3 ? \'slime near\' : \'no slime\']\n  if (a === 0) return [0, \'slime near\']\n  const roll = random()\n  return roll < 0.6 ? [1, \'slime near\'] : roll < 0.8 ? [3, \'no slime\'] : [-1, \'slime near\']\n}\n// Q-learning, as the buddy does it: ε-greedy choices, and Q(s, a) ← Q(s, a) + α (r + γ max Q(s′, ·) − Q(s, a)).\n// Predict first: after 2,000 decisions, which is worth more near a slime, follow or fight?\nconst alpha = 0.2, gamma = 0.9, epsilon = 0.3\nconst Q = { \'slime near\': [0, 0], \'no slime\': [0, 0] }\nlet s = \'no slime\'\nfor (let t = 1; t <= 2000; t++) {\n  const a = random() < epsilon ? Math.floor(random() * 2) : Q[s].indexOf(Math.max(...Q[s]))\n  const [r, next] = step(s, a)\n  Q[s][a] += alpha * (r + gamma * Math.max(...Q[next]) - Q[s][a])\n  s = next\n  if ([10, 100, 500, 2000].includes(t)) console.log(\'after\', String(t).padStart(4), \'decisions: slime near  follow\', Q[\'slime near\'][0].toFixed(2), \' fight\', Q[\'slime near\'][1].toFixed(2))\n}',
              },
              {
                type: 'js',
                instruction: '### 2. Senses\nPredict first: which earns more.',
                startCode: 'function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }\n// Senses: what it can tell apart. Now fighting is only good when the hero is near; when the hero is far, every decision\n// costs −0.5 (a buddy should stay a buddy), and following brings the hero near. With one sense the buddy cannot tell\n// near from far. Predict first: which buddy earns more over its last 1,000 decisions?\nfunction run(senses) {\n  const random = rng(5), Q = {}\n  let slime = false, far = false, earned = 0\n  for (let t = 1; t <= 6000; t++) {\n    const key = (slime ? \'slime near\' : \'no slime\') + (senses >= 2 ? (far ? \', hero far\' : \', hero near\') : \'\')\n    Q[key] ??= [0, 0]\n    const a = random() < 0.1 ? Math.floor(random() * 2) : Q[key].indexOf(Math.max(...Q[key]))\n    let r = far ? -0.5 : 0\n    if (a === 0) far = false                                      // following: back beside the hero\n    else if (slime) { const roll = random(); r += roll < 0.6 ? 1 : roll < 0.8 ? 3 : -1; if (roll >= 0.6 && roll < 0.8) slime = false; far = random() < 0.4 }\n    if (!slime && random() < 0.3) slime = true\n    const next = (slime ? \'slime near\' : \'no slime\') + (senses >= 2 ? (far ? \', hero far\' : \', hero near\') : \'\')\n    Q[next] ??= [0, 0]\n    Q[key][a] += 0.2 * (r + 0.9 * Math.max(...Q[next]) - Q[key][a])\n    if (t > 5000) earned += r\n  }\n  return [earned, Q]\n}\nfor (const senses of [1, 2]) {\n  const [earned, Q] = run(senses)\n  console.log(senses + \' sense\' + (senses > 1 ? \'s\' : \' \') + \': earned\', earned.toFixed(1), \'in its last 1,000 decisions;\', Object.keys(Q).length, \'situations\')\n}',
              },
              {
                type: 'js',
                instruction: '### 3. Focus\nPredict first: the best ε.',
                startCode: '// A small model of the buddy\'s world, so learning can be watched quickly. Two situations: a slime near, or none.\n// Fighting a near slime: 60% a hit (+1), 20% the slime is beaten (+3, and then no slime), 20% the buddy is hurt (−1).\n// Following: nothing happens (0). With no slime, a slime turns up 30% of the time.\nfunction rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }\nconst random = rng(1)\nfunction step(s, a) {   // s: \'slime near\' or \'no slime\'; a: 0 follow, 1 fight. Returns [reward, next situation].\n  if (s === \'no slime\') return [0, random() < 0.3 ? \'slime near\' : \'no slime\']\n  if (a === 0) return [0, \'slime near\']\n  const roll = random()\n  return roll < 0.6 ? [1, \'slime near\'] : roll < 0.8 ? [3, \'no slime\'] : [-1, \'slime near\']\n}\n// Focus: ε, how often it tries a random move. More focus, fewer random moves: it does what it knows more often, but\n// learns about the other moves more slowly. Predict first: which earns most over 3,000 decisions?\nfor (const focus of [0, 1, 2, 3]) {\n  const epsilon = 0.3 * Math.pow(0.5, focus)\n  const Q = { \'slime near\': [0, 0], \'no slime\': [0, 0] }\n  let s = \'no slime\', earned = 0\n  for (let t = 1; t <= 3000; t++) {\n    const a = random() < epsilon ? Math.floor(random() * 2) : Q[s].indexOf(Math.max(...Q[s]))\n    const [r, next] = step(s, a)\n    Q[s][a] += 0.2 * (r + 0.9 * Math.max(...Q[next]) - Q[s][a])\n    earned += r; s = next\n  }\n  console.log(\'focus\', focus, \' ε\', epsilon.toFixed(3), \' earned\', earned)\n}',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: one update\nThe check tries five.',
                startCode: '// Challenge: one Q-learning update. Given the value now (q), what was earned (r) and the best value of the next\n// situation (best), return the new value: q + α (r + γ best − q), with α 0.2 and γ 0.9.\nfunction update(q, r, best, alpha = 0.2, gamma = 0.9) {\n  return q   // your code\n}\nconst close = (a, b) => Math.abs(a - b) < 1e-9\nconst cases = [[0, 1, 0, 0.2], [0, 3, 0, 0.6], [1, 0, 2, 1.16], [2, -1, 0, 1.4], [5, 0, 5, 4.9]]\nconst bad = cases.find(([q, r, b, want]) => !close(update(q, r, b), want))\nconsole.log(bad ? \'update(\' + bad.slice(0, 3).join(\', \') + \') should be \' + bad[3] + \', not \' + update(bad[0], bad[1], bad[2]) + \'.\' : \'✓ Each update moves the value a fifth of the way to r + 0.9 × the best next value.\')',
                solutionCode: '// Challenge: one Q-learning update. Given the value now (q), what was earned (r) and the best value of the next\n// situation (best), return the new value: q + α (r + γ best − q), with α 0.2 and γ 0.9.\nfunction update(q, r, best, alpha = 0.2, gamma = 0.9) {\n  return q + alpha * (r + gamma * best - q)\n}\nconst close = (a, b) => Math.abs(a - b) < 1e-9\nconst cases = [[0, 1, 0, 0.2], [0, 3, 0, 0.6], [1, 0, 2, 1.16], [2, -1, 0, 1.4], [5, 0, 5, 4.9]]\nconst bad = cases.find(([q, r, b, want]) => !close(update(q, r, b), want))\nconsole.log(bad ? \'update(\' + bad.slice(0, 3).join(\', \') + \') should be \' + bad[3] + \', not \' + update(bad[0], bad[1], bad[2]) + \'.\' : \'✓ Each update moves the value a fifth of the way to r + 0.9 × the best next value.\')',
              },
              {
                type: 'markdown',
                instruction: '### 5. The code you wrote, line by line\n\nIn the order of the task\'s four steps.\n\n**The buddy\'s scene**\n\n```js\nconst buddy = project.createScene(\'scenes/buddy.scene\', \'CharacterBody2D\', \'Buddy\')\nbuddy.root.script = \'scripts/buddy.js\'\nbuddy.root.collisionLayer = 2\nbuddy.root.collisionMask = 16\nfor (const map of [\'scenes/town.scene\', \'scenes/forest.scene\']) project.scene(map).get(\'Walls\').collisionLayer = 17\n```\n\nA body, like the hero. Then collision layers (the lesson\'s "Out of the way"): the buddy is on layer 2 (`collisionLayer = 2`, the bit for layer 2) and scans only layer 5 (`collisionMask = 16`, the bit for layer 5). Both maps\' walls go on layers 1 and 5 (1 + 16 = 17): the hero, which scans layer 1, still stops at them, and so does the buddy. Nothing else is on layer 5, and nothing scans layer 2, so the buddy never shoves or is shoved.\n\n```js\nbuddy.add(\'Sprite2D\', { name: \'Sprite\', texture: \'assets/tiny-dungeon/tiles/tile_0099.png\' })\nbuddy.add(\'CollisionShape2D\', { name: \'Shape\', size: { x: 10, y: 10 } })\nfor (const map of [\'scenes/town.scene\', \'scenes/forest.scene\']) project.scene(map).instance(\'scenes/buddy.scene\', { name: \'Buddy\', zIndex: 2 })\n```\n\nA picture (tile 99) and a shape, and one in each map. No position: its `ready()` puts it beside the hero.\n\n**scripts/buddy.js**, first version: it follows\n\n```js\n// The buddy: for now it follows the hero, stopping a little way off.\nexport default class Buddy extends CharacterBody2D {\n  speed = 64;\n  physicsUpdate(dt) {\n    const hero = scene.find(\'Player\');\n    if (!hero || scene.get(\'HUD\').busy) { this.velocity = { x: 0, y: 0 }; return; }\n```\n\nAs the slime begins: find the hero, wait while a menu is open.\n\n```js\n    const gap = hero.position.sub(this.position);\n    this.velocity = gap.length() > 24 ? gap.normalized().scale(this.speed) : { x: 0, y: 0 };\n    this.moveAndSlide();\n```\n\nThe arrow to the hero; if it is longer than 24 pixels, walk along it at 64 pixels a second, otherwise stand. The 24 keeps it a step away instead of on top of you.\n\n**scripts/buddy.js**, second version: it sees and chooses\n\n```js\nexport const MOVES = [\'follow\', \'fight\', \'guard\', \'rest\'];\nexport const ALPHA = 0.2, GAMMA = 0.9;\n```\n\nIts moves (actions, in Q-learning words) by number: 0 follow, 1 fight, 2 guard, 3 rest. α and γ for step 3.\n\n```js\n  hp = 6;\n  maxHp = 6;\n  cooldown = 0;     // seconds until it can hit again\n  safe = 0;         // seconds it cannot be hurt again\n  down = 0;         // seconds it is knocked out\n  think = 0;        // seconds until it decides again\n  last = null;      // its last decision: { key, action }, to learn from\n  earned = 0;       // reward since that decision\n```\n\nIts own hit points (not in `state`: a buddy is healed when the map is rebuilt), timers like the hero\'s, and two fields for learning: what it last decided and the reward that has come in since.\n\n```js\n  ready() {\n    state.buddy ??= { q: {}, senses: 1, moves: 2, focus: 0, decisions: 0, beaten: 0 };\n    const hero = scene.find(\'Player\');\n    if (hero) this.position = hero.position.add({ x: -16, y: 0 });\n```\n\nIts mind lives in `state`, so it lasts across maps and saves: the Q-table `q` (empty), its skills (one sense, two moves, no focus), and two counters. `??=` makes it only the first time. Then it stands a tile to the hero\'s left.\n\n```js\n  get mind() { return state.buddy; }\n  get epsilon() { return 0.3 * Math.pow(0.5, this.mind.focus); }\n```\n\nTwo getters: `this.mind` is shorter than `state.buddy`, and ε, how often it tries a random move: 0.3, halved for each point of focus (0.3, 0.15, 0.075, 0.0375).\n\n```js\n  nearestSlime() {\n    let best = null;\n    for (const s of scene.getNodesInGroup(\'enemies\')) if (!best || this.position.distanceTo(s.position) < this.position.distanceTo(best.position)) best = s;\n    return best;\n```\n\nThe closest enemy, or null: keep the best so far, and replace it with any that is nearer.\n\n```js\n  see() {\n    const slime = this.nearestSlime(), hero = scene.find(\'Player\');\n    const seen = [slime && this.position.distanceTo(slime.position) < 70 ? \'slime near\' : \'no slime\'];\n    if (this.mind.senses >= 2) seen.push(hero && this.position.distanceTo(hero.position) > 60 ? \'hero far\' : \'hero near\');\n    if (this.mind.senses >= 3) seen.push(this.hp <= 2 ? \'hurt\' : \'healthy\');\n    return seen.join(\', \');\n```\n\nIts state, as words: one word for each sense it has, joined with commas, like \'slime near, hero far\'. Each different text is a different state with its own row of values.\n\n```js\n  values(key) {\n    const row = this.mind.q[key] ?? (this.mind.q[key] = []);\n    while (row.length < this.mind.moves) row.push(0);\n    return row;\n```\n\nQ(s, ·): that state\'s row in the table, made empty the first time it is seen, and grown with zeros to as many moves as it has (a new move starts at 0).\n\n```js\n  decide() {\n    const hero = scene.find(\'Player\');\n    if (hero && this.position.distanceTo(hero.position) > 80) this.earned -= 0.5;   // a buddy should stay a buddy\n    const key = this.see(), now = this.values(key);\n```\n\nDeciding: first a penalty for being far from you, then what it sees now and the values of its moves there.\n\n```js\n    const action = Math.random() < this.epsilon ? Math.floor(Math.random() * this.mind.moves) : now.indexOf(Math.max(...now));\n```\n\nε-greedy: with chance ε, a random move (a number from 0 to moves less one); otherwise the move with the highest value. `Math.max(...now)` is the largest value (`...` spreads the list into separate numbers), and `indexOf` finds which move that is.\n\n```js\n    this.last = { key, action };\n    this.earned = 0;\n    this.mind.decisions++;\n    debug.watch(\'buddy sees\', key);\n    debug.watch(\'buddy values\', now.map((v, i) => MOVES[i] + \' \' + v.toFixed(2)).join(\', \'));\n    debug.watch(\'buddy ε\', this.epsilon);\n```\n\nRemember the decision, start counting its reward from 0, and count it. `debug.watch(name, value)` shows a value in the Debug tab while the game runs: what it sees, its values with two decimals (`toFixed(2)`), and ε.\n\n```js\n    this.cooldown -= dt; this.safe -= dt;\n    if (this.down > 0) {   // knocked out: it gets up after 4 s, healed\n      this.down -= dt;\n      if (this.down <= 0) { this.hp = this.maxHp; this.get(\'Sprite\').opacity = 1; }\n      return;\n```\n\nIn `physicsUpdate`, after the busy check: timers, and while knocked out, only wait; when the time is up, heal and look solid again.\n\n```js\n    this.think -= dt;\n    if (this.think <= 0) { this.think = 0.25; this.decide(); }\n    const move = MOVES[this.last.action], slime = this.nearestSlime();\n```\n\nIt decides four times a second, not every frame, so each move lasts long enough to earn something. Then it does the last decision.\n\n```js\n    if (move === \'rest\') { this.velocity = { x: 0, y: 0 }; this.hp = Math.min(this.maxHp, this.hp + dt); return; }\n    let target = hero.position, stop = 24;\n    if (move === \'fight\' && slime) { target = slime.position; stop = 10; }\n    if (move === \'guard\' && slime) { target = hero.position.lerp(slime.position, 0.5); stop = 4; }\n```\n\nRest: stand and heal one hit point a second. Otherwise pick where to go: the hero (follow), the slime (fight), or halfway between them (guard: `lerp(other, 0.5)` is the point half the way from one to the other).\n\n```js\n    const gap = target.sub(this.position);\n    this.velocity = gap.length() > stop ? gap.normalized().scale(this.speed) : { x: 0, y: 0 };\n    this.moveAndSlide();\n```\n\nThe same walking as the first version, to whichever target.\n\n```js\n    if (move === \'fight\' && slime && this.position.distanceTo(slime.position) < 16 && this.cooldown <= 0) {\n      this.cooldown = 0.6;\n      slime.hurt(2, this.position);\n      this.earned += 1;\n      if (slime.hp <= 0) { this.earned += 3; this.mind.beaten++; }\n```\n\nFighting and close enough, with its cooldown over: hit for 2, and earn +1, or +4 in all if that beat it.\n\n```js\n  hurt(amount, from) {\n    if (this.safe > 0 || this.down > 0) return;\n    this.safe = 0.8;\n    this.hp -= amount;\n    this.earned -= 1;\n    const sprite = this.get(\'Sprite\');\n    sprite.modulate = \'#ff4040\';\n    tween.to(sprite, { modulate: \'#ffffff\' }, 0.4);\n    if (from) { this.velocity = this.position.sub(from).normalized().scale(120); this.moveAndSlide(); }\n    if (this.hp <= 0) { this.down = 4; this.earned -= 2; sprite.opacity = 0.35; }\n```\n\nCalled by slimes (lesson 12.3\'s two buddy lines). Like the hero\'s, plus −1 reward; knocked out at 0 for 4 seconds, faded (`opacity` 0.35), and −2 more.\n\n**scripts/buddy.js**, third version: it learns\n\n```js\n// The buddy: a friend who fights beside you and learns how while you play, by Q-learning (chapter 9) in this script.\n    if (this.last) {\n      const row = this.values(this.last.key), q = row[this.last.action];\n      row[this.last.action] = q + ALPHA * (this.earned + GAMMA * Math.max(...now) - q);\n```\n\nIn `decide()`, before choosing: if there was a last decision, move its value towards what it turned out to be worth: the reward earned since (r) plus γ times the best value in the state it is in now (max Q(s′, ·)). The gap between that and the old value, times α = 0.2, is added. Cell 1 runs this same line; the math section takes it apart symbol by symbol.\n\n**The skills menu**\n\n```js\nproject.addAction(\'skills\', [\'KeyK\'])\nconst hud = project.scene(\'scenes/hud.scene\')\nhud.add(\'Panel\', { name: \'Skills\', position: { x: 300, y: 120 }, size: { x: 360, y: 260 }, visible: false })\nhud.add(\'Label\', { name: \'Title\', parent: \'Skills\', position: { x: 20, y: 14 }, fontSize: 22, text: \'Your buddy (K to close)\' })\nhud.add(\'Label\', { name: \'Points\', parent: \'Skills\', position: { x: 20, y: 50 }, fontSize: 16, color: \'#c5f6fa\', text: \'Skill points: 0\' })\nhud.add(\'VBoxContainer\', { name: \'List\', parent: \'Skills\', position: { x: 20, y: 84 }, separation: 10 })\nfor (const name of [\'Senses\', \'Moves\', \'Focus\']) hud.add(\'Button\', { name, parent: \'Skills/List\', text: name, size: { x: 320, y: 40 }, fontSize: 16 })\n```\n\nK, a hidden panel, a title, a label for points, and three buttons in a list.\n\n```js\n  get busy() { return this.lines.length > 0 || this.get(\'Pause\').visible || this.get(\'Bag\').visible || this.get(\'Skills\').visible; }\n    this.get(\'Skills\').visible = false;\n    for (const [name, field, max] of [[\'Senses\', \'senses\', 3], [\'Moves\', \'moves\', 4], [\'Focus\', \'focus\', 3]]) this.get(\'Skills/List/\' + name).connect(\'pressed\', () => this.spend(field, max));\n```\n\nThe HUD is busy while it is open too. In `ready()`: hidden, and each button wired to `spend` with its skill\'s field and top level; the list of `[button, field, top]` rows saves writing three connects.\n\n```js\n    if (input.isJustPressed(\'inventory\') && !this.get(\'Pause\').visible && !this.get(\'Skills\').visible) this.toggleBag();\n    if (input.isJustPressed(\'skills\') && !this.get(\'Pause\').visible && !this.get(\'Bag\').visible) this.toggleSkills();\n    if (this.get(\'Skills\').visible) this.showSkills();\n```\n\nIn `update()`: I and K each open their panel only if the others are closed, and while the skills panel is open its text is kept up to date.\n\n```js\n  toggleSkills() {\n    const panel = this.get(\'Skills\');\n    panel.visible = !panel.visible;\n    if (panel.visible) this.get(\'Skills/List/Senses\').grabFocus();\n```\n\n```js\n  showSkills() {\n    const b = state.buddy;\n    if (!b) return;\n    this.get(\'Skills/Points\').text = \'Skill points: \' + state.skillPoints;\n    for (const [name, field, max] of [[\'Senses\', \'senses\', 3], [\'Moves\', \'moves\', 4], [\'Focus\', \'focus\', 3]]) {\n      const button = this.get(\'Skills/List/\' + name);\n      button.text = name + \': \' + b[field] + \' of \' + max;\n      button.disabled = state.skillPoints <= 0 || b[field] >= max;\n```\n\nEach button says where that skill is ("Moves: 2 of 4") and is disabled with no points or at the top. `b[field]` reads the key named by `field`.\n\n```js\n  spend(field, max) {\n    const b = state.buddy;\n    if (!b || state.skillPoints <= 0 || b[field] >= max) return;\n    state.skillPoints -= 1;\n    b[field] += 1;\n    this.say(\'Your buddy\\u2019s \' + field + \' is now \' + b[field] + \'.\');\n    scene.get(\'HUD/Sounds/LevelUp\').play();\n```\n\nSpend one point on one skill, checked again in case (a disabled button cannot be pressed, but `spend` does not rely on that), with a message and the level-up sound.',
              },
              {
                type: 'markdown',
                instruction: '### 6. Questions you might have\n\n**Why are its values kept in `state` and not on the buddy?** The buddy is rebuilt on every map; what it has learned must last, and be saved with your game.\n\n**Why does it decide only four times a second?** A move needs time to earn anything: one frame of "fight" never reaches a slime. A quarter of a second is a step\'s worth.\n\n**Why does the reward come from `earned`, added up between decisions?** Rewards happen at any frame (a hit, being hurt). Adding them up until the next decision gives each decision what followed it.\n\n**Why does a new move start at value 0?** It has never been tried. Zero is neutral here because rewards are both positive and negative; ε makes sure it gets tried.\n\n**Is this the same Q-learning as chapter 9?** The same update. Chapter 9 trained before the game ran; this buddy learns while you play, from one life, so it learns more slowly and shows its mistakes.\n\n**Why is the reward for being far −0.5 per decision?** Without it, chasing every slime pays and it wanders off (example 2). It is a design choice: the rewards say what you want, and the buddy finds how.',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'A buddy that learns',
        props: {
          task: 'qa-buddy',
          lesson: 'mg12-004',
          checkpoint: 'cp-mg12-004-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**The update, decoded.** $Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,[\\,r + \\gamma \\max_{a\'} Q(s\', a\') - Q(s,a)\\,]$. Read it as: "the value of doing $a$ in $s$ moves a fraction $\\alpha$ of the way towards what it just earned, $r$, plus $\\gamma$ times the best value it can expect from where it ended up, $s\'$". The bracket is the surprise: how much better or worse it went than the value said. In buddy.js: row[this.last.action] is $Q(s,a)$, this.earned is $r$, Math.max(...now) is $\\max_{a\'} Q(s\', a\')$, ALPHA is $\\alpha$ and GAMMA is $\\gamma$.',
      '**Why values add up.** If every step earned 1 forever, the value would be $1 + \\gamma + \\gamma^2 + \\dots = \\frac{1}{1-\\gamma} = 10$ for $\\gamma = 0.9$: read "what comes later counts, a little less each step". That is why cell 1\'s values reach about 7.',
      '**ε, decoded.** $\\varepsilon = 0.3 \\cdot 0.5^{\\text{focus}}$: "a 30% chance of a random move, halved for each point of focus". With 2 moves, a random move is the best one half the time, so the buddy does something other than its best about $\\varepsilon/2$ of the time.',
    ],
    equations: [
      {
        label: 'The Q-learning update',
        latex: 'Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,[\\,r + \\gamma \\max_{a\'} Q(s\',a\') - Q(s,a)\\,]',
      },
      {
        label: 'Rewards that never stop, added up',
        latex: '1 + \\gamma + \\gamma^2 + \\dots = \\frac{1}{1-\\gamma}',
      },
      {
        label: 'Exploration with focus',
        latex: '\\varepsilon = 0.3\\cdot 0.5^{\\text{focus}}',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'The buddy\'s world is not a fixed puzzle: the hero moves, slimes come and go, and its own table changes what it does. Q-learning still works well here because the situations it can see repeat often. With too many senses, situations repeat rarely and learning slows: the reason later chapters replace the table with a function (chapter 9\'s linear Q).',
      'Online learning has a cost tabular training does not: it learns from real play, so it makes its mistakes in front of the player. Starting it from a table trained beforehand (Run › Train an agent…, or the next lesson\'s teaching) cuts that short.',
      'Where it goes: 12.5 teaches the buddy by showing it; 12.6 matches the slimes to how well you fight.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg12-004-ex1',
      title: 'One update by hand',
      difficulty: 'easy',
      problem: 'Q(slime near, fight) is 1. It hits (+1) and the best value now is 2. The new value?',
      steps: [
        {
          expression: '1 + 0.2\\,(1 + 0.9\\cdot 2 - 1)',
          annotation: 'The surprise is 1.8.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '1.36.',
    },
    {
      id: 'mg12-004-ex2',
      title: 'A missing reward',
      difficulty: 'medium',
      problem: 'Without the −0.5 for being far, what does the buddy learn?',
      steps: [
        {
          expression: '\\text{fight anywhere}',
          annotation: 'Nothing says to stay.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'To chase every slime it sees, wherever you are: it never pays to come back.',
    },
    {
      id: 'mg12-004-ex3',
      title: 'Too many senses',
      difficulty: 'hard',
      problem: 'Add a sense for each of 10 distances to the slime and 10 to the hero. How many states, and what happens to learning?',
      steps: [
        {
          expression: '10 \\times 10 = 100',
          annotation: 'Each combination is a state.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '100 states (×2 for hurt): each is visited rarely, so it learns slowly; that is when a table gives way to features (chapter 9).',
    },
  ],
  challenges: [
    {
      id: 'mg12-004-ch1',
      title: 'A braver buddy',
      difficulty: 'easy',
      problem: 'Make it care less about being hurt.',
      hint: 'A reward.',
      answer: 'Being hurt −0.5 instead of −1; watch fight values rise.',
      walkthrough: [],
    },
    {
      id: 'mg12-004-ch2',
      title: 'A new move',
      difficulty: 'medium',
      problem: 'Add a fifth move, flee: walk away from the nearest slime.',
      hint: 'MOVES, the max, and physicsUpdate.',
      answer: 'Add \'flee\' to MOVES, let moves go to 5, and in physicsUpdate move away from the slime for it; the table grows a column on its own.',
      walkthrough: [],
    },
    {
      id: 'mg12-004-ch3',
      title: 'Start trained',
      difficulty: 'hard',
      problem: 'Give a new game\'s buddy a table learned earlier.',
      hint: 'state.buddy.q is plain data.',
      answer: 'Copy a learned state.buddy.q (from a saved game, or the debug panel) into newGame, or load it from a brain file: it starts where that one left off.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'see()',
        meaning: 'The situation as words: the state.',
      },
      {
        symbol: 'MOVES',
        meaning: 'What it can do: the actions.',
      },
      {
        symbol: 'earned',
        meaning: 'Reward since its last decision.',
      },
      {
        symbol: 'Q(s, a)',
        meaning: 'How good a move is in a situation, counting what follows.',
      },
      {
        symbol: 'ε',
        meaning: 'The chance of a random move: exploring.',
      },
      {
        symbol: 'state.buddy',
        meaning: 'Its table and skills, saved with the game.',
      },
    ],
    rulesOfThumb: [
      'Rewards must say everything you want.',
      'Few, telling senses learn fastest.',
      'Some randomness, not too much.',
      'Keep what it learned in state.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'More senses always make a better buddy.',
      whyStudentsThinkIt: 'It knows more.',
      correctionExample: 'More states take longer to learn; cell 2\'s gain is small.',
      contrastCase: 'A sense that changes what is best (hero far) is worth it.',
    },
    {
      falseBelief: 'ε = 0 is best once it has learned.',
      whyStudentsThinkIt: 'Random moves are mistakes.',
      correctionExample: 'Cell 3: focus 3 earns a little less than focus 2; and the world changes.',
      contrastCase: 'In a fixed world, after enough learning, small ε is best.',
    },
  ],
  transferPrompts: [
    {
      situation: 'An enemy that learns your habits.',
      competingTechniques: [
        'A script with fixed patterns',
        'A Q-learning enemy, rewarded for hurting you',
      ],
      whyThisTechniqueWins: 'It adapts to how you play; but test it, since what it learns is not written down.',
    },
    {
      situation: 'Directing an AI agent to build a learning NPC.',
      competingTechniques: [
        '"Make it smart"',
        '"State: these words; actions: these moves; rewards: these numbers; ε and α these"',
      ],
      whyThisTechniqueWins: 'The three design choices are the whole specification.',
    },
  ],
  debugging: [
    {
      commonError: 'All values stay 0.',
      symptom: 'The Debug tab shows 0.00 everywhere.',
      whyItHappened: 'Nothing is ever earned (rewards never added), or the update is missing.',
      repairStrategy: 'Check earned changes on hits; check the update runs in decide().',
    },
    {
      commonError: 'It learns, then forgets on a new map.',
      symptom: 'Values reset after a door.',
      whyItHappened: 'The table was kept on the node.',
      repairStrategy: 'Keep it in state.buddy.',
    },
    {
      commonError: 'It wanders off.',
      symptom: 'It chases slimes across the map.',
      whyItHappened: 'Nothing rewards staying near.',
      repairStrategy: 'A small cost for each decision far from the hero.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write a learning NPC with states, moves and rewards.',
    explainVerbally: 'Explain the update, γ and ε in the buddy.',
    detectIncorrectApplication: 'Spot missing rewards, unsaved tables and too many senses.',
    transferToUnfamiliar: 'Design a learning enemy for another game.',
  },
  assessment: {
    questions: [
      {
        id: 'mg12-004-assess-1',
        type: 'choice',
        text: 'Why does the buddy lose 0.5 for decisions far from the hero?',
        options: ['So it learns to stay near', 'To make values smaller', 'It is a bug', 'To make it explore'],
        answer: 'So it learns to stay near',
        hint: 'Rewards.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg12-004-quiz-1',
      type: 'choice',
      text: 'In cell 1, after 2,000 decisions near a slime',
      options: [
        'fight 7.00 is above follow 6.68',
        'follow is above fight',
        'both are 0',
        'fight is 1',
      ],
      answer: 'fight 7.00 is above follow 6.68',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg12-004-quiz-2',
      type: 'choice',
      text: 'In cell 2, two senses earned',
      options: [
        '556, a little more than one sense\'s 536',
        'less',
        'twice as much',
        'the same',
      ],
      answer: '556, a little more than one sense\'s 536',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg12-004-quiz-3',
      type: 'choice',
      text: 'In cell 3, the most was earned at',
      options: ['focus 2', 'focus 0', 'focus 3', 'focus 1'],
      answer: 'focus 2',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg12-004-quiz-4',
      type: 'choice',
      text: 'Values reach about 7 because',
      options: [
        'γ adds up the rewards that follow',
        'α is 0.2',
        'Rewards are 7',
        'ε is 0.3',
      ],
      answer: 'γ adds up the rewards that follow',
      hints: ['Values add up.'],
      reviewSection: 'Intuition — values add up',
    },
    {
      id: 'mg12-004-quiz-5',
      type: 'choice',
      text: 'What the buddy learned is kept in',
      options: ['state.buddy', 'the buddy node', 'the scene file', 'the brain folder'],
      answer: 'state.buddy',
      hints: ['Saved and watched.'],
      reviewSection: 'Intuition — saved',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg12-004-1',
      label: 'Read state, actions and rewards in the buddy',
      type: 'read',
    },
    {
      id: 'cp-mg12-004-2',
      label: 'Read the update and skill points',
      type: 'read',
    },
    {
      id: 'cp-mg12-004-3',
      label: 'Run the notebook: watching it learn',
      type: 'read',
    },
    {
      id: 'cp-mg12-004-4',
      label: 'Complete "A buddy that learns" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg12-004-5',
      label: 'Work through "One update by hand"',
      type: 'example',
    },
    {
      id: 'cp-mg12-004-6',
      label: 'Pass the update challenge',
      type: 'challenge',
    },
  ],
}
