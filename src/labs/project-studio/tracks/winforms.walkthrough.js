import { START_WALKTHROUGH } from './winforms-start.walkthrough.js';
import { FORMS_WALKTHROUGH } from './winforms-forms/walkthrough.js';
import { WORKFLOW_WALKTHROUGH } from './winforms-workflow/walkthrough.js';
import { REACT_WALKTHROUGH } from './winforms-react/walkthrough.js';

export const WALKTHROUGH = { ...START_WALKTHROUGH, ...FORMS_WALKTHROUGH, ...WORKFLOW_WALKTHROUGH, ...REACT_WALKTHROUGH };
