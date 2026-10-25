from pathlib import Path
import re

base = Path('src/labs/project-studio/tracks/winforms-forms')
def read(path): return (base/path).read_text(encoding='utf-8')
def write(path, text): (base/path).write_text(text.strip()+'\n', encoding='utf-8')
def target(code, path='FormDesk/MainForm.cs'): return '```csharp file='+path+'\n'+code.strip()+'\n```'
def check(mode, label): return '```check\nrun "dotnet run --project UiChecks/UiChecks.csproj -- '+mode+'" stdout="PASS '+mode+'" timeout=120 os=windows label="'+label+'"\n```'
def section(title, prose, code=None, after='', mode=None, label=''):
    text='## '+title+'\n\n'+prose.strip()+'\n\n'
    if code: text+=target(code)+'\n\n'
    if after: text+=after.strip()+'\n\n'
    if mode: text+=check(mode,label)+'\n\n'
    return text

layout_answer=read(Path('answers/layout.cs'))
events_answer=read(Path('answers/events.cs'))
old_layout=read(Path('02-02-controls-and-layout.md'))
old_events=read(Path('02-03-events-and-values.md'))
old_dialog=read(Path('02-04-validation-and-dialogs.md'))
original_targets=re.findall(r'```csharp file=FormDesk/MainForm.cs\n(.*?)\n```', old_dialog, re.S)
errors_guided=original_targets[0]
dialog_main=original_targets[1]
dialog_target=re.search(r'```csharp file=FormDesk/RequestPreviewForm.cs\n(.*?)\n```',old_dialog,re.S)[1]

panel='''namespace FormDesk;

public class MainForm : Form
{
    public MainForm()
    {
        Text = "FormDesk — New request";
        ClientSize = new Size(520, 320);
        MinimumSize = new Size(500, 320);

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Name = "requestLayout";
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.ColumnCount = 2;
        layout.RowCount = 1;
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        Controls.Add(layout);
    }
}'''
name=panel.replace('    public MainForm()', '    private readonly TextBox nameInput = new TextBox();\n\n    public MainForm()').replace('        Controls.Add(layout);','''        Label nameLabel = new Label();
        nameLabel.Text = "Name";
        nameLabel.AutoSize = true;
        nameInput.Name = "nameInput";
        nameInput.Dock = DockStyle.Fill;

        layout.Controls.Add(nameLabel, 0, 0);
        layout.Controls.Add(nameInput, 1, 0);
        Controls.Add(layout);''')
feedback=name.replace('    public MainForm()', '    private readonly Button previewButton = new Button();\n    private readonly Label statusLabel = new Label();\n\n    public MainForm()').replace('layout.RowCount = 1;', 'layout.RowCount = 4;').replace('        Controls.Add(layout);','''        previewButton.Name = "previewButton";
        previewButton.Text = "Preview";
        previewButton.AutoSize = true;
        statusLabel.Name = "statusLabel";
        statusLabel.Text = "Ready.";
        statusLabel.AutoSize = true;

        layout.Controls.Add(previewButton, 1, 2);
        layout.Controls.Add(statusLabel, 1, 3);
        Controls.Add(layout);''')
keyboard=feedback.replace('nameLabel.Text = "Name";', '''nameLabel.Text = "&Name";
        nameLabel.TabIndex = 0;
        nameLabel.TabStop = false;''').replace('nameInput.Name = "nameInput";', '''nameInput.Name = "nameInput";
        nameInput.TabIndex = 0;
        nameInput.AccessibleName = "Request name";''').replace('previewButton.Text = "Preview";', '''previewButton.Text = "&Preview";
        previewButton.TabIndex = 2;''').replace('statusLabel.AutoSize = true;', 'statusLabel.AutoSize = true;\n        statusLabel.TabStop = false;')
