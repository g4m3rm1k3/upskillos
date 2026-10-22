// Walks "C++ Data Structures Powering Data Science" like a learner; see walkCppTrack.js.
import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/pyinternals-cpp-ds.walkthrough.js';

await walkCppTrack({
  trackKey: 'pyinternals-cpp-ds',
  title: 'C++ Data Structures Powering Data Science',
  walkthrough: WALKTHROUGH,
  lessonIds: [
    '01-cpp-vs-c-for-python',
    '02-arrays-and-memory-layout',
    '03-templates-and-generics',
    '04-stl-containers',
    '05-simd-and-vectorization',
    '06-pytorch-internals-tour',
  ],
  needsCMake: () => false,
});
