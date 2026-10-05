import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/dice-cpp.walkthrough.js';

await walkCppTrack({
  trackKey: 'dice-cpp',
  title: 'C++ Dice Duel for Python developers',
  walkthrough: WALKTHROUGH,
  lessonIds: ["01-from-python-to-a-binary","02-state-and-rules","03-randomness-and-input","04-play-the-terminal-game","05-the-agent-environment-boundary","06-addressing-the-q-table","07-exploration-and-expectation","08-the-q-learning-update","09-training-episodes","10-evaluate-without-learning","11-save-and-validate","12-play-a-learned-opponent"],
});