layout_text='''---
title: 2.2 — Build the form one row at a time
runtime: none
reference: optional
---

You can open a window. Now build its layout in four working checkpoints: an empty table, one name input, feedback, then a keyboard path. You will build the quantity row yourself at the end. Keep the terminal in the shared project folder. Run each checkpoint with `dotnet run --project FormDesk/FormDesk.csproj`, observe it, then close the window before checking.

The short snippets explain each edit. The collapsed full-file references are recovery aids; try making the described change before revealing them.

'''
layout_text+=section('Put controls in a table','''A **control** is an object Windows can display, such as a label or a text box. A `TableLayoutPanel` is a control whose job is arranging other controls. Start with the panel alone. This constructor adds an empty two-column table to the window:

```csharp
TableLayoutPanel layout = new TableLayoutPanel();
layout.Name = "requestLayout";
layout.Dock = DockStyle.Fill;
```

`layout` is a local variable, like a variable inside a Python function. `Name` identifies this control to tests and tooling. `DockStyle.Fill` asks it to fill its parent. A table does not appear merely because it was created: keep `Controls.Add(layout);` at the end to make the form own it.

Set `Padding` to `new Padding(16)`, `ColumnCount` to 2 and `RowCount` to 1. Add these column policies before adding the table to the form:

```csharp
layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
```

The first column will fit a label; the second gets the remaining width. The blank window is expected: a container does not invent its children.''',panel,after='Run it and explain why no input appears yet. In the next checkpoint, we will give the table something to arrange.',mode='layout-panel',label='The form owns a filling two-column table')
layout_text+=section('Add one remembered input {#name-field}','''Add a label and a text box. The label can be local because later behavior will not need it. The input must be remembered after construction, so add a **field** inside the class, above the constructor:

```csharp
private readonly TextBox nameInput = new TextBox();
```

`private` keeps this detail inside MainForm. `readonly` prevents assigning a different TextBox to this field later; it still allows changing that object's `Text`. A Python comparison is storing `self.name_input`, rather than only a temporary local.

Inside the constructor, create `Label nameLabel = new Label();`, set its Text to `"Name"` and AutoSize to `true`. AutoSize lets its size follow the caption. Configure the existing input's Name as `"nameInput"` and Dock as Fill, then put both controls in the table before `Controls.Add(layout);`:

```csharp
layout.Controls.Add(nameLabel, 0, 0);
layout.Controls.Add(nameInput, 1, 0);
```

The numbers mean column, then row; both start at zero.

```predict
question: When the window grows wider, should the name field grow or should its text change?
choice: The field should grow
choice: Its text should change
answer: The field should grow
explain: The second column gets more space and the docked child fills that cell. Layout does not edit the input's data.
```''',name,after='''Type Ada, widen the window, and compare with your prediction. **Diagnostic experiment:** remove only the input's Dock assignment and rerun. The cell grows while the input keeps a fixed width. Explain why the panel and child each need a layout instruction. Restore Fill and rerun.''',mode='layout-name',label='The name input fills a growing table cell')
layout_text+=section('Add quantity and feedback','''Leave row 1 empty for your independent quantity row. First add a button in row 2 and a status label in row 3. These are two more controls using the pattern you just practised. Add fields above the constructor:

```csharp
private readonly Button previewButton = new Button();
private readonly Label statusLabel = new Label();
```

Set the button's Name to `"previewButton"`, Text to `"Preview"` and AutoSize to `true`. Set the label's Name to `"statusLabel"`, Text to `"Ready."` and AutoSize to `true`. Change RowCount to 4, then add them to the table:

```csharp
layout.Controls.Add(previewButton, 1, 2);
layout.Controls.Add(statusLabel, 1, 3);
```

A Button does not know what Preview means. Its behavior arrives in lesson 2.3; this checkpoint is about making the controls visible.''',feedback,after='Run it. Click Preview once and record what changes. Explain why a caption alone cannot implement an action.',mode='layout-feedback',label='The preview and status controls occupy their intended rows')
layout_text+=section('Give the existing controls a keyboard path {#keyboard-path}','''`TabIndex` chooses the order in which sibling controls receive Tab focus. `TabStop = false` keeps output labels out of that path. Reserve index 1 for your quantity input; set the name input to 0 and Preview to 2. Give the name label index 0 too, but set its TabStop to false. Do the same TabStop setting for the status label.

An ampersand in a caption marks an access key. Change the label to `"&Name"` and the button to `"&Preview"`. Alt+N should focus the following input; Alt+P should invoke Preview. Set `nameInput.AccessibleName = "Request name";` so accessibility tools have an explicit input name.

```csharp
nameInput.TabIndex = 0;
previewButton.TabIndex = 2;
statusLabel.TabStop = false;
```

The skipped Tab index is harmless. It reserves a place for the quantity row you are about to add.''',keyboard,after='Run it and try Tab, Shift+Tab, Alt+N and Alt+P. The check inspects settings; it does not press keys or assess clipping on your screen.',mode='layout-keyboard',label='Name and Preview expose their keyboard settings')
layout_text+=section('Your turn: build the quantity row','''Build a quantity row without copying another completed form. A `NumericUpDown` is a number input. Here is an unrelated example showing its three data properties:

```csharp
NumericUpDown minutesInput = new NumericUpDown();
minutesInput.Minimum = 0;
minutesInput.Maximum = 60;
minutesInput.Value = 5;
```

Our quantity must be remembered by later click handlers. Add a **field** named `quantityInput`. Configure Name `"quantityInput"`, range **0 through 1000**, initial Value **1**, TabIndex **1**, and AccessibleName **"Quantity"**. Put it in column 1, row 1. Create an automatically sized `"&Quantity"` label in column 0, row 1; give it TabIndex 1 and TabStop false. The UI range deliberately includes invalid business quantities; chapter 1's Core rules still allow only 1 through 100.

Also add a nonfocusable, automatically sized Label named `helpLabel` in column 1, row 4 with Text **Use Tab to move between fields.** Include this fifth row in RowCount. Choose your own local names for labels.

Before running, predict the Tab sequence. Then run, edit the quantity, and check narrow and wide windows. In your notes retain the observed sequence, explain why a field is needed for quantity but not for its label, and invent one additional input or keyboard test.

```hints
nudge: Work in three places: the field declaration, property assignments inside the constructor, and the layout's Controls.Add calls. Compile after completing each group.
concept: A control's Name and its C# variable name serve different purposes. The table position makes it visible; TabIndex sets keyboard order.
shape: Model the quantity field on nameInput, then apply the number properties from the minutes example. Model both labels on the existing name/status labels. Row positions 0 through 4 require five rows.
```''',mode='layout-task',label='The independent quantity row and keyboard hint work together')
write(Path('02-02-controls-and-layout.md'),layout_text)

