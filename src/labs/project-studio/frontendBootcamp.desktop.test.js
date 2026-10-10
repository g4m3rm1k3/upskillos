import { walkSeries } from './walkSeries.js';
import { WALKTHROUGH } from './tracks/frontend.walkthrough.js';

walkSeries({ name: 'Frontend Developer Bootcamp', prefix: 'frontend-', walkthrough: WALKTHROUGH, envPrefix: 'FRONTEND', pages: true });
