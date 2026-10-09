// Walks My Series the way a learner would (walkSeries.js explains how). Needs Windows.
// MYSERIES_UNTIL, MYSERIES_KEEP, MYSERIES_START and MYSERIES_FROM walk part of the series.
import { walkSeries } from './walkSeries.js';
import { WALKTHROUGH } from './tracks/myseries.walkthrough.js';

walkSeries({ name: 'My Series', prefix: 'myseries-', walkthrough: WALKTHROUGH, envPrefix: 'MYSERIES' });
