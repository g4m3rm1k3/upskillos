import { describe, it, expect } from 'vitest';
import { createRace, stepRace, act, updateQ, legalActions, purchase, readGarage, SAVE_KEY, recover, place, TRACK, STEP, rank } from './simulation.js';
import { train, evaluate } from './training.js';
import artifact from './policy.json';

function active() { const r = createRace({ seed: 17, policy: artifact.policy }); r.countdown = 0; r.phase = 'racing'; return r; }
const stopped = { throttle: 0, steer: 0, action: 'race' };
const allStopped = Object.fromEntries([0, 1, 2, 3].map(id => [id, stopped]));

describe('Circuit Clash race rules', () => {
  it('completes an actual two-lap race with learned opponents', () => {
    const race = active();
    for (let i = 0; i < 10810 && race.phase !== 'finished'; i++) stepRace(race);
    expect(race.racers[0].finish).not.toBeNull();
    expect(race.racers[0].gates).toBe(8);
    expect(race.racers[0].lap).toBe(2);
    expect(race.racers[0].finish).toBeGreaterThan(20);
    expect(race.racers[0].finish).toBeLessThan(120);
    expect(rank(race).map(r => r.id).sort()).toEqual([0, 1, 2, 3]);
    expect(race.racers.slice(1).some(r => r.actions.rocket + r.actions.mine > 0)).toBe(true);
  });
  it('cannot complete a lap by crossing only the finish, reversing, or skipping gates', () => {
    const race = active(), p = race.racers[0];
    for (const index of [270, 0, 180, 0]) { place(p, index); stepRace(race, allStopped); }
    expect(p.gates).toBe(0); expect(p.lap).toBe(0);
    place(p, 90); p.yaw += Math.PI; stepRace(race, allStopped); expect(p.gates).toBe(0);
    for (const index of [90, 180, 270, 0]) { place(p, index); stepRace(race, allStopped); }
    expect(p.gates).toBe(4); expect(p.lap).toBe(1);
    recover(race, p); expect(p.gates).toBe(4); expect(p.lap).toBe(1); expect(p.nextGate).toBe(1);
  });
  it('stops every timer and projectile while paused, including countdown', () => {
    const race = active(); act(race, race.racers[0], 'rocket'); race.phase = 'paused';
    const before = JSON.stringify(race); stepRace(race); expect(JSON.stringify(race)).toBe(before);
  });
  it('has a countdown before any driving or weapon actions', () => {
    const race = createRace(), x = race.racers[0].x;
    stepRace(race, { 0: { throttle: 1, action: 'rocket' } });
    expect(race.racers[0].x).toBe(x); expect(race.shots).toHaveLength(0); expect(race.time).toBe(0);
  });
  it('spends equipment once and refuses actions on cooldown or without resources', () => {
    const race = active(), p = race.racers[0];
    act(race, p, 'rocket'); act(race, p, 'rocket');
    expect(p.rockets).toBe(1); expect(race.shots).toHaveLength(1);
    p.cooldown = 0; p.energy = 34; act(race, p, 'shield');
    expect(p.shield).toBe(0); expect(p.energy).toBe(34);
    p.energy = 35; act(race, p, 'shield'); expect(p.shield).toBe(2); expect(p.energy).toBe(0);
    expect(legalActions(p)).toEqual(['race']);
  });
  it('resolves real mine damage and shield blocking with the same rules for all racers', () => {
    for (const protectedByShield of [false, true]) {
      const race = active(), target = race.racers[0]; target.speed = 20; target.shield = protectedByShield ? 2 : 0;
      race.mines.push({ id: 1, owner: 1, x: target.x, z: target.z, y: target.y, ttl: 10 });
      stepRace(race, allStopped);
      expect(race.mines).toHaveLength(0);
      expect(target.suffered).toBe(protectedByShield ? 0 : 1);
      expect(race.racers[1].hits).toBe(protectedByShield ? 0 : 1);
      expect(target.speed).toBe(protectedByShield ? 20 - (2 + 20 * 0.12) * STEP : (20 - (2 + 20 * 0.12) * STEP) * 0.35);
    }
  });
  it('projectiles hit opponents, expire, and never hit their owner', () => {
    const race = active(), p = race.racers[0];
    race.shots.push({ id: 1, owner: 1, x: p.x, z: p.z, y: p.y, yaw: p.yaw, ttl: 1 });
    stepRace(race, allStopped); expect(p.suffered).toBe(1); expect(race.shots).toHaveLength(0);
    race.mines.push({ id: 2, owner: 0, x: p.x, z: p.z, y: p.y, ttl: STEP / 2 });
    stepRace(race, allStopped); expect(p.suffered).toBe(1); expect(race.mines).toHaveLength(0);
  });
  it('reduces damage with plating', () => {
    const race = active(), p = race.racers[0]; p.upgrade = 'armor'; p.speed = 20;
    race.mines.push({ owner: 1, x: p.x, z: p.z, ttl: 1 }); stepRace(race, allStopped);
    expect(p.stun).toBeCloseTo(0.55); expect(p.speed).toBeGreaterThan(13);
  });
  it('pickups replenish once then enter a cooldown', () => {
    const race = active(), p = race.racers[0]; place(p, 35); p.rockets = 0; p.mines = 0; p.energy = 0;
    stepRace(race, allStopped); expect(p.rockets).toBe(1); expect(p.mines).toBe(1); expect(p.energy).toBeGreaterThan(25);
    stepRace(race, allStopped); expect(p.rockets).toBe(1); expect(race.pickups[0].ready).toBeGreaterThan(6);
  });
  it('starts with finite positions and penalizes leaving the road', () => {
    const race = active(), p = race.racers[0]; place(p, 0, 12); p.speed = 20;
    stepRace(race, allStopped); expect(p.speed).toBeLessThan(19.1);
    place(p, 0, 25); stepRace(race, allStopped); expect(p.index).toBe(4); expect(p.speed).toBe(0);
    expect(TRACK.every(p => Number.isFinite(p.x + p.y + p.z + p.yaw))).toBe(true);
  });
});

