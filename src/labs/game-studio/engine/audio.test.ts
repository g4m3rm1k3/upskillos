// Sounds in the running game (AudioStreamPlayer), and made sounds in a project and its exports.
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { Doc } from '../core/doc';
import { newProject } from '../core/project';
import { gameZip, projectZip, readProjectZip } from '../core/archive';
import { soundBytes } from '../core/sound';
import { deserialize, serialize } from '../core/serialize';
import { Game, type ScriptError } from './game';
import { AudioStreamPlayer, Node, Node2D } from './nodes';

const BEEP = { wave: 'square' as const, from: 660, to: 660, length: 0.5 };

function game(make: (d: Doc, id: string) => void, classes: Record<string, typeof Node> = {}) {
  const d = new Doc(newProject());
  const s = d.createScene('scenes/main.scene');
  d.writeSound('assets/beep.wav', BEEP);
  make(d, s.id);
  d.setMainScene('scenes/main.scene');
  const calls: unknown[][] = [], errors: ScriptError[] = [];
  const g = new Game(d.project, d.scene(s.id), { frame: () => undefined }, {
    audio: { play: (id, stream, o) => calls.push(['play', id, stream, o]), stop: (id) => calls.push(['stop', id]) },
    scriptClass: (p) => classes[p], onError: (e) => errors.push(e),
  });
  g.start();
  return { d, g, calls, errors };
}
const steps = (g: Game, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) g.step(1 / 60); };

describe('AudioStreamPlayer', () => {
  it('play() tells the audio output; playing lasts the sound’s length, then finished() runs once', () => {
    const ended: number[] = [];
    const { g, calls } = game((d, id) => d.addNode(id, 'AudioStreamPlayer', undefined, { name: 'Beep', props: { stream: 'assets/beep.wav', volume: 0.8 } }));
    const beep = g.root.get<AudioStreamPlayer>('Beep');
    beep.connect('finished', () => ended.push(g.time.now));
    beep.play();
    expect(calls).toEqual([['play', 1, 'assets/beep.wav', { volume: 0.8, pitch: 1, loop: false }]]);
    steps(g, 0.45);
    expect(beep.playing).toBe(true);
    steps(g, 0.1);
    expect(beep.playing).toBe(false);
    steps(g, 1);
    expect(ended.length).toBe(1);
    expect(ended[0]).toBeCloseTo(0.5, 6);
  });

  it('pitchScale 2 plays it an octave up and in half the time', () => {
    const { g, calls } = game((d, id) => d.addNode(id, 'AudioStreamPlayer', undefined, { name: 'Beep', props: { stream: 'assets/beep.wav', pitchScale: 2 } }));
    const beep = g.root.get<AudioStreamPlayer>('Beep');
    beep.play(); steps(g, 0.26);
    expect(beep.playing).toBe(false);
    expect(calls[0][3]).toMatchObject({ pitch: 2 });
  });

  it('a looping sound plays until stop(), and never finishes by itself', () => {
    const ended: number[] = [];
    const { g, calls } = game((d, id) => d.addNode(id, 'AudioStreamPlayer', undefined, { name: 'Music', props: { stream: 'assets/beep.wav', loop: true, autoplay: true } }));
    const music = g.root.get<AudioStreamPlayer>('Music');
    music.connect('finished', () => ended.push(1));
    steps(g, 3);
    expect(music.playing).toBe(true);
    music.stop();
    expect(music.playing).toBe(false);
    expect(calls).toEqual([['play', 1, 'assets/beep.wav', { volume: 1, pitch: 1, loop: true }], ['stop', 1]]);
    expect(ended).toEqual([]);
  });

  it('play() while playing starts it again: the old play is stopped, a new one begins', () => {
    const { g, calls } = game((d, id) => d.addNode(id, 'AudioStreamPlayer', undefined, { name: 'Beep', props: { stream: 'assets/beep.wav' } }));
    const beep = g.root.get<AudioStreamPlayer>('Beep');
    beep.play(); steps(g, 0.3); beep.play();
    expect(calls.map((c) => c.slice(0, 2))).toEqual([['play', 1], ['stop', 1], ['play', 2]]);
    steps(g, 0.3);
    expect(beep.playing).toBe(true);   // 0.3 s into the second play
  });

  it('a sound stops when its node is freed or the scene changes', () => {
    const { d, g, calls } = game((d, id) => {
      d.addNode(id, 'AudioStreamPlayer', undefined, { name: 'A', props: { stream: 'assets/beep.wav', loop: true, autoplay: true } });
      d.addNode(id, 'AudioStreamPlayer', undefined, { name: 'B', props: { stream: 'assets/beep.wav', loop: true, autoplay: true } });
    });
    d.createScene('scenes/next.scene');
    g.root.get('A').queueFree(); g.step(1 / 60);
    expect(calls.at(-1)).toEqual(['stop', 1]);
    g.sceneApi.change('scenes/next.scene'); g.step(1 / 60);
    expect(calls.at(-1)).toEqual(['stop', 2]);
  });

  it('says what is wrong: no stream, or a sound the project does not have', () => {
    class Player extends Node2D { ready() { (this.get('Empty') as AudioStreamPlayer).play(); } }
    const { errors } = game((d, id) => {
      d.writeScript('scripts/p.js', '');
      const n = d.addNode(id, 'Node2D', undefined, { name: 'P' });
      d.addNode(id, 'AudioStreamPlayer', n.id, { name: 'Empty' });
      d.setScript(id, n.id, 'scripts/p.js');
    }, { 'scripts/p.js': Player });
    expect(errors[0].message).toMatch(/"P\/Empty" has no sound to play: set its stream/);
    const { g } = game(() => undefined);
    const lone = new AudioStreamPlayer(); lone.stream = 'assets/missing.wav';
    g.root.addChild(lone);
    expect(() => lone.play()).toThrow(/There is no sound "assets\/missing.wav"/);
  });
});