# Split the click lesson while retaining its two original numbered steps.
event_target=re.search(r'```csharp file=FormDesk/MainForm.cs\n(.*?)\n```',old_events,re.S)[1]
handler_start=event_target.index('    private void PreviewButton_Click(')
prefix=event_target[:handler_start]
click_target=prefix.replace('using FormDesk.Core;\n\n','')+'''    private void PreviewButton_Click(object? sender, EventArgs e)
    {
        statusLabel.Text = "Preview clicked.";
    }
}'''
read_target=prefix.replace('using FormDesk.Core;\n\n','')+'''    private void PreviewButton_Click(object? sender, EventArgs e)
    {
        string name = nameInput.Text.Trim();
        int quantity = (int)quantityInput.Value;
        statusLabel.Text = $"Preview: {name} × {quantity}";
    }
}'''
events_text='''---
title: 2.3 — A click, current values, then a validation gate
runtime: none
reference: optional
---

The layout is complete. Build the behavior in three small experiments: prove a click reaches a method, read the controls, then stop invalid input. Only after that will you implement Reset yourself. Run each checkpoint with `dotnet run --project FormDesk/FormDesk.csproj` and close the window before checking.

'''
events_text+=section('Subscribe a method to a click','''An **event** is a notification. Inside the constructor, after configuring Preview, add:

```csharp
previewButton.Click += PreviewButton_Click;
```

`+=` subscribes a method. Pass its name without parentheses so Windows calls it on a future click. Add this method inside MainForm, after the constructor:

```csharp
private void PreviewButton_Click(object? sender, EventArgs e)
{
    statusLabel.Text = "Preview clicked.";
}
```

`void` means no returned value. `object?` permits a missing sender; this `?` is a nullable annotation. `EventArgs` carries event information. Windows supplies these two arguments. We do not need their values yet.

```predict
question: If you delete only the Click subscription, does clicking Preview still run the method?
choice: No
choice: Yes
answer: No
explain: Naming a method does not connect it to a button. The event subscription makes that connection.
```''',click_target,after='''Run and click Preview. Then perform the predicted diagnostic: remove only the subscription, rerun, and observe that Ready. stays unchanged. The compiler accepts an unused method. Restore the subscription and retest. Explain the difference between constructing a Button and connecting its behavior.''',mode='click',label='A real Click event reaches the status-changing handler')
events_text+=section('Read the values that exist now {#read-current-values}','''Replace the handler's constant message with these three lines:

```csharp
string name = nameInput.Text.Trim();
int quantity = (int)quantityInput.Value;
statusLabel.Text = $"Preview: {name} × {quantity}";
```

`Trim()` removes surrounding whitespace and returns new text. NumericUpDown.Value is a `decimal`; `(int)` explicitly converts it to the whole-number quantity used by Core. Keep DecimalPlaces at its default zero. `$"...{name}..."` inserts values into text like a Python f-string.

```predict
question: Enter two spaces, Ada, two spaces and quantity 2. What status should appear?
choice: Preview: Ada × 2
choice: Preview:   Ada   × 2
answer: Preview: Ada × 2
explain: Trim removes outside whitespace before interpolation. Reading inside the handler means each click reads the current controls.
```''',read_target,after='''Run twice: Ada / 2, then Grace / 3 without closing the window. The second message must show the new data. Try whitespace / 0 and explain why it is currently displayed: reading data and validating it are different operations.''',mode='values',label='Each click reads and normalizes the latest control values')
events_text+=section('Stop before invalid data is previewed {#validation-gate}','''Import `FormDesk.Core` at the top with `using FormDesk.Core;`. Between reading the values and displaying the preview, call the existing rule:

```csharp
string error = RequestRules.Validate(name, quantity);
if (error != "")
{
    statusLabel.Text = error;
    return;
}
```

The early `return;` ends this click handler. It does not close the form. On the valid path create a RequestDraft, assign its Name and Quantity, and interpolate those properties in the preview message, as you practised in chapter 1. You now pass a small data object rather than carrying controls into Core.''',event_target,after='''Run Ada / 2, whitespace / 2, Ada / 0, then Ada / 100. **Diagnostic experiment:** remove only `return;`. The error is assigned, then overwritten by a success message. Restore the return and explain which later lines it protects. The automated check raises actual hidden-button events; it does not physically click or test focus.''',mode='events',label='Current values pass the shared rule before becoming a preview')
events_text+=section('Your turn: reset a draft',old_events.split('## Your turn: reset a draft\n\n')[1].split('```check')[0],mode='events-task',label='Independent Reset behavior restores data after success and failure')
write(Path('02-03-events-and-values.md'),events_text)

