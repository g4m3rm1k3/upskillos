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
}