describe('made sounds in the project', () => {
  it('writeSound keeps the recipe (a new id when it changes), and is logged as code', () => {
    const d = new Doc(newProject());
    const first = d.writeSound('assets/coin.wav', { wave: 'square', from: 880, to: 1760, length: 0.15 });
    const again = d.writeSound('assets/coin.wav', { wave: 'square', from: 990, to: 1760, length: 0.15 });
    const a = d.project.assets.find((x) => x.path === 'assets/coin.wav')!;
    expect(first).not.toBe(again);
    expect(a).toMatchObject({ kind: 'sound', mime: 'audio/wav', sound: { wave: 'square', from: 990, to: 1760, length: 0.15 } });
    expect(d.log.at(-1)!.code).toBe('project.writeSound("assets/coin.wav", { wave: "square", from: 990, to: 1760, length: 0.15 })');
    expect(() => d.writeSound('assets/coin.mp3', BEEP)).toThrow();
    expect(() => d.writeSound('assets/bad.wav', { ...BEEP, from: 1 })).toThrow(/from is a pitch/);
  });

  it('a project saved and loaded keeps its sounds; one whose recipe is broken says so', () => {
    const d = new Doc(newProject());
    d.writeSound('assets/coin.wav', BEEP);
    const back = deserialize(serialize(d.project));
    expect(back.assets[0].sound).toEqual(BEEP);
    const broken = JSON.parse(serialize(d.project)); broken.assets[0].sound.length = -1;
    expect(() => deserialize(JSON.stringify(broken))).toThrow(/assets\/coin.wav: length/);
  });

  it('exports carry the .wav made from the recipe: the project .zip, and the game (only if something uses it)', () => {
    const d = new Doc(newProject());
    const s = d.createScene('scenes/main.scene');
    d.setMainScene('scenes/main.scene');
    d.writeSound('assets/used.wav', BEEP);
    d.writeSound('assets/unused.wav', { ...BEEP, from: 220, to: 220 });
    d.addNode(s.id, 'AudioStreamPlayer', undefined, { name: 'Beep', props: { stream: 'assets/used.wav' } });
    const none = () => undefined;
    const zip = unzipSync(projectZip(d.project, none));
    expect(zip['assets/used.wav']).toEqual(soundBytes(BEEP));
    expect(readProjectZip(projectZip(d.project, none)).bytes.size).toBe(2);
    const site = unzipSync(gameZip(d.project, 'RUNTIME', none));
    expect(Object.keys(site).filter((k) => k.endsWith('.wav'))).toEqual(['assets/used.wav']);
    expect(JSON.parse(strFromU8(site['project.json'])).assets.map((a: { path: string; kind: string }) => [a.path, a.kind])).toEqual([['assets/used.wav', 'sound']]);
  });
});
