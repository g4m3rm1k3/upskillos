// Renderer-independent, fixed-step reference rules. No DOM, clock or global RNG.
export const STEP = 1 / 60;
export const LAPS = 2;
export const ACTIONS = ['race', 'rocket', 'mine', 'shield', 'boost'];
export const COLORS = ['#62f3c6', '#ff657e', '#ffd06b', '#9d8bff'];
export const NAMES = ['You', 'Ember', 'Volt', 'Echo'];
export const UPGRADES = {
  engine: { label: 'Turbo engine', detail: 'Higher top speed; slower steering.', speed: 31, turn: 1.7, armor: 1 },
  handling: { label: 'Rally chassis', detail: 'Tighter steering; balanced speed.', speed: 28, turn: 2.4, armor: 1 },
  armor: { label: 'Impact plating', detail: 'Half the hit penalty; lower top speed.', speed: 26, turn: 2, armor: 0.5 },
};
export const wrap = (v, n) => ((v % n) + n) % n;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function random(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}

// Analytic closed course with an S-bend and elevation; samples also drive the mesh.
export function trackPoint(t) {
  const a = t * Math.PI * 2;
  return { x: 82 * Math.sin(a) + 15 * Math.sin(3 * a), y: 5 + 4 * Math.sin(2 * a) + 2 * Math.cos(a), z: 64 * Math.cos(a) };
}
export const TRACK = Array.from({ length: 360 }, (_, i) => {
  const p = trackPoint(i / 360), q = trackPoint((i + 0.1) / 360);
  return { ...p, yaw: Math.atan2(q.x - p.x, q.z - p.z) };
});
export function nearest(x, z, hint = null) {
  let best = Infinity, index = 0;
  const count = hint == null ? TRACK.length : 25;
  for (let n = 0; n < count; n++) {
    const i = hint == null ? n : wrap(hint + n - 12, TRACK.length), p = TRACK[i];
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) { best = d; index = i; }
  }
  const p = TRACK[index];
  return { index, distance: Math.sqrt(best), offset: (x - p.x) * Math.cos(p.yaw) - (z - p.z) * Math.sin(p.yaw) };
}
export function createRace({ seed = 1, upgrade = 'handling', policy = {}, mode = 'learned' } = {}) {
  const rng = random(seed);
  return {
    seed, rng, time: 0, countdown: 3, phase: 'countdown', mode, policy,
    shots: [], mines: [], effects: [], events: [], nextId: 1,
    pickups: [35, 95, 155, 215, 275, 335].map(index => ({ index, ready: 0 })),
    racers: NAMES.map((name, id) => {
      const index = wrap(-id * 3, 360), p = TRACK[index], lane = (id % 2 ? -2 : 2) + (rng() - 0.5) * 1.5;
      return { id, name, color: COLORS[id], x: p.x + Math.cos(p.yaw) * lane, z: p.z - Math.sin(p.yaw) * lane,
        y: p.y, yaw: p.yaw, speed: 0, index, nextGate: 1, gates: 0, lap: 0, progress: -id * 3,
        upgrade: id === 0 ? upgrade : Object.keys(UPGRADES)[id - 1], rockets: 2, mines: 2, energy: 100,
        shield: 0, boost: 0, cooldown: 0, stun: 0, finish: null, hits: 0, suffered: 0, decision: 0, action: 'race',
        lane, reward: 0, actions: Object.fromEntries(ACTIONS.map(a => [a, 0])) };
    }),
  };
}
export function emit(race, text) {
  race.events.unshift({ text, time: race.time });
  race.events.length = Math.min(5, race.events.length);
}
export function place(racer, index, lane = 0) {
  const p = TRACK[wrap(index, 360)];
  Object.assign(racer, { x: p.x + Math.cos(p.yaw) * lane, z: p.z - Math.sin(p.yaw) * lane, y: p.y, yaw: p.yaw, index: wrap(index, 360) });
}
export function recover(race, racer) {
  // Return behind the next required gate, never advance checkpoint credit.
  place(racer, wrap((racer.nextGate - 1) * 90 + 4, 360));
  racer.speed = 0;
  racer.progress = racer.gates * 90 + 4;
  racer.reward -= 3;
  if (racer.id === 0) emit(race, 'Recovered to the last checkpoint');
}
function aheadOf(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const forward = dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw);
  const lateral = Math.abs(dx * Math.cos(a.yaw) - dz * Math.sin(a.yaw));
  return forward > 0 && forward < 32 && lateral < 6;
}
export function observe(race, racer) {
  const others = race.racers.filter(r => r.id !== racer.id && r.finish == null);
  const ahead = others.some(r => aheadOf(racer, r));
  const behind = others.some(r => aheadOf(r, racer));
  const danger = race.shots.some(s => s.owner !== racer.id && Math.hypot(s.x - racer.x, s.z - racer.z) < 18)
    || race.mines.some(m => m.owner !== racer.id && Math.hypot(m.x - racer.x, m.z - racer.z) < 12);
  return racer.upgrade + ':' + [ahead, behind, danger, racer.rockets > 0, racer.mines > 0, racer.energy >= 35].map(Number).join('');
}
export function legalActions(racer) {
  const a = ['race'];
  if (racer.cooldown <= 0) {
    if (racer.rockets > 0) a.push('rocket');
    if (racer.mines > 0) a.push('mine');
    if (racer.energy >= 35) a.push('shield', 'boost');
  }
  return a;
}
export function chooseAction(policy, state, legal, rng, epsilon = 0) {
  if (rng() < epsilon) return legal[Math.floor(rng() * legal.length)];
  const row = policy[state] || {};
  let best = -Infinity, choices = [];
  for (const action of legal) {
    const q = row[action] || 0;
    if (q > best) { best = q; choices = [action]; }
    else if (q === best) choices.push(action);
  }
  return choices[Math.floor(rng() * choices.length)];
}
export function updateQ(policy, state, action, reward, nextState, legal, terminal, alpha = 0.18, gamma = 0.93) {
  const row = policy[state] ||= {};
  const next = terminal ? 0 : Math.max(...legal.map(a => policy[nextState]?.[a] || 0));
  row[action] = (row[action] || 0) + alpha * (reward + gamma * next - (row[action] || 0));
}
export function scriptedAction(race, racer) {
  const s = observe(race, racer).split(':')[1], legal = legalActions(racer);
  const desired = s[2] === '1' ? 'shield' : s[0] === '1' ? 'rocket' : s[1] === '1' ? 'mine' : 'boost';
  return legal.includes(desired) ? desired : 'race';
}
export function drive(race, racer, tactical = null) {
  const target = TRACK[wrap(racer.index + 10 + Math.floor(racer.speed / 5), 360)];
  const lane = racer.lane;
  const yaw = Math.atan2(target.x + Math.cos(target.yaw) * lane - racer.x, target.z - Math.sin(target.yaw) * lane - racer.z);
  const error = angleDelta(yaw, racer.yaw);
  let action = tactical;
  if (action == null) {
    if (racer.decision <= 0) {
      racer.action = race.mode === 'scripted' ? scriptedAction(race, racer)
        : chooseAction(race.policy, observe(race, racer), legalActions(racer), race.rng);
      racer.decision = 0.5;
      action = racer.action;
    } else action = 'race';
  }
  return { throttle: Math.abs(error) < 0.8 ? 1 : 0.3, brake: Math.abs(error) > 1.1, steer: clamp(error * 2.2, -1, 1), action };
}
export function act(race, racer, action) {
  if (action === 'race' || !legalActions(racer).includes(action)) return;
  racer.actions[action]++;
  racer.action = action;
  racer.cooldown = 0.6;
  if (action === 'boost' || action === 'shield') {
    racer.energy -= 35;
    racer[action] = action === 'boost' ? 1.6 : 2;
    return;
  }
  if (action === 'rocket') {
    racer.rockets--;
    const target = race.racers.filter(r => r.id !== racer.id && r.finish == null && aheadOf(racer, r))
      .sort((a, b) => Math.hypot(a.x - racer.x, a.z - racer.z) - Math.hypot(b.x - racer.x, b.z - racer.z))[0];
    race.shots.push({ id: race.nextId++, owner: racer.id, x: racer.x + Math.sin(racer.yaw) * 3,
      z: racer.z + Math.cos(racer.yaw) * 3, y: racer.y + 1, yaw: racer.yaw, target: target?.id, ttl: 3 });
  } else {
    racer.mines--;
    race.mines.push({ id: race.nextId++, owner: racer.id, x: racer.x - Math.sin(racer.yaw) * 3,
      z: racer.z - Math.cos(racer.yaw) * 3, y: racer.y + 0.3, ttl: 18 });
  }
}
function hit(race, target, owner, position) {
  race.effects.push({ ...position, ttl: 0.5, color: target.shield > 0 ? '#62d9ff' : '#ffb359' });
  if (target.shield > 0) {
    target.reward += 2;
    emit(race, `${target.name} blocked a hit`);
    return;
  }
  const armor = UPGRADES[target.upgrade].armor;
  target.speed *= 1 - 0.65 * armor;
  target.stun = 1.1 * armor;
  target.suffered++;
  target.reward -= 4 * armor;
  const attacker = race.racers[owner];
  attacker.reward += 8;
  attacker.hits++;
  emit(race, `${attacker.name} hit ${target.name}`);
}
export function rank(race) {
  return [...race.racers].sort((a, b) => a.finish != null || b.finish != null
    ? (a.finish ?? Infinity) - (b.finish ?? Infinity) || a.id - b.id : b.progress - a.progress);
}
export function stepRace(race, controls = {}, dt = STEP) {
  if (race.phase === 'finished' || race.phase === 'paused') return;
  if (race.countdown > 0) {
    race.countdown = Math.max(0, race.countdown - dt);
    if (!race.countdown) race.phase = 'racing';
    return;
  }
  race.time += dt;
  // All controls are chosen from the previous state before any kart moves.
  const commands = race.racers.map(r => controls[r.id] || drive(race, r));
  for (const r of race.racers) {
    if (r.finish != null) continue;
    const c = commands[r.id], specs = UPGRADES[r.upgrade];
    for (const key of ['shield', 'boost', 'cooldown', 'stun', 'decision']) r[key] = Math.max(0, r[key] - dt);
    r.energy = Math.min(100, r.energy + 6 * dt);
    act(race, r, c.action || 'race');
    if (c.recover) { recover(race, r); continue; }
    r.speed = clamp(r.speed + ((c.throttle || 0) * 15 - (c.brake ? 26 : 0) - 2 - r.speed * 0.12) * dt, 0,
      specs.speed + (r.boost > 0 ? 14 : 0));
    if (r.boost > 0) r.speed = Math.min(specs.speed + 14, r.speed + 22 * dt);
    if (r.stun > 0) r.speed *= 1 - 1.5 * dt;
    r.yaw += (c.steer || 0) * specs.turn * Math.min(1, r.speed / 9) * dt;
    r.x += Math.sin(r.yaw) * r.speed * dt;
    r.z += Math.cos(r.yaw) * r.speed * dt;
    const near = nearest(r.x, r.z, r.index);
    r.index = near.index;
    r.y = TRACK[r.index].y;
    if (near.distance > 7) r.speed *= 1 - 2.8 * dt;
    if (near.distance > 18) { recover(race, r); continue; }
    const gate = TRACK[r.nextGate * 90];
    if (near.distance < 8 && Math.hypot(r.x - gate.x, r.z - gate.z) < 9
      && Math.cos(angleDelta(r.yaw, gate.yaw)) > 0) {
      r.gates++;
      if (r.nextGate === 0) {
        r.lap++;
        if (r.lap === LAPS) {
          r.finish = race.time;
          r.reward += 10;
          emit(race, `${r.name} finished`);
        }
      }
      r.nextGate = (r.nextGate + 1) % 4;
    }
    const within = clamp(wrap(r.index - wrap(r.nextGate - 1, 4) * 90 + 180, 360) - 180, -12, 90);
    const progress = r.gates * 90 + within;
    r.reward += clamp(progress - r.progress, -1, 2) * 0.04 - dt * 0.02;
    r.progress = progress;
  }
  for (let i = 0; i < race.racers.length; i++) for (let j = i + 1; j < race.racers.length; j++) {
    const a = race.racers[i], b = race.racers[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (a.finish == null && b.finish == null && d > 0 && d < 2.3) {
      const shift = (2.3 - d) / 2;
      a.x -= dx / d * shift; a.z -= dz / d * shift;
      b.x += dx / d * shift; b.z += dz / d * shift;
      a.speed *= 0.99; b.speed *= 0.99;
    }
  }
  for (const shot of race.shots) {
    const target = race.racers[shot.target];
    if (target && target.finish == null) shot.yaw += clamp(angleDelta(Math.atan2(target.x - shot.x, target.z - shot.z), shot.yaw), -2 * dt, 2 * dt);
    shot.x += Math.sin(shot.yaw) * 48 * dt; shot.z += Math.cos(shot.yaw) * 48 * dt;
    shot.y = TRACK[nearest(shot.x, shot.z).index].y + 0.8;
  }
  for (const list of [race.shots, race.mines]) for (const item of list) {
    item.ttl -= dt;
    for (const r of race.racers) {
      if (item.ttl > 0 && r.id !== item.owner && r.finish == null && Math.hypot(item.x - r.x, item.z - r.z) < 2.5) {
        hit(race, r, item.owner, item); item.ttl = 0;
      }
    }
  }
  race.shots = race.shots.filter(s => s.ttl > 0);
  race.mines = race.mines.filter(s => s.ttl > 0);
  race.effects = race.effects.filter(e => (e.ttl -= dt) > 0);
  for (const p of race.pickups) {
    p.ready = Math.max(0, p.ready - dt);
    if (p.ready > 0) continue;
    const location = TRACK[p.index];
    // Rotate contention priority each simulation tick instead of privileging player zero.
    const start = Math.floor(race.time / dt) % 4;
    for (let n = 0; n < 4; n++) {
      const r = race.racers[(start + n) % 4];
      if (r.finish == null && Math.hypot(r.x - location.x, r.z - location.z) < 5) {
        r.rockets = Math.min(4, r.rockets + 1); r.mines = Math.min(4, r.mines + 1);
        r.energy = Math.min(100, r.energy + 25); p.ready = 7; break;
      }
    }
  }
  if (race.racers[0].finish != null || race.time >= 180) race.phase = 'finished';
}

export const SAVE_KEY = 'circuit-clash:garage:v1';
export function readGarage(storage) {
  try {
    const data = JSON.parse(storage.getItem(SAVE_KEY));
    if (data?.version === 1 && Number.isInteger(data.credits) && data.credits >= 0 && data.credits <= 100000
      && Array.isArray(data.owned) && data.owned.includes('handling') && data.owned.every(k => Object.hasOwn(UPGRADES, k))
      && data.owned.includes(data.selected)) return data;
  } catch { /* Invalid or unavailable local storage starts a usable session. */ }
  return { version: 1, credits: 150, owned: ['handling'], selected: 'handling' };
}
export function purchase(garage, key) {
  if (!Object.hasOwn(UPGRADES, key)) return garage;
  if (garage.owned.includes(key)) return { ...garage, selected: key };
  if (garage.credits < 150) return garage;
  return { ...garage, credits: garage.credits - 150, owned: [...garage.owned, key], selected: key };
}
