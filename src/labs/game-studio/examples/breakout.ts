// Example: Breakout. Bat the ball into a wall of 48 bricks; clear them all before you run
// out of balls.
//
// Built only with the real Scene API and the engine's real nodes and scripts, like every
// example. What it adds: a RigidBody2D that moves by itself (bounce 1, gravityScale 0),
// onCollision to break bricks and steer the ball off the paddle, collision layers so the
// ball never pushes the paddle, a screen with no camera, and (Phase 7) bricks that are 48
// instances of one brick scene, in a group.

import type { GameExample } from './types';
import { BREAKOUT_SPEC } from '../ml/breakout';

export const P = 'assets/puzzle-pack';
export const BRICKS = ['red', 'yellow', 'green', 'blue'].map((c) => `${P}/tiles-${c}/tile${c}_62.png`);   // 208 × 108
export const PADDLE = `${P}/paddles/paddle_01.png`;   // 520 × 140
export const BALL = `${P}/balls/ballblue_01.png`;     // 128 × 128

const paddle = `export default class Paddle extends CharacterBody2D {
  speed = 480;   // pixels per second

  physicsUpdate(dt) {
    // Left and right only; the walls stop it at the sides.
    this.velocity = { x: input.axis('move_left', 'move_right') * this.speed, y: 0 };
    this.moveAndSlide();
  }
}
`;

const ball = `export default class Ball extends RigidBody2D {
  speed = 360;       // pixels per second, always
  lives = 3;
  score = 0;
  launched = false;

  ready() {
    this.paddle = scene.get('Paddle');
    this.left = scene.get('Bricks').children.length;
    this.showHud();
  }

  physicsUpdate(dt) {
    if (!this.launched) {
      // Sit on the paddle until Space is pressed: 14 (half the paddle) + 8 (the ball's radius) + 1 above it.
      this.position = { x: this.paddle.position.x, y: this.paddle.position.y - 23 };
      this.velocity = { x: 0, y: 0 };
      if (input.isJustPressed('jump') && this.lives > 0 && this.left > 0) this.launch();
      return;
    }
    // Missed: it fell off the bottom of the screen.
    if (this.position.y > 580) this.lose();
  }

  launch() {
    this.launched = true;
    this.go(20);
    this.showHud();
  }

  // Send the ball off at \`degrees\` from straight up (positive is to the right), at full speed.
  go(degrees) {
    const a = math.degToRad(degrees);
    this.velocity = { x: this.speed * Math.sin(a), y: -this.speed * Math.cos(a) };
  }

  // The engine calls this when the ball hits a solid body. It has already bounced:
  // bounce 1 reflects it off the surface at the same speed.
  onCollision(body, normal) {
    if (body === this.paddle && normal.y < 0) {
      // Where it lands on the paddle steers it: the middle sends it straight up,
      // the ends up to 60° to the side. That is how the player aims.
      const offset = math.clamp((this.position.x - this.paddle.position.x) / 52, -1, 1);
      this.go(60 * offset);
    } else if (body.isInGroup('bricks') && !body.hit) {
      body.hit = true;          // count each brick once, even if touched twice before it goes
      body.queueFree();
      this.left -= 1;
      this.score += 10;
      if (this.left === 0) this.launched = false;
      this.showHud();
    }
  }

  lose() {
    this.lives -= 1;
    this.launched = false;
    console.log(this.lives > 0 ? \`Missed! \${this.lives} left.\` : 'Game over.');
    this.showHud();
  }

  showHud() {
    scene.get('HUD/Score').text = \`Score: \${this.score}\`;
    scene.get('HUD/Lives').text = \`Balls: \${this.lives}\`;
    const message = scene.get('HUD/Message');
    message.text = this.left === 0 ? 'You cleared the wall!'
      : this.lives === 0 ? 'Game over. Press ↻ to play again.'
      : 'Press Space to launch';
    message.visible = !this.launched;
  }
}
`;

