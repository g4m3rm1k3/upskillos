// Example: Quest Buddies: Adventure, the RPG starter with chapter 12's systems (docs/game-studio-starters-plan.md):
//   12.1  classes and stats: a class is a row of data; levels need more experience each time; each level a skill point
//   12.2  items and loot: a weighted loot table rolled with a seeded random generator kept in state; weapons with
//         generated name parts (affixes) that add to their bonus; potions
//   12.3  combat: an attack with a cooldown and a reach, damage from stats, hit flashes (tweens and modulate), knockback,
//         particles, slimes that chase round walls (findPath), hurting, dying and waking at the campfire
//   12.4  a buddy that learns by Q-learning; 12.5 a buddy that copies you; 12.6 enemies matched to your rating
// Its code is chapter 11's finished game and then chapter 12's task steps, in order (examples/questAdventureBuild.ts).

import type { GameExample } from './types';
import { QA_FINISHED, QA_IMAGES } from './questAdventureBuild';

export const questAdventure: GameExample = {
  id: 'quest-adventure',
  title: 'Quest Buddies: Adventure',
  blurb: 'Quest Buddies with classes (Warrior, Ranger, Mage) and levels, slimes to fight, loot rolled from a table, weapons to equip and potions to drink. Chapter 12 builds it, and then a buddy that learns.',
  art: 'Kenney Tiny Dungeon (CC0)',
  images: QA_IMAGES,
  code: QA_FINISHED,
  guide: [
    'Press ▶ Run. New game opens the class menu: three Buttons made by title.js from the table in scripts/classes.js. Choose one. The keys: arrows or WASD walk, E talks, J attacks, I opens the bag, K the buddy\'s skills, T teaches the buddy (then 1 to 4), Esc pauses.',
    'The forest has three slimes. J (or X) attacks the way you last walked. They chase you round the walls (findPath in scripts/slime.js) and hurt you on touch.',
    'Beat a slime: it flashes and is knocked back when hit (a tween on its modulate, a burst of particles), then drops loot from the table in scripts/loot.js and gives you experience. Four experience for a slime; level 2 needs 10.',
    'Open the bag (I): weapons and potions are buttons. Enter equips a weapon or drinks a potion.',
    'Open scripts/classes.js and add a fourth class: one more row, and it appears on the class menu.',
    'Run › Clear saved games starts you fresh.',
  ],
};
