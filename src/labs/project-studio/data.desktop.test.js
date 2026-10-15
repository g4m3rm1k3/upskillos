import { walkSeries } from './walkSeries.js';
import { WALKTHROUGH } from './tracks/data.walkthrough.js';

walkSeries({ name: 'Database Engineering', prefix: 'data-', walkthrough: WALKTHROUGH, envPrefix: 'DATA', unix: process.platform !== 'win32' });
