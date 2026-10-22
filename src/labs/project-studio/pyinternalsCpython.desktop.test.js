// Walks "Python Internals — Inside CPython" like a learner; see walkCppTrack.js.
import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/pyinternals-cpython.walkthrough.js';

await walkCppTrack({
  trackKey: 'pyinternals-cpython',
  title: 'Python Internals — Inside CPython',
  walkthrough: WALKTHROUGH,
  lessonIds: [
    '01-python-object-model',
    '02-reference-counting',
    '03-the-gil',
    '04-bytecode',
    '05-c-types-from-python',
    '06-pyobject-in-c',
  ],
  needsCMake: () => false,
});
