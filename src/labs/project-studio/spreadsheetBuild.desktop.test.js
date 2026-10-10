// The walkthrough of the bootcamp's spreadsheet track (walkSeries.js does the work). Needs Windows,
// Python, Node and Git; `page` checks run in Playwright's Chromium. Sprint 1 teaches
// `git config --global` and pushing, so Git settings and GitHub are the walkthrough's own.
import { walkSeries } from './walkSeries.js';
import { WALKTHROUGH } from './tracks/spreadsheet-build.walkthrough.js';

walkSeries({ name: 'Spreadsheet', prefix: 'spreadsheet-', walkthrough: WALKTHROUGH, envPrefix: 'SHEET', pages: true, isolatedGit: true });
