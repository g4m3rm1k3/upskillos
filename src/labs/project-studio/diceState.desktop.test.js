import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/dice-state.walkthrough.js';
await walkCppTrack({ trackKey: 'dice-path-state', title: 'C++ Games — State and Tests', walkthrough: WALKTHROUGH, lessonIds: ["06-copies-and-references","07-players-and-collections","08-actions-and-loops","09-tests-that-fail","10-score-class"] });
