// Walks the Terminal series the way a learner would (walkSeries.js explains how). Needs macOS or
// Linux: the lessons' commands are zsh. TERMSERIES_UNTIL, TERMSERIES_KEEP, TERMSERIES_START and TERMSERIES_FROM walk part of it.
import { walkSeries } from './walkSeries.js';
import { WALKTHROUGH } from './tracks/term.walkthrough.js';

walkSeries({ name: 'The Terminal', prefix: 'term-', walkthrough: WALKTHROUGH, envPrefix: 'TERMSERIES', projectName: 'shelf', unix: true });
