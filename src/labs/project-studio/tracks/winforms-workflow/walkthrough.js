import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(`./answers/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

export const WORKFLOW_WALKTHROUGH = {
  'winforms-workflow/03-01-safe-files#Your turn: a valid file can still be an invalid request': {
    files: { 'FileChecks/Program.cs': read('file-cases.cs.txt') },
    wrong: [
      {
        name: 'accept parsed data without validating the values',
        files: { 'FileChecks/Program.cs': read('file-cases.cs.txt') },
        editFiles: { 'Core/DraftFiles.cs': [['string error = RequestRules.Validate(name, quantity);', 'string error = "";']] },
        fails: [0],
      },
      { name: 'omit the independently authored case', fails: [1] },
    ],
  },
  'winforms-workflow/03-02-file-dialogs#Your turn: protect the receiving method': {
    files: { 'FormDesk/MainForm.cs': read('guarded-form.cs.txt') },
    wrong: [
      { name: 'leave the receiving method unguarded', fails: [0] },
      {
        name: 'change a field before rejecting the draft',
        files: { 'FormDesk/MainForm.cs': read('guarded-form.cs.txt').replace('string error = RequestRules.Validate(draft.Name, draft.Quantity);\n        if (error != "") throw new InvalidDataException(error);', 'nameInput.Text = draft.Name;\n        string error = RequestRules.Validate(draft.Name, draft.Quantity);\n        if (error != "") throw new InvalidDataException(error);') },
        fails: [0],
      },
    ],
  },
};
