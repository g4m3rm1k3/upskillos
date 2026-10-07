import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/dice-project.walkthrough.js';
await walkCppTrack({ trackKey: 'dice-path-project', title: 'C++ Games — Build the Project', walkthrough: WALKTHROUGH, lessonIds: ["16-two-executables","17-build-dependencies","18-deterministic-game","19-command-lines","19b-repeatable-dice","19c-terminal-match"] });
