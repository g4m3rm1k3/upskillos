export default {
  chapter: 'making-games-12',
  order: 3,
  id: 'mg12-003',
  nextLesson: 'mg12-004',
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
      '**Depth: build it, and go deep.** The Try it task builds the slimes and their script, the hero\'s attack, the slimes\' chase, and a spawner that brings them back.',
      '**A slime is a scene.** scenes/slime.scene is a CharacterBody2D in the group enemies, with a picture (tile 108), a shape, and a Particles2D Puff for when it is hit. A group is a label any node can carry; scene.getNodesInGroup(\'enemies\') finds every node with it, so the hero\'s attack hits anything in the group without knowing what it is. The forest gets a Node2D Enemies holding three instances, and the HUD two sounds, Hit and Pickup. The hero gets an input action attack (J or X), a Particles2D Swing, and Swing and Hurt sounds.',
      '**Damage is arithmetic.** A hit does state.attack plus the weapon\'s bonus. A slime has 4 hit points, so hits to beat it are 4 over the damage, rounded up. A cooldown of 0.4 s between swings makes damage per second the damage over 0.4 (cell 1). A Sword (+3) more than doubles a Ranger\'s damage (+150%) but adds only 75% to a Mage\'s: a flat bonus matters most to the weak.',
      '**Where a hit lands.** The hero remembers the way it last walked, facing. A swing hits every enemy within 16 pixels of a point 14 pixels ahead (cell 3): in front and a little to each side, never behind. Measuring from the hero instead would hit things behind it too.',
      '**Feedback: game feel.** A hit that only changes a number feels like nothing. So hurt() does four more things: sets the sprite\'s modulate to red and tweens it back to white over a quarter of a second (the flash); sets a velocity away from the attacker and lets moveAndSlide carry it for 0.15 s (knockback); bursts its Puff particles; plays a sound. The hero gets the same when hurt, so slimes cannot stick to it.',
      '**Being hurt.** A slime within 12 pixels hurts the hero 1 point. Without a pause, three slimes touching every frame would take 180 a second (cell 2). So after a hit the hero is safe for 0.8 s (often called invulnerability frames): a Mage\'s 8 hit points last at least 6.4 s even in a crowd. At 0 the hero is beaten: it wakes at the campfire, healed, with half its gold.',
      '**Enemies that find their way.** A slime that walks straight at the hero gets stuck on walls. scene.get(\'Walls\').findPath(from, to) returns the cell centres of the shortest way round the solid tiles (A*, the cousin of the breadth-first search in Maze Chase, which looks towards the goal first). The slime walks to the first point, drops it when it arrives, and finds the way again twice a second, because pathfinding costs more than moving and the hero keeps moving. It chases only within 90 pixels: further away it waits.',
      '**The reward.** A beaten slime calls the hero\'s gainXp(4), rolls the loot table and frees itself. Slimes come back each time the forest is built: they are not in state.taken.',
      '**They come back while you are there.** A Node2D Spawner in the forest has three Node2D spots under it. Every 6 seconds its script counts the children of Enemies; with fewer than 3 it makes a slime with scene.instantiate(\'scenes/slime.scene\'), the same scene the forest uses, stands it on a spot more than 80 pixels from the hero (no slime appears on top of you), and adds it to Enemies. Making a node from a scene while the game runs is how every game spawns things: bullets, pickups, enemies.',
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
              {
                type: 'markdown',
                instruction: '### 5. The code you wrote, line by line\n\nIn the order of the task\'s four steps.\n\n**Slimes that can be hurt**\n\n```js\nproject.writeSound(\'assets/sounds/hit.wav\', { wave: \'square\', from: 300, to: 120, length: 0.12, attack: 0.002, volume: 0.3 })\nproject.writeSound(\'assets/sounds/pickup.wav\', { wave: \'triangle\', from: 440, to: 880, length: 0.2, volume: 0.5 })\nconst hud = project.scene(\'scenes/hud.scene\')\nhud.add(\'AudioStreamPlayer\', { name: \'Hit\', parent: \'Sounds\', stream: \'assets/sounds/hit.wav\' })\nhud.add(\'AudioStreamPlayer\', { name: \'Pickup\', parent: \'Sounds\', stream: \'assets/sounds/pickup.wav\' })\n```\n\nTwo sounds in the HUD: a short falling square for a hit (down feels bad), a rising triangle for finding something (up feels good).\n\n```js\nconst slime = project.createScene(\'scenes/slime.scene\', \'CharacterBody2D\', \'Slime\')\nslime.root.script = \'scripts/slime.js\'\nslime.root.groups = [\'enemies\']\n```\n\nThe slime\'s own scene, so the forest can hold many and the spawner can make more. `groups` puts it in a group called enemies: a label that `scene.getNodesInGroup(\'enemies\')` finds, so the hero\'s attack hits anything in the group without knowing what it is.\n\n```js\nslime.add(\'Sprite2D\', { name: \'Sprite\', texture: \'assets/tiny-dungeon/tiles/tile_0108.png\' })\nslime.add(\'CollisionShape2D\', { name: \'Shape\', size: { x: 10, y: 9 } })\nslime.add(\'Particles2D\', { name: \'Puff\', amount: 8, speed: 50, lifetime: 0.35, gravity: 120, size: 2, color: \'#69db7c\' })\n```\n\nA picture, a shape, and a Particles2D: an emitter of small squares. `burst(n)` throws out n of them at once, each flying off at about `speed` pixels a second, pulled down by `gravity`, gone after `lifetime` seconds. Green specks when it is hit.\n\n```js\nconst forest = project.scene(\'scenes/forest.scene\')\nforest.add(\'Node2D\', { name: \'Enemies\', zIndex: 1 })\nfor (const [x, y] of [[200, 60], [240, 120], [120, 100]]) forest.instance(\'scenes/slime.scene\', { name: \'Slime\', parent: \'Enemies\', position: { x, y } })\n```\n\nA Node2D to hold the enemies (the spawner counts its children), and three slimes in it. `{ x, y }` is short for `{ x: x, y: y }`.\n\n**scripts/slime.js**\n\n```js\nimport { rollLoot } from \'./loot.js\';\nexport default class Slime extends CharacterBody2D {\n  hp = 4;\n  speed = 30;\n  sight = 90;      // how near the hero must be for it to chase\n  route = [];      // the way round the walls, from findPath\n  think = 0;       // seconds until it finds its way again\n  stunned = 0;     // seconds of knockback, when it does not move by itself\n```\n\nIts fields: 4 hit points, and the numbers step 3\'s chasing uses.\n\n```js\n  hurt(damage, from) {\n    this.hp -= damage;\n    const sprite = this.get(\'Sprite\');\n    sprite.modulate = \'#ff6060\';\n    tween.to(sprite, { modulate: \'#ffffff\' }, 0.25);\n```\n\nHit: lose hit points and flash. `modulate` multiplies the picture\'s colours: white leaves it as it is, red tints it red. `tween.to(node, values, seconds)` moves those values smoothly from what they are now to these over the time, so the red fades back to white in a quarter of a second.\n\n```js\n    this.velocity = this.position.sub(from).normalized().scale(160);   // knocked back, away from the hit\n    this.stunned = 0.15;\n    this.get(\'Puff\').burst(8);\n    scene.get(\'HUD/Sounds/Hit\').play();\n    if (this.hp <= 0) this.die();\n```\n\nKnockback: `this.position.sub(from)` is the arrow from the attacker to the slime; `normalized()` makes it length 1 (a direction only); `scale(160)` makes it a speed. For 0.15 seconds the slime moves that way instead of by itself. Then specks, the sound, and at 0 hit points, `die()`.\n\n```js\n  die() {\n    scene.find(\'Player\')?.gainXp(4);\n    const item = rollLoot();\n    const hud = scene.get(\'HUD\');\n    if (item?.kind === \'gold\') { state.gold += item.amount; hud.say(\'+\' + item.amount + \' gold\'); }\n    else if (item) { state.bag.push(item); hud.say(\'Found: \' + item.name); scene.get(\'HUD/Sounds/Pickup\').play(); }\n    this.queueFree();\n```\n\nExperience for the hero (`?.` calls it only if there is a hero), a roll on the loot table, gold straight into `state` or an item into the bag, and gone. `item?.kind` is undefined when `item` is null, instead of an error.\n\n**The hero\'s attack**\n\n```js\nproject.addAction(\'attack\', [\'KeyJ\', \'KeyX\'])\nproject.writeSound(\'assets/sounds/swing.wav\', { wave: \'noise\', from: 3000, to: 1200, length: 0.12, attack: 0.005, volume: 0.2, seed: 3 })\nproject.writeSound(\'assets/sounds/hurt.wav\', { wave: \'noise\', from: 900, to: 150, length: 0.2, attack: 0.002, volume: 0.4, seed: 5 })\nconst hud = project.scene(\'scenes/hud.scene\')\nhud.add(\'AudioStreamPlayer\', { name: \'Swing\', parent: \'Sounds\', stream: \'assets/sounds/swing.wav\' })\nhud.add(\'AudioStreamPlayer\', { name: \'Hurt\', parent: \'Sounds\', stream: \'assets/sounds/hurt.wav\' })\nproject.scene(\'scenes/player.scene\').add(\'Particles2D\', { name: \'Swing\', amount: 6, speed: 40, lifetime: 0.2, size: 2, color: \'#ffffff\', spread: 1.2 })\n```\n\nAn attack action on J or X; a high quick swish and a lower crunch for being hurt; and white particles on the hero for the swing.\n\n**scripts/player.js**\n\n```js\n  near = null;                // someone close enough to talk to (they set this when you walk up)\n  facing = new Vec2(1, 0);    // the way it last walked: where its attack goes\n  cooldown = 0;               // seconds until it can attack again\n  safe = 0;                   // seconds it cannot be hurt again (after a hit)\n  stunned = 0;                // seconds of knockback, when the keys do not move it\n```\n\n`near` as before, lined up with four new fields. `new Vec2(1, 0)` is a vector pointing right: the way the hero faces before it has walked.\n\n```js\n    this.stunned -= dt;\n    if (this.stunned > 0) { this.moveAndSlide(); return; }   // knocked back: the hit decides where it goes\n    const move = input.vector(\'move_left\', \'move_right\', \'move_up\', \'move_down\');\n    if (move.length() > 0) this.facing = move;\n    this.velocity = move.scale(state.speed);   // the class\'s speed, kept in state\n```\n\nIn `physicsUpdate`, after the busy check. Each field that counts down loses `dt` every frame. While stunned, keep the knockback velocity. Otherwise read the keys into `move`; if a key is held (`length() > 0`), that is now the way it faces, so it keeps facing that way when you let go.\n\n```js\n    this.cooldown -= dt;\n    this.safe -= dt;\n    if (scene.get(\'HUD\').busy) return;\n    if (this.near && input.isJustPressed(\'interact\')) this.near.talk();\n    if (input.isJustPressed(\'attack\') && this.cooldown <= 0) this.attack();\n```\n\n`update()` now counts down the cooldown and the safe time, stops if a menu is open, talks as before, and attacks if J was just pressed and the last swing was at least 0.4 seconds ago.\n\n```js\n  attack() {\n    this.cooldown = 0.4;\n    const reach = this.position.add(this.facing.normalized().scale(14));\n    const damage = state.attack + (state.weapon?.bonus ?? 0);\n```\n\nThe point 14 pixels in front of the hero (cell 3), and the damage: the hero\'s attack plus the weapon\'s bonus, or 0 with no weapon (`??` gives the right side when the left is null or undefined).\n\n```js\n    const swing = this.get(\'Swing\');\n    swing.position = this.facing.normalized().scale(14);\n    swing.burst(6);\n    scene.get(\'HUD/Sounds/Swing\').play();\n```\n\nThe particles move to that point (relative to the hero) and burst, with the swish.\n\n```js\n    for (const enemy of scene.getNodesInGroup(\'enemies\')) {\n      if (enemy.globalPosition.distanceTo(reach) < 16) enemy.hurt(damage, this.position);\n```\n\nEvery enemy within 16 pixels of that point is hurt, and told where the hit came from, for its knockback. `globalPosition` is its place in the world: a slime\'s `position` is relative to Enemies, which happens to be at (0, 0), but the global one is right wherever its parent is.\n\n```js\n  hurt(amount, from) {\n    if (this.safe > 0) return;\n    this.safe = 0.8;\n    state.hp -= amount;\n    if (from) { this.velocity = this.position.sub(from).normalized().scale(140); this.stunned = 0.15; }\n```\n\nThe hero hurt: ignored while safe, then safe for 0.8 seconds, lose hit points, knocked back away from `from`.\n\n```js\n    const sprite = this.get(\'Sprite\');\n    sprite.modulate = \'#ff4040\';\n    tween.to(sprite, { modulate: \'#ffffff\' }, 0.4);\n    scene.get(\'HUD/Sounds/Hurt\').play();\n    if (state.hp <= 0) this.die();\n```\n\nA red flash fading over 0.4 seconds, the crunch, and at 0, `die()`.\n\n```js\n  die() {\n    state.hp = state.maxHp;\n    state.gold = Math.floor(state.gold / 2);\n    state.arriveAt = \'Campfire\';\n    scene.get(\'HUD\').say(\'You were beaten. Half your gold is gone.\');\n    scene.change(\'scenes/forest.scene\');\n```\n\nBeaten: full hit points, half the gold rounded down (`Math.floor`), and wake at the campfire\'s spawn point in the forest.\n\n**Slimes that chase**\n\n```js\n  physicsUpdate(dt) {\n    const hero = scene.find(\'Player\');\n    if (!hero || scene.get(\'HUD\').busy) { this.velocity = { x: 0, y: 0 }; return; }\n    this.stunned -= dt;\n    if (this.stunned > 0) { this.moveAndSlide(); return; }\n```\n\nNo hero or a menu open: wait. Knocked back: let the knockback carry it.\n\n```js\n    const far = this.position.distanceTo(hero.position);\n    if (far < 12) hero.hurt(1, this.position);\n    const buddy = scene.find(\'Buddy\');\n    if (buddy && this.position.distanceTo(buddy.position) < 12) buddy.hurt(1, this.position);\n```\n\nTouching the hero hurts it (its safe time stops this happening every frame). The two buddy lines are ready for lesson 12.4: with no Buddy in the scene, `scene.find` gives null and nothing happens.\n\n```js\n    if (far > this.sight) { this.velocity = { x: 0, y: 0 }; return; }\n    this.think -= dt;\n    if (this.think <= 0) { this.think = 0.5; this.route = scene.get(\'Walls\').findPath(this.position, hero.position) ?? []; }\n```\n\nToo far to see: stand still. Otherwise, twice a second, ask the walls\' tile map for a way round: `findPath(from, to)` returns a list of points, the middles of the cells on the shortest way that avoids solid tiles (A*), or null if there is none.\n\n```js\n    const next = this.route[0] ?? hero.position;\n    if (this.position.distanceTo(next) < 3 && this.route.length) this.route.shift();\n    this.velocity = next.sub(this.position).normalized().scale(this.speed);\n    this.moveAndSlide();\n```\n\nHead for the first point on the route (or straight at the hero if there is no route), drop the point on reaching it, and move towards it at the slime\'s speed.\n\n**Slimes that come back**\n\n```js\nexport default class Spawner extends Node2D {\n  wait = 6;\n  update(dt) {\n    this.wait -= dt;\n    if (this.wait > 0) return;\n    this.wait = 6;\n```\n\nA timer: every 6 seconds, carry on below; the rest of the time, nothing.\n\n```js\n    const enemies = scene.get(\'Enemies\');\n    if (enemies.children.length >= 3) return;\n    const hero = scene.find(\'Player\');\n    const spots = this.children.filter((s) => !hero || s.position.distanceTo(hero.position) > 80);\n    if (!spots.length) return;\n```\n\nThree or more slimes: enough. Otherwise the spawner\'s children are its spots; keep only those more than 80 pixels from the hero, so nothing appears on top of you.\n\n```js\n    const slime = scene.instantiate(\'scenes/slime.scene\');\n    slime.position = spots[Math.floor(Math.random() * spots.length)].position;\n    enemies.addChild(slime);\n```\n\n`scene.instantiate(path)` builds a scene\'s nodes while the game runs, the same as the forest\'s instances; a random spot (an index from 0 to the number of spots less one), and into Enemies, where it starts its `ready()` and `physicsUpdate` like the others.\n\n```js\nconst forest = project.scene(\'scenes/forest.scene\')\nforest.add(\'Node2D\', { name: \'Spawner\', script: \'scripts/spawner.js\' })\nfor (const [x, y] of [[260, 40], [280, 150], [200, 168]]) forest.add(\'Node2D\', { name: \'Spot\', parent: \'Spawner\', position: { x, y } })\n```\n\nThe spawner and its three spots. Three nodes can all be called Spot: the spawner reads them as a list of children, never by name.',
              },
              {
                type: 'markdown',
                instruction: '### 6. Questions you might have\n\n**Why does a hit measure from a point in front of the hero, not from the hero?** From the hero, a swing would hit slimes behind you too (cell 3). The point makes the attack go where you face.\n\n**Why does the hero have a safe time but the slimes do not?** Three slimes touching you every frame would take 180 hit points a second (cell 2). Your hits are already spaced by the 0.4 s cooldown.\n\n**Why find the path only twice a second?** A* looks at many cells; moving towards a point costs almost nothing. The hero moves only a few pixels in half a second, so a route that old is still good.\n\n**What does `tween.to` do if a new hit starts while the last flash is still fading?** The new tween takes over from wherever the colour is now; a flash always fades from red.\n\n**Why are the slimes\' sounds in the HUD and not on the slime?** The slime frees itself when beaten; a sound on it would be cut off (lesson 11.8).\n\n**Why does `die()` set `arriveAt` and change scene, instead of moving the hero to the campfire?** It is the same way a door and Continue work: the map is rebuilt and the hero stands on the spawn point, with slimes back at their places.',
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
