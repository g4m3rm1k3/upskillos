// Example: Quest Buddies, the RPG starter (docs/game-studio-starters-plan.md). Chapter 11 of the course builds it
// one feature at a time, and this example's code IS those steps, in order, from an empty project
// (examples/questBuddiesBuild.ts), so the finished game and the lessons cannot drift apart.
//
// What it shows, by lesson:
//   11.2  maps from tiles and a hero who walks in them; doors that say where they lead, and named spawn points
//   11.3  game state that lasts: `state` holds the map, hit points, gold, the bag and the quests
//   11.4  saving and loading: the campfire saves into a slot; the title screen's Continue loads it
//   11.5  menus: the title screen and the pause menu are Panels with Buttons in a VBoxContainer
//   11.6  a health bar and an inventory list: a ProgressBar and a list that lays itself out
//   11.7  dialogue and a quest: a typewriter dialogue box, and a quest as a state machine
//   11.8  sound effects made from numbers, played by AudioStreamPlayers
//
// Built only with the real Scene API and the engine's real nodes and scripts: nothing here is special-cased (ADR 12).

import type { GameExample } from './types';
import { QB_FINISHED, QB_IMAGES } from './questBuddiesBuild';

export const questBuddies: GameExample = {
  id: 'quest-buddies',
  title: 'Quest Buddies',
  blurb: 'The RPG starter: a title screen, two maps joined by doors, a quest from a ranger, a campfire that saves the game, a HUD with a health bar, a bag, a pause menu and typewriter dialogue, and sound effects made from numbers. Chapter 11 builds it a feature at a time.',
  art: 'Kenney Tiny Dungeon (CC0)',
  images: QB_IMAGES,
  code: QB_FINISHED,
  guide: [
    'Press ▶ Run (F5). On the title screen the arrow keys and Enter work the menu (or click). Choose New game.',
    'Walk with the arrow keys or WASD. Pick up the coin, then go up to the ranger: E: talk appears. Press E to talk, and E again to read on. She gives you a quest.',
    'The door on the east wall leads to the forest: scripts/door_to_forest.js says where, and which spawn point (Spawns/FromTown) to stand on there. The game remembers everything in state (scripts/game.js lists it), so your gold and the quest are still there when you arrive.',
    'Find the amulet in the forest, then walk onto the campfire: it saves the game (Output says "Saved to slot \\"slot1\\""). Stop, run again, and choose Continue: you wake at the campfire with the amulet in your bag (press I).',
    'Esc opens the pause menu: Panel, Buttons in a VBoxContainer, and the focus on Resume so the keys work. Open scenes/hud.scene to see the whole HUD; it is put into both maps as an instance.',
    'Open assets/sounds/coin.wav in Files: a sound made from a few numbers, beside its waveform. Change "to" and press ▶ Hear it.',
    'Run › Clear saved games starts you fresh.',
  ],
};