# Field validation is its own lesson. First provide a component's lifetime, then one worked field.
component=events_answer.replace('    public MainForm()', '    private readonly ErrorProvider errors = new ErrorProvider();\n\n    public MainForm()').replace('        Text = "FormDesk — New request";', '''        errors.ContainerControl = this;
        errors.BlinkStyle = ErrorBlinkStyle.NeverBlink;
        Text = "FormDesk — New request";''')
dispose='''    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            errors.Dispose();
        }
        base.Dispose(disposing);
    }
'''
component=component.rstrip()[:-1]+dispose+'}'
one_error=component.replace('        string error = RequestRules.Validate(name, quantity);', '''        string nameError = RequestRules.NameError(name);
        errors.SetError(nameInput, nameError);
        string error = RequestRules.Validate(name, quantity);''')
field_text='''---
title: 2.3a — Put validation feedback beside each input
runtime: none
reference: optional
---

One status message can hide a second invalid field. This lesson keeps the preview as a label so you can concentrate on one problem: after a click, every invalid input has its own message, and correcting one input clears only its message. No dialog is involved yet.

'''
field_text+=section('Give the error display a lifetime','''An **ErrorProvider** is a component that attaches messages to controls; it is not a layout control. Add this field above the constructor:

```csharp
private readonly ErrorProvider errors = new ErrorProvider();
```

At the start of the constructor set `errors.ContainerControl = this;` and `errors.BlinkStyle = ErrorBlinkStyle.NeverBlink;`. `this` means this MainForm object. The provider needs that container; NeverBlink keeps the icons steady.

Components also own resources. Add the cleanup method shown below after the existing handlers. This is a standard pair of cleanup actions, like a Python cleanup block: release our provider, then let the base Form release its resources.

```csharp
protected override void Dispose(bool disposing)
{
    if (disposing)
    {
        errors.Dispose();
    }
    base.Dispose(disposing);
}
```

`protected` allows derived classes to use a member. `override` supplies our version of Form's existing Dispose method. `base` refers to the Form implementation. Keep the base call; the form still owns its child controls. We add lifetime support now so later error edits only concern behavior.''',component,after='Run once: there should be no icon because no message has been attached. Closing the form also disposes the provider. The check inspects configuration, not resource use over a long-running session.',mode='error-provider',label='The nonblinking ErrorProvider belongs to the form')
field_text+=section('Work through the name field once','''After reading name and quantity, but before calling Validate, add:

```csharp
string nameError = RequestRules.NameError(name);
errors.SetError(nameInput, nameError);
```

SetError associates a message with one control. An empty message removes that control's old error. Keep the existing combined Validate gate for now, so quantity errors still stop the preview.

```predict
question: Submit a blank name, then correct it and submit again. What should the second SetError receive?
choice: An empty string
choice: The old error text
answer: An empty string
explain: NameError runs again on the current text. An empty string clears that input's previous message.
```''',one_error,after='''Run with whitespace / 2, hover the name icon, then correct the name and retry. **Diagnostic experiment:** temporarily replace `errors.SetError(nameInput, nameError);` with `errors.SetError(nameInput, "Enter a name.");`. The icon survives a correction even though the rule passes. Restore the variable and explain why stale UI feedback is separate from a correct rule.''',mode='name-error',label='The name message appears and clears through real button events')
field_text+=section('Your turn: show both errors and guard success','''Implement per-field validation yourself. Replace the combined Validate call and its first-error gate with a result for **each** field. Use RequestRules.QuantityError for quantity, attach its message to quantityInput, and keep the name's independent message. If **either** message is nonempty, show **Fix the marked fields.** and stop the handler before building a successful preview. C# uses `||` for Python's `or`.

Both SetError calls must run on every attempt, even if the first field is invalid. When both fields are valid, keep the existing **Preview: name × quantity** behavior. Do not disable the rule or narrow NumericUpDown's range to hide invalid cases.

Test this sequence: whitespace / 0 → Ada / 0 → Ada / 2. Expect two icons → only the quantity icon → no icons and the preview. Also test only a bad name with quantity 2 and only a bad quantity with a good name; neither may reach success. Record the observations, explain why `&&` would allow a single bad field through, and design one extra boundary sequence of your own.

```hints
nudge: First produce two messages, then update two controls, then make one decision. Returning before the second SetError would hide an error.
concept: A form's error display and its success gate must use the same freshly computed messages. Either invalid field means stop, so combine the nonempty comparisons with ||.
shape: Keep nameError, add quantityError, call SetError for each input, then put the status assignment and return inside one if. Leave the valid draft creation below that block.
```''',mode='field-task',label='Independent field validation handles both, either, corrected and valid inputs')
write(Path('02-03a-field-validation.md'),field_text)
write(Path('answers/field-validation.cs'),errors_guided)

