import { describe, expect, it } from 'vitest';
import { Doc } from './doc';
import { newProject, nodeAt, pathOf, walk } from './project';
import { runSceneCode } from './api';
import { deserialize, problems, serialize } from './serialize';
import { isA, nodeTypes, propValue, propsOf } from './registry';

/** A project with a main scene, a player with a sprite, an image and a script: the Phase 1 shape. */
function sample() {
  const d = new Doc(newProject('Test'));
  const s = d.createScene('scenes/main.scene');
  const img = d.importAsset('assets/player.png', { mime: 'image/png', width: 64, height: 64 });
  const player = d.addNode(s.id, 'CharacterBody2D', undefined, { name: 'Player', props: { position: { x: 200, y: 150 } } });
  const sprite = d.addNode(s.id, 'Sprite2D', player.id, { name: 'Sprite' });
  d.setProp(s.id, sprite.id, 'texture', 'assets/player.png');
  d.writeScript('scripts/player.js', 'export default class Player extends CharacterBody2D {}');
  d.setScript(s.id, player.id, 'scripts/player.js');
  return { d, s, img, player, sprite };
}

describe('the registry', () => {
  it('gives each type its bases’ properties first, and defaults when a property is not set', () => {
    expect(propsOf('Sprite2D').map((p) => p.name)).toEqual(['position', 'rotation', 'scale', 'visible', 'zIndex', 'texture', 'flipX', 'flipY', 'opacity', 'modulate']);
    expect(isA('CharacterBody2D', 'Node2D')).toBe(true);
    expect(isA('Node2D', 'Sprite2D')).toBe(false);
    expect(propValue('Sprite2D', {}, 'scale')).toEqual({ x: 1, y: 1 });
    for (const t of nodeTypes()) for (const p of propsOf(t.type)) expect(p.help.length, `${t.type}.${p.name}`).toBeGreaterThan(10);
  });
});

describe('commands', () => {
  it('build the tree with unique sibling names and paths', () => {
    const { d, s, player } = sample();
    const again = d.addNode(s.id, 'CharacterBody2D', undefined, { name: 'Player' });
    expect(again.name).toBe('Player2');
    const t = d.addNode(s.id, 'Sprite2D', undefined, { name: 'Tile0009' });
    expect([t.name, d.addNode(s.id, 'Sprite2D', undefined, { name: 'Tile0009' }).name]).toEqual(['Tile0009', 'Tile0010']);
    expect(pathOf(d.scene(s.id), d.node(s.id, player.id)!.children[0].id)).toBe('Player/Sprite');
    expect(nodeAt(d.scene(s.id), 'Player/Sprite')!.props.texture).toBe('assets/player.png');
  });

  it('store only what differs from the defaults', () => {
    const { d, s, player } = sample();
    d.setProp(s.id, player.id, 'position', { x: 0, y: 0 });
    expect(d.node(s.id, player.id)!.props).toEqual({});
  });

  it('refuse bad values and leave the project and history untouched', () => {
    const { d, s, player } = sample();
    const before = serialize(d.project), depth = d.undoStack.length;
    expect(() => d.setProp(s.id, player.id, 'position', { x: 'a', y: 1 } as never)).toThrow(/position must be/);
    expect(() => d.setProp(s.id, player.id, 'speed', 3)).toThrow(/has no property "speed"/);
    expect(() => d.rename(s.id, player.id, 'a/b')).toThrow(/cannot contain "\/"/);
    expect(() => d.reparent(s.id, player.id, d.node(s.id, player.id)!.children[0].id)).toThrow(/child of itself/);
    expect(() => d.setScript(s.id, player.id, 'scripts/nope.js')).toThrow(/No script/);
    expect(serialize(d.project)).toBe(before);
    expect(d.undoStack.length).toBe(depth);
  });

  it('undo and redo step through every change, and a drag is one step', () => {
    const { d, s, player } = sample();
    const states: string[] = [serialize(d.project)];
    d.rename(s.id, player.id, 'Hero'); states.push(serialize(d.project));
    const copy = d.duplicate(s.id, player.id); states.push(serialize(d.project));
    expect(d.node(s.id, copy.id)!.name).toBe('Hero2');
    d.reparent(s.id, copy.id, player.id); states.push(serialize(d.project));
    d.deleteNode(s.id, copy.id); states.push(serialize(d.project));
    // A drag: many live changes, one command.
    d.beginLive();
    for (let x = 200; x <= 260; x += 10) d.liveProp(s.id, player.id, 'position', { x, y: 150 });
    d.endLive('Move Hero', s.id, player.id, ['position']);
    states.push(serialize(d.project));
    expect(d.log.at(-1)!.code).toBe('scene.get("Hero").position = { x: 260, y: 150 }');
    for (let i = states.length - 2; i >= 0; i--) { d.undo(); expect(serialize(d.project)).toBe(states[i]); }
    for (let i = 1; i < states.length; i++) { d.redo(); expect(serialize(d.project)).toBe(states[i]); }
  });

  it('a change that changes nothing adds no undo step and no line of code', () => {
    const { d, s, player } = sample();
    const depth = d.undoStack.length, lines = d.log.length;
    d.setProp(s.id, player.id, 'position', { x: 200, y: 150 });   // what it already is
    expect(d.undoStack.length).toBe(depth);
    expect(d.log.length).toBe(lines);
  });

  it('moving a node under another keeps it where it is on screen, and the log replays to the same result', () => {
    const d = new Doc(newProject());
    const s = d.createScene('scenes/main.scene');
    const parent = d.addNode(s.id, 'Node2D', undefined, { name: 'Ship', props: { position: { x: 100, y: 50 }, rotation: Math.PI / 2, scale: { x: 2, y: 2 } } });
    const gun = d.addNode(s.id, 'Node2D', undefined, { name: 'Gun', props: { position: { x: 100, y: 90 } } });
    d.reparent(s.id, gun.id, parent.id);
    // World (100, 90) seen from a ship at (100, 50) turned 90° clockwise and doubled: 20 along its x axis.
    expect(d.node(s.id, gun.id)!.props).toEqual({ position: { x: 20, y: 0 }, rotation: -1.5708, scale: { x: 0.5, y: 0.5 } });
    const replay = newProject();
    runSceneCode(replay, d.log.map((l) => l.code).join('\n'));
    expect(serialize(replay)).toBe(serialize(d.project));
  });

  it('know when the project differs from what was saved', () => {
    const { d, s, player } = sample();
    d.markSaved();
    expect(d.dirty).toBe(false);
    d.rename(s.id, player.id, 'Hero');
    expect(d.dirty).toBe(true);
    d.undo();
    expect(d.dirty).toBe(false);
  });
});

