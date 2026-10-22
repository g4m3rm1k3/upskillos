// Walks "C for Python Programmers" like a learner; see walkCppTrack.js.
import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/pyinternals-c-bridge.walkthrough.js';

await walkCppTrack({
  trackKey: 'pyinternals-c-bridge',
  title: 'C for Python Programmers',
  walkthrough: WALKTHROUGH,
  lessonIds: [
    '01-c-basics',
    '02-functions-and-headers',
    '03-pointers',
    '04-arrays-and-strings',
    '05-memory-management',
    '06-structs',
    '07-c-data-science-patterns',
  ],
  needsCMake: () => false,
});