# Prepare the dialog without introducing the real modal call until its own checkpoint.
summary=dialog_target[:dialog_target.index('        Button confirmButton')]+'''        Controls.Add(layout);
    }
}'''
confirm=dialog_target.replace('''        Button cancelButton = new Button();
        cancelButton.Name = "cancelButton";
        cancelButton.Text = "&Cancel";
        cancelButton.AutoSize = true;
        cancelButton.DialogResult = DialogResult.Cancel;

''','').replace('        layout.Controls.Add(cancelButton, 1, 1);\n','').replace('        CancelButton = cancelButton;\n','')
errors_reset=errors_guided.replace('    private void ResetButton_Click(object? sender, EventArgs e)\n    {', '    private void ResetButton_Click(object? sender, EventArgs e)\n    {\n        errors.Clear();')
modal_part='''        using RequestPreviewForm dialog = new RequestPreviewForm(draft);
        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            statusLabel.Text = $"Confirmed: {draft.Name} × {draft.Quantity}";
        }
        else
        {
            statusLabel.Text = "Preview cancelled.";
        }'''
opened=dialog_main.replace(modal_part,'''        ShowPreview(draft);
        statusLabel.Text = "Preview closed.";''')
show_method='''    protected virtual DialogResult ShowPreview(RequestDraft draft)
    {
        using RequestPreviewForm dialog = new RequestPreviewForm(draft);
        return dialog.ShowDialog(this);
    }
'''
opened=opened.replace('    private void ResetButton_Click',show_method+'    private void ResetButton_Click').replace('    private void ResetButton_Click(object? sender, EventArgs e)\n    {','    private void ResetButton_Click(object? sender, EventArgs e)\n    {\n        errors.Clear();')
final=opened.replace('''        ShowPreview(draft);
        statusLabel.Text = "Preview closed.";''','''        DialogResult result = ShowPreview(draft);
        if (result == DialogResult.OK)
        {
            statusLabel.Text = $"Confirmed: {draft.Name} × {draft.Quantity}";
        }
        else
        {
            statusLabel.Text = "Preview cancelled.";
        }''')
