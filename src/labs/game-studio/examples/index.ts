// Every example game, in the order the Examples list shows them.
import type { GameExample } from './types';
import { potionHunt } from './potionHunt';
import { platformer } from './platformer';
import { breakout } from './breakout';
import { mazeChase } from './mazeChase';
import { zombieArena } from './zombieArena';
import { cliffWalk } from './cliffWalk';
import { breakoutLab } from './breakoutLab';
import { cribbage } from './cribbage';
import { ghostLab } from './ghostLab';
import { questBuddies } from './questBuddies';
import { questAdventure } from './questAdventure';

export type { GameExample };
export const EXAMPLES: GameExample[] = [potionHunt, platformer, breakout, mazeChase, zombieArena, cliffWalk, breakoutLab, ghostLab, cribbage, questBuddies, questAdventure];
