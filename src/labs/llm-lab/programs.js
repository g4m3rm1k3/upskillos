// The programs the Python tab can run: each an entry function in python/ with JSON arguments (see
// python-steps/PythonTab.jsx for what each field does).
import { SOURCES } from './source.js'

const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1

export const PROGRAMS = {
  pretrain: {
    label: '1.4 Pretrain a base model', file: 'pretrain.py', module: 'pretrain', function: 'pretrain',
    about: 'The tiny GPT trained on a notebook of 400 sums, every token counted: 200 steps here (the lesson runs 1,500).',
    kwargs: () => ({ steps: 200 }),
    watch: { losses: ['losses'] }, picture: 'losses',
    actions: ['losses.append(train_step('], actionLabel: 'Next step', actionTitle: 'Run until the next training step is done',
    episodeEnd: () => [['pretrain.py', lineOf('pretrain.py', 'return model, losses')]], endLabel: 'Finish',
  },
  answers: {
    label: '1.5 Pretrain, then test on all 100 questions', file: 'pretrain.py', module: 'pretrain', function: 'pretrain_and_test',
    about: 'Pretrain (300 steps here, to be quick), then greedy decoding after "a+b=" for every question, counting exact answers.',
    kwargs: () => ({ steps: 300 }), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  samples: {
    label: '2.1 Sample answers to 3+5', file: 'generate.py', module: 'generate', function: 'show_samples',
    about: 'Pretrain 300 steps, then answer 3+5 ten times by sampling. Pick a temperature: 0 is greedy, and gives the same answer ten times.',
    kwargs: () => ({ steps: 300, temperature: 1.0, top_k: null }), choices: { temperature: [0, 0.5, 1.0, 2.0] },
    watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  cache: {
    label: '2.3 Check the KV cache', file: 'generate.py', module: 'generate', function: 'check_cache',
    about: 'Pretrain 300 steps, then compare the cached forward pass with the full one at every position, and generate all 100 answers both ways.',
    kwargs: () => ({ steps: 300 }), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  speed: {
    label: '2.4 Time it with and without the cache', file: 'generate.py', module: 'generate', function: 'time_both',
    about: 'Write the same text both ways on a random model and time each. Pick the length: the speed-up grows with it.',
    kwargs: () => ({ length: 32, seed: 1 }), choices: { length: [16, 32, 64] },
    watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
}