export const BREAKOUT_CODE = `// Breakout: the whole 960 × 540 screen, with no camera, so the world is the screen.
scene = project.createScene('scenes/breakout.scene', 'Node2D', 'Breakout')
project.setSettings({ background: '#1b1f3b', pixelArt: false, gravity: 980 })   // smooth art, so no pixel-art scaling

// Collision layers, as bits: layer 1 is 1, layer 2 is 2. Walls, bricks and the paddle are on
// layer 1. The ball is on layer 2 and its mask is layer 1, so it hits them all. The paddle's
// mask is layer 1 only, so the ball never blocks or pushes the paddle.

// Walls on three sides, just off the screen; the bottom is open.
scene.add('StaticBody2D', { name: 'Walls' })
scene.add('CollisionShape2D', { name: 'Left', parent: 'Walls', position: { x: -10, y: 270 }, size: { x: 20, y: 600 } })
scene.add('CollisionShape2D', { name: 'Right', parent: 'Walls', position: { x: 970, y: 270 }, size: { x: 20, y: 600 } })
scene.add('CollisionShape2D', { name: 'Top', parent: 'Walls', position: { x: 480, y: -10 }, size: { x: 1000, y: 20 } })

// One brick is its own scene: a StaticBody2D (so the ball bounces off it) in the group "bricks",
// with a picture (208 × 108, shown at 0.3: 62.4 × 32.4) and a shape. The wall is 48 instances of it.
const colours = [${BRICKS.map((b) => `'${b}'`).join(', ')}]
scene = project.createScene('scenes/brick.scene', 'StaticBody2D', 'Brick')
scene.root.groups = ['bricks']
scene.add('Sprite2D', { name: 'Sprite', texture: colours[0], scale: { x: 0.3, y: 0.3 } })
scene.add('CollisionShape2D', { name: 'Shape', size: { x: 62, y: 32 } })

// Back to the game: 12 across and 4 rows deep. Each row but the first changes its bricks' picture:
// an override on those instances; the brick scene itself stays red.
scene = project.scene('scenes/breakout.scene')
scene.add('Node2D', { name: 'Bricks' })
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 12; col++) {
    const b = scene.instance('scenes/brick.scene', { parent: 'Bricks', position: { x: 84 + 72 * col, y: 70 + 36 * row } })
    if (row > 0) scene.get(\`Bricks/\${b.name}/Sprite\`).texture = colours[row]
  }
}

// The paddle: a CharacterBody2D the player moves. The picture is 520 × 140; scale 0.2 is 104 × 28.
scene.add('CharacterBody2D', { name: 'Paddle', position: { x: 480, y: 500 } })
scene.add('Sprite2D', { name: 'Sprite', parent: 'Paddle', texture: '${PADDLE}', scale: { x: 0.2, y: 0.2 } })
scene.add('CollisionShape2D', { name: 'Shape', parent: 'Paddle', size: { x: 104, y: 28 } })
project.writeScript('scripts/paddle.js', ${JSON.stringify(paddle)})
scene.get('Paddle').script = 'scripts/paddle.js'

// The ball: a RigidBody2D, so it moves by itself. gravityScale 0: nothing pulls it down.
// bounce 1: it leaves every surface as fast as it arrived. On layer 2, hitting layer 1.
scene.add('RigidBody2D', { name: 'Ball', position: { x: 480, y: 477 }, gravityScale: 0, bounce: 1, collisionLayer: 2, collisionMask: 1 })
scene.add('Sprite2D', { name: 'Sprite', parent: 'Ball', texture: '${BALL}', scale: { x: 0.125, y: 0.125 } })
scene.add('CollisionShape2D', { name: 'Shape', parent: 'Ball', shape: 'circle', size: { x: 16, y: 16 } })
project.writeScript('scripts/ball.js', ${JSON.stringify(ball)})
scene.get('Ball').script = 'scripts/ball.js'

// The HUD.
scene.add('CanvasLayer', { name: 'HUD' })
scene.add('Label', { name: 'Score', parent: 'HUD', position: { x: 16, y: 10 }, fontSize: 22, text: 'Score: 0' })
scene.add('Label', { name: 'Lives', parent: 'HUD', position: { x: 840, y: 10 }, fontSize: 22, text: 'Balls: 3' })
scene.add('Label', { name: 'Message', parent: 'HUD', position: { x: 340, y: 300 }, fontSize: 30, color: '#ffd166', text: 'Press Space to launch' })
`;

export const breakout: GameExample = {
  id: 'breakout',
  title: 'Breakout',
  agent: BREAKOUT_SPEC,
  blurb: 'Bat the ball into a wall of 48 bricks with the paddle, and clear them all with three balls. A ball that moves by itself and bounces, bricks that break, aiming off the paddle, and collision layers.',
  art: 'Kenney Puzzle Pack 2 (CC0)',
  images: [...BRICKS, PADDLE, BALL],
  code: BREAKOUT_CODE,
  guide: [
    'Press ▶ Run (F5). ← → or A and D move the paddle; Space launches the ball. Where the ball lands on the paddle aims it: the middle sends it straight up, the ends out to the side.',
    'Select Ball. It is a RigidBody2D: once launched, its script never moves it. Physics does, using its velocity (the script only sets that velocity). gravityScale is 0, so it does not fall, and bounce is 1, so it leaves every wall and brick as fast as it came.',
    'Try it: set the Ball’s gravityScale to 0.3 and run. Now its path curves down, like a thrown ball. Set bounce to 0.8 and it slows at each wall (the paddle puts its speed back).',
    'Open scripts/ball.js. onCollision(body, normal) runs when the ball hits something. A brick is removed with queueFree(); the paddle sets a new direction from where it was hit. The API reference link above the script explains every method it uses.',
    'Collision layers: select Ball and look at collisionLayer (2) and collisionMask (1). The paddle’s mask is 1 only, so it never notices the ball on layer 2, and the ball cannot push it. Turn off layer 1 in the Ball’s collisionMask and run: now it notices nothing, and flies through the paddle, the bricks and the walls.',
    'There is no Camera2D, so the view is the screen: (0, 0) is the top-left corner and (960, 540) the bottom-right. The walls are just off the screen’s edges, and there is none at the bottom.',
    'Every brick is an instance of brick.scene (⧉ in the tree). Open brick.scene and change its Shape or its Sprite\u2019s scale: all 48 bricks change. The rows below the first override only their Sprite\u2019s texture (select one: the texture is marked, with ↺ to go back to red).',
    'Try it yourself: select Bricks › Brick and press Ctrl+D, then drag the copy into the gap under the wall. It is a real brick straight away: it is in the group "bricks", which the ball checks with body.isInGroup(\u2019bricks\u2019).',
  ],
};
