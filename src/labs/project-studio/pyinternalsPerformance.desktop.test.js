// Walks "Making Python Fast: Profiling to Production" like a learner; see walkCppTrack.js.
import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/pyinternals-performance.walkthrough.js';

await walkCppTrack({
  trackKey: 'pyinternals-performance',
  title: 'Making Python Fast: Profiling to Production',
  walkthrough: WALKTHROUGH,
  lessonIds: [
    '01-profiling',
    '02-numpy-speedups',
    '03-cython',
    '04-numba',
    '05-cffi-and-ctypes',
    '06-pybind11-in-ds',
    '07-production-patterns',
  ],
  needsCMake: (lesson) => lesson === '06-pybind11-in-ds',
});
