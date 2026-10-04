// Training off the editor's page (ml/qlearning.ts or ml/cem.ts on ml/env.ts): the game's scripts expect globals
// such as Node and scene, which must not touch the page, and training takes seconds to minutes.
// In:  { project, spec, method, options }
// Out: { type: 'describe' | 'random' | 'generation' | 'episode' | 'done' | 'compareRun' | 'compareDone' | 'error', … }
import { GameEnv } from './env';
import { cem, evaluate, type CemOptions } from './cem';
import { evaluateQ, qLearning, type QOptions } from './qlearning';
import { loadScripts } from '../runtime/scripts';
import { runOnce, type CompareConfig } from './compare';
import { evaluateMoves, greedyMoves, linearQLearning, randomMoves, type LinearQOptions } from './linearq';
import type { Project } from '../core/types';
import type { EnvSpec } from './env';

type Job = { project: Project; spec: EnvSpec } & ({ method: 'q'; options: QOptions } | { method: 'cem'; options: CemOptions } | { method: 'linear-q'; options: LinearQOptions } | { method: 'compare'; configs: CompareConfig[]; seeds: number[] });

self.onmessage = async (e: MessageEvent<Job>) => {
  const job = e.data;
  try {
    const env = await GameEnv.create(job.project, job.spec, async (p) => (await loadScripts(p.scripts)).classes);
    // What the agent can do and sees, by name, and its bins: a script agent's come from its script.
    postMessage({ type: 'describe', actions: env.actionNames, observation: env.observationNames, bins: env.bins, features: env.featureNames });
    // A turn-based agent's random play picks among its legal moves; it varies more from game to game, so it plays more.
    postMessage({ type: 'random', score: env.turnBased ? evaluateMoves(env, randomMoves, 100, 7) : evaluate(env, 'random', 3, 7) });
    if (job.method === 'linear-q') {
      const run = linearQLearning(env, job.options);
      let r = run.next();
      for (; !r.done; r = run.next()) postMessage({ type: 'episode', ...r.value });
      postMessage({ type: 'done', policy: r.value, score: evaluateMoves(env, greedyMoves(r.value), 100, 7) });
    } else if (job.method === 'compare') {
      // Every setting meets every seed, one run at a time, so the page can draw the comparison as it fills in.
      for (const seed of job.seeds) for (let config = 0; config < job.configs.length; config++) {
        const r = runOnce(env, job.configs[config].options, seed);
        postMessage({ type: 'compareRun', config, seed, ...r });
      }
      postMessage({ type: 'compareDone' });
    } else if (job.method === 'q') {
      const run = qLearning(env, job.options);
      let r = run.next();
      // Each episode's numbers, and on a check a copy of the table so far, for the dialog to draw.
      for (; !r.done; r = run.next()) postMessage({ type: 'episode', ...r.value });
      // A turn-based agent's games vary more, so its score, like its random play's, is over 100 games.
      postMessage({ type: 'done', policy: r.value, score: evaluateQ(env, r.value, env.turnBased ? 100 : 3, 7) });
    } else {
      const run = cem(env, job.options);
      let r = run.next();
      for (; !r.done; r = run.next()) postMessage({ type: 'generation', ...r.value });
      postMessage({ type: 'done', policy: r.value, score: evaluate(env, r.value, 3, 7) });
    }
  } catch (err) {
    postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
