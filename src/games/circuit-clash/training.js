import { STEP, createRace, stepRace, drive, observe, legalActions, chooseAction, updateQ, rank, UPGRADES, place } from './simulation.js';

// Tactical decisions last half a simulated second. Steering stays a fixed controller.
// Opponents are frozen within each episode, refreshed only at batch boundaries.
export function train(episodes = 600, progress = () => {}) {
  const policy = {};
  let snapshot = {}, totalUpdates = 0;
  for (let episode = 0; episode < episodes; episode++) {
    if (episode % 12 === 0) snapshot = JSON.parse(JSON.stringify(policy));
    const race = createRace({ seed: episode + 100, upgrade: Object.keys(UPGRADES)[episode % 3],
      mode: episode % 2 ? 'learned' : 'scripted', policy: snapshot });
    race.countdown = 0; race.phase = 'racing';
    const learner = race.racers[0];
    // Rotate the learner through the grid; otherwise it rarely observes a rival ahead.
    const slot = episode % 4, other = race.racers[slot];
    const first = { index: learner.index, lane: learner.lane };
    place(learner, other.index, other.lane); learner.lane = other.lane; learner.progress = -slot * 3;
    if (slot !== 0) { place(other, first.index, first.lane); other.lane = first.lane; other.progress = 0; }
    const epsilon = Math.max(0.08, 0.8 * (1 - episode / episodes));
    while (race.phase !== 'finished') {
      const state = observe(race, learner);
      const action = chooseAction(policy, state, legalActions(learner), race.rng, epsilon);
      const rewardBefore = learner.reward;
      for (let tick = 0; tick < 30 && race.phase !== 'finished'; tick++) {
        stepRace(race, { 0: drive(race, learner, tick === 0 ? action : 'race') }, STEP);
      }
      // A budget timeout truncates an episode; a finish is a terminal game state.
      updateQ(policy, state, action, learner.reward - rewardBefore, observe(race, learner), legalActions(learner), learner.finish != null);
      totalUpdates++;
    }
    if (episode % 12 === 11) progress({ episodes: episode + 1, totalUpdates, states: Object.keys(policy).length });
  }
  return { version: 1, episodes, totalUpdates, seedStart: 100, decisionSeconds: 0.5, policy };
}

export function evaluate(policy, seeds = Array.from({ length: 12 }, (_, i) => 9100 + i)) {
  const result = {};
  for (const controller of ['learned', 'scripted']) {
    const records = seeds.map(seed => {
      const race = createRace({ seed, mode: 'scripted', policy });
      race.countdown = 0; race.phase = 'racing';
      const player = race.racers[0];
      while (race.phase !== 'finished') {
        // Other karts stay scripted for a fixed evaluation environment.
        race.mode = controller;
        const input = drive(race, player);
        race.mode = 'scripted';
        stepRace(race, { 0: input });
      }
      return { seed, seconds: player.finish, rank: rank(race).findIndex(r => r.id === 0) + 1,
        hits: player.hits, suffered: player.suffered, actions: player.actions };
    });
    result[controller] = {
      finishes: records.filter(r => r.seconds != null).length,
      meanSeconds: records.reduce((sum, r) => sum + (r.seconds ?? 180), 0) / records.length,
      meanRank: records.reduce((sum, r) => sum + r.rank, 0) / records.length, records,
    };
  }
  return result;
}
