import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/dice-start.walkthrough.js';
await walkCppTrack({ trackKey: 'dice-path-start', title: 'Dice first foundations', walkthrough: WALKTHROUGH, lessonIds: ["00-meet-dice-duel","01-source-to-program","02-values-and-types","03-input-and-failure","04-decisions-and-boundaries","05-functions-and-results"] });