describe('garage persistence and purchases', () => {
  it('charges once, equips owned packages freely, and cannot overspend', () => {
    const garage = readGarage({ getItem: () => null });
    const bought = purchase(garage, 'engine'); expect(bought.credits).toBe(0); expect(bought.selected).toBe('engine');
    expect(purchase(bought, 'engine').credits).toBe(0); expect(purchase(bought, 'armor')).toBe(bought);
    expect(purchase(bought, 'handling').selected).toBe('handling'); expect(garage.credits).toBe(150);
    expect(purchase(garage, '__proto__')).toBe(garage);
  });
  it('validates saves and recovers from corruption or unavailable storage', () => {
    const valid = { version: 1, credits: 90, owned: ['handling', 'engine'], selected: 'engine' };
    expect(readGarage({ getItem: key => key === SAVE_KEY ? JSON.stringify(valid) : null })).toEqual(valid);
    for (const bad of ['oops', JSON.stringify({ ...valid, credits: -1 }), JSON.stringify({ ...valid, selected: 'armor' }), JSON.stringify({ ...valid, version: 2 })]) {
      expect(readGarage({ getItem: () => bad }).credits).toBe(150);
    }
    expect(readGarage({ getItem: () => { throw Error('blocked'); } }).selected).toBe('handling');
  });
});

describe('learning evidence', () => {
  it('bootstraps a continuing transition but not a terminal finish', () => {
    const p = { s: { boost: 2 }, next: { race: 4 } };
    updateQ(p, 's', 'boost', 1, 'next', ['race'], false, 0.5, 0.9);
    expect(p.s.boost).toBeCloseTo(3.3);
    p.s.boost = 2; updateQ(p, 's', 'boost', 1, 'next', ['race'], true, 0.5, 0.9);
    expect(p.s.boost).toBe(1.5);
  });
  it('ignores unavailable actions when bootstrapping', () => {
    const p = { next: { rocket: 999, race: 2 } };
    updateQ(p, 's', 'race', 0, 'next', ['race'], false, 1, 1); expect(p.s.race).toBe(2);
  });
  it('reproduces the shipped policy and its held-out evaluation from real races', () => {
    const result = train(600);
    expect(result.policy).toEqual(artifact.policy);
    expect(result.totalUpdates).toBe(artifact.totalUpdates);
    expect(evaluate(result.policy)).toEqual(artifact.evaluation);
    expect(artifact.evaluation.learned.finishes).toBe(12);
    expect(artifact.evaluation.learned.records.every(r => r.seed >= 9100)).toBe(true);
  }, 30000); // Executes the full training experiment; allow slower CI/parallel native suites.
});