describe('GUI → code', () => {
  it('the log replays on an empty project to the same project, ids included, even after undo and redo', () => {
    const { d, s, player, sprite } = sample();
    d.rename(s.id, player.id, 'Hero');
    d.duplicate(s.id, sprite.id);
    const other = d.createScene('scenes/level2.scene');
    d.addNode(other.id, 'Sprite2D', undefined, { props: { opacity: 0.5 } });
    d.addNode(s.id, 'Node2D', player.id, { name: 'Hand', props: { position: { x: 12, y: -4 }, rotation: 0.5 } });   // back to the first scene
    d.undo(); d.undo(); d.redo();
    d.addAction('fire', ['KeyJ']);
    d.setProjectName('Renamed');
    d.setSettings({ width: 640, background: '#102030' });
    expect(() => d.setSettings({ width: 10 })).toThrow(/64 to 4096/);
    const replay = newProject('Test');
    runSceneCode(replay, d.log.map((l) => l.code).join('\n'));
    expect(serialize(replay)).toBe(serialize(d.project));
  });

  it('reads like a script: the lines a user sees', () => {
    const { d } = sample();
    expect(d.log.map((l) => l.code)).toEqual([
      'scene = project.createScene("scenes/main.scene", "Node2D")',
      'project.importAsset("assets/player.png", { mime: "image/png", width: 64, height: 64 })',
      'scene.add("CharacterBody2D", { name: "Player", position: { x: 200, y: 150 } })',
      'scene.add("Sprite2D", { name: "Sprite", parent: "Player" })',
      'scene.get("Player/Sprite").texture = "assets/player.png"',
      'project.writeScript("scripts/player.js", "export default class Player extends CharacterBody2D {}")',
      'scene.get("Player").script = "scripts/player.js"',
    ]);
  });
});

