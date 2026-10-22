import { walkSeries } from './walkSeries.js';
import { WALKTHROUGH } from './tracks/winforms.walkthrough.js';

walkSeries({ name: 'WinForms to React', prefix: 'winforms-', walkthrough: WALKTHROUGH, envPrefix: 'WINFORMS' });