write(Path('answers/errors.cs'),final)
write(Path('support/reference/MainForm.cs'),final)
write(Path('answers/dialog.cs'),dialog_target)
dialogs='''---
title: 2.4 — Ask for confirmation and respect cancellation
runtime: none
reference: optional
---

Continue after 2.3a: both fields already have independent error messages and a tested success gate. This lesson adds a preview in small checkpoints: clean up feedback on Reset, display a draft in a second form, configure its outcomes, then open it. You will implement the caller's decision yourself. Confirmation still does not save anything.

'''
dialogs+=section('Attach errors to the fields that need attention','''Check your starting state before adding another window: whitespace / 0 marks both inputs; correcting only the name clears only that message. If it does not, return to 2.3a's independent task.

Reset currently changes data but can leave old icons. Add just one line at the start of ResetButton_Click:

```csharp
errors.Clear();
```

Clear removes displayed messages, not validation rules. Run a failure → Reset → Preview sequence. Reset removes icons; Preview must mark the still-empty name again. Explain why clearing an error display cannot make data valid.''',errors_reset,mode='errors-task',label='Reset clears feedback and the next click still validates')
dialogs+=section('Display a draft in a second form {#preview-summary}','''Create a second file, `FormDesk/RequestPreviewForm.cs`. Its constructor receives a RequestDraft; it does not reach into MainForm's controls. Use the familiar table and Label pattern to display `$"{draft.Name} × {draft.Quantity}"`. Name the label `summaryLabel`. The complete reference is short because this form contains only the summary.

`StartPosition = FormStartPosition.CenterParent;` asks to center over an owner when one is supplied. This checkpoint only constructs the second form in memory; the main form still previews in its status label.''',after=target(summary,'FormDesk/RequestPreviewForm.cs')+'\n\n'+'''Predict which text a draft with Name Ada and Quantity 2 produces, then run the check and explain where the two values come from. The check constructs the form and reads its label; it does not show it.''',mode='dialog-summary',label='The second form renders the draft it receives')
dialogs+=section('Build a preview that has two outcomes','''A **DialogResult** is a named outcome such as OK or Cancel. Start with the confirming button. In the preview constructor create a Button named `confirmButton`, Text `"&Confirm"`, and AutoSize true. Set its result and place it in the table:

```csharp
confirmButton.DialogResult = DialogResult.OK;
layout.Controls.Add(confirmButton, 0, 1);
AcceptButton = confirmButton;
```

Setting AcceptButton tells the form which button Enter should activate. A result is data the caller will receive; OK does not save or approve anything by itself.''',after=target(confirm,'FormDesk/RequestPreviewForm.cs')+'\n\n'+'''In the next checkpoint you will add the other outcome yourself. The check inspects the actual button and AcceptButton assignment; keyboard interaction still needs the manual run later.''',mode='dialog-confirm',label='Confirmation has an OK result and the Enter binding')
dialogs+=section('Your turn: give the preview a safe exit {#cancel-button-task}','''Add the second button in RequestPreviewForm yourself. Name it `cancelButton`, give it Text **&Cancel**, enable AutoSize, and put it at column 1, row 1. It must return **DialogResult.Cancel** and be the form's **CancelButton**, so Escape is a cancellation. Keep confirmation intact.

Predict whether clicking Cancel should produce OK or Cancel and explain why the caller must distinguish them. You will manually test Escape and the title-bar X once the next step opens the preview.

```hints
nudge: Follow the confirming button's construction and placement, but choose the other outcome and keyboard property.
concept: A button's DialogResult determines its outcome. The form's CancelButton determines which button Escape activates.
shape: Create, name, caption, size and place a second Button. Assign its Cancel result, then assign that button to the form's CancelButton property.
```''',mode='dialog',label='Independent Cancel wiring preserves separate OK and Cancel outcomes')
dialogs+=section('Open the preview only after validation','''A **modal dialog** is a window that makes its caller wait for an outcome. Put the actual opening in a small named method inside MainForm:

```csharp
protected virtual DialogResult ShowPreview(RequestDraft draft)
{
    using RequestPreviewForm dialog = new RequestPreviewForm(draft);
    return dialog.ShowDialog(this);
}
```

`ShowDialog(this)` opens it with MainForm as owner. `using` here is a cleanup declaration, different from the namespace import: dispose the dialog when this method ends. Its returned value is the outcome. `protected virtual` lets a derived form replace only this window-opening operation. The supplied checker does that to return a pretend outcome and count calls without opening windows; your ordinary MainForm uses ShowDialog.

In PreviewButton_Click, keep the entire field-error gate and draft construction. Replace only its final status assignment with:

```csharp
ShowPreview(draft);
statusLabel.Text = "Preview closed.";
```

For this checkpoint both buttons deliberately produce the same status; you will distinguish their returned outcomes next.

```predict
question: With a good name but quantity zero, how many times should ShowPreview run?
choice: 0
choice: 1
answer: 0
explain: Either field error returns from the handler before constructing or showing a preview.
```''',opened,after='''Run `dotnet run --project FormDesk/FormDesk.csproj`. Try Ada / 0: no preview may open. Then Ada / 2: inspect the summary, Cancel, reopen and Confirm. The owner should wait while the preview is open; both outcomes currently say Preview closed. **Diagnostic experiment:** replace `return dialog.ShowDialog(this);` with `return DialogResult.Cancel;`, run a valid request and observe that no window appears. Restore ShowDialog. Explain the difference between returning an outcome and performing the modal interaction.

The check replaces the opening method: it proves that valid data reaches it and invalid cases stop first. It does not establish actual ownership, focus, modal keyboard behavior or appearance.''',mode='dialog-open',label='Only valid current drafts reach the window-opening method')
dialogs+=section('Your turn: handle the outcome instead of assuming success','''Implement the caller's decision without a supplied handler. Store the DialogResult returned by ShowPreview. Only **OK** may set status to **Confirmed: name × quantity**, using the normalized draft. Every other result must set **Preview cancelled.** Keep the field-error gate, both field messages, Reset cleanup, and existing defaults.

The earlier comparison and if/else lessons supply the syntax. Decide where the returned value belongs and which comparison allows confirmation. Do not compare a control's caption or infer acceptance merely because the window closed.

Run Ada / 2 → Cancel, then Confirm. Repeat with Escape, Enter and the title-bar X. Cancellation must never say Confirmed. **Diagnostic experiment after your solution:** temporarily compare with Cancel instead of OK, observe the wrong result, and restore OK. Record an outcome, explain the failed comparison, and invent one more sequence mixing a field correction, cancellation and Reset.

```hints
nudge: The method returns a value just like RequestRules.Validate does. Calling it without storing that value discards the information you need.
concept: Compare the returned DialogResult to DialogResult.OK with ==. Everything outside that one accepted outcome belongs in the cancellation branch.
shape: After creating the draft, assign the method's result to a local DialogResult. Use if/else to choose the two status strings; interpolate draft.Name and draft.Quantity only in the OK branch.
```''',mode='dialog-task',label='Independent outcome handling accepts only OK and preserves the validation gate')
write(Path('02-04-validation-and-dialogs.md'),dialogs)
