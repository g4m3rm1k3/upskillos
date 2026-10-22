import fs from 'node:fs';

const chapter = 'winforms-forms';
const read = (name) => fs.readFileSync(new URL(`./answers/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const change = (name, from, to) => {
  const source = read(name);
  if (!source.includes(from)) throw new Error(`Missing forms answer mutation: ${from}`);
  return source.replace(from, to);
};

export const FORMS_WALKTHROUGH = {
  [`${chapter}/02-01-first-window#Open one window`]: {
    wrong: [{ name: 'caption not set', edit: [['Text = "FormDesk";', 'Text = "Untitled";']], fails: [0] }],
  },
  [`${chapter}/02-01-first-window#Your turn: make the request window recognizable`]: {
    files: { 'FormDesk/MainForm.cs': read('window.cs') },
    wrong: [{
      name: 'title changed but no minimum size',
      files: { 'FormDesk/MainForm.cs': change('window.cs', 'MinimumSize = new Size(500, 320);', '') },
      fails: [0],
    }],
  },
  [`${chapter}/02-02-controls-and-layout#Put controls in a table`]: {
    wrong: [{ name: 'name field does not fill its growing cell', edit: [['nameInput.Dock = DockStyle.Fill;', 'nameInput.Dock = DockStyle.None;']], fails: [0] }],
  },
  [`${chapter}/02-02-controls-and-layout#Add quantity and feedback`]: {
    wrong: [{ name: 'preview has no access key', edit: [['previewButton.Text = "&Preview";', 'previewButton.Text = "Preview";']], fails: [0] }],
  },
  [`${chapter}/02-02-controls-and-layout#Your turn: add a useful keyboard hint`]: {
    files: { 'FormDesk/MainForm.cs': read('layout.cs') },
    wrong: [{
      name: 'help is clipped by a fixed-size label',
      files: { 'FormDesk/MainForm.cs': change('layout.cs', 'helpLabel.AutoSize = true;', 'helpLabel.AutoSize = false;') },
      fails: [0],
    }],
  },
  [`${chapter}/02-03-events-and-values#Subscribe a method to a click`]: {
    wrong: [{ name: 'handler exists but is not subscribed', edit: [['previewButton.Click += PreviewButton_Click;', '']], fails: [0] }],
  },
  [`${chapter}/02-03-events-and-values#Your turn: reset a draft`]: {
    files: { 'FormDesk/MainForm.cs': read('events.cs') },
    wrong: [{
      name: 'reset only changes the status',
      files: { 'FormDesk/MainForm.cs': change('events.cs', 'nameInput.Text = "";', '') },
      fails: [0],
    }],
  },
  [`${chapter}/02-04-validation-and-dialogs#Attach errors to the fields that need attention`]: {
    wrong: [{ name: 'name rule calculated but not displayed', edit: [['errors.SetError(nameInput, nameError);', '']], fails: [0] }],
  },
  [`${chapter}/02-04-validation-and-dialogs#Build a preview that has two outcomes`]: {
    wrong: [{ name: 'Cancel would confirm the draft', edit: [['cancelButton.DialogResult = DialogResult.Cancel;', 'cancelButton.DialogResult = DialogResult.OK;']], fails: [0] }],
  },
  [`${chapter}/02-04-validation-and-dialogs#Open the preview only after validation`]: {
    wrong: [{ name: 'name error discarded', edit: [['string nameError = RequestRules.NameError(name);', 'string nameError = "";']], fails: [0] }],
  },
  [`${chapter}/02-04-validation-and-dialogs#Your turn: clear errors when resetting`]: {
    files: { 'FormDesk/MainForm.cs': read('errors.cs') },
    wrong: [{
      name: 'old field errors survive reset',
      files: { 'FormDesk/MainForm.cs': change('errors.cs', 'errors.Clear();', '') },
      fails: [0],
    }],
  },
};
