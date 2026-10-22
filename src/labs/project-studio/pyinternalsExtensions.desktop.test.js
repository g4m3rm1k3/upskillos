// Walks "Writing C Extensions for Python" like a learner; see walkCppTrack.js.
import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/pyinternals-extensions.walkthrough.js';

await walkCppTrack({
  trackKey: 'pyinternals-extensions',
  title: 'Writing C Extensions for Python',
  walkthrough: WALKTHROUGH,
  lessonIds: [
    '01-c-extension-anatomy',
    '02-parse-and-build',
    '03-error-handling',
    '04-reference-counts',
    '05-numpy-c-api',
    '06-cpp-extension',
  ],
  needsCMake: () => false,
});
