import { walkCppTrack } from './walkCppTrack.js';
import { WALKTHROUGH } from './tracks/dice-objects.walkthrough.js';
await walkCppTrack({ trackKey: 'dice-path-objects', title: 'C++ Games — Objects and Files', walkthrough: WALKTHROUGH, lessonIds: ["11-valid-construction","12-snapshots","13-rejection-and-exceptions","14-lifetimes-and-ownership","14b-file-persistence","14c-borrowed-pointers","14d-noncopyable-owners","15-headers-and-sources"] });