describe('saving and loading', () => {
  it('round-trips exactly, and the same project always gives the same text', () => {
    const { d } = sample();
    const text = serialize(d.project);
    expect(serialize(deserialize(text))).toBe(text);
    expect(problems(d.project)).toEqual([]);
  });

  it('names every problem in a bad file', () => {
    const { d } = sample();
    const p = JSON.parse(serialize(d.project));
    const nodes = [...walk(p.scenes[0].root)];
    nodes[1].props.speed = 3;
    nodes[2].props.texture = 'assets/missing.png';
    nodes[1].script = 'scripts/gone.js';
    p.scenes[0].root.children.push({ ...nodes[1], children: [] });
    expect(() => deserialize(JSON.stringify(p))).toThrow(/has no property "speed"[\s\S]*missing image "assets\/missing.png"[\s\S]*missing script "scripts\/gone.js"/);
    expect(problems(p)).toEqual(expect.arrayContaining([expect.stringMatching(/used twice/), expect.stringMatching(/both called "Player"/)]));
    expect(() => deserialize('{"formatVersion": 99}')).toThrow(/newer Game Studio/);
    expect(() => deserialize('not json')).toThrow(/not valid JSON/);
  });
});

describe('animated sprites in the model', () => {
  const walk = { name: 'walk', fps: 8, loop: true, frames: ['assets/player.png'] };

  it('sets frames through a command, logs them as code, and replays to the same project', () => {
    const { d, s, player } = sample();
    const a = d.addNode(s.id, 'AnimatedSprite2D', player.id, { name: 'Anim' });
    d.setProp(s.id, a.id, 'frames', [walk]);
    d.setProp(s.id, a.id, 'animation', 'walk');
    expect(d.log.at(-2)!.code).toContain('frames = [{ name: "walk", fps: 8, loop: true, frames: ["assets/player.png"] }]');
    const replay = newProject('Test');
    runSceneCode(replay, d.log.map((l) => l.code).join('\n'));
    expect(serialize(replay)).toBe(serialize(d.project));
    expect(problems(d.project)).toEqual([]);
  });

  it('keeps its own copy: changing the list afterwards does not change the project', () => {
    const { d, s } = sample();
    const a = d.addNode(s.id, 'AnimatedSprite2D', undefined, { name: 'Anim' });
    const frames = [{ ...walk, frames: [...walk.frames] }];
    d.setProp(s.id, a.id, 'frames', frames);
    frames[0].fps = 99;
    expect((propValue('AnimatedSprite2D', d.node(s.id, a.id)!.props, 'frames') as typeof frames)[0].fps).toBe(8);
  });

  it('refuses bad animations, naming what is wrong', () => {
    const { d, s } = sample();
    const a = d.addNode(s.id, 'AnimatedSprite2D', undefined, { name: 'Anim' });
    const bad = (v: unknown) => () => d.setProp(s.id, a.id, 'frames', v as never);
    expect(bad('walk')).toThrow(/list of \{ name, fps, loop, frames/);
    expect(bad([walk, walk])).toThrow(/two animations are both called "walk"/);
    expect(bad([{ ...walk, fps: 0 }])).toThrow(/"walk" needs fps/);
    expect(bad([{ ...walk, loop: 'yes' }])).toThrow(/needs loop/);
    expect(bad([{ ...walk, frames: [3] }])).toThrow(/list of image paths/);
    expect(bad([{ ...walk, speed: 2 }])).toThrow(/something other than/);
  });

  it('the problem report names an animation picture that is missing', () => {
    const { d, s } = sample();
    const a = d.addNode(s.id, 'AnimatedSprite2D', undefined, { name: 'Anim' });
    d.setProp(s.id, a.id, 'frames', [{ ...walk, frames: ['assets/player.png', 'assets/gone.png'] }]);
    expect(problems(d.project)).toEqual(['scenes/main.scene: Anim: animation "walk" uses a missing image "assets/gone.png"']);
  });
});

describe('setProps', () => {
  it('changes several properties as one undo step, logged one line each, and replays', () => {
    const { d, s, sprite } = sample();
    const steps = d.undoStack.length;
    d.setProps(s.id, sprite.id, { flipX: true, opacity: 0.5 });
    expect(d.undoStack.length).toBe(steps + 1);
    expect(d.log.at(-1)!.code).toBe('scene.get("Player/Sprite").flipX = true\nscene.get("Player/Sprite").opacity = 0.5');
    const replay = newProject('Test');
    runSceneCode(replay, d.log.map((l) => l.code).join('\n'));
    expect(serialize(replay)).toBe(serialize(d.project));
    d.undo();
    expect(propValue('Sprite2D', d.node(s.id, sprite.id)!.props, 'flipX')).toBe(false);
  });
});
